/**
 * <talos-gauge> — a radial gauge that renders a VALUE'S MEANING, not a value.
 *
 * The first of the data-binding primitives, and the pattern-setter for the
 * rest. It is the law made concrete (see PHILOSOPHY.md):
 *
 *   - VALUE → POSITION   the needle angle is the value.
 *   - VALUE → COLOUR     the arc colour is which threshold band the value is in
 *                        (nominal / warning / critical). The colour *is* the
 *                        state — not a decoration applied next to it.
 *   - LIVE               set `value` again and it re-renders; read it twice
 *                        while a system runs and you see different things.
 *   - HONEST MOTION      the needle tweens to new values, but the information
 *                        (number + band colour + needle position) is fully
 *                        present in a single static frame. Under
 *                        prefers-reduced-motion the tween is skipped, not the
 *                        meaning. Telemetry that needs the animation to be
 *                        understood would be decoration wearing a function coat.
 *
 * Attributes (all reactive):
 *   value            current value                        (default 0)
 *   min / max        domain range                         (default 0 / 100)
 *   warn             value at/after which band = warning   (optional)
 *   crit             value at/after which band = critical  (optional)
 *   label            caption under the readout             (optional)
 *   unit             appended to the readout (e.g. "%")    (optional)
 *   sweep            arc sweep in degrees (180–300)        (default 240)
 *   size             px square                             (default 160)
 *
 * Bands are inclusive-from: value >= crit → critical; else value >= warn →
 * warning; else nominal. `warn`/`crit` may be omitted for a single-band gauge.
 */
export class TalosGauge extends HTMLElement {
  static observedAttributes = [
    "value",
    "min",
    "max",
    "warn",
    "crit",
    "label",
    "unit",
    "sweep",
    "size",
  ];

  private root: ShadowRoot;
  private arc!: SVGPathElement;
  private needle!: SVGLineElement;
  private readout!: HTMLElement;
  private caption!: HTMLElement;

