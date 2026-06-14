import {
  bandOf,
  num
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-dots.ts
var TalosDots = class extends HTMLElement {
  static get observedAttributes() {
    return ["value", "total", "warn", "crit", "invert"];
  }
  root;
  wrap;
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          gap: var(--talos-dots-gap, 2px);
          /* nominal band = --talos-success (the band token), matching gauge/
             meter/trend. --talos-accent stays reserved for the live-status glow
             below, not for band colour. */
          --_nominal: var(--talos-success, hsl(140 90% 60%));
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
    this.wrap = this.root.querySelector(".wrap");
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const total = Math.max(0, Math.round(num(this, "total", 8)));
    const value = num(this, "value", 0);
    const on = Math.max(0, Math.min(total, Math.round(value)));
    if (this.wrap.childElementCount !== total) {
      this.wrap.innerHTML = Array.from({ length: total }, () => "<i></i>").join("");
    }
    Array.from(this.wrap.children).forEach((c, i) => c.classList.toggle("on", i < on));
    const band = bandOf(this, value);
    if (band === "nominal") this.removeAttribute("data-band");
    else this.setAttribute("data-band", band);
    this.setAttribute("role", "img");
    this.setAttribute("aria-label", `${on} of ${total}, ${band}`);
  }
};

export {
  TalosDots
};
