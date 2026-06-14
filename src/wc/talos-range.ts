/**
 * <talos-range> — a min–max-current tolerance-band meter. Where <talos-meter>
 * fills FROM min TO value (a level), this answers a different question: *where
 * does the current value sit inside a live operating band?* A reading between a
 * safe LOW and HIGH, a sample inside p5–p95, a pressure within tolerance. The
 * band is the contract and the marker is the present — both are domain state, so
 * both are drawn (form encodes function — the safe window is part of the
 * instrument, not buried in config).
 *
 *   - RAIL    spans the domain [min, max]; the whole scale is always visible.
 *   - BAND    the shaded region from `low` to `high` — the tolerance window.
 *   - MARKER  a line at `value` — where the system IS, right now.
 *   - SETPOINT an optional tick at the target the value is meant to hold.
 *   - COLOUR  band (nominal/warn/crit) drives the marker + readout — colour IS
 *             the state: inside the window reads green, outside reads warning,
 *             far outside (beyond an outer warn/crit threshold or off the rail)
 *             reads critical.
 *   - LIVE    setAttribute("value", v) re-renders; the marker tweens to the new
 *             position (easeOutCubic), or snaps under prefers-reduced-motion. The
 *             information (position + colour + number + band) is complete in any
 *             frame — the honesty clause holds with motion off.
 *
 * Band rule (documented so the colour never lies):
 *   - value INSIDE  [low, high]                         → nominal
 *   - value OUTSIDE [low, high] but on the rail         → warning
 *   - value beyond the outer warn/crit thresholds, or
 *     off the rail entirely (< min or > max)            → critical
 *   The optional `warn`/`crit` attributes set the OUTER escalation thresholds
 *   (a `warning` deepens to `critical` past them); absent, only the band edges
 *   and the rail bounds escalate. If `low`/`high` are absent there is no band
 *   and the marker reads nominal — the absence is the contract (see bands.ts).
 *
 * Attributes:
 *   value          current value                        (default 0)
 *   min / max      domain                               (default 0 / 100)
 *   low / high     tolerance-band bounds; no band if absent (optional)
 *   setpoint       target marker tick                   (optional)
 *   warn / crit    outer escalation thresholds          (optional)
 *   label          caption above the rail               (optional)
 *   unit           appended to the readout              (optional)
 *   width          px                                   (default 200)
 */
import { num, prefersReducedMotion, type Band } from "./bands";

export class TalosRange extends HTMLElement {
  static get observedAttributes() {
    return [
      "value", "min", "max", "low", "high", "setpoint",
      "warn", "crit", "label", "unit", "width",
    ];
  }

