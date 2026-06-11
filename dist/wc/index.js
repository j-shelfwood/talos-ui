// src/wc/PanelShapeBuilder.ts
var PanelShapeBuilder = class {
  width;
  height;
  constructor(opts) {
    this.width = opts.width;
    this.height = opts.height;
  }
  buildPath(segments) {
    const corners = {
      "top-left": null,
      "top-right": null,
      "bottom-right": null,
      "bottom-left": null
    };
    const notches = {
      top: null,
      right: null,
      bottom: null,
      left: null
    };
    for (const seg of segments) {
      if (seg.type === "corner" && seg.edge in corners) {
        corners[seg.edge] = seg;
      } else if (seg.type === "notch" && seg.edge in notches) {
        notches[seg.edge] = seg;
      }
    }
    const tl = corners["top-left"]?.radius ?? 0;
    const tr = corners["top-right"]?.radius ?? 0;
    const br = corners["bottom-right"]?.radius ?? 0;
    const bl = corners["bottom-left"]?.radius ?? 0;
    const { width: w, height: h } = this;
    const cmds = [];
    const push = (cmd, ...pts) => cmds.push(`${cmd}${pts.join(",")}`);
    push("M", tl, 0);
    this.notch(cmds, notches.top, "top", w, h);
    push("L", w - tr, 0);
    push("L", w, tr || 0);
    this.notch(cmds, notches.right, "right", w, h);
    push("L", w, h - br);
    push("L", br ? w - br : w, h);
    this.notch(cmds, notches.bottom, "bottom", w, h);
    push("L", bl, h);
    push("L", 0, bl ? h - bl : h);
    this.notch(cmds, notches.left, "left", w, h);
    push("L", 0, tl);
    if (tl) push("L", tl, 0);
    return cmds.join(" ") + " Z";
  }
  notch(cmds, seg, edge, w, h) {
    if (!seg) return;
    const nw = seg.width ?? 0;
    const nd = seg.depth ?? 0;
    if (nw <= 0 || nd <= 0) return;
    const push = (cmd, ...pts) => cmds.push(`${cmd}${pts.join(",")}`);
    if (edge === "top") {
      const s = (w - nw) / 2;
      push("L", s, 0);
      push("L", s, nd);
      push("L", s + nw, nd);
      push("L", s + nw, 0);
    } else if (edge === "right") {
      const s = (h - nw) / 2;
      push("L", w, s);
      push("L", w - nd, s);
      push("L", w - nd, s + nw);
      push("L", w, s + nw);
    } else if (edge === "bottom") {
      const s = (w - nw) / 2;
      push("L", s + nw, h);
      push("L", s + nw, h - nd);
      push("L", s, h - nd);
      push("L", s, h);
    } else {
      const s = (h - nw) / 2;
      push("L", 0, s + nw);
      push("L", nd, s + nw);
      push("L", nd, s);
      push("L", 0, s);
    }
  }
};

