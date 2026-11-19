import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { installFakeDom, type FakeDom, type FakeElement } from "./test-dom";
import type { OrbitalNode, TalosOrbital as TalosOrbitalType } from "./talos-orbital";

let dom: FakeDom;
let TalosOrbital: typeof TalosOrbitalType;
const mounted: TalosOrbitalType[] = [];

beforeAll(async () => {
  dom = installFakeDom();
  // The class extends HTMLElement at evaluation time: import after the stub, under a
  // query so a copy cached by another test file (register.test.ts stubs HTMLElement
  // as an empty class) is not reused.
  const spec = "./talos-orbital?fake-dom";
  ({ TalosOrbital } = (await import(spec)) as typeof import("./talos-orbital"));
});
afterEach(() => {
  for (const el of mounted.splice(0)) dom.unmount(el);
  dom.setReducedMotion(false);
  dom.setVisibility("visible");
  dom.frame(0); // drain
});
afterAll(() => dom.restore());

const N = (id: string, over: Partial<OrbitalNode> = {}): OrbitalNode => ({
  id,
  ring: 1,
  value: 10,
  load: 0.5,
  rate: 0,
  label: id,
  ...over,
});

function make(attrs: Record<string, string> = {}): TalosOrbitalType {
  const el = new TalosOrbital();
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  mounted.push(el);
  return dom.mount(el);
}
const shadow = (el: TalosOrbitalType) => el.shadowRoot as unknown as FakeElement;
const nodeG = (el: TalosOrbitalType, id: string) =>
  shadow(el).find((e) => e.getAttribute("role") === "option" && e.getAttribute("data-id") === id);
const svgOf = (el: TalosOrbitalType) => shadow(el).find((e) => e.tagName === "svg")!;
const core = (el: TalosOrbitalType) => shadow(el).find((e) => e.getAttribute("part") === "core")!;
const tip = (el: TalosOrbitalType) => shadow(el).find((e) => e.getAttribute("part") === "tooltip")!;
const key = (target: FakeElement, k: string) => {
  const e = new Event("keydown", { cancelable: true });
  Object.defineProperty(e, "key", { value: k });
  target.dispatchEvent(e);
  return e;
};
const settle = () => dom.run(16, 2000);

describe("<talos-orbital> keyed rendering", () => {
  test("reassigning .nodes keeps each node's element and updates its band", () => {
    const el = make();
    el.nodes = [N("a"), N("b")];
    const a = nodeG(el, "a")!;
    const b = nodeG(el, "b")!;
    expect(a.getAttribute("data-band")).toBe("nominal");

    el.nodes = [N("a", { value: 95 }), N("b", { value: 75 })];
    expect(nodeG(el, "a")).toBe(a);
    expect(nodeG(el, "b")).toBe(b);
    expect(a.getAttribute("data-band")).toBe("critical");
    expect(b.getAttribute("data-band")).toBe("warning");
    expect(el.nodes.map((n) => n.id)).toEqual(["a", "b"]);
  });

  test("animation frames update attributes without replacing elements", () => {
    const el = make();
    el.nodes = [N("a", { rate: 60 })];
    const a = nodeG(el, "a")!;
    const before = a.getAttribute("transform");
    dom.run(16, 400);
    expect(nodeG(el, "a")).toBe(a);
    expect(a.getAttribute("transform")).not.toBe(before);
  });

  test("changing the ring count re-lays out without rebuilding nodes", () => {
    const el = make({ rings: "3" });
    el.nodes = [N("a", { ring: 3 })];
    settle();
    const a = nodeG(el, "a")!;
    const rings = shadow(el).find((e) => e.getAttribute("class") === "rings")!;
    expect(rings.children.length).toBe(3);
    el.setAttribute("rings", "5");
    expect(rings.children.length).toBe(5);
    expect(nodeG(el, "a")).toBe(a);
    expect(dom.pendingFrames()).toBe(1); // radius tween toward the new ring radius
  });

  test("size sets the intrinsic width, capped by the container", () => {
    const el = make({ size: "260" });
    const sizeStyle = shadow(el).findAll((e) => e.tagName === "style")[1]!;
    expect(sizeStyle.textContent).toContain("width: min(100%, 260px)");
    expect(svgOf(el).getAttribute("viewBox")).toBe("0 0 260 260");
  });
});

