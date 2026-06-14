import {
  bandOf,
  num,
  prefersReducedMotion
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-gauge.ts
var TalosGauge = class extends HTMLElement {
  // CONVENTION: every Talos web component declares observedAttributes as a
  // static GETTER (not a class field), uniformly across the library. Both forms
  // compile correctly under the current tsup/esbuild config (the field is
  // emitted in-class, verified in dist/wc/index.js), so this is a coherence
  // choice, not a workaround: the getter is unambiguously evaluated on the
  // constructor before customElements.define() reads it, with no dependency on
  // how the bundler lowers static fields. Keep new components on the getter.
  static get observedAttributes() {
    return ["value", "min", "max", "warn", "crit", "invert", "label", "unit", "sweep", "size"];
  }
  root;
  arc;
  needle;
  readout;
  caption;
  frame = 0;
  shown = 0;
  // the currently-displayed (eased) value
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
      <style>
        :host {
          /* Band colours default to the status tokens; the rendered band sets
             --_c to one of these, and everything that encodes state reads it. */
          --_nominal: var(--talos-success, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(38 92% 60%));
          --_critical: var(--talos-danger, hsl(0 80% 62%));
          --_track: var(--talos-edge-subtle, hsl(0 0% 100% / 0.1));
          --_c: var(--_nominal);

          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          font-family: var(--talos-font-display, system-ui);
          color: var(--talos-foreground, #e7e9ec);
        }
        .dial { position: relative; }
        svg { display: block; overflow: visible; }
        .track {
          fill: none;
          stroke: var(--_track);
          stroke-linecap: butt;
        }
        /* Band colour is the STATE \u2014 it must not lag behind the value (a CSS
           colour transition under fast updates renders a stroke that disagrees
           with the readout). So colour snaps; only the needle POSITION tweens
           (via rAF in JS). */
        .value-arc {
          fill: none;
          stroke: var(--_c);
          stroke-linecap: butt;
        }
        .needle {
          stroke: var(--_c);
          stroke-width: 2;
          stroke-linecap: round;
        }
        .hub { fill: var(--_c); }
        /* The readout is the only text *inside* the dial, so it owns a reserved
           keep-out zone the arc and needle must never enter (see render(): the
           needle's inner radius is clamped outside this box's circumscribed
           radius). It is centred on the arc's enclosed centroid \u2014 NOT a magic
           bottom-% \u2014 and that centre + size are written from JS each render so
           the zone tracks size/sweep dynamically. */
        .readout {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          white-space: nowrap;
          font-weight: 300;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
          line-height: 1;
          color: var(--_c);
        }
        .unit {
          font-size: 0.5em;
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
          margin-left: 0.15em;
        }
        .caption {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: var(--talos-tracking-hud, 0.18em);
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
        }
        .caption:empty { display: none; }
      </style>
      <div class="dial" part="dial">
        <svg part="svg">
          <path class="track" part="track"></path>
          <path class="value-arc" part="value-arc"></path>
          <line class="needle" part="needle"></line>
          <circle class="hub" part="hub"></circle>
        </svg>
        <div class="readout" part="readout"></div>
      </div>
      <div class="caption" part="caption"></div>
    `;
    this.arc = this.root.querySelector(".value-arc");
    this.needle = this.root.querySelector(".needle");
    this.readout = this.root.querySelector(".readout");
    this.caption = this.root.querySelector(".caption");
  }
  observer;
  connectedCallback() {
    this.shown = num(this, "value", 0);
    this.render();
    this.observer = new MutationObserver(() => this.update());
    this.startEase();
    this.observer.observe(this, {
      attributeFilter: ["value", "min", "max", "warn", "crit", "invert", "label", "unit", "sweep", "size"]
    });
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }
  /** Render immediately from the true value (colour + readout are exact at once);
   *  the needle position eases toward it via startEase(). */
  update() {
    if (prefersReducedMotion()) this.shown = num(this, "value", this.shown);
    this.render();
  }
  /** A single persistent rAF that eases `shown` toward the live target each
   *  frame. Self-contained — it reads the attribute live, so no per-mutation
   *  tween state to cancel/restart (the old approach deadlocked under rapid
   *  updates). Runs until disconnect. */
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
  /** Which band the value falls in — this is the state, and it drives colour. */
  band(value) {
    return bandOf(this, value);
  }
  /** Polar→cartesian on the dial circle, angle in degrees (0 = right, CW). */
  point(cx, cy, r, deg) {
    const rad = deg * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }
  arcPath(cx, cy, r, a0, a1) {
    const [x0, y0] = this.point(cx, cy, r, a0);
    const [x1, y1] = this.point(cx, cy, r, a1);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    const sweep = a1 > a0 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
  }
  render() {
    const size = num(this, "size", 160);
    const min = num(this, "min", 0);
    const max = num(this, "max", 100);
    const sweep = Math.max(180, Math.min(300, num(this, "sweep", 240)));
    const stroke = Math.max(4, size * 0.06);
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - stroke / 2 - 2;
    const textCx = cx;
    const textCy = cy + size * 0.08;
    const start = 90 + sweep / 2;
    const end = 90 - sweep / 2;
    const clamped = Math.max(min, Math.min(max, this.shown));
    const frac = max > min ? (clamped - min) / (max - min) : 0;
    const valAngle = start + (end - start) * frac;
    const target = Math.max(min, Math.min(max, num(this, "value", this.shown)));
    const band = this.band(target);
    const bandVar = band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
    this.style.setProperty("--_c", `var(${bandVar})`);
    const svg = this.root.querySelector("svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    this.root.querySelector(".track").setAttribute("d", this.arcPath(cx, cy, r, start, end));
    this.root.querySelector(".track").setAttribute("stroke-width", String(stroke));
    this.arc.setAttribute("d", this.arcPath(cx, cy, r, start, valAngle));
    this.arc.setAttribute("stroke-width", String(stroke));
    const unit = this.getAttribute("unit") ?? "";
    const display = Math.round(target).toString();
    this.readout.innerHTML = `${display}${unit ? `<span class="unit">${unit}</span>` : ""}`;
    this.readout.style.fontSize = `${size * 0.22}px`;
    this.readout.style.left = `${textCx / size * 100}%`;
    this.readout.style.top = `${textCy / size * 100}%`;
    const measured = this.readout.getBoundingClientRect();
    const hostRect = this.getBoundingClientRect();
    const scale = hostRect.width > 0 ? size / hostRect.width : 1;
    const tw = (measured.width || size * 0.5) * scale;
    const th = (measured.height || size * 0.22) * scale;
    const offset = Math.abs(textCy - cy);
    const keepOut = Math.hypot(tw / 2, th / 2 + offset) + stroke * 0.5;
    const innerR = Math.min(r - stroke - 2, Math.max(r * 0.52, keepOut));
    const [nx0, ny0] = this.point(cx, cy, innerR, valAngle);
    const [nx1, ny1] = this.point(cx, cy, r - stroke, valAngle);
    this.needle.setAttribute("x1", String(nx0));
    this.needle.setAttribute("y1", String(ny0));
    this.needle.setAttribute("x2", String(nx1));
    this.needle.setAttribute("y2", String(ny1));
    const hub = this.root.querySelector(".hub");
    hub.setAttribute("cx", String(nx0));
    hub.setAttribute("cy", String(ny0));
    hub.setAttribute("r", String(Math.max(2.5, size * 0.025)));
    this.caption.textContent = this.getAttribute("label") ?? "";
    this.setAttribute("role", "meter");
    this.setAttribute("aria-valuenow", String(Math.round(num(this, "value", 0))));
    this.setAttribute("aria-valuemin", String(min));
    this.setAttribute("aria-valuemax", String(max));
    const lbl = this.getAttribute("label");
    if (lbl) this.setAttribute("aria-label", lbl);
  }
};

export {
  TalosGauge
};
