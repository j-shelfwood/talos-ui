/**
 * <talos-matrix> — a dense N×M cell grid where each cell's COLOUR is a banded
 * value. The honest form for "the health of many homogeneous units at a glance":
 * a satellite shell (planes × slots), a disk array, a rack of nodes, a sensor
 * wall. Each cell is one unit; its colour is that unit's band (nominal / warning
 * / critical), so the whole field reads as one picture — where the trouble is,
 * and how much of it (PHILOSOPHY.md, principle 4: density is a feature, the
 * colour does semantic work).
 *
 * Canvas-rendered: at shell scale (72 × 22 = 1,584 cells, repainting live) a DOM
 * node per cell would thrash layout, so the grid is one <canvas>. The picture is
 * still honest — colour = band, position = unit identity.
 *
 *   - CELLS      `.cells` (imperative) — an array / TypedArray of values, row-
 *                major (length = cols × rows). Each value is banded by warn/crit.
 *   - TERMINATOR `terminator` (0..1) marks a shadow band sweeping across the grid
 *                — e.g. the day/night line crossing an orbital shell. Cells inside
 *                the band are dimmed (still their colour, just darker: they are
 *                in eclipse, not unknown). `terminator-width` is the band's width
 *                as a fraction of the grid (default 0.35). Drop the attribute and
 *                there is no shadow. The sweep is MOTION = TELEMETRY: it shows the
 *                terminator advancing, not a decorative shimmer.
 *   - HONEST     under prefers-reduced-motion the cells still carry full colour;
 *                the consumer simply stops advancing `terminator` (the band holds
 *                at its last position — a valid static reading of who is in
 *                shadow). aria-label summarises the band counts.
 *
 * Attributes (reactive):
 *   cols / rows        grid dimensions                      (default 72 / 22)
 *   warn / crit        band thresholds on each cell value   (default 70 / 90)
 *   invert             low = bad                            (flag)
 *   terminator         shadow-band centre, 0..1             (optional)
 *   terminator-width   shadow-band width fraction           (default 0.35)
 *   gap                px gap between cells                  (default 1)
 *   label              accessible label                     (optional)
 */
declare class TalosMatrix extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private canvas;
    private ctx;
    private _cells;
    private _highlight;
    /** Keyboard-focused cell index (roving via arrow keys); -1 = none yet. */
    private _focus;
    private _layout;
    private ro?;
    private raf;
    constructor();
    /** Imperative data API — set the cell values (row-major, length cols×rows). */
    set cells(v: ArrayLike<number>);
    get cells(): ArrayLike<number>;
    /**
     * Highlight a plane (a whole column, `{col}`) or a single cell (`{index}`),
     * drawn as an outline over the grid — the selection an operator drilled into.
     * Set null to clear. Selection is state (PHILOSOPHY.md), so the outline is
     * bound to a real choice, not decoration.
     */
    set highlight(v: {
        col?: number;
        index?: number;
    } | null);
    get highlight(): {
        col?: number;
        index?: number;
    } | null;
    connectedCallback(): void;
    /** Arrow keys move a roving focus cell; Enter/Space emit talos:cell for it. */
    private onKeydown;
    /** Invert a click's px → (col,row,index) and emit talos:cell. */
    private onClick;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    private schedule;
    /** Resolve a CSS colour var to an rgb string the canvas can use. */
    private colour;
    private draw;
    private summary;
    private roundRect;
}

export { TalosMatrix };