  private root: ShadowRoot;
  private bandEl!: HTMLElement;
  private marker!: HTMLElement;
  private setpointEl!: HTMLElement;
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
        .band {
          position: absolute;
          top: 0;
          bottom: 0;
          /* the tolerance window, tinted by the current band colour but kept
             low-alpha so the marker reads on top — the band is context, the
             marker is the signal. */
          background: color-mix(in srgb, var(--_c) 28%, transparent);
          border-inline: 1px solid color-mix(in srgb, var(--_c) 55%, transparent);
        }
        .band:not(.on) { display: none; }
        .marker {
          position: absolute;
          top: -2px;
          bottom: -2px;
          width: 2px;
          margin-left: -1px;
          background: var(--_c);
          /* colour snaps (state must not lag); the POSITION tweens via rAF in JS */
        }
        .setpoint {
          position: absolute;
          top: -3px;
          bottom: -3px;
          width: 1px;
          margin-left: -0.5px;
          background: var(--talos-foreground, #fff);
          opacity: 0.5;
        }
        .setpoint:not(.on) { display: none; }
      </style>
      <div class="head">
        <span class="caption" part="caption"></span>
        <span class="readout" part="readout"></span>
      </div>
      <div class="rail" part="rail">
        <div class="band" part="band"></div>
        <div class="setpoint" part="setpoint"></div>
        <div class="marker" part="marker"></div>
      </div>
    `;
    this.bandEl = this.root.querySelector(".band")!;
    this.marker = this.root.querySelector(".marker")!;
    this.setpointEl = this.root.querySelector(".setpoint")!;
    this.readout = this.root.querySelector(".readout")!;
    this.caption = this.root.querySelector(".caption")!;
  }

  private observer?: MutationObserver;

  connectedCallback(): void {
    this.shown = num(this, "value", 0);
    this.render();
    // Reactivity is driven by a filtered MutationObserver (not
    // attributeChangedCallback). render() writes role/aria-* back onto the host,
    // and the observer's attributeFilter excludes those, so a single mechanism
    // handles inputs without looping on its own writes — the pattern the
    // animated instruments share.
    this.observer = new MutationObserver(() => this.update());
    // attributeFilter REQUIRED — render() writes role/aria-* on the host; an
    // unfiltered observer would loop on its own write-backs.
    this.observer.observe(this, {
      attributeFilter: [
        "value", "min", "max", "low", "high", "setpoint",
        "warn", "crit", "label", "unit", "width",
      ],
    });
    // Single persistent rAF eases the marker toward the live target (see
    // talos-gauge: per-mutation tweens deadlocked under rapid updates).
    this.startEase();
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }

  /** Render immediately from the true value (colour + readout exact at once). */
  private update(): void {
    if (prefersReducedMotion()) this.shown = num(this, "value", this.shown);
    this.render();
  }

  /** Persistent rAF easing `shown` toward the live target each frame. */
  private startEase(): void {
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

  /**
   * Resolve the band for `value`. Local rule (NOT bandOf — the contract here is
   * the tolerance window, not a single rising/falling threshold):
   *   inside [low, high] → nominal; outside but on the rail → warning; beyond
   *   the outer warn/crit thresholds or off the rail → critical.
   */
  private band(value: number, min: number, max: number): Band {
    const low = this.getAttribute("low");
    const high = this.getAttribute("high");
    const lo = low !== null ? parseFloat(low) : NaN;
    const hi = high !== null ? parseFloat(high) : NaN;
    const hasBand = Number.isFinite(lo) && Number.isFinite(hi);

    // Off the rail is always critical — the reading has left the depicted world.
    if (value < min || value > max) return "critical";
    // No band declared → no window to violate (absence is the contract).
    if (!hasBand) return "nominal";
    // Inside the tolerance window → nominal.
    if (value >= lo && value <= hi) return "nominal";

    // Outside the window: escalate to critical past the outer thresholds, if set.
    const crit = this.getAttribute("crit");
    const warn = this.getAttribute("warn");
    if (crit !== null) {
      const c = parseFloat(crit);
      // crit framed as distance from the window: below low-c or above high+c.
      if (Number.isFinite(c) && (value <= lo - c || value >= hi + c)) return "critical";
    }
    if (warn !== null) {
      const w = parseFloat(warn);
      if (Number.isFinite(w) && (value <= lo - w || value >= hi + w)) return "critical";
    }
    return "warning";
  }

  private frac(v: number, min: number, max: number): number {
    return max > min ? (Math.max(min, Math.min(max, v)) - min) / (max - min) : 0;
  }

  private render(): void {
    const width = num(this, "width", 200);
    const min = num(this, "min", 0);
    const max = num(this, "max", 100);
    this.style.width = `${width}px`;

    // POSITION uses the tweening `shown`; COLOUR + readout use the true value so
    // the band never lags the data (see talos-gauge for the rationale).
    const target = num(this, "value", this.shown);
    const band = this.band(target, min, max);
    const bandVar =
      band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
    this.style.setProperty("--_c", `var(${bandVar})`);

    // The tolerance band — drawn only when both bounds are present.
    const low = this.getAttribute("low");
    const high = this.getAttribute("high");
    const lo = low !== null ? parseFloat(low) : NaN;
    const hi = high !== null ? parseFloat(high) : NaN;
    if (Number.isFinite(lo) && Number.isFinite(hi)) {
      const a = this.frac(Math.min(lo, hi), min, max);
      const b = this.frac(Math.max(lo, hi), min, max);
      this.bandEl.classList.add("on");
      this.bandEl.style.left = `${(a * 100).toFixed(2)}%`;
      this.bandEl.style.right = `${((1 - b) * 100).toFixed(2)}%`;
    } else {
      this.bandEl.classList.remove("on");
    }

    // The marker — tweened position from `shown`.
    this.marker.style.left = `${(this.frac(this.shown, min, max) * 100).toFixed(2)}%`;

    // Optional setpoint tick.
    const sp = this.getAttribute("setpoint");
    const spv = sp !== null ? parseFloat(sp) : NaN;
    if (Number.isFinite(spv)) {
      this.setpointEl.classList.add("on");
      this.setpointEl.style.left = `${(this.frac(spv, min, max) * 100).toFixed(2)}%`;
    } else {
      this.setpointEl.classList.remove("on");
    }

    const unit = this.getAttribute("unit") ?? "";
    this.readout.innerHTML =
      `${Math.round(target)}${unit ? `<span class="unit">${unit}</span>` : ""}`;
    this.caption.textContent = this.getAttribute("label") ?? "";

    // Read-only telemetry → role="meter" (not slider; the user does not set it).
    this.setAttribute("role", "meter");
    this.setAttribute("aria-valuenow", String(Math.round(num(this, "value", 0))));
    this.setAttribute("aria-valuemin", String(min));
    this.setAttribute("aria-valuemax", String(max));
    // Text alternative: caption plus the band verdict, so the meaning survives
    // for AT (the colour-as-state carried in words).
    const lbl = this.getAttribute("label");
    const verdict = band === "nominal" ? "in band" : band === "warning" ? "out of band" : "critical";
    const text = `${lbl ? `${lbl}: ` : ""}${Math.round(target)}${unit} — ${verdict}`;
    this.setAttribute("aria-label", text);
    this.setAttribute("aria-valuetext", text);
  }
}
