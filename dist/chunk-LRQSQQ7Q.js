import {
  bandOf,
  num
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-spark.ts
var TalosSpark = class extends HTMLElement {
  static get observedAttributes() {
    return ["data", "points", "min", "max", "warn", "crit", "invert", "fill"];
  }
  /** The seed series: canonical `data=`, with `points=` as a deprecated alias. */
  seedAttr() {
    return this.getAttribute("data") ?? this.getAttribute("points");
  }
  root;
  svg;
  line;
  area;
  buf = [];
  frame = 0;
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
      <style>
        :host {
          display: inline-block;
          width: var(--talos-spark-w, 100%);
          height: var(--talos-spark-h, 16px);
          /* nominal band = --talos-success (the band token), matching gauge/
             meter/trend. --talos-accent is reserved for live-status, not bands. */
          --_nominal: var(--talos-success, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(38 92% 60%));
          --_critical: var(--talos-danger, hsl(0 80% 62%));
          --_stroke: var(--_nominal);
        }
        svg { display: block; width: 100%; height: 100%; overflow: visible; }
        .line { fill: none; stroke: var(--_stroke); stroke-width: 1; vector-effect: non-scaling-stroke; }
        .area { fill: var(--_stroke); opacity: 0.1; stroke: none; }
        :host([data-band="warning"]) { --_stroke: var(--_warning); }
        :host([data-band="critical"]) { --_stroke: var(--_critical); }
      </style>
      <svg part="svg" preserveAspectRatio="none">
        <polygon class="area" part="area" points=""></polygon>
        <polyline class="line" part="line" points=""></polyline>
      </svg>`;
    this.svg = this.root.querySelector("svg");
    this.area = this.root.querySelector(".area");
    this.line = this.root.querySelector(".line");
  }
  connectedCallback() {
    const attr = this.seedAttr();
    if (attr) this.buf = attr.split(/[\s,]+/).map(Number).filter(Number.isFinite);
    this.schedule();
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
  }
  attributeChangedCallback(name) {
    if (name === "data" || name === "points") {
      const attr = this.seedAttr();
      this.buf = attr ? attr.split(/[\s,]+/).map(Number).filter(Number.isFinite) : [];
    }
    this.schedule();
  }
  /** Append a sample and re-render (the streaming entry point). */
  push(value) {
    if (!Number.isFinite(value)) return;
    const cap = num(this, "cap", 32);
    this.buf.push(value);
    while (this.buf.length > cap) this.buf.shift();
    this.schedule();
  }
  schedule() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.render());
  }
  render() {
    const n = this.buf.length;
    const min = num(this, "min", 0);
    const max = num(this, "max", 100);
    const span = max - min || 1;
    const W = 100, H = 16;
    this.setAttribute("role", "img");
    if (n < 2) {
      this.line.setAttribute("points", "");
      this.area.setAttribute("points", "");
      this.setAttribute(
        "aria-label",
        n === 1 ? `Sparkline, 1 point, current ${this.buf[0]}` : "Sparkline, no data"
      );
      return;
    }
    const pts = this.buf.map((v, i) => {
      const x = i / (n - 1) * W;
      const y = H - Math.max(0, Math.min(1, (v - min) / span)) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    this.svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    this.line.setAttribute("points", pts);
    if (this.hasAttribute("fill")) {
      this.area.setAttribute("points", `0,${H} ${pts} ${W},${H}`);
    } else {
      this.area.setAttribute("points", "");
    }
    const band = bandOf(this, this.buf[n - 1]);
    if (band === "nominal") this.removeAttribute("data-band");
    else this.setAttribute("data-band", band);
    this.setAttribute(
      "aria-label",
      `Sparkline, ${n} points, current ${this.buf[n - 1]}, ${band}`
    );
  }
};

export {
  TalosSpark
};
