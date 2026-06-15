/**
 * <talos-odometer> — a rolling big-number total where the DIGIT MOTION is the
 * throughput. A large running counter that ticks up: requests served, bytes
 * transferred, uptime seconds, events processed.
 *
 * The motion encodes RATE. When `value` rises, every digit that changed ROLLS
 * (a vertical slide from the old glyph to the new one), like a mechanical
 * odometer / split-flap. A fast-incrementing counter therefore *looks* fast —
 * its low-order digits roll continuously — and a stalled counter is visibly
 * still. That is the honest binding: a frozen screenshot of a busy odometer is
 * mid-roll, and that blur IS the information (Principle 3 — motion is telemetry).
 *
 * Distinct from its siblings:
 *   - <talos-stat>    counts ONCE to a target — depicts a magnitude transition.
 *   - <talos-readout> scrambles — marks the *arrival event* of new telemetry.
 *   - <talos-odometer> rolls PER DIGIT, every change — the cadence of the roll
 *                      is the cadence of the data. Built for a number that never
 *                      stops climbing, not one that occasionally jumps.
 *
 *   - VALUE → TEXT     the settled digits are the number, exactly (separators
 *                      and zero-pad are presentation only; the readout reads true
 *                      in any static frame).
 *   - CHANGE → ROLL    only the digits that actually changed roll; stable digits
 *                      are stable. The high-order digits of a big total sit still
 *                      while the ones place blurs — the eye reads the rate off
 *                      exactly the columns that are moving.
 *   - HONEST MOTION    under prefers-reduced-motion digits snap instantly to the
 *                      new value with no roll; the number is always correct.
 *
 * Roll technique: each digit cell is a fixed-height window (overflow:hidden)
 * containing a vertical strip of glyphs 0–9 (then 0 again, so 9→0 wrap rolls
 * downward, not backward). The strip is positioned by a CSS `transform:
 * translateY()` and TRANSITIONED — so the browser tweens the slide on the
 * compositor; JS only sets the target offset. Reduced motion is a single class
 * that drops the transition, making the same offset apply instantly. Non-digit
 * cells (separators) are static. Lightweight: no rAF loop, no per-frame paint —
 * the roll is one transition per changed digit.
 *
 * Attributes (all reactive):
 *   value      current total                                   (default 0)
 *   digits     minimum digit count, zero-padded; else natural  (optional)
 *   group      if present, insert thousands separators         (flag)
 *   label      caption above the counter                       (optional)
 *   unit       suffix after the number                         (optional)
 *   duration   roll duration in ms                             (default 400)
 *
 * Monochrome by design — a running total has no health band (it only ever goes
 * up; there is no "bad" reading), so the canonical band-token block is omitted
 * here rather than carried unused. `num`/`prefersReducedMotion` are the shared
 * helpers; that is the only coupling to bands.ts.
 */
import { num, prefersReducedMotion } from "./bands";
import { setStatusA11y } from "./a11y";

