import { bandOf, num } from "./bands";
import { setImageA11y } from "./a11y";
import { parseNumberList } from "./parse";

/**
 * <talos-spark> — a compact inline sparkline. The small sibling of <talos-trend>:
 * a value stream rendered as a polyline where POSITION/LENGTH carry the shape and
 * slope (the most perceptually-accurate channels — Cleveland & McGill). Use it
 * inside a stat cell or a dense readout where a full trend would be too large.
 *
 *   - SHAPE   the recent series, scaled to [min,max] over the buffer width.
 *   - COLOUR  the band of the CURRENT (last) value drives the stroke — colour
 *             IS the state. Honours `invert` (low = bad) like every instrument.
 *   - LIVE    push(v) appends a sample; or set the `data` attribute to a
 *             comma/space list. A frozen frame still shows the shape (motion
 *             test) — there is no animation to lose under reduced-motion.
 *
 * Attributes:
 *   data          initial series, comma/space separated   (optional)
 *                 (`points` is accepted as a deprecated alias)
 *   min / max     domain for the y-scale                  (default 0 / 100)
 *   warn / crit   band thresholds on the current value    (optional)
 *   invert        low = bad (flips band direction)        (optional)
 *   cap           max samples retained                    (default 32)
 *   fill          if present, fill under the line
 *
 * Imperative API: el.push(value) — preferred for streams.
 */
export class TalosSpark extends HTMLElement {
  static get observedAttributes() {
    return ["data", "points", "min", "max", "warn", "crit", "invert", "fill"];
  }

  /** The seed series: canonical `data=`, with `points=` as a deprecated alias. */
  private seedAttr(): string | null {
    return this.getAttribute("data") ?? this.getAttribute("points");
  }

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
          /* nominal band = --talos-success (the band token), matching gauge/
             meter/trend. --talos-accent is reserved for live-status, not bands. */
          --_nominal: var(--talos-success, hsl(140 90% 60%));
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
    const attr = this.seedAttr();
    if (attr) this.buf = parseNumberList(attr);
    this.schedule();
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this.frame);
  }

  attributeChangedCallback(name: string): void {
    if (name === "data" || name === "points") {
      const attr = this.seedAttr();
      this.buf = parseNumberList(attr);
    }
    this.schedule();
  }

  /** Append a sample and re-render (the streaming entry point). */
  push(value: number): void {
    if (!Number.isFinite(value)) return;
    const cap = num(this, "cap", 32);
    this.buf.push(value);
    while (this.buf.length > cap) this.buf.shift();
    this.schedule();
  }

  private schedule(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.render());
  }

  private render(): void {
    const n = this.buf.length;
    const min = num(this, "min", 0);
    const max = num(this, "max", 100);
    const span = max - min || 1;
    const W = 100, H = 16;

    // Text alternative for assistive tech. role/aria-label are not in
    // observedAttributes, so writing them never re-enters attributeChangedCallback.
    if (n < 2) {
      this.line.setAttribute("points", "");
      this.area.setAttribute("points", "");
      setImageA11y(this, {
        summary: n === 1 ? `Sparkline, 1 point, current ${this.buf[0]}` : "Sparkline, no data",
      });
      return;
    }

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

    // Live description reuses the current value + its band (computed above).
    setImageA11y(this, {
      summary: `Sparkline, ${n} points, current ${this.buf[n - 1]}, ${band}`,
    });
  }
}
