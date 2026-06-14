// src/wc/talos-notch.ts
var TalosNotch = class extends HTMLElement {
  static get observedAttributes() {
    return ["edge", "width", "depth"];
  }
  attributeChangedCallback() {
    this.closest("talos-panel")?.dispatchEvent(
      new CustomEvent("talos:decorator-changed", { bubbles: true, composed: true })
    );
  }
  toSegment() {
    const edge = this.getAttribute("edge") ?? "";
    if (!["top", "right", "bottom", "left"].includes(edge)) return null;
    const width = parseFloat(this.getAttribute("width") ?? "60");
    const depth = parseFloat(this.getAttribute("depth") ?? "20");
    if (!Number.isFinite(width) || width <= 0) return null;
    if (!Number.isFinite(depth) || depth <= 0) return null;
    return { type: "notch", edge, width, depth };
  }
};

export {
  TalosNotch
};
