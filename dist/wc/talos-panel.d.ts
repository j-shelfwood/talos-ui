/**
 * <talos-panel> — chamfered/notched panel rendered as an SVG outline, with
 * slotted content on top. Monochrome: hairline white-on-black border, dark
 * fill. No glow, no neon. Shape composes from child <talos-corner> /
 * <talos-notch> decorators.
 *
 * Attributes:
 *   panel-width / panel-height : viewBox dimensions (default 400 / 200)
 *   fill        : panel fill color   (default var(--talos-hud-fill))
 *   edge        : border color       (default var(--talos-hud-edge))
 *   stroke-width: border width px     (default 1)
 *   animate     : if present, stroke-draws the outline on first render
 *   animation-duration : ms (default 800)
 *
 * The default (no decorators) is a plain rectangle, matching .glass-panel
 * geometry intent. Add decorators to cut corners or notch edges.
 */
declare class TalosPanel extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private svg;
    private path;
    private content;
    private observer?;
    private frame;
    private animatedOnce;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    /** Coalesce bursts of mutations into one render per frame. */
    private scheduleRender;
    private dim;
    private render;
    /**
     * Grow content padding on any edge that carries a notch, so slotted content
     * clears the cut instead of colliding with the plunged border.
     *
     * The notch `depth` is in viewBox units; the SVG fills the host with
     * `preserveAspectRatio="none"`, so depth scales per-axis to rendered px:
     * top/bottom notches live on the height axis, left/right on the width axis.
     * Each side resets to the base `--_pad` first, then takes max(base, depth)
     * so removing a notch restores the base and a shallow notch never shrinks it.
     */
    private reserveNotchPadding;
    private draw;
}

export { TalosPanel };
