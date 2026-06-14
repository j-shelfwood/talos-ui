import { num } from "./bands";

/**
 * <talos-histogram> — the DISTRIBUTION of one value across many units. Where a
 * gauge shows one aggregate and a matrix shows every unit's identity, a histogram
 * shows the *shape* of the population: how battery state-of-charge is spread
 * across a whole shell, how latency is distributed across gateways, where the
 * mass sits and where the tail is. Bar height = how many units fall in that
 * bucket; bar colour = the health band of that bucket's value range. So a cohort
 * of satellites sliding into eclipse appears as a bump migrating toward the red
 * end — the motion of the distribution IS the telemetry (PHILOSOPHY.md).
 *
 *   - VALUES   `.values` (imperative) — the raw population; the element buckets
 *              it into `bins` buckets across [min, max].
 *   - BANDS    each bucket is coloured by where its CENTRE falls against
 *              warn/crit (same threshold + invert model as the other
 *              instruments) — so the red bars are the unhealthy part of the
 *              distribution, not a fixed palette.
 *   - HONEST   colour + bar position carry the meaning in a static frame; there
 *              is no motion-only information here.
 *
 * Attributes (reactive):
 *   bins        number of buckets                       (default 24)
 *   min / max   value range to bucket across            (default 0 / 100)
 *   warn / crit band thresholds for bar colour          (optional)
 *   invert      low = bad                               (flag)
 *   label       accessible label                        (optional)
 */
export class TalosHistogram extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["bins", "min", "max", "warn", "crit", "invert", "label"];
  }

  private root: ShadowRoot;
  private gBars: SVGGElement;
  private _values: ArrayLike<number> = [];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          --_nominal: var(--talos-success, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(38 92% 60%));
          --_critical: var(--talos-danger, hsl(0 80% 62%));
          display: block;
          width: 100%;
        }
        svg { display: block; width: 100%; height: 100%; overflow: visible; }
        .bar { transition: height var(--talos-dur-mid, 320ms) var(--talos-ease-out, ease),
                           y var(--talos-dur-mid, 320ms) var(--talos-ease-out, ease),
                           fill 180ms ease; }
        .axis { stroke: var(--talos-edge-subtle, hsl(0 0% 100% / 0.1)); stroke-width: 1; }
      </style>
      <svg part="svg" viewBox="0 0 100 40" preserveAspectRatio="none">
        <line class="axis" x1="0" y1="40" x2="100" y2="40"></line>
        <g class="bars" part="bars"></g>
      </svg>`;
    this.gBars = this.root.querySelector(".bars")!;
  }

  set values(v: ArrayLike<number>) {
    this._values = v;
    this.render();
  }
  get values(): ArrayLike<number> {
    return this._values;
  }

  connectedCallback(): void {
    this.render();
  }
  attributeChangedCallback(): void {
    this.render();
  }

  private render(): void {
    const bins = Math.max(1, Math.round(num(this, "bins", 24)));
    const min = num(this, "min", 0);
    const max = num(this, "max", 100);
    const warn = this.getAttribute("warn");
    const crit = this.getAttribute("crit");
    const invert = this.hasAttribute("invert");
    const span = max - min || 1;

    // Bucket the population.
    const counts = new Array(bins).fill(0);
    const vals = this._values;
    for (let i = 0; i < vals.length; i++) {
      const t = (vals[i] - min) / span;
      const b = Math.max(0, Math.min(bins - 1, Math.floor(t * bins)));
      counts[b]++;
    }
    const peak = Math.max(1, ...counts);

    const bandColour = (centreValue: number): string => {
      const trips = (t: string | null) =>
        t !== null && (invert ? centreValue <= parseFloat(t) : centreValue >= parseFloat(t));
      if (trips(crit)) return "var(--_critical)";
      if (trips(warn)) return "var(--_warning)";
      return "var(--_nominal)";
    };

    const W = 100;
    const H = 40;
    const slot = W / bins;
    const barW = slot * 0.78;
    const pad = (slot - barW) / 2;

    // Reconcile DOM: reuse <rect>s so transitions animate height/colour changes.
    const rects = this.gBars.querySelectorAll<SVGRectElement>("rect");
    for (let i = 0; i < bins; i++) {
      let rect = rects[i];
      if (!rect) {
        rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("class", "bar");
        this.gBars.appendChild(rect);
      }
      const hBar = (counts[i] / peak) * H;
      const centreValue = min + ((i + 0.5) / bins) * span;
      rect.setAttribute("x", (i * slot + pad).toFixed(2));
      rect.setAttribute("y", (H - hBar).toFixed(2));
      rect.setAttribute("width", barW.toFixed(2));
      rect.setAttribute("height", hBar.toFixed(2));
      rect.setAttribute("fill", bandColour(centreValue));
    }
    // Drop any extra rects if bins shrank.
    for (let i = bins; i < rects.length; i++) rects[i].remove();

    this.setAttribute("role", "img");
    const lbl = this.getAttribute("label");
    this.setAttribute("aria-label", `${lbl ? lbl + ": " : ""}distribution of ${vals.length} values across ${bins} buckets`);
  }
}
