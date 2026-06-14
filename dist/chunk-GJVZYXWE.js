import {
  num
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-plane.ts
var TalosPlane = class _TalosPlane extends HTMLElement {
  static get observedAttributes() {
    return ["slots", "eclipse-from", "eclipse-to", "plane-label"];
  }
  root;
  svg;
  _sats = [];
  /** Keyboard-focused slot (roving via arrow keys); -1 = none yet. */
  _focus = -1;
  // viewBox geometry — a wide, short lane.
  static W = 100;
  static MX = 5;
  // x margin
  static AMP = 7;
  // track wave amplitude
  static MIDY = 16;
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
          --_track: var(--talos-edge-default, hsl(0 0% 100% / 0.18));
          --_link: var(--talos-edge-default, hsl(0 0% 100% / 0.28));
          --_shadow: hsl(0 0% 0% / 0.5);
          --_shadowEdge: var(--talos-edge-subtle, hsl(0 0% 100% / 0.1));
          --_fg: var(--talos-foreground, #e7e9ec);
          --_muted: var(--talos-muted-foreground, hsl(0 0% 60%));
          display: block; width: 100%;
          font-family: var(--talos-font-display, system-ui);
        }
        svg { display: block; width: 100%; height: 100%; overflow: visible; }
        .track { fill: none; stroke: var(--_track); stroke-width: 0.6; vector-effect: non-scaling-stroke; }
        .link { stroke: var(--_link); stroke-width: 1; fill: none; vector-effect: non-scaling-stroke; }
        .stub { stroke: var(--_link); stroke-width: 0.8; vector-effect: non-scaling-stroke; opacity: 0.6; }
        .shadow { fill: var(--_shadow); }
        .shadow-edge { stroke: var(--_shadowEdge); stroke-width: 0.6; stroke-dasharray: 1 1.5; }
        .sat { cursor: pointer; stroke: rgba(0,0,0,0.5); stroke-width: 0.4; }
        .sat--sel { stroke: var(--_fg); stroke-width: 0.8; }
        .sel-ring { fill: none; stroke: var(--_fg); stroke-width: 0.6; vector-effect: non-scaling-stroke; }
        .lbl { font-size: 3px; text-transform: uppercase; letter-spacing: 0.3px; fill: var(--_muted); }
        .dir { fill: var(--_muted); }
      </style>
      <svg part="svg" viewBox="0 0 100 34" preserveAspectRatio="xMidYMid meet"></svg>`;
    this.svg = this.root.querySelector("svg");
  }
  set sats(v) {
    this._sats = v;
    this.render();
  }
  get sats() {
    return this._sats;
  }
  connectedCallback() {
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "0");
    this.addEventListener("keydown", this.onKeydown);
    this.render();
  }
  disconnectedCallback() {
    this.removeEventListener("keydown", this.onKeydown);
  }
  attributeChangedCallback() {
    this.render();
  }
  /**
   * Keyboard nav: Arrow Left/Right move a roving focus slot 0..n-1 (drawn with
   * the same selection ring); Enter/Space emit talos:sat for the focused slot.
   */
  onKeydown = (e) => {
    const n = Math.max(3, Math.round(num(this, "slots", 22)));
    let f = this._focus;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        f = f < 0 ? 0 : Math.min(n - 1, f + 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        f = f < 0 ? 0 : Math.max(0, f - 1);
        break;
      case "Enter":
      case " ": {
        if (f < 0) return;
        e.preventDefault();
        this.dispatchEvent(new CustomEvent("talos:sat", { detail: { slot: f }, bubbles: true, composed: true }));
        return;
      }
      default:
        return;
    }
    e.preventDefault();
    this._focus = f;
    this.render();
  };
  /** Track point at fraction t ∈ [0,1] along the lane. */
  trackPt(t) {
    const { W, MX, AMP, MIDY } = _TalosPlane;
    const x = MX + t * (W - 2 * MX);
    const y = MIDY + Math.sin(t * Math.PI * 2) * AMP;
    return [x, y];
  }
  render() {
    const n = Math.max(3, Math.round(num(this, "slots", 22)));
    const NS = "http://www.w3.org/2000/svg";
    const cols = ["var(--_nominal)", "var(--_warning)", "var(--_critical)"];
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
    const ef = this.getAttribute("eclipse-from");
    const et = this.getAttribute("eclipse-to");
    if (ef !== null && et !== null) {
      const f = parseFloat(ef), t = parseFloat(et);
      const spans = f <= t ? [[f, t]] : [[f, 1], [0, t]];
      for (const [a, b] of spans) {
        const top = [], bot = [];
        const steps = 24;
        for (let k = 0; k <= steps; k++) {
          const tt = a + (b - a) * (k / steps);
          const [x, y] = this.trackPt(tt);
          top.push(`${x.toFixed(2)},${(y - 6).toFixed(2)}`);
          bot.push(`${x.toFixed(2)},${(y + 6).toFixed(2)}`);
        }
        const poly = document.createElementNS(NS, "polygon");
        poly.setAttribute("class", "shadow");
        poly.setAttribute("points", top.concat(bot.reverse()).join(" "));
        this.svg.appendChild(poly);
      }
    }
    const path = [];
    const tSteps = 60;
    for (let k = 0; k <= tSteps; k++) {
      const [x, y] = this.trackPt(k / tSteps);
      path.push(`${k === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    const track = document.createElementNS(NS, "path");
    track.setAttribute("class", "track");
    track.setAttribute("d", path.join(" "));
    this.svg.appendChild(track);
    const slotT = (s) => s / (n - 1);
    for (let s = 0; s < n - 1; s++) {
      const [x0, y0] = this.trackPt(slotT(s));
      const [x1, y1] = this.trackPt(slotT(s + 1));
      const link = document.createElementNS(NS, "line");
      link.setAttribute("class", "link");
      link.setAttribute("x1", x0.toFixed(2));
      link.setAttribute("y1", y0.toFixed(2));
      link.setAttribute("x2", x1.toFixed(2));
      link.setAttribute("y2", y1.toFixed(2));
      this.svg.appendChild(link);
    }
    for (let s = 0; s < n; s++) {
      const [x, y] = this.trackPt(slotT(s));
      for (const dy of [-4, 4]) {
        const stub = document.createElementNS(NS, "line");
        stub.setAttribute("class", "stub");
        stub.setAttribute("x1", x.toFixed(2));
        stub.setAttribute("y1", y.toFixed(2));
        stub.setAttribute("x2", x.toFixed(2));
        stub.setAttribute("y2", (y + dy).toFixed(2));
        this.svg.appendChild(stub);
      }
    }
    for (let s = 0; s < n; s++) {
      const sat = this._sats[s] ?? { band: 0 };
      const [x, y] = this.trackPt(slotT(s));
      const selected = sat.selected || s === this._focus;
      if (selected) {
        const sel = document.createElementNS(NS, "circle");
        sel.setAttribute("class", "sel-ring");
        sel.setAttribute("cx", x.toFixed(2));
        sel.setAttribute("cy", y.toFixed(2));
        sel.setAttribute("r", "2.6");
        this.svg.appendChild(sel);
      }
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("class", "sat" + (selected ? " sat--sel" : ""));
      dot.setAttribute("cx", x.toFixed(2));
      dot.setAttribute("cy", y.toFixed(2));
      dot.setAttribute("r", selected ? "1.7" : "1.3");
      dot.setAttribute("fill", cols[Math.max(0, Math.min(2, sat.band | 0))]);
      dot.setAttribute("opacity", sat.eclipse ? "0.55" : "1");
      dot.addEventListener("click", () => this.dispatchEvent(new CustomEvent("talos:sat", { detail: { slot: s }, bubbles: true, composed: true })));
      this.svg.appendChild(dot);
    }
    const [lx, ly] = this.trackPt(slotT(n - 1));
    const arrow = document.createElementNS(NS, "polygon");
    arrow.setAttribute("class", "dir");
    arrow.setAttribute("points", `${(lx + 2.5).toFixed(2)},${ly.toFixed(2)} ${(lx + 0.5).toFixed(2)},${(ly - 1.3).toFixed(2)} ${(lx + 0.5).toFixed(2)},${(ly + 1.3).toFixed(2)}`);
    this.svg.appendChild(arrow);
    const label = this.getAttribute("plane-label");
    if (label) {
      const t = document.createElementNS(NS, "text");
      t.setAttribute("class", "lbl");
      t.setAttribute("x", "5");
      t.setAttribute("y", "4");
      t.textContent = `${label} \xB7 ${n} SATS \xB7 ORBIT TRACK`;
      this.svg.appendChild(t);
    }
    this.setAttribute("role", "img");
    this.setAttribute("aria-label", `Orbital plane ${label ?? ""}: ${n} satellites in flight order with inter-satellite links`);
  }
};

export {
  TalosPlane
};
