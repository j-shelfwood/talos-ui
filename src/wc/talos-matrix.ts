import { num } from "./bands";

/**
 * <talos-matrix> — a dense N×M cell grid where each cell's COLOUR is a banded
 * value. The honest form for "the health of many homogeneous units at a glance":
 * a satellite shell (planes × slots), a disk array, a rack of nodes, a sensor
 * wall. Each cell is one unit; its colour is that unit's band (nominal / warning
 * / critical), so the whole field reads as one picture — where the trouble is,
 * and how much of it (PHILOSOPHY.md, principle 4: density is a feature, the
 * colour does semantic work).
 *
 * Canvas-rendered: at shell scale (72 × 22 = 1,584 cells, repainting live) a DOM
 * node per cell would thrash layout, so the grid is one <canvas>. The picture is
 * still honest — colour = band, position = unit identity.
 *
 *   - CELLS      `.cells` (imperative) — an array / TypedArray of values, row-
 *                major (length = cols × rows). Each value is banded by warn/crit.
 *   - TERMINATOR `terminator` (0..1) marks a shadow band sweeping across the grid
 *                — e.g. the day/night line crossing an orbital shell. Cells inside
 *                the band are dimmed (still their colour, just darker: they are
 *                in eclipse, not unknown). `terminator-width` is the band's width
 *                as a fraction of the grid (default 0.35). Drop the attribute and
 *                there is no shadow. The sweep is MOTION = TELEMETRY: it shows the
 *                terminator advancing, not a decorative shimmer.
 *   - HONEST     under prefers-reduced-motion the cells still carry full colour;
 *                the consumer simply stops advancing `terminator` (the band holds
 *                at its last position — a valid static reading of who is in
 *                shadow). aria-label summarises the band counts.
 *
 * Attributes (reactive):
 *   cols / rows        grid dimensions                      (default 72 / 22)
 *   warn / crit        band thresholds on each cell value   (default 70 / 90)
 *   invert             low = bad                            (flag)
 *   terminator         shadow-band centre, 0..1             (optional)
 *   terminator-width   shadow-band width fraction           (default 0.35)
 *   gap                px gap between cells                  (default 1)
 *   label              accessible label                     (optional)
 */
