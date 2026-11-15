import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A CSS module in src/ reaches consumers only when package.json ships it (`files`)
 * and maps it (`exports`); a module missing from either installs without error and
 * 404s on import. all.css is the barrel: it imports every module except the
 * quarantined opt-ins (PHILOSOPHY.md) and the Tailwind adapter.
 */

const ROOT = join(import.meta.dir, "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const modules = readdirSync(join(ROOT, "src")).filter((f) => f.endsWith(".css"));
const NOT_IN_BARREL = ["talos-marketing.css", "talos-motion.css", "talos-prose.css", "tailwind.css", "all.css", "tokens.css"];

describe("package surface", () => {
  test("every CSS module is in files and exports", () => {
    const missing = modules.filter((f) => !pkg.files.includes(`src/${f}`) || pkg.exports[`./${f}`] !== `./src/${f}`);
    expect(missing).toEqual([]);
  });

  test("all.css imports every core module; opt-ins, tokens (via talos.css) and the adapter stay out", () => {
    const barrel = readFileSync(join(ROOT, "src/all.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const imported = [...barrel.matchAll(/@import\s+"\.\/([^"]+)"/g)].map((m) => m[1]);
    expect(imported.sort()).toEqual(modules.filter((f) => !NOT_IN_BARREL.includes(f)).sort());
  });

  test("the timeline module is a layered component sheet", () => {
    const css = readFileSync(join(ROOT, "src/talos-timeline.css"), "utf8");
    expect(css.trimStart().startsWith("@layer components.talos {")).toBe(true);
    for (const cls of ["__lane", "__head", "__bar--solid", "__bar--outline", "__bar--hatched", "__bar--dotted", "__bar--muted", "__mark--merged", "__mark--opened", "__mark--decision", "__mark--failed", "__edges"]) {
      expect(css).toContain(`.talos-timeline${cls}`);
    }
    expect(css).toContain(".talos-drawer");
  });
});
