/**
 * <talos-panel> — chamfered/notched panel rendered as an SVG outline, with
 * slotted content on top. Monochrome: hairline white-on-black border, dark
 * fill. No glow, no neon. Shape composes from child <talos-corner> /
 * <talos-notch> decorators.
 *
 * Attributes:
 *   panel-width / panel-height : viewBox dimensions (default 400 / 200)
 *   fill        : panel fill color   (default var(--talos-hud-fill))
 *   edge        : border color       (default var(--talos-hud-edge))
 *   stroke-width: border width px     (default 1)
 *   animate     : if present, stroke-draws the outline on first render
 *   animation-duration : ms (default 800)
 *
 * The default (no decorators) is a plain rectangle, matching .glass-panel
 * geometry intent. Add decorators to cut corners or notch edges.
 */
declare class TalosPanel extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private svg;
    private path;
    private observer?;
    private frame;
    private animatedOnce;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    /** Coalesce bursts of mutations into one render per frame. */
    private scheduleRender;
    private dim;
    private render;
    private get reducedMotion();
    private draw;
}

/**
 * PanelShapeBuilder — constructs an SVG path string for a chamfered/notched
 * panel outline from a set of corner + notch segments.
 *
 * Ported from prj-talos-ui, stripped of all debug/console/drawing-step
 * scaffolding. Pure geometry: in → segments, out → SVG `d` string.
 */
type Edge = "top" | "right" | "bottom" | "left";
type CornerEdge = "top-left" | "top-right" | "bottom-right" | "bottom-left";
interface Segment {
    type: "corner" | "notch";
    /** Corners: "top-left" | "top-right" | "bottom-right" | "bottom-left".
     *  Notches: "top" | "right" | "bottom" | "left". */
    edge: string;
    /** Corner only — chamfer length (px). */
    radius?: number;
    /** Notch only. */
    width?: number;
    depth?: number;
}
interface PanelShapeOptions {
    width: number;
    height: number;
}
declare class PanelShapeBuilder {
    private width;
    private height;
    constructor(opts: PanelShapeOptions);
    buildPath(segments: Segment[]): string;
    private notch;
}

/**
 * <talos-corner edge="top-left" radius="16">
 * Declarative chamfer decorator. Pure data carrier — renders nothing itself;
 * its parent <talos-panel> reads toSegment() to build the outline.
 */
declare class TalosCorner extends HTMLElement {
    static get observedAttributes(): string[];
    attributeChangedCallback(): void;
    toSegment(): Segment | null;
}

/**
 * <talos-notch edge="top" width="60" depth="20">
 * Declarative edge cut-out. Pure data carrier — its parent <talos-panel>
 * reads toSegment() to build the outline.
 */
declare class TalosNotch extends HTMLElement {
    static get observedAttributes(): string[];
    attributeChangedCallback(): void;
    toSegment(): Segment | null;
}

declare class TalosGauge extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private arc;
    private needle;
    private readout;
    private caption;
    private frame;
    private shown;
    constructor();
    private observer?;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private num;
    private get reducedMotion();
    /** Render immediately from the true value (colour + readout are exact at once);
     *  the needle position eases toward it via startEase(). */
    private update;
    /** A single persistent rAF that eases `shown` toward the live target each
     *  frame. Self-contained — it reads the attribute live, so no per-mutation
     *  tween state to cancel/restart (the old approach deadlocked under rapid
     *  updates). Runs until disconnect. */
    private startEase;
    /** Which band the value falls in — this is the state, and it drives colour. */
    private band;
    /** Polar→cartesian on the dial circle, angle in degrees (0 = right, CW). */
    private point;
    private arcPath;
    private render;
}

declare class TalosTrend extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private line;
    private area;
    private dot;
    private readout;
    private caption;
    private buf;
    private frame;
    constructor();
    private observer?;
    private lastValueAttr;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Append a sample and scroll the window. Preferred entry for streams. */
    push(value: number): void;
    private scheduleRender;
    private num;
    private band;
    private render;
    /** A word for the recent direction, so the static a11y label carries the
     *  same information the moving line does. */
    private trendWord;
}

