import type { Band } from "./bands";

/**
 * <talos-status> — the system-mood rollup. The aggregate of many channels shown
 * as ONE posture: nominal / degraded / alarmed. This is principle 5 made
 * concrete (PHILOSOPHY.md — "the system has a state, and it shows"): individual
 * instruments each report their own channel, but nothing else rolls them up into
 * the single answer an operator reads first — "is the system OK right now?".
 *
 * It does real semantic work — a WORST-OF aggregation — so it passes the law's
 * test (renders meaning, not decoration). The colour and label are bound to the
 * worst active channel; the per-band counts make the rollup auditable (you can
 * see WHY it is degraded, not just that it is).
 *
 *   - ROLLUP   `channels` is a comma-separated list of channel states, each one
 *              of ok | nominal | warn | warning | crit | critical | idle. The
 *              band shown is the worst present (critical > warning > nominal);
 *              idle channels are "nothing to report" and never raise the mood.
 *   - SCAN     `scan` adds a sweep whose presence means "actively monitoring"
 *              and whose speed rises with severity — motion is telemetry, not a
 *              flourish. A degraded system scans faster; an alarmed one fastest.
 *   - HONEST   the posture word, the colour, and the counts all carry the state
 *              in a single static frame; under prefers-reduced-motion the scan is
 *              dropped, never the colour or the label.
 *
 * Attributes (all reactive):
 *   channels   comma-separated channel states                 (required for a rollup)
 *   label      system name shown before the posture           (default SYSTEM)
 *   scan       sweep while monitoring; speed scales w/ severity (flag)
 */

type Posture = { band: Band; word: string };

const POSTURE: Record<Band, Posture> = {
  nominal: { band: "nominal", word: "NOMINAL" },
  warning: { band: "warning", word: "DEGRADED" },
  critical: { band: "critical", word: "ALARMED" },
};

/** Normalise a loose channel token to a Band, or null for idle/unknown. */
function tokenToBand(raw: string): Band | null {
  const t = raw.trim().toLowerCase();
  if (t === "crit" || t === "critical") return "critical";
  if (t === "warn" || t === "warning") return "warning";
  if (t === "ok" || t === "nominal") return "nominal";
  return null; // idle / blank / unknown — nothing to report
}

export class TalosStatus extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["channels", "label", "scan"];
  }

  private root: ShadowRoot;
  private wordEl!: HTMLElement;
  private countsEl!: HTMLElement;
  private labelEl!: HTMLElement;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
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
        /* The scan sweep — a thin band of the mood colour travelling across the
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
    this.labelEl = this.root.querySelector(".label")!;
    this.wordEl = this.root.querySelector(".word")!;
    this.countsEl = this.root.querySelector(".counts")!;
  }

  connectedCallback(): void {
    this.render();
  }
  attributeChangedCallback(): void {
    this.render();
  }

  private render(): void {
    // Tally the channels into bands.
    const tokens = (this.getAttribute("channels") ?? "")
      .split(",")
      .map(tokenToBand);
    let nNominal = 0;
    let nWarn = 0;
    let nCrit = 0;
    for (const b of tokens) {
      if (b === "critical") nCrit++;
      else if (b === "warning") nWarn++;
      else if (b === "nominal") nNominal++;
    }

    // Worst-of rollup: critical > warning > nominal.
    const band: Band = nCrit > 0 ? "critical" : nWarn > 0 ? "warning" : "nominal";
    const posture = POSTURE[band];

    // Colour + scan severity bound to the band.
    const varName =
      band === "critical" ? "--_critical" : band === "warning" ? "--_warning" : "--_nominal";
    const hsl =
      band === "critical" ? "0 80% 62%" : band === "warning" ? "38 92% 60%" : "140 90% 60%";
    this.style.setProperty("--_c", `var(${varName})`);
    this.style.setProperty("--_c-hsl", hsl);
    // Severity → scan speed: nominal slow, alarmed fast. Motion is telemetry.
    const dur = band === "critical" ? "1.2s" : band === "warning" ? "2.1s" : "3.4s";
    this.style.setProperty("--_scan-dur", dur);

    this.labelEl.textContent = this.getAttribute("label") ?? "SYSTEM";
    this.wordEl.textContent = posture.word;

    // Auditable counts: show only the bands that are present, worst first.
    const parts: string[] = [];
    if (nCrit > 0) parts.push(`<b>${nCrit}</b> crit`);
    if (nWarn > 0) parts.push(`<b>${nWarn}</b> warn`);
    if (nNominal > 0) parts.push(`<b>${nNominal}</b> ok`);
    this.countsEl.innerHTML = parts.join("·&nbsp;").replace(/·/g, " · ");

    // Honesty: the posture survives without colour or motion.
    this.setAttribute("role", "status");
    this.setAttribute(
      "aria-label",
      `${this.getAttribute("label") ?? "System"}: ${posture.word} — ${nCrit} critical, ${nWarn} warning, ${nNominal} nominal`,
    );
  }
}
