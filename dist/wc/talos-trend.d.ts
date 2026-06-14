declare class TalosTrend extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private line;
    private area;
    private dot;
    private readout;
    private caption;
    private buf;
    private frame;
    constructor();
    private observer?;
    private lastValueAttr;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Append a sample and scroll the window. Preferred entry for streams. */
    push(value: number): void;
    private scheduleRender;
    private band;
    private render;
    /** A word for the recent direction, so the static a11y label carries the
     *  same information the moving line does. */
    private trendWord;
}

export { TalosTrend };
