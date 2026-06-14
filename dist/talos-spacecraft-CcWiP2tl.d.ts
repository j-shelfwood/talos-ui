/**
 * <talos-spacecraft> — a single satellite drawn as its physical anatomy, where
 * each part IS an instrument. The deepest magnification of the drill-down: after
 * the fleet, a plane, and one satellite's neighbourhood, this is the spacecraft
 * itself — central bus, GPU/compute payload, two solar wings, two radiator
 * panels, a downlink antenna — each a selectable hotspot whose COLOUR is that
 * subsystem's health band and whose selection surfaces its live stats. This is
 * the thesis at its purest (PHILOSOPHY.md): the form of the object is the readout,
 * every part bound to a real signal, nothing decorative.
 *
 *   - PARTS    `.parts` (imperative) — a record keyed by part id, each
 *              { value?, band } where band is 0|1|2 (nominal|warning|critical).
 *              Keys: bus, gpu, solarL, solarR, radL, radR, antenna. Unset parts
 *              read nominal.
 *   - SELECT   a click on a part emits `talos:part` { part }. The `selected`
 *              attribute (a part id) outlines that part.
 *   - ECLIPSE  the `eclipse` flag dims the solar wings — they make no power in
 *              shadow, an honest state, not a style.
 *
 * Attributes (reactive):
 *   selected   the highlighted part id            (optional)
 *   eclipse    solar wings dark (no sun)          (flag)
 *   label      accessible label                   (optional)
 */
type PartState = {
    value?: number;
    band?: number;
};
type Parts = Record<string, PartState>;
declare class TalosSpacecraft extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private svg;
    private _parts;
    constructor();
    set parts(v: Parts);
    get parts(): Parts;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    /**
     * Keyboard nav: Arrow keys cycle the `selected` part through PART_IDS (reusing
     * the existing selection-outline highlight); Enter/Space emit talos:part.
     */
    private onKeydown;
    private bandColour;
    private render;
}

export { type PartState as P, TalosSpacecraft as T, type Parts as a };
