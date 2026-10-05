// Gate `npm audit` on the project's own dependency tree.
//
// npm audit reports three classes of findings no dependency change here can
// clear. They are ignored:
//
// 1. npm's bundled internals (node_modules/npm/**). npm ships a frozen copy of
//    brace-expansion, ip-address, tar, undici, ... that no npm release has
//    patched — checked 11.19.0 and 12.0.2, Aug 2026 — and npm audit itself
//    says such findings "cannot be fixed automatically". Re-check
//    node_modules/npm after npm ships a patched bundle and drop this ignore.
//
// 2. Advisories with no patched release (UNFIXABLE_ADVISORIES below).
//
// 3. Chain findings: `via` lists only other package names, so the package is
//    flagged only because a dependency is. The root carries the advisory and
//    is gated on its own; this also collapses cycles such as
//    semantic-release <-> @semantic-release/*.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Re-check: once a patched release exists, delete the entry and let the gate
// cover it again.
const UNFIXABLE_ADVISORIES = new Set([
  "GHSA-vfj7-8cjw-p6xm", // braces <=3.0.3 stack-exhaustion DoS; patched: none
]);

const isNpmBundleNode = (node) =>
  node === "node_modules/npm" || node.startsWith("node_modules/npm/");

const advisoryId = (cause) =>
  typeof cause === "object" && cause.url
    ? String(cause.url).split("/").pop()
    : null;

const isActionable = (v) => {
  // Chain-only finding: no advisory of its own. The root is gated instead.
  const advisories = (v.via ?? []).filter((cause) => typeof cause === "object");
  if (advisories.length === 0) return false;
  // Installed only inside npm's bundled tree.
  if (v.nodes.every(isNpmBundleNode)) return false;
  // No patched release exists for any of its advisories.
  return advisories.some((a) => {
    const id = advisoryId(a);
    return id === null || !UNFIXABLE_ADVISORIES.has(id);
  });
};

if (process.argv.includes("--self-test")) {
  const vuln = (via, nodes) => ({ via, nodes, severity: "high" });
  const advisory = (id) => ({
    url: `https://github.com/advisories/${id}`,
    range: "*",
  });

  assert.equal(
    isActionable(
      vuln([advisory("GHSA-vfj7-8cjw-p6xm")], ["node_modules/braces"]),
    ),
    false,
    "unfixable advisory is ignored",
  );
  assert.equal(
    isActionable(vuln([advisory("GHSA-fixable")], ["node_modules/foo"])),
    true,
    "fixable advisory is gated",
  );
  assert.equal(
    isActionable(vuln(["braces"], ["node_modules/micromatch"])),
    false,
    "chain finding is ignored",
  );
  assert.equal(
    isActionable(
      vuln(
        ["micromatch", "semantic-release"],
        ["node_modules/@semantic-release/commit-analyzer"],
      ),
    ),
    false,
    "chain cycle is ignored",
  );
  assert.equal(
    isActionable(
      vuln(
        [advisory("GHSA-fixable")],
        ["node_modules/npm/node_modules/undici"],
      ),
    ),
    false,
    "npm-bundle-only finding is ignored",
  );
  assert.equal(
    isActionable(
      vuln(
        [advisory("GHSA-vfj7-8cjw-p6xm"), advisory("GHSA-fixable")],
        ["node_modules/braces"],
      ),
    ),
    true,
    "mixed unfixable and fixable advisory is gated",
  );
  console.log("audit-project-only self-test ok");
  process.exit(0);
}

const report = JSON.parse(readFileSync(0, "utf8"));

if (report.error) {
  console.error(
    `npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`,
  );
  process.exit(1);
}

const remaining = Object.entries(report.vulnerabilities ?? {}).filter(([, v]) =>
  isActionable(v),
);
if (remaining.length > 0) {
  for (const [name, v] of remaining) {
    console.error(`${name} (${v.severity}): ${v.nodes.join(" -> ")}`);
  }
  process.exit(1);
}
console.log(
  "npm audit: no actionable vulnerabilities in the project dependency tree",
);
