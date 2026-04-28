/**
 * Drop CSS rules that reference no class used in panel JSX (plus sr-only for violationContext HTML).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import postcss from "postcss";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const panelDir = path.join(__dirname, "../src/panel");
const outPath = path.join(__dirname, "../src/panel/styles.css");

const used = new Set();
for (const f of fs.readdirSync(panelDir).filter((x) => x.endsWith(".jsx"))) {
  const s = fs.readFileSync(path.join(panelDir, f), "utf8");
  for (const m of s.matchAll(/className=\{`([^`]+)`\}/g)) {
    m[1]
      .replace(/\$\{[^}]+\}/g, " ")
      .split(/\s+/)
      .forEach((c) => c && used.add(c));
  }
  for (const m of s.matchAll(/className="([^"]+)"/g)) {
    m[1].split(/\s+/).forEach((c) => c && used.add(c));
  }
  for (const m of s.matchAll(/className='([^']+)'/g)) {
    m[1].split(/\s+/).forEach((c) => c && used.add(c));
  }
  for (const line of s.split("\n")) {
    if (!line.includes("className")) continue;
    for (const m of line.matchAll(/["']([a-zA-Z_][\w-]*)["']/g)) used.add(m[1]);
  }
}
used.add("sr-only");

function selectorTouchesUsed(sel) {
  if (!sel.includes(".")) return true;
  const classes = sel.match(/\.([\w-]+)/g);
  if (!classes) return true;
  return classes.some((c) => used.has(c.slice(1)));
}

const css = fs.readFileSync(outPath, "utf8");
const root = postcss.parse(css, { from: outPath });

const toRemoveRules = [];
root.walkRules((rule) => {
  if (!selectorTouchesUsed(rule.selector)) toRemoveRules.push(rule);
});
toRemoveRules.forEach((r) => r.remove());

const toRemoveAt = [];
root.walkAtRules((at) => {
  if (!at.nodes || at.nodes.length === 0) toRemoveAt.push(at);
});
toRemoveAt.forEach((n) => n.remove());

const out = root
  .toString()
  .replace(/\n{3,}/g, "\n\n")
  .trim();
const banner =
  "/* AccessLens panel — after className edits: `npm run css:build` (prune + shrink). */\n\n";

fs.writeFileSync(outPath, `${banner}${out}\n`, "utf8");

const lines = fs.readFileSync(outPath, "utf8").split("\n").length;
console.log("used classes", used.size);
console.log("lines", lines);
