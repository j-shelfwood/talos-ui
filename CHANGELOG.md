# Changelog

All notable changes to `@j_shelfwood/talos-ui` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/); this package is
pre-1.0, so minor versions may include breaking changes until `1.0.0`.

## [Unreleased]

## [0.2.0] — 2026-06-14

### Added
- **Monitoring & telemetry instruments** — five new signal natures the core set
  didn't cover:
  - `<talos-range>` — value within a live min/max tolerance band + setpoint
    marker (the two-sided sibling of `<talos-meter>`).
  - `<talos-compass>` — 360°-wrap bearing/heading dial; the needle tweens the
    shortest way (350°→10° goes +20°, not −340°).
  - `<talos-percentile>` — p50/p90/p99 box-plot; the p99 marker is banded
    (`warn`/`crit`). Attributes or `.stats = { p50, p90, p99, … }`.
  - `<talos-ticker>` — live event log, newest on top, severity-coloured;
    `.push({ msg, level })`. `role="log"` + `aria-live` (announces new events).
  - `<talos-odometer>` — rolling-digit running total where digit motion encodes
    throughput (distinct from `<talos-stat>`'s one-shot count-up).
- **Per-component imports** — `import "@j_shelfwood/talos-ui/wc/talos-gauge"`
  registers only that element, so bundlers can tree-shake the rest. Idempotent
  with the barrel. Generated per-component entries under `dist/wc/talos-*.js`.
- **Exported input types** — `GroundSat`, `Gateway`, `TrackSat`, `Parts`,
  `PartState`, `ToggleOption`, `PercentileStats`, `TickerEvent` are now exported
  from the `./wc` barrel for TS consumers of the imperative setters.
- **Keyboard + screen-reader support** — `<talos-orbital>`, `<talos-spark>`,
  `<talos-dots>` gained `role="img"` + live `aria-label`; the interactive picks
  (`<talos-matrix>`, `<talos-plane>`, `<talos-spacecraft>`) are now focusable and
  arrow-key/Enter operable. Their `talos:*` events are now `composed` (cross
  shadow boundaries).
- **Orbital / fleet drill-down instruments** — five web components forming a
  fleet→spacecraft magnification chain, each the honest form for its scale:
  - `<talos-matrix>` — N×M banded-colour cell grid (the whole shell at a glance;
    `.cells = [...]`, `.highlight`).
  - `<talos-histogram>` — distribution *shape* of one value across many units
    (`.values = [...]`).
  - `<talos-groundtrack>` — equirectangular sub-satellite tracks + ground
    stations (`.sats`, `.gateways`).
  - `<talos-plane>` — one orbital plane as its N-satellite train along the shared
    track (`.sats = [...]`).
  - `<talos-spacecraft>` — a single satellite as its anatomy, each part an
    instrument (`.parts = {...}`).
- `<talos-status>` — system-mood rollup: many channels aggregated to one state
  (`.channels = [...]`).
- **`BrandMark.astro`** wrapper + `src/brand/talos-mark.svg` — the Talos mark as
  an inline-SVG component (fill inherits `currentColor`) plus the raw asset,
  both exported (`./astro/*`, `./brand/*`).

### Changed
- **Shared instrument primitives extracted to `bands.ts`** — `num()` (was
  copy-pasted into 17 components) and `prefersReducedMotion()` (9 copies) are now
  single functions; the band-token CSS fork (`--_ok/--_warn/--_crit` vs
  `--_nominal/--_warning/--_critical`) was unified to the `Band`-aligned
  `--_nominal/--_warning/--_critical` everywhere. New `bandColorVar()` +
  `BAND_TOKENS_CSS` helpers. No behaviour change; bundle shrank.
- **Series-seed attribute unified** — `<talos-spark>` now seeds from `data=`
  (matching `<talos-trend>`); `points=` still works as a deprecated alias. (It
  previously collided with `<talos-trend>`'s `points=` window-size meaning.)

### Fixed
- **`<talos-panel>` content clipped by notches.** Content padding now reserves
  the notch depth so children no longer collide with a notched edge.
- **`<talos-gauge>` / `<talos-meter>` `invert` reactivity** + stepper label
  collision in `talos-nav.css`.
- **`<talos-led>` was a 0×0 inline span** — the status dot didn't render until
  `display:block` was added.
- **`@property --talos-value` must `inherit`** — without it meters and progress
  rendered empty. Both declarations (data + feedback) are now `inherits: true`.
- **Build was broken** — the `talos-planering`→`talos-plane` rename left
  `src/wc/index.ts` registering an undefined `TalosPlanering` (TS2552, runtime
  `ReferenceError` on import), and `<talos-spacecraft>` was imported/exported but
  never registered. Both registrations corrected; a dead `H` constant in
  `talos-plane.ts` (TS6133) removed; `dist/` rebuilt.
- **`<talos-trend>`** now accepts a declarative `data=` series (spark parity).
- **`<talos-gauge>` readout/needle overlap.** The readout was placed at a fixed
  `bottom:18%` and the needle reached in to a fixed `r*0.52`, so at low values
  the marker and the arc shoulder crossed the number. The needle's inner radius
  is now clamped outside a keep-out circle computed from the rendered readout
  box (size/sweep-aware), and the hub anchors at the needle's inner end — so the
  number stays clear at every value, sweep, and size.

## [0.1.0] — 2026-06-07

First published release. The CSS layer, web-component instruments (incl. the
Tier-1 micro-instruments below), Astro wrappers, and the ambient export are all
shipped and built.

### Added
- **Tier-1 micro-instruments** — four web components, the honest forms the
  literature (Cleveland-McGill effectiveness, Mackinlay expressiveness) favours
  over gauges/bars for their respective signal natures:
  - `<talos-spark>` — inline sparkline (rate/shape; `.push()` stream API).
  - `<talos-dots>` — dot-matrix (discrete countable quantity; no fake ceiling).
  - `<talos-delta>` — direction + magnitude of change (`good="up|down"`).
  - `<talos-stat>` — labelled stat cell with count-up animation; the wall atom.
  All band-aware (share `bandOf`, honour `invert`) and reduced-motion honest.
- `talos-meter` **`compact`** variant — a bare inline micro-bar (real-ceiling
  replacement for hand-rolled mini progress bars).
- **Band model `invert`** (low = bad) on `bandOf` — fixes "low is dangerous"
  signals (frame rate, coolant, battery, signal) without reframing hacks;
  `talos-gauge` / `talos-meter` observe it. Backward-compatible.
- **`@j_shelfwood/talos-ui/ambient`** — opt-in cursor-tracking module
  (`initAmbientCursor()`) that drives the `.ambient-overlay` grid. Smooth-lerped,
  idempotent across view-transition swaps, and capability-honest (parked at
  centre under `prefers-reduced-motion` / touch).
- **`talos-layout.css`** — dedicated layout-utility stylesheet: `.talos-grid`
  (+ `.col-span-*`), `.talos-grid-auto`, `.talos-pad`/`-lg`, `.talos-stack`,
  `.talos-row`, `.talos-muted`, `.talos-eyebrow`, `.talos-dot`. Exported as
  `@j_shelfwood/talos-ui/talos-layout.css` and included in `all.css`.
- `.anim-replay` and `.noise-overlay-subtle` utilities (in `talos-layout.css`),
  tokenized so they retheme with the palette.
- Tokens: `--talos-glass-bg`, `--talos-glass-border` (translucent glass surface).
- Public prose tokens: `--talos-prose-{body,heading,muted,link,border,code-bg}`
  — prose can now be rethemed from `:root` independently of the global palette.
- `astro` declared as an **optional** `peerDependency` (`>=5`); only the
  `./astro/*` wrappers require it, the CSS and web-component layers do not.
- First unit tests: `bands.ts` threshold logic (`bun test`).

### Changed
- **`.activity-edge`** re-techniqued: the rate-bound border is now a thin
  traveling segment masked to the panel's perimeter (was a soft conic wedge
  bleeding from one corner). The sweep period is floored at `1.2s` so it can
  never strobe regardless of the `--talos-rate` a caller passes
  (photosensitivity-safe by construction).
- Layout utilities moved out of `talos.css` into `talos-layout.css`
  (`talos.css` is now components-only). `all.css` imports both, so the barrel
  import is unaffected; direct `talos.css`-only consumers should also import
  `talos-layout.css` for grid/spacing/eyebrow/dot.
- `GlassPanel.astro` wrapper now registers `astro:after-swap → repaintPanels()`
  to fix a stale Chromium clip-path paint cache after view-transition navigation.

### Notes
- **Layout is out of scope.** The pack provides HUD *chrome* and *instruments*;
  it ships only minimal layout utilities (above). Bring your own layout system
  (Tailwind, grid framework, or hand-rolled) for page structure.
