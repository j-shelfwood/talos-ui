// src/wc/talos-status.ts
var POSTURE = {
  nominal: { band: "nominal", word: "NOMINAL" },
  warning: { band: "warning", word: "DEGRADED" },
  critical: { band: "critical", word: "ALARMED" }
};
function tokenToBand(raw) {
  const t = raw.trim().toLowerCase();
  if (t === "crit" || t === "critical") return "critical";
  if (t === "warn" || t === "warning") return "warning";
  if (t === "ok" || t === "nominal") return "nominal";
  return null;
}
var TalosStatus = class extends HTMLElement {
  static get observedAttributes() {
    return ["channels", "label", "scan"];
  }
  root;
  wordEl;
  countsEl;
  labelEl;
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
          --_c: var(--_nominal);
          display: block;
        }
        .bar {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.85rem;
          overflow: hidden;
          font-family: var(--talos-font-display, system-ui, sans-serif);
          /* A hairline left rule in the worst-channel colour: the mood is
             readable at the very edge of the strip, before any text. */
          border: 1px solid var(--talos-hud-edge, hsl(0 0% 100% / 0.18));
          border-left: 3px solid var(--_c);
          background: var(--talos-hud-fill, hsl(0 0% 5%));
        }
        /* The scan sweep \u2014 a thin band of the mood colour travelling across the
           strip. Its presence = monitoring; its speed = severity (set via
           --_scan-dur in render()). Bound to state, not decoration. */
        .bar::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(var(--_c-hsl, 0 0% 100%) / 0.10) 50%,
            transparent 100%
          );
          transform: translateX(-100%);
          opacity: 0;
        }
        :host([scan]) .bar::after {
          opacity: 1;
          animation: talos-status-scan var(--_scan-dur, 3s) linear infinite;
        }
        @keyframes talos-status-scan {
          to { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          /* honest fallback: drop the sweep, keep colour + word + counts. */
          :host([scan]) .bar::after { animation: none; opacity: 0; }
        }
        .label {
          font-size: 0.62rem;
          letter-spacing: var(--talos-tracking-hud, 0.18em);
          text-transform: uppercase;
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
          white-space: nowrap;
        }
        .word {
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: var(--talos-tracking-hud-tight, 0.08em);
          text-transform: uppercase;
          color: var(--_c);
          white-space: nowrap;
        }
        .counts {
          margin-left: auto;
          display: inline-flex;
          gap: 0.6rem;
          font-size: 0.6rem;
          letter-spacing: 0.06em;
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
          white-space: nowrap;
        }
        .counts b { color: var(--talos-foreground, #e7e9ec); font-weight: 500; }
      </style>
      <div class="bar" part="bar">
        <span class="label" part="label"></span>
        <span class="word" part="word"></span>
        <span class="counts" part="counts"></span>
      </div>`;
    this.labelEl = this.root.querySelector(".label");
    this.wordEl = this.root.querySelector(".word");
    this.countsEl = this.root.querySelector(".counts");
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const tokens = (this.getAttribute("channels") ?? "").split(",").map(tokenToBand);
    let nNominal = 0;
    let nWarn = 0;
    let nCrit = 0;
    for (const b of tokens) {
      if (b === "critical") nCrit++;
      else if (b === "warning") nWarn++;
      else if (b === "nominal") nNominal++;
    }
    const band = nCrit > 0 ? "critical" : nWarn > 0 ? "warning" : "nominal";
    const posture = POSTURE[band];
    const varName = band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
    const hsl = band === "critical" ? "0 80% 62%" : band === "warning" ? "38 92% 60%" : "140 90% 60%";
    this.style.setProperty("--_c", `var(${varName})`);
    this.style.setProperty("--_c-hsl", hsl);
    const dur = band === "critical" ? "1.2s" : band === "warning" ? "2.1s" : "3.4s";
    this.style.setProperty("--_scan-dur", dur);
    this.labelEl.textContent = this.getAttribute("label") ?? "SYSTEM";
    this.wordEl.textContent = posture.word;
    const parts = [];
    if (nCrit > 0) parts.push(`<b>${nCrit}</b> crit`);
    if (nWarn > 0) parts.push(`<b>${nWarn}</b> warn`);
    if (nNominal > 0) parts.push(`<b>${nNominal}</b> ok`);
    this.countsEl.innerHTML = parts.join("\xB7&nbsp;").replace(/·/g, " \xB7 ");
    this.setAttribute("role", "status");
    this.setAttribute(
      "aria-label",
      `${this.getAttribute("label") ?? "System"}: ${posture.word} \u2014 ${nCrit} critical, ${nWarn} warning, ${nNominal} nominal`
    );
  }
};

export {
  TalosStatus
};