describe("<talos-orbital> enter / exit", () => {
  test("a new node grows in from the core, a removed node fades out then leaves", () => {
    const el = make();
    el.nodes = [N("a"), N("b")];
    const b = nodeG(el, "b")!;
    expect(Number(b.getAttribute("opacity"))).toBe(0);
    settle();
    expect(Number(b.getAttribute("opacity"))).toBe(1);

    el.nodes = [N("a")];
    expect(nodeG(el, "b")).toBe(b); // still present while exiting
    expect(el.nodes.map((n) => n.id)).toEqual(["a"]);
    dom.run(2016, 2200);
    expect(Number(b.getAttribute("opacity"))).toBeLessThan(1);
    dom.run(2216, 3000);
    expect(nodeG(el, "b")).toBeUndefined();
  });

  test("a node re-added mid-exit keeps its element", () => {
    const el = make();
    el.nodes = [N("a"), N("b")];
    settle();
    const b = nodeG(el, "b")!;
    el.nodes = [N("a")];
    dom.run(2016, 2100);
    el.nodes = [N("a"), N("b")];
    dom.run(2116, 3000);
    expect(nodeG(el, "b")).toBe(b);
    expect(Number(b.getAttribute("opacity"))).toBe(1);
  });
});

describe("<talos-orbital> selection and keyboard", () => {
  test("click selects, emits talos:select, reflects to the attribute; second click clears", () => {
    const el = make();
    el.nodes = [N("a"), N("b")];
    const events: unknown[] = [];
    el.addEventListener("talos:select", (e) => events.push((e as CustomEvent).detail));

    nodeG(el, "a")!.dispatchEvent(new Event("click"));
    expect(el.getAttribute("selected")).toBe("a");
    expect(el.selected).toBe("a");
    expect(nodeG(el, "a")!.getAttribute("aria-selected")).toBe("true");
    expect(nodeG(el, "b")!.getAttribute("aria-selected")).toBe("false");
    expect(svgOf(el).getAttribute("class")).toContain("has-selection");
    expect(events).toEqual([{ id: "a", node: N("a") }]);

    nodeG(el, "a")!.dispatchEvent(new Event("click"));
    expect(el.hasAttribute("selected")).toBe(false);
    expect(events[1]).toEqual({ id: null, node: null });
  });

  test("controlled selection via the property does not emit", () => {
    const el = make();
    el.nodes = [N("a"), N("b")];
    let fired = 0;
    el.addEventListener("talos:select", () => fired++);
    el.selected = "b";
    expect(el.getAttribute("selected")).toBe("b");
    expect(nodeG(el, "b")!.getAttribute("aria-selected")).toBe("true");
    expect(fired).toBe(0);
  });

  test("roving focus: arrows move the active option, Enter selects, Escape clears", () => {
    const el = make();
    el.nodes = [N("a"), N("b"), N("c")];
    const svg = svgOf(el);
    expect(svg.getAttribute("role")).toBe("listbox");
    expect(svg.getAttribute("tabindex")).toBe("0");

    svg.dispatchEvent(new Event("focus"));
    expect(svg.getAttribute("aria-activedescendant")).toBe(nodeG(el, "a")!.getAttribute("id"));
    expect(tip(el).hasAttribute("hidden")).toBe(false);
    expect(tip(el).textContent).toContain("a");

    expect(key(svg, "ArrowRight").defaultPrevented).toBe(true);
    expect(svg.getAttribute("aria-activedescendant")).toBe(nodeG(el, "b")!.getAttribute("id"));
    key(svg, "ArrowLeft");
    key(svg, "ArrowLeft");
    expect(svg.getAttribute("aria-activedescendant")).toBe(nodeG(el, "c")!.getAttribute("id"));

    const events: unknown[] = [];
    el.addEventListener("talos:select", (e) => events.push((e as CustomEvent).detail));
    key(svg, "Enter");
    expect(el.selected).toBe("c");
    key(svg, "Escape");
    expect(el.selected).toBeNull();
    expect(events.map((d) => (d as { id: string | null }).id)).toEqual(["c", null]);

    svg.dispatchEvent(new Event("blur"));
    expect(tip(el).hasAttribute("hidden")).toBe(true);
  });

  test("hover shows the tooltip and emits talos:hover", () => {
    const el = make();
    el.nodes = [N("a", { value: 95, load: 0.4, rate: 30 })];
    const hovers: unknown[] = [];
    el.addEventListener("talos:hover", (e) => hovers.push((e as CustomEvent).detail));
    nodeG(el, "a")!.dispatchEvent(new Event("pointerenter"));
    const text = tip(el).textContent;
    for (const part of ["a", "value 95", "load 40%", "rate 30", "critical"]) expect(text).toContain(part);
    nodeG(el, "a")!.dispatchEvent(new Event("pointerleave"));
    expect(tip(el).hasAttribute("hidden")).toBe(true);
    expect(hovers.map((d) => (d as { id: string | null }).id)).toEqual(["a", null]);
  });
});