declare class TalosMeter extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private fill;
    private ticksEl;
    private readout;
    private caption;
    private frame;
    private shown;
    constructor();
    private observer?;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private num;
    private get reducedMotion();
    /** Render immediately from the true value (colour + readout exact at once). */
    private update;
    /** Persistent rAF easing `shown` toward the live target each frame. */
    private startEase;
    private band;
    private render;
}

declare class TalosFlow extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private base;
    private dash;
    private chevrons;
    private raf;
    private offset;
    private last;
    constructor();
    private observer?;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private num;
    private get reducedMotion();
    private band;
    private pathD;
    private render;
    private renderChevrons;
    private tick;
}

/**
 * <talos-orbital> — the showpiece. A radial system: a central core with nodes
 * orbiting on concentric rings. Every visual property is bound to live state
 * (PHILOSOPHY.md — form encodes function), so it is an instrument, not an
 * animation:
 *
 *   - RING            a subsystem (inner = closer to the core / more critical).
 *   - NODE RADIUS     orbit ring → which subsystem the signal belongs to.
 *   - NODE SIZE       the node's `load` (0..1) — bigger = more loaded.
 *   - NODE COLOUR     health band from `warn`/`crit` thresholds on `value`.
 *   - ORBIT SPEED     angular velocity ∝ the node's `rate` (throughput). A node
 *                     with zero rate is parked — motion means data is moving.
 *   - ARC TO CORE     drawn when the node is actively flowing; opacity ∝ rate.
 *
 * Honest motion: under prefers-reduced-motion the nodes stop orbiting and park
 * at their current angle; size, colour, ring, and the flow arcs still encode the
 * full state. The picture is readable frozen — the orbit is the *enhancement*,
 * the arrangement is the *information*.
 *
 * Data API (imperative — this is a live instrument): set `.nodes` to an array of
 *   { id, ring, value, load, rate, label? }
 * ring is 1-based (1 = innermost). value drives colour band, load drives size,
 * rate drives orbit speed + arc. Re-assign `.nodes` (or mutate + call update())
 * to push new state; read it twice while a system runs and it differs.
 *
 * Attributes:
 *   rings      number of concentric rings              (default 3)
 *   warn/crit  band thresholds on node.value           (default 70 / 90)
 *   size       px square viewBox                        (default 520)
 *   core-label short text in the core                   (optional)
 */
interface OrbitalNode {
    id: string;
    ring: number;
    value: number;
    load: number;
    rate: number;
    label?: string;
}
declare class TalosOrbital extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private svg;
    private gRings;
    private gArcs;
    private gNodes;
    private core;
    private state;
    private raf;
    private lastT;
    private observer?;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Set the live node set. Preserves orbit angle for nodes that persist. */
    set nodes(next: OrbitalNode[]);
    get nodes(): OrbitalNode[];
    private num;
    private get reducedMotion();
    private get sizePx();
    private get ringCount();
    private get cx();
    private get cy();
    private get coreR();
    /** Radius of ring r (1-based). */
    private ringRadius;
    private bandColor;
    /** Draw the static frame: rings, axes, core. */
    private layout;
    /** Position + style nodes and their flow arcs from current state. */
    private renderNodes;
    /** Persistent rAF: advance each node's orbit by its rate, then re-render.
     *  (The proven reactivity pattern — one loop, reads live state, no per-change
     *  scheduling to starve.) */
    private startLoop;
    /** Force a re-render (e.g. after mutating node fields in place). */
    update(): void;
}

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
declare class TalosSheen extends HTMLElement {
    static get observedAttributes(): string[];
    private onMove;
    private onLeave;
    private bound;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    private get sel();
    private get reducedMotion();
    private bind;
    private unbind;
    /** Resolve the panel under the pointer and write the sheen custom props on it. */
    private track;
    private lit;
    private dim;
    private clear;
}

