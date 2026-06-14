import {
  num,
  prefersReducedMotion
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-odometer.ts
var TalosOdometer = class extends HTMLElement {
  static get observedAttributes() {
    return ["value", "digits", "group", "label", "unit", "duration"];
  }
  root;
  out;
  caption;
  unitEl;
  /** The digit/separator string currently displayed (settled target). */
  shown = "";
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
      <style>
        :host {
          --_c: var(--talos-foreground, #e7e9ec);

          display: inline-flex;
          flex-direction: column;
          gap: 0.3rem;
          font-family: var(--talos-font-display, system-ui);
        }
        .caption {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: var(--talos-tracking-hud, 0.18em);
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
        }
        .caption:empty { display: none; }
        .row { display: flex; align-items: baseline; }
        .out {
          display: inline-flex;
          align-items: stretch;
          /* a roll cell's height is set in JS from this; keep it integer-clean */
          font-size: var(--talos-odometer-size, 1.8rem);
          font-weight: 300;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
          color: var(--_c);
        }
        /* A digit column: a fixed window onto a 0..9..0 strip. */
        .digit {
          position: relative;
          display: inline-block;
          overflow: hidden;
          width: 0.62em;       /* tabular glyph advance for the display font */
          height: 1em;
          text-align: center;
        }
        .strip {
          display: block;
          transform: translateY(0);
          transition: transform var(--_dur, 400ms) cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }
        /* Reduced motion (or first paint): no slide, the offset applies at once. */
        .out.snap .strip { transition: none; }
        .cell { display: block; height: 1em; line-height: 1em; }
        /* Separators / any non-digit glyph render flat, no roll window. */
        .sep {
          display: inline-block;
          line-height: 1em;
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
        }
        .unit {
          font-size: 0.55em;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
          margin-left: 0.3em;
        }
        .unit:empty { display: none; }
      </style>
      <div class="caption" part="caption"></div>
      <div class="row">
        <div class="out" part="readout"></div><span class="unit" part="unit"></span>
      </div>
    `;
    this.out = this.root.querySelector(".out");
    this.caption = this.root.querySelector(".caption");
    this.unitEl = this.root.querySelector(".unit");
  }
  observer;
  connectedCallback() {
    this.shown = this.format(this.currentValue());
    this.build(
      this.shown,
      /* immediate */
      true
    );
    this.paintStatic();
    this.reflectAria();
    this.observer = new MutationObserver(() => this.onAttrs());
    this.observer.observe(this, {
      attributeFilter: ["value", "digits", "group", "label", "unit", "duration"]
    });
  }
  disconnectedCallback() {
    this.observer?.disconnect();
  }
  /** Imperative setter. */
  set(value) {
    this.setAttribute("value", String(value));
  }
  currentValue() {
    return Math.round(num(this, "value", 0));
  }
  onAttrs() {
    this.paintStatic();
    const next = this.format(this.currentValue());
    this.reflectAria();
    if (next === this.shown) return;
    const reduce = prefersReducedMotion();
    if (reduce || next.length !== this.shown.length) {
      this.build(
        next,
        /* immediate */
        reduce || next.length !== this.shown.length
      );
    } else {
      this.roll(next);
    }
    this.shown = next;
  }
  paintStatic() {
    this.caption.textContent = this.getAttribute("label") ?? "";
    this.unitEl.textContent = this.getAttribute("unit") ?? "";
  }
  /** role=status + the true number, so assistive tech never reads a mid-roll
   *  frame. aria-live polite: a running total is status, announced unobtrusively. */
  reflectAria() {
    const n = this.currentValue();
    this.setAttribute("role", "status");
    this.setAttribute("aria-live", "polite");
    this.setAttribute("aria-valuenow", String(n));
    const label = this.getAttribute("label") ?? "";
    const unit = this.getAttribute("unit") ?? "";
    this.setAttribute("aria-label", `${label} ${this.format(n)}${unit ? " " + unit : ""}`.trim());
  }
  /** Present the integer: zero-pad to `digits`, optional thousands grouping. */
  format(n) {
    const neg = n < 0;
    let body = String(Math.abs(n));
    const min = Math.max(0, Math.round(num(this, "digits", 0)));
    if (min > 0 && body.length < min) body = body.padStart(min, "0");
    if (this.hasAttribute("group")) {
      body = body.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    return (neg ? "-" : "") + body;
  }
  /** Build the row from scratch: one .digit window per digit (strip 0..9,0), a
   *  .sep span per non-digit. `immediate` snaps the strip with no transition. */
  build(text, immediate) {
    this.out.classList.toggle("snap", immediate);
    this.out.innerHTML = "";
    for (const ch of text) {
      if (ch >= "0" && ch <= "9") {
        this.out.appendChild(this.makeDigit(parseInt(ch, 10)));
      } else {
        const sep = document.createElement("span");
        sep.className = "sep";
        sep.textContent = ch;
        this.out.appendChild(sep);
      }
    }
    if (immediate) {
      void this.out.offsetHeight;
      this.out.classList.remove("snap");
    }
  }
  /** A single digit column: a strip of 0..9 then 0, offset to `d`. The trailing
   *  0 means a 9→0 change rolls one cell DOWNWARD (forward), never 9 cells back. */
  makeDigit(d) {
    const cell = document.createElement("span");
    cell.className = "digit";
    const strip = document.createElement("span");
    strip.className = "strip";
    for (let i = 0; i <= 10; i++) {
      const c = document.createElement("span");
      c.className = "cell";
      c.textContent = String(i % 10);
      strip.appendChild(c);
    }
    strip.style.transform = `translateY(-${d}em)`;
    cell.appendChild(strip);
    cell.dataset.d = String(d);
    return cell;
  }
  /** Same-width update: for each digit cell, slide its strip to the new glyph.
   *  9→0 advances to the trailing 0 (translateY(-10em)) so the roll goes the
   *  right way, then snaps back to the canonical -0em after the transition. */
  roll(text) {
    const dur = Math.max(0, num(this, "duration", 400));
    this.out.style.setProperty("--_dur", `${dur}ms`);
    const cells = Array.from(this.out.children);
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const cell = cells[i];
      if (!cell) continue;
      if (ch >= "0" && ch <= "9") {
        if (!cell.classList.contains("digit")) {
          this.build(text, false);
          return;
        }
        const to = parseInt(ch, 10);
        const from = parseInt(cell.dataset.d ?? "0", 10);
        if (to === from) continue;
        const strip = cell.firstElementChild;
        const forwardWrap = to < from;
        const target = forwardWrap ? 10 : to;
        strip.style.transform = `translateY(-${target}em)`;
        cell.dataset.d = String(to);
        if (forwardWrap) {
          const settle = () => {
            strip.removeEventListener("transitionend", settle);
            strip.style.transition = "none";
            strip.style.transform = `translateY(-${to}em)`;
            void strip.offsetHeight;
            strip.style.transition = "";
          };
          strip.addEventListener("transitionend", settle);
        }
      } else {
        if (cell.classList.contains("sep")) cell.textContent = ch;
      }
    }
  }
};

export {
  TalosOdometer
};
