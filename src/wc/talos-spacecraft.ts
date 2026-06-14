/**
 * <talos-spacecraft> — a single satellite drawn as its physical anatomy, where
 * each part IS an instrument. The deepest magnification of the drill-down: after
 * the fleet, a plane, and one satellite's neighbourhood, this is the spacecraft
 * itself — central bus, GPU/compute payload, two solar wings, two radiator
 * panels, a downlink antenna — each a selectable hotspot whose COLOUR is that
 * subsystem's health band and whose selection surfaces its live stats. This is
 * the thesis at its purest (PHILOSOPHY.md): the form of the object is the readout,
 * every part bound to a real signal, nothing decorative.
 *
 *   - PARTS    `.parts` (imperative) — a record keyed by part id, each
 *              { value?, band } where band is 0|1|2 (nominal|warning|critical).
 *              Keys: bus, gpu, solarL, solarR, radL, radR, antenna. Unset parts
 *              read nominal.
 *   - SELECT   a click on a part emits `talos:part` { part }. The `selected`
 *              attribute (a part id) outlines that part.
 *   - ECLIPSE  the `eclipse` flag dims the solar wings — they make no power in
 *              shadow, an honest state, not a style.
 *
 * Attributes (reactive):
 *   selected   the highlighted part id            (optional)
 *   eclipse    solar wings dark (no sun)          (flag)
 *   label      accessible label                   (optional)
 */
export type PartState = { value?: number; band?: number };
export type Parts = Record<string, PartState>;

const PART_IDS = ["bus", "gpu", "solarL", "solarR", "radL", "radR", "antenna"] as const;