  private frame = 0;
  private shown = 0; // the currently-rendered (animated) value
  private tweenFrom = 0;
  private tweenStart = 0;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          /* Band colours default to the status tokens; the rendered band sets
             --_c to one of these, and everything that encodes state reads it. */
          --_nominal: var(--talos-success, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(40 95% 60%));
          --_critical: var(--talos-danger, hsl(0 90% 62%));
          --_track: var(--talos-edge-subtle, hsl(0 0% 100% / 0.1));
          --_c: var(--_nominal);

          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          font-family: var(--talos-font-display, system-ui);
          color: var(--talos-foreground, #e7e9ec);
        }
        .dial { position: relative; }
        svg { display: block; overflow: visible; }
        .track {
          fill: none;
          stroke: var(--_track);
          stroke-linecap: butt;
        }
        .value-arc {
          fill: none;
          stroke: var(--_c);
          stroke-linecap: butt;
          transition: stroke var(--talos-dur-fast, 180ms) ease;
        }
        .needle {
          stroke: var(--_c);
          stroke-width: 2;
          stroke-linecap: round;
          transition: stroke var(--talos-dur-fast, 180ms) ease;
        }
        .hub { fill: var(--_c); transition: fill var(--talos-dur-fast, 180ms) ease; }
        .readout {
          position: absolute;
          left: 0; right: 0;
          bottom: 18%;
          text-align: center;
          font-weight: 300;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
          line-height: 1;
          color: var(--_c);
          transition: color var(--talos-dur-fast, 180ms) ease;
        }
        .unit {
          font-size: 0.5em;
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
          margin-left: 0.15em;
        }
        .caption {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: var(--talos-tracking-hud, 0.18em);
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
        }
        .caption:empty { display: none; }
      </style>
      <div class="dial" part="dial">
        <svg part="svg">
          <path class="track" part="track"></path>
          <path class="value-arc" part="value-arc"></path>
          <line class="needle" part="needle"></line>
          <circle class="hub" part="hub"></circle>
        </svg>
        <div class="readout" part="readout"></div>
      </div>
      <div class="caption" part="caption"></div>
    `;
    this.arc = this.root.querySelector(".value-arc")!;
    this.needle = this.root.querySelector(".needle")!;
    this.readout = this.root.querySelector(".readout")!;
    this.caption = this.root.querySelector(".caption")!;
  }

  connectedCallback(): void {
    this.shown = this.num("value", 0);
    this.render();
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this.frame);
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    if (oldVal === newVal) return;
    if (name === "value") this.tweenTo(this.num("value", 0));
    else this.render();
  }

  private num(attr: string, fallback: number): number {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }

  private get reducedMotion(): boolean {
    return (
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /** Tween the rendered value toward a target — or snap, honestly, if motion
   *  is reduced. Either way the final frame carries the full information. */
  private tweenTo(target: number): void {
    if (this.reducedMotion) {
      this.shown = target;
      this.render();
      return;
    }
    cancelAnimationFrame(this.frame);
    this.tweenFrom = this.shown;
    this.tweenStart = performance.now();
    const dur = this.num("animation-duration", 420);
    const step = (t: number) => {
      const p = Math.min((t - this.tweenStart) / dur, 1);
      // easeOutCubic — decelerate into the new reading, like a real needle.
      const e = 1 - Math.pow(1 - p, 3);
      this.shown = this.tweenFrom + (target - this.tweenFrom) * e;
      this.render();
      if (p < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  /** Which band the value falls in — this is the state, and it drives colour. */
  private band(value: number): "nominal" | "warning" | "critical" {
    const crit = this.getAttribute("crit");
    const warn = this.getAttribute("warn");
    if (crit !== null && value >= parseFloat(crit)) return "critical";
    if (warn !== null && value >= parseFloat(warn)) return "warning";
    return "nominal";
  }

  /** Polar→cartesian on the dial circle, angle in degrees (0 = right, CW). */
  private point(cx: number, cy: number, r: number, deg: number): [number, number] {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  private arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
    const [x0, y0] = this.point(cx, cy, r, a0);
    const [x1, y1] = this.point(cx, cy, r, a1);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    const sweep = a1 > a0 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
  }

  private render(): void {
    const size = this.num("size", 160);
    const min = this.num("min", 0);
    const max = this.num("max", 100);
    const sweep = Math.max(180, Math.min(300, this.num("sweep", 240)));
    const stroke = Math.max(4, size * 0.06);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - stroke / 2 - 2;

    // Arc centred at the bottom: from (90 + sweep/2) sweeping to (90 - sweep/2)
    // in screen coords (y-down), so the opening faces down and the fill grows
    // left→right across the top.
    const start = 90 + sweep / 2;
    const end = 90 - sweep / 2;

    const clamped = Math.max(min, Math.min(max, this.shown));
    const frac = max > min ? (clamped - min) / (max - min) : 0;
    const valAngle = start + (end - start) * frac;

    const band = this.band(clamped);
    const bandVar =
      band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
    this.style.setProperty("--_c", `var(${bandVar})`);

    const svg = this.root.querySelector("svg")!;
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

    this.root.querySelector(".track")!.setAttribute("d", this.arcPath(cx, cy, r, start, end));
    this.root.querySelector(".track")!.setAttribute("stroke-width", String(stroke));
    this.arc.setAttribute("d", this.arcPath(cx, cy, r, start, valAngle));
    this.arc.setAttribute("stroke-width", String(stroke));

    // Needle from hub toward the value angle, a touch shorter than the arc.
    const [nx, ny] = this.point(cx, cy, r - stroke, valAngle);
    this.needle.setAttribute("x1", String(cx));
    this.needle.setAttribute("y1", String(cy));
    this.needle.setAttribute("x2", String(nx));
    this.needle.setAttribute("y2", String(ny));

    const hub = this.root.querySelector(".hub")!;
    hub.setAttribute("cx", String(cx));
    hub.setAttribute("cy", String(cy));
    hub.setAttribute("r", String(Math.max(2.5, size * 0.025)));

    const unit = this.getAttribute("unit") ?? "";
    const display = Math.round(clamped).toString();
    this.readout.innerHTML = `${display}${unit ? `<span class="unit">${unit}</span>` : ""}`;
    this.readout.style.fontSize = `${size * 0.22}px`;

    this.caption.textContent = this.getAttribute("label") ?? "";

    // Accessibility: the gauge is a live meter.
    this.setAttribute("role", "meter");
    this.setAttribute("aria-valuenow", String(Math.round(this.num("value", 0))));
    this.setAttribute("aria-valuemin", String(min));
    this.setAttribute("aria-valuemax", String(max));
    const lbl = this.getAttribute("label");
    if (lbl) this.setAttribute("aria-label", lbl);
  }
}
