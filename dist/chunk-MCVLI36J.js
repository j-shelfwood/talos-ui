import {
  replaceTextWithUnit
} from "./chunk-FOSYIWTW.js";
import {
  setMeterA11y
} from "./chunk-4WWY5MOA.js";
import {
  bandOf,
  num,
  prefersReducedMotion
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-meter.ts
var TalosMeter = class extends HTMLElement {
  static get observedAttributes() {
    return ["value", "min", "max", "warn", "crit", "invert", "label", "unit", "width", "ticks"];
  }
  root;
  fill;
  ticksEl;
  readout;
  caption;
  frame = 0;
  shown = 0;
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
          --_track: var(--talos-edge-subtle, hsl(0 0% 100% / 0.1));
          --_c: var(--_nominal);
          --_h: 0.5rem;

          display: inline-flex;
          flex-direction: column;
          gap: 0.35rem;
          font-family: var(--talos-font-display, system-ui);
          color: var(--talos-foreground, #e7e9ec);
        }
        /* Compact / inline variant \u2014 a bare micro-bar with no caption/readout
           chrome, sized to sit inside a dense readout row. The honest, real-
           ceiling replacement for hand-rolled mini "progress" bars. */
        :host([compact]) {
          --_h: 3px;
          gap: 0;
          width: var(--talos-meter-w, 100%);
          vertical-align: middle;
        }
        :host([compact]) .head { display: none; }
        .head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 1rem;
        }
        .caption {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: var(--talos-tracking-hud, 0.18em);
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
        }
        .caption:empty { display: none; }
        .readout {
          font-weight: 300;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          color: var(--_c);
        }
        .unit {
          font-size: 0.62em;
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
          margin-left: 0.1em;
        }
        .rail {
          position: relative;
          height: var(--_h);
          background: var(--_track);
          /* a small bottom-right chamfer echoing the house geometry */
          clip-path: polygon(0 0, 100% 0, 100% 100%, 4px 100%, 0 calc(100% - 4px));
        }
        .fill {
          position: absolute;
          inset: 0;
          transform-origin: left center;
          background: var(--_c);
          /* colour snaps (state must not lag); the LENGTH tweens via rAF in JS */
        }
        .ticks {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .tick {
          position: absolute;
          top: -2px;
          bottom: -2px;
          width: 1px;
          background: var(--talos-foreground, #fff);
          opacity: 0.5;
        }
      </style>
      <div class="head">
        <span class="caption" part="caption"></span>
        <span class="readout" part="readout"></span>
      </div>
      <div class="rail" part="rail">
        <div class="fill" part="fill"></div>
        <div class="ticks" part="ticks"></div>
      </div>
    `;
    this.fill = this.root.querySelector(".fill");
    this.ticksEl = this.root.querySelector(".ticks");
    this.readout = this.root.querySelector(".readout");
    this.caption = this.root.querySelector(".caption");
  }
  observer;
  connectedCallback() {
    this.shown = num(this, "value", 0);
    this.render();
    this.observer = new MutationObserver(() => this.update());
    this.observer.observe(this, {
      attributeFilter: ["value", "min", "max", "warn", "crit", "invert", "label", "unit", "width", "ticks"]
    });
    this.startEase();
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }
  /** Render immediately from the true value (colour + readout exact at once). */
  update() {
    if (prefersReducedMotion()) this.shown = num(this, "value", this.shown);
    this.render();
  }
  /** Persistent rAF easing `shown` toward the live target each frame. */
  startEase() {
    cancelAnimationFrame(this.frame);
    const loop = () => {
      const target = num(this, "value", this.shown);
      const diff = target - this.shown;
      if (Math.abs(diff) > 0.5) {
        this.shown += diff * 0.18;
        this.render();
      } else if (this.shown !== target) {
        this.shown = target;
        this.render();
      }
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }
  band(value) {
    return bandOf(this, value);
  }
  render() {
    const width = num(this, "width", 200);
    const min = num(this, "min", 0);
    const max = num(this, "max", 100);
    this.style.width = `${width}px`;
    const clamped = Math.max(min, Math.min(max, this.shown));
    const frac = max > min ? (clamped - min) / (max - min) : 0;
    const target = Math.max(min, Math.min(max, num(this, "value", this.shown)));
    const band = this.band(target);
    const bandVar = band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
    this.style.setProperty("--_c", `var(${bandVar})`);
    this.fill.style.transform = `scaleX(${frac})`;
    const showTicks = this.getAttribute("ticks") !== "off";
    this.ticksEl.innerHTML = "";
    if (showTicks) {
      for (const attr of ["warn", "crit"]) {
        const raw = this.getAttribute(attr);
        if (raw === null) continue;
        const v = parseFloat(raw);
        if (!Number.isFinite(v)) continue;
        const t = max > min ? (v - min) / (max - min) : 0;
        const tick = document.createElement("div");
        tick.className = "tick";
        tick.style.left = `${(t * 100).toFixed(2)}%`;
        this.ticksEl.appendChild(tick);
      }
    }
    const unit = this.getAttribute("unit") ?? "";
    const display = Math.round(target).toString();
    replaceTextWithUnit(this.readout, display, unit);
    this.caption.textContent = this.getAttribute("label") ?? "";
    const lbl = this.getAttribute("label");
    setMeterA11y(this, {
      label: lbl,
      summary: `${display}${unit} \u2014 ${band}`,
      value: Math.round(num(this, "value", 0)),
      min,
      max
    });
  }
};

export {
  TalosMeter
};