export class TalosSpacecraft extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["selected", "eclipse", "label"];
  }

  private root: ShadowRoot;
  private svg: SVGSVGElement;
  private _parts: Parts = {};

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          --_nominal: var(--talos-success, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(38 92% 60%));
          --_critical: var(--talos-danger, hsl(0 80% 62%));
          --_body: var(--talos-hud-fill, hsl(0 0% 8%));
          --_edge: var(--talos-hud-edge, hsl(0 0% 100% / 0.28));
          --_fg: var(--talos-foreground, #e7e9ec);
          --_muted: var(--talos-muted-foreground, hsl(0 0% 60%));
          display: block; width: 100%;
          font-family: var(--talos-font-display, system-ui);
        }
        svg { display: block; width: 100%; height: 100%; overflow: visible; }
        .part { cursor: pointer; transition: opacity 160ms ease; }
        .part rect, .part path, .part circle { transition: fill 200ms ease, stroke 160ms ease; }
        .body { fill: var(--_body); stroke: var(--_edge); stroke-width: 1; }
        .accent { stroke: var(--_band, var(--_nominal)); }
        .panel { fill: var(--_body); stroke: var(--_band, var(--_nominal)); stroke-width: 1.5; }
        .fillband { fill: var(--_band, var(--_nominal)); }
        .grid { stroke: var(--_band, var(--_nominal)); stroke-width: 0.5; opacity: 0.5; }
        .sel-outline { fill: none; stroke: var(--_fg); stroke-width: 1.5; stroke-dasharray: 3 2; pointer-events: none; }
        .lead { stroke: var(--_edge); stroke-width: 0.75; }
        .tag { font-size: 5px; letter-spacing: 0.4px; text-transform: uppercase; fill: var(--_muted); }
        .part:hover { opacity: 0.85; }
        .eclipse .wing .fillband { opacity: 0.25; }
      </style>
      <svg part="svg" viewBox="0 0 200 130" preserveAspectRatio="xMidYMid meet"></svg>`;
    this.svg = this.root.querySelector("svg")!;
  }

  set parts(v: Parts) {
    this._parts = v || {};
    this.render();
  }
  get parts(): Parts {
    return this._parts;
  }

  connectedCallback(): void {
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "0");
    this.addEventListener("keydown", this.onKeydown);
    this.render();
  }
  disconnectedCallback(): void {
    this.removeEventListener("keydown", this.onKeydown);
  }
  attributeChangedCallback(): void { this.render(); }

  /**
   * Keyboard nav: Arrow keys cycle the `selected` part through PART_IDS (reusing
   * the existing selection-outline highlight); Enter/Space emit talos:part.
   */
  private onKeydown = (e: KeyboardEvent): void => {
    const cur = this.getAttribute("selected");
    let i = PART_IDS.indexOf(cur as (typeof PART_IDS)[number]);
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        i = i < 0 ? 0 : (i + 1) % PART_IDS.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        i = i < 0 ? PART_IDS.length - 1 : (i - 1 + PART_IDS.length) % PART_IDS.length;
        break;
      case "Enter":
      case " ": {
        if (i < 0) return;
        e.preventDefault();
        this.dispatchEvent(new CustomEvent("talos:part", { detail: { part: PART_IDS[i] }, bubbles: true, composed: true }));
        return;
      }
      default: return;
    }
    e.preventDefault();
    this.setAttribute("selected", PART_IDS[i]); // reflects → render via observer
  };

  private bandColour(band?: number): string {
    return band === 2 ? "var(--_critical)" : band === 1 ? "var(--_warning)" : "var(--_nominal)";
  }

  private render(): void {
    const NS = "http://www.w3.org/2000/svg";
    const sel = this.getAttribute("selected");
    const eclipse = this.hasAttribute("eclipse");
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
    this.svg.setAttribute("class", eclipse ? "eclipse" : "");

    // Geometry: a flat-panel sat, top view. [x,y,w,h] boxes per part.
    const G: Record<string, [number, number, number, number]> = {
      solarL: [8, 46, 64, 30],
      solarR: [128, 46, 64, 30],
      bus: [78, 40, 44, 42],
      gpu: [88, 48, 24, 26],
      radL: [78, 86, 20, 26],
      radR: [102, 86, 20, 26],
    };

    const mk = (tag: string, attrs: Record<string, string>) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    };
    const group = (id: string): SVGGElement => {
      const g = mk("g", { class: "part", "data-part": id }) as SVGGElement;
      const band = this.bandColour(this._parts[id]?.band);
      g.style.setProperty("--_band", band);
      g.addEventListener("click", () =>
        this.dispatchEvent(new CustomEvent("talos:part", { detail: { part: id }, bubbles: true, composed: true })));
      this.svg.appendChild(g);
      return g;
    };

    // Solar wings — panel with cell grid; the fill band is its power band.
    for (const id of ["solarL", "solarR"] as const) {
      const [x, y, w, h] = G[id];
      const g = group(id);
      g.classList.add("wing");
      g.appendChild(mk("rect", { x: `${x}`, y: `${y}`, width: `${w}`, height: `${h}`, class: "panel" }));
      // a thin band strip at the inner edge encodes the power level/colour
      g.appendChild(mk("rect", { x: `${id === "solarL" ? x + w - 3 : x}`, y: `${y}`, width: "3", height: `${h}`, class: "fillband" }));
      // cell grid lines
      for (let c = 1; c < 5; c++) g.appendChild(mk("line", { x1: `${x + (w / 5) * c}`, y1: `${y}`, x2: `${x + (w / 5) * c}`, y2: `${y + h}`, class: "grid" }));
      g.appendChild(mk("line", { x1: `${x}`, y1: `${y + h / 2}`, x2: `${x + w}`, y2: `${y + h / 2}`, class: "grid" }));
    }

    // Radiator panels — fin grid; band = thermal band.
    for (const id of ["radL", "radR"] as const) {
      const [x, y, w, h] = G[id];
      const g = group(id);
      g.appendChild(mk("rect", { x: `${x}`, y: `${y}`, width: `${w}`, height: `${h}`, class: "panel" }));
      for (let c = 1; c < 5; c++) g.appendChild(mk("line", { x1: `${x}`, y1: `${y + (h / 5) * c}`, x2: `${x + w}`, y2: `${y + (h / 5) * c}`, class: "grid" }));
    }

    // Bus body.
    {
      const [x, y, w, h] = G.bus;
      const g = group("bus");
      g.appendChild(mk("rect", { x: `${x}`, y: `${y}`, width: `${w}`, height: `${h}`, class: "body" }));
    }
    // GPU/compute payload (inside the bus) — band fill = compute/thermal band.
    {
      const [x, y, w, h] = G.gpu;
      const g = group("gpu");
      const band = this.bandColour(this._parts.gpu?.band);
      g.appendChild(mk("rect", { x: `${x}`, y: `${y}`, width: `${w}`, height: `${h}`, class: "panel" }));
      // die grid hint
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
        g.appendChild(mk("rect", { x: `${x + 3 + c * 6.5}`, y: `${y + 3 + r * 7}`, width: "4.5", height: "4.5", fill: band, opacity: "0.65" }));
    }

    // Antenna — a dish on a short boom below the bus.
    {
      const g = group("antenna");
      g.appendChild(mk("line", { x1: "100", y1: "82", x2: "100", y2: "96", class: "lead" }));
      const band = this.bandColour(this._parts.antenna?.band);
      const dish = mk("path", { d: "M92 100 A10 10 0 0 1 108 100 Z", fill: "var(--_body)", stroke: band, "stroke-width": "1.5" });
      g.appendChild(dish);
      g.appendChild(mk("circle", { cx: "100", cy: "98", r: "1.6", fill: band }));
    }

    // Selection outline around the chosen part.
    if (sel && G[sel]) {
      const [x, y, w, h] = G[sel];
      this.svg.appendChild(mk("rect", { x: `${x - 2}`, y: `${y - 2}`, width: `${w + 4}`, height: `${h + 4}`, class: "sel-outline" }));
    } else if (sel === "antenna") {
      this.svg.appendChild(mk("rect", { x: "88", y: "88", width: "24", height: "24", class: "sel-outline" }));
    }

    this.setAttribute("role", "img");
    const lbl = this.getAttribute("label");
    this.setAttribute("aria-label", `${lbl ? lbl + ": " : ""}satellite schematic — bus, GPU payload, solar wings, radiators, antenna${sel ? `; ${sel} selected` : ""}`);
  }
}

export { PART_IDS };