// src/wc/talos-panel.ts
var TalosPanel = class extends HTMLElement {
  static get observedAttributes() {
    return ["panel-width", "panel-height", "fill", "edge", "stroke-width"];
  }
  root;
  svg;
  path;
  observer;
  frame = 0;
  animatedOnce = false;
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
      <style>
        :host {
          display: inline-block;
          position: relative;
          box-sizing: border-box;
          --_fill: var(--talos-hud-fill, hsl(0 0% 5%));
          --_edge: var(--talos-hud-edge, hsl(0 0% 100% / 0.28));
          --_stroke: 1;
        }
        svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
          pointer-events: none;
        }
        .outline {
          fill: var(--_fill);
          stroke: var(--_edge);
          stroke-width: var(--_stroke);
          stroke-linejoin: miter;
          vector-effect: non-scaling-stroke;
        }
        ::slotted(*) { position: relative; }
        .content {
          position: relative;
          z-index: 1;
          padding: 1rem;
        }
      </style>
      <svg part="svg" preserveAspectRatio="none">
        <path class="outline" part="outline" d=""></path>
      </svg>
      <div class="content"><slot></slot></div>
    `;
    this.svg = this.root.querySelector("svg");
    this.path = this.root.querySelector(".outline");
  }
  connectedCallback() {
    Promise.all([
      customElements.whenDefined("talos-corner"),
      customElements.whenDefined("talos-notch")
    ]).then(() => {
      this.observer = new MutationObserver(() => this.scheduleRender());
      this.observer.observe(this, { childList: true, subtree: true });
      this.addEventListener("talos:decorator-changed", () => this.scheduleRender());
      this.render();
    });
  }
  disconnectedCallback() {
    this.observer?.disconnect();
    cancelAnimationFrame(this.frame);
  }
  attributeChangedCallback() {
    this.scheduleRender();
  }
  /** Coalesce bursts of mutations into one render per frame. */
  scheduleRender() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.render());
  }
  dim(attr, fallback) {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }
  render() {
    const width = this.dim("panel-width", 400);
    const height = this.dim("panel-height", 200);
    const strokeWidth = this.dim("stroke-width", 1);
    const fill = this.getAttribute("fill");
    const edge = this.getAttribute("edge");
    if (fill) this.style.setProperty("--_fill", fill);
    if (edge) this.style.setProperty("--_edge", edge);
    this.style.setProperty("--_stroke", String(strokeWidth));
    this.style.setProperty("aspect-ratio", `${width} / ${height}`);
    if (!this.style.minHeight) {
      this.style.minHeight = `${Math.min(height, 160)}px`;
    }
    const segments = [];
    for (const el of Array.from(this.children)) {
      const seg = el.toSegment?.();
      if (seg) segments.push(seg);
    }
    const d = new PanelShapeBuilder({ width, height }).buildPath(segments);
    this.path.setAttribute("d", d);
    this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    if (this.hasAttribute("animate") && !this.animatedOnce && !this.reducedMotion) {
      this.animatedOnce = true;
      this.draw();
    }
  }
  get reducedMotion() {
    return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  draw() {
    const duration = this.dim("animation-duration", 800);
    const len = this.path.getTotalLength();
    this.path.style.strokeDasharray = String(len);
    this.path.style.strokeDashoffset = String(len);
    const start = performance.now();
    const step = (t) => {
      const p = Math.min((t - start) / duration, 1);
      this.path.style.strokeDashoffset = String(len * (1 - p));
      if (p < 1) requestAnimationFrame(step);
      else this.path.style.strokeDashoffset = "0";
    };
    requestAnimationFrame(step);
  }
};

// src/wc/talos-corner.ts
var TalosCorner = class extends HTMLElement {
  static get observedAttributes() {
    return ["edge", "radius"];
  }
  attributeChangedCallback() {
    this.closest("talos-panel")?.dispatchEvent(
      new CustomEvent("talos:decorator-changed", { bubbles: true })
    );
  }
  toSegment() {
    const edge = this.getAttribute("edge") ?? "";
    const valid = ["top-left", "top-right", "bottom-right", "bottom-left"];
    if (!valid.includes(edge)) return null;
    const radius = parseFloat(this.getAttribute("radius") ?? "16");
    if (!Number.isFinite(radius) || radius <= 0) return null;
    return { type: "corner", edge, radius };
  }
};

// src/wc/talos-notch.ts
var TalosNotch = class extends HTMLElement {
  static get observedAttributes() {
    return ["edge", "width", "depth"];
  }
  attributeChangedCallback() {
    this.closest("talos-panel")?.dispatchEvent(
      new CustomEvent("talos:decorator-changed", { bubbles: true })
    );
  }
  toSegment() {
    const edge = this.getAttribute("edge") ?? "";
    if (!["top", "right", "bottom", "left"].includes(edge)) return null;
    const width = parseFloat(this.getAttribute("width") ?? "60");
    const depth = parseFloat(this.getAttribute("depth") ?? "20");
    if (!Number.isFinite(width) || width <= 0) return null;
    if (!Number.isFinite(depth) || depth <= 0) return null;
    return { type: "notch", edge, width, depth };
  }
};

// src/wc/bands.ts
function bandOf(el, value) {
  const crit = el.getAttribute("crit");
  const warn = el.getAttribute("warn");
  const invert = el.hasAttribute("invert");
  const trips = (t) => invert ? value <= parseFloat(t) : value >= parseFloat(t);
  if (crit !== null && trips(crit)) return "critical";
  if (warn !== null && trips(warn)) return "warning";
  return "nominal";
}

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
    this.shown = this.num("value", 0);
    this.render();
    this.observer = new MutationObserver(() => this.update());
    this.startEase();
    this.observer.observe(this, {
      attributeFilter: ["value", "min", "max", "warn", "crit", "label", "unit", "sweep", "size"]
    });
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }
  num(attr, fallback) {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }
  get reducedMotion() {
    return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  /** Render immediately from the true value (colour + readout are exact at once);
   *  the needle position eases toward it via startEase(). */
  update() {
    if (this.reducedMotion) this.shown = this.num("value", this.shown);
    this.render();
  }
  /** A single persistent rAF that eases `shown` toward the live target each
   *  frame. Self-contained — it reads the attribute live, so no per-mutation
   *  tween state to cancel/restart (the old approach deadlocked under rapid
   *  updates). Runs until disconnect. */
  startEase() {
    cancelAnimationFrame(this.frame);
    const loop = () => {
      const target = this.num("value", this.shown);
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
    const size = this.num("size", 160);
    const min = this.num("min", 0);
    const max = this.num("max", 100);
    const sweep = Math.max(180, Math.min(300, this.num("sweep", 240)));
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
    const target = Math.max(min, Math.min(max, this.num("value", this.shown)));
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
    this.setAttribute("aria-valuenow", String(Math.round(this.num("value", 0))));
    this.setAttribute("aria-valuemin", String(min));
    this.setAttribute("aria-valuemax", String(max));
    const lbl = this.getAttribute("label");
    if (lbl) this.setAttribute("aria-label", lbl);
  }
};

// src/wc/talos-trend.ts
var TalosTrend = class extends HTMLElement {
  static get observedAttributes() {
    return ["value", "points", "min", "max", "warn", "crit", "invert", "width", "height", "fill", "label", "unit"];
  }
  root;
  line;
  area;
  dot;
  readout;
  caption;
  buf = [];
  frame = 0;
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
          --_grid: var(--talos-edge-subtle, hsl(0 0% 100% / 0.08));
          --_c: var(--_nominal);

          display: inline-flex;
          flex-direction: column;
          gap: 0.3rem;
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
          font-size: 0.6em;
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
          margin-left: 0.1em;
        }
        svg { display: block; overflow: visible; }
        .baseline { stroke: var(--_grid); stroke-width: 1; }
        /* Band colour snaps (state must not lag the data). */
        .area {
          fill: var(--_c);
          opacity: 0.12;
        }
        .line {
          fill: none;
          stroke: var(--_c);
          stroke-width: 1.5;
          stroke-linejoin: round;
          stroke-linecap: round;
          vector-effect: non-scaling-stroke;
        }
        .dot { fill: var(--_c); }
      </style>
      <div class="head">
        <span class="caption" part="caption"></span>
        <span class="readout" part="readout"></span>
      </div>
      <svg part="svg">
        <line class="baseline" part="baseline"></line>
        <polygon class="area" part="area"></polygon>
        <polyline class="line" part="line"></polyline>
        <circle class="dot" part="dot" r="2.5"></circle>
      </svg>
    `;
    this.line = this.root.querySelector(".line");
    this.area = this.root.querySelector(".area");
    this.dot = this.root.querySelector(".dot");
    this.readout = this.root.querySelector(".readout");
    this.caption = this.root.querySelector(".caption");
  }
  observer;
  lastValueAttr = null;
  connectedCallback() {
    if (this.hasAttribute("value") && this.buf.length === 0) {
      this.buf.push(this.num("value", 0));
      this.lastValueAttr = this.getAttribute("value");
    }
    this.render();
    this.observer = new MutationObserver((records) => {
      const valueChanged = records.some((r) => r.attributeName === "value");
      if (valueChanged) {
        const v = this.getAttribute("value");
        if (v !== this.lastValueAttr) {
          this.lastValueAttr = v;
          this.push(this.num("value", 0));
        }
      } else {
        this.scheduleRender();
      }
    });
    this.observer.observe(this, {
      attributeFilter: ["value", "points", "min", "max", "warn", "crit", "invert", "width", "height", "fill", "label", "unit"]
    });
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }
  /** Append a sample and scroll the window. Preferred entry for streams. */
  push(value) {
    const cap = Math.max(2, this.num("points", 48));
    this.buf.push(value);
    while (this.buf.length > cap) this.buf.shift();
    this.render();
  }
  scheduleRender() {
    this.render();
  }
  num(attr, fallback) {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }
  band(value) {
    return bandOf(this, value);
  }
  render() {
    const w = this.num("width", 220);
    const h = this.num("height", 60);
    const pad = 3;
    const svg = this.root.querySelector("svg");
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const base = this.root.querySelector(".baseline");
    base.setAttribute("x1", "0");
    base.setAttribute("y1", String(h - pad));
    base.setAttribute("x2", String(w));
    base.setAttribute("y2", String(h - pad));
    const data = this.buf;
    const current = data.length ? data[data.length - 1] : this.num("value", 0);
    const minAttr = this.getAttribute("min");
    const maxAttr = this.getAttribute("max");
    let lo = minAttr !== null ? parseFloat(minAttr) : Math.min(...data, current);
    let hi = maxAttr !== null ? parseFloat(maxAttr) : Math.max(...data, current);
    if (!Number.isFinite(lo)) lo = 0;
    if (!Number.isFinite(hi)) hi = 1;
    if (hi - lo < 1e-6) hi = lo + 1;
    const band = this.band(current);
    const bandVar = band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
    this.style.setProperty("--_c", `var(${bandVar})`);
    const n = data.length;
    const toXY = (i, v) => {
      const x = n <= 1 ? w : i / (n - 1) * (w - pad * 2) + pad;
      const t = (v - lo) / (hi - lo);
      const y = h - pad - t * (h - pad * 2);
      return [x, y];
    };
    if (n === 0) {
      this.line.setAttribute("points", "");
      this.area.setAttribute("points", "");
    } else {
      const pts = data.map((v, i) => toXY(i, v));
      const lineStr = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
      this.line.setAttribute("points", lineStr);
      if (this.hasAttribute("fill")) {
        const [x0] = pts[0];
        const [xn] = pts[pts.length - 1];
        this.area.setAttribute(
          "points",
          `${x0.toFixed(1)},${h - pad} ${lineStr} ${xn.toFixed(1)},${h - pad}`
        );
      } else {
        this.area.setAttribute("points", "");
      }
      const [dx, dy] = pts[pts.length - 1];
      this.dot.setAttribute("cx", dx.toFixed(1));
      this.dot.setAttribute("cy", dy.toFixed(1));
    }
    const unit = this.getAttribute("unit") ?? "";
    this.readout.style.fontSize = `${Math.max(14, h * 0.3)}px`;
    this.readout.innerHTML = `${Math.round(current)}${unit ? `<span class="unit">${unit}</span>` : ""}`;
    this.caption.textContent = this.getAttribute("label") ?? "";
    this.setAttribute("role", "img");
    const lbl = this.getAttribute("label");
    this.setAttribute(
      "aria-label",
      `${lbl ? lbl + ": " : ""}${Math.round(current)}${unit}, trend ${this.trendWord()}`
    );
  }
  /** A word for the recent direction, so the static a11y label carries the
   *  same information the moving line does. */
  trendWord() {
    if (this.buf.length < 2) return "flat";
    const a = this.buf[this.buf.length - 2];
    const b = this.buf[this.buf.length - 1];
    if (b > a) return "rising";
    if (b < a) return "falling";
    return "flat";
  }
};

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
    this.shown = this.num("value", 0);
    this.render();
    this.observer = new MutationObserver(() => this.update());
    this.observer.observe(this, {
      attributeFilter: ["value", "min", "max", "warn", "crit", "label", "unit", "width", "ticks"]
    });
    this.startEase();
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }
  num(attr, fallback) {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }
  get reducedMotion() {
    return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  /** Render immediately from the true value (colour + readout exact at once). */
  update() {
    if (this.reducedMotion) this.shown = this.num("value", this.shown);
    this.render();
  }
  /** Persistent rAF easing `shown` toward the live target each frame. */
  startEase() {
    cancelAnimationFrame(this.frame);
    const loop = () => {
      const target = this.num("value", this.shown);
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
    const width = this.num("width", 200);
    const min = this.num("min", 0);
    const max = this.num("max", 100);
    this.style.width = `${width}px`;
    const clamped = Math.max(min, Math.min(max, this.shown));
    const frac = max > min ? (clamped - min) / (max - min) : 0;
    const target = Math.max(min, Math.min(max, this.num("value", this.shown)));
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
    this.readout.innerHTML = `${Math.round(target)}${unit ? `<span class="unit">${unit}</span>` : ""}`;
    this.caption.textContent = this.getAttribute("label") ?? "";
    this.setAttribute("role", "meter");
    this.setAttribute("aria-valuenow", String(Math.round(this.num("value", 0))));
    this.setAttribute("aria-valuemin", String(min));
    this.setAttribute("aria-valuemax", String(max));
    const lbl = this.getAttribute("label");
    if (lbl) this.setAttribute("aria-label", lbl);
  }
};

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
  num(attr, fallback) {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }
  get reducedMotion() {
    return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  band(value) {
    return bandOf(this, value);
  }
  pathD() {
    const w = this.num("width", 200);
    const h = this.num("height", 40);
    const x1 = this.num("x1", 4);
    const y1 = this.num("y1", h / 2);
    const x2 = this.num("x2", w - 4);
    const y2 = this.num("y2", h / 2);
    const curve = this.num("curve", 0);
    if (curve === 0) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - curve;
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  }
  render() {
    const w = this.num("width", 200);
    const h = this.num("height", 40);
    const svg = this.root.querySelector("svg");
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const d = this.pathD();
    this.base.setAttribute("d", d);
    this.dash.setAttribute("d", d);
    const rate = Math.max(0, this.num("rate", 0));
    const band = this.band(rate);
    const bandVar = band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
    this.style.setProperty("--_c", `var(${bandVar})`);
    this.dash.style.opacity = rate <= 0 ? "0" : "1";
    if (this.reducedMotion) {
      this.dash.style.opacity = "0";
      this.chevrons.style.display = rate > 0 ? "block" : "none";
      this.renderChevrons();
    } else {
      this.chevrons.style.display = "none";
    }
    this.setAttribute("role", "img");
    this.setAttribute(
      "aria-label",
      `flow ${rate > 0 ? rate.toFixed(0) + "/" + this.num("max", 100).toFixed(0) : "idle"} ${this.hasAttribute("reverse") ? "reverse" : "forward"}, ${band}`
    );
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
    if (!this.reducedMotion) {
      const rate = Math.max(0, this.num("rate", 0));
      const max = Math.max(1, this.num("max", 100));
      const speed = Math.min(rate / max, 1) * 60;
      const dir = this.hasAttribute("reverse") ? 1 : -1;
      this.offset += speed * dt * dir;
      this.dash.style.strokeDashoffset = String(this.offset);
    }
    this.raf = requestAnimationFrame(this.tick);
  };
};

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
  num(attr, fallback) {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }
  get reducedMotion() {
    return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  get sizePx() {
    return this.num("size", 520);
  }
  get ringCount() {
    return Math.max(1, Math.round(this.num("rings", 3)));
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
    const crit = this.num("crit", 90);
    const warn = this.num("warn", 70);
    if (value >= crit) return "var(--_critical)";
    if (value >= warn) return "var(--_warning)";
    return "var(--_nominal)";
  }
  /** Draw the static frame: rings, axes, core. */
  layout() {
    const s = this.sizePx;
    this.svg.setAttribute("viewBox", `0 0 ${s} ${s}`);
    let rings = "";
    for (let r = 1; r <= this.ringCount; r++) {
      rings += `<circle class="ring" cx="${this.cx}" cy="${this.cy}" r="${this.ringRadius(r).toFixed(1)}"></circle>`;
    }
    rings += `<line class="ring ring--axis" x1="${this.cx}" y1="${this.cy - s * 0.46}" x2="${this.cx}" y2="${this.cy + s * 0.46}"></line>`;
    rings += `<line class="ring ring--axis" x1="${this.cx - s * 0.46}" y1="${this.cy}" x2="${this.cx + s * 0.46}" y2="${this.cy}"></line>`;
    this.gRings.innerHTML = rings;
    const label = this.getAttribute("core-label") ?? "CORE";
    const sub = this.getAttribute("core-sub") ?? "SYS://ATLAS";
    this.core.innerHTML = `<circle class="core-fill" cx="${this.cx}" cy="${this.cy}" r="${this.coreR}"></circle><circle class="core-ring" cx="${this.cx}" cy="${this.cy}" r="${this.coreR}"></circle><circle class="core-ring" cx="${this.cx}" cy="${this.cy}" r="${(this.coreR * 0.7).toFixed(1)}"></circle><text class="core-label" x="${this.cx}" y="${this.cy - 4}">${label}</text><text class="core-sub" x="${this.cx}" y="${this.cy + 9}">${sub}</text>`;
    this.renderNodes();
  }
  /** Position + style nodes and their flow arcs from current state. */
  renderNodes() {
    let nodes = "";
    let arcs = "";
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
        arcs += `<path class="arc" d="M ${this.cx} ${this.cy} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}" stroke="${color}" opacity="${(0.12 + rate * 0.5).toFixed(2)}"></path>`;
      }
      nodes += `<circle class="node-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" fill="${color}"></circle>`;
      if (n.label) {
        nodes += `<text class="node-label" x="${(x + size + 4).toFixed(1)}" y="${(y + 3).toFixed(1)}">${n.label}</text>`;
      }
    }
    this.gArcs.innerHTML = arcs;
    this.gNodes.innerHTML = nodes;
  }
  /** Persistent rAF: advance each node's orbit by its rate, then re-render.
   *  (The proven reactivity pattern — one loop, reads live state, no per-change
   *  scheduling to starve.) */
  startLoop() {
    cancelAnimationFrame(this.raf);
    const loop = (t) => {
      const dt = this.lastT ? (t - this.lastT) / 1e3 : 0;
      this.lastT = t;
      if (!this.reducedMotion) {
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

// src/wc/talos-sheen.ts
var TalosSheen = class extends HTMLElement {
  static get observedAttributes() {
    return ["selector"];
  }
  onMove = (e) => this.track(e);
  onLeave = () => this.clear();
  bound = false;
  connectedCallback() {
    this.bind();
  }
  disconnectedCallback() {
    this.unbind();
  }
  attributeChangedCallback() {
    this.clear();
  }
  get sel() {
    return this.getAttribute("selector") ?? ".glass-panel";
  }
  get reducedMotion() {
    return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  bind() {
    if (this.bound) return;
    this.addEventListener("pointermove", this.onMove);
    this.addEventListener("pointerleave", this.onLeave, true);
    this.bound = true;
  }
  unbind() {
    if (!this.bound) return;
    this.removeEventListener("pointermove", this.onMove);
    this.removeEventListener("pointerleave", this.onLeave, true);
    this.bound = false;
  }
  /** Resolve the panel under the pointer and write the sheen custom props on it. */
  track(e) {
    const target = e.target?.closest?.(this.sel);
    if (!target || !this.contains(target)) {
      this.clear();
      this.lit = null;
      return;
    }
    if (this.lit && this.lit !== target) this.dim(this.lit);
    this.lit = target;
    const r = target.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const mx = (e.clientX - r.left) / r.width * 100;
    const my = (e.clientY - r.top) / r.height * 100;
    target.style.setProperty("--talos-mx", `${mx.toFixed(2)}%`);
    target.style.setProperty("--talos-my", `${my.toFixed(2)}%`);
    target.style.setProperty("--talos-sheen", this.reducedMotion ? "0" : "1");
  }
  lit = null;
  dim(el) {
    el.style.setProperty("--talos-sheen", "0");
  }
  clear() {
    if (this.lit) {
      this.dim(this.lit);
      this.lit = null;
    }
  }
};

// src/wc/talos-readout.ts
var TalosReadout = class _TalosReadout extends HTMLElement {
  static get observedAttributes() {
    return ["value", "warn", "crit", "invert", "unit", "label", "duration"];
  }
  root;
  out;
  caption;
  frame = 0;
  scrambleStart = 0;
  toText = "";
  lastValue = null;
  // Glyph pool: box-drawing + symbols read as "machine decoding", on-brand for a
  // console. No letters/digits that could be misread as a real partial value.
  static GLYPHS = "!<>-_\\/[]{}=+*^?#\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255D\u255C\u255B\u2510\u2514\u2534\u252C\u251C\u2500\u253C\u255E\u255F\u255A\u2554\u2569\u2566\u2560\u2550\u256C\u2567\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256B\u256A\u2518\u250C";
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
          --_c: var(--talos-foreground, #e7e9ec);

          display: inline-flex;
          flex-direction: column;
          gap: 0.25rem;
          font-family: var(--talos-font-display, system-ui);
        }
        .caption {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: var(--talos-tracking-hud, 0.18em);
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
        }
        .caption:empty { display: none; }
        .out {
          font-variant-numeric: tabular-nums;
          font-weight: 300;
          letter-spacing: 0.04em;
          line-height: 1;
          color: var(--_c);
          /* tabular-nums + this keep width stable so the scramble doesn't reflow */
          white-space: pre;
        }
        .unit {
          font-size: 0.5em;
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
          margin-left: 0.15em;
        }
      </style>
      <div class="caption" part="caption"></div>
      <div class="out" part="readout"></div>
    `;
    this.out = this.root.querySelector(".out");
    this.caption = this.root.querySelector(".caption");
  }
  observer;
  connectedCallback() {
    this.lastValue = this.getAttribute("value") ?? "";
    this.toText = this.lastValue;
    this.paint(this.toText);
    this.renderCaption();
    this.renderBand();
    this.observer = new MutationObserver(() => this.onAttrs());
    this.observer.observe(this, {
      attributeFilter: ["value", "warn", "crit", "invert", "unit", "label", "duration"]
    });
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }
  get reducedMotion() {
    return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  onAttrs() {
    this.renderCaption();
    this.renderBand();
    const next = this.getAttribute("value") ?? "";
    if (next === this.lastValue) return;
    this.toText = next;
    this.lastValue = next;
    if (this.reducedMotion) {
      this.paint(this.toText);
      return;
    }
    this.startScramble();
  }
  /** Band tint, only meaningful for numeric values — uses the shared bandOf()
   *  helper (bands.ts), so threshold + invert semantics match gauge/meter. A
   *  non-numeric value has no band: it stays neutral foreground. */
  renderBand() {
    const n = parseFloat(this.getAttribute("value") ?? "");
    const band = Number.isFinite(n) ? bandOf(this, n) : "nominal";
    const v = band === "critical" ? "var(--_critical)" : band === "warning" ? "var(--_warning)" : "var(--talos-foreground, #e7e9ec)";
    this.style.setProperty("--_c", v);
  }
  renderCaption() {
    this.caption.textContent = this.getAttribute("label") ?? "";
    this.setAttribute("role", "status");
    this.setAttribute("aria-label", `${this.getAttribute("label") ?? ""} ${this.toText}`.trim());
  }
  startScramble() {
    cancelAnimationFrame(this.frame);
    const dur = Math.max(0, this.num("duration", 420));
    this.scrambleStart = 0;
    const loop = (ts) => {
      if (this.scrambleStart === 0) this.scrambleStart = ts;
      const p = dur === 0 ? 1 : Math.min((ts - this.scrambleStart) / dur, 1);
      this.paint(this.frameText(p));
      if (p < 1) {
        this.frame = requestAnimationFrame(loop);
      } else {
        this.paint(this.toText);
      }
    };
    this.frame = requestAnimationFrame(loop);
  }
  /** Progressive left-to-right resolve: characters before the progress index are
   *  the real value; the rest are random glyphs. Same shape as the reference. */
  frameText(p) {
    const to = this.toText;
    const resolved = Math.floor(p * to.length);
    let s = "";
    for (let i = 0; i < to.length; i++) {
      const ch = to[i];
      if (i < resolved || ch === " ") {
        s += ch;
      } else {
        const g = _TalosReadout.GLYPHS;
        s += g[(Math.floor(p * 9973) + i * 7) % g.length];
      }
    }
    return s;
  }
  paint(text) {
    const unit = this.getAttribute("unit") ?? "";
    this.out.innerHTML = `${this.escape(text)}${unit ? `<span class="unit">${this.escape(unit)}</span>` : ""}`;
  }
  escape(s) {
    return s.replace(/[&<>]/g, (c) => c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;");
  }
  num(attr, fallback) {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }
};

// src/wc/talos-spark.ts
var TalosSpark = class extends HTMLElement {
  static get observedAttributes() {
    return ["points", "min", "max", "warn", "crit", "invert", "fill"];
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
    const attr = this.getAttribute("points");
    if (attr) this.buf = attr.split(/[\s,]+/).map(Number).filter(Number.isFinite);
    this.schedule();
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
  }
  attributeChangedCallback(name) {
    if (name === "points") {
      const attr = this.getAttribute("points");
      this.buf = attr ? attr.split(/[\s,]+/).map(Number).filter(Number.isFinite) : [];
    }
    this.schedule();
  }
  /** Append a sample and re-render (the streaming entry point). */
  push(value) {
    if (!Number.isFinite(value)) return;
    const cap = this.num("cap", 32);
    this.buf.push(value);
    while (this.buf.length > cap) this.buf.shift();
    this.schedule();
  }
  num(attr, fallback) {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }
  schedule() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.render());
  }
  render() {
    const n = this.buf.length;
    const min = this.num("min", 0);
    const max = this.num("max", 100);
    const span = max - min || 1;
    const W = 100, H = 16;
    if (n < 2) {
      this.line.setAttribute("points", "");
      this.area.setAttribute("points", "");
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
  }
};

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
  num(attr, fallback) {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }
  render() {
    const total = Math.max(0, Math.round(this.num("total", 8)));
    const value = this.num("value", 0);
    const on = Math.max(0, Math.min(total, Math.round(value)));
    if (this.wrap.childElementCount !== total) {
      this.wrap.innerHTML = Array.from({ length: total }, () => "<i></i>").join("");
    }
    Array.from(this.wrap.children).forEach((c, i) => c.classList.toggle("on", i < on));
    const band = bandOf(this, value);
    if (band === "nominal") this.removeAttribute("data-band");
    else this.setAttribute("data-band", band);
  }
};

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
    if (this.hasAttribute("value")) this.render(this.num("value", 0));
  }
  attributeChangedCallback(name, _old, val) {
    if (name === "value" && val !== null) this.render(parseFloat(val));
  }
  /** Imperative equivalent of setting `value`. */
  update(value) {
    this.render(value);
  }
  num(attr, fallback) {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }
  render(value) {
    if (!Number.isFinite(value)) return;
    const prec = Math.max(0, Math.round(this.num("precision", 0)));
    const eps = this.num("eps", 0);
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

// src/wc/talos-stat.ts
var TalosStat = class extends HTMLElement {
  static get observedAttributes() {
    return ["value", "label", "unit", "precision", "warn", "crit", "invert"];
  }
  root;
  numEl;
  labelEl;
  unitEl;
  shown = 0;
  frame = 0;
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          --_nominal: var(--talos-foreground, hsl(0 0% 100%));
          --_warning: var(--talos-warning, hsl(38 92% 60%));
          --_critical: var(--talos-danger, hsl(0 80% 62%));
          --_num: var(--_nominal);
        }
        .label {
          font-family: var(--talos-font-display, system-ui);
          font-size: 0.5rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--talos-text-tertiary, hsl(0 0% 45%));
        }
        .row { display: flex; align-items: baseline; gap: 0.3rem; }
        .num {
          font-family: var(--talos-font-display, system-ui);
          font-weight: 300;
          font-size: var(--talos-stat-size, 1.8rem);
          line-height: 1;
          font-variant-numeric: tabular-nums;
          color: var(--_num);
        }
        .unit {
          font-size: 0.55rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--talos-text-tertiary, hsl(0 0% 45%));
        }
        :host([data-band="warning"]) { --_num: var(--_warning); }
        :host([data-band="critical"]) { --_num: var(--_critical); }
        .support { display: flex; align-items: center; gap: 0.4rem; }
        .support:empty { display: none; }
      </style>
      <span class="label" part="label"></span>
      <span class="row">
        <span class="num" part="num">0</span><span class="unit" part="unit"></span>
      </span>
      <span class="support" part="support"><slot></slot></span>`;
    this.numEl = this.root.querySelector(".num");
    this.labelEl = this.root.querySelector(".label");
    this.unitEl = this.root.querySelector(".unit");
  }
  connectedCallback() {
    this.shown = this.num("value", 0);
    this.render(true);
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
  }
  attributeChangedCallback(name) {
    if (name === "label" || name === "unit") this.paintStatic();
    else this.render(false);
  }
  /** Imperative setter. */
  set(value) {
    this.setAttribute("value", String(value));
  }
  num(attr, fallback) {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }
  paintStatic() {
    this.labelEl.textContent = this.getAttribute("label") ?? "";
    this.unitEl.textContent = this.getAttribute("unit") ?? "";
  }
  setBand(value) {
    const band = bandOf(this, value);
    if (band === "nominal") this.removeAttribute("data-band");
    else this.setAttribute("data-band", band);
  }
  render(immediate) {
    this.paintStatic();
    const target = this.num("value", 0);
    const prec = Math.max(0, Math.round(this.num("precision", 0)));
    this.setBand(target);
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (immediate || reduce) {
      this.shown = target;
      this.numEl.textContent = target.toFixed(prec);
      return;
    }
    cancelAnimationFrame(this.frame);
    const from = this.shown;
    const duration = this.num("duration", 500);
    const start = performance.now();
    const step = (t) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      this.shown = from + (target - from) * eased;
      this.numEl.textContent = this.shown.toFixed(prec);
      if (p < 1) this.frame = requestAnimationFrame(step);
      else this.shown = target;
    };
    this.frame = requestAnimationFrame(step);
  }
};

// src/wc/talos-led.ts
var TalosLed = class extends HTMLElement {
  static get observedAttributes() {
    return ["state", "value", "warn", "crit", "invert", "live", "label", "size"];
  }
  root;
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
      <style>
        :host {
          /* band tokens, identical fallbacks to the other instruments */
          --_ok: var(--talos-success, hsl(140 90% 60%));
          --_warn: var(--talos-warning, hsl(38 92% 60%));
          --_crit: var(--talos-danger, hsl(0 80% 62%));
          --_idle: var(--talos-muted-foreground, hsl(0 0% 60%));
          --_c: var(--_ok);
          --_d: 10px;

          display: inline-block;
          line-height: 0;
          vertical-align: middle;
        }
        .dot {
          width: var(--_d);
          height: var(--_d);
          border-radius: 50%;
          background: var(--_c);
          /* glow encodes presence, not decoration: it's the state colour, sized
             to the dot, so a brighter halo never means anything the fill doesn't. */
          box-shadow: 0 0 calc(var(--_d) * 0.6) hsl(var(--_c-hsl, 0 0% 100%) / 0);
          transition: background var(--talos-dur-fast, 180ms) var(--talos-ease-out, ease);
        }
        :host([state="idle"]:not([value])) .dot { background: var(--_idle); }
        /* live = actively reporting: a slow steady pulse. */
        :host([live]) .dot { animation: talos-led-pulse 2.4s ease-in-out infinite; }
        @keyframes talos-led-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 transparent; }
          50%      { opacity: 0.55; box-shadow: 0 0 calc(var(--_d) * 0.8) var(--_c); }
        }
        @media (prefers-reduced-motion: reduce) {
          /* honest fallback: hold the lit state, drop the pulse. */
          :host([live]) .dot { animation: none; opacity: 1; }
        }
      </style>
      <span class="dot" part="dot"></span>`;
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const size = parseFloat(this.getAttribute("size") ?? "");
    this.style.setProperty("--_d", Number.isFinite(size) ? `${size}px` : "10px");
    let varName = "--_ok";
    let label;
    const valueAttr = this.getAttribute("value");
    if (valueAttr !== null && Number.isFinite(parseFloat(valueAttr))) {
      const band = bandOf(this, parseFloat(valueAttr));
      varName = band === "critical" ? "--_crit" : band === "warning" ? "--_warn" : "--_ok";
      label = band;
    } else {
      const state = (this.getAttribute("state") ?? "ok").toLowerCase();
      varName = state === "crit" ? "--_crit" : state === "warn" ? "--_warn" : state === "idle" ? "--_idle" : "--_ok";
      label = state;
    }
    this.style.setProperty("--_c", `var(${varName})`);
    this.setAttribute("role", "status");
    const lbl = this.getAttribute("label");
    const live = this.hasAttribute("live") ? ", live" : "";
    this.setAttribute("aria-label", `${lbl ? lbl + ": " : ""}${label}${live}`);
  }
};

// src/wc/talos-toggle.ts
var TalosToggle = class extends HTMLElement {
  static get observedAttributes() {
    return ["options", "value", "label"];
  }
  root;
  group;
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
      <style>
        :host {
          --_edge: var(--talos-edge-default, hsl(0 0% 100% / 0.18));
          --_fg: var(--talos-foreground, hsl(0 0% 100%));
          --_muted: var(--talos-muted-foreground, hsl(0 0% 60%));
          --_on-bg: var(--talos-foreground, hsl(0 0% 100%));
          --_on-fg: var(--talos-background, hsl(0 0% 0%));
          display: inline-block;
        }
        .group {
          display: inline-flex;
          border: 1px solid var(--_edge);
          /* dense content control \u2192 the documented radius-sm geometry, not chamfer */
          border-radius: var(--talos-radius-sm, 2px);
          overflow: hidden;
        }
        button {
          appearance: none;
          border: 0;
          background: transparent;
          color: var(--_muted);
          font-family: var(--talos-font-display, system-ui);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: var(--talos-tracking-hud-tight, 0.08em);
          padding: 0.4rem 0.85rem;
          cursor: pointer;
          transition: color var(--talos-dur-fast, 180ms) var(--talos-ease-out, ease),
                      background var(--talos-dur-fast, 180ms) var(--talos-ease-out, ease);
        }
        button + button { border-left: 1px solid var(--_edge); }
        button:hover { color: var(--_fg); }
        button[aria-pressed="true"] {
          background: var(--_on-bg);
          color: var(--_on-fg);
        }
        button:focus-visible {
          outline: var(--talos-focus-ring-width, 1px) solid var(--talos-focus-ring, hsl(0 0% 100% / 0.9));
          outline-offset: -2px;
        }
      </style>
      <div class="group" part="group" role="group"></div>`;
    this.group = this.root.querySelector(".group");
    this.group.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (btn?.dataset.value != null) this.select(btn.dataset.value);
    });
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  get value() {
    return this.getAttribute("value") ?? this.parseOptions()[0]?.value ?? "";
  }
  set value(v) {
    this.setAttribute("value", v);
  }
  parseOptions() {
    const raw = this.getAttribute("options") ?? "";
    return raw.split(",").map((s) => s.trim()).filter(Boolean).map((tok) => {
      const i = tok.indexOf(":");
      return i === -1 ? { value: tok, label: tok } : { value: tok.slice(0, i), label: tok.slice(i + 1) };
    });
  }
  /** User selection: update value + announce. No-op if unchanged. */
  select(value) {
    if (value === this.value) return;
    this.value = value;
    this.dispatchEvent(
      new CustomEvent("talos:change", { detail: { value }, bubbles: true })
    );
  }
  render() {
    const options = this.parseOptions();
    const current = this.value;
    this.group.innerHTML = options.map(
      (o) => `<button type="button" part="segment" data-value="${o.value}" aria-pressed="${o.value === current ? "true" : "false"}">${o.label}</button>`
    ).join("");
    const lbl = this.getAttribute("label");
    if (lbl) this.group.setAttribute("aria-label", lbl);
  }
};

// src/wc/index.ts
function define(name, ctor) {
  if (!customElements.get(name)) customElements.define(name, ctor);
}
if (typeof customElements !== "undefined") {
  define("talos-corner", TalosCorner);
  define("talos-notch", TalosNotch);
  define("talos-panel", TalosPanel);
  define("talos-gauge", TalosGauge);
  define("talos-trend", TalosTrend);
  define("talos-meter", TalosMeter);
  define("talos-flow", TalosFlow);
  define("talos-orbital", TalosOrbital);
  define("talos-sheen", TalosSheen);
  define("talos-readout", TalosReadout);
  define("talos-spark", TalosSpark);
  define("talos-dots", TalosDots);
  define("talos-delta", TalosDelta);
  define("talos-stat", TalosStat);
  define("talos-led", TalosLed);
  define("talos-toggle", TalosToggle);
}
export {
  PanelShapeBuilder,
  TalosCorner,
  TalosDelta,
  TalosDots,
  TalosFlow,
  TalosGauge,
  TalosLed,
  TalosMeter,
  TalosNotch,
  TalosOrbital,
  TalosPanel,
  TalosReadout,
  TalosSheen,
  TalosSpark,
  TalosStat,
  TalosToggle,
  TalosTrend
};
