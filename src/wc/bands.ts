/**
 * Shared health-band logic for the data-binding instruments.
 *
 * The threshold model is uniform across the library: a value crosses into
 * `warning` at the `warn` attribute and `critical` at the `crit` attribute.
 * Thresholds are read live from the element's attributes; when an attribute is
 * absent that band simply never triggers (no implicit default — the absence is
 * the contract). <talos-gauge> and <talos-meter> share this exact behaviour.
 *
 * DIRECTION. By default "high = bad": the band trips when value RISES to/past
 * the threshold (CPU, heap, error rate). Some signals are "low = bad" — frame
 * rate, coolant reserve, battery, signal strength — where danger is a value
 * FALLING. Add the `invert` attribute and the comparison flips: warning/critical
 * trip when value drops to/below the threshold. This keeps the form honest (a
 * dangerously low reading reads red) without a separate inverted instrument.
 *
 *   <talos-gauge value="20" warn="40" crit="20" invert>  → 20 ≤ crit → critical
 *
 * NOTE: <talos-orbital> deliberately uses *defaulted* thresholds (warn=70 /
 * crit=90) and returns a CSS-var colour rather than a state name, so it does
 * NOT use this helper — its band semantics are intentionally different.
 */
export type Band = "nominal" | "warning" | "critical";

/**
 * Resolve the health band for `value` from the element's warn/crit attrs.
 * Honours `invert` (low = bad) when the attribute is present.
 */
export function bandOf(el: Element, value: number): Band {
  const crit = el.getAttribute("crit");
  const warn = el.getAttribute("warn");
  const invert = el.hasAttribute("invert");
  // High-bad (default): value >= threshold. Low-bad (invert): value <= threshold.
  const trips = (t: string) =>
    invert ? value <= parseFloat(t) : value >= parseFloat(t);
  if (crit !== null && trips(crit)) return "critical";
  if (warn !== null && trips(warn)) return "warning";
  return "nominal";
}

/**
 * The local CSS custom property a band maps to inside an instrument's shadow
 * root. The canonical band-token names mirror the `Band` union exactly:
 * `--_nominal` / `--_warning` / `--_critical`. Use with {@link BAND_TOKENS_CSS}.
 */
export function bandColorVar(band: Band): string {
  return band === "critical"
    ? "--_critical"
    : band === "warning"
      ? "--_warning"
      : "--_nominal";
}

/**
 * The band-token block every instrument opens its `:host` with. One source of
 * truth for the three health colours (and their palette fallbacks), so a
 * retheme via `--talos-success/warning/danger` reaches every instrument and the
 * local names never fork (`--_ok/--_warn/--_crit` was a second scheme; retired).
 * Inject as the first declarations inside `:host { … }`.
 */
export const BAND_TOKENS_CSS = /* css */ `
  --_nominal: var(--talos-success, hsl(140 90% 60%));
  --_warning: var(--talos-warning, hsl(38 92% 60%));
  --_critical: var(--talos-danger, hsl(0 80% 62%));`;

/**
 * Read a finite number from an element attribute, falling back when the
 * attribute is absent or non-numeric. The uniform attribute-number parser for
 * every instrument (replaces the per-component `this.num()` copies).
 */
export function num(el: Element, attr: string, fallback: number): number {
  const v = parseFloat(el.getAttribute(attr) ?? "");
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Whether the user prefers reduced motion. Instruments use this to skip tweens
 * while keeping the static frame fully readable (the honesty clause). SSR-safe.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
