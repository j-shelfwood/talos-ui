import {
  setImageA11y
} from "./chunk-4WWY5MOA.js";
import {
  num
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-histogram.ts
var TalosHistogram = class extends HTMLElement {
  static get observedAttributes() {
    return ["bins", "min", "max", "warn", "crit", "invert", "label"];
  }
  root;
  gBars;
  _values = [];
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
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
    this.gBars = this.root.querySelector(".bars");
  }
  set values(v) {
    this._values = v;
    this.render();
  }
  get values() {
    return this._values;
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const bins = Math.max(1, Math.round(num(this, "bins", 24)));
    const min = num(this, "min", 0);
    const max = num(this, "max", 100);
    const warn = this.getAttribute("warn");
    const crit = this.getAttribute("crit");
    const invert = this.hasAttribute("invert");
    const span = max - min || 1;
    const counts = new Array(bins).fill(0);
    const vals = this._values;
    for (let i = 0; i < vals.length; i++) {
      const t = (vals[i] - min) / span;
      const b = Math.max(0, Math.min(bins - 1, Math.floor(t * bins)));
      counts[b]++;
    }
    const peak = Math.max(1, ...counts);
    const bandColour = (centreValue) => {
      const trips = (t) => t !== null && (invert ? centreValue <= parseFloat(t) : centreValue >= parseFloat(t));
      if (trips(crit)) return "var(--_critical)";
      if (trips(warn)) return "var(--_warning)";
      return "var(--_nominal)";
    };
    const W = 100;
    const H = 40;
    const slot = W / bins;
    const barW = slot * 0.78;
    const pad = (slot - barW) / 2;
    const rects = this.gBars.querySelectorAll("rect");
    for (let i = 0; i < bins; i++) {
      let rect = rects[i];
      if (!rect) {
        rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("class", "bar");
        this.gBars.appendChild(rect);
      }
      const hBar = counts[i] / peak * H;
      const centreValue = min + (i + 0.5) / bins * span;
      rect.setAttribute("x", (i * slot + pad).toFixed(2));
      rect.setAttribute("y", (H - hBar).toFixed(2));
      rect.setAttribute("width", barW.toFixed(2));
      rect.setAttribute("height", hBar.toFixed(2));
      rect.setAttribute("fill", bandColour(centreValue));
    }
    for (let i = bins; i < rects.length; i++) rects[i].remove();
    const lbl = this.getAttribute("label");
    setImageA11y(this, {
      label: lbl,
      summary: `distribution of ${vals.length} values across ${bins} buckets`
    });
  }
};

export {
  TalosHistogram
};
