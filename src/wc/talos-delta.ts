/**
 * <talos-delta> — the CHANGE in a value: direction (▲ up / ▼ down / ▬ flat) plus
 * the magnitude of the step. Encodes a dimension no single gauge/bar/number can:
 * "which way, and by how much." Pair it with a number to turn a static reading
 * into a monitorable one.
 *
 *   - DIRECTION  arrow from the sign of (value − previous value).
 *   - MAGNITUDE  |Δ|, formatted; the figure is the change, not the level.
 *   - COLOUR     up = success, down = danger by default; flip with `good="down"`
 *                for metrics where falling is good (latency, error rate, cost).
 *
 * Attributes:
 *   value        current value; set it each tick and Δ is computed vs the last  (required)
 *   from         previous value; when set, Δ = value − from (static use, SSR)   (optional)
 *   good         "up" (default) | "down" — which direction is the healthy one
 *   precision    decimal places for the magnitude                              (default 0)
 *   eps          dead-zone; |Δ| below this reads as flat                       (default 0)
 *   label        names the metric in the accessible label                      (optional)
 *
 * Without `from`, the previous value is the one `value` held before its last
 * change, so the first reading is flat. Changing good/precision/eps/from
 * re-renders the current change without consuming a tick.
 *
 * Imperative API: el.update(value) — equivalent to setting the `value` attribute.
 */
import { num } from "./bands";
import { setImageA11y } from "./a11y";

export class TalosDelta extends HTMLElement {
  static get observedAttributes() {
    return ["value", "from", "good", "precision", "eps", "label"];
  }

  private root: ShadowRoot;
  private arrow!: HTMLElement;
  private text!: HTMLElement;
  /** The value before the last `value` change (used when `from` is absent). */
  private prev: number | null = null;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          display: inline-flex;
          align-items: baseline;
          gap: 0.2em;
          font-variant-numeric: tabular-nums;
          font-size: var(--talos-delta-size, 0.6rem);
          --_good: var(--talos-success, hsl(140 90% 60%));
          --_bad: var(--talos-danger, hsl(0 80% 62%));
          --_flat: var(--talos-text-tertiary, hsl(0 0% 40%));
          color: var(--_flat);
        }
        :host([data-dir="good"]) { color: var(--_good); }
        :host([data-dir="bad"])  { color: var(--_bad); }
        .arrow { font-size: 0.85em; }
      </style>
      <span class="arrow" part="arrow" aria-hidden="true">▬</span><span class="mag" part="mag" aria-hidden="true">0</span>`;
    this.arrow = this.root.querySelector(".arrow")!;
    this.text = this.root.querySelector(".mag")!;
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(name: string, old: string | null): void {
    if (name === "value" && old !== null) {
      const p = parseFloat(old);
      this.prev = Number.isFinite(p) ? p : null;
    }
    this.render();
  }

  /** Imperative equivalent of setting `value`. */
  update(value: number): void {
    this.setAttribute("value", String(value));
  }

  private render(): void {
    const value = num(this, "value", NaN);
    const base = num(this, "from", this.prev ?? NaN);
    const prec = Math.max(0, Math.round(num(this, "precision", 0)));
    const eps = num(this, "eps", 0);
    const goodDir = (this.getAttribute("good") ?? "up") === "down" ? "down" : "up";

    // No value, or no previous reading yet: no change to report.
    const d = Number.isFinite(value) && Number.isFinite(base) ? value - base : 0;
    const mag = Math.abs(d);

    let word: string;
    if (mag <= eps) {
      this.setArrow("▬", "flat");
      word = "flat";
    } else if (d > 0) {
      this.setArrow("▲", goodDir === "up" ? "good" : "bad");
      word = `up ${mag.toFixed(prec)}`;
    } else {
      this.setArrow("▼", goodDir === "down" ? "good" : "bad");
      word = `down ${mag.toFixed(prec)}`;
    }
    this.text.textContent = mag.toFixed(prec);

    const dir = this.getAttribute("data-dir");
    const health = dir === "good" ? ", improving" : dir === "bad" ? ", worsening" : "";
    setImageA11y(this, { label: this.getAttribute("label"), summary: `${word}${health}` });
  }

  private setArrow(glyph: string, dir: "good" | "bad" | "flat"): void {
    this.arrow.textContent = glyph;
    if (dir === "flat") this.removeAttribute("data-dir");
    else this.setAttribute("data-dir", dir);
  }
}
