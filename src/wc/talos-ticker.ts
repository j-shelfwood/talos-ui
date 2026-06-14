/**
 * <talos-ticker> — a live event stream. Where <talos-trend> is a moving window
 * over a CONTINUOUS value, this is the discrete sibling: a scrolling log of
 * timestamped events where SEVERITY is the colour and ARRIVAL is the motion
 * (PHILOSOPHY.md, principle 3 — "motion is telemetry, not transition"). A new
 * row sliding in IS an event happening; the scroll is the data advancing, not a
 * decorative reveal. The CSS `.talos-log` is the static markup for this signal;
 * <talos-ticker> is its live instrument — you push() events and the newest
 * arrives at the top while the oldest falls off a fixed window.
 *
 * Form encodes function:
 *   - ORDER   newest at the top; the stack is recency, top-down.
 *   - COLOUR  each row's severity dot is its band (nominal/warning/critical),
 *             the same three health tokens every instrument shares — colour IS
 *             the severity, not a label you have to read.
 *   - LIVE    push(event) appends and the window scrolls; read it twice while a
 *             system runs and the log differs.
 *
 * Honest motion: every arrived event is fully present in the static frame — the
 * entrance is a one-shot fade/slide that gates on prefers-reduced-motion (no
 * slide, the row simply appears). Nothing about the data hides until it animates.
 *
 * This is the ONE instrument where `aria-live` is genuinely correct: the host is
 * a `role="log"`, `aria-live="polite"`, `aria-relevant="additions"` region, so a
 * screen reader announces each new event exactly as the sighted eye sees it
 * arrive — the announcement is the telemetry, not chrome.
 *
 * Attributes (reactive, getter observedAttributes):
 *   cap      max rows retained/shown               (default 8)
 *   label    caption (optional)
 *
 * Severity is per-event (a `level` field), not an attribute — so warn/crit
 * thresholds don't apply here. Canonical level names are nominal/warning/critical;
 * the short aliases ok/warn/crit map onto them.
 *
 * Imperative API (primary — events are inherently imperative):
 *   el.push({ msg, level?, time? })  — append one event, scroll the window.
 *   el.events = [ … ]                — seed/replace the whole window at once.
 */
import { num, prefersReducedMotion } from "./bands";

export interface TickerEvent {
  msg: string;
  level?: string;
  time?: string;
}

type Level = "nominal" | "warning" | "critical";

/** Map canonical names AND the short aliases onto the three band tokens. */
function levelOf(level?: string): Level {
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

/** A short HH:MM:SS stamp for events that arrive without their own `time`. */
function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export class TalosTicker extends HTMLElement {
  static get observedAttributes() {
    return ["cap", "label"];
  }

  private root: ShadowRoot;
  private caption!: HTMLElement;
  private list!: HTMLElement;

  private buf: TickerEvent[] = [];
  /** Whether the next render() should animate the top row in (a fresh push). */
  private animateNext = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
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
        /* Severity dot — colour IS the band. */
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
    this.caption = this.root.querySelector(".caption")!;
    this.list = this.root.querySelector(".list")!;
  }

  private observer?: MutationObserver;

  connectedCallback(): void {
    // Live region — the one place aria-live is honest. Set on the host so the
    // whole instrument is the log; new rows are "additions" the AT announces.
    this.setAttribute("role", "log");
    this.setAttribute("aria-live", "polite");
    this.setAttribute("aria-relevant", "additions");

    this.render();
    // Reactivity via a filtered MutationObserver (not attributeChangedCallback):
    // matches the rest of the library, and the filter excludes the role/aria-*
    // we write back onto the host so the observer never loops on its own writes.
    this.observer = new MutationObserver(() => this.render());
    this.observer.observe(this, { attributeFilter: ["cap", "label"] });
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
  }

  /** Append one event and scroll the window. Preferred entry for streams. */
  push(event: TickerEvent): void {
    const cap = Math.max(1, Math.floor(num(this, "cap", 8)));
    // Newest at the top: unshift, then trim the tail past the cap.
    this.buf.unshift({
      msg: event.msg,
      level: event.level,
      time: event.time ?? stamp(),
    });
    while (this.buf.length > cap) this.buf.pop();
    this.animateNext = true;
    this.render();
  }

  /** Seed or replace the whole window at once (declarative-ish convenience). */
  set events(list: TickerEvent[]) {
    const cap = Math.max(1, Math.floor(num(this, "cap", 8)));
    // Caller order is oldest→newest; store newest-first and clamp to the window.
    this.buf = (Array.isArray(list) ? list : [])
      .map((e) => ({ msg: e.msg, level: e.level, time: e.time ?? stamp() }))
      .reverse()
      .slice(0, cap);
    this.animateNext = false;
    this.render();
  }

  get events(): TickerEvent[] {
    // Hand back oldest→newest, the order callers pushed in.
    return this.buf.slice().reverse();
  }

  private render(): void {
    this.caption.textContent = this.getAttribute("label") ?? "";

    // A cap change can shrink the retained window between pushes.
    const cap = Math.max(1, Math.floor(num(this, "cap", 8)));
    if (this.buf.length > cap) this.buf.length = cap;

    const animateTop = this.animateNext && !prefersReducedMotion();
    this.animateNext = false;

    this.list.replaceChildren(
      ...this.buf.map((e, i) => {
        const band = levelOf(e.level);
        const bandVar =
          band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";

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
        // Carry the severity into the announced text so the AT hears what the
        // eye reads as colour (the dot itself is decorative / aria-hidden).
        msg.textContent =
          band === "nominal" ? e.msg : `${band.toUpperCase()}: ${e.msg}`;

        row.append(time, dot, msg);
        return row;
      }),
    );
  }
}
