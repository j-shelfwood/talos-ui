declare class TalosCompass extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private needle;
    private targetMark;
    private readout;
    private caption;
    private frame;
    private shown;
    constructor();
    private observer?;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Render immediately from the true heading (colour + readout are exact at
     *  once); the needle angle eases toward it via startEase(). */
    private update;
    /** A single persistent rAF that eases the displayed needle angle toward the
     *  live target each frame — the SHORT way around the dial. The ease runs on the
     *  signed shortest delta (350°→10° is +20°, not -340°), so the needle never
     *  takes the long way past S to get from W to N. Self-contained: it reads the
     *  attribute live, so there is no per-mutation tween state to cancel/restart. */
    private startEase;
    /** Polar→cartesian with 0° = NORTH (up) and angle increasing CLOCKWISE, the
     *  compass convention — distinct from the gauge's 0°=right/CW screen math. */
    private point;
    private render;
}

export { TalosCompass };
