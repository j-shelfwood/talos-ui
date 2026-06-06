/**
 * Shared health-band logic for the data-binding instruments.
 *
 * The threshold model is uniform across the library: a value crosses into
 * `warning` at the `warn` attribute and `critical` at the `crit` attribute.
 * Thresholds are read live from the element's attributes; when an attribute is
 * absent that band simply never triggers (no implicit default — the absence is
 * the contract). <talos-gauge> and <talos-meter> share this exact behaviour.
 *
 * NOTE: <talos-orbital> deliberately uses *defaulted* thresholds (warn=70 /
 * crit=90) and returns a CSS-var colour rather than a state name, so it does
 * NOT use this helper — its band semantics are intentionally different.
 */
export type Band = "nominal" | "warning" | "critical";

/** Resolve the health band for `value` from the element's warn/crit attrs. */
export function bandOf(el: Element, value: number): Band {
  const crit = el.getAttribute("crit");
  const warn = el.getAttribute("warn");
  if (crit !== null && value >= parseFloat(crit)) return "critical";
  if (warn !== null && value >= parseFloat(warn)) return "warning";
  return "nominal";
}