export class TalosOdometer extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["value", "digits", "group", "label", "unit", "duration"];
  }

  private root: ShadowRoot;
  private out!: HTMLElement;
  private caption!: HTMLElement;
  private unitEl!: HTMLElement;

  /** The digit/separator string currently displayed (settled target). */
  private shown = "";

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
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
    this.out = this.root.querySelector(".out")!;
    this.caption = this.root.querySelector(".caption")!;
    this.unitEl = this.root.querySelector(".unit")!;
  }

  private observer?: MutationObserver;

  connectedCallback(): void {
    this.shown = this.format(this.currentValue());
    this.build(this.shown, /* immediate */ true);
    this.paintStatic();
    this.reflectAria();
    // Reactivity is a filtered MutationObserver, not attributeChangedCallback:
    // render() writes role/aria-* back onto the host, and the observer's
    // attributeFilter excludes those, so one mechanism handles inputs without
    // looping on its own write-backs — the pattern the live instruments share
    // (talos-meter, talos-readout). It also coalesces a burst of value writes
    // into the microtask the observer fires on, which suits a fast counter.
    this.observer = new MutationObserver(() => this.onAttrs());
    this.observer.observe(this, {
      attributeFilter: ["value", "digits", "group", "label", "unit", "duration"],
    });
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
  }

  /** Imperative setter. */
  set(value: number): void {
    this.setAttribute("value", String(value));
  }

  private currentValue(): number {
    // Integer total — odometers count whole events; round defensively.
    return Math.round(num(this, "value", 0));
  }

  private onAttrs(): void {
    this.paintStatic();
    const next = this.format(this.currentValue());
    this.reflectAria();
    if (next === this.shown) return; // stable total → stable digits, no roll
    const reduce = prefersReducedMotion();
    // A change in width (digit count, separators, sign) can't be rolled cell-to-
    // cell, so rebuild the row; otherwise roll the changed digits in place.
    if (reduce || next.length !== this.shown.length) {
      this.build(next, /* immediate */ reduce || next.length !== this.shown.length);
    } else {
      this.roll(next);
    }
    this.shown = next;
  }

  private paintStatic(): void {
    this.caption.textContent = this.getAttribute("label") ?? "";
    this.unitEl.textContent = this.getAttribute("unit") ?? "";
  }

  /** role=status + the true number, so assistive tech never reads a mid-roll
   *  frame. aria-live polite: a running total is status, announced unobtrusively. */
  private reflectAria(): void {
    const n = this.currentValue();
    const label = this.getAttribute("label") ?? "";
    const unit = this.getAttribute("unit") ?? "";
    setStatusA11y(this, {
      label: label || null,
      summary: `${this.format(n)}${unit ? ` ${unit}` : ""}`.trim(),
    }, "polite");
  }

  /** Present the integer: zero-pad to `digits`, optional thousands grouping. */
  private format(n: number): string {
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
  private build(text: string, immediate: boolean): void {
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
      // Force layout so the next class flip can re-enable transitions cleanly.
      void this.out.offsetHeight;
      this.out.classList.remove("snap");
    }
  }

  /** A single digit column: a strip of 0..9 then 0, offset to `d`. The trailing
   *  0 means a 9→0 change rolls one cell DOWNWARD (forward), never 9 cells back. */
  private makeDigit(d: number): HTMLElement {
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
  private roll(text: string): void {
    const dur = Math.max(0, num(this, "duration", 400));
    this.out.style.setProperty("--_dur", `${dur}ms`);
    const cells = Array.from(this.out.children) as HTMLElement[];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const cell = cells[i];
      if (!cell) continue;
      if (ch >= "0" && ch <= "9") {
        if (!cell.classList.contains("digit")) {
          // Shape changed under us (shouldn't at equal length) — rebuild safely.
          this.build(text, false);
          return;
        }
        const to = parseInt(ch, 10);
        const from = parseInt(cell.dataset.d ?? "0", 10);
        if (to === from) continue;
        const strip = cell.firstElementChild as HTMLElement;
        // 9→0 (or any decreasing wrap on an ever-rising counter): roll forward
        // through the trailing 0 cell, then reset to the real index post-roll.
        const forwardWrap = to < from;
        const target = forwardWrap ? 10 : to;
        strip.style.transform = `translateY(-${target}em)`;
        cell.dataset.d = String(to);
        if (forwardWrap) {
          const settle = (): void => {
            strip.removeEventListener("transitionend", settle);
            strip.style.transition = "none";
            strip.style.transform = `translateY(-${to}em)`;
            void strip.offsetHeight; // commit the snap before re-enabling
            strip.style.transition = "";
          };
          strip.addEventListener("transitionend", settle);
        }
      } else {
        // Separator position: ensure the glyph is right (commas don't move).
        if (cell.classList.contains("sep")) cell.textContent = ch;
      }
    }
  }
}
