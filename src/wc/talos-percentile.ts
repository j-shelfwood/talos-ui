/**
 * <talos-percentile> — the canonical ops summary of a value's SPREAD across a
 * population or time-window. Where <talos-histogram> draws the distribution's
 * full SHAPE, this draws what latency dashboards actually live on: the five-
 * number summary as markers on a horizontal scale. p50/p90/p99 (and optionally
 * p25/p75/p05) of a live metric, read at a glance. It is a box-plot in HUD
 * clothing — the box is the body of the distribution (p25→p75), the whiskers
 * reach toward the percentile tail, and the labelled percentile lines are the
 * ones an SRE quotes in an incident.
 *
 *   - SCALE    a horizontal rail over [min, max]; absent, the domain auto-fits
 *              to the supplied percentiles (with a small headroom pad so p99 is
 *              never pinned to the right edge).
 *   - BOX      p25→p75 (the interquartile body) when both are present.
 *   - WHISKERS p05/min → p25 and p75 → p99 — the reach toward the tail.
 *   - MARKERS  p50 / p90 / p99 are vertical lines with tiny labels. The p99
 *              marker is COLOURED BY BAND (bandOf against warn/crit) — the whole
 *              point of the instrument is that "p99 latency is critical" reads
 *              red without reading the number. The band is applied to **p99 by
 *              default** (the tail is what pages you); warn/crit are the
 *              thresholds it trips against.
 *   - HONEST   colour + marker position + the numeric labels carry the meaning
 *              in any static frame. Markers CSS-transition to new positions when
 *              they move, but the transition is suppressed under
 *              prefers-reduced-motion — the position is information, the slide is
 *              not.
 *
 * Input comes two ways, mirroring the rest of the library (matrix has `.cells`,
 * histogram has `.values`):
 *   - DECLARATIVE  attributes p50/p90/p99/p25/p75/p05 (numbers; render whichever
 *                  are present) for the static case.
 *   - LIVE         the `.stats` setter — { p50, p90, p99, p25?, p75?, p05? } —
 *                  updates and re-renders for the streaming case.
 *
 * Attributes (reactive):
 *   p50 / p90 / p99   the canonical percentiles (median, tail, far tail)
 *   p25 / p75         interquartile box bounds                   (optional)
 *   p05               low whisker end                            (optional)
 *   min / max         scale domain; auto-fit to percentiles when absent
 *   warn / crit       band thresholds, applied to p99 by default (optional)
 *   label             caption above the rail                     (optional)
 *   unit              appended to the percentile labels          (optional)
 *   width             px (default 240)
 */
import { bandOf, num, prefersReducedMotion, type Band } from "./bands";

/**
 * The imperative payload for the live case. p50/p90/p99 are the canonical
 * required summary; the interquartile box (p25/p75) and the low whisker (p05)
 * are optional and only drawn when supplied.
 */
export interface PercentileStats {
  p50: number;
  p90: number;
  p99: number;
  p25?: number;
  p75?: number;
  p05?: number;
}

/** The percentile keys, in domain order — the source of truth for both the
 *  attribute reflection and the imperative setter. */
const PCTS = ["p05", "p25", "p50", "p75", "p90", "p99"] as const;
type PctKey = (typeof PCTS)[number];

export class TalosPercentile extends HTMLElement {
  static get observedAttributes(): string[] {
    return [...PCTS, "min", "max", "warn", "crit", "invert", "label", "unit", "width"];
  }

