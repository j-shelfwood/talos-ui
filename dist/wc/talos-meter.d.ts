declare class TalosMeter extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private fill;
    private ticksEl;
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
    private band;
    private render;
}

export { TalosMeter };
