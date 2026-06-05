/**
 * <talos-trend> — a live trend line / sparkline. The clearest demonstration of
 * "motion is telemetry, not transition" (PHILOSOPHY.md, principle 3): the line
 * is a moving window over a value stream, so its *shape and slope are the rate*.
 * Push a value and the window scrolls; the motion is the data advancing, not a
 * decorative transition.
 *
 * Form encodes function:
 *   - SHAPE   the polyline is the recent history; slope = rate of change.
 *   - COLOUR  the line/fill colour is the current band (nominal/warn/crit),
 *             same threshold logic as <talos-gauge> — colour IS the state.
 *   - LIVE    push(v) or setAttribute("value", v) appends a sample; read it
 *             twice while a system runs and the curve differs.
 *
 * Honest motion: the *information* — last value, recent shape, band colour — is
 * fully present in any static frame. There is no entrance animation to lose; the
 * curve simply reflects the buffer. (Nothing to gate for reduced-motion beyond
 * not auto-advancing on our own — we only move when the consumer pushes data.)
 *
 * Attributes:
 *   value          push this as the newest sample when it changes (reactive)
 *   points         max samples kept in the window           (default 48)
 *   min / max      vertical domain; "auto" tracks the buffer (default auto)
 *   warn / crit    band thresholds on the CURRENT value     (optional)
 *   width / height px                                        (default 220 / 60)
 *   fill           if present, fills under the curve
 *   label          caption (optional)
 *   unit           appended to the inline readout (optional)
 *
 * Imperative API: el.push(value) — preferred for streams.
 */
export class TalosTrend extends HTMLElement {
  static observedAttributes = [
    "value",
    "points",
    "min",
    "max",
    "warn",
    "crit",
    "width",
    "height",
    "fill",
    "label",
    "unit",
  ];

  private root: ShadowRoot;
  private line!: SVGPolylineElement;
  private area!: SVGPolygonElement;
  private dot!: SVGCircleElement;
  private readout!: HTMLElement;
  private caption!: HTMLElement;

  private buf: number[] = [];
  private frame = 0;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          --_nominal: var(--talos-success, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(40 95% 60%));
          --_critical: var(--talos-danger, hsl(0 90% 62%));
          --_grid: var(--talos-edge-subtle, hsl(0 0% 100% / 0.08));
          --_c: var(--_nominal);

