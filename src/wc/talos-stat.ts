import { bandOf } from "./bands";

/**
 * <talos-stat> — a labelled statistic cell: an eyebrow label, a big number, an
 * optional unit, and a default slot for supporting instruments (a <talos-spark>,
 * <talos-delta>, <talos-dots>). The atom of a console wall — many of these in a
 * grid IS the dashboard, each one doing semantic work.
 *
 *   - VALUE     the big number; on change it COUNTS to the new figure (the honest
 *               motion for a changing magnitude — the animation depicts the
 *               transition, not decoration). Snaps under prefers-reduced-motion.
 *   - COLOUR    the number takes the band of `value` when warn/crit are set —
 *               colour is the state. Honours `invert` (low = bad).
 *
 * Attributes:
 *   value        the figure                              (default 0)
 *   label        eyebrow caption                         (optional)
 *   unit         appended after the number               (optional)
 *   precision    decimals for the displayed value        (default 0)
 *   warn / crit  band thresholds                         (optional)
 *   invert       low = bad                               (optional)
 *   duration     count animation ms                      (default 500)
 *
 * Imperative API: el.set(value).
 */
export class TalosStat extends HTMLElement {
  static observedAttributes = ["value", "label", "unit", "precision", "warn", "crit", "invert"];

  private root: ShadowRoot;
  private numEl!: HTMLElement;
  private labelEl!: HTMLElement;
  private unitEl!: HTMLElement;
  private shown = 0;
  private frame = 0;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          --_nominal: var(--talos-foreground, hsl(0 0% 100%));
          --_warning: var(--talos-warning, hsl(38 92% 60%));
          --_critical: var(--talos-danger, hsl(0 80% 62%));
          --_num: var(--_nominal);
        }
        .label {
          font-family: var(--talos-font-display, system-ui);
          font-size: 0.5rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--talos-text-tertiary, hsl(0 0% 45%));
        }
        .row { display: flex; align-items: baseline; gap: 0.3rem; }
        .num {
          font-family: var(--talos-font-display, system-ui);
          font-weight: 300;
          font-size: var(--talos-stat-size, 1.8rem);
          line-height: 1;
          font-variant-numeric: tabular-nums;
          color: var(--_num);
        }
        .unit {
          font-size: 0.55rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--talos-text-tertiary, hsl(0 0% 45%));
        }
        :host([data-band="warning"]) { --_num: var(--_warning); }
        :host([data-band="critical"]) { --_num: var(--_critical); }
        .support { display: flex; align-items: center; gap: 0.4rem; }
        .support:empty { display: none; }
      </style>
      <span class="label" part="label"></span>
      <span class="row">
        <span class="num" part="num">0</span><span class="unit" part="unit"></span>
      </span>
      <span class="support" part="support"><slot></slot></span>`;
    this.numEl = this.root.querySelector(".num")!;
    this.labelEl = this.root.querySelector(".label")!;
    this.unitEl = this.root.querySelector(".unit")!;
  }

  connectedCallback(): void {
    this.shown = this.num("value", 0);
    this.render(true);
  }

  disconnectedCallback(): void { cancelAnimationFrame(this.frame); }

  attributeChangedCallback(name: string): void {
    if (name === "label" || name === "unit") this.paintStatic();
    else this.render(false);
  }

  /** Imperative setter. */
  set(value: number): void { this.setAttribute("value", String(value)); }

  private num(attr: string, fallback: number): number {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }

  private paintStatic(): void {
    this.labelEl.textContent = this.getAttribute("label") ?? "";
    this.unitEl.textContent = this.getAttribute("unit") ?? "";
  }

  private setBand(value: number): void {
    const band = bandOf(this, value);
    if (band === "nominal") this.removeAttribute("data-band");
    else this.setAttribute("data-band", band);
  }

  private render(immediate: boolean): void {
    this.paintStatic();
    const target = this.num("value", 0);
    const prec = Math.max(0, Math.round(this.num("precision", 0)));
    this.setBand(target);

    const reduce =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (immediate || reduce) {
      this.shown = target;
      this.numEl.textContent = target.toFixed(prec);
      return;
    }

    // Count to the new figure — motion depicts the magnitude transition.
    cancelAnimationFrame(this.frame);
    const from = this.shown;
    const duration = this.num("duration", 500);
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      this.shown = from + (target - from) * eased;
      this.numEl.textContent = this.shown.toFixed(prec);
      if (p < 1) this.frame = requestAnimationFrame(step);
      else this.shown = target;
    };
    this.frame = requestAnimationFrame(step);
  }
}
