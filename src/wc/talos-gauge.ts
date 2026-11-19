/**
 * <talos-gauge> — a radial gauge that renders a VALUE'S MEANING, not a value.
 *
 * The first of the data-binding primitives, and the pattern-setter for the
 * rest. It is the law made concrete (see PHILOSOPHY.md):
 *
 *   - VALUE → POSITION   the needle angle is the value.
 *   - VALUE → COLOUR     the arc colour is which threshold band the value is in
 *                        (nominal / warning / critical). The colour *is* the
 *                        state — not a decoration applied next to it.
 *   - LIVE               set `value` again and it re-renders; read it twice
 *                        while a system runs and you see different things.
 *   - HONEST MOTION      the needle tweens to new values, but the information
 *                        (number + band colour + needle position) is fully
 *                        present in a single static frame. Under
 *                        prefers-reduced-motion the tween is skipped, not the
 *                        meaning. Telemetry that needs the animation to be
 *                        understood would be decoration wearing a function coat.
 *
 * Attributes (all reactive):
 *   value            current value                        (default 0)
 *   min / max        domain range                         (default 0 / 100)
 *   warn             value at/after which band = warning   (optional)
 *   crit             value at/after which band = critical  (optional)
 *   label            caption under the readout             (optional)
 *   unit             appended to the readout (e.g. "%")    (optional)
 *   sweep            arc sweep in degrees (180–300)        (default 240)
 *   size             px square                             (default 160)
 *
 * A value outside [min, max] pins the needle at the end stop, but the readout
 * and aria still state the true value and the host carries
 * `data-range="over"` or `data-range="under"` (style it via the host selector).
 *
 * Bands are inclusive-from: value >= crit → critical; else value >= warn →
 * warning; else nominal. `warn`/`crit` may be omitted for a single-band gauge.
 */
import {
  BAND_TOKENS_CSS, bandColorVar, bandOf, markRange, num, prefersReducedMotion, rangeState, type Band,
} from "./bands";
import { setMeterA11y } from "./a11y";
import { approach, FrameLoop } from "./loop";
import { replaceTextWithUnit } from "./render";


export class TalosGauge extends HTMLElement {
  // CONVENTION: every Talos web component declares observedAttributes as a
  // static GETTER (not a class field), uniformly across the library. Both forms
  // compile correctly under the current tsup/esbuild config (the field is
  // emitted in-class, verified in dist/wc/index.js), so this is a coherence
  // choice, not a workaround: the getter is unambiguously evaluated on the
  // constructor before customElements.define() reads it, with no dependency on
  // how the bundler lowers static fields. Keep new components on the getter.
  static get observedAttributes(): string[] {
    return ["value", "min", "max", "warn", "crit", "invert", "label", "unit", "sweep", "size"];
  }

  private root: ShadowRoot;
  private arc!: SVGPathElement;
  private needle!: SVGLineElement;
  private readout!: HTMLElement;
  private caption!: HTMLElement;

  private shown = 0; // the currently-displayed (eased) value
  /** Eases `shown` toward the live value; stops once it arrives. */
  private ease = new FrameLoop(() => {
    this.shown = approach(this.shown, num(this, "value", this.shown));
    this.drawNeedle();
    return this.shown !== num(this, "value", this.shown);
  });
  /** Geometry from the last full render, reused by the per-frame needle draw. */
  private geo = { cx: 0, cy: 0, r: 0, stroke: 0, start: 0, end: 0, min: 0, max: 100, innerR: 0, size: 160 };

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          /* Band colours default to the status tokens; the rendered band sets
             --_c to one of these, and everything that encodes state reads it. */
          ${BAND_TOKENS_CSS}
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
        /* Band colour is the STATE — it must not lag behind the value (a CSS
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
           radius). It is centred on the arc's enclosed centroid — NOT a magic
           bottom-% — and that centre + size are written from JS each render so
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
    this.arc = this.root.querySelector(".value-arc")!;
    this.needle = this.root.querySelector(".needle")!;
    this.readout = this.root.querySelector(".readout")!;
    this.caption = this.root.querySelector(".caption")!;
  }

  private observer?: MutationObserver;

  connectedCallback(): void {
    this.shown = num(this, "value", 0);
    this.render();
    // Reactivity via a filtered MutationObserver (not attributeChangedCallback).
    // render() writes role/aria-* back onto the host on each render; the observe()
    // call below uses an explicit attributeFilter that excludes those, so a
    // single mechanism handles real inputs without looping on its own write-backs
    // (an unfiltered observer would freeze the renderer). This is the pattern
    // the animated instruments share.
    this.observer = new MutationObserver(() => this.update());
    // attributeFilter is REQUIRED: render() writes role/aria-* on the host, and
    // an unfiltered observer would catch its own write-backs → infinite loop /
    // frozen renderer. Only observe the real inputs.
    this.observer.observe(this, {
      attributeFilter: ["value", "min", "max", "warn", "crit", "invert", "label", "unit", "sweep", "size"],
    });
  }

  disconnectedCallback(): void {
    this.ease.stop();
    this.observer?.disconnect();
  }

  /** Render immediately from the true value (colour + readout + aria are exact
   *  at once), then ease the needle toward it. The ease loop reads the live
   *  attribute each frame, so a burst of updates retargets one running loop. */
  private update(): void {
    if (prefersReducedMotion()) this.shown = num(this, "value", this.shown);
    this.render();
    if (this.shown !== num(this, "value", this.shown)) this.ease.start();
  }

