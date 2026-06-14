/**
 * <talos-plane> — one orbital PLANE as the train it actually is: the N satellites
 * of a single plane spaced along their shared orbit track, each following the one
 * ahead (the "constellation train"). This is the middle magnification between the
 * whole-shell matrix and a single spacecraft — drill from a plane-column in the
 * fleet grid into the satellites that column represents, seen as a line on their
 * orbit, not an abstraction.
 *
 * The track is a gentle sinusoid (the orbit path); satellites sit along it slot
 * 0 → N-1 in flight order. The links are the honest mesh: each sat laser-links its
 * FORE and AFT in-plane neighbours (drawn along the track) and two CROSS-PLANE
 * neighbours in adjacent planes (short stubs above/below the track). The shaded
 * span is the eclipse the train is flying through; a sat inside it is in darkness.
 * Colour is health band; the picked sat is ringed; a click emits its slot. Motion
 * lives in the data the consumer pushes — re-set `.sats` each frame and the train
 * advances (PHILOSOPHY.md — selection is state, the eclipse span is real).
 *
 *   - SATS         `.sats` (imperative) — [{ band, eclipse?, selected? }] in slot
 *                  (flight) order. band 0|1|2.
 *   - ECLIPSE      `eclipse-from` / `eclipse-to` (0..1 along the track) shade the
 *                  shadow span.
 *   - SELECT       a click on a sat emits `talos:sat` { slot }.
 *
 * Attributes (reactive):
 *   slots         satellites in the plane                 (default 22)
 *   eclipse-from  shadow span start, 0..1                 (optional)
 *   eclipse-to    shadow span end, 0..1                   (optional)
 *   plane-label   short text label                        (optional)
 */
interface TrackSat {
    band: number;
    eclipse?: boolean;
    selected?: boolean;
}
declare class TalosPlane extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private svg;
    private _sats;
    /** Keyboard-focused slot (roving via arrow keys); -1 = none yet. */
    private _focus;
    private static readonly W;
    private static readonly MX;
    private static readonly AMP;
    private static readonly MIDY;
    constructor();
    set sats(v: TrackSat[]);
    get sats(): TrackSat[];
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    /**
     * Keyboard nav: Arrow Left/Right move a roving focus slot 0..n-1 (drawn with
     * the same selection ring); Enter/Space emit talos:sat for the focused slot.
     */
    private onKeydown;
    /** Track point at fraction t ∈ [0,1] along the lane. */
    private trackPt;
    private render;
}

export { TalosPlane as T, type TrackSat as a };
