/**
 * Manual requestAnimationFrame for component tests: frames advance only when a
 * test calls flush(), and `pending` counts scheduled callbacks, which is how a
 * test asserts that an instrument at rest schedules nothing.
 */
export function installFrames() {
  let next = 1;
  let now = 0;
  const queue = new Map<number, FrameRequestCallback>();
  const raf = (cb: FrameRequestCallback): number => {
    const id = next++;
    queue.set(id, cb);
    return id;
  };
  const caf = (id: number): void => {
    queue.delete(id);
  };
  const saved = { raf: globalThis.requestAnimationFrame, caf: globalThis.cancelAnimationFrame };
  Object.defineProperty(globalThis, "requestAnimationFrame", { value: raf, configurable: true, writable: true });
  Object.defineProperty(globalThis, "cancelAnimationFrame", { value: caf, configurable: true, writable: true });
  return {
    get pending(): number {
      return queue.size;
    },
    /** Run up to `n` frames, 16 ms apart; returns how many ran a callback. */
    flush(n = 1): number {
      let ran = 0;
      for (let i = 0; i < n && queue.size; i++) {
        now += 16;
        const batch = [...queue.values()];
        queue.clear();
        for (const cb of batch) cb(now);
        ran++;
      }
      return ran;
    },
    restore(): void {
      Object.defineProperty(globalThis, "requestAnimationFrame", { value: saved.raf, configurable: true, writable: true });
      Object.defineProperty(globalThis, "cancelAnimationFrame", { value: saved.caf, configurable: true, writable: true });
    },
  };
}

/** Let MutationObserver callbacks (microtasks) run. */
export const settle = () => new Promise<void>((r) => setTimeout(r, 0));
