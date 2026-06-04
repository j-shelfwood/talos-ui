import { PanelShapeBuilder, type Segment } from "./PanelShapeBuilder";

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
export class TalosPanel extends HTMLElement {
  static observedAttributes = [
    "panel-width",
    "panel-height",
    "fill",
    "edge",
    "stroke-width",
  ];

  private root: ShadowRoot;
  private svg!: SVGSVGElement;
  private path!: SVGPathElement;
  private observer?: MutationObserver;
  private frame = 0;
  private animatedOnce = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
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
          padding: 1rem;
        }
      </style>
      <svg part="svg" preserveAspectRatio="none">
        <path class="outline" part="outline" d=""></path>
      </svg>
      <div class="content"><slot></slot></div>
    `;
    this.svg = this.root.querySelector("svg")!;
    this.path = this.root.querySelector(".outline")!;
  }

  connectedCallback(): void {
    Promise.all([
      customElements.whenDefined("talos-corner"),
      customElements.whenDefined("talos-notch"),
    ]).then(() => {
      this.observer = new MutationObserver(() => this.scheduleRender());
      this.observer.observe(this, { childList: true, subtree: true });
      this.addEventListener("talos:decorator-changed", () => this.scheduleRender());
      this.render();
    });
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    cancelAnimationFrame(this.frame);
  }

  attributeChangedCallback(): void {
    this.scheduleRender();
  }

  /** Coalesce bursts of mutations into one render per frame. */
  private scheduleRender(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.render());
  }

  private dim(attr: string, fallback: number): number {
    const v = parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(v) ? v : fallback;
  }

  private render(): void {
    const width = this.dim("panel-width", 400);
    const height = this.dim("panel-height", 200);
    const strokeWidth = this.dim("stroke-width", 1);

    const fill = this.getAttribute("fill");
    const edge = this.getAttribute("edge");
    if (fill) this.style.setProperty("--_fill", fill);
    if (edge) this.style.setProperty("--_edge", edge);
    this.style.setProperty("--_stroke", String(strokeWidth));

    // The SVG outline is absolutely positioned, so it contributes no intrinsic
    // height. Reserve space from the panel's aspect ratio (and a min-height
    // floor) so a bare panel renders its chrome even when slotted content is
    // short — consumers can still override width/height via CSS.
    this.style.setProperty("aspect-ratio", `${width} / ${height}`);
    if (!this.style.minHeight) {
      this.style.minHeight = `${Math.min(height, 160)}px`;
    }

    const segments: Segment[] = [];
    for (const el of Array.from(this.children)) {
      const seg = (el as { toSegment?: () => Segment | null }).toSegment?.();
      if (seg) segments.push(seg);
    }

    const d = new PanelShapeBuilder({ width, height }).buildPath(segments);
    this.path.setAttribute("d", d);
    this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    if (this.hasAttribute("animate") && !this.animatedOnce) {
      this.animatedOnce = true;
      this.draw();
    }
  }

  private draw(): void {
    const duration = this.dim("animation-duration", 800);
    const len = this.path.getTotalLength();
    this.path.style.strokeDasharray = String(len);
    this.path.style.strokeDashoffset = String(len);
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      this.path.style.strokeDashoffset = String(len * (1 - p));
      if (p < 1) requestAnimationFrame(step);
      else this.path.style.strokeDashoffset = "0";
    };
    requestAnimationFrame(step);
  }
}
