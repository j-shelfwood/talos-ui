import { bandOf } from "./bands";

/**
 * <talos-spark> — a compact inline sparkline. The small sibling of <talos-trend>:
 * a value stream rendered as a polyline where POSITION/LENGTH carry the shape and
 * slope (the most perceptually-accurate channels — Cleveland & McGill). Use it
 * inside a stat cell or a dense readout where a full trend would be too large.
 *
 *   - SHAPE   the recent series, scaled to [min,max] over the buffer width.
 *   - COLOUR  the band of the CURRENT (last) value drives the stroke — colour
 *             IS the state. Honours `invert` (low = bad) like every instrument.
 *   - LIVE    push(v) appends a sample; or set the `points` attribute to a
 *             comma/space list. A frozen frame still shows the shape (motion
 *             test) — there is no animation to lose under reduced-motion.
 *
 * Attributes:
 *   points        initial series, comma/space separated   (optional)
 *   min / max     domain for the y-scale                  (default 0 / 100)
 *   warn / crit   band thresholds on the current value    (optional)
 *   invert        low = bad (flips band direction)        (optional)
 *   cap           max samples retained                    (default 32)
 *   fill          if present, fill under the line
 *
 * Imperative API: el.push(value) — preferred for streams.
 */
export class TalosSpark extends HTMLElement {
  static observedAttributes = ["points", "min", "max", "warn", "crit", "invert", "fill"];

  private root: ShadowRoot;
  private svg!: SVGSVGElement;
  private line!: SVGPolylineElement;
  private area!: SVGPolygonElement;
  private buf: number[] = [];
  private frame = 0;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          display: inline-block;
          width: var(--talos-spark-w, 100%);
          height: var(--talos-spark-h, 16px);
          --_nominal: var(--talos-accent, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(38 92% 60%));
          --_critical: var(--talos-danger, hsl(0 80% 62%));
          --_stroke: var(--_nominal);
        }
        svg { display: block; width: 100%; height: 100%; overflow: visible; }
        .line { fill: none; stroke: var(--_stroke); stroke-width: 1; vector-effect: non-scaling-stroke; }
        .area { fill: var(--_stroke); opacity: 0.1; stroke: none; }
        :host([data-band="warning"]) { --_stroke: var(--_warning); }
        :host([data-band="critical"]) { --_stroke: var(--_critical); }
      </style>
      <svg part="svg" preserveAspectRatio="none">
        <polygon class="area" part="area" points=""></polygon>
        <polyline class="line" part="line" points=""></polyline>
      </svg>`;
    this.svg = this.root.querySelector("svg")!;
    this.area = this.root.querySelector(".area")!;
    this.line = this.root.querySelector(".line")!;
  }

  connectedCallback(): void {
    const attr = this.getAttribute("points");
    if (attr) this.buf = attr.split(/[\s,]+/).map(Number).filter(Number.isFinite);
    this.schedule();
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this.frame);
  }

  attributeChangedCallback(name: string): void {
    if (name === "points") {
      const attr = this.getAttribute("points");
      this.buf = attr ? attr.split(/[\s,]+/).map(Number).filter(Number.isFinite) : [];
    }
    this.schedule();
  }

  /** Append a sample and re-render (the streaming entry point). */
  push(value: number): void {
    if (!Number.isFinite(value)) return;
    const cap = this.num("cap", 32);
    this.buf.push(value);
    while (this.buf.length > cap) this.buf.shift();
    this.schedule();
  }

  private num(attr: string, fallback: number): number {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }

  private schedule(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.render());
  }

  private render(): void {
    const n = this.buf.length;
    const min = this.num("min", 0);
    const max = this.num("max", 100);
    const span = max - min || 1;
    const W = 100, H = 16;

    if (n < 2) { this.line.setAttribute("points", ""); this.area.setAttribute("points", ""); return; }

    const pts = this.buf
      .map((v, i) => {
        const x = (i / (n - 1)) * W;
        const y = H - (Math.max(0, Math.min(1, (v - min) / span))) * H;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    this.svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    this.line.setAttribute("points", pts);
    if (this.hasAttribute("fill")) {
      this.area.setAttribute("points", `0,${H} ${pts} ${W},${H}`);
    } else {
      this.area.setAttribute("points", "");
    }

    // Band of the CURRENT value — colour is the state.
    const band = bandOf(this, this.buf[n - 1]);
    if (band === "nominal") this.removeAttribute("data-band");
    else this.setAttribute("data-band", band);
  }
}
