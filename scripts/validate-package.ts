#!/usr/bin/env tsx
/**
 * Package validation: VAL-PACKAGE-003 through 010, VAL-CROSS-001/002.
 * Run after `npm run build`.
 */
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import {
  existsSync,
  statSync,
  readFileSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { createHash } from "node:crypto";

const require = createRequire(import.meta.url);
const repoRoot = resolve(".");
const distDir = join(repoRoot, "dist");
const cleanups: (() => void)[] = [];

type SpiffyFn = ((v?: unknown, p?: number) => string) & {
  fillUnfilledDecimalPlaces: (v: unknown, p?: number) => string;
};

// Shared finite runtime matrix covering VAL-BEHAVIOR-001..011 (VAL-CROSS-001)
const matrix: {
  name: string;
  args: [unknown, number?];
  expected?: string;
  throws?: string;
}[] = [
  // 001: callable, returns strings, empty
  { name: "number 1.2 p2", args: [1.2, 2], expected: "1.20" },
  { name: "string 1.256 p2", args: ["1.256", 2], expected: "1.26" },
  { name: "empty", args: [], expected: "" },
  { name: "undefined", args: [undefined], expected: "" },
  // 002: omitted precision, integers, lexical form
  { name: "omitted precision 1.1", args: [1.1], expected: "1" },
  { name: "integer 1 p2", args: [1, 2], expected: "1" },
  { name: "integer 1.0 p2", args: [1.0, 2], expected: "1" },
  { name: "integer -1.0 p2", args: [-1.0, 2], expected: "-1" },
  { name: "string 1 p2", args: ["1", 2], expected: "1" },
  { name: "string 001 p2", args: ["001", 2], expected: "001" },
  { name: "string +1 p2", args: ["+1", 2], expected: "+1" },
  { name: "string -1 p2", args: ["-1", 2], expected: "-1" },
  // 003: fractions round and pad
  { name: "number 1.1 p2", args: [1.1, 2], expected: "1.10" },
  { name: "number 1.256 p2", args: [1.256, 2], expected: "1.26" },
  { name: "number 0.1 p2", args: [0.1, 2], expected: "0.10" },
  { name: "string 1.100 p2", args: ["1.100", 2], expected: "1.10" },
  // 004: native rounding edges
  { name: "1.005 p2", args: [1.005, 2], expected: "1" },
  { name: "+1.005 p2", args: [+1.005, 2], expected: "1" },
  { name: "-1.005 p2", args: [-1.005, 2], expected: "-1" },
  { name: "string 1.005 p2", args: ["1.005", 2], expected: "1" },
  { name: "string +1.005 p2", args: ["+1.005", 2], expected: "1" },
  { name: "string -1.005 p2", args: ["-1.005", 2], expected: "-1" },
  { name: "1.006 p2", args: [1.006, 2], expected: "1.01" },
  { name: "+1.006 p2", args: [+1.006, 2], expected: "1.01" },
  { name: "-1.006 p2", args: [-1.006, 2], expected: "-1.01" },
  { name: "string 1.006 p2", args: ["1.006", 2], expected: "1.01" },
  { name: "string +1.006 p2", args: ["+1.006", 2], expected: "1.01" },
  { name: "string -1.006 p2", args: ["-1.006", 2], expected: "-1.01" },
  // 005: decimal text normalization
  { name: "leading dot .1 p2", args: [".1", 2], expected: "0.10" },
  { name: "trailing dot 1. p2", args: ["1.", 2], expected: "1" },
  { name: "signed +1.1 p2", args: ["+1.1", 2], expected: "1.10" },
  { name: "signed -1.1 p2", args: ["-1.1", 2], expected: "-1.10" },
  { name: "dot zero .0 p2", args: [".0", 2], expected: "0" },
  // 006: zero normalization
  { name: "plus zero", args: [+0], expected: "0" },
  { name: "minus zero", args: [-0], expected: "0" },
  { name: "string +0", args: ["+0"], expected: "0" },
  { name: "string -0", args: ["-0"], expected: "0" },
  { name: "string 0.00", args: ["0.00"], expected: "0" },
  { name: "string 0.000 p2", args: ["0.000", 2], expected: "0" },
  { name: "number 0.0 p2", args: [0.0, 2], expected: "0" },
  { name: "string 0 p2", args: ["0", 2], expected: "0" },
  // 007: precision coercion and errors
  { name: "negative precision 1.256 -2", args: [1.256, -2], expected: "1.26" },
  {
    name: "string negative precision 1.256 -2",
    args: ["1.256", -2],
    expected: "1.26",
  },
  {
    name: "fractional precision 1.2 2.7",
    args: ["1.2", 2.7],
    expected: "1.200",
  },
  { name: "range error 1.1 101", args: [1.1, 101], throws: "RangeError" },
  {
    name: "range error string 1.1 101",
    args: ["1.1", 101],
    throws: "RangeError",
  },
  { name: "integer bypass 1 101", args: ["1", 101], expected: "1" },
  // 008: permissive runtime compatibility
  { name: "exponent 1e3", args: ["1e3"], expected: "1e3" },
  { name: "boolean true", args: [true], expected: "true" },
  { name: "null", args: [null], expected: "null" },
  { name: "invalid decimal abc.def p2", args: ["abc.def", 2], expected: "NaN" },
  { name: "comma zero 0,0", args: ["0,0"], expected: "0" },
  { name: "comma only", args: [","], expected: "0" },
];

const helperMatrix: {
  name: string;
  args: [unknown, number?];
  expected: string;
}[] = [
  { name: "fill 1 p2", args: ["1", 2], expected: "1.00" },
  { name: "fill 1. p2", args: ["1.", 2], expected: "1.00" },
  { name: "fill 1.0 p2", args: ["1.0", 2], expected: "1.00" },
  { name: "no truncate 1.234 p2", args: ["1.234", 2], expected: "1.234" },
  { name: "negative magnitude 1 -2", args: ["1", -2], expected: "1.00" },
  { name: "zero unchanged 1.5 0", args: ["1.5", 0], expected: "1.5" },
  { name: "undefined", args: [undefined], expected: "undefined" },
  { name: "undefined 0", args: [undefined, 0], expected: "undefined" },
  { name: "undefined 2", args: [undefined, 2], expected: "undefined.00" },
];

function exec(cmd: string, opts: { cwd?: string } = {}): string {
  try {
    return execSync(cmd, {
      cwd: opts.cwd,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 120000,
    });
  } catch (e) {
    const err = e as { stdout?: Buffer; stderr?: Buffer };
    const stderr = err.stderr?.toString() || "";
    const stdout = err.stdout?.toString() || "";
    throw new Error(
      `Command failed: ${cmd}\nstdout: ${stdout}\nstderr: ${stderr}`,
    );
  }
}

// ponytail: duck-typed error name - VM-context errors aren't instanceof host Error
function errName(e: unknown): string {
  if (e !== null && typeof e === "object" && "name" in e) {
    return String((e as { name: unknown }).name);
  }
  return String(e);
}

function runMatrix(
  fn: (v?: unknown, p?: number) => string,
): Map<string, string> {
  const results = new Map<string, string>();
  for (const c of matrix) {
    try {
      results.set(c.name, `OK:${fn(...c.args)}`);
    } catch (e) {
      results.set(c.name, `ERR:${errName(e)}`);
    }
  }
  return results;
}

function runHelperMatrix(
  helper: (v: unknown, p?: number) => string,
): Map<string, string> {
  const results = new Map<string, string>();
  for (const c of helperMatrix) {
    try {
      results.set(c.name, `OK:${helper(...c.args)}`);
    } catch (e) {
      results.set(c.name, `ERR:${errName(e)}`);
    }
  }
  return results;
}

function checkMatrix(
  fn: (v?: unknown, p?: number) => string,
  label: string,
): void {
  for (const c of matrix) {
    if (c.throws) {
      let threw = false;
      try {
        fn(...c.args);
      } catch (e) {
        threw = true;
        assert.equal(
          errName(e),
          c.throws,
          `${label}: ${c.name} should throw ${c.throws}`,
        );
      }
      assert.ok(threw, `${label}: ${c.name} should have thrown ${c.throws}`);
    } else {
      assert.equal(fn(...c.args), c.expected, `${label}: ${c.name}`);
    }
  }
}

function checkHelper(
  helper: (v: unknown, p?: number) => string,
  label: string,
): void {
  for (const c of helperMatrix) {
    assert.equal(helper(...c.args), c.expected, `${label}: ${c.name}`);
  }
}

function loadCJS(path: string): SpiffyFn {
  const mod = require(path);
  assert.equal(typeof mod, "function", `CJS ${path} is callable`);
  assert.equal(
    typeof mod.fillUnfilledDecimalPlaces,
    "function",
    `CJS ${path} has helper`,
  );
  return mod as SpiffyFn;
}

async function loadESM(url: string): Promise<SpiffyFn> {
  const mod = await import(url);
  assert.equal(
    typeof mod.default,
    "function",
    `ESM ${url} default is callable`,
  );
  assert.equal(
    typeof mod.default.fillUnfilledDecimalPlaces,
    "function",
    `ESM ${url} has helper`,
  );
  return mod.default as SpiffyFn;
}

function loadUMD(path: string): SpiffyFn {
  const code = readFileSync(path, "utf8");
  const ctx: Record<string, unknown> = {};
  runInNewContext(code, ctx);
  assert.equal(
    typeof ctx.SpiffyRound,
    "function",
    `UMD ${path} SpiffyRound is callable`,
  );
  const fn = ctx.SpiffyRound as SpiffyFn;
  assert.equal(
    typeof fn.fillUnfilledDecimalPlaces,
    "function",
    `UMD ${path} has helper`,
  );
  return fn;
}

async function main(): Promise<void> {
  // VAL-PACKAGE-003: build artifacts
  console.log("VAL-PACKAGE-003: build artifacts");
  for (const f of ["index.js", "index.mjs", "index.umd.js", "index.d.ts"]) {
    const p = join(distDir, f);
    assert.ok(existsSync(p), `${f} exists`);
    assert.ok(statSync(p).size > 0, `${f} is nonempty`);
  }
  console.log("  OK");

  // VAL-CROSS-001: local format behavior
  console.log("VAL-CROSS-001: local format behavior");
  const cjs = loadCJS(join(distDir, "index.js"));
  checkMatrix(cjs, "local CJS");
  checkHelper(cjs.fillUnfilledDecimalPlaces, "local CJS helper");

  const esm = await loadESM(pathToFileURL(join(distDir, "index.mjs")).href);
  checkMatrix(esm, "local ESM");
  checkHelper(esm.fillUnfilledDecimalPlaces, "local ESM helper");

  const umd = loadUMD(join(distDir, "index.umd.js"));
  checkMatrix(umd, "local UMD");
  checkHelper(umd.fillUnfilledDecimalPlaces, "local UMD helper");
  console.log("  OK");

  // VAL-PACKAGE-007: format parity
  console.log("VAL-PACKAGE-007: format parity");
  const cjsR = runMatrix(cjs);
  const esmR = runMatrix(esm);
  const umdR = runMatrix(umd);
  for (const c of matrix) {
    assert.deepEqual(
      cjsR.get(c.name),
      esmR.get(c.name),
      `CJS vs ESM: ${c.name}`,
    );
    assert.deepEqual(
      cjsR.get(c.name),
      umdR.get(c.name),
      `CJS vs UMD: ${c.name}`,
    );
  }
  const cjsH = runHelperMatrix(cjs.fillUnfilledDecimalPlaces);
  const esmH = runHelperMatrix(esm.fillUnfilledDecimalPlaces);
  const umdH = runHelperMatrix(umd.fillUnfilledDecimalPlaces);
  for (const c of helperMatrix) {
    assert.deepEqual(
      cjsH.get(c.name),
      esmH.get(c.name),
      `helper CJS vs ESM: ${c.name}`,
    );
    assert.deepEqual(
      cjsH.get(c.name),
      umdH.get(c.name),
      `helper CJS vs UMD: ${c.name}`,
    );
  }
  console.log("  OK");

  // Hash local dist files (for VAL-CROSS-002)
  const distFiles = ["index.js", "index.mjs", "index.umd.js", "index.d.ts"];
  const localHashes = new Map<string, string>();
  for (const f of distFiles) {
    localHashes.set(
      f,
      createHash("sha256")
        .update(readFileSync(join(distDir, f)))
        .digest("hex"),
    );
  }

  // VAL-PACKAGE-009 & VAL-CROSS-002: npm pack and verify
  console.log("VAL-PACKAGE-009: npm pack");
  const packJson = JSON.parse(exec("npm pack --json"));
  const tarballName = packJson[0].filename as string;
  const tarballPath = join(repoRoot, tarballName);
  cleanups.push(() => rmSync(tarballPath, { force: true }));
  console.log(`  tarball: ${tarballName}`);

  // Check tarball contents
  const tarListing = exec(`tar -tzf "${tarballPath}"`)
    .trim()
    .split("\n")
    .map((l) => l.replace(/^package\//, ""))
    .filter(Boolean)
    .sort();
  const expectedFiles = [
    "LICENSE",
    "README.md",
    "dist/index.d.ts",
    "dist/index.js",
    "dist/index.mjs",
    "dist/index.umd.js",
    "media/logo.png",
    "package.json",
  ].sort();
  assert.deepEqual(tarListing, expectedFiles, "tarball file set");
  console.log("  OK");

  // VAL-CROSS-002: hash comparison
  console.log("VAL-CROSS-002: dist hash comparison");
  const extractDir = mkdtempSync(join(tmpdir(), "spiffy-extract-"));
  cleanups.push(() => rmSync(extractDir, { recursive: true, force: true }));
  exec(`tar -xzf "${tarballPath}" -C "${extractDir}"`);
  for (const f of distFiles) {
    const extractedHash = createHash("sha256")
      .update(readFileSync(join(extractDir, "package", "dist", f)))
      .digest("hex");
    assert.equal(extractedHash, localHashes.get(f), `hash mismatch: dist/${f}`);
  }
  console.log("  OK");

  // VAL-PACKAGE-010: fresh install
  console.log("VAL-PACKAGE-010: fresh install");
  const consumerDir = mkdtempSync(join(tmpdir(), "spiffy-consumer-"));
  cleanups.push(() => rmSync(consumerDir, { recursive: true, force: true }));
  writeFileSync(
    join(consumerDir, "package.json"),
    JSON.stringify({ name: "consumer", private: true }),
  );
  exec(`npm install "${tarballPath}"`, { cwd: consumerDir });

  // No runtime deps beyond spiffy-round
  const nmEntries = readdirSync(join(consumerDir, "node_modules")).filter(
    (e) => !e.startsWith("."),
  );
  assert.deepEqual(
    nmEntries,
    ["spiffy-round"],
    "no runtime deps beyond spiffy-round",
  );
  console.log("  OK");

  // VAL-PACKAGE-004: installed CJS consumer
  console.log("VAL-PACKAGE-004: installed CJS consumer");
  const consumerRequire = createRequire(join(consumerDir, "x.js"));
  const installedCjs = consumerRequire("spiffy-round");
  assert.equal(typeof installedCjs, "function", "callable");
  assert.equal(
    typeof installedCjs.fillUnfilledDecimalPlaces,
    "function",
    "helper",
  );
  assert.equal(installedCjs(1.256, 2), "1.26", "number result");
  assert.equal(installedCjs("1.256", 2), "1.26", "string result");
  assert.equal(installedCjs(), "", "empty result");
  assert.equal(
    installedCjs.fillUnfilledDecimalPlaces("1", 2),
    "1.00",
    "helper result",
  );
  console.log("  OK");

  // VAL-PACKAGE-005: installed ESM (package name)
  console.log("VAL-PACKAGE-005: installed ESM (package name)");
  writeFileSync(
    join(consumerDir, "esm-check.mjs"),
    `import spiffyRound from "spiffy-round";
import assert from "node:assert/strict";
assert.equal(typeof spiffyRound, "function");
assert.equal(typeof spiffyRound.fillUnfilledDecimalPlaces, "function");
assert.equal(spiffyRound(1.256, 2), "1.26");
assert.equal(spiffyRound("1.256", 2), "1.26");
assert.equal(spiffyRound(), "");
assert.equal(spiffyRound.fillUnfilledDecimalPlaces("1", 2), "1.00");
`,
  );
  exec("node esm-check.mjs", { cwd: consumerDir });
  console.log("  OK");

  // VAL-PACKAGE-005: installed ESM (direct file URL)
  console.log("VAL-PACKAGE-005: installed ESM (direct file URL)");
  const installedEsmPath = join(
    consumerDir,
    "node_modules",
    "spiffy-round",
    "dist",
    "index.mjs",
  );
  const installedEsm = await loadESM(pathToFileURL(installedEsmPath).href);
  assert.equal(typeof installedEsm, "function", "direct file ESM callable");
  assert.equal(
    typeof installedEsm.fillUnfilledDecimalPlaces,
    "function",
    "direct file ESM helper",
  );
  assert.equal(installedEsm(1.256, 2), "1.26", "direct file ESM result");
  console.log(`  resolved: ${installedEsmPath}`);
  console.log("  OK");

  // VAL-PACKAGE-006: installed UMD consumer
  console.log("VAL-PACKAGE-006: installed UMD consumer");
  const installedUmd = loadUMD(
    join(consumerDir, "node_modules", "spiffy-round", "dist", "index.umd.js"),
  );
  assert.equal(typeof installedUmd, "function", "installed UMD callable");
  assert.equal(
    typeof installedUmd.fillUnfilledDecimalPlaces,
    "function",
    "installed UMD helper",
  );
  assert.equal(installedUmd(1.256, 2), "1.26", "installed UMD result");
  console.log("  OK");

  // VAL-PACKAGE-008: declaration consumer
  console.log("VAL-PACKAGE-008: declaration consumer");
  writeFileSync(
    join(consumerDir, "consumer.ts"),
    `import spiffyRound from "spiffy-round";
const a: string = spiffyRound(1.256, 2);
const b: string = spiffyRound("1.256", 2);
const c: string = spiffyRound();
const d: string = spiffyRound.fillUnfilledDecimalPlaces("1", 2);
// @ts-expect-error: object input is not in the documented static type
spiffyRound({ value: 1 });
`,
  );
  writeFileSync(
    join(consumerDir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        module: "ESNext",
        moduleResolution: "Bundler",
        lib: ["ES2020"],
      },
      files: ["consumer.ts"],
    }),
  );
  const tscPath = join(repoRoot, "node_modules", "typescript", "bin", "tsc");
  exec(`node "${tscPath}" -p tsconfig.json`, { cwd: consumerDir });
  console.log("  OK");

  console.log("\nAll package validation checks passed.");
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (e) {
    console.error("\nVALIDATION FAILED:");
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  } finally {
    while (cleanups.length) {
      try {
        cleanups.pop()!();
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

run();
