/**
 * PanelShapeBuilder — constructs an SVG path string for a chamfered/notched
 * panel outline from a set of corner + notch segments.
 *
 * Ported from prj-talos-ui, stripped of all debug/console/drawing-step
 * scaffolding. Pure geometry: in → segments, out → SVG `d` string.
 */

export type Edge = "top" | "right" | "bottom" | "left";
export type CornerEdge = "top-left" | "top-right" | "bottom-right" | "bottom-left";

export interface Segment {
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

export interface PanelShapeOptions {
  width: number;
  height: number;
}

export class PanelShapeBuilder {
  private width: number;
  private height: number;

  constructor(opts: PanelShapeOptions) {
    this.width = opts.width;
    this.height = opts.height;
  }

  buildPath(segments: Segment[]): string {
    const corners: Record<CornerEdge, Segment | null> = {
      "top-left": null,
      "top-right": null,
      "bottom-right": null,
      "bottom-left": null,
    };
    const notches: Record<Edge, Segment | null> = {
      top: null,
      right: null,
      bottom: null,
      left: null,
    };

    for (const seg of segments) {
      if (seg.type === "corner" && seg.edge in corners) {
        corners[seg.edge as CornerEdge] = seg;
      } else if (seg.type === "notch" && seg.edge in notches) {
        notches[seg.edge as Edge] = seg;
      }
    }

    const tl = corners["top-left"]?.radius ?? 0;
    const tr = corners["top-right"]?.radius ?? 0;
    const br = corners["bottom-right"]?.radius ?? 0;
    const bl = corners["bottom-left"]?.radius ?? 0;

    const { width: w, height: h } = this;
    const cmds: string[] = [];
    const push = (cmd: string, ...pts: number[]) => cmds.push(`${cmd}${pts.join(",")}`);

    // Top edge
    push("M", tl, 0);
    this.notch(cmds, notches.top, "top", w, h);
    push("L", w - tr, 0);
    push("L", w, tr || 0);

    // Right edge
    this.notch(cmds, notches.right, "right", w, h);
    push("L", w, h - br);
    push("L", br ? w - br : w, h);

    // Bottom edge
    this.notch(cmds, notches.bottom, "bottom", w, h);
    push("L", bl, h);
    push("L", 0, bl ? h - bl : h);

    // Left edge
    this.notch(cmds, notches.left, "left", w, h);
    push("L", 0, tl);
    if (tl) push("L", tl, 0);

    return cmds.join(" ") + " Z";
  }

  private notch(
    cmds: string[],
    seg: Segment | null,
    edge: Edge,
    w: number,
    h: number,
  ): void {
    if (!seg) return;
    const nw = seg.width ?? 0;
    const nd = seg.depth ?? 0;
    if (nw <= 0 || nd <= 0) return;
    const push = (cmd: string, ...pts: number[]) => cmds.push(`${cmd}${pts.join(",")}`);

    if (edge === "top") {
      const s = (w - nw) / 2;
      push("L", s, 0);
      push("L", s, nd);
      push("L", s + nw, nd);
      push("L", s + nw, 0);
    } else if (edge === "right") {
      const s = (h - nw) / 2;
      push("L", w, s);
      push("L", w - nd, s);
      push("L", w - nd, s + nw);
      push("L", w, s + nw);
    } else if (edge === "bottom") {
      const s = (w - nw) / 2;
      push("L", s + nw, h);
      push("L", s + nw, h - nd);
      push("L", s, h - nd);
      push("L", s, h);
    } else {
      const s = (h - nw) / 2;
      push("L", 0, s + nw);
      push("L", nd, s + nw);
      push("L", nd, s);
      push("L", 0, s);
    }
  }
}