describe("<talos-orbital> loop control", () => {
  test("the loop stops once parked nodes have settled, and restarts on change", () => {
    const el = make();
    el.nodes = [N("a"), N("b")]; // rate 0: only the enter tween moves
    expect(dom.pendingFrames()).toBe(1);
    const t = settle();
    expect(dom.pendingFrames()).toBe(0);
    expect(el.running).toBe(false);

    el.nodes = [N("a", { rate: 50 }), N("b")];
    expect(dom.pendingFrames()).toBe(1);
    dom.run(t, t + 500);
    expect(dom.pendingFrames()).toBe(1); // flowing node keeps it running

    el.nodes = [N("a"), N("b")];
    dom.run(t + 516, t + 600);
    expect(dom.pendingFrames()).toBe(0);
  });

  test("a hidden document stops the loop; becoming visible restarts it", () => {
    const el = make();
    el.nodes = [N("a", { rate: 80 })];
    dom.run(16, 100);
    expect(dom.pendingFrames()).toBe(1);
    dom.setVisibility("hidden");
    expect(dom.pendingFrames()).toBe(0);
    dom.setVisibility("visible");
    expect(dom.pendingFrames()).toBe(1);
  });

  test("rate 0 draws no arc and no particles; rate > 0 draws both", () => {
    const el = make();
    el.nodes = [N("a"), N("b", { rate: 100 })];
    const link = (id: string) => shadow(el).find((e) => e.getAttribute("data-id") === id && !!e.getAttribute("class")?.startsWith("link"))!;
    const particles = (id: string) => link(id).findAll((e) => e.getAttribute("class") === "particle").length;
    expect(link("a").find((e) => e.getAttribute("class") === "arc")!.getAttribute("display")).toBe("none");
    expect(particles("a")).toBe(0);
    expect(link("b").find((e) => e.getAttribute("class") === "arc")!.hasAttribute("display")).toBe(false);
    expect(particles("b")).toBe(4);
  });

  test("reduced motion: no loop, no particles, instant exit, state still encoded", () => {
    dom.setReducedMotion(true);
    const el = make();
    el.nodes = [N("a", { rate: 90, value: 95 }), N("b")];
    expect(dom.pendingFrames()).toBe(0);
    const a = nodeG(el, "a")!;
    expect(Number(a.getAttribute("opacity"))).toBe(1);
    expect(a.getAttribute("data-band")).toBe("critical");
    expect(shadow(el).findAll((e) => e.getAttribute("class") === "particle").length).toBe(0);
    el.nodes = [N("a", { rate: 90, value: 95 })];
    expect(nodeG(el, "b")).toBeUndefined();
  });
});

describe("<talos-orbital> core aggregate", () => {
  test("core band is the worst node band; sub-line counts alarms", () => {
    const el = make({ "core-label": "ATLAS" });
    el.nodes = [N("a"), N("b")];
    expect(core(el).getAttribute("data-band")).toBe("nominal");
    const sub = () => core(el).find((e) => e.getAttribute("class") === "core-sub")!.textContent;
    expect(sub()).toBe("2 NODES");

    el.nodes = [N("a"), N("b", { value: 75 })];
    expect(core(el).getAttribute("data-band")).toBe("warning");
    el.nodes = [N("a"), N("b", { value: 75 }), N("c", { value: 99 })];
    expect(core(el).getAttribute("data-band")).toBe("critical");
    expect(sub()).toBe("1W 1C / 3");

    el.setAttribute("core-sub", "SYS://ATLAS");
    expect(sub()).toBe("SYS://ATLAS");
    expect(svgOf(el).getAttribute("aria-label")).toContain("1 nominal, 1 warning, 1 critical");
  });

  test("thresholds are read live from warn/crit", () => {
    const el = make();
    el.nodes = [N("a", { value: 50 })];
    expect(core(el).getAttribute("data-band")).toBe("nominal");
    el.setAttribute("crit", "40");
    expect(nodeG(el, "a")!.getAttribute("data-band")).toBe("critical");
    expect(core(el).getAttribute("data-band")).toBe("critical");
  });

  test("an empty mesh is an image, not an empty listbox", () => {
    const el = make();
    expect(svgOf(el).getAttribute("role")).toBe("img");
    expect(svgOf(el).hasAttribute("tabindex")).toBe(false);
  });
});
