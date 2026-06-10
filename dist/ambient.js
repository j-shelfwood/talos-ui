// src/ambient.ts
function initAmbientCursor(opts = {}) {
  if (typeof window === "undefined") return;
  const w = window;
  if (w.__talosAmbientBound) return;
  w.__talosAmbientBound = true;
  const root = opts.target ?? document.documentElement;
  const lerp = opts.lerp ?? 0.08;
  const noHover = window.matchMedia("(hover: none)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    { passive: true }
  );
  requestAnimationFrame(frame);
}
export {
  initAmbientCursor
};
