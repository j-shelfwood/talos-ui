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
declare class TalosLed extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(): void;
    private render;
}

export { TalosLed };
