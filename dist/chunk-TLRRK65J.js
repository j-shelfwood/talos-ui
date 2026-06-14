import {
  num,
  prefersReducedMotion
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-range.ts
var TalosRange = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "value",
      "min",
      "max",
      "low",
      "high",
      "setpoint",
      "warn",
      "crit",
      "label",
      "unit",
      "width"
    ];
  }
  root;
  bandEl;
  marker;
  setpointEl;
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
        .band {
          position: absolute;
          top: 0;
          bottom: 0;
          /* the tolerance window, tinted by the current band colour but kept
             low-alpha so the marker reads on top \u2014 the band is context, the
             marker is the signal. */
          background: color-mix(in srgb, var(--_c) 28%, transparent);
          border-inline: 1px solid color-mix(in srgb, var(--_c) 55%, transparent);
        }
        .band:not(.on) { display: none; }
        .marker {
          position: absolute;
          top: -2px;
          bottom: -2px;
          width: 2px;
          margin-left: -1px;
          background: var(--_c);
          /* colour snaps (state must not lag); the POSITION tweens via rAF in JS */
        }
        .setpoint {
          position: absolute;
          top: -3px;
          bottom: -3px;
          width: 1px;
          margin-left: -0.5px;
          background: var(--talos-foreground, #fff);
          opacity: 0.5;
        }
        .setpoint:not(.on) { display: none; }
      </style>
      <div class="head">
        <span class="caption" part="caption"></span>
        <span class="readout" part="readout"></span>
      </div>
      <div class="rail" part="rail">
        <div class="band" part="band"></div>
        <div class="setpoint" part="setpoint"></div>
        <div class="marker" part="marker"></div>
      </div>
    `;
    this.bandEl = this.root.querySelector(".band");
    this.marker = this.root.querySelector(".marker");
    this.setpointEl = this.root.querySelector(".setpoint");
    this.readout = this.root.querySelector(".readout");
    this.caption = this.root.querySelector(".caption");
  }
  observer;
  connectedCallback() {
    this.shown = num(this, "value", 0);
    this.render();
    this.observer = new MutationObserver(() => this.update());
    this.observer.observe(this, {
      attributeFilter: [
        "value",
        "min",
        "max",
        "low",
        "high",
        "setpoint",
        "warn",
        "crit",
        "label",
        "unit",
        "width"
      ]
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
  /**
   * Resolve the band for `value`. Local rule (NOT bandOf — the contract here is
   * the tolerance window, not a single rising/falling threshold):
   *   inside [low, high] → nominal; outside but on the rail → warning; beyond
   *   the outer warn/crit thresholds or off the rail → critical.
   */
  band(value, min, max) {
    const low = this.getAttribute("low");
    const high = this.getAttribute("high");
    const lo = low !== null ? parseFloat(low) : NaN;
    const hi = high !== null ? parseFloat(high) : NaN;
    const hasBand = Number.isFinite(lo) && Number.isFinite(hi);
    if (value < min || value > max) return "critical";
    if (!hasBand) return "nominal";
    if (value >= lo && value <= hi) return "nominal";
    const crit = this.getAttribute("crit");
    const warn = this.getAttribute("warn");
    if (crit !== null) {
      const c = parseFloat(crit);
      if (Number.isFinite(c) && (value <= lo - c || value >= hi + c)) return "critical";
    }
    if (warn !== null) {
      const w = parseFloat(warn);
      if (Number.isFinite(w) && (value <= lo - w || value >= hi + w)) return "critical";
    }
    return "warning";
  }
  frac(v, min, max) {
    return max > min ? (Math.max(min, Math.min(max, v)) - min) / (max - min) : 0;
  }
  render() {
    const width = num(this, "width", 200);
    const min = num(this, "min", 0);
    const max = num(this, "max", 100);
    this.style.width = `${width}px`;
    const target = num(this, "value", this.shown);
    const band = this.band(target, min, max);
    const bandVar = band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
    this.style.setProperty("--_c", `var(${bandVar})`);
    const low = this.getAttribute("low");
    const high = this.getAttribute("high");
    const lo = low !== null ? parseFloat(low) : NaN;
    const hi = high !== null ? parseFloat(high) : NaN;
    if (Number.isFinite(lo) && Number.isFinite(hi)) {
      const a = this.frac(Math.min(lo, hi), min, max);
      const b = this.frac(Math.max(lo, hi), min, max);
      this.bandEl.classList.add("on");
      this.bandEl.style.left = `${(a * 100).toFixed(2)}%`;
      this.bandEl.style.right = `${((1 - b) * 100).toFixed(2)}%`;
    } else {
      this.bandEl.classList.remove("on");
    }
    this.marker.style.left = `${(this.frac(this.shown, min, max) * 100).toFixed(2)}%`;
    const sp = this.getAttribute("setpoint");
    const spv = sp !== null ? parseFloat(sp) : NaN;
    if (Number.isFinite(spv)) {
      this.setpointEl.classList.add("on");
      this.setpointEl.style.left = `${(this.frac(spv, min, max) * 100).toFixed(2)}%`;
    } else {
      this.setpointEl.classList.remove("on");
    }
    const unit = this.getAttribute("unit") ?? "";
    this.readout.innerHTML = `${Math.round(target)}${unit ? `<span class="unit">${unit}</span>` : ""}`;
    this.caption.textContent = this.getAttribute("label") ?? "";
    this.setAttribute("role", "meter");
    this.setAttribute("aria-valuenow", String(Math.round(num(this, "value", 0))));
    this.setAttribute("aria-valuemin", String(min));
    this.setAttribute("aria-valuemax", String(max));
    const lbl = this.getAttribute("label");
    const verdict = band === "nominal" ? "in band" : band === "warning" ? "out of band" : "critical";
    const text = `${lbl ? `${lbl}: ` : ""}${Math.round(target)}${unit} \u2014 ${verdict}`;
    this.setAttribute("aria-label", text);
    this.setAttribute("aria-valuetext", text);
  }
};

export {
  TalosRange
};
