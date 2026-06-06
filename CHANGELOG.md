# Changelog

All notable changes to `@shelfwood/talos-ui` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/); this package is
pre-1.0, so minor versions may include breaking changes until `1.0.0`.

## [Unreleased]

### Added
- **Tier-1 micro-instruments** — four new web components, the honest forms the
  literature (Cleveland-McGill effectiveness, Mackinlay expressiveness) favours
  over gauges/bars for their respective signal natures:
  - `<talos-spark>` — inline sparkline (rate/shape; `.push()` stream API).
  - `<talos-dots>` — dot-matrix (discrete countable quantity; no fake ceiling).
  - `<talos-delta>` — direction + magnitude of change (`good="up|down"`).
  - `<talos-stat>` — labelled stat cell with count-up animation; the wall atom.
  All band-aware (share `bandOf`, honour `invert`) and reduced-motion honest.
- `talos-meter` **`compact`** variant — a bare inline micro-bar (real-ceiling
  replacement for hand-rolled mini progress bars).

### Changed
- **Band model now supports `invert`** (low = bad) on `bandOf` — fixes
  "low is dangerous" signals (frame rate, coolant reserve, battery, signal) that
  previously needed reframing hacks. `talos-gauge` / `talos-meter` observe it.
  Backward-compatible: absent `invert` = unchanged high-bad behaviour.

## [0.1.0] — 2026-06-06

First published release. The CSS layer, web-component instruments, Astro wrappers,
and the new ambient export are all shipped and built.

### Added
- **`@shelfwood/talos-ui/ambient`** — opt-in cursor-tracking module
  (`initAmbientCursor()`) that drives the `.ambient-overlay` grid. Smooth-lerped,
  idempotent across view-transition swaps, and capability-honest (parked at
  centre under `prefers-reduced-motion` / touch).
- **`talos-layout.css`** — dedicated layout-utility stylesheet: `.talos-grid`
  (+ `.col-span-*`), `.talos-grid-auto`, `.talos-pad`/`-lg`, `.talos-stack`,
  `.talos-row`, `.talos-muted`, `.talos-eyebrow`, `.talos-dot`. Exported as
  `@shelfwood/talos-ui/talos-layout.css` and included in `all.css`.
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
