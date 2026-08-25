// Gate `npm audit` on the project's own dependency tree.
//
// npm also reports vulnerabilities in its own bundled internals
// (node_modules/npm/**) that no npm release has patched yet — checked npm
// 11.19.0 and 12.0.2, Aug 2026: brace-expansion, ip-address, tar and undici
// are all still flagged inside the bundle. npm audit itself says such
// findings "cannot be fixed automatically". Findings rooted in npm's bundle
// (plus the pure dependency-chain findings they propagate through, e.g.
// npm -> @semantic-release/npm -> semantic-release) are ignored here.
// Re-check `node_modules/npm` after npm ships a patched bundle and drop the
// ignore logic if so.
import { readFileSync } from "node:fs";

const report = JSON.parse(readFileSync(0, "utf8"));

if (report.error) {
  console.error(
    `npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`,
  );
  process.exit(1);
}

const vulns = report.vulnerabilities ?? {};
const isNpmBundleNode = (node) =>
  node === "node_modules/npm" || node.startsWith("node_modules/npm/");

// Leaf findings directly inside npm's bundled tree.
const ignored = new Set(
  Object.entries(vulns)
    .filter(([, v]) => v.nodes.some(isNpmBundleNode))
    .map(([name]) => name),
);

// Chain findings whose every cause is an already-ignored package.
let changed = true;
while (changed) {
  changed = false;
  for (const [name, v] of Object.entries(vulns)) {
    if (ignored.has(name)) continue;
    const via = v.via ?? [];
    if (
      via.length > 0 &&
      via.every((cause) => typeof cause === "string" && ignored.has(cause))
    ) {
      ignored.add(name);
      changed = true;
    }
  }
}

const remaining = Object.entries(vulns).filter(([name]) => !ignored.has(name));
if (remaining.length > 0) {
  for (const [name, v] of remaining) {
    console.error(`${name} (${v.severity}): ${v.nodes.join(" -> ")}`);
  }
  process.exit(1);
}
console.log("npm audit: no vulnerabilities in the project dependency tree");
