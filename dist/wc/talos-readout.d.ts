declare class TalosReadout extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private out;
    private caption;
    private frame;
    private scrambleStart;
    private toText;
    private lastValue;
    private static readonly GLYPHS;
    constructor();
    private observer?;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private onAttrs;
    /** Band tint, only meaningful for numeric values — uses the shared bandOf()
     *  helper (bands.ts), so threshold + invert semantics match gauge/meter. A
     *  non-numeric value has no band: it stays neutral foreground. */
    private renderBand;
    private renderCaption;
    private startScramble;
    /** Progressive left-to-right resolve: characters before the progress index are
     *  the real value; the rest are random glyphs. Same shape as the reference. */
    private frameText;
    private paint;
    private escape;
}

export { TalosReadout };
