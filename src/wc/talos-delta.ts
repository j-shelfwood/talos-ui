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
 *   good         "up" (default) | "down" — which direction is the healthy one
 *   precision    decimal places for the magnitude                              (default 0)
 *   eps          dead-zone; |Δ| below this reads as flat                       (default 0)
 *
 * Imperative API: el.update(value) — equivalent to setting the `value` attribute.
 */
export class TalosDelta extends HTMLElement {
  static observedAttributes = ["value", "good", "precision", "eps"];

  private root: ShadowRoot;
  private text!: HTMLElement;
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
      <span class="arrow" part="arrow">▬</span><span class="mag" part="mag">0</span>`;
    this.text = this.root.querySelector(".mag")!;
  }

  connectedCallback(): void {
    if (this.hasAttribute("value")) this.render(this.num("value", 0));
  }

  attributeChangedCallback(name: string, _old: string | null, val: string | null): void {
    if (name === "value" && val !== null) this.render(parseFloat(val));
  }

  /** Imperative equivalent of setting `value`. */
  update(value: number): void { this.render(value); }

  private num(attr: string, fallback: number): number {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }

  private render(value: number): void {
    if (!Number.isFinite(value)) return;
    const prec = Math.max(0, Math.round(this.num("precision", 0)));
    const eps = this.num("eps", 0);
    const goodDir = (this.getAttribute("good") ?? "up") === "down" ? "down" : "up";

    if (this.prev === null) {
      // First reading — no prior, so no change to report.
      this.setArrow("▬", "flat");
      this.text.textContent = (0).toFixed(prec);
      this.prev = value;
      return;
    }

    const d = value - this.prev;
    this.prev = value;
    const mag = Math.abs(d);

    if (mag <= eps) {
      this.setArrow("▬", "flat");
    } else if (d > 0) {
      this.setArrow("▲", goodDir === "up" ? "good" : "bad");
    } else {
      this.setArrow("▼", goodDir === "down" ? "good" : "bad");
    }
    this.text.textContent = mag.toFixed(prec);
  }

  private setArrow(glyph: string, dir: "good" | "bad" | "flat"): void {
    (this.root.querySelector(".arrow") as HTMLElement).textContent = glyph;
    if (dir === "flat") this.removeAttribute("data-dir");
    else this.setAttribute("data-dir", dir);
  }
}