          display: inline-flex;
          flex-direction: column;
          gap: 0.3rem;
          font-family: var(--talos-font-display, system-ui);
          color: var(--talos-foreground, #e7e9ec);
        }
        .head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 1rem;
        }
        .caption {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: var(--talos-tracking-hud, 0.18em);
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
        }
        .caption:empty { display: none; }
        .readout {
          font-weight: 300;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          color: var(--_c);
          transition: color var(--talos-dur-fast, 180ms) ease;
        }
        .unit {
          font-size: 0.6em;
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
          margin-left: 0.1em;
        }
        svg { display: block; overflow: visible; }
        .baseline { stroke: var(--_grid); stroke-width: 1; }
        .area {
          fill: var(--_c);
          opacity: 0.12;
          transition: fill var(--talos-dur-fast, 180ms) ease;
        }
        .line {
          fill: none;
          stroke: var(--_c);
          stroke-width: 1.5;
          stroke-linejoin: round;
          stroke-linecap: round;
          vector-effect: non-scaling-stroke;
          transition: stroke var(--talos-dur-fast, 180ms) ease;
        }
        .dot { fill: var(--_c); transition: fill var(--talos-dur-fast, 180ms) ease; }
      </style>
      <div class="head">
        <span class="caption" part="caption"></span>
        <span class="readout" part="readout"></span>
      </div>
      <svg part="svg">
        <line class="baseline" part="baseline"></line>
        <polygon class="area" part="area"></polygon>
        <polyline class="line" part="line"></polyline>
        <circle class="dot" part="dot" r="2.5"></circle>
      </svg>
    `;
    this.line = this.root.querySelector(".line")!;
    this.area = this.root.querySelector(".area")!;
    this.dot = this.root.querySelector(".dot")!;
    this.readout = this.root.querySelector(".readout")!;
    this.caption = this.root.querySelector(".caption")!;
  }

  connectedCallback(): void {
    if (this.hasAttribute("value") && this.buf.length === 0) {
      this.buf.push(this.num("value", 0));
    }
    this.render();
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this.frame);
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    if (oldVal === newVal) return;
    if (name === "value") this.push(this.num("value", 0));
    else this.scheduleRender();
  }

  /** Append a sample and scroll the window. Preferred entry for streams. */
  push(value: number): void {
    const cap = Math.max(2, this.num("points", 48));
    this.buf.push(value);
    while (this.buf.length > cap) this.buf.shift();
    this.scheduleRender();
  }

  private scheduleRender(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.render());
  }

  private num(attr: string, fallback: number): number {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }

  private band(value: number): "nominal" | "warning" | "critical" {
    const crit = this.getAttribute("crit");
    const warn = this.getAttribute("warn");
    if (crit !== null && value >= parseFloat(crit)) return "critical";
    if (warn !== null && value >= parseFloat(warn)) return "warning";
    return "nominal";
  }

  private render(): void {
    const w = this.num("width", 220);
    const h = this.num("height", 60);
    const pad = 3;

    const svg = this.root.querySelector("svg")!;
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const base = this.root.querySelector(".baseline")!;
    base.setAttribute("x1", "0");
    base.setAttribute("y1", String(h - pad));
    base.setAttribute("x2", String(w));
    base.setAttribute("y2", String(h - pad));

    const data = this.buf;
    const current = data.length ? data[data.length - 1] : this.num("value", 0);

    // Vertical domain: explicit min/max, else auto-fit the buffer with headroom.
    const minAttr = this.getAttribute("min");
    const maxAttr = this.getAttribute("max");
    let lo = minAttr !== null ? parseFloat(minAttr) : Math.min(...data, current);
    let hi = maxAttr !== null ? parseFloat(maxAttr) : Math.max(...data, current);
    if (!Number.isFinite(lo)) lo = 0;
    if (!Number.isFinite(hi)) hi = 1;
    if (hi - lo < 1e-6) hi = lo + 1;

    const band = this.band(current);
    const bandVar =
      band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
    this.style.setProperty("--_c", `var(${bandVar})`);

    // Map buffer to points across the width; newest at the right edge.
    const n = data.length;
    const toXY = (i: number, v: number): [number, number] => {
      const x = n <= 1 ? w : (i / (n - 1)) * (w - pad * 2) + pad;
      const t = (v - lo) / (hi - lo);
      const y = h - pad - t * (h - pad * 2);
      return [x, y];
    };

    if (n === 0) {
      this.line.setAttribute("points", "");
      this.area.setAttribute("points", "");
    } else {
      const pts = data.map((v, i) => toXY(i, v));
      const lineStr = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
      this.line.setAttribute("points", lineStr);

      if (this.hasAttribute("fill")) {
        const [x0] = pts[0];
        const [xn] = pts[pts.length - 1];
        this.area.setAttribute(
          "points",
          `${x0.toFixed(1)},${h - pad} ${lineStr} ${xn.toFixed(1)},${h - pad}`,
        );
      } else {
        this.area.setAttribute("points", "");
      }

      const [dx, dy] = pts[pts.length - 1];
      this.dot.setAttribute("cx", dx.toFixed(1));
      this.dot.setAttribute("cy", dy.toFixed(1));
    }

    const unit = this.getAttribute("unit") ?? "";
    this.readout.style.fontSize = `${Math.max(14, h * 0.3)}px`;
    this.readout.innerHTML =
      `${Math.round(current)}${unit ? `<span class="unit">${unit}</span>` : ""}`;
    this.caption.textContent = this.getAttribute("label") ?? "";

    this.setAttribute("role", "img");
    const lbl = this.getAttribute("label");
    this.setAttribute(
      "aria-label",
      `${lbl ? lbl + ": " : ""}${Math.round(current)}${unit}, trend ${this.trendWord()}`,
    );
  }

  /** A word for the recent direction, so the static a11y label carries the
   *  same information the moving line does. */
  private trendWord(): string {
    if (this.buf.length < 2) return "flat";
    const a = this.buf[this.buf.length - 2];
    const b = this.buf[this.buf.length - 1];
    if (b > a) return "rising";
    if (b < a) return "falling";
    return "flat";
  }
}
