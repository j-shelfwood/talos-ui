import { BAND_TOKENS_CSS, bandColorVar, bandOf, type Band } from "./bands";
import { setStatusA11y } from "./a11y";

type LedState = Band | "idle";

/** Qualitative `state` values: the short forms and the band names. */
const STATES: Record<string, LedState> = {
  ok: "nominal",
  nominal: "nominal",
  warn: "warning",
  warning: "warning",
  crit: "critical",
  critical: "critical",
  idle: "idle",
};

const warned = new Set<string>();

/** Resolve a `state` attribute; unknown values read idle (never a false green). */
export function ledState(raw: string | null): LedState {
  const key = (raw ?? "ok").trim().toLowerCase();
  const state = STATES[key];
  if (state) return state;
  if (!warned.has(key)) {
    warned.add(key);
    console.warn(
      `<talos-led> unknown state "${raw}"; showing idle. Use ok|warn|crit|idle or nominal|warning|critical.`,
    );
  }
  return "idle";
}

/**
 * <talos-led> — a single status light. The smallest instrument: one dot whose
 * COLOUR is a state and whose PULSE means "live". The honest replacement for a
 * hand-coloured `<span>` status dot — here the colour is bound, not decorative.
 *
 *   - COLOUR   the state. Two ways to drive it:
 *              • `state="ok|warn|crit|idle"` (or the band names
 *                `nominal|warning|critical`) — a direct qualitative state; an
 *                unknown state reads idle and logs one console warning, or
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
 *   state        ok | warn | crit | idle, or nominal | warning | critical (default ok)
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
          ${BAND_TOKENS_CSS}
          --_idle: var(--talos-muted-foreground, hsl(0 0% 60%));
          --_c: var(--_nominal);
          --_d: 10px;

          display: inline-block;
          line-height: 0;
          vertical-align: middle;
        }
        .dot {
          /* MUST be block/inline-block: a bare inline <span> ignores width/height
             and collapses to a 0×0 box — the dot was invisible despite a colour. */
          display: block;
          width: var(--_d);
          height: var(--_d);
          border-radius: 50%;
          background: var(--_c);
          /* glow encodes presence, not decoration: it's the state colour, sized
             to the dot, so a brighter halo never means anything the fill doesn't. */
          box-shadow: 0 0 calc(var(--_d) * 0.6) hsl(var(--_c-hsl, 0 0% 100%) / 0);
          transition: background var(--talos-dur-fast, 180ms) var(--talos-ease-out, ease);
        }
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
    const valueAttr = this.getAttribute("value");
    const state: LedState =
      valueAttr !== null && Number.isFinite(parseFloat(valueAttr))
        ? bandOf(this, parseFloat(valueAttr))
        : ledState(this.getAttribute("state"));

    this.style.setProperty("--_c", `var(${state === "idle" ? "--_idle" : bandColorVar(state)})`);

    // Accessibility: the state must survive without colour or motion. A label
    // that already names the state is not repeated ("ok", not "ok: nominal").
    const lbl = this.getAttribute("label");
    const live = this.hasAttribute("live") ? ", live" : "";
    const rawState = (this.getAttribute("state") ?? "").trim().toLowerCase();
    const named = lbl !== null && [state, rawState].includes(lbl.trim().toLowerCase());
    setStatusA11y(this, named ? { summary: `${lbl}${live}` } : { label: lbl, summary: `${state}${live}` });
  }
}