declare class TalosReadout extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private out;
    private caption;
    private frame;
    private scrambleStart;
    private toText;
    private lastValue;
    private static readonly GLYPHS;
    constructor();
    private observer?;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private get reducedMotion();
    private onAttrs;
    /** Band tint, only meaningful for numeric values — uses the shared bandOf()
     *  helper (bands.ts), so threshold + invert semantics match gauge/meter. A
     *  non-numeric value has no band: it stays neutral foreground. */
    private renderBand;
    private renderCaption;
    private startScramble;
    /** Progressive left-to-right resolve: characters before the progress index are
     *  the real value; the rest are random glyphs. Same shape as the reference. */
    private frameText;
    private paint;
    private escape;
    private num;
}

/**
 * <talos-spark> — a compact inline sparkline. The small sibling of <talos-trend>:
 * a value stream rendered as a polyline where POSITION/LENGTH carry the shape and
 * slope (the most perceptually-accurate channels — Cleveland & McGill). Use it
 * inside a stat cell or a dense readout where a full trend would be too large.
 *
 *   - SHAPE   the recent series, scaled to [min,max] over the buffer width.
 *   - COLOUR  the band of the CURRENT (last) value drives the stroke — colour
 *             IS the state. Honours `invert` (low = bad) like every instrument.
 *   - LIVE    push(v) appends a sample; or set the `points` attribute to a
 *             comma/space list. A frozen frame still shows the shape (motion
 *             test) — there is no animation to lose under reduced-motion.
 *
 * Attributes:
 *   points        initial series, comma/space separated   (optional)
 *   min / max     domain for the y-scale                  (default 0 / 100)
 *   warn / crit   band thresholds on the current value    (optional)
 *   invert        low = bad (flips band direction)        (optional)
 *   cap           max samples retained                    (default 32)
 *   fill          if present, fill under the line
 *
 * Imperative API: el.push(value) — preferred for streams.
 */
declare class TalosSpark extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private svg;
    private line;
    private area;
    private buf;
    private frame;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string): void;
    /** Append a sample and re-render (the streaming entry point). */
    push(value: number): void;
    private num;
    private schedule;
    private render;
}

/**
 * <talos-dots> — a dot-matrix: a discrete COUNT shown as filled-of-total marks.
 * The honest form for small countable quantities (active jobs, stalls, retries,
 * errors, depth) where a bar would imply a continuous magnitude against a fake
 * ceiling. Here the ceiling is real and small, and each mark is one unit — you
 * can literally count them (countable marks, not estimated length).
 *
 *   - QUANTITY   `value` of `total` dots are lit.
 *   - COLOUR     the lit dots take the band of `value` — colour is the state.
 *                Honours `invert` (low = bad) like every instrument.
 *   - HONEST     no animation to lose; a frozen frame shows the exact count.
 *
 * Attributes:
 *   value        number of lit dots                     (default 0)
 *   total        number of dots                         (default 8)
 *   warn / crit  band thresholds on `value`             (optional)
 *   invert       low = bad                              (optional)
 */
declare class TalosDots extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private wrap;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(): void;
    private num;
    private render;
}

/**
 * <talos-delta> — the CHANGE in a value: direction (▲ up / ▼ down / ▬ flat) plus
 * the magnitude of the step. Encodes a dimension no single gauge/bar/number can:
 * "which way, and by how much." Pair it with a number to turn a static reading
 * into a monitorable one.
 *
 *   - DIRECTION  arrow from the sign of (value − previous value).
 *   - MAGNITUDE  |Δ|, formatted; the figure is the change, not the level.
 *   - COLOUR     up = success, down = danger by default; flip with `good="down"`
 *                for metrics where falling is good (latency, error rate, cost).
 *
 * Attributes:
 *   value        current value; set it each tick and Δ is computed vs the last  (required)
 *   good         "up" (default) | "down" — which direction is the healthy one
 *   precision    decimal places for the magnitude                              (default 0)
 *   eps          dead-zone; |Δ| below this reads as flat                       (default 0)
 *
 * Imperative API: el.update(value) — equivalent to setting the `value` attribute.
 */
