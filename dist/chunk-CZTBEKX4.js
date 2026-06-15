import {
  replaceTextWithUnit
} from "./chunk-FOSYIWTW.js";
import {
  setStatusA11y
} from "./chunk-4WWY5MOA.js";
import {
  bandOf,
  num,
  prefersReducedMotion
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-readout.ts
var TalosReadout = class _TalosReadout extends HTMLElement {
  static get observedAttributes() {
    return ["value", "warn", "crit", "invert", "unit", "label", "duration"];
  }
  root;
  out;
  caption;
  frame = 0;
  scrambleStart = 0;
  toText = "";
  lastValue = null;
  // Glyph pool: box-drawing + symbols read as "machine decoding", on-brand for a
  // console. No letters/digits that could be misread as a real partial value.
  static GLYPHS = "!<>-_\\/[]{}=+*^?#\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255D\u255C\u255B\u2510\u2514\u2534\u252C\u251C\u2500\u253C\u255E\u255F\u255A\u2554\u2569\u2566\u2560\u2550\u256C\u2567\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256B\u256A\u2518\u250C";
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
          --_c: var(--talos-foreground, #e7e9ec);

          display: inline-flex;
          flex-direction: column;
          gap: 0.25rem;
          font-family: var(--talos-font-display, system-ui);
        }
        .caption {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: var(--talos-tracking-hud, 0.18em);
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
        }
        .caption:empty { display: none; }
        .out {
          font-variant-numeric: tabular-nums;
          font-weight: 300;
          letter-spacing: 0.04em;
          line-height: 1;
          color: var(--_c);
          /* tabular-nums + this keep width stable so the scramble doesn't reflow */
          white-space: pre;
        }
        .unit {
          font-size: 0.5em;
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
          margin-left: 0.15em;
        }
      </style>
      <div class="caption" part="caption"></div>
      <div class="out" part="readout"></div>
    `;
    this.out = this.root.querySelector(".out");
    this.caption = this.root.querySelector(".caption");
  }
  observer;
  connectedCallback() {
    this.lastValue = this.getAttribute("value") ?? "";
    this.toText = this.lastValue;
    this.paint(this.toText);
    this.renderCaption();
    this.renderBand();
    this.observer = new MutationObserver(() => this.onAttrs());
    this.observer.observe(this, {
      attributeFilter: ["value", "warn", "crit", "invert", "unit", "label", "duration"]
    });
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }
  onAttrs() {
    this.renderCaption();
    this.renderBand();
    const next = this.getAttribute("value") ?? "";
    if (next === this.lastValue) return;
    this.toText = next;
    this.lastValue = next;
    if (prefersReducedMotion()) {
      this.paint(this.toText);
      return;
    }
    this.startScramble();
  }
  /** Band tint, only meaningful for numeric values — uses the shared bandOf()
   *  helper (bands.ts), so threshold + invert semantics match gauge/meter. A
   *  non-numeric value has no band: it stays neutral foreground. */
  renderBand() {
    const n = parseFloat(this.getAttribute("value") ?? "");
    const band = Number.isFinite(n) ? bandOf(this, n) : "nominal";
    const v = band === "critical" ? "var(--_critical)" : band === "warning" ? "var(--_warning)" : "var(--talos-foreground, #e7e9ec)";
    this.style.setProperty("--_c", v);
  }
  renderCaption() {
    this.caption.textContent = this.getAttribute("label") ?? "";
    setStatusA11y(this, {
      label: this.getAttribute("label"),
      summary: this.toText
    });
  }
  startScramble() {
    cancelAnimationFrame(this.frame);
    const dur = Math.max(0, num(this, "duration", 420));
    this.scrambleStart = 0;
    const loop = (ts) => {
      if (this.scrambleStart === 0) this.scrambleStart = ts;
      const p = dur === 0 ? 1 : Math.min((ts - this.scrambleStart) / dur, 1);
      this.paint(this.frameText(p));
      if (p < 1) {
        this.frame = requestAnimationFrame(loop);
      } else {
        this.paint(this.toText);
      }
    };
    this.frame = requestAnimationFrame(loop);
  }
  /** Progressive left-to-right resolve: characters before the progress index are
   *  the real value; the rest are random glyphs. Same shape as the reference. */
  frameText(p) {
    const to = this.toText;
    const resolved = Math.floor(p * to.length);
    let s = "";
    for (let i = 0; i < to.length; i++) {
      const ch = to[i];
      if (i < resolved || ch === " ") {
        s += ch;
      } else {
        const g = _TalosReadout.GLYPHS;
        s += g[(Math.floor(p * 9973) + i * 7) % g.length];
      }
    }
    return s;
  }
  paint(text) {
    const unit = this.getAttribute("unit") ?? "";
    replaceTextWithUnit(this.out, text, unit);
  }
};

export {
  TalosReadout
};
