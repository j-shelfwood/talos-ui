import { bandOf } from "./bands";

/**
 * <talos-dots> — a dot-matrix: a discrete COUNT shown as filled-of-total marks.
 * The honest form for small countable quantities (active jobs, stalls, retries,
 * errors, depth) where a bar would imply a continuous magnitude against a fake
 * ceiling. Here the ceiling is real and small, and each mark is one unit — you
 * can literally count them (countable marks, not estimated length).
 *
 *   - QUANTITY   `value` of `total` dots are lit.
 *   - COLOUR     the lit dots take the band of `value` — colour is the state.
 *                Honours `invert` (low = bad) like every instrument.
 *   - HONEST     no animation to lose; a frozen frame shows the exact count.
 *
 * Attributes:
 *   value        number of lit dots                     (default 0)
 *   total        number of dots                         (default 8)
 *   warn / crit  band thresholds on `value`             (optional)
 *   invert       low = bad                              (optional)
 */
export class TalosDots extends HTMLElement {
  static observedAttributes = ["value", "total", "warn", "crit", "invert"];

  private root: ShadowRoot;
  private wrap!: HTMLElement;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          gap: var(--talos-dots-gap, 2px);
          --_nominal: var(--talos-accent, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(38 92% 60%));
          --_critical: var(--talos-danger, hsl(0 80% 62%));
          --_off: var(--talos-surface-3, hsl(0 0% 10%));
          --_on: var(--_nominal);
        }
        .wrap { display: inline-flex; align-items: center; gap: inherit; flex-wrap: wrap; }
        i {
          width: var(--talos-dots-size, 5px);
          height: var(--talos-dots-size, 5px);
          background: var(--_off);
          display: block;
        }
        i.on { background: var(--_on); }
        :host([data-band="warning"]) { --_on: var(--_warning); }
        :host([data-band="critical"]) { --_on: var(--_critical); }
        /* a faint glow on lit dots in the nominal accent only (status pulse vibe) */
        :host(:not([data-band])) i.on { box-shadow: 0 0 3px hsl(var(--talos-accent-hsl, 140 90% 60%) / 0.5); }
      </style>
      <span class="wrap" part="wrap"></span>`;
    this.wrap = this.root.querySelector(".wrap")!;
  }

  connectedCallback(): void { this.render(); }
  attributeChangedCallback(): void { this.render(); }

  private num(attr: string, fallback: number): number {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }

  private render(): void {
    const total = Math.max(0, Math.round(this.num("total", 8)));
    const value = this.num("value", 0);
    const on = Math.max(0, Math.min(total, Math.round(value)));

    // Rebuild the dot elements only when the count changes (cheap + stable).
    if (this.wrap.childElementCount !== total) {
      this.wrap.innerHTML = Array.from({ length: total }, () => "<i></i>").join("");
    }
    Array.from(this.wrap.children).forEach((c, i) => c.classList.toggle("on", i < on));

    const band = bandOf(this, value);
    if (band === "nominal") this.removeAttribute("data-band");
    else this.setAttribute("data-band", band);
  }
}
