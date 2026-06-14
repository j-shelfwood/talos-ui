/**
 * <talos-compass> — a 360°-wrapping bearing indicator that renders a DIRECTION,
 * not a number that happens to be an angle.
 *
 * The one signal a linear gauge cannot show honestly: an ANGULAR direction
 * (compass heading, antenna azimuth, wind bearing). On a bar or a sweep gauge,
 * 359° and 1° sit at opposite ends of the track — two degrees apart in the world,
 * the full width of the instrument apart on the glass. That is a lie about
 * adjacency. A heading is a point on a circle, so the instrument is a circle:
 * 359° and 1° are neighbours, as they are in fact.
 *
 * It is the gauge's law (see PHILOSOPHY.md) carried onto polar geometry:
 *
 *   - DIRECTION → ANGLE   the needle's bearing IS the heading. The form is the
 *                         function — the pointer points where the thing points.
 *   - LIVE                set `heading` again and it re-renders; read it twice
 *                         while an antenna tracks and you see different things.
 *   - HONEST MOTION       the needle tweens to new headings the SHORT way around
 *                         (350°→10° rotates +20°, never -340°), but the whole
 *                         truth — the number, the band colour, the pointer angle —
 *                         is present in a single static frame. Under
 *                         prefers-reduced-motion the tween is skipped, not the
 *                         meaning. A heading you could only read while it spun
 *                         would be decoration wearing a function's coat.
 *
 * The DIAL is fixed (N up, E right, S down, W left) and the NEEDLE rotates — the
 * standard heading-indicator convention, and the honest one: the cardinal labels
 * stay upright and legible at every heading rather than tumbling with the card.
 *
 * Attributes (all reactive):
 *   heading          current bearing in degrees, 0..360, wraps   (default 0)
 *   target           optional target/desired bearing marker      (optional)
 *   warn             |heading-target| at/after which band=warning (optional)
 *   crit             |heading-target| at/after which band=critical(optional)
 *   label            caption under the readout                    (optional)
 *   size             px square                                    (default 160)
 *
 * When `target` is set, `warn`/`crit` are read as off-target TOLERANCES (in
 * degrees of shortest-angle error): the needle colours warning/critical as the
 * heading drifts off the target bearing, so "steer toward" reads as a colour, not
 * arithmetic the operator has to do in their head. With no target the needle is
 * always nominal — a bearing alone has no "wrong".
 */
import { num, prefersReducedMotion } from "./bands";

/** Normalise any angle into [0, 360). */
function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Signed shortest angular delta from `a` to `b`, in (-180, 180]. */
function shortestDelta(a: number, b: number): number {
  return ((((b - a) % 360) + 540) % 360) - 180;
}

export class TalosCompass extends HTMLElement {
  // CONVENTION: every Talos web component declares observedAttributes as a
  // static GETTER (not a class field), uniformly across the library — the getter
  // is unambiguously evaluated before customElements.define() reads it, with no
  // dependency on how the bundler lowers static fields. Keep new components here.
  static get observedAttributes(): string[] {
    return ["heading", "target", "warn", "crit", "label", "size"];
  }

  private root: ShadowRoot;
  private needle!: SVGGElement;
  private targetMark!: SVGGElement;
  private readout!: HTMLElement;
  private caption!: HTMLElement;