  private root: ShadowRoot;
  private gBox: SVGGElement;
  private gWhisker: SVGGElement;
  private gMarks: SVGGElement;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
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
           tracks the shift. The slide is decoration — under reduced motion the
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
    this.gWhisker = this.root.querySelector(".whiskers")!;
    this.gBox = this.root.querySelector(".boxes")!;
    this.gMarks = this.root.querySelector(".marks")!;
  }

  /** Imperative override for the live case. Attributes still render when no
   *  override is set; calling `.stats = …` takes precedence. */
  private _stats: PercentileStats | null = null;
  set stats(s: PercentileStats | null) {
    this._stats = s;
    this.render();
  }
  get stats(): PercentileStats | null {
    return this._stats;
  }

  connectedCallback(): void {
    // Reflect the reduced-motion preference onto the host so the CSS guard can
    // strip the position transition — the honesty clause: the slide is removed,
    // the position survives.
    if (prefersReducedMotion()) this.setAttribute("reduced", "");
    this.render();
  }

  attributeChangedCallback(): void {
    // Positions can CSS-transition, so no rAF is needed here (unlike the eased
    // meter/gauge fills) — a plain re-render moves the markers and the browser
    // tweens them.
    this.render();
  }

  /** Resolve a percentile from the imperative override first, then attributes. */
  private pct(key: PctKey): number | null {
    if (this._stats) {
      const v = (this._stats as unknown as Record<string, number | undefined>)[key];
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    }
    const raw = this.getAttribute(key);
    if (raw === null) return null;
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : null;
  }

  private band(value: number): Band {
    return bandOf(this, value);
  }

  private render(): void {
    const width = num(this, "width", 240);
    this.style.width = `${width}px`;

    // Gather the supplied percentiles (override wins over attributes).
    const present = new Map<PctKey, number>();
    for (const k of PCTS) {
      const v = this.pct(k);
      if (v !== null) present.set(k, v);
    }

    // Domain: explicit min/max, else auto-fit to the supplied values with a
    // small headroom pad so the far tail is never pinned to the edge.
    const vals = [...present.values()];
    const dataMin = vals.length ? Math.min(...vals) : 0;
    const dataMax = vals.length ? Math.max(...vals) : 100;
    const pad = (dataMax - dataMin) * 0.06 || 1;
    const min = num(this, "min", dataMin - pad);
    const max = num(this, "max", dataMax + pad);
    const span = max - min || 1;
    const X = (v: number) => ((Math.max(min, Math.min(max, v)) - min) / span) * 100;

    const unit = this.getAttribute("unit") ?? "";
    const fmt = (v: number) => `${Math.round(v)}${unit}`;

    // --- Box: the interquartile body (p25 → p75), only when both present. -----
    this.gBox.innerHTML = "";
    const p25 = present.get("p25");
    const p75 = present.get("p75");
    if (p25 !== undefined && p75 !== undefined) {
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

    // --- Whiskers: low end (p05 or box-left) → p25, and p75 → p99. -----------
    // The whisker reaches toward the tail; we draw whatever endpoints exist so a
    // partial summary still reads honestly.
    this.gWhisker.innerHTML = "";
    const whisker = (a: number, b: number) => {
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
    if (lowEnd !== undefined && boxLeft !== undefined) whisker(lowEnd, boxLeft);
    const boxRight = p75 ?? present.get("p50");
    const highEnd = present.get("p99") ?? present.get("p90");
    if (boxRight !== undefined && highEnd !== undefined) whisker(boxRight, highEnd);

    // --- Markers: the labelled percentile lines (the signal). ----------------
    // p99 is band-coloured (the tail is what pages you); p50 is the nominal
    // accent; p90 sits in the muted middle.
    const p99 = present.get("p99");
    const p99Band: Band = p99 !== undefined ? this.band(p99) : "nominal";
    const p99Var =
      p99Band === "critical" ? "--_critical" : p99Band === "warning" ? "--_warning" : "--_nominal";

    this.gMarks.innerHTML = "";
    const marks: { key: PctKey; cls: string; text: string; colour?: string }[] = [];
    if (present.has("p50"))
      marks.push({ key: "p50", cls: "median", text: `p50 ${fmt(present.get("p50")!)}` });
    if (present.has("p90"))
      marks.push({ key: "p90", cls: "p90", text: `p90 ${fmt(present.get("p90")!)}` });
    if (p99 !== undefined)
      marks.push({ key: "p99", cls: "p99", text: `p99 ${fmt(p99)}`, colour: `var(${p99Var})` });

    for (const m of marks) {
      const x = X(present.get(m.key)!);
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
      // Keep edge labels inside the field: clamp the anchored x and flip the
      // text-anchor near the rails so the readout never clips.
      const anchor = x < 12 ? "start" : x > 88 ? "end" : "middle";
      text.setAttribute("text-anchor", anchor);
      text.setAttribute("x", x.toFixed(2));
      text.setAttribute("y", "3");
      if (m.colour) text.setAttribute("fill", m.colour);
      text.textContent = m.text;
      this.gMarks.appendChild(text);
    }

    // --- ARIA: the text alternative is the full summary. ---------------------
    this.setAttribute("role", "img");
    const lbl = this.getAttribute("label");
    const parts = marks.map((m) => m.text.replace(/\s/, " "));
    this.setAttribute(
      "aria-label",
      `${lbl ? lbl + ": " : ""}${parts.length ? parts.join(", ") : "no percentiles"}`,
    );

    const caption = this.root.querySelector(".caption")!;
    caption.textContent = lbl ?? "";
  }
}
