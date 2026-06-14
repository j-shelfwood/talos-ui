import {
  num
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-delta.ts
var TalosDelta = class extends HTMLElement {
  static get observedAttributes() {
    return ["value", "good", "precision", "eps"];
  }
  root;
  text;
  prev = null;
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
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
      <span class="arrow" part="arrow">\u25AC</span><span class="mag" part="mag">0</span>`;
    this.text = this.root.querySelector(".mag");
  }
  connectedCallback() {
    if (this.hasAttribute("value")) this.render(num(this, "value", 0));
  }
  attributeChangedCallback(name, _old, val) {
    if (name === "value" && val !== null) this.render(parseFloat(val));
  }
  /** Imperative equivalent of setting `value`. */
  update(value) {
    this.render(value);
  }
  render(value) {
    if (!Number.isFinite(value)) return;
    const prec = Math.max(0, Math.round(num(this, "precision", 0)));
    const eps = num(this, "eps", 0);
    const goodDir = (this.getAttribute("good") ?? "up") === "down" ? "down" : "up";
    if (this.prev === null) {
      this.setArrow("\u25AC", "flat");
      this.text.textContent = 0 .toFixed(prec);
      this.prev = value;
      return;
    }
    const d = value - this.prev;
    this.prev = value;
    const mag = Math.abs(d);
    if (mag <= eps) {
      this.setArrow("\u25AC", "flat");
    } else if (d > 0) {
      this.setArrow("\u25B2", goodDir === "up" ? "good" : "bad");
    } else {
      this.setArrow("\u25BC", goodDir === "down" ? "good" : "bad");
    }
    this.text.textContent = mag.toFixed(prec);
  }
  setArrow(glyph, dir) {
    this.root.querySelector(".arrow").textContent = glyph;
    if (dir === "flat") this.removeAttribute("data-dir");
    else this.setAttribute("data-dir", dir);
  }
};

export {
  TalosDelta
};
