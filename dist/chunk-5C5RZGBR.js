import {
  setImageA11y
} from "./chunk-4WWY5MOA.js";
import {
  bandOf,
  num,
  prefersReducedMotion
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-flow.ts
var TalosFlow = class extends HTMLElement {
  static get observedAttributes() {
    return ["rate", "max", "warn", "crit", "invert", "x1", "y1", "x2", "y2", "curve", "reverse", "width", "height"];
  }
  root;
  base;
  dash;
  chevrons;
  raf = 0;
  offset = 0;
  last = 0;
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
    this.base = this.root.querySelector(".base");
    this.dash = this.root.querySelector(".dash");
    this.chevrons = this.root.querySelector(".chev");
  }
  observer;
  connectedCallback() {
    this.render();
    this.tick(performance.now());
    this.observer = new MutationObserver(() => this.render());
    this.observer.observe(this, {
      attributeFilter: ["rate", "max", "warn", "crit", "invert", "x1", "y1", "x2", "y2", "curve", "reverse", "width", "height"]
    });
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
  }
  band(value) {
    return bandOf(this, value);
  }
  pathD() {
    const w = num(this, "width", 200);
    const h = num(this, "height", 40);
    const x1 = num(this, "x1", 4);
    const y1 = num(this, "y1", h / 2);
    const x2 = num(this, "x2", w - 4);
    const y2 = num(this, "y2", h / 2);
    const curve = num(this, "curve", 0);
    if (curve === 0) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - curve;
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  }
  render() {
    const w = num(this, "width", 200);
    const h = num(this, "height", 40);
    const svg = this.root.querySelector("svg");
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const d = this.pathD();
    this.base.setAttribute("d", d);
    this.dash.setAttribute("d", d);
    const rate = Math.max(0, num(this, "rate", 0));
    const band = this.band(rate);
    const bandVar = band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
    this.style.setProperty("--_c", `var(${bandVar})`);
    this.dash.style.opacity = rate <= 0 ? "0" : "1";
    if (prefersReducedMotion()) {
      this.dash.style.opacity = "0";
      this.chevrons.style.display = rate > 0 ? "block" : "none";
      this.renderChevrons();
    } else {
      this.chevrons.style.display = "none";
    }
    setImageA11y(this, {
      summary: `flow ${rate > 0 ? rate.toFixed(0) + "/" + num(this, "max", 100).toFixed(0) : "idle"} ${this.hasAttribute("reverse") ? "reverse" : "forward"}, ${band}`
    });
  }
  renderChevrons() {
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
  tick = (now) => {
    const dt = this.last ? (now - this.last) / 1e3 : 0;
    this.last = now;
    if (!prefersReducedMotion()) {
      const rate = Math.max(0, num(this, "rate", 0));
      const max = Math.max(1, num(this, "max", 100));
      const speed = Math.min(rate / max, 1) * 60;
      const dir = this.hasAttribute("reverse") ? 1 : -1;
      this.offset += speed * dt * dir;
      this.dash.style.strokeDashoffset = String(this.offset);
    }
    this.raf = requestAnimationFrame(this.tick);
  };
};

export {
  TalosFlow
};
