import type { Segment } from "./PanelShapeBuilder";

/**
 * <talos-notch edge="top" width="60" depth="20">
 * Declarative edge cut-out. Pure data carrier — its parent <talos-panel>
 * reads toSegment() to build the outline.
 */
export class TalosNotch extends HTMLElement {
  static observedAttributes = ["edge", "width", "depth"];

  attributeChangedCallback(): void {
    this.closest("talos-panel")?.dispatchEvent(
      new CustomEvent("talos:decorator-changed", { bubbles: true }),
    );
  }

  toSegment(): Segment | null {
    const edge = this.getAttribute("edge") ?? "";
    if (!["top", "right", "bottom", "left"].includes(edge)) return null;
    const width = parseFloat(this.getAttribute("width") ?? "60");
    const depth = parseFloat(this.getAttribute("depth") ?? "20");
    if (!Number.isFinite(width) || width <= 0) return null;
    if (!Number.isFinite(depth) || depth <= 0) return null;
    return { type: "notch", edge, width, depth };
  }
}
