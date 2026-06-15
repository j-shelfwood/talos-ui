import {
  setImageA11y
} from "./chunk-4WWY5MOA.js";
import {
  num
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-groundtrack.ts
var TalosGroundtrack = class extends HTMLElement {
  static get observedAttributes() {
    return ["inclination", "tracks", "label"];
  }
  root;
  canvas;
  ctx;
  _sats = [];
  _gateways = [];
  ro;
  raf = 0;
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
          --_track: var(--talos-edge-default, hsl(0 0% 100% / 0.14));
          --_gateway: var(--talos-muted-foreground, hsl(0 0% 60%));
          --_fg: var(--talos-foreground, #e7e9ec);
          display: block;
          width: 100%;
          line-height: 0;
        }
        canvas { display: block; width: 100%; height: 100%; }
      </style>
      <canvas part="canvas"></canvas>`;
    this.canvas = this.root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
  }
  set sats(v) {
    this._sats = v;
    this.schedule();
  }
  get sats() {
    return this._sats;
  }
  set gateways(v) {
    this._gateways = v;
    this.schedule();
  }
  get gateways() {
    return this._gateways;
  }
  connectedCallback() {
    this.ro = new ResizeObserver(() => this.draw());
    this.ro.observe(this);
    this.draw();
  }
  disconnectedCallback() {
    this.ro?.disconnect();
    cancelAnimationFrame(this.raf);
  }
  attributeChangedCallback() {
    this.schedule();
  }
  schedule() {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.draw());
  }
  colour(varName) {
    return getComputedStyle(this).getPropertyValue(varName).trim() || "#888";
  }
  /** Map lon/lat → canvas px (equirectangular). */
  project(lon, lat, w, h) {
    const x = (lon + 180) / 360 * w;
    const y = (90 - lat) / 180 * h;
    return [x, y];
  }
  draw() {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    const w = this.clientWidth || 1;
    const h = w / 2;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.height = `${h}px`;
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const grid = this.colour("--_grid");
    const track = this.colour("--_track");
    const gw = this.colour("--_gateway");
    const fg = this.colour("--_fg");
    const cols = [this.colour("--_nominal"), this.colour("--_warning"), this.colour("--_critical")];
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = this.project(lon, 0, w, h);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = this.project(0, lat, w, h);
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.strokeStyle = track;
    ctx.beginPath();
    const [, eqY] = this.project(0, 0, w, h);
    ctx.moveTo(0, eqY);
    ctx.lineTo(w, eqY);
    ctx.stroke();
    const incl = num(this, "inclination", 53);
    const nTracks = Math.max(0, Math.round(num(this, "tracks", 6)));
    ctx.strokeStyle = track;
    ctx.lineWidth = 1;
    for (let t = 0; t < nTracks; t++) {
      const phase = t / nTracks * Math.PI * 2;
      ctx.beginPath();
      for (let px = 0; px <= w; px += 2) {
        const lon = px / w * 360 - 180;
        const lat = incl * Math.sin(lon * Math.PI / 180 + phase);
        const [, y] = this.project(lon, lat, w, h);
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
    }
    for (const g of this._gateways) {
      const [x, y] = this.project(g.lon, g.lat, w, h);
      ctx.fillStyle = g.active ? fg : gw;
      ctx.globalAlpha = g.active ? 1 : 0.5;
      ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
      if (g.active) {
        ctx.strokeStyle = fg;
        ctx.globalAlpha = 0.4;
        ctx.strokeRect(x - 4.5, y - 4.5, 9, 9);
      }
    }
    ctx.globalAlpha = 1;
    for (const s of this._sats) {
      const [x, y] = this.project(s.lon, s.lat, w, h);
      ctx.fillStyle = cols[Math.max(0, Math.min(2, s.band | 0))];
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    const lbl = this.getAttribute("label");
    const active = this._gateways.filter((g) => g.active).length;
    setImageA11y(this, {
      label: lbl,
      summary: `${this._sats.length} satellites, ${active} of ${this._gateways.length} gateways in view`
    });
  }
};

export {
  TalosGroundtrack
};
