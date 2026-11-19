/**
 * The frame-loop primitive for animated instruments.
 *
 * A loop runs only while its `step` asks for another frame (returns `true`), so
 * an instrument at rest schedules no requestAnimationFrame at all. A change
 * calls `start()` again; `start()` is idempotent while a frame is pending, so a
 * burst of attribute writes never stacks loops.
 */
export class FrameLoop {
  private id: number | null = null;

  constructor(private readonly step: (now: number) => boolean) {}

  get running(): boolean {
    return this.id !== null;
  }

  start(): void {
    if (this.id === null) this.id = requestAnimationFrame(this.run);
  }

  stop(): void {
    if (this.id !== null) cancelAnimationFrame(this.id);
    this.id = null;
  }

  private run = (now: number): void => {
    this.id = null;
    if (this.step(now)) this.start();
  };
}

/**
 * One exponential-approach step of an eased display value toward its target.
 * Returns the target exactly once the gap is within `snap`, which is how an
 * ease loop knows it has settled (`next === target`).
 */
export function approach(shown: number, target: number, snap = 0.5, k = 0.18): number {
  const diff = target - shown;
  return Math.abs(diff) > snap ? shown + diff * k : target;
}

/**
 * Track whether `el` intersects the viewport. Calls `onChange(visible)` on each
 * transition. Without IntersectionObserver (SSR, old engines) the element is
 * treated as always visible. Returns the disconnect function.
 */
export function watchVisibility(el: Element, onChange: (visible: boolean) => void): () => void {
  if (typeof IntersectionObserver === "undefined") return () => {};
  const io = new IntersectionObserver((entries) => {
    const last = entries[entries.length - 1];
    if (last) onChange(last.isIntersecting);
  });
  io.observe(el);
  return () => io.disconnect();
}
