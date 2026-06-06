/**
 * <talos-readout> — a text value that DECODES when it changes.
 *
 * The reference pen scrambles text on hover as decoration. Here the same
 * mechanism is rebound to data: when the `value` attribute changes, the readout
 * resolves from a burst of scrambled glyphs into the new value. The motion is
 * not decoration — it is the *arrival event* of new telemetry made legible:
 * a value that just changed looks different from one that has been stable, the
 * way a flipboard or a settling segment display does. A frame mid-scramble is
 * never mistaken for the real value because the scramble is brief and the
 * settled text is the only stable state.
 *
 *   - VALUE → TEXT       the resolved characters are the value, exactly.
 *   - CHANGE → MOTION    a scramble fires only when the value actually changes;
 *                        a stable value is stable text. Motion marks an event.
 *   - HONEST MOTION      under prefers-reduced-motion the new value is shown
 *                        immediately with no scramble — the meaning is the text,
 *                        and the text is always correct in a static frame.
 *   - BAND COLOUR        optional warn/crit thresholds tint the text by state,
 *                        same convention as <talos-gauge>/<talos-meter>.
 *
 * Attributes (all reactive):
 *   value     the value to display (string or number)        (default "")
 *   warn      numeric value at/after which band = warning     (optional)
 *   crit      numeric value at/after which band = critical    (optional)
 *   unit      appended after the resolved value (e.g. "%")     (optional)
 *   label     uppercase caption above the readout             (optional)
 *   duration  scramble length in ms                            (default 420)
 *
 * Bands apply only when `value` parses as a number; non-numeric values render
 * nominal. warn/crit are inclusive-from, matching the other instruments.
 */
export class TalosReadout extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["value", "warn", "crit", "unit", "label", "duration"];
  }

  private root: ShadowRoot;
  private out!: HTMLElement;
  private caption!: HTMLElement;

  private frame = 0;
  private scrambleStart = 0;
  private toText = "";
  private lastValue: string | null = null;

  // Glyph pool: box-drawing + symbols read as "machine decoding", on-brand for a
  // console. No letters/digits that could be misread as a real partial value.
  private static readonly GLYPHS =
    "!<>-_\\/[]{}=+*^?#░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌";

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          --_nominal: var(--talos-success, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(40 95% 60%));
          --_critical: var(--talos-danger, hsl(0 90% 62%));
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
    this.out = this.root.querySelector(".out")!;
    this.caption = this.root.querySelector(".caption")!;
  }

  private observer?: MutationObserver;

  connectedCallback(): void {
    this.lastValue = this.getAttribute("value") ?? "";
    this.toText = this.lastValue;
    this.paint(this.toText);
    this.renderCaption();
    this.renderBand();
    // MutationObserver, not attributeChangedCallback — the same esbuild
    // reactivity workaround the rest of the library uses: attributeChangedCallback
    // did not fire for these elements after the build; a filtered observer does.
    this.observer = new MutationObserver(() => this.onAttrs());
    this.observer.observe(this, {
      attributeFilter: ["value", "warn", "crit", "unit", "label", "duration"],
    });
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }

  private get reducedMotion(): boolean {
    return (
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  private onAttrs(): void {
    this.renderCaption();
    this.renderBand();
    const next = this.getAttribute("value") ?? "";
    if (next === this.lastValue) return; // stable value → stable text, no motion
    this.toText = next;
    this.lastValue = next;
    if (this.reducedMotion) {
      this.paint(this.toText); // honest: show the value, skip the scramble
      return;
    }
    this.startScramble();
  }

  /** Band tint, only meaningful for numeric values — mirrors gauge/meter. */
  private renderBand(): void {
    const n = parseFloat(this.getAttribute("value") ?? "");
    let band: "nominal" | "warning" | "critical" = "nominal";
    if (Number.isFinite(n)) {
      const crit = this.getAttribute("crit");
      const warn = this.getAttribute("warn");
      if (crit !== null && n >= parseFloat(crit)) band = "critical";
      else if (warn !== null && n >= parseFloat(warn)) band = "warning";
    }
    const v =
      band === "critical"
        ? "var(--_critical)"
        : band === "warning"
          ? "var(--_warning)"
          : "var(--talos-foreground, #e7e9ec)";
    this.style.setProperty("--_c", v);
  }

  private renderCaption(): void {
    this.caption.textContent = this.getAttribute("label") ?? "";
    // a11y: expose the true value, never a scrambled frame.
    this.setAttribute("role", "status");
    this.setAttribute("aria-label", `${this.getAttribute("label") ?? ""} ${this.toText}`.trim());
  }

  private startScramble(): void {
    cancelAnimationFrame(this.frame);
    const dur = Math.max(0, this.num("duration", 420));
    // performance.now via rAF timestamp (Date.now would be equivalent but the
    // timestamp is already handed to us). Capture origin on first tick.
    this.scrambleStart = 0;
    const loop = (ts: number): void => {
      if (this.scrambleStart === 0) this.scrambleStart = ts;
      const p = dur === 0 ? 1 : Math.min((ts - this.scrambleStart) / dur, 1);
      this.paint(this.frameText(p));
      if (p < 1) {
        this.frame = requestAnimationFrame(loop);
      } else {
        this.paint(this.toText); // settle exactly on the value
      }
    };
    this.frame = requestAnimationFrame(loop);
  }

  /** Progressive left-to-right resolve: characters before the progress index are
   *  the real value; the rest are random glyphs. Same shape as the reference. */
  private frameText(p: number): string {
    const to = this.toText;
    const resolved = Math.floor(p * to.length);
    let s = "";
    for (let i = 0; i < to.length; i++) {
      const ch = to[i];
      if (i < resolved || ch === " ") {
        s += ch;
      } else {
        const g = TalosReadout.GLYPHS;
        s += g[(Math.floor(p * 9973) + i * 7) % g.length]; // deterministic-ish, no Math.random dependence
      }
    }
    return s;
  }

  private paint(text: string): void {
    const unit = this.getAttribute("unit") ?? "";
    this.out.innerHTML = `${this.escape(text)}${unit ? `<span class="unit">${this.escape(unit)}</span>` : ""}`;
  }

  private escape(s: string): string {
    return s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
  }

  private num(attr: string, fallback: number): number {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }
}
