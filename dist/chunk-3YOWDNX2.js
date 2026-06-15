import {
  setStatusA11y
} from "./chunk-4WWY5MOA.js";
import {
  bandOf
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-led.ts
var TalosLed = class extends HTMLElement {
  static get observedAttributes() {
    return ["state", "value", "warn", "crit", "invert", "live", "label", "size"];
  }
  root;
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
      <style>
        :host {
          /* band tokens, identical fallbacks to the other instruments */
          --_nominal: var(--talos-success, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(38 92% 60%));
          --_critical: var(--talos-danger, hsl(0 80% 62%));
          --_idle: var(--talos-muted-foreground, hsl(0 0% 60%));
          --_c: var(--_nominal);
          --_d: 10px;

          display: inline-block;
          line-height: 0;
          vertical-align: middle;
        }
        .dot {
          /* MUST be block/inline-block: a bare inline <span> ignores width/height
             and collapses to a 0\xD70 box \u2014 the dot was invisible despite a colour. */
          display: block;
          width: var(--_d);
          height: var(--_d);
          border-radius: 50%;
          background: var(--_c);
          /* glow encodes presence, not decoration: it's the state colour, sized
             to the dot, so a brighter halo never means anything the fill doesn't. */
          box-shadow: 0 0 calc(var(--_d) * 0.6) hsl(var(--_c-hsl, 0 0% 100%) / 0);
          transition: background var(--talos-dur-fast, 180ms) var(--talos-ease-out, ease);
        }
        :host([state="idle"]:not([value])) .dot { background: var(--_idle); }
        /* live = actively reporting: a slow steady pulse. */
        :host([live]) .dot { animation: talos-led-pulse 2.4s ease-in-out infinite; }
        @keyframes talos-led-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 transparent; }
          50%      { opacity: 0.55; box-shadow: 0 0 calc(var(--_d) * 0.8) var(--_c); }
        }
        @media (prefers-reduced-motion: reduce) {
          /* honest fallback: hold the lit state, drop the pulse. */
          :host([live]) .dot { animation: none; opacity: 1; }
        }
      </style>
      <span class="dot" part="dot"></span>`;
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const size = parseFloat(this.getAttribute("size") ?? "");
    this.style.setProperty("--_d", Number.isFinite(size) ? `${size}px` : "10px");
    let varName = "--_nominal";
    let label;
    const valueAttr = this.getAttribute("value");
    if (valueAttr !== null && Number.isFinite(parseFloat(valueAttr))) {
      const band = bandOf(this, parseFloat(valueAttr));
      varName = band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
      label = band;
    } else {
      const state = (this.getAttribute("state") ?? "ok").toLowerCase();
      varName = state === "crit" ? "--_critical" : state === "warn" ? "--_warning" : state === "idle" ? "--_idle" : "--_nominal";
      label = state;
    }
    this.style.setProperty("--_c", `var(${varName})`);
    const lbl = this.getAttribute("label");
    const live = this.hasAttribute("live") ? ", live" : "";
    setStatusA11y(this, { label: lbl, summary: `${label}${live}` });
  }
};

export {
  TalosLed
};
