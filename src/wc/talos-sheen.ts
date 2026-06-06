/**
 * <talos-sheen> — activates the dormant pointer sheen on .glass-panel chrome.
 *
 * talos.css already DESIGNS a cursor-tracked sheen: .glass-panel::after reads
 * --talos-mx / --talos-my / --talos-sheen (all @property-registered for smooth
 * transitions). But nothing ever WRITES those custom properties, so the sheen
 * sits at its initial-value (centred, zero brightness) and never moves. This
 * element is the missing hand on the dial — it wires the pointer to the CSS
 * that was waiting for it. No new visual is invented here; a designed-in one is
 * switched on.
 *
 * This is an AFFORDANCE, not telemetry: the sheen says "this surface is under
 * the pointer / is interactive", the same honest claim as `cursor: pointer`.
 * It encodes pointer presence, nothing more — so it is allowed to be smooth and
 * decorative-feeling without violating "motion is telemetry": pointer position
 * IS the datum it reflects.
 *
 *   <talos-sheen>            tracks every .glass-panel inside it
 *     <div class="glass-panel">…</div>
 *   </talos-sheen>
 *
 * Attributes:
 *   selector   which descendants to track   (default ".glass-panel")
 *   radius     sheen ramp-down, px           (informational; CSS owns the size)
 *
 * The ring-lag the reference pen uses for its cursor is unnecessary here: the
 * @property transition on --talos-mx/--talos-my already eases the spotlight in
 * CSS (240ms on --talos-sheen, and the browser interpolates the registered
 * length/percentage props), so writing raw pointer coords yields a smooth trail
 * for free. Under prefers-reduced-motion we still set position but leave sheen
 * brightness at 0 — no glow pulse for users who opted out of motion.
 */
export class TalosSheen extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["selector"];
  }

  private onMove = (e: PointerEvent): void => this.track(e);
  private onLeave = (): void => this.clear();
  private bound = false;

  connectedCallback(): void {
    this.bind();
  }

  disconnectedCallback(): void {
    this.unbind();
  }

  attributeChangedCallback(): void {
    // selector changed: nothing to rebind (we delegate from the host), but clear
    // any active sheen on the previous target set so it doesn't stick lit.
    this.clear();
  }

  private get sel(): string {
    return this.getAttribute("selector") ?? ".glass-panel";
  }

  private get reducedMotion(): boolean {
    return (
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  private bind(): void {
    if (this.bound) return;
    // Delegate from the host: one listener for any number of panels, and panels
    // added/removed later are handled without re-binding (we resolve the target
    // per-event via closest()).
    this.addEventListener("pointermove", this.onMove);
    this.addEventListener("pointerleave", this.onLeave, true);
    this.bound = true;
  }

  private unbind(): void {
    if (!this.bound) return;
    this.removeEventListener("pointermove", this.onMove);
    this.removeEventListener("pointerleave", this.onLeave, true);
    this.bound = false;
  }

  /** Resolve the panel under the pointer and write the sheen custom props on it. */
  private track(e: PointerEvent): void {
    const target = (e.target as Element | null)?.closest?.(this.sel) as
      | HTMLElement
      | null;
    if (!target || !this.contains(target)) {
      this.clear();
      this.lit = null;
      return;
    }
    if (this.lit && this.lit !== target) this.dim(this.lit);
    this.lit = target;

    const r = target.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const mx = ((e.clientX - r.left) / r.width) * 100;
    const my = ((e.clientY - r.top) / r.height) * 100;
    target.style.setProperty("--talos-mx", `${mx.toFixed(2)}%`);
    target.style.setProperty("--talos-my", `${my.toFixed(2)}%`);
    // Brightness is the affordance signal. Suppressed under reduced-motion: the
    // pointer position still tracks (cheap, no pulse), but no glow ramps up.
    target.style.setProperty("--talos-sheen", this.reducedMotion ? "0" : "1");
  }

  private lit: HTMLElement | null = null;

  private dim(el: HTMLElement): void {
    el.style.setProperty("--talos-sheen", "0");
  }

  private clear(): void {
    if (this.lit) {
      this.dim(this.lit);
      this.lit = null;
    }
  }
}
