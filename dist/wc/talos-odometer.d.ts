declare class TalosOdometer extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private out;
    private caption;
    private unitEl;
    /** The digit/separator string currently displayed (settled target). */
    private shown;
    constructor();
    private observer?;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Imperative setter. */
    set(value: number): void;
    private currentValue;
    private onAttrs;
    private paintStatic;
    /** role=status + the true number, so assistive tech never reads a mid-roll
     *  frame. aria-live polite: a running total is status, announced unobtrusively. */
    private reflectAria;
    /** Present the integer: zero-pad to `digits`, optional thousands grouping. */
    private format;
    /** Build the row from scratch: one .digit window per digit (strip 0..9,0), a
     *  .sep span per non-digit. `immediate` snaps the strip with no transition. */
    private build;
    /** A single digit column: a strip of 0..9 then 0, offset to `d`. The trailing
     *  0 means a 9→0 change rolls one cell DOWNWARD (forward), never 9 cells back. */
    private makeDigit;
    /** Same-width update: for each digit cell, slide its strip to the new glyph.
     *  9→0 advances to the trailing 0 (translateY(-10em)) so the roll goes the
     *  right way, then snaps back to the canonical -0em after the transition. */
    private roll;
}

export { TalosOdometer };
