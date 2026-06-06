/**
 * <talos-flow> — an edge/connection that shows THROUGHPUT as motion. A dashed
 * stroke travels along the path; its speed is bound to `rate`, so the animation
 * is the flow, not a decorative shimmer (PHILOSOPHY.md principle 3). Zero rate =
 * no motion = nothing flowing. This is the link primitive for pipeline diagrams.
 *
 *   - SPEED   dash travel velocity ∝ rate (capped, so a huge rate stays legible).
 *   - COLOUR  band (nominal/warn/crit) on the rate — colour IS the state.
 *   - DIRECTION  reverse="" flips travel; the visual direction is the data
 *                direction.
 *
 * Honest motion: under prefers-reduced-motion the dashes DON'T travel — instead
 * we render static directional chevrons + expose the rate via aria, so the
 * information (there is flow, this fast, this direction, this health) survives
 * without animation. Motion that, when removed, leaves you unable to tell
 * whether anything is flowing would be decoration; this isn't.
 *
 * Attributes:
 *   rate           throughput; 0 = idle (no motion)        (default 0)
 *   max            rate at which speed saturates           (default 100)
 *   warn / crit    band thresholds on rate                 (optional)
 *   x1 y1 x2 y2    endpoints in viewBox units              (default a horizontal line)
 *   curve          bow height for a curved path, px        (default 0 = straight)
 *   reverse        reverse travel direction                (flag)
 *   width height   viewBox px                              (default 200 / 40)
 */
export class TalosFlow extends HTMLElement {
  static observedAttributes = [
    "rate",
    "max",
    "warn",
    "crit",
    "x1",
    "y1",
    "x2",
    "y2",
    "curve",
    "reverse",
    "width",
    "height",
  ];

  private root: ShadowRoot;
  private base!: SVGPathElement;
  private dash!: SVGPathElement;
  private chevrons!: SVGGElement;

  private raf = 0;
  private offset = 0;
  private last = 0;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          --_nominal: var(--talos-success, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(40 95% 60%));
          --_critical: var(--talos-danger, hsl(0 90% 62%));
          --_idle: var(--talos-edge-default, hsl(0 0% 100% / 0.18));
          --_c: var(--_nominal);

          display: inline-block;
          line-height: 0;
        }
        svg { display: block; overflow: visible; }
        .base {
          fill: none;
          stroke: var(--_idle);
          stroke-width: 1;
          vector-effect: non-scaling-stroke;
        }
        .dash {
          fill: none;
          stroke: var(--_c);
          stroke-width: 2;
          stroke-linecap: round;
          stroke-dasharray: 6 10;
          vector-effect: non-scaling-stroke;
          /* colour snaps to band (state must not lag); speed conveys rate */
        }
        .chev { fill: none; stroke: var(--_c); stroke-width: 1.5; display: none; }
      </style>
      <svg part="svg">
        <path class="base" part="base"></path>
        <path class="dash" part="dash"></path>
        <g class="chev" part="chevrons"></g>
      </svg>
    `;
    this.base = this.root.querySelector(".base")!;
    this.dash = this.root.querySelector(".dash")!;
    this.chevrons = this.root.querySelector(".chev")!;
  }

  private observer?: MutationObserver;

  connectedCallback(): void {
    this.render();
    this.tick(performance.now());
    // MutationObserver, not attributeChangedCallback — see .REACTIVITY-BUG.md.
    // (Dash speed already updates live in the rAF tick; this keeps the band
    // colour / geometry in sync when attributes change.)
    this.observer = new MutationObserver(() => this.render());
    // attributeFilter REQUIRED — render() writes role/aria-* on the host; an
    // unfiltered observer would loop on its own write-backs.
    this.observer.observe(this, {
      attributeFilter: ["rate", "max", "warn", "crit", "x1", "y1", "x2", "y2", "curve", "reverse", "width", "height"],
    });
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
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

  private band(value: number): "nominal" | "warning" | "critical" {
    const crit = this.getAttribute("crit");
    const warn = this.getAttribute("warn");
    if (crit !== null && value >= parseFloat(crit)) return "critical";
    if (warn !== null && value >= parseFloat(warn)) return "warning";
    return "nominal";
  }

  private pathD(): string {
    const w = this.num("width", 200);
    const h = this.num("height", 40);
    const x1 = this.num("x1", 4);
    const y1 = this.num("y1", h / 2);
    const x2 = this.num("x2", w - 4);
    const y2 = this.num("y2", h / 2);
    const curve = this.num("curve", 0);
    if (curve === 0) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - curve;
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  }

  private render(): void {
    const w = this.num("width", 200);
    const h = this.num("height", 40);
    const svg = this.root.querySelector("svg")!;
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const d = this.pathD();
    this.base.setAttribute("d", d);
    this.dash.setAttribute("d", d);

    const rate = Math.max(0, this.num("rate", 0));
    const band = this.band(rate);
    const bandVar =
      band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
    this.style.setProperty("--_c", `var(${bandVar})`);

    // Idle (rate 0) → no travelling stroke at all; the base hairline alone says
    // "connected, nothing flowing".
    this.dash.style.opacity = rate <= 0 ? "0" : "1";

    if (this.reducedMotion) {
      // Static honest fallback: directional chevrons instead of travel.
      this.dash.style.opacity = "0";
      this.chevrons.style.display = rate > 0 ? "block" : "none";
      this.renderChevrons();
    } else {
      this.chevrons.style.display = "none";
    }

    this.setAttribute("role", "img");
    this.setAttribute(
      "aria-label",
      `flow ${rate > 0 ? rate.toFixed(0) + "/" + this.num("max", 100).toFixed(0) : "idle"}` +
        ` ${this.hasAttribute("reverse") ? "reverse" : "forward"}, ${band}`,
    );
  }

  private renderChevrons(): void {
    // Three chevrons along the path indicating direction (motion-free).
    const path = this.base;
    const len = path.getTotalLength();
    if (!len) return;
    const rev = this.hasAttribute("reverse");
    const dir = rev ? -1 : 1;
    let g = "";
    for (const frac of [0.3, 0.5, 0.7]) {
      const p = path.getPointAtLength(frac * len);
      const p2 = path.getPointAtLength(Math.min(len, Math.max(0, (frac + 0.01 * dir) * len)));
      const ang = Math.atan2(p2.y - p.y, p2.x - p.x);
      const s = 4;
      const a1x = p.x - Math.cos(ang - 0.5) * s;
      const a1y = p.y - Math.sin(ang - 0.5) * s;
      const a2x = p.x - Math.cos(ang + 0.5) * s;
      const a2y = p.y - Math.sin(ang + 0.5) * s;
      g += `<polyline class="chev" points="${a1x.toFixed(1)},${a1y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)} ${a2x.toFixed(1)},${a2y.toFixed(1)}"></polyline>`;
    }
    this.chevrons.innerHTML = g;
  }

  private tick = (now: number): void => {
    const dt = this.last ? (now - this.last) / 1000 : 0;
    this.last = now;

    if (!this.reducedMotion) {
      const rate = Math.max(0, this.num("rate", 0));
      const max = Math.max(1, this.num("max", 100));
      // Speed ∝ rate, saturating at max. ~60 dash-units/sec at full rate.
      const speed = Math.min(rate / max, 1) * 60;
      const dir = this.hasAttribute("reverse") ? 1 : -1; // negative offset travels forward
      this.offset += speed * dt * dir;
      this.dash.style.strokeDashoffset = String(this.offset);
    }
    this.raf = requestAnimationFrame(this.tick);
  };
}
