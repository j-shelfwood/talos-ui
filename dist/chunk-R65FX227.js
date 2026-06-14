import {
  prefersReducedMotion
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-sheen.ts
var TalosSheen = class extends HTMLElement {
  static get observedAttributes() {
    return ["selector"];
  }
  onMove = (e) => this.track(e);
  onLeave = () => this.clear();
  bound = false;
  connectedCallback() {
    this.bind();
  }
  disconnectedCallback() {
    this.unbind();
  }
  attributeChangedCallback() {
    this.clear();
  }
  get sel() {
    return this.getAttribute("selector") ?? ".glass-panel";
  }
  bind() {
    if (this.bound) return;
    this.addEventListener("pointermove", this.onMove);
    this.addEventListener("pointerleave", this.onLeave, true);
    this.bound = true;
  }
  unbind() {
    if (!this.bound) return;
    this.removeEventListener("pointermove", this.onMove);
    this.removeEventListener("pointerleave", this.onLeave, true);
    this.bound = false;
  }
  /** Resolve the panel under the pointer and write the sheen custom props on it. */
  track(e) {
    const target = e.target?.closest?.(this.sel);
    if (!target || !this.contains(target)) {
      this.clear();
      this.lit = null;
      return;
    }
    if (this.lit && this.lit !== target) this.dim(this.lit);
    this.lit = target;
    const r = target.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const mx = (e.clientX - r.left) / r.width * 100;
    const my = (e.clientY - r.top) / r.height * 100;
    target.style.setProperty("--talos-mx", `${mx.toFixed(2)}%`);
    target.style.setProperty("--talos-my", `${my.toFixed(2)}%`);
    target.style.setProperty("--talos-sheen", prefersReducedMotion() ? "0" : "1");
  }
  lit = null;
  dim(el) {
    el.style.setProperty("--talos-sheen", "0");
  }
  clear() {
    if (this.lit) {
      this.dim(this.lit);
      this.lit = null;
    }
  }
};

export {
  TalosSheen
};
