/**
 * <talos-orbital> — a radial system instrument. A central core with nodes on
 * concentric rings. Every visual property and every motion is bound to live
 * state (PHILOSOPHY.md — form encodes function):
 *
 *   - RING            a subsystem (1 = innermost).
 *   - NODE SIZE       the node's `load` (0..1).
 *   - NODE COLOUR     health band of `value` against `warn`/`crit`; eases when a
 *                     node crosses a threshold.
 *   - HALO PULSE      critical nodes only. The pulse period shortens with the
 *                     overshoot past `crit` (1.6 s at the threshold, 0.5 s at
 *                     +14), so the pulse rate is severity, not decoration.
 *   - ORBIT SPEED     angular velocity ∝ `rate`. Rate 0 = parked.
 *   - FLOW ARC        core → node, drawn only while `rate` > 0, opacity ∝ rate.
 *   - PARTICLES       travel core → node along the arc; count and speed ∝ rate.
 *   - CORE            ring and halo take the WORST band across all nodes; the
 *                     sub-line shows node and band counts unless `core-sub` is set.
 *   - ENTER / EXIT    a new node grows out of the core onto its ring; a removed
 *                     node fades out before it leaves the DOM.
 *
 * Honest motion: under prefers-reduced-motion there is no orbit, no particles
 * and no pulse, and every transition is instant. Position, size, colour, arcs,
 * the static critical halo and the core band still carry the full state.
 *
 * Rendering is keyed: one persistent <g> per node id; a frame only updates
 * transforms and attributes, so hover, focus and CSS transitions survive. The
 * animation loop runs only while something moves (a node with rate > 0, an
 * enter/exit or ring-radius tween) AND the element is on screen in a visible
 * tab; otherwise it stops and restarts on the next change.
 *
 * Data API: set `.nodes` to an array of { id, ring, value, load, rate, label? }.
 * Re-assign `.nodes` (or mutate in place and call `update()`) to push state;
 * nodes are matched by `id`, so a persisting node keeps its element and angle.
 *
 * Interaction (an ARIA listbox inside the shadow root, one option per node):
 *   - hover or keyboard focus shows a tooltip: label, value, load, rate, band.
 *   - click / Enter / Space selects (click the selected node again to clear);
 *     Escape clears. Arrow keys move the active node, Home/End jump.
 *   - `selected` attribute / property = the selected node id (controlled).
 *   - events (bubbling, composed):
 *       talos:select  detail { id, node }  (both null when cleared)
 *       talos:hover   detail { id, node }  (both null when the pointer leaves)
 *     Events fire for user interaction only, not for a programmatic `selected`.
 *
 * Attributes:
 *   rings       number of concentric rings                    (default 3)
 *   warn/crit   band thresholds on node.value                  (default 70 / 90)
 *   size        intrinsic size in px; host width is            (default 520)
 *               min(100%, size), square; CSS width overrides
 *   core-label  text in the core                               (default CORE)
 *   core-sub    sub-line in the core                           (default: counts)
 *   selected    id of the selected node
 */
import { BAND_TOKENS_CSS, num, prefersReducedMotion, type Band } from "./bands";

export interface OrbitalNode {
  id: string;
  ring: number; // 1-based, 1 = innermost
  value: number; // drives colour band
  load: number; // 0..1, drives node size
  rate: number; // 0..100, drives orbit speed, flow arc and particles (0 = parked)
  label?: string;
}

