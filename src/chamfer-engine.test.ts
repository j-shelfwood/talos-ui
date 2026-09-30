import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The chamfer engine (talos.css) only draws a border + cut on selectors listed
 * in its :where() registry. A component that sets a corner variable
 * (--_tl/--_tr/--_br/--_bl) without being listed renders square and borderless
 * with no error, so the registry is checked against every stylesheet.
 */

const SRC = join(import.meta.dir);
const sheets = readdirSync(SRC)
  .filter((f) => f.endsWith(".css"))
  .map((f) => ({ file: f, css: readFileSync(join(SRC, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "") }));

// Registry entries that are only ever a base for modifiers (no rule of their own).
const BARE = [".talos-chamfer"];

// Elements that combine an engine class with their own geometry class.
const COMPOSED = [".talos-navbar-pill"]; // always rendered as .glass-panel.talos-navbar-pill

const CORNER_VAR = /--_(tl|tr|br|bl)\s*:/;

function registry(): string[] {
  const core = sheets.find((s) => s.file === "talos.css")!.css;
  const m = core.match(/:where\(([^)]*)\)\s*\{\s*--_edge/);
  if (!m) throw new Error("engine :where() registry not found in talos.css");
  return m[1].split(",").map((c) => c.trim()).filter(Boolean);
}

function cornerSetters(): { file: string; selector: string }[] {
  const out: { file: string; selector: string }[] = [];
  for (const { file, css } of sheets) {
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = m[1].trim().replace(/^@media[^{]*$/, "");
      if (!CORNER_VAR.test(m[2]) || selector.startsWith(":where(")) continue;
      for (const part of selector.split(",")) out.push({ file, selector: part.trim() });
    }
  }
  return out;
}

// `.talos-button--xs:hover` -> `.talos-button--xs` and `.talos-button`;
// `.a .b` -> the subject `.b`; `.x.y` -> `.x`, `.y`
function classesOf(selector: string): string[] {
  const last = selector.split(/\s+/).pop()!;
  return [...last.matchAll(/\.[\w-]+/g)].flatMap((m) => [m[0], m[0].replace(/--[\w-]+$/, "")]);
}

describe("chamfer engine registry", () => {
  const listed = registry();

  test("registry is non-trivial", () => {
    expect(listed.length).toBeGreaterThan(10);
    expect(listed).toContain(".talos-chamfer");
  });

  test("every selector that sets a corner variable is an engine class", () => {
    const orphans = cornerSetters().filter(({ selector }) => {
      const classes = classesOf(selector);
      return !classes.some((c) => listed.includes(c) || COMPOSED.includes(c));
    });
    expect(orphans).toEqual([]);
  });

  test("every registry entry is styled somewhere", () => {
    const all = sheets.map((s) => s.css).join("\n");
    const unused = listed.filter((c) => !BARE.includes(c) && !new RegExp(`\\${c}(?![\\w-])`).test(all.replace(/:where\([^)]*\)/, "")));
    expect(unused).toEqual([]);
  });
});