  /** Which band the value falls in — this is the state, and it drives colour. */
  private band(value: number): Band {
    return bandOf(this, value);
  }

  /** Polar→cartesian on the dial circle, angle in degrees (0 = right, CW). */
  private point(cx: number, cy: number, r: number, deg: number): [number, number] {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  private arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
    const [x0, y0] = this.point(cx, cy, r, a0);
    const [x1, y1] = this.point(cx, cy, r, a1);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    const sweep = a1 > a0 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
  }

  /** Full render: geometry, band colour, readout, keep-out, aria. Runs on
   *  connect and on attribute change, never per animation frame. */
  private render(): void {
    const size = num(this, "size", 160);
    const min = num(this, "min", 0);
    const max = num(this, "max", 100);
    const sweep = Math.max(180, Math.min(300, num(this, "sweep", 240)));
    const stroke = Math.max(4, size * 0.06);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - stroke / 2 - 2;

    // The readout sits just below the dial's geometric centre: the visual
    // centroid of a bottom-opening arc. The needle's inner end is clamped
    // OUTSIDE this box's circumscribed radius (computed below from the rendered
    // text), so the marker can never cross the number at any value, sweep, or
    // size.
    const textCx = cx;
    const textCy = cy + size * 0.08;

    // Arc centred at the bottom: from (90 + sweep/2) sweeping to (90 - sweep/2)
    // in screen coords (y-down), so the opening faces down and the fill grows
    // left→right across the top.
    const start = 90 + sweep / 2;
    const end = 90 - sweep / 2;

    // COLOUR and the readout use the TRUE value so the band never lags the data:
    // the needle may still be sweeping toward 80 while the colour already says
    // "warning", which is correct, the state changed the moment the value did.
    // An out-of-domain value is shown as-is and flagged, never silently clamped.
    const value = num(this, "value", this.shown);
    const band = this.band(value);
    const range = rangeState(value, min, max);
    this.style.setProperty("--_c", `var(${bandColorVar(band)})`);
    markRange(this, range);

    const svg = this.root.querySelector("svg")!;
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

    const track = this.root.querySelector(".track")!;
    track.setAttribute("d", this.arcPath(cx, cy, r, start, end));
    track.setAttribute("stroke-width", String(stroke));
    this.arc.setAttribute("stroke-width", String(stroke));

    const unit = this.getAttribute("unit") ?? "";
    const display = Math.round(value).toString();
    replaceTextWithUnit(this.readout, display, unit);
    this.readout.style.fontSize = `${size * 0.22}px`;
    this.readout.style.left = `${(textCx / size) * 100}%`;
    this.readout.style.top = `${(textCy / size) * 100}%`;

    // KEEP-OUT: reserve a circle (centred on the DIAL centre cx,cy) large enough
    // to enclose the readout box wherever it sits. Because the readout is offset
    // below centre by (textCy - cy), the radius must reach its FAR corner: half
    // the text box plus that offset. Measured here, once per value change, not
    // per frame. Falls back to an estimate when layout metrics aren't available.
    const measured = this.readout.getBoundingClientRect();
    const hostRect = this.getBoundingClientRect();
    const scale = hostRect.width > 0 ? size / hostRect.width : 1;
    const tw = (measured.width || size * 0.5) * scale;
    const th = (measured.height || size * 0.22) * scale;
    const offset = Math.abs(textCy - cy);
    const keepOut = Math.hypot(tw / 2, th / 2 + offset) + stroke * 0.5;
    const innerR = Math.min(r - stroke - 2, Math.max(r * 0.52, keepOut));

    this.geo = { cx, cy, r, stroke, start, end, min, max, innerR, size };
    this.drawNeedle();

    this.caption.textContent = this.getAttribute("label") ?? "";

    const over = range ? `, ${range} range` : "";
    setMeterA11y(this, {
      label: this.getAttribute("label"),
      summary: `${display}${unit} — ${band}${over}`,
      value: Math.round(value),
      min,
      max,
    });
  }

  /** Per-frame draw: only the eased needle position (value arc, needle, hub). */
  private drawNeedle(): void {
    const { cx, cy, r, stroke, start, end, min, max, innerR, size } = this.geo;
    const clamped = Math.max(min, Math.min(max, this.shown));
    const frac = max > min ? (clamped - min) / (max - min) : 0;
    const valAngle = start + (end - start) * frac;

    this.arc.setAttribute("d", this.arcPath(cx, cy, r, start, valAngle));

    // Needle as a short hub-anchored marker pointing at the arc, NOT a full
    // clock hand. Its inner end sits on the keep-out radius (so it can never
    // enter the readout zone); its outer end stops short of the arc.
    const [nx0, ny0] = this.point(cx, cy, innerR, valAngle);
    const [nx1, ny1] = this.point(cx, cy, r - stroke, valAngle);
    this.needle.setAttribute("x1", String(nx0));
    this.needle.setAttribute("y1", String(ny0));
    this.needle.setAttribute("x2", String(nx1));
    this.needle.setAttribute("y2", String(ny1));

    const hub = this.root.querySelector(".hub")!;
    hub.setAttribute("cx", String(nx0));
    hub.setAttribute("cy", String(ny0));
    hub.setAttribute("r", String(Math.max(2.5, size * 0.025)));
  }
}
