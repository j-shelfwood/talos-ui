/**
 * <talos-histogram> — the DISTRIBUTION of one value across many units. Where a
 * gauge shows one aggregate and a matrix shows every unit's identity, a histogram
 * shows the *shape* of the population: how battery state-of-charge is spread
 * across a whole shell, how latency is distributed across gateways, where the
 * mass sits and where the tail is. Bar height = how many units fall in that
 * bucket; bar colour = the health band of that bucket's value range. So a cohort
 * of satellites sliding into eclipse appears as a bump migrating toward the red
 * end — the motion of the distribution IS the telemetry (PHILOSOPHY.md).
 *
 *   - VALUES   `.values` (imperative) — the raw population; the element buckets
 *              it into `bins` buckets across [min, max].
 *   - BANDS    each bucket is coloured by where its CENTRE falls against
 *              warn/crit (same threshold + invert model as the other
 *              instruments) — so the red bars are the unhealthy part of the
 *              distribution, not a fixed palette.
 *   - HONEST   colour + bar position carry the meaning in a static frame; there
 *              is no motion-only information here.
 *
 * Attributes (reactive):
 *   bins        number of buckets                       (default 24)
 *   min / max   value range to bucket across            (default 0 / 100)
 *   warn / crit band thresholds for bar colour          (optional)
 *   invert      low = bad                               (flag)
 *   label       accessible label                        (optional)
 */
declare class TalosHistogram extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private gBars;
    private _values;
    constructor();
    set values(v: ArrayLike<number>);
    get values(): ArrayLike<number>;
    connectedCallback(): void;
    attributeChangedCallback(): void;
    private render;
}

export { TalosHistogram };
