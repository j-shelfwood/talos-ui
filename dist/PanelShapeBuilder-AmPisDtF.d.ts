/**
 * PanelShapeBuilder — constructs an SVG path string for a chamfered/notched
 * panel outline from a set of corner + notch segments.
 *
 * Ported from prj-talos-ui, stripped of all debug/console/drawing-step
 * scaffolding. Pure geometry: in → segments, out → SVG `d` string.
 */
type Edge = "top" | "right" | "bottom" | "left";
type CornerEdge = "top-left" | "top-right" | "bottom-right" | "bottom-left";
interface Segment {
    type: "corner" | "notch";
    /** Corners: "top-left" | "top-right" | "bottom-right" | "bottom-left".
     *  Notches: "top" | "right" | "bottom" | "left". */
    edge: string;
    /** Corner only — chamfer length (px). */
    radius?: number;
    /** Notch only. */
    width?: number;
    depth?: number;
}
interface PanelShapeOptions {
    width: number;
    height: number;
}
declare class PanelShapeBuilder {
    private width;
    private height;
    constructor(opts: PanelShapeOptions);
    buildPath(segments: Segment[]): string;
    private notch;
}

export { type CornerEdge as C, type Edge as E, PanelShapeBuilder as P, type Segment as S, type PanelShapeOptions as a };