  private frame = 0;
  private shown = 0; // the currently-displayed (eased) heading, may be unwrapped

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          /* Band colours default to the status tokens; the rendered band sets
             --_c to one of these, and the needle (the state-bearer) reads it.
             Copied verbatim from the gauge so a retheme via
             --talos-success/warning/danger reaches every instrument alike. */
          --_nominal: var(--talos-success, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(38 92% 60%));
          --_critical: var(--talos-danger, hsl(0 80% 62%));
          --_track: var(--talos-edge-subtle, hsl(0 0% 100% / 0.1));
          --_c: var(--_nominal);

          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          font-family: var(--talos-font-display, system-ui);
          color: var(--talos-foreground, #e7e9ec);
        }
        .dial { position: relative; }
        svg { display: block; overflow: visible; }
        .ring {
          fill: none;
          stroke: var(--_track);
        }
        /* Ticks belong to the FIXED dial — they never move, so a heading reads
           against a stable card. Cardinal ticks are heavier than the minor 30°
           ticks: the hierarchy IS the information (N/E/S/W anchor the read). */
        .tick { stroke: var(--_track); }
        .tick.major { stroke: var(--talos-edge, hsl(0 0% 100% / 0.22)); }
        .cardinal {
          fill: var(--talos-muted-foreground, hsl(0 0% 60%));
          font-size: var(--_cardinal-size, 10px);
          font-weight: 500;
          letter-spacing: 0.04em;
          text-anchor: middle;
          dominant-baseline: central;
        }
        .cardinal.north { fill: var(--talos-foreground, #e7e9ec); }
        /* The needle is the ONLY thing that rotates. Its colour is the off-target
           state (or nominal when there's no target) — colour snaps, only the
           rotation tweens, so the band can never lag the data. */
        .needle line { stroke: var(--_c); stroke-linecap: round; }
        .needle .tail { stroke: var(--talos-muted-foreground, hsl(0 0% 45%)); }
        .hub { fill: var(--_c); }
        /* The target marker rides the fixed dial at the DESIRED bearing — a
           steer-toward cue. Hidden entirely when no target is set (absence is the
           contract; we don't draw a marker at an implied 0°). */
        .target { fill: var(--talos-accent, hsl(190 90% 60%)); }
        .readout {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          white-space: nowrap;
          font-weight: 300;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
          line-height: 1;
          color: var(--_c);
        }
        .caption {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: var(--talos-tracking-hud, 0.18em);
          color: var(--talos-muted-foreground, hsl(0 0% 60%));
        }
        .caption:empty { display: none; }
      </style>
      <div class="dial" part="dial">
        <svg part="svg">
          <circle class="ring" part="ring"></circle>
          <g class="ticks" part="ticks"></g>
          <g class="cardinals" part="cardinals"></g>
          <g class="target" part="target"></g>
          <g class="needle" part="needle"></g>
          <circle class="hub" part="hub"></circle>
        </svg>
        <div class="readout" part="readout"></div>
      </div>
      <div class="caption" part="caption"></div>
    `;
    this.needle = this.root.querySelector(".needle")!;
    this.targetMark = this.root.querySelector(".target")!;
    this.readout = this.root.querySelector(".readout")!;
    this.caption = this.root.querySelector(".caption")!;
  }

  private observer?: MutationObserver;

  connectedCallback(): void {
    this.shown = norm360(num(this, "heading", 0));
    this.render();
    // Reactivity via a filtered MutationObserver (not attributeChangedCallback).
    // render() writes role/aria-* back onto the host every frame; the observe()
    // call below uses an explicit attributeFilter that excludes those, so a
    // single mechanism handles real inputs without looping on its own
    // write-backs (an unfiltered observer would freeze the renderer). This is
    // the pattern the animated instruments share.
    this.observer = new MutationObserver(() => this.update());
    this.startEase();
    this.observer.observe(this, {
      attributeFilter: ["heading", "target", "warn", "crit", "label", "size"],
    });
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }

  /** Render immediately from the true heading (colour + readout are exact at
   *  once); the needle angle eases toward it via startEase(). */
  private update(): void {
    if (prefersReducedMotion()) this.shown = norm360(num(this, "heading", this.shown));
    this.render();
  }

  /** A single persistent rAF that eases the displayed needle angle toward the
   *  live target each frame — the SHORT way around the dial. The ease runs on the
   *  signed shortest delta (350°→10° is +20°, not -340°), so the needle never
   *  takes the long way past S to get from W to N. Self-contained: it reads the
   *  attribute live, so there is no per-mutation tween state to cancel/restart. */
  private startEase(): void {
    cancelAnimationFrame(this.frame);
    const loop = () => {
      const target = norm360(num(this, "heading", this.shown));
      // Shortest-angle interpolation: ease along the signed delta, then re-wrap.
      const delta = shortestDelta(this.shown, target);
      if (Math.abs(delta) > 0.5) {
        this.shown = norm360(this.shown + delta * 0.18);
        this.render();
      } else if (this.shown !== target) {
        this.shown = target;
        this.render();
      }
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  /** Polar→cartesian with 0° = NORTH (up) and angle increasing CLOCKWISE, the
   *  compass convention — distinct from the gauge's 0°=right/CW screen math. */
  private point(cx: number, cy: number, r: number, deg: number): [number, number] {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  private render(): void {
    const size = num(this, "size", 160);
    const stroke = Math.max(2, size * 0.02);
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - stroke / 2 - 2;

    const svg = this.root.querySelector("svg")!;
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

    const ring = this.root.querySelector(".ring")!;
    ring.setAttribute("cx", String(cx));
    ring.setAttribute("cy", String(cy));
    ring.setAttribute("r", String(r));
    ring.setAttribute("stroke-width", String(stroke));

    // ── Fixed dial: ticks every 30°, cardinals heavier. Drawn once geometry is
    //    known; cheap enough to rebuild each render so it tracks `size`. ────────
    const ticks = this.root.querySelector(".ticks")!;
    const cardinals = this.root.querySelector(".cardinals")!;
    ticks.innerHTML = "";
    cardinals.innerHTML = "";
    for (let deg = 0; deg < 360; deg += 30) {
      const major = deg % 90 === 0; // N/E/S/W
      const inner = r - (major ? size * 0.1 : size * 0.06);
      const [x0, y0] = this.point(cx, cy, r - 1, deg);
      const [x1, y1] = this.point(cx, cy, inner, deg);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", major ? "tick major" : "tick");
      line.setAttribute("x1", String(x0));
      line.setAttribute("y1", String(y0));
      line.setAttribute("x2", String(x1));
      line.setAttribute("y2", String(y1));
      line.setAttribute("stroke-width", String(major ? stroke * 1.4 : stroke));
      ticks.appendChild(line);
    }
    // Cardinal letters sit UPRIGHT on the fixed dial (the card does not rotate),
    // so they read at every heading. Placed inset from the ring.
    const labelR = r - size * 0.2;
    const card: Array<[string, number]> = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
    for (const [letter, deg] of card) {
      const [lx, ly] = this.point(cx, cy, labelR, deg);
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("class", letter === "N" ? "cardinal north" : "cardinal");
      t.setAttribute("x", String(lx));
      t.setAttribute("y", String(ly));
      t.style.setProperty("--_cardinal-size", `${size * 0.085}px`);
      t.textContent = letter;
      cardinals.appendChild(t);
    }

    // ── State: off-target band drives the needle colour. With no target there is
    //    no "wrong" bearing, so the needle stays nominal. The error fed to the
    //    band helper is the ABSOLUTE shortest-angle distance to target (0..180),
    //    so warn/crit read as plain tolerances in degrees. ──────────────────────
    const headingTrue = norm360(num(this, "heading", 0));
    const targetAttr = this.getAttribute("target");
    const hasTarget = targetAttr !== null && Number.isFinite(parseFloat(targetAttr));
    let bandVar = "--_nominal";
    if (hasTarget) {
      const targetDeg = norm360(parseFloat(targetAttr!));
      const error = Math.abs(shortestDelta(headingTrue, targetDeg));
      const crit = this.getAttribute("crit");
      const warn = this.getAttribute("warn");
      if (crit !== null && error >= parseFloat(crit)) bandVar = "--_critical";
      else if (warn !== null && error >= parseFloat(warn)) bandVar = "--_warning";
    }
    this.style.setProperty("--_c", `var(${bandVar})`);

    // ── Target marker on the FIXED dial at the desired bearing (a steer-toward
    //    cue). A small triangle just inside the ring; hidden when no target. ─────
    if (hasTarget) {
      const targetDeg = norm360(parseFloat(targetAttr!));
      const tip = this.point(cx, cy, r - size * 0.02, targetDeg);
      const baseR = r - size * 0.08;
      const wDeg = 6;
      const [bx0, by0] = this.point(cx, cy, baseR, targetDeg - wDeg);
      const [bx1, by1] = this.point(cx, cy, baseR, targetDeg + wDeg);
      this.targetMark.innerHTML =
        `<polygon points="${tip[0]},${tip[1]} ${bx0},${by0} ${bx1},${by1}"></polygon>`;
    } else {
      this.targetMark.innerHTML = "";
    }

    // ── Needle: rotates to the EASED `shown` angle (smooth motion); colour uses
    //    the TRUE heading's band so state never lags the pointer. The needle is a
    //    hub-anchored pointer with a short opposing tail, so it reads as a compass
    //    needle rather than a single ray. ────────────────────────────────────────
    const angle = this.shown;
    const [tipX, tipY] = this.point(cx, cy, r - size * 0.12, angle);
    const [tailX, tailY] = this.point(cx, cy, r * 0.42, angle + 180);
    this.needle.innerHTML =
      `<line class="head" x1="${cx}" y1="${cy}" x2="${tipX}" y2="${tipY}" stroke-width="${Math.max(2, size * 0.022)}"></line>` +
      `<line class="tail" x1="${cx}" y1="${cy}" x2="${tailX}" y2="${tailY}" stroke-width="${Math.max(1.5, size * 0.016)}"></line>`;

    const hub = this.root.querySelector(".hub")!;
    hub.setAttribute("cx", String(cx));
    hub.setAttribute("cy", String(cy));
    hub.setAttribute("r", String(Math.max(2.5, size * 0.03)));

    // ── Readout: the TRUE heading, zero-padded to three digits with a degree
    //    sign (e.g. "047°") — the digital-exact number beside the analog-smooth
    //    needle, as instruments do. ────────────────────────────────────────────
    const display = String(Math.round(headingTrue) % 360).padStart(3, "0");
    this.readout.textContent = `${display}°`;
    this.readout.style.fontSize = `${size * 0.17}px`;

    this.caption.textContent = this.getAttribute("label") ?? "";

    // ── Accessibility: a bearing is a picture of a direction, not a slider, so
    //    role="img" with a spoken text alternative that survives no-CSS / no-SVG.
    this.setAttribute("role", "img");
    const lbl = this.getAttribute("label");
    const headingWord = `Heading ${Math.round(headingTrue) % 360} degrees`;
    const targetWord = hasTarget
      ? `, target ${Math.round(norm360(parseFloat(targetAttr!)))} degrees`
      : "";
    this.setAttribute("aria-label", `${lbl ? `${lbl}: ` : ""}${headingWord}${targetWord}`);
  }
}
