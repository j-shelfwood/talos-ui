import {
  num,
  prefersReducedMotion
} from "./chunk-7SB3FGYG.js";

// src/wc/talos-ticker.ts
function levelOf(level) {
  switch ((level ?? "").toLowerCase()) {
    case "critical":
    case "crit":
      return "critical";
    case "warning":
    case "warn":
      return "warning";
    default:
      return "nominal";
  }
}
function stamp() {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
var TalosTicker = class extends HTMLElement {
  static get observedAttributes() {
    return ["cap", "label"];
  }
  root;
  caption;
  list;
  buf = [];
  /** Whether the next render() should animate the top row in (a fresh push). */
  animateNext = false;
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
          --_edge: var(--talos-edge-subtle, hsl(0 0% 100% / 0.08));

          display: inline-flex;
          flex-direction: column;
          gap: 0.3rem;
          min-width: 14rem;
          font-family: var(--talos-font-display, system-ui);
          color: var(--talos-foreground, #e7e9ec);
        }
        .caption {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: var(--talos-tracking-hud, 0.18em);
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
        }
        .caption:empty { display: none; }
        .list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .row {
          display: grid;
          grid-template-columns: auto auto 1fr;
          align-items: baseline;
          gap: 0.5rem;
          padding: 0.18rem 0;
          border-top: 1px solid var(--_edge);
          font-size: 0.74rem;
          line-height: 1.3;
        }
        .row:first-child { border-top: 0; }
        .time {
          font-variant-numeric: tabular-nums;
          font-size: 0.66rem;
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
          letter-spacing: 0.04em;
        }
        /* Severity dot \u2014 colour IS the band. */
        .dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background: var(--_c, var(--_nominal));
          align-self: center;
          box-shadow: 0 0 0.3rem -0.05rem var(--_c, var(--_nominal));
        }
        .msg {
          color: var(--talos-foreground, #e7e9ec);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        /* Entrance: the row arriving IS the event. Gated for reduced-motion. */
        @keyframes arrive {
          from { opacity: 0; transform: translateY(-0.4rem); }
          to   { opacity: 1; transform: none; }
        }
        .row.arrive { animation: arrive 220ms ease-out; }
      </style>
      <span class="caption" part="caption"></span>
      <div class="list" part="list"></div>
    `;
    this.caption = this.root.querySelector(".caption");
    this.list = this.root.querySelector(".list");
  }
  observer;
  connectedCallback() {
    this.setAttribute("role", "log");
    this.setAttribute("aria-live", "polite");
    this.setAttribute("aria-relevant", "additions");
    this.render();
    this.observer = new MutationObserver(() => this.render());
    this.observer.observe(this, { attributeFilter: ["cap", "label"] });
  }
  disconnectedCallback() {
    this.observer?.disconnect();
  }
  /** Append one event and scroll the window. Preferred entry for streams. */
  push(event) {
    const cap = Math.max(1, Math.floor(num(this, "cap", 8)));
    this.buf.unshift({
      msg: event.msg,
      level: event.level,
      time: event.time ?? stamp()
    });
    while (this.buf.length > cap) this.buf.pop();
    this.animateNext = true;
    this.render();
  }
  /** Seed or replace the whole window at once (declarative-ish convenience). */
  set events(list) {
    const cap = Math.max(1, Math.floor(num(this, "cap", 8)));
    this.buf = (Array.isArray(list) ? list : []).map((e) => ({ msg: e.msg, level: e.level, time: e.time ?? stamp() })).reverse().slice(0, cap);
    this.animateNext = false;
    this.render();
  }
  get events() {
    return this.buf.slice().reverse();
  }
  render() {
    this.caption.textContent = this.getAttribute("label") ?? "";
    const cap = Math.max(1, Math.floor(num(this, "cap", 8)));
    if (this.buf.length > cap) this.buf.length = cap;
    const animateTop = this.animateNext && !prefersReducedMotion();
    this.animateNext = false;
    this.list.replaceChildren(
      ...this.buf.map((e, i) => {
        const band = levelOf(e.level);
        const bandVar = band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
        const row = document.createElement("div");
        row.className = i === 0 && animateTop ? "row arrive" : "row";
        row.setAttribute("part", "row");
        row.style.setProperty("--_c", `var(${bandVar})`);
        const time = document.createElement("span");
        time.className = "time";
        time.setAttribute("part", "time");
        time.textContent = e.time ?? "";
        const dot = document.createElement("span");
        dot.className = "dot";
        dot.setAttribute("part", "dot");
        dot.setAttribute("aria-hidden", "true");
        const msg = document.createElement("span");
        msg.className = "msg";
        msg.setAttribute("part", "msg");
        msg.textContent = band === "nominal" ? e.msg : `${band.toUpperCase()}: ${e.msg}`;
        row.append(time, dot, msg);
        return row;
      })
    );
  }
};

export {
  TalosTicker
};
