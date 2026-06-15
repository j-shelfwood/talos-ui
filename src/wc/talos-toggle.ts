/**
 * <talos-toggle> — a segmented control where the SELECTION is state. A row of
 * mutually-exclusive options; the active segment is the current value of a live
 * setting (mode, range, channel), not a decorative tab. Changing it emits a
 * `talos:change` event and reflects `value`, so it both shows and drives state.
 *
 *   - POSITION   the lit segment IS the current value — read it to know the mode.
 *   - LIVE       set `value` (attribute or property) and the active segment
 *                follows; click a segment and `value` updates + `talos:change`
 *                fires. Two-way, like a real control.
 *   - HONEST     no motion carries meaning; the active segment is fully legible
 *                in a static frame (filled background + foreground text). Nothing
 *                to lose under reduced-motion.
 *
 * Options come from the `options` attribute (comma-separated) or, for label≠value
 * pairs, `value:Label` tokens — e.g. options="1h:1 Hour,1d:1 Day,1w:1 Week".
 *
 * Attributes:
 *   options      comma-separated list; each "value" or "value:Label"  (required)
 *   value        the selected option value            (default: first option)
 *   label        accessible group label               (optional)
 *
 * Property: el.value (string) — get/set; setting reflects to the attribute.
 * Event:    talos:change — detail = { value } — fired on user selection.
 */
import { parseToggleOptions } from "./parse";

export interface ToggleOption {
  value: string;
  label: string;
}

export class TalosToggle extends HTMLElement {
  static get observedAttributes() {
    return ["options", "value", "label"];
  }

  private root: ShadowRoot;
  private group!: HTMLElement;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
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
          /* dense content control → the documented radius-sm geometry, not chamfer */
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
        button[aria-checked="true"] {
          background: var(--_on-bg);
          color: var(--_on-fg);
        }
        button:focus-visible {
          outline: var(--talos-focus-ring-width, 1px) solid var(--talos-focus-ring, hsl(0 0% 100% / 0.9));
          outline-offset: -2px;
        }
      </style>
      <div class="group" part="group" role="radiogroup"></div>`;
    this.group = this.root.querySelector(".group")!;
    this.group.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("button");
      if (btn?.dataset.value != null) this.select(btn.dataset.value);
    });
    this.group.addEventListener("keydown", this.onKeydown);
  }

  connectedCallback(): void { this.render(); }
  attributeChangedCallback(): void { this.render(); }

  get value(): string {
    return this.getAttribute("value") ?? this.parseOptions()[0]?.value ?? "";
  }
  set value(v: string) { this.setAttribute("value", v); }

  private parseOptions(): ToggleOption[] {
    return parseToggleOptions(this.getAttribute("options") ?? "");
  }

  private focusValue(value: string): void {
    this.group
      .querySelector<HTMLButtonElement>(`button[data-value="${CSS.escape(value)}"]`)
      ?.focus();
  }

  private onKeydown = (e: KeyboardEvent): void => {
    const options = this.parseOptions();
    if (!options.length) return;
    const currentIndex = Math.max(0, options.findIndex((o) => o.value === this.value));
    let nextIndex = currentIndex;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % options.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + options.length) % options.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = options.length - 1;
        break;
      case "Enter":
      case " ": {
        const btn = (e.target as HTMLElement).closest("button");
        if (!btn?.dataset.value) return;
        e.preventDefault();
        this.select(btn.dataset.value, true);
        return;
      }
      default:
        return;
    }
    e.preventDefault();
    this.select(options[nextIndex].value, true);
  }

  /** User selection: update value + announce. No-op if unchanged. */
  private select(value: string, focus = false): void {
    if (value === this.value) {
      if (focus) this.focusValue(value);
      return;
    }
    this.value = value; // reflects → triggers a synchronous render
    if (focus) this.focusValue(value);
    this.dispatchEvent(
      new CustomEvent("talos:change", { detail: { value }, bubbles: true, composed: true }),
    );
  }

  private render(): void {
    const options = this.parseOptions();
    if (!options.length) {
      this.group.replaceChildren();
      return;
    }

    const attrValue = this.getAttribute("value");
    const current = options.some((o) => o.value === attrValue)
      ? attrValue!
      : options[0].value;
    if (current !== attrValue) {
      this.setAttribute("value", current);
      return;
    }

    this.group.replaceChildren(
      ...options.map((o) => {
        const selected = o.value === current;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("part", "segment");
        btn.setAttribute("role", "radio");
        btn.dataset.value = o.value;
        btn.setAttribute("aria-checked", selected ? "true" : "false");
        btn.tabIndex = selected ? 0 : -1;
        btn.textContent = o.label;
        return btn;
      }),
    );

    const lbl = this.getAttribute("label");
    if (lbl) this.group.setAttribute("aria-label", lbl);
    else this.group.removeAttribute("aria-label");
  }
}
