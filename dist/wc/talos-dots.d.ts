/**
 * <talos-dots> — a dot-matrix: a discrete COUNT shown as filled-of-total marks.
 * The honest form for small countable quantities (active jobs, stalls, retries,
 * errors, depth) where a bar would imply a continuous magnitude against a fake
 * ceiling. Here the ceiling is real and small, and each mark is one unit — you
 * can literally count them (countable marks, not estimated length).
 *
 *   - QUANTITY   `value` of `total` dots are lit.
 *   - COLOUR     the lit dots take the band of `value` — colour is the state.
 *                Honours `invert` (low = bad) like every instrument.
 *   - HONEST     no animation to lose; a frozen frame shows the exact count.
 *
 * Attributes:
 *   value        number of lit dots                     (default 0)
 *   total        number of dots                         (default 8)
 *   warn / crit  band thresholds on `value`             (optional)
 *   invert       low = bad                              (optional)
 */
declare class TalosDots extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private wrap;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(): void;
    private render;
}

export { TalosDots };
