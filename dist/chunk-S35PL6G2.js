// src/wc/talos-toggle.ts
var TalosToggle = class extends HTMLElement {
  static get observedAttributes() {
    return ["options", "value", "label"];
  }
  root;
  group;
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */
    `
      <style>
        :host {
          --_edge: var(--talos-edge-default, hsl(0 0% 100% / 0.18));
          --_fg: var(--talos-foreground, hsl(0 0% 100%));
          --_muted: var(--talos-muted-foreground, hsl(0 0% 60%));
          --_on-bg: var(--talos-foreground, hsl(0 0% 100%));
          --_on-fg: var(--talos-background, hsl(0 0% 0%));
          display: inline-block;
        }
        .group {
          display: inline-flex;
          border: 1px solid var(--_edge);
          /* dense content control \u2192 the documented radius-sm geometry, not chamfer */
          border-radius: var(--talos-radius-sm, 2px);
          overflow: hidden;
        }
        button {
          appearance: none;
          border: 0;
          background: transparent;
          color: var(--_muted);
          font-family: var(--talos-font-display, system-ui);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: var(--talos-tracking-hud-tight, 0.08em);
          padding: 0.4rem 0.85rem;
          cursor: pointer;
          transition: color var(--talos-dur-fast, 180ms) var(--talos-ease-out, ease),
                      background var(--talos-dur-fast, 180ms) var(--talos-ease-out, ease);
        }
        button + button { border-left: 1px solid var(--_edge); }
        button:hover { color: var(--_fg); }
        button[aria-pressed="true"] {
          background: var(--_on-bg);
          color: var(--_on-fg);
        }
        button:focus-visible {
          outline: var(--talos-focus-ring-width, 1px) solid var(--talos-focus-ring, hsl(0 0% 100% / 0.9));
          outline-offset: -2px;
        }
      </style>
      <div class="group" part="group" role="group"></div>`;
    this.group = this.root.querySelector(".group");
    this.group.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (btn?.dataset.value != null) this.select(btn.dataset.value);
    });
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  get value() {
    return this.getAttribute("value") ?? this.parseOptions()[0]?.value ?? "";
  }
  set value(v) {
    this.setAttribute("value", v);
  }
  parseOptions() {
    const raw = this.getAttribute("options") ?? "";
    return raw.split(",").map((s) => s.trim()).filter(Boolean).map((tok) => {
      const i = tok.indexOf(":");
      return i === -1 ? { value: tok, label: tok } : { value: tok.slice(0, i), label: tok.slice(i + 1) };
    });
  }
  /** User selection: update value + announce. No-op if unchanged. */
  select(value) {
    if (value === this.value) return;
    this.value = value;
    this.dispatchEvent(
      new CustomEvent("talos:change", { detail: { value }, bubbles: true, composed: true })
    );
  }
  render() {
    const options = this.parseOptions();
    const current = this.value;
    this.group.innerHTML = options.map(
      (o) => `<button type="button" part="segment" data-value="${o.value}" aria-pressed="${o.value === current ? "true" : "false"}">${o.label}</button>`
    ).join("");
    const lbl = this.getAttribute("label");
    if (lbl) this.group.setAttribute("aria-label", lbl);
  }
};

export {
  TalosToggle
};
