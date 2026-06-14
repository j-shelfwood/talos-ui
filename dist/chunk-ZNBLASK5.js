import {
  num
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-matrix.ts
var TalosMatrix = class extends HTMLElement {
  static get observedAttributes() {
    return ["cols", "rows", "warn", "crit", "invert", "terminator", "terminator-width", "gap", "label"];
  }
  root;
  canvas;
  ctx;
  _cells = [];
  _highlight = null;
  /** Keyboard-focused cell index (roving via arrow keys); -1 = none yet. */
  _focus = -1;
  _layout = { cols: 72, rows: 22, cell: 1, gap: 1 };
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
          --_empty: var(--talos-edge-subtle, hsl(0 0% 100% / 0.08));
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
  /** Imperative data API — set the cell values (row-major, length cols×rows). */
  set cells(v) {
    this._cells = v;
    this.schedule();
  }
  get cells() {
    return this._cells;
  }
  /**
   * Highlight a plane (a whole column, `{col}`) or a single cell (`{index}`),
   * drawn as an outline over the grid — the selection an operator drilled into.
   * Set null to clear. Selection is state (PHILOSOPHY.md), so the outline is
   * bound to a real choice, not decoration.
   */
  set highlight(v) {
    this._highlight = v;
    this.schedule();
  }
  get highlight() {
    return this._highlight;
  }
  connectedCallback() {
    this.ro = new ResizeObserver(() => this.draw());
    this.ro.observe(this);
    this.canvas.addEventListener("click", this.onClick);
    this.canvas.style.cursor = "pointer";
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "0");
    this.addEventListener("keydown", this.onKeydown);
    this.draw();
  }
  /** Arrow keys move a roving focus cell; Enter/Space emit talos:cell for it. */
  onKeydown = (e) => {
    const { cols, rows } = this._layout;
    const n = cols * rows;
    if (n <= 0) return;
    let f = this._focus;
    switch (e.key) {
      case "ArrowRight":
        f = f < 0 ? 0 : Math.min(n - 1, f + 1);
        break;
      case "ArrowLeft":
        f = f < 0 ? 0 : Math.max(0, f - 1);
        break;
      case "ArrowDown":
        f = f < 0 ? 0 : Math.min(n - 1, f + cols);
        break;
      case "ArrowUp":
        f = f < 0 ? 0 : Math.max(0, f - cols);
        break;
      case "Enter":
      case " ": {
        if (f < 0) return;
        e.preventDefault();
        const col = f % cols;
        const row = f / cols | 0;
        this.dispatchEvent(
          new CustomEvent("talos:cell", { detail: { col, row, index: f }, bubbles: true, composed: true })
        );
        return;
      }
      default:
        return;
    }
    e.preventDefault();
    this._focus = f;
    this._highlight = { index: f };
    this.schedule();
  };
  /** Invert a click's px → (col,row,index) and emit talos:cell. */
  onClick = (e) => {
    const rect = this.canvas.getBoundingClientRect();
    const { cols, rows, cell, gap } = this._layout;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / (cell + gap));
    const row = Math.floor(y / (cell + gap));
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    const index = row * cols + col;
    this.dispatchEvent(
      new CustomEvent("talos:cell", { detail: { col, row, index }, bubbles: true, composed: true })
    );
  };
  disconnectedCallback() {
    this.ro?.disconnect();
    this.canvas.removeEventListener("click", this.onClick);
    this.removeEventListener("keydown", this.onKeydown);
    cancelAnimationFrame(this.raf);
  }
  attributeChangedCallback() {
    this.schedule();
  }
  schedule() {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.draw());
  }
  /** Resolve a CSS colour var to an rgb string the canvas can use. */
  colour(varName) {
    const v = getComputedStyle(this).getPropertyValue(varName).trim();
    return v || "#888";
  }
  draw() {
    const cols = Math.max(1, Math.round(num(this, "cols", 72)));
    const rows = Math.max(1, Math.round(num(this, "rows", 22)));
    const gap = num(this, "gap", 1);
    const warn = this.getAttribute("warn");
    const crit = this.getAttribute("crit");
    const invert = this.hasAttribute("invert");
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    const cssW = this.clientWidth || 1;
    const cell = (cssW - (cols - 1) * gap) / cols;
    const cssH = rows * cell + (rows - 1) * gap;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.height = `${cssH}px`;
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    const ok = this.colour("--_nominal");
    const cWarn = this.colour("--_warning");
    const cCrit = this.colour("--_critical");
    const empty = this.colour("--_empty");
    const band = (v) => {
      const trips = (t) => t !== null && (invert ? v <= parseFloat(t) : v >= parseFloat(t));
      if (trips(crit)) return cCrit;
      if (trips(warn)) return cWarn;
      return ok;
    };
    const hasTerm = this.hasAttribute("terminator");
    const termC = num(this, "terminator", 0);
    const termW = num(this, "terminator-width", 0.35);
    const inShadow = (colFrac) => {
      if (!hasTerm) return false;
      let d = Math.abs(colFrac - termC);
      d = Math.min(d, 1 - d);
      return d <= termW / 2;
    };
    const r = Math.min(cell, 2.5) * 0.35;
    const cells = this._cells;
    const n = cols * rows;
    for (let i = 0; i < n; i++) {
      const col = i % cols;
      const rowIdx = i / cols | 0;
      const x = col * (cell + gap);
      const y = rowIdx * (cell + gap);
      const v = i < cells.length ? cells[i] : NaN;
      let fill = Number.isFinite(v) ? band(v) : empty;
      const colFrac = (col + 0.5) / cols;
      if (inShadow(colFrac)) {
        ctx.globalAlpha = 0.32;
      } else {
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = fill;
      this.roundRect(ctx, x, y, cell, cell, r);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this._layout = { cols, rows, cell, gap };
    const hl = this._highlight;
    if (hl) {
      ctx.strokeStyle = this.colour("--_fg") || "#fff";
      ctx.lineWidth = 1.5;
      if (typeof hl.col === "number" && hl.col >= 0 && hl.col < cols) {
        const x = hl.col * (cell + gap);
        ctx.strokeRect(x - 0.5, -0.5, cell + 1, rows * cell + (rows - 1) * gap + 1);
      }
      if (typeof hl.index === "number" && hl.index >= 0 && hl.index < cols * rows) {
        const c = hl.index % cols;
        const rw = hl.index / cols | 0;
        ctx.strokeRect(c * (cell + gap) - 1, rw * (cell + gap) - 1, cell + 2, cell + 2);
      }
    }
    this.setAttribute("role", "img");
    this.setAttribute("aria-label", this.summary(cols, rows, warn, crit, invert));
  }
  summary(cols, rows, warn, crit, invert) {
    const cells = this._cells;
    let nWarn = 0, nCrit = 0;
    const trips = (t, v) => t !== null && (invert ? v <= parseFloat(t) : v >= parseFloat(t));
    for (let i = 0; i < cells.length; i++) {
      const v = cells[i];
      if (trips(crit, v)) nCrit++;
      else if (trips(warn, v)) nWarn++;
    }
    const lbl = this.getAttribute("label");
    return `${lbl ? lbl + ": " : ""}${cols}\xD7${rows} grid, ${nCrit} critical, ${nWarn} warning`;
  }
  roundRect(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
};

export {
  TalosMatrix
};
