export { TalosPanel } from './talos-panel.js';
export { TalosCorner } from './talos-corner.js';
export { TalosNotch } from './talos-notch.js';
export { TalosGauge } from './talos-gauge.js';
export { TalosTrend } from './talos-trend.js';
export { TalosMeter } from './talos-meter.js';
export { TalosFlow } from './talos-flow.js';
export { O as OrbitalNode, T as TalosOrbital } from '../talos-orbital-BemcLHig.js';
export { TalosSheen } from './talos-sheen.js';
export { TalosReadout } from './talos-readout.js';
export { TalosSpark } from './talos-spark.js';
export { TalosDots } from './talos-dots.js';
export { TalosDelta } from './talos-delta.js';
export { TalosStat } from './talos-stat.js';
export { TalosLed } from './talos-led.js';
export { T as TalosToggle, a as ToggleOption } from '../talos-toggle-DLaHbPCj.js';
export { TalosStatus } from './talos-status.js';
export { TalosMatrix } from './talos-matrix.js';
export { G as Gateway, a as GroundSat, T as TalosGroundtrack } from '../talos-groundtrack-kqERxIVd.js';
export { TalosHistogram } from './talos-histogram.js';
export { T as TalosPlane, a as TrackSat } from '../talos-plane-b3ePv2LB.js';
export { P as PartState, a as Parts, T as TalosSpacecraft } from '../talos-spacecraft-CcWiP2tl.js';
export { TalosRange } from './talos-range.js';
export { TalosCompass } from './talos-compass.js';
export { P as PercentileStats, T as TalosPercentile } from '../talos-percentile-C5W2CD7A.js';
export { T as TalosTicker, a as TickerEvent } from '../talos-ticker-MR1_Jl7Q.js';
export { TalosOdometer } from './talos-odometer.js';
export { C as CornerEdge, E as Edge, P as PanelShapeBuilder, a as PanelShapeOptions, S as Segment } from '../PanelShapeBuilder-AmPisDtF.js';

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
type Band = "nominal" | "warning" | "critical";

export type { Band };
