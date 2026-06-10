/**
 * @j_shelfwood/talos-ui/ambient — the cursor tracking the `.ambient-overlay` grid
 * reads. The CSS ships the visual (and reads `--talos-cursor-x/y`), but writing
 * those properties is a runtime concern, so it lives here as an opt-in export
 * rather than being inlined by every consumer.
 *
 *   import { initAmbientCursor } from "@j_shelfwood/talos-ui/ambient";
 *   initAmbientCursor();
 *
 * Smooth-lerped (the pointer is followed, not snapped), idempotent (safe to call
 * after every Astro view-transition swap), and honest about capability: on
 * no-hover/touch devices and under prefers-reduced-motion the crosshair is
 * parked at center with no rAF loop running.
 */
interface AmbientOptions {
    /** Lerp factor per frame, 0..1. Higher = snappier. Default 0.08. */
    lerp?: number;
    /** Element whose custom properties are written. Default <html>. */
    target?: HTMLElement;
}
declare function initAmbientCursor(opts?: AmbientOptions): void;

export { type AmbientOptions, initAmbientCursor };
