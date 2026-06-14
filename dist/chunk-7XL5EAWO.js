import {
  bandOf,
  num,
  prefersReducedMotion
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-percentile.ts
var PCTS = ["p05", "p25", "p50", "p75", "p90", "p99"];
var TalosPercentile = class extends HTMLElement {
  static get observedAttributes() {
    return [...PCTS, "min", "max", "warn", "crit", "invert", "label", "unit", "width"];
  }
  root;
  gBox;
  gWhisker;
  gMarks;
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
          --_box: var(--talos-foreground, hsl(0 0% 100% / 0.9));

          display: inline-flex;
          flex-direction: column;
          gap: 0.4rem;
          font-family: var(--talos-font-display, system-ui);
          color: var(--talos-foreground, #e7e9ec);
        }
        .caption {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: var(--talos-tracking-hud, 0.18em);
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
        }
        .caption:empty { display: none; }
        svg { display: block; width: 100%; overflow: visible; }

        /* The rail and box are body geometry; the markers are the signal. */
        .rail { stroke: var(--_track); stroke-width: 1; }
        .whisker { stroke: var(--talos-muted-foreground, hsl(0 0% 60%)); stroke-width: 1; }
        .box {
          fill: var(--_box); fill-opacity: 0.08;
          stroke: var(--_box); stroke-opacity: 0.4; stroke-width: 1;
        }
        /* Position transitions: markers SLIDE to a new percentile so the eye
           tracks the shift. The slide is decoration \u2014 under reduced motion the
           :host([reduced]) guard removes it; the static position still carries
           the value. */
        .mark { stroke-width: 1.5; }
        .mark.median { stroke: var(--_nominal); }
        .mark.p90 { stroke: var(--talos-muted-foreground, hsl(0 0% 70%)); }
        .lbl {
          font-size: 7px;
          font-variant-numeric: tabular-nums;
          fill: var(--talos-muted-foreground, hsl(0 0% 60%));
          text-anchor: middle;
        }
        .lbl.median { fill: var(--_nominal); }
        :host(:not([reduced])) .mark,
        :host(:not([reduced])) .lbl {
          transition: transform var(--talos-dur-mid, 320ms) var(--talos-ease-out, ease),
                      stroke 180ms ease, fill 180ms ease;
        }
      </style>
      <span class="caption" part="caption"></span>
      <svg part="svg" viewBox="0 0 100 26" preserveAspectRatio="none">
        <line class="rail" part="rail" x1="0" y1="13" x2="100" y2="13"></line>
        <g class="whiskers" part="whiskers"></g>
        <g class="boxes" part="box"></g>
        <g class="marks" part="marks"></g>
      </svg>
    `;
    this.gWhisker = this.root.querySelector(".whiskers");
    this.gBox = this.root.querySelector(".boxes");
    this.gMarks = this.root.querySelector(".marks");
  }
  /** Imperative override for the live case. Attributes still render when no
   *  override is set; calling `.stats = …` takes precedence. */
  _stats = null;
  set stats(s) {
    this._stats = s;
    this.render();
  }
  get stats() {
    return this._stats;
  }
  connectedCallback() {
    if (prefersReducedMotion()) this.setAttribute("reduced", "");
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  /** Resolve a percentile from the imperative override first, then attributes. */
  pct(key) {
    if (this._stats) {
      const v2 = this._stats[key];
      return typeof v2 === "number" && Number.isFinite(v2) ? v2 : null;
    }
    const raw = this.getAttribute(key);
    if (raw === null) return null;
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : null;
  }
  band(value) {
    return bandOf(this, value);
  }
  render() {
    const width = num(this, "width", 240);
    this.style.width = `${width}px`;
    const present = /* @__PURE__ */ new Map();
    for (const k of PCTS) {
      const v = this.pct(k);
      if (v !== null) present.set(k, v);
    }
    const vals = [...present.values()];
    const dataMin = vals.length ? Math.min(...vals) : 0;
    const dataMax = vals.length ? Math.max(...vals) : 100;
    const pad = (dataMax - dataMin) * 0.06 || 1;
    const min = num(this, "min", dataMin - pad);
    const max = num(this, "max", dataMax + pad);
    const span = max - min || 1;
    const X = (v) => (Math.max(min, Math.min(max, v)) - min) / span * 100;
    const unit = this.getAttribute("unit") ?? "";
    const fmt = (v) => `${Math.round(v)}${unit}`;
    this.gBox.innerHTML = "";
    const p25 = present.get("p25");
    const p75 = present.get("p75");
    if (p25 !== void 0 && p75 !== void 0) {
      const x0 = X(Math.min(p25, p75));
      const x1 = X(Math.max(p25, p75));
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("class", "box");
      rect.setAttribute("x", x0.toFixed(2));
      rect.setAttribute("y", "8");
      rect.setAttribute("width", Math.max(0, x1 - x0).toFixed(2));
      rect.setAttribute("height", "10");
      this.gBox.appendChild(rect);
    }
    this.gWhisker.innerHTML = "";
    const whisker = (a, b) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "whisker");
      line.setAttribute("x1", X(a).toFixed(2));
      line.setAttribute("y1", "13");
      line.setAttribute("x2", X(b).toFixed(2));
      line.setAttribute("y2", "13");
      this.gWhisker.appendChild(line);
    };
    const lowEnd = present.get("p05") ?? p25;
    const boxLeft = p25 ?? present.get("p50");
    if (lowEnd !== void 0 && boxLeft !== void 0) whisker(lowEnd, boxLeft);
    const boxRight = p75 ?? present.get("p50");
    const highEnd = present.get("p99") ?? present.get("p90");
    if (boxRight !== void 0 && highEnd !== void 0) whisker(boxRight, highEnd);
    const p99 = present.get("p99");
    const p99Band = p99 !== void 0 ? this.band(p99) : "nominal";
    const p99Var = p99Band === "critical" ? "--_critical" : p99Band === "warning" ? "--_warning" : "--_nominal";
    this.gMarks.innerHTML = "";
    const marks = [];
    if (present.has("p50"))
      marks.push({ key: "p50", cls: "median", text: `p50 ${fmt(present.get("p50"))}` });
    if (present.has("p90"))
      marks.push({ key: "p90", cls: "p90", text: `p90 ${fmt(present.get("p90"))}` });
    if (p99 !== void 0)
      marks.push({ key: "p99", cls: "p99", text: `p99 ${fmt(p99)}`, colour: `var(${p99Var})` });
    for (const m of marks) {
      const x = X(present.get(m.key));
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", `mark ${m.cls}`);
      line.setAttribute("x1", x.toFixed(2));
      line.setAttribute("y1", "5");
      line.setAttribute("x2", x.toFixed(2));
      line.setAttribute("y2", "21");
      if (m.colour) line.setAttribute("stroke", m.colour);
      this.gMarks.appendChild(line);
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", `lbl ${m.cls}`);
      const anchor = x < 12 ? "start" : x > 88 ? "end" : "middle";
      text.setAttribute("text-anchor", anchor);
      text.setAttribute("x", x.toFixed(2));
      text.setAttribute("y", "3");
      if (m.colour) text.setAttribute("fill", m.colour);
      text.textContent = m.text;
      this.gMarks.appendChild(text);
    }
    this.setAttribute("role", "img");
    const lbl = this.getAttribute("label");
    const parts = marks.map((m) => m.text.replace(/\s/, " "));
    this.setAttribute(
      "aria-label",
      `${lbl ? lbl + ": " : ""}${parts.length ? parts.join(", ") : "no percentiles"}`
    );
    const caption = this.root.querySelector(".caption");
    caption.textContent = lbl ?? "";
  }
};

export {
  TalosPercentile
};
