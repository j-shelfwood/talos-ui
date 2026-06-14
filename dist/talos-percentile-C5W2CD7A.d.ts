/**
 * The imperative payload for the live case. p50/p90/p99 are the canonical
 * required summary; the interquartile box (p25/p75) and the low whisker (p05)
 * are optional and only drawn when supplied.
 */
interface PercentileStats {
    p50: number;
    p90: number;
    p99: number;
    p25?: number;
    p75?: number;
    p05?: number;
}
declare class TalosPercentile extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private gBox;
    private gWhisker;
    private gMarks;
    constructor();
    /** Imperative override for the live case. Attributes still render when no
     *  override is set; calling `.stats = …` takes precedence. */
    private _stats;
    set stats(s: PercentileStats | null);
    get stats(): PercentileStats | null;
    connectedCallback(): void;
    attributeChangedCallback(): void;
    /** Resolve a percentile from the imperative override first, then attributes. */
    private pct;
    private band;
    private render;
}

export { type PercentileStats as P, TalosPercentile as T };
