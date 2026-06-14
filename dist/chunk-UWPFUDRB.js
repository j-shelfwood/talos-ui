// src/wc/talos-corner.ts
var TalosCorner = class extends HTMLElement {
  static get observedAttributes() {
    return ["edge", "radius"];
  }
  attributeChangedCallback() {
    this.closest("talos-panel")?.dispatchEvent(
      new CustomEvent("talos:decorator-changed", { bubbles: true, composed: true })
    );
  }
  toSegment() {
    const edge = this.getAttribute("edge") ?? "";
    const valid = ["top-left", "top-right", "bottom-right", "bottom-left"];
    if (!valid.includes(edge)) return null;
    const radius = parseFloat(this.getAttribute("radius") ?? "16");
    if (!Number.isFinite(radius) || radius <= 0) return null;
    return { type: "corner", edge, radius };
  }
};

export {
  TalosCorner
};
