declare class TalosGauge extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private arc;
    private needle;
    private readout;
    private caption;
    private frame;
    private shown;
    constructor();
    private observer?;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Render immediately from the true value (colour + readout are exact at once);
     *  the needle position eases toward it via startEase(). */
    private update;
    /** A single persistent rAF that eases `shown` toward the live target each
     *  frame. Self-contained — it reads the attribute live, so no per-mutation
     *  tween state to cancel/restart (the old approach deadlocked under rapid
     *  updates). Runs until disconnect. */
    private startEase;
    /** Which band the value falls in — this is the state, and it drives colour. */
    private band;
    /** Polar→cartesian on the dial circle, angle in degrees (0 = right, CW). */
    private point;
    private arcPath;
    private render;
}

export { TalosGauge };
