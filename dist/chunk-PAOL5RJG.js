// src/wc/talos-spacecraft.ts
var PART_IDS = ["bus", "gpu", "solarL", "solarR", "radL", "radR", "antenna"];
var TalosSpacecraft = class extends HTMLElement {
  static get observedAttributes() {
    return ["selected", "eclipse", "label"];
  }
  root;
  svg;
  _parts = {};
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
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
    this.svg = this.root.querySelector("svg");
  }
  set parts(v) {
    this._parts = v || {};
    this.render();
  }
  get parts() {
    return this._parts;
  }
  connectedCallback() {
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "0");
    this.addEventListener("keydown", this.onKeydown);
    this.render();
  }
  disconnectedCallback() {
    this.removeEventListener("keydown", this.onKeydown);
  }
  attributeChangedCallback() {
    this.render();
  }
  /**
   * Keyboard nav: Arrow keys cycle the `selected` part through PART_IDS (reusing
   * the existing selection-outline highlight); Enter/Space emit talos:part.
   */
  onKeydown = (e) => {
    const cur = this.getAttribute("selected");
    let i = PART_IDS.indexOf(cur);
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
      default:
        return;
    }
    e.preventDefault();
    this.setAttribute("selected", PART_IDS[i]);
  };
  bandColour(band) {
    return band === 2 ? "var(--_critical)" : band === 1 ? "var(--_warning)" : "var(--_nominal)";
  }
  render() {
    const NS = "http://www.w3.org/2000/svg";
    const sel = this.getAttribute("selected");
    const eclipse = this.hasAttribute("eclipse");
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
    this.svg.setAttribute("class", eclipse ? "eclipse" : "");
    const G = {
      solarL: [8, 46, 64, 30],
      solarR: [128, 46, 64, 30],
      bus: [78, 40, 44, 42],
      gpu: [88, 48, 24, 26],
      radL: [78, 86, 20, 26],
      radR: [102, 86, 20, 26]
    };
    const mk = (tag, attrs) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    };
    const group = (id) => {
      const g = mk("g", { class: "part", "data-part": id });
      const band = this.bandColour(this._parts[id]?.band);
      g.style.setProperty("--_band", band);
      g.addEventListener("click", () => this.dispatchEvent(new CustomEvent("talos:part", { detail: { part: id }, bubbles: true, composed: true })));
      this.svg.appendChild(g);
      return g;
    };
    for (const id of ["solarL", "solarR"]) {
      const [x, y, w, h] = G[id];
      const g = group(id);
      g.classList.add("wing");
      g.appendChild(mk("rect", { x: `${x}`, y: `${y}`, width: `${w}`, height: `${h}`, class: "panel" }));
      g.appendChild(mk("rect", { x: `${id === "solarL" ? x + w - 3 : x}`, y: `${y}`, width: "3", height: `${h}`, class: "fillband" }));
      for (let c = 1; c < 5; c++) g.appendChild(mk("line", { x1: `${x + w / 5 * c}`, y1: `${y}`, x2: `${x + w / 5 * c}`, y2: `${y + h}`, class: "grid" }));
      g.appendChild(mk("line", { x1: `${x}`, y1: `${y + h / 2}`, x2: `${x + w}`, y2: `${y + h / 2}`, class: "grid" }));
    }
    for (const id of ["radL", "radR"]) {
      const [x, y, w, h] = G[id];
      const g = group(id);
      g.appendChild(mk("rect", { x: `${x}`, y: `${y}`, width: `${w}`, height: `${h}`, class: "panel" }));
      for (let c = 1; c < 5; c++) g.appendChild(mk("line", { x1: `${x}`, y1: `${y + h / 5 * c}`, x2: `${x + w}`, y2: `${y + h / 5 * c}`, class: "grid" }));
    }
    {
      const [x, y, w, h] = G.bus;
      const g = group("bus");
      g.appendChild(mk("rect", { x: `${x}`, y: `${y}`, width: `${w}`, height: `${h}`, class: "body" }));
    }
    {
      const [x, y, w, h] = G.gpu;
      const g = group("gpu");
      const band = this.bandColour(this._parts.gpu?.band);
      g.appendChild(mk("rect", { x: `${x}`, y: `${y}`, width: `${w}`, height: `${h}`, class: "panel" }));
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
        g.appendChild(mk("rect", { x: `${x + 3 + c * 6.5}`, y: `${y + 3 + r * 7}`, width: "4.5", height: "4.5", fill: band, opacity: "0.65" }));
    }
    {
      const g = group("antenna");
      g.appendChild(mk("line", { x1: "100", y1: "82", x2: "100", y2: "96", class: "lead" }));
      const band = this.bandColour(this._parts.antenna?.band);
      const dish = mk("path", { d: "M92 100 A10 10 0 0 1 108 100 Z", fill: "var(--_body)", stroke: band, "stroke-width": "1.5" });
      g.appendChild(dish);
      g.appendChild(mk("circle", { cx: "100", cy: "98", r: "1.6", fill: band }));
    }
    if (sel && G[sel]) {
      const [x, y, w, h] = G[sel];
      this.svg.appendChild(mk("rect", { x: `${x - 2}`, y: `${y - 2}`, width: `${w + 4}`, height: `${h + 4}`, class: "sel-outline" }));
    } else if (sel === "antenna") {
      this.svg.appendChild(mk("rect", { x: "88", y: "88", width: "24", height: "24", class: "sel-outline" }));
    }
    this.setAttribute("role", "img");
    const lbl = this.getAttribute("label");
    this.setAttribute("aria-label", `${lbl ? lbl + ": " : ""}satellite schematic \u2014 bus, GPU payload, solar wings, radiators, antenna${sel ? `; ${sel} selected` : ""}`);
  }
};

export {
  TalosSpacecraft
};
