import {
  svgEl
} from "./chunk-FOSYIWTW.js";
import {
  setImageA11y
} from "./chunk-4WWY5MOA.js";
import {
  num,
  prefersReducedMotion
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-orbital.ts
var TalosOrbital = class extends HTMLElement {
  static get observedAttributes() {
    return ["rings", "warn", "crit", "size", "core-label", "core-sub"];
  }
  root;
  svg;
  gRings;
  gArcs;
  gNodes;
  core;
  state = [];
  raf = 0;
  lastT = 0;
  observer;
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
          --_ring: var(--talos-edge-subtle, hsl(0 0% 100% / 0.08));
          --_ringStrong: var(--talos-edge-default, hsl(0 0% 100% / 0.16));
          --_core: var(--talos-foreground, #e7e9ec);
          display: block;
          width: 100%;
          aspect-ratio: 1 / 1;
          font-family: var(--talos-font-display, system-ui);
        }
        svg { display: block; width: 100%; height: 100%; overflow: visible; }
        .ring { fill: none; stroke: var(--_ring); stroke-width: 1; vector-effect: non-scaling-stroke; }
        .ring--axis { stroke: var(--_ring); stroke-dasharray: 2 6; }
        .arc { fill: none; stroke-width: 1; vector-effect: non-scaling-stroke; }
        .node-dot { stroke: rgba(0,0,0,0.5); stroke-width: 1; }
        .node-label {
          font-size: 9px; text-transform: uppercase;
          letter-spacing: 0.12em; fill: var(--talos-muted-foreground, hsl(0 0% 60%));
        }
        .core-ring { fill: none; stroke: var(--_ringStrong); stroke-width: 1; vector-effect: non-scaling-stroke; }
        .core-fill { fill: hsl(0 0% 0% / 0.6); }
        .core-label {
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em;
          fill: var(--_core); text-anchor: middle; dominant-baseline: middle;
        }
        .core-sub {
          font-size: 8px; text-transform: uppercase; letter-spacing: 0.18em;
          fill: var(--talos-muted-foreground, hsl(0 0% 60%));
          text-anchor: middle; dominant-baseline: middle;
        }
      </style>
      <svg part="svg" preserveAspectRatio="xMidYMid meet">
        <g class="rings" part="rings"></g>
        <g class="arcs" part="arcs"></g>
        <g class="nodes" part="nodes"></g>
        <g class="core" part="core"></g>
      </svg>
    `;
    this.svg = this.root.querySelector("svg");
    this.gRings = this.root.querySelector(".rings");
    this.gArcs = this.root.querySelector(".arcs");
    this.gNodes = this.root.querySelector(".nodes");
    this.core = this.root.querySelector(".core");
  }
  connectedCallback() {
    this.layout();
    this.startLoop();
    this.observer = new MutationObserver(() => this.layout());
    this.observer.observe(this, {
      attributeFilter: ["rings", "warn", "crit", "size", "core-label", "core-sub"]
    });
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
  }
  /** Set the live node set. Preserves orbit angle for nodes that persist. */
  set nodes(next) {
    const prev = new Map(this.state.map((n) => [n.id, n.angle]));
    this.state = next.map((n, i) => ({
      ...n,
      angle: prev.get(n.id) ?? i / Math.max(1, next.length) * Math.PI * 2
    }));
    this.renderNodes();
  }
  get nodes() {
    return this.state.map(({ angle, ...n }) => n);
  }
  get sizePx() {
    return num(this, "size", 520);
  }
  get ringCount() {
    return Math.max(1, Math.round(num(this, "rings", 3)));
  }
  get cx() {
    return this.sizePx / 2;
  }
  get cy() {
    return this.sizePx / 2;
  }
  get coreR() {
    return this.sizePx * 0.1;
  }
  /** Radius of ring r (1-based). */
  ringRadius(r) {
    const inner = this.coreR + this.sizePx * 0.06;
    const outer = this.sizePx * 0.46;
    const span = outer - inner;
    return inner + span * (r - 0.5) / this.ringCount;
  }
  bandColor(value) {
    const crit = num(this, "crit", 90);
    const warn = num(this, "warn", 70);
    if (value >= crit) return "var(--_critical)";
    if (value >= warn) return "var(--_warning)";
    return "var(--_nominal)";
  }
  /** Draw the static frame: rings, axes, core. */
  layout() {
    const s = this.sizePx;
    this.svg.setAttribute("viewBox", `0 0 ${s} ${s}`);
    const rings = [];
    for (let r = 1; r <= this.ringCount; r++) {
      rings.push(
        svgEl("circle", {
          class: "ring",
          cx: String(this.cx),
          cy: String(this.cy),
          r: this.ringRadius(r).toFixed(1)
        })
      );
    }
    rings.push(
      svgEl("line", {
        class: "ring ring--axis",
        x1: String(this.cx),
        y1: String(this.cy - s * 0.46),
        x2: String(this.cx),
        y2: String(this.cy + s * 0.46)
      }),
      svgEl("line", {
        class: "ring ring--axis",
        x1: String(this.cx - s * 0.46),
        y1: String(this.cy),
        x2: String(this.cx + s * 0.46),
        y2: String(this.cy)
      })
    );
    this.gRings.replaceChildren(...rings);
    const label = this.getAttribute("core-label") ?? "CORE";
    const sub = this.getAttribute("core-sub") ?? "SYS://ATLAS";
    const coreLabel = svgEl("text", {
      class: "core-label",
      x: String(this.cx),
      y: String(this.cy - 4)
    });
    coreLabel.textContent = label;
    const coreSub = svgEl("text", {
      class: "core-sub",
      x: String(this.cx),
      y: String(this.cy + 9)
    });
    coreSub.textContent = sub;
    this.core.replaceChildren(
      svgEl("circle", {
        class: "core-fill",
        cx: String(this.cx),
        cy: String(this.cy),
        r: String(this.coreR)
      }),
      svgEl("circle", {
        class: "core-ring",
        cx: String(this.cx),
        cy: String(this.cy),
        r: String(this.coreR)
      }),
      svgEl("circle", {
        class: "core-ring",
        cx: String(this.cx),
        cy: String(this.cy),
        r: (this.coreR * 0.7).toFixed(1)
      }),
      coreLabel,
      coreSub
    );
    this.renderNodes();
  }
  /** Position + style nodes and their flow arcs from current state. */
  renderNodes() {
    const nodes = [];
    const arcs = [];
    for (const n of this.state) {
      const r = this.ringRadius(Math.max(1, Math.min(this.ringCount, n.ring)));
      const x = this.cx + r * Math.cos(n.angle);
      const y = this.cy + r * Math.sin(n.angle);
      const size = 3 + Math.max(0, Math.min(1, n.load)) * (this.sizePx * 0.022);
      const color = this.bandColor(n.value);
      const rate = Math.max(0, Math.min(100, n.rate)) / 100;
      if (rate > 0.02) {
        const mx = this.cx + r * 0.5 * Math.cos(n.angle - 0.25);
        const my = this.cy + r * 0.5 * Math.sin(n.angle - 0.25);
        arcs.push(
          svgEl("path", {
            class: "arc",
            d: `M ${this.cx} ${this.cy} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`,
            stroke: color,
            opacity: (0.12 + rate * 0.5).toFixed(2)
          })
        );
      }
      nodes.push(
        svgEl("circle", {
          class: "node-dot",
          cx: x.toFixed(1),
          cy: y.toFixed(1),
          r: size.toFixed(1),
          fill: color
        })
      );
      if (n.label) {
        const label = svgEl("text", {
          class: "node-label",
          x: (x + size + 4).toFixed(1),
          y: (y + 3).toFixed(1)
        });
        label.textContent = n.label;
        nodes.push(label);
      }
    }
    this.gArcs.replaceChildren(...arcs);
    this.gNodes.replaceChildren(...nodes);
    const crit = num(this, "crit", 90);
    const warn = num(this, "warn", 70);
    let nNominal = 0, nWarning = 0, nCritical = 0;
    let rings = 0;
    for (const n of this.state) {
      if (n.ring > rings) rings = n.ring;
      if (n.value >= crit) nCritical++;
      else if (n.value >= warn) nWarning++;
      else nNominal++;
    }
    const count = this.state.length;
    const coreLabel = this.getAttribute("core-label") ?? "CORE";
    setImageA11y(this, {
      summary: `System mesh: ${count} node${count === 1 ? "" : "s"} across ${rings} ring${rings === 1 ? "" : "s"}, core ${coreLabel}. ${nNominal} nominal, ${nWarning} warning, ${nCritical} critical.`
    });
  }
  /** Persistent rAF: advance each node's orbit by its rate, then re-render.
   *  (The proven reactivity pattern — one loop, reads live state, no per-change
   *  scheduling to starve.) */
  startLoop() {
    cancelAnimationFrame(this.raf);
    const loop = (t) => {
      const dt = this.lastT ? (t - this.lastT) / 1e3 : 0;
      this.lastT = t;
      if (!prefersReducedMotion()) {
        for (const n of this.state) {
          const speed = (0.15 + n.rate / 100 * 0.7) * (1 + (this.ringCount - n.ring) * 0.12);
          n.angle += speed * dt;
        }
        this.renderNodes();
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  /** Force a re-render (e.g. after mutating node fields in place). */
  update() {
    this.renderNodes();
  }
};

export {
  TalosOrbital
};