declare class TalosDelta extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private text;
    private prev;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, val: string | null): void;
    /** Imperative equivalent of setting `value`. */
    update(value: number): void;
    private num;
    private render;
    private setArrow;
}

/**
 * <talos-stat> — a labelled statistic cell: an eyebrow label, a big number, an
 * optional unit, and a default slot for supporting instruments (a <talos-spark>,
 * <talos-delta>, <talos-dots>). The atom of a console wall — many of these in a
 * grid IS the dashboard, each one doing semantic work.
 *
 *   - VALUE     the big number; on change it COUNTS to the new figure (the honest
 *               motion for a changing magnitude — the animation depicts the
 *               transition, not decoration). Snaps under prefers-reduced-motion.
 *   - COLOUR    the number takes the band of `value` when warn/crit are set —
 *               colour is the state. Honours `invert` (low = bad).
 *
 * Attributes:
 *   value        the figure                              (default 0)
 *   label        eyebrow caption                         (optional)
 *   unit         appended after the number               (optional)
 *   precision    decimals for the displayed value        (default 0)
 *   warn / crit  band thresholds                         (optional)
 *   invert       low = bad                               (optional)
 *   duration     count animation ms                      (default 500)
 *
 * Imperative API: el.set(value).
 */
declare class TalosStat extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private numEl;
    private labelEl;
    private unitEl;
    private shown;
    private frame;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string): void;
    /** Imperative setter. */
    set(value: number): void;
    private num;
    private paintStatic;
    private setBand;
    private render;
}

/**
 * <talos-led> — a single status light. The smallest instrument: one dot whose
 * COLOUR is a state and whose PULSE means "live". The honest replacement for a
 * hand-coloured `<span>` status dot — here the colour is bound, not decorative.
 *
 *   - COLOUR   the state. Two ways to drive it:
 *              • `state="ok|warn|crit|idle"` — a direct qualitative state, or
 *              • `value` + `warn`/`crit` — banded via the shared bandOf() helper
 *                (same threshold + `invert` semantics as gauge/meter). If both
 *                are present, `value`/thresholds win (the live reading leads).
 *              `idle` has no band — it reads muted, "nothing to report".
 *   - PULSE    `live` makes the light pulse; the pulse means the channel is
 *              actively reporting, not a decorative shimmer. Drop `live` and it
 *              holds steady — a steady light is still a valid, readable state.
 *   - HONEST   the colour (and an aria-label) carry the state in a single static
 *              frame; under prefers-reduced-motion the pulse is dropped, never
 *              the colour. A light whose meaning lived only in the pulse would be
 *              decoration wearing a function's coat.
 *
 * Attributes (all reactive):
 *   state        ok | warn | crit | idle                  (default ok)
 *   value        numeric reading; banded by warn/crit      (optional)
 *   warn / crit  band thresholds on `value`                (optional)
 *   invert       low = bad (band trips as value FALLS)     (flag)
 *   live         pulse to signal an actively-reporting channel (flag)
 *   label        accessible label / state caption          (optional)
 *   size         px diameter                               (default 10)
 */
declare class TalosLed extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(): void;
    private render;
}

declare class TalosToggle extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private group;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(): void;
    get value(): string;
    set value(v: string);
    private parseOptions;
    /** User selection: update value + announce. No-op if unchanged. */
    private select;
    private render;
}

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

export { type Band, type CornerEdge, type Edge, type OrbitalNode, PanelShapeBuilder, type PanelShapeOptions, type Segment, TalosCorner, TalosDelta, TalosDots, TalosFlow, TalosGauge, TalosLed, TalosMeter, TalosNotch, TalosOrbital, TalosPanel, TalosReadout, TalosSheen, TalosSpark, TalosStat, TalosToggle, TalosTrend };
