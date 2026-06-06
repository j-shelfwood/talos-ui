/**
 * @shelfwood/talos-ui/ambient — the cursor tracking the `.ambient-overlay` grid
 * reads. The CSS ships the visual (and reads `--talos-cursor-x/y`), but writing
 * those properties is a runtime concern, so it lives here as an opt-in export
 * rather than being inlined by every consumer.
 *
 *   import { initAmbientCursor } from "@shelfwood/talos-ui/ambient";
 *   initAmbientCursor();
 *
 * Smooth-lerped (the pointer is followed, not snapped), idempotent (safe to call
 * after every Astro view-transition swap), and honest about capability: on
 * no-hover/touch devices and under prefers-reduced-motion the crosshair is
 * parked at center with no rAF loop running.
 */
export interface AmbientOptions {
  /** Lerp factor per frame, 0..1. Higher = snappier. Default 0.08. */
  lerp?: number;
  /** Element whose custom properties are written. Default <html>. */
  target?: HTMLElement;
}

export function initAmbientCursor(opts: AmbientOptions = {}): void {
  if (typeof window === "undefined") return; // SSR no-op
  const w = window as unknown as { __talosAmbientBound?: boolean };
  if (w.__talosAmbientBound) return; // idempotent across view-transition swaps
  w.__talosAmbientBound = true;

  const root = opts.target ?? document.documentElement;
  const lerp = opts.lerp ?? 0.08;

  const noHover = window.matchMedia("(hover: none)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Capability-honest fallback: park the crosshair at center, no loop.
  if (noHover || reduced) {
    root.style.setProperty("--talos-cursor-x", `${window.innerWidth / 2}px`);
    root.style.setProperty("--talos-cursor-y", `${window.innerHeight / 2}px`);
    return;
  }

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let smoothX = targetX;
  let smoothY = targetY;

  const frame = () => {
    smoothX += (targetX - smoothX) * lerp;
    smoothY += (targetY - smoothY) * lerp;
    root.style.setProperty("--talos-cursor-x", `${smoothX.toFixed(1)}px`);
    root.style.setProperty("--talos-cursor-y", `${smoothY.toFixed(1)}px`);
    requestAnimationFrame(frame);
  };

  window.addEventListener(
    "pointermove",
    (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    },
    { passive: true },
  );

  requestAnimationFrame(frame);
}
