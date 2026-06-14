/**
 * <talos-spark> — a compact inline sparkline. The small sibling of <talos-trend>:
 * a value stream rendered as a polyline where POSITION/LENGTH carry the shape and
 * slope (the most perceptually-accurate channels — Cleveland & McGill). Use it
 * inside a stat cell or a dense readout where a full trend would be too large.
 *
 *   - SHAPE   the recent series, scaled to [min,max] over the buffer width.
 *   - COLOUR  the band of the CURRENT (last) value drives the stroke — colour
 *             IS the state. Honours `invert` (low = bad) like every instrument.
 *   - LIVE    push(v) appends a sample; or set the `data` attribute to a
 *             comma/space list. A frozen frame still shows the shape (motion
 *             test) — there is no animation to lose under reduced-motion.
 *
 * Attributes:
 *   data          initial series, comma/space separated   (optional)
 *                 (`points` is accepted as a deprecated alias)
 *   min / max     domain for the y-scale                  (default 0 / 100)
 *   warn / crit   band thresholds on the current value    (optional)
 *   invert        low = bad (flips band direction)        (optional)
 *   cap           max samples retained                    (default 32)
 *   fill          if present, fill under the line
 *
 * Imperative API: el.push(value) — preferred for streams.
 */
declare class TalosSpark extends HTMLElement {
    static get observedAttributes(): string[];
    /** The seed series: canonical `data=`, with `points=` as a deprecated alias. */
    private seedAttr;
    private root;
    private svg;
    private line;
    private area;
    private buf;
    private frame;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string): void;
    /** Append a sample and re-render (the streaming entry point). */
    push(value: number): void;
    private schedule;
    private render;
}

export { TalosSpark };
