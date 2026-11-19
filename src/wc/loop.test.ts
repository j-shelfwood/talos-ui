import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { installFrames, settle } from "../../test/dom/frames";
import { define } from "./register";
import { TalosGauge } from "./talos-gauge";
import { TalosMeter } from "./talos-meter";
import { TalosCompass } from "./talos-compass";
import { TalosRange } from "./talos-range";
import { TalosFlow } from "./talos-flow";
import { approach, FrameLoop } from "./loop";

define("talos-gauge", TalosGauge);
define("talos-meter", TalosMeter);
define("talos-compass", TalosCompass);
define("talos-range", TalosRange);
define("talos-flow", TalosFlow);

let frames: ReturnType<typeof installFrames>;
beforeEach(() => {
  frames = installFrames();
  document.body.innerHTML = "";
});
afterEach(() => frames.restore());

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

describe("FrameLoop", () => {
  test("stops when step returns false and start is idempotent", () => {
    let calls = 0;
    const loop = new FrameLoop(() => ++calls < 3);
    loop.start();
    loop.start();
    expect(frames.pending).toBe(1);
    frames.flush(10);
    expect(calls).toBe(3);
    expect(loop.running).toBe(false);
    expect(frames.pending).toBe(0);
  });

  test("approach snaps to the target inside the dead zone", () => {
    expect(approach(0, 100)).toBeCloseTo(18);
    expect(approach(99.7, 100)).toBe(100);
  });
});

// Each eased instrument: no frame at rest, frames while tweening, none after.
const eased: Array<[string, string, string]> = [
  ["talos-gauge", "value", "80"],
  ["talos-meter", "value", "80"],
  ["talos-range", "value", "80"],
  ["talos-compass", "heading", "200"],
];

describe.each(eased)("%s ease loop", (tag, attr, next) => {
  test("idle schedules nothing; a change runs a loop that settles", async () => {
    const el = mount(`<${tag} ${attr}="10"></${tag}>`);
    expect(frames.pending).toBe(0);
    el.setAttribute(attr, next);
    await settle();
    expect(frames.pending).toBe(1);
    const ran = frames.flush(500);
    expect(ran).toBeGreaterThan(5);
    expect(ran).toBeLessThan(500);
    expect(frames.pending).toBe(0);
  });

  test("aria is written on change, not per frame", async () => {
    const el = mount(`<${tag} ${attr}="10" label="x"></${tag}>`);
    el.setAttribute(attr, next);
    await settle();
    let writes = 0;
    const set = el.setAttribute.bind(el);
    el.setAttribute = (n: string, v: string) => {
      if (n === "aria-label") writes++;
      set(n, v);
    };
    frames.flush(500);
    expect(writes).toBe(0);
  });

  test("disconnect cancels a running loop", async () => {
    const el = mount(`<${tag} ${attr}="10"></${tag}>`);
    el.setAttribute(attr, next);
    await settle();
    el.remove();
    expect(frames.pending).toBe(0);
  });
});

describe("talos-meter ticks", () => {
  test("tick elements are built on attribute change only", async () => {
    const el = mount(`<talos-meter value="10" warn="70" crit="90"></talos-meter>`);
    const ticks = el.shadowRoot!.querySelector(".ticks")!;
    const first = [...ticks.children];
    expect(first).toHaveLength(2);
    el.setAttribute("value", "80");
    await settle();
    const afterRender = [...ticks.children];
    frames.flush(500);
    expect([...ticks.children]).toEqual(afterRender);
    expect(afterRender[0]).toBe(ticks.children[0]);
  });
});

describe("talos-flow travel loop", () => {
  test("rate 0 schedules nothing; rate > 0 runs; back to 0 stops", async () => {
    const el = mount(`<talos-flow rate="0"></talos-flow>`);
    expect(frames.pending).toBe(0);
    el.setAttribute("rate", "50");
    await settle();
    expect(frames.flush(20)).toBe(20);
    expect(frames.pending).toBe(1);
    el.setAttribute("rate", "0");
    await settle();
    frames.flush(5);
    expect(frames.pending).toBe(0);
  });

  test("fallback chevron polylines are not hidden by the group rule", () => {
    const el = mount(`<talos-flow rate="10"></talos-flow>`);
    const css = el.shadowRoot!.querySelector("style")!.textContent!;
    const group = el.shadowRoot!.querySelector("[part=chevrons]")!;
    expect(group.getAttribute("class")).toBe("chevrons");
    expect(css).toMatch(/\.chevrons\s*\{\s*display:\s*none/);
    expect(css).not.toMatch(/\.chevron\s*\{[^}]*display:\s*none/);
  });
});

describe("over-range readouts", () => {
  test.each(["talos-gauge", "talos-meter"])("%s shows the true value and flags it", (tag) => {
    const el = mount(`<${tag} value="130" max="100" unit="%"></${tag}>`);
    const readout = el.shadowRoot!.querySelector(".readout")!.textContent;
    expect(readout).toBe("130%");
    expect(el.getAttribute("data-range")).toBe("over");
    expect(el.getAttribute("aria-label")).toContain("over range");
  });

  test("in-range value carries no data-range", () => {
    const el = mount(`<talos-gauge value="50"></talos-gauge>`);
    expect(el.hasAttribute("data-range")).toBe(false);
  });
});

describe("talos-meter compact", () => {
  test("compact writes no inline width; full meter does", async () => {
    const el = mount(`<talos-meter value="10" compact></talos-meter>`);
    expect(el.style.width).toBe("");
    el.removeAttribute("compact");
    await settle();
    expect(el.style.width).toBe("200px");
    el.setAttribute("compact", "");
    await settle();
    expect(el.style.width).toBe("");
  });
});
