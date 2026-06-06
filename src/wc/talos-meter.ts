/**
 * <talos-meter> — a linear level/threshold meter. The horizontal analog of
 * <talos-gauge>: fill length is the value, fill colour is the band, and tick
 * marks sit at the warn/crit boundaries so the thresholds are visible on the
 * scale itself (form encodes function — the breakpoints are part of the
 * instrument, not hidden in config).
 *
 *   - LENGTH  filled fraction = (value - min) / (max - min).
 *   - COLOUR  band (nominal/warn/crit) drives the fill — colour IS the state.
 *   - LIVE    setAttribute("value", v) re-renders; the fill tweens to the new
 *             level (easeOutCubic), or snaps under prefers-reduced-motion. The
 *             information (level + colour + number) is complete in any frame.
 *
 * Attributes:
 *   value          current value                        (default 0)
 *   min / max      domain                               (default 0 / 100)
 *   warn / crit    band thresholds; also drawn as ticks (optional)
 *   label          caption above the bar                (optional)
 *   unit           appended to the readout              (optional)
 *   width          px; height tracks via --_h           (default 200)
 *   ticks          if present, draw warn/crit tick marks (default on when
 *                  warn/crit set; pass ticks="off" to suppress)
 */
import { bandOf, type Band } from "./bands";

export class TalosMeter extends HTMLElement {
  static observedAttributes = [
    "value",
    "min",
    "max",
    "warn",
    "crit",
    "invert",
    "label",
    "unit",
    "width",
    "ticks",
  ];

  private root: ShadowRoot;
  private fill!: HTMLElement;
  private ticksEl!: HTMLElement;
  private readout!: HTMLElement;
  private caption!: HTMLElement;

  private frame = 0;
  private shown = 0;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          --_nominal: var(--talos-success, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(40 95% 60%));
          --_critical: var(--talos-danger, hsl(0 90% 62%));
          --_track: var(--talos-edge-subtle, hsl(0 0% 100% / 0.1));
          --_c: var(--_nominal);
          --_h: 0.5rem;

          display: inline-flex;
          flex-direction: column;
          gap: 0.35rem;
          font-family: var(--talos-font-display, system-ui);
          color: var(--talos-foreground, #e7e9ec);
        }
        /* Compact / inline variant — a bare micro-bar with no caption/readout
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
    this.fill = this.root.querySelector(".fill")!;
    this.ticksEl = this.root.querySelector(".ticks")!;
    this.readout = this.root.querySelector(".readout")!;
    this.caption = this.root.querySelector(".caption")!;
  }

  private observer?: MutationObserver;

  connectedCallback(): void {
    this.shown = this.num("value", 0);
    this.render();
    // MutationObserver, not attributeChangedCallback: the latter did not fire
    // for these elements after esbuild's class transform; the filtered observer
    // is reliable (the mechanism <talos-panel> already uses in this build).
    this.observer = new MutationObserver(() => this.update());
    // attributeFilter REQUIRED — render() writes role/aria-* on the host; an
    // unfiltered observer would loop on its own write-backs.
    this.observer.observe(this, {
      attributeFilter: ["value", "min", "max", "warn", "crit", "label", "unit", "width", "ticks"],
    });
    // Single persistent rAF eases the fill toward the live target (see
    // talos-gauge: per-mutation tweens deadlocked under rapid updates).
    this.startEase();
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }

  private num(attr: string, fallback: number): number {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }

  private get reducedMotion(): boolean {
    return (
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /** Render immediately from the true value (colour + readout exact at once). */
  private update(): void {
    if (this.reducedMotion) this.shown = this.num("value", this.shown);
    this.render();
  }

  /** Persistent rAF easing `shown` toward the live target each frame. */
  private startEase(): void {
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

  private band(value: number): Band {
    return bandOf(this, value);
  }

  private render(): void {
    const width = this.num("width", 200);
    const min = this.num("min", 0);
    const max = this.num("max", 100);
    this.style.width = `${width}px`;

    // LENGTH uses the tweening `shown`; COLOUR + readout use the true value so
    // the band never lags the data (see talos-gauge for the rationale).
    const clamped = Math.max(min, Math.min(max, this.shown));
    const frac = max > min ? (clamped - min) / (max - min) : 0;
    const target = Math.max(min, Math.min(max, this.num("value", this.shown)));

    const band = this.band(target);
    const bandVar =
      band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
    this.style.setProperty("--_c", `var(${bandVar})`);

    this.fill.style.transform = `scaleX(${frac})`;

    // Threshold ticks on the scale itself.
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
    this.readout.innerHTML =
      `${Math.round(target)}${unit ? `<span class="unit">${unit}</span>` : ""}`;
    this.caption.textContent = this.getAttribute("label") ?? "";

    this.setAttribute("role", "meter");
    this.setAttribute("aria-valuenow", String(Math.round(this.num("value", 0))));
    this.setAttribute("aria-valuemin", String(min));
    this.setAttribute("aria-valuemax", String(max));
    const lbl = this.getAttribute("label");
    if (lbl) this.setAttribute("aria-label", lbl);
  }
}
