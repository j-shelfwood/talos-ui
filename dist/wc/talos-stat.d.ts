/**
 * <talos-stat> — a labelled statistic cell: an eyebrow label, a big number, an
 * optional unit, and a default slot for supporting instruments (a <talos-spark>,
 * <talos-delta>, <talos-dots>). The atom of a console wall — many of these in a
 * grid IS the dashboard, each one doing semantic work.
 *
 *   - VALUE     the big number; on change it COUNTS to the new figure (the honest
 *               motion for a changing magnitude — the animation depicts the
 *               transition, not decoration). Snaps under prefers-reduced-motion.
 *   - COLOUR    the number takes the band of `value` when warn/crit are set —
 *               colour is the state. Honours `invert` (low = bad).
 *
 * Attributes:
 *   value        the figure                              (default 0)
 *   label        eyebrow caption                         (optional)
 *   unit         appended after the number               (optional)
 *   precision    decimals for the displayed value        (default 0)
 *   warn / crit  band thresholds                         (optional)
 *   invert       low = bad                               (optional)
 *   duration     count animation ms                      (default 500)
 *
 * Imperative API: el.set(value).
 */
declare class TalosStat extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private numEl;
    private labelEl;
    private unitEl;
    private shown;
    private frame;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string): void;
    /** Imperative setter. */
    set(value: number): void;
    private paintStatic;
    private setBand;
    private render;
}

export { TalosStat };