export class TalosMatrix extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["cols", "rows", "warn", "crit", "invert", "terminator", "terminator-width", "gap", "label"];
  }

  private root: ShadowRoot;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private _cells: ArrayLike<number> = [];
  private _highlight: { col?: number; index?: number } | null = null;
  /** Keyboard-focused cell index (roving via arrow keys); -1 = none yet. */
  private _focus = -1;
  private _layout = { cols: 72, rows: 22, cell: 1, gap: 1 };
  private ro?: ResizeObserver;
  private raf = 0;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
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
    this.canvas = this.root.querySelector("canvas")!;
    this.ctx = this.canvas.getContext("2d")!;
  }

  /** Imperative data API — set the cell values (row-major, length cols×rows). */
  set cells(v: ArrayLike<number>) {
    this._cells = v;
    this.schedule();
  }
  get cells(): ArrayLike<number> {
    return this._cells;
  }

  /**
   * Highlight a plane (a whole column, `{col}`) or a single cell (`{index}`),
   * drawn as an outline over the grid — the selection an operator drilled into.
   * Set null to clear. Selection is state (PHILOSOPHY.md), so the outline is
   * bound to a real choice, not decoration.
   */
  set highlight(v: { col?: number; index?: number } | null) {
    this._highlight = v;
    this.schedule();
  }
  get highlight(): { col?: number; index?: number } | null {
    return this._highlight;
  }

  connectedCallback(): void {
    this.ro = new ResizeObserver(() => this.draw());
    this.ro.observe(this);
    this.canvas.addEventListener("click", this.onClick);
    this.canvas.style.cursor = "pointer";
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "0");
    this.addEventListener("keydown", this.onKeydown);
    this.draw();
  }

  /** Arrow keys move a roving focus cell; Enter/Space emit talos:cell for it. */
  private onKeydown = (e: KeyboardEvent): void => {
    const { cols, rows } = this._layout;
    const n = cols * rows;
    if (n <= 0) return;
    let f = this._focus;
    switch (e.key) {
      case "ArrowRight": f = f < 0 ? 0 : Math.min(n - 1, f + 1); break;
      case "ArrowLeft": f = f < 0 ? 0 : Math.max(0, f - 1); break;
      case "ArrowDown": f = f < 0 ? 0 : Math.min(n - 1, f + cols); break;
      case "ArrowUp": f = f < 0 ? 0 : Math.max(0, f - cols); break;
      case "Enter":
      case " ": {
        if (f < 0) return;
        e.preventDefault();
        const col = f % cols;
        const row = (f / cols) | 0;
        this.dispatchEvent(
          new CustomEvent("talos:cell", { detail: { col, row, index: f }, bubbles: true, composed: true }),
        );
        return;
      }
      default: return;
    }
    e.preventDefault();
    this._focus = f;
    this._highlight = { index: f };
    this.schedule();
  };

  /** Invert a click's px → (col,row,index) and emit talos:cell. */
  private onClick = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const { cols, rows, cell, gap } = this._layout;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / (cell + gap));
    const row = Math.floor(y / (cell + gap));
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    const index = row * cols + col;
    this.dispatchEvent(
      new CustomEvent("talos:cell", { detail: { col, row, index }, bubbles: true, composed: true }),
    );
  };
  disconnectedCallback(): void {
    this.ro?.disconnect();
    this.canvas.removeEventListener("click", this.onClick);
    this.removeEventListener("keydown", this.onKeydown);
    cancelAnimationFrame(this.raf);
  }
  attributeChangedCallback(): void {
    this.schedule();
  }

  private schedule(): void {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.draw());
  }

  /** Resolve a CSS colour var to an rgb string the canvas can use. */
  private colour(varName: string): string {
    const v = getComputedStyle(this).getPropertyValue(varName).trim();
    return v || "#888";
  }

  private draw(): void {
    const cols = Math.max(1, Math.round(num(this, "cols", 72)));
    const rows = Math.max(1, Math.round(num(this, "rows", 22)));
    const gap = num(this, "gap", 1);
    const warn = this.getAttribute("warn");
    const crit = this.getAttribute("crit");
    const invert = this.hasAttribute("invert");

    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    const cssW = this.clientWidth || 1;
    // Cell is square; height derives from the column width so the grid keeps its
    // aspect (cols are the long axis — planes; rows are slots in a plane).
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

    const band = (v: number): string => {
      const trips = (t: string | null) =>
        t !== null && (invert ? v <= parseFloat(t) : v >= parseFloat(t));
      if (trips(crit)) return cCrit;
      if (trips(warn)) return cWarn;
      return ok;
    };

    // Terminator band (in grid-fraction along the cols axis).
    const hasTerm = this.hasAttribute("terminator");
    const termC = num(this, "terminator", 0);
    const termW = num(this, "terminator-width", 0.35);
    const inShadow = (colFrac: number): boolean => {
      if (!hasTerm) return false;
      // Wrap-around band centred on termC, half-width termW/2.
      let d = Math.abs(colFrac - termC);
      d = Math.min(d, 1 - d); // shortest distance on the wrapped axis
      return d <= termW / 2;
    };

    const r = Math.min(cell, 2.5) * 0.35; // small corner radius
    const cells = this._cells;
    const n = cols * rows;
    for (let i = 0; i < n; i++) {
      const col = i % cols;
      const rowIdx = (i / cols) | 0;
      const x = col * (cell + gap);
      const y = rowIdx * (cell + gap);
      const v = i < cells.length ? cells[i] : NaN;
      let fill = Number.isFinite(v) ? band(v) : empty;
      // Dim the cell if it's under the terminator (eclipse) — darker, same hue.
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

    // Stash layout for click-inversion.
    this._layout = { cols, rows, cell, gap };

    // Highlight outline — a whole plane column, or a single cell.
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
        const rw = (hl.index / cols) | 0;
        ctx.strokeRect(c * (cell + gap) - 1, rw * (cell + gap) - 1, cell + 2, cell + 2);
      }
    }

    this.setAttribute("role", "img");
    this.setAttribute("aria-label", this.summary(cols, rows, warn, crit, invert));
  }

  private summary(cols: number, rows: number, warn: string | null, crit: string | null, invert: boolean): string {
    const cells = this._cells;
    let nWarn = 0, nCrit = 0;
    const trips = (t: string | null, v: number) =>
      t !== null && (invert ? v <= parseFloat(t) : v >= parseFloat(t));
    for (let i = 0; i < cells.length; i++) {
      const v = cells[i];
      if (trips(crit, v)) nCrit++;
      else if (trips(warn, v)) nWarn++;
    }
    const lbl = this.getAttribute("label");
    return `${lbl ? lbl + ": " : ""}${cols}×${rows} grid, ${nCrit} critical, ${nWarn} warning`;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}
