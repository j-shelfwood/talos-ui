import { bandOf } from "./bands";

/**
 * <talos-led> — a single status light. The smallest instrument: one dot whose
 * COLOUR is a state and whose PULSE means "live". The honest replacement for a
 * hand-coloured `<span>` status dot — here the colour is bound, not decorative.
 *
 *   - COLOUR   the state. Two ways to drive it:
 *              • `state="ok|warn|crit|idle"` — a direct qualitative state, or
 *              • `value` + `warn`/`crit` — banded via the shared bandOf() helper
 *                (same threshold + `invert` semantics as gauge/meter). If both
 *                are present, `value`/thresholds win (the live reading leads).
 *              `idle` has no band — it reads muted, "nothing to report".
 *   - PULSE    `live` makes the light pulse; the pulse means the channel is
 *              actively reporting, not a decorative shimmer. Drop `live` and it
 *              holds steady — a steady light is still a valid, readable state.
 *   - HONEST   the colour (and an aria-label) carry the state in a single static
 *              frame; under prefers-reduced-motion the pulse is dropped, never
 *              the colour. A light whose meaning lived only in the pulse would be
 *              decoration wearing a function's coat.
 *
 * Attributes (all reactive):
 *   state        ok | warn | crit | idle                  (default ok)
 *   value        numeric reading; banded by warn/crit      (optional)
 *   warn / crit  band thresholds on `value`                (optional)
 *   invert       low = bad (band trips as value FALLS)     (flag)
 *   live         pulse to signal an actively-reporting channel (flag)
 *   label        accessible label / state caption          (optional)
 *   size         px diameter                               (default 10)
 */
export class TalosLed extends HTMLElement {
  static get observedAttributes() {
    return ["state", "value", "warn", "crit", "invert", "live", "label", "size"];
  }

  private root: ShadowRoot;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          /* band tokens, identical fallbacks to the other instruments */
          --_ok: var(--talos-success, hsl(140 90% 60%));
          --_warn: var(--talos-warning, hsl(38 92% 60%));
          --_crit: var(--talos-danger, hsl(0 80% 62%));
          --_idle: var(--talos-muted-foreground, hsl(0 0% 60%));
          --_c: var(--_ok);
          --_d: 10px;

          display: inline-block;
          line-height: 0;
          vertical-align: middle;
        }
        .dot {
          width: var(--_d);
          height: var(--_d);
          border-radius: 50%;
          background: var(--_c);
          /* glow encodes presence, not decoration: it's the state colour, sized
             to the dot, so a brighter halo never means anything the fill doesn't. */
          box-shadow: 0 0 calc(var(--_d) * 0.6) hsl(var(--_c-hsl, 0 0% 100%) / 0);
          transition: background var(--talos-dur-fast, 180ms) var(--talos-ease-out, ease);
        }
        :host([state="idle"]:not([value])) .dot { background: var(--_idle); }
        /* live = actively reporting: a slow steady pulse. */
        :host([live]) .dot { animation: talos-led-pulse 2.4s ease-in-out infinite; }
        @keyframes talos-led-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 transparent; }
          50%      { opacity: 0.55; box-shadow: 0 0 calc(var(--_d) * 0.8) var(--_c); }
        }
        @media (prefers-reduced-motion: reduce) {
          /* honest fallback: hold the lit state, drop the pulse. */
          :host([live]) .dot { animation: none; opacity: 1; }
        }
      </style>
      <span class="dot" part="dot"></span>`;
  }

  connectedCallback(): void { this.render(); }
  attributeChangedCallback(): void { this.render(); }

  private render(): void {
    const size = parseFloat(this.getAttribute("size") ?? "");
    this.style.setProperty("--_d", Number.isFinite(size) ? `${size}px` : "10px");

    // Resolve the state. A live numeric reading leads; else the qualitative
    // `state`; else default ok.
    let varName = "--_ok";
    let label: string;
    const valueAttr = this.getAttribute("value");

    if (valueAttr !== null && Number.isFinite(parseFloat(valueAttr))) {
      const band = bandOf(this, parseFloat(valueAttr));
      varName = band === "critical" ? "--_crit" : band === "warning" ? "--_warn" : "--_ok";
      label = band; // nominal | warning | critical
    } else {
      const state = (this.getAttribute("state") ?? "ok").toLowerCase();
      varName =
        state === "crit" ? "--_crit"
        : state === "warn" ? "--_warn"
        : state === "idle" ? "--_idle"
        : "--_ok";
      label = state;
    }

    this.style.setProperty("--_c", `var(${varName})`);

    // Accessibility: the state must survive without colour or motion.
    this.setAttribute("role", "status");
    const lbl = this.getAttribute("label");
    const live = this.hasAttribute("live") ? ", live" : "";
    this.setAttribute("aria-label", `${lbl ? lbl + ": " : ""}${label}${live}`);
  }
}
