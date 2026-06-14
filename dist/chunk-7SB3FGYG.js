// src/wc/bands.ts
function bandOf(el, value) {
  const crit = el.getAttribute("crit");
  const warn = el.getAttribute("warn");
  const invert = el.hasAttribute("invert");
  const trips = (t) => invert ? value <= parseFloat(t) : value >= parseFloat(t);
  if (crit !== null && trips(crit)) return "critical";
  if (warn !== null && trips(warn)) return "warning";
  return "nominal";
}
function num(el, attr, fallback) {
  const v = parseFloat(el.getAttribute(attr) ?? "");
  return Number.isFinite(v) ? v : fallback;
}
function prefersReducedMotion() {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export {
  bandOf,
  num,
  prefersReducedMotion
};
