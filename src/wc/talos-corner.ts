import type { Segment } from "./PanelShapeBuilder";

/**
 * <talos-corner edge="top-left" radius="16">
 * Declarative chamfer decorator. Pure data carrier — renders nothing itself;
 * its parent <talos-panel> reads toSegment() to build the outline.
 */
export class TalosCorner extends HTMLElement {
  static observedAttributes = ["edge", "radius"];

  attributeChangedCallback(): void {
    this.closest("talos-panel")?.dispatchEvent(
      new CustomEvent("talos:decorator-changed", { bubbles: true }),
    );
  }

  toSegment(): Segment | null {
    const edge = this.getAttribute("edge") ?? "";
    const valid = ["top-left", "top-right", "bottom-right", "bottom-left"];
    if (!valid.includes(edge)) return null;
    const radius = parseFloat(this.getAttribute("radius") ?? "16");
    if (!Number.isFinite(radius) || radius <= 0) return null;
    return { type: "corner", edge, radius };
  }
}
