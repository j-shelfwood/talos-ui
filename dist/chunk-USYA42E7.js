import {
  prefersReducedMotion
} from "./chunk-7SB3FGYG.js";

// src/wc/PanelShapeBuilder.ts
var PanelShapeBuilder = class {
  width;
  height;
  constructor(opts) {
    this.width = opts.width;
    this.height = opts.height;
  }
  buildPath(segments) {
    const corners = {
      "top-left": null,
      "top-right": null,
      "bottom-right": null,
      "bottom-left": null
    };
    const notches = {
      top: null,
      right: null,
      bottom: null,
      left: null
    };
    for (const seg of segments) {
      if (seg.type === "corner" && seg.edge in corners) {
        corners[seg.edge] = seg;
      } else if (seg.type === "notch" && seg.edge in notches) {
        notches[seg.edge] = seg;
      }
    }
    const tl = corners["top-left"]?.radius ?? 0;
    const tr = corners["top-right"]?.radius ?? 0;
    const br = corners["bottom-right"]?.radius ?? 0;
    const bl = corners["bottom-left"]?.radius ?? 0;
    const { width: w, height: h } = this;
    const cmds = [];
    const push = (cmd, ...pts) => cmds.push(`${cmd}${pts.join(",")}`);
    push("M", tl, 0);
    this.notch(cmds, notches.top, "top", w, h);
    push("L", w - tr, 0);
    push("L", w, tr || 0);
    this.notch(cmds, notches.right, "right", w, h);
    push("L", w, h - br);
    push("L", br ? w - br : w, h);
    this.notch(cmds, notches.bottom, "bottom", w, h);
    push("L", bl, h);
    push("L", 0, bl ? h - bl : h);
    this.notch(cmds, notches.left, "left", w, h);
    push("L", 0, tl);
    if (tl) push("L", tl, 0);
    return cmds.join(" ") + " Z";
  }
  notch(cmds, seg, edge, w, h) {
    if (!seg) return;
    const nw = seg.width ?? 0;
    const nd = seg.depth ?? 0;
    if (nw <= 0 || nd <= 0) return;
    const push = (cmd, ...pts) => cmds.push(`${cmd}${pts.join(",")}`);
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
};

// src/wc/talos-panel.ts
var TalosPanel = class extends HTMLElement {
  static get observedAttributes() {
    return ["panel-width", "panel-height", "fill", "edge", "stroke-width"];
  }
  root;
  svg;
  path;
  content;
  observer;
  frame = 0;
  animatedOnce = false;
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
      <style>
        :host {
          display: inline-block;
          position: relative;
          box-sizing: border-box;
          --_fill: var(--talos-hud-fill, hsl(0 0% 5%));
          --_edge: var(--talos-hud-edge, hsl(0 0% 100% / 0.28));
          --_stroke: 1;
        }
        svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
          pointer-events: none;
        }
        .outline {
          fill: var(--_fill);
          stroke: var(--_edge);
          stroke-width: var(--_stroke);
          stroke-linejoin: miter;
          vector-effect: non-scaling-stroke;
        }
        ::slotted(*) { position: relative; }
        .content {
          position: relative;
          z-index: 1;
          /* Base padding; each side is grown by the rendered depth of a notch
             cut into that edge so slotted content never collides with the
             border (set per-edge in render()). Consumers can raise the floor
             via --talos-panel-pad. */
          --_pad: var(--talos-panel-pad, 1rem);
          padding: var(--_pad);
        }
      </style>
      <svg part="svg" preserveAspectRatio="none">
        <path class="outline" part="outline" d=""></path>
      </svg>
      <div class="content"><slot></slot></div>
    `;
    this.svg = this.root.querySelector("svg");
    this.path = this.root.querySelector(".outline");
    this.content = this.root.querySelector(".content");
  }
  connectedCallback() {
    Promise.all([
      customElements.whenDefined("talos-corner"),
      customElements.whenDefined("talos-notch")
    ]).then(() => {
      this.observer = new MutationObserver(() => this.scheduleRender());
      this.observer.observe(this, { childList: true, subtree: true });
      this.addEventListener("talos:decorator-changed", () => this.scheduleRender());
      this.render();
    });
  }
  disconnectedCallback() {
    this.observer?.disconnect();
    cancelAnimationFrame(this.frame);
  }
  attributeChangedCallback() {
    this.scheduleRender();
  }
  /** Coalesce bursts of mutations into one render per frame. */
  scheduleRender() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.render());
  }
  dim(attr, fallback) {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }
  render() {
    const width = this.dim("panel-width", 400);
    const height = this.dim("panel-height", 200);
    const strokeWidth = this.dim("stroke-width", 1);
    const fill = this.getAttribute("fill");
    const edge = this.getAttribute("edge");
    if (fill) this.style.setProperty("--_fill", fill);
    if (edge) this.style.setProperty("--_edge", edge);
    this.style.setProperty("--_stroke", String(strokeWidth));
    this.style.setProperty("aspect-ratio", `${width} / ${height}`);
    if (!this.style.minHeight) {
      this.style.minHeight = `${Math.min(height, 160)}px`;
    }
    const segments = [];
    for (const el of Array.from(this.children)) {
      const seg = el.toSegment?.();
      if (seg) segments.push(seg);
    }
    const d = new PanelShapeBuilder({ width, height }).buildPath(segments);
    this.path.setAttribute("d", d);
    this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.reserveNotchPadding(segments, width, height);
    if (this.hasAttribute("animate") && !this.animatedOnce && !prefersReducedMotion()) {
      this.animatedOnce = true;
      this.draw();
    }
  }
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
  reserveNotchPadding(segments, vbWidth, vbHeight) {
    const rect = this.getBoundingClientRect();
    const sx = vbWidth > 0 ? rect.width / vbWidth : 1;
    const sy = vbHeight > 0 ? rect.height / vbHeight : 1;
    const sides = ["Top", "Right", "Bottom", "Left"];
    for (const side of sides) this.content.style[`padding${side}`] = "";
    for (const seg of segments) {
      if (seg.type !== "notch") continue;
      const depth = seg.depth ?? 0;
      if (depth <= 0) continue;
      const horizontal = seg.edge === "left" || seg.edge === "right";
      const px = depth * (horizontal ? sx : sy);
      const side = seg.edge === "top" ? "Top" : seg.edge === "right" ? "Right" : seg.edge === "bottom" ? "Bottom" : "Left";
      this.content.style[`padding${side}`] = `calc(var(--_pad) + ${px}px)`;
    }
  }
  draw() {
    const duration = this.dim("animation-duration", 800);
    const len = this.path.getTotalLength();
    this.path.style.strokeDasharray = String(len);
    this.path.style.strokeDashoffset = String(len);
    const start = performance.now();
    const step = (t) => {
      const p = Math.min((t - start) / duration, 1);
      this.path.style.strokeDashoffset = String(len * (1 - p));
      if (p < 1) requestAnimationFrame(step);
      else this.path.style.strokeDashoffset = "0";
    };
    requestAnimationFrame(step);
  }
};

export {
  PanelShapeBuilder,
  TalosPanel
};