export interface OrbitalEventDetail {
  id: string | null;
  node: OrbitalNode | null;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const ENTER_MS = 600;
const EXIT_MS = 420;
const ANNOUNCE_MS = 4000;
const BAND_RANK: Record<Band, number> = { nominal: 0, warning: 1, critical: 2 };

interface NodeView {
  data: OrbitalNode;
  key: string; // DOM id within the shadow root
  angle: number;
  radius: number; // displayed orbit radius (eases toward the ring radius)
  enter: number; // ms since enter began; >= ENTER_MS when settled
  exit: number; // ms since exit began; -1 while alive
  phase: number; // particle phase, 0..1
  band: Band;
  dotR: number;
  g: SVGGElement;
  dot: SVGCircleElement;
  halo: SVGCircleElement;
  sel: SVGCircleElement;
  focus: SVGCircleElement;
  hit: SVGCircleElement;
  label: SVGTextElement;
  link: SVGGElement;
  arc: SVGPathElement;
  particles: SVGCircleElement[];
}

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const f1 = (v: number) => v.toFixed(1);

const STYLE = /* css */ `
  :host {
    ${BAND_TOKENS_CSS}
    --_ring: var(--talos-edge-subtle, hsl(0 0% 100% / 0.08));
    --_ringStrong: var(--talos-edge-default, hsl(0 0% 100% / 0.16));
    --_fg: var(--talos-foreground, #e7e9ec);
    --_muted: var(--talos-muted-foreground, hsl(0 0% 60%));
    --_band: var(--_nominal);
    display: block;
    position: relative;
    aspect-ratio: 1 / 1;
    font-family: var(--talos-font-display, system-ui);
  }
  svg { display: block; width: 100%; height: 100%; overflow: visible; outline: none; }
  svg:focus-visible { outline: 1px dashed var(--_ringStrong); outline-offset: 4px; }
  .ring { fill: none; stroke: var(--_ring); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .ring--axis { stroke-dasharray: 2 6; }
  .arc { fill: none; stroke: var(--_c); stroke-width: 1; vector-effect: non-scaling-stroke;
         transition: stroke 600ms ease, opacity 300ms ease; }
  .particle { fill: var(--_c); transition: fill 600ms ease; }
  .link, .node { --_c: var(--_nominal); }
  [data-band="warning"] { --_c: var(--_warning); }
  [data-band="critical"] { --_c: var(--_critical); }
  .node { cursor: pointer; transition: opacity 300ms ease; }
  .dot { fill: var(--_c); stroke: rgba(0,0,0,0.5); stroke-width: 1; transition: fill 600ms ease; }
  .hit { fill: transparent; }
  .halo { fill: none; stroke: var(--_c); stroke-width: 1; vector-effect: non-scaling-stroke;
          transform-box: fill-box; transform-origin: center; opacity: 0;
          animation: talos-orbital-pulse 1.6s ease-out infinite; }
  .node[data-band="critical"] .halo { display: inline; }
  .halo { display: none; }
  .sel, .focus { fill: none; stroke: var(--_fg); stroke-width: 1; vector-effect: non-scaling-stroke; opacity: 0;
                 transition: opacity 200ms ease; }
  .focus { stroke-dasharray: 2 3; }
  .node[aria-selected="true"] .sel { opacity: 0.9; }
  svg.is-focused .node.is-active .focus { opacity: 0.9; }
  svg.has-selection .node:not([aria-selected="true"]),
  svg.has-selection .link:not(.is-selected) { opacity: 0.55; }
  .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; fill: var(--_muted);
           pointer-events: none; }
  .node[aria-selected="true"] .label { fill: var(--_fg); }
  .core { --_c: var(--_band); }
  .core[data-band="warning"] { --_band: var(--_warning); }
  .core[data-band="critical"] { --_band: var(--_critical); }
  .core-fill { fill: hsl(0 0% 0% / 0.6); }
  .core-ring { fill: none; stroke: var(--_ringStrong); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .core-band { fill: none; stroke: var(--_band); stroke-width: 1.5; vector-effect: non-scaling-stroke;
               transition: stroke 600ms ease; }
  .core-halo { fill: var(--_band); opacity: 0.08; transition: fill 600ms ease; }
  .core-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; fill: var(--_fg);
                text-anchor: middle; dominant-baseline: middle; }
  .core-sub { font-size: 8px; text-transform: uppercase; letter-spacing: 0.18em; fill: var(--_muted);
              text-anchor: middle; dominant-baseline: middle; }
  .tip {
    position: absolute; z-index: 1; pointer-events: none; white-space: nowrap;
    padding: 6px 8px; font-size: 11px; line-height: 1.4; letter-spacing: 0.06em;
    color: var(--_fg); background: var(--talos-surface-raised, hsl(0 0% 6% / 0.92));
    border: 1px solid var(--_ringStrong); border-left: 2px solid var(--_c, var(--_nominal));
    transform: translate(14px, -50%);
  }
  .tip[data-side="left"] { transform: translate(calc(-100% - 14px), -50%); }
  .tip[hidden] { display: none; }
  .tip b { display: block; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 600; }
  .tip span { display: block; color: var(--_muted); font-variant-numeric: tabular-nums; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0);
        clip-path: inset(50%); white-space: nowrap; }
  @keyframes talos-orbital-pulse {
    0% { transform: scale(1); opacity: 0.9; }
    100% { transform: scale(1.9); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .arc, .particle, .node, .dot, .sel, .focus, .core-band, .core-halo { transition: none; }
    .halo { animation: none; opacity: 0.7; transform: scale(1.4); }
  }
`;

export class TalosOrbital extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["rings", "warn", "crit", "size", "core-label", "core-sub", "selected"];
  }

  private root: ShadowRoot;
  private sizeStyle: HTMLStyleElement;
  private svgRoot: SVGSVGElement;
  private gRings: SVGGElement;
  private gLinks: SVGGElement;
  private gNodes: SVGGElement;
  private gCore: SVGGElement;
  private coreHalo: SVGCircleElement;
  private coreFill: SVGCircleElement;
  private coreBand: SVGCircleElement;
  private coreInner: SVGCircleElement;
  private coreLabel: SVGTextElement;
  private coreSub: SVGTextElement;
  private axes: SVGLineElement[];
  private tip: HTMLDivElement;
  private live: HTMLDivElement;

  private views = new Map<string, NodeView>();
  private order: string[] = []; // live node ids, in data order (keyboard order)
  private serial = 0;
  private raf = 0;
  private lastT = 0;
  private connected = false;
  private intersecting = true;
  private io?: IntersectionObserver;
  private mql?: MediaQueryList;
  private hovered: string | null = null;
  private active: string | null = null; // roving focus target
  private focused = false;
  private tipFor: string | null = null;
  private announced = "";
  private pendingAnnounce = "";
  private lastAnnounceAt = -Infinity;
  private announceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open", delegatesFocus: true });
    const style = document.createElement("style");
    style.textContent = STYLE;
    this.sizeStyle = document.createElement("style");

    this.svgRoot = svg("svg", { part: "svg", preserveAspectRatio: "xMidYMid meet" });
    this.gRings = svg("g", { class: "rings", part: "rings" });
    this.gLinks = svg("g", { class: "links", part: "arcs" });
    this.gNodes = svg("g", { class: "nodes", part: "nodes" });
    this.gCore = svg("g", { class: "core", part: "core", "data-band": "nominal" });
    this.axes = [svg("line", { class: "ring ring--axis" }), svg("line", { class: "ring ring--axis" })];
    this.coreHalo = svg("circle", { class: "core-halo" });
    this.coreFill = svg("circle", { class: "core-fill" });
    this.coreBand = svg("circle", { class: "core-band" });
    this.coreInner = svg("circle", { class: "core-ring" });
    this.coreLabel = svg("text", { class: "core-label" });
    this.coreSub = svg("text", { class: "core-sub" });
    this.gCore.append(this.coreHalo, this.coreFill, this.coreBand, this.coreInner, this.coreLabel, this.coreSub);
    const gAxes = svg("g", { class: "axes" });
    gAxes.append(...this.axes);
    this.svgRoot.append(gAxes, this.gRings, this.gLinks, this.gNodes, this.gCore);

    this.tip = document.createElement("div");
    this.tip.setAttribute("class", "tip");
    this.tip.setAttribute("part", "tooltip");
    this.tip.setAttribute("aria-hidden", "true");
    this.tip.setAttribute("hidden", "");
    this.live = document.createElement("div");
    this.live.setAttribute("class", "sr");
    this.live.setAttribute("aria-live", "polite");

    this.root.append(style, this.sizeStyle, this.svgRoot, this.tip, this.live);

    this.svgRoot.addEventListener("keydown", (e) => this.onKey(e as KeyboardEvent));
    this.svgRoot.addEventListener("focus", () => {
      this.focused = true;
      if (!this.active || !this.isLive(this.active)) this.active = this.selected && this.isLive(this.selected) ? this.selected : this.order[0] ?? null;
      this.reflectInteraction();
    });
    this.svgRoot.addEventListener("blur", () => {
      this.focused = false;
      this.reflectInteraction();
    });
  }

  connectedCallback(): void {
    this.connected = true;
    this.layout();
    this.reconcile();
    if (typeof IntersectionObserver !== "undefined") {
      this.io = new IntersectionObserver((entries) => {
        this.intersecting = entries[entries.length - 1]?.isIntersecting ?? true;
        this.kick();
      });
      this.io.observe(this);
    }
    if (typeof document !== "undefined" && document.addEventListener) {
      document.addEventListener("visibilitychange", this.onVisibility);
    }
    if (typeof matchMedia !== "undefined") {
      this.mql = matchMedia("(prefers-reduced-motion: reduce)");
      this.mql.addEventListener?.("change", this.onMotionPref);
    }
    this.kick();
  }

  disconnectedCallback(): void {
    this.connected = false;
    this.stop();
    this.io?.disconnect();
    this.io = undefined;
    document.removeEventListener?.("visibilitychange", this.onVisibility);
    this.mql?.removeEventListener?.("change", this.onMotionPref);
    clearTimeout(this.announceTimer);
  }

  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (!this.connected || oldValue === value) return;
    if (name === "size" || name === "rings") this.layout();
    this.reconcile();
    this.kick();
  }

  // ── public API ────────────────────────────────────────────────────────────

  /** Set the live node set. Nodes are keyed by `id`: a persisting node keeps its
   *  element, angle and transitions; new nodes enter, missing nodes exit. */
  set nodes(next: OrbitalNode[]) {
    const seen = new Set<string>();
    const ringCounts = new Map<number, number>();
    const ringIndex = new Map<string, number>();
    const fresh: OrbitalNode[] = [];
    for (const n of next ?? []) {
      if (!n || n.id == null || seen.has(String(n.id))) continue;
      seen.add(String(n.id));
      fresh.push(n);
      const r = this.ringOf(n);
      ringIndex.set(String(n.id), ringCounts.get(r) ?? 0);
      ringCounts.set(r, (ringCounts.get(r) ?? 0) + 1);
    }
    for (const n of fresh) {
      const id = String(n.id);
      const view = this.views.get(id);
      if (view) {
        view.data = n;
        if (view.exit >= 0) {
          view.exit = -1; // revived mid-exit: keep the element
        }
      } else {
        const r = this.ringOf(n);
        const angle = ((ringIndex.get(id) ?? 0) / (ringCounts.get(r) ?? 1)) * Math.PI * 2 + r * 0.7 - Math.PI / 2;
        this.views.set(id, this.createView(n, angle));
      }
    }
    for (const [id, view] of this.views) {
      if (!seen.has(id) && view.exit < 0) view.exit = 0;
    }
    this.order = fresh.map((n) => String(n.id));
    this.reconcile();
    this.kick();
  }
  get nodes(): OrbitalNode[] {
    return this.order.map((id) => this.views.get(id)!.data);
  }

  /** The selected node id, or null. Reflects the `selected` attribute. */
  get selected(): string | null {
    return this.getAttribute("selected") || null;
  }
  set selected(id: string | null) {
    if (id == null || id === "") this.removeAttribute("selected");
    else this.setAttribute("selected", String(id));
  }

  /** Re-read node fields after mutating them in place. */
  update(): void {
    this.reconcile();
    this.kick();
  }

  // ── geometry ──────────────────────────────────────────────────────────────

  private get sizePx(): number {
    return Math.max(80, num(this, "size", 520));
  }
  private get ringCount(): number {
    return Math.max(1, Math.round(num(this, "rings", 3)));
  }
  private get coreR(): number {
    return this.sizePx * 0.1;
  }
  private ringOf(n: OrbitalNode): number {
    return clamp(Math.round(Number(n.ring) || 1), 1, this.ringCount);
  }
  private ringRadius(r: number): number {
    const inner = this.coreR + this.sizePx * 0.06;
    const outer = this.sizePx * 0.46;
    return inner + ((outer - inner) * (r - 0.5)) / this.ringCount;
  }
  private bandOf(value: number): Band {
    if (value >= num(this, "crit", 90)) return "critical";
    if (value >= num(this, "warn", 70)) return "warning";
    return "nominal";
  }
  private isLive(id: string): boolean {
    const v = this.views.get(id);
    return !!v && v.exit < 0;
  }
  private reduced(): boolean {
    return prefersReducedMotion();
  }

  // ── static frame: viewBox, rings, axes, core geometry ──────────────────────

  private layout(): void {
    const s = this.sizePx;
    const c = s / 2;
    this.sizeStyle.textContent = `:host { width: min(100%, ${s}px); }`;
    this.svgRoot.setAttribute("viewBox", `0 0 ${s} ${s}`);

    const want = this.ringCount;
    const rings = Array.from(this.gRings.children) as SVGCircleElement[];
    while (rings.length < want) {
      const ring = svg("circle", { class: "ring" });
      this.gRings.appendChild(ring);
      rings.push(ring);
    }
    while (rings.length > want) rings.pop()!.remove();
    rings.forEach((ring, i) => {
      ring.setAttribute("cx", f1(c));
      ring.setAttribute("cy", f1(c));
      ring.setAttribute("r", f1(this.ringRadius(i + 1)));
    });

    const reach = s * 0.46;
    const [v, h] = this.axes;
    v.setAttribute("x1", f1(c)), v.setAttribute("x2", f1(c));
    v.setAttribute("y1", f1(c - reach)), v.setAttribute("y2", f1(c + reach));
    h.setAttribute("y1", f1(c)), h.setAttribute("y2", f1(c));
    h.setAttribute("x1", f1(c - reach)), h.setAttribute("x2", f1(c + reach));

    const r = this.coreR;
    for (const [el, rad] of [
      [this.coreHalo, r * 1.35],
      [this.coreFill, r],
      [this.coreBand, r],
      [this.coreInner, r * 0.7],
    ] as const) {
      el.setAttribute("cx", f1(c));
      el.setAttribute("cy", f1(c));
      el.setAttribute("r", f1(rad));
    }
    this.coreLabel.setAttribute("x", f1(c));
    this.coreLabel.setAttribute("y", f1(c - 4));
    this.coreSub.setAttribute("x", f1(c));
    this.coreSub.setAttribute("y", f1(c + 9));
  }

  // ── keyed node elements ───────────────────────────────────────────────────

  private createView(n: OrbitalNode, angle: number): NodeView {
    const key = `o${++this.serial}`;
    const id = String(n.id);
    const g = svg("g", { class: "node", id: key, role: "option", "data-id": id, "aria-selected": "false" });
    const halo = svg("circle", { class: "halo" });
    const sel = svg("circle", { class: "sel" });
    const focus = svg("circle", { class: "focus" });
    const hit = svg("circle", { class: "hit" });
    const dot = svg("circle", { class: "dot" });
    const label = svg("text", { class: "label" });
    g.append(halo, sel, focus, hit, dot, label);
    const link = svg("g", { class: "link", "data-id": id });
    const arc = svg("path", { class: "arc" });
    link.appendChild(arc);

    g.addEventListener("click", () => this.choose(id));
    g.addEventListener("pointerenter", () => this.setHover(id));
    g.addEventListener("pointerleave", () => {
      if (this.hovered === id) this.setHover(null);
    });

    this.gLinks.appendChild(link);
    this.gNodes.appendChild(g);
    const instant = this.reduced() || !this.connected;
    return {
      data: n,
      key,
      angle,
      radius: this.ringRadius(this.ringOf(n)),
      enter: instant ? ENTER_MS : 0,
      exit: -1,
      phase: 0,
      band: "nominal",
      dotR: 3,
      g,
      dot,
      halo,
      sel,
      focus,
      hit,
      label,
      link,
      arc,
      particles: [],
    };
  }

  private removeView(id: string): void {
    const view = this.views.get(id);
    if (!view) return;
    view.g.remove();
    view.link.remove();
    this.views.delete(id);
    if (this.hovered === id) this.hovered = null;
    if (this.active === id) this.active = this.order[0] ?? null;
  }

  /** Data → per-node attributes that do not change per frame: band, size,
   *  label, aria, halo period, particle count, core aggregate, summary. */
  private reconcile(): void {
    if (this.reduced()) {
      for (const [id, v] of this.views) if (v.exit >= 0) this.removeView(id);
    }
    const s = this.sizePx;
    const crit = num(this, "crit", 90);
    let worst: Band = "nominal";
    const counts: Record<Band, number> = { nominal: 0, warning: 0, critical: 0 };
    let maxRing = 0;

    for (const v of this.views.values()) {
      const n = v.data;
      const value = Number(n.value) || 0;
      const band = this.bandOf(value);
      v.band = band;
      v.dotR = 3 + clamp(Number(n.load) || 0, 0, 1) * s * 0.022;
      v.g.setAttribute("data-band", band);
      v.link.setAttribute("data-band", band);
      v.dot.setAttribute("r", f1(v.dotR));
      v.hit.setAttribute("r", f1(Math.max(v.dotR + 5, 11)));
      v.sel.setAttribute("r", f1(v.dotR + 4));
      v.focus.setAttribute("r", f1(v.dotR + 7));
      v.halo.setAttribute("r", f1(v.dotR + 3));
      if (band === "critical") {
        const period = clamp(1.6 - (value - crit) * 0.08, 0.5, 1.6);
        v.halo.style.animationDuration = `${period.toFixed(2)}s`;
      }
      const text = n.label ?? "";
      if (v.label.textContent !== text) v.label.textContent = text;
      v.g.setAttribute("aria-label", this.describe(n, band));

      const rate = clamp(Number(n.rate) || 0, 0, 100);
      const flowing = rate > 0;
      v.arc.setAttribute("opacity", flowing ? (0.12 + (rate / 100) * 0.5).toFixed(2) : "0");
      if (flowing) v.arc.removeAttribute("display");
      else v.arc.setAttribute("display", "none");
      const want = flowing && !this.reduced() ? clamp(Math.ceil(rate / 25), 1, 4) : 0;
      while (v.particles.length < want) {
        const p = svg("circle", { class: "particle", r: "1.6" });
        v.link.appendChild(p);
        v.particles.push(p);
      }
      while (v.particles.length > want) v.particles.pop()!.remove();

      if (v.exit < 0) {
        counts[band]++;
        if (BAND_RANK[band] > BAND_RANK[worst]) worst = band;
        maxRing = Math.max(maxRing, this.ringOf(n));
      }
    }

    // Core aggregate: worst band; sub-line shows counts unless overridden.
    this.gCore.setAttribute("data-band", worst);
    const total = this.order.length;
    const label = this.getAttribute("core-label") ?? "CORE";
    this.coreLabel.textContent = label;
    const sub = this.getAttribute("core-sub");
    const alarms = [counts.warning ? `${counts.warning}W` : "", counts.critical ? `${counts.critical}C` : ""]
      .filter(Boolean)
      .join(" ");
    this.coreSub.textContent =
      sub ?? (alarms ? `${alarms} / ${total}` : `${total} NODE${total === 1 ? "" : "S"}`);

    // Accessibility: a listbox when there is something to choose, else an image.
    const summary =
      `System mesh ${label}: ${total} node${total === 1 ? "" : "s"} across ${maxRing} ring${maxRing === 1 ? "" : "s"}. ` +
      `${counts.nominal} nominal, ${counts.warning} warning, ${counts.critical} critical.`;
    this.svgRoot.setAttribute("aria-label", summary);
    if (total > 0) {
      this.svgRoot.setAttribute("role", "listbox");
      this.svgRoot.setAttribute("tabindex", "0");
    } else {
      this.svgRoot.setAttribute("role", "img");
      this.svgRoot.removeAttribute("tabindex");
      this.svgRoot.removeAttribute("aria-activedescendant");
    }
    this.announce(summary);

    if (this.active && !this.isLive(this.active)) this.active = null;
    if (this.hovered && !this.isLive(this.hovered)) this.hovered = null;
    this.reflectInteraction();
    this.paint(0);
  }

  private describe(n: OrbitalNode, band: Band): string {
    const name = n.label || String(n.id);
    const load = Math.round(clamp(Number(n.load) || 0, 0, 1) * 100);
    return `${name}: value ${Math.round(Number(n.value) || 0)}, load ${load}%, rate ${Math.round(Number(n.rate) || 0)}, ${band}, ring ${this.ringOf(n)}`;
  }

  /** Throttled polite announcement of the summary (at most once per ANNOUNCE_MS). */
  private announce(text: string): void {
    if (text === this.announced) {
      this.pendingAnnounce = "";
      return;
    }
    this.pendingAnnounce = text;
    if (this.announceTimer !== undefined) return;
    const wait = Math.max(0, this.lastAnnounceAt + ANNOUNCE_MS - Date.now());
    this.announceTimer = setTimeout(() => {
      this.announceTimer = undefined;
      if (!this.pendingAnnounce) return;
      this.announced = this.pendingAnnounce;
      this.pendingAnnounce = "";
      this.lastAnnounceAt = Date.now();
      this.live.textContent = this.announced;
    }, wait);
  }

  // ── interaction ───────────────────────────────────────────────────────────

  private choose(id: string | null): void {
    const next = id !== null && id === this.selected ? null : id;
    if (id) this.active = id;
    this.selected = next;
    const node = next ? this.views.get(next)?.data ?? null : null;
    this.emit("talos:select", next, node);
  }

  private setHover(id: string | null): void {
    if (this.hovered === id) return;
    this.hovered = id;
    this.reflectInteraction();
    this.paint(0);
    this.emit("talos:hover", id, id ? this.views.get(id)?.data ?? null : null);
  }

  private emit(type: string, id: string | null, node: OrbitalNode | null): void {
    const detail: OrbitalEventDetail = { id, node: node ? { ...node } : null };
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private onKey(e: KeyboardEvent): void {
    const ids = this.order;
    if (!ids.length) return;
    const at = this.active ? ids.indexOf(this.active) : -1;
    let next: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = at < 0 ? 0 : (at + 1) % ids.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = at < 0 ? ids.length - 1 : (at - 1 + ids.length) % ids.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = ids.length - 1;
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (this.active) this.choose(this.active);
        return;
      case "Escape":
        if (this.selected !== null) {
          e.preventDefault();
          this.choose(null);
        }
        return;
      default:
        return;
    }
    e.preventDefault();
    this.active = ids[next]!;
    this.reflectInteraction();
    this.paint(0);
  }

  /** Selection, active-descendant, dimming and tooltip content. */
  private reflectInteraction(): void {
    const sel = this.selected && this.isLive(this.selected) ? this.selected : null;
    for (const [id, v] of this.views) {
      const on = id === sel;
      v.g.setAttribute("aria-selected", on ? "true" : "false");
      v.g.setAttribute("class", `node${id === this.active ? " is-active" : ""}`);
      v.link.setAttribute("class", `link${on ? " is-selected" : ""}`);
    }
    this.svgRoot.setAttribute(
      "class",
      [sel ? "has-selection" : "", this.focused ? "is-focused" : ""].filter(Boolean).join(" "),
    );
    const activeView = this.active ? this.views.get(this.active) : undefined;
    if (activeView && this.order.length) this.svgRoot.setAttribute("aria-activedescendant", activeView.key);
    else this.svgRoot.removeAttribute("aria-activedescendant");

    const target = this.hovered ?? (this.focused ? this.active : null);
    this.tipFor = target && this.isLive(target) ? target : null;
    if (!this.tipFor) {
      this.tip.setAttribute("hidden", "");
      return;
    }
    const v = this.views.get(this.tipFor)!;
    const n = v.data;
    const rows: [string, string][] = [
      ["b", n.label || String(n.id)],
      ["span", `value ${Math.round(Number(n.value) || 0)}`],
      ["span", `load ${Math.round(clamp(Number(n.load) || 0, 0, 1) * 100)}%`],
      ["span", `rate ${Math.round(Number(n.rate) || 0)}`],
      ["span", v.band],
    ];
    this.tip.replaceChildren(
      ...rows.map(([tag, text]) => {
        const el = document.createElement(tag);
        el.textContent = text;
        return el;
      }),
    );
    this.tip.style.setProperty("--_c", `var(--_${v.band})`);
    this.tip.removeAttribute("hidden");
  }

  // ── per-frame paint ───────────────────────────────────────────────────────

  /** Advance motion by dt seconds and write positions. Returns true while
   *  anything still moves (orbit, particles, enter/exit or radius tweens). */
  private paint(dt: number): boolean {
    const reduced = this.reduced();
    const s = this.sizePx;
    const c = s / 2;
    const ms = dt * 1000;
    let moving = false;
    const done: string[] = [];

    for (const [id, v] of this.views) {
      const n = v.data;
      const rate = clamp(Number(n.rate) || 0, 0, 100);
      const ring = this.ringOf(n);
      const target = this.ringRadius(ring);

      if (reduced) {
        v.radius = target;
        v.enter = ENTER_MS;
        if (v.exit >= 0) {
          done.push(id);
          continue;
        }
      } else {
        if (rate > 0) {
          v.angle += (rate / 100) * 0.7 * (1 + (this.ringCount - ring) * 0.12) * dt;
          v.phase = (v.phase + dt * (0.25 + (rate / 100) * 0.9)) % 1;
          if (v.exit < 0) moving = true;
        }
        const diff = target - v.radius;
        if (Math.abs(diff) > 0.25) {
          v.radius += diff * (1 - Math.exp(-dt * 8));
          moving = true;
        } else v.radius = target;
        if (v.enter < ENTER_MS) {
          v.enter = Math.min(ENTER_MS, v.enter + ms);
          moving = true;
        }
        if (v.exit >= 0) {
          v.exit += ms;
          if (v.exit >= EXIT_MS) {
            done.push(id);
            continue;
          }
          moving = true;
        }
      }

      const grow = easeOut(v.enter / ENTER_MS);
      const fade = v.exit >= 0 ? 1 - v.exit / EXIT_MS : 1;
      const r = this.coreR + (v.radius - this.coreR) * grow;
      const x = c + r * Math.cos(v.angle);
      const y = c + r * Math.sin(v.angle);
      const scale = 0.2 + 0.8 * grow;
      v.g.setAttribute("transform", `translate(${f1(x)} ${f1(y)}) scale(${scale.toFixed(3)})`);
      v.g.setAttribute("opacity", (grow * fade).toFixed(3));
      const left = x < c - 1;
      v.label.setAttribute("x", f1(left ? -(v.dotR + 9) : v.dotR + 9));
      v.label.setAttribute("y", "3");
      v.label.setAttribute("text-anchor", left ? "end" : "start");

      if (rate > 0) {
        const mx = c + r * 0.5 * Math.cos(v.angle - 0.25);
        const my = c + r * 0.5 * Math.sin(v.angle - 0.25);
        v.arc.setAttribute("d", `M ${f1(c)} ${f1(c)} Q ${f1(mx)} ${f1(my)} ${f1(x)} ${f1(y)}`);
        v.link.setAttribute("opacity", (grow * fade).toFixed(3));
        const count = v.particles.length;
        v.particles.forEach((p, k) => {
          const t = (v.phase + k / count) % 1;
          const u = 1 - t;
          p.setAttribute("cx", f1(u * u * c + 2 * u * t * mx + t * t * x));
          p.setAttribute("cy", f1(u * u * c + 2 * u * t * my + t * t * y));
          p.setAttribute("opacity", Math.sin(Math.PI * t).toFixed(2));
        });
      }

      if (id === this.tipFor) {
        this.tip.style.left = `${((x / s) * 100).toFixed(2)}%`;
        this.tip.style.top = `${((y / s) * 100).toFixed(2)}%`;
        this.tip.setAttribute("data-side", x > c + s * 0.2 ? "left" : "right");
      }
    }
    if (done.length) {
      for (const id of done) this.removeView(id);
      this.reflectInteraction();
    }
    return moving;
  }

  // ── loop control ──────────────────────────────────────────────────────────

  private get visible(): boolean {
    const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
    return this.connected && this.intersecting && !hidden;
  }

  /** Whether the next frame would change anything. */
  private needsFrame(): boolean {
    if (this.reduced()) return false;
    for (const v of this.views.values()) {
      if (v.exit >= 0 || v.enter < ENTER_MS) return true;
      if ((Number(v.data.rate) || 0) > 0) return true;
      if (Math.abs(this.ringRadius(this.ringOf(v.data)) - v.radius) > 0.25) return true;
    }
    return false;
  }

  /** Start the loop if something moves and the element is visible. */
  private kick(): void {
    if (this.raf || !this.visible || !this.needsFrame()) return;
    this.lastT = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.lastT = 0;
  }

  private frame = (t: number): void => {
    this.raf = 0;
    const dt = this.lastT ? Math.min(0.1, (t - this.lastT) / 1000) : 0;
    this.lastT = t;
    if (!this.visible) {
      this.lastT = 0;
      return;
    }
    const moving = this.paint(dt);
    if (moving || this.needsFrame()) this.raf = requestAnimationFrame(this.frame);
    else this.lastT = 0;
  };

  /** Whether the animation loop is currently scheduled (for diagnostics/tests). */
  get running(): boolean {
    return this.raf !== 0;
  }

  private onVisibility = (): void => {
    if (this.visible) this.kick();
    else this.stop();
  };

  private onMotionPref = (): void => {
    this.stop();
    this.reconcile();
    this.kick();
  };
}
