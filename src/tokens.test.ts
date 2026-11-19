import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Other modules (console, data, timeline) consume these by exact name, so a
 * rename here silently drops their styling. talos.css must apply the scrollbar
 * system at the root and carry the shared status-pulse keyframe.
 */
const SRC = join(import.meta.dir);
const tokens = readFileSync(join(SRC, "tokens.css"), "utf8");
const core = readFileSync(join(SRC, "talos.css"), "utf8");

describe("foundation tokens", () => {
  test.each(["--talos-scrollbar-thumb", "--talos-scrollbar-thumb-hover", "--talos-scrollbar-track", "--talos-font-mono"])(
    "tokens.css defines %s",
    (name) => {
      expect(tokens).toMatch(new RegExp(`^\\s*${name}\\s*:`, "m"));
    },
  );

  test("talos.css applies the scrollbar tokens at the root", () => {
    expect(core).toContain("color-scheme: dark;");
    expect(core).toContain("scrollbar-color: var(--talos-scrollbar-thumb) var(--talos-scrollbar-track);");
    expect(core).toContain("scrollbar-width: thin;");
    expect(core).toContain(".talos-scroll--hidden");
    expect(core).toContain(".talos-scroll--fade");
  });

  test("talos.css owns the shared talos-pulse keyframe", () => {
    expect(core).toMatch(/@keyframes talos-pulse\s*\{/);
  });

  test("tertiary text and resting edge alphas clear WCAG floors", () => {
    const alpha = (name: string) => Number(tokens.match(new RegExp(`${name}:\\s*hsl\\(0 0% 100% / ([0-9.]+)\\)`))?.[1]);
    expect(alpha("--talos-text-tertiary")).toBeGreaterThanOrEqual(0.5); // 4.97:1 on surface-4
    expect(alpha("--talos-edge-default")).toBeGreaterThanOrEqual(0.36); // 3.13:1 on surface-0
  });
});
