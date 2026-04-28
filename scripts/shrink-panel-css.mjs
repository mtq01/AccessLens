/**
 * Restructure + merge duplicate rules (csso), then format (Prettier) so @keyframes stay valid.
 * Run after `npm run css:prune`. Verify with `npm run build`.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { minify } from "csso";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const cssPath = path.join(root, "src/panel/styles.css");

const raw = fs.readFileSync(cssPath, "utf8");
const m = raw.match(/^(\/\*[\s\S]*?\*\/\s*\n?)/);
const banner = m?.[1]?.trim()
  ? `${m[1].trimEnd()}\n\n`
  : "/* AccessLens — `npm run css:prune` then `npm run css:shrink` after className changes. */\n\n";
const body = m ? raw.slice(m[0].length) : raw;

const { css: packed } = minify(body, {
  restructure: true,
  comments: false,
  forceMediaMerge: true,
});

fs.writeFileSync(cssPath, `${banner}${packed}\n`, "utf8");

try {
  execSync(
    'npx --yes prettier@3.2.5 --write "src/panel/styles.css"',
    { cwd: root, stdio: "inherit" },
  );
} catch {
  console.warn("Prettier failed; left csso minified one-line output.");
}

const out = fs.readFileSync(cssPath, "utf8");
console.log("lines", out.split("\n").length, "chars", out.length);
