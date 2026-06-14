declare class TalosRange extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private bandEl;
    private marker;
    private setpointEl;
    private readout;
    private caption;
    private frame;
    private shown;
    constructor();
    private observer?;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Render immediately from the true value (colour + readout exact at once). */
    private update;
    /** Persistent rAF easing `shown` toward the live target each frame. */
    private startEase;
    /**
     * Resolve the band for `value`. Local rule (NOT bandOf — the contract here is
     * the tolerance window, not a single rising/falling threshold):
     *   inside [low, high] → nominal; outside but on the rail → warning; beyond
     *   the outer warn/crit thresholds or off the rail → critical.
     */
    private band;
    private frac;
    private render;
}

export { TalosRange };
