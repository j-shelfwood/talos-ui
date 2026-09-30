/**
 * Real-browser contract for the chamfer engine (src/talos.css "CHAMFER ENGINE").
 * Run: bun run test:visual   (PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to reuse a cached Chromium)
 *
 * Pixel checks on test/visual/kit.html, rendered at 2x:
 *   - every declared corner is cut by exactly its size in CSS px, at any element width
 *   - every other corner stays square
 *   - a hairline (brighter than the fill) runs along the WHOLE diagonal of every cut,
 *     which is the defect clip-path + border alone produces
 * plus computed-style checks for the pieces consumers rely on.
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright-core";

const DPR = 2;
const BG: [number, number, number] = [24, 56, 96]; // kit.html page background
const TOLERANCE_PX = 2; // device px, anti-aliasing on the clip edge
const MIN_EDGE_LIFT = 12; // hairline luminance above the fill next to it (0-255)

type Corner = "tl" | "tr" | "br" | "bl";
type Cuts = Partial<Record<Corner, number>>;

const kit = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "kit.html")).href;

const parseCuts = (s: string): Cuts =>
  Object.fromEntries(s.split(",").map((p) => [p.split(":")[0], Number(p.split(":")[1])])) as Cuts;

/** Runs in the page: decode the element screenshot and measure cuts and diagonals. */
const analyze = async ({ b64, dpr, cuts, bg, lift }: { b64: string; dpr: number; cuts: Cuts; bg: number[]; lift: boolean }) => {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const { data, width: W, height: H } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = (x: number, y: number) => {
    const i = (y * W + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const lum = (p: number[]) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  const isBg = (p: number[]) => p.every((v, i) => Math.abs(v - bg[i]) <= 3);
  // Normalise every corner to "bottom-right" so one routine measures all four.
  const flip: Record<string, (x: number, y: number) => [number, number]> = {
    br: (x, y) => [x, y],
    tr: (x, y) => [x, H - 1 - y],
    bl: (x, y) => [W - 1 - x, y],
    tl: (x, y) => [W - 1 - x, H - 1 - y],
  };
  const result: Record<string, { expected: number; measured: number; weakest: number; gaps: number }> = {};
  for (const corner of ["tl", "tr", "br", "bl"]) {
    const f = flip[corner];
    const expected = (cuts[corner as Corner] ?? 0) * dpr;
    // Measure on a row ROW px inside the edge: element heights are fractional, so the
    // outermost screenshot row is a blend. A 45-degree cut shrinks by ROW there.
    const ROW = 4;
    let measured = 0;
    for (let x = W - 1; x >= 0; x--) {
      const [ax, ay] = f(x, H - 1 - ROW);
      if (isBg(px(ax, ay))) measured++;
      else break;
    }
    measured += expected > 0 ? ROW : 0;
    let weakest = 255;
    let gaps = 0;
    if (expected > 0 && lift) {
      const boundary = W + H - expected; // x' + y' on the clip edge
      for (let t = 3; t < expected - 3; t++) {
        const yN = H - expected + t;
        const xb = boundary - yN;
        let best = 0;
        for (let k = -(dpr * 2 + 1); k <= 1; k++) {
          const xN = xb + k;
          if (xN < 0 || xN >= W) continue;
          const [ax, ay] = f(xN, yN);
          best = Math.max(best, lum(px(ax, ay)));
        }
        const [fx, fy] = f(Math.max(0, xb - dpr * 5), yN);
        const lift = best - lum(px(fx, fy));
        weakest = Math.min(weakest, lift);
        if (lift < 12) gaps++;
      }
    }
    result[corner] = { expected, measured, weakest: Math.round(weakest), gaps };
  }
  return result;
};

const failures: string[] = [];
const check = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`  FAIL ${name}\n       ${(e as Error).message.split("\n")[0]}`);
  }
};

async function cornerChecks(page: Page) {
  const ids = await page.$$eval("[data-cuts]", (els) => els.map((e) => [e.id, e.getAttribute("data-cuts")!, e.getAttribute("data-edge") ?? ""]));
  for (const [id, spec, edge] of ids) {
    const cuts = parseCuts(spec);
    const png = await page.locator(`#${id}`).screenshot({ animations: "disabled" });
    const r = await page.evaluate(analyze, { b64: png.toString("base64"), dpr: DPR, cuts, bg: BG, lift: edge !== "same-as-fill" });
    for (const corner of ["tl", "tr", "br", "bl"] as Corner[]) {
      const m = r[corner];
      check(`${id} ${corner}: ${m.expected ? `cut ${cuts[corner]}px` : "square"}`, () => {
        assert.ok(Math.abs(m.measured - m.expected) <= TOLERANCE_PX, `measured ${m.measured / DPR}px, expected ${m.expected / DPR}px`);
        if (m.expected && edge !== "same-as-fill") assert.equal(m.gaps, 0, `${m.gaps} diagonal samples without a hairline (weakest lift ${m.weakest}, need ${MIN_EDGE_LIFT})`);
      });
    }
  }
}

async function styleChecks(page: Page) {
  const s = await page.evaluate(() => {
    const h = (id: string) => document.getElementById(id)!.getBoundingClientRect().height;
    const cs = (id: string, pseudo?: string) => getComputedStyle(document.getElementById(id)!, pseudo);
    return {
      inputH: h("input-240"),
      selectH: h("select"),
      tabLinkDecoration: cs("tab-link").textDecorationLine,
      hud: { family: cs("hud").fontFamily, transform: cs("hud").textTransform, weight: cs("hud").fontWeight, ls: cs("hud").letterSpacing },
      hudTightLs: cs("hud-tight").letterSpacing,
      panelBefore: cs("panel", "::before").content,
      btnBorder: cs("btn-160").borderTopWidth,
    };
  });
  check("select and input have the same height", () => assert.ok(Math.abs(s.inputH - s.selectH) < 0.5, `${s.inputH} vs ${s.selectH}`));
  check("an <a class=talos-tab> has no text-decoration", () => assert.equal(s.tabLinkDecoration, "none"));
  check(".talos-hud is the uppercase display voice", () => {
    assert.match(s.hud.family, /Oxanium/);
    assert.equal(s.hud.transform, "uppercase");
    assert.equal(s.hud.weight, "300");
  });
  check(".talos-hud--tight tracks tighter than .talos-hud", () => assert.ok(parseFloat(s.hudTightLs) < parseFloat(s.hud.ls), `${s.hudTightLs} vs ${s.hud.ls}`));
  check(".glass-panel draws its fill on the host (no ::before)", () => assert.equal(s.panelBefore, "none"));
  check("engine elements carry a real 1px border", () => assert.equal(s.btnBorder, "1px"));
}

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: DPR });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(kit);
  await page.evaluate(() => document.fonts.ready);
  console.log("corners");
  await cornerChecks(page);
  console.log("styles");
  await styleChecks(page);
} finally {
  await browser.close();
}
if (failures.length) {
  console.log(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nall chamfer contract checks passed");
