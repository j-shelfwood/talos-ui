# Changelog

All notable changes to `@j_shelfwood/talos-ui` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/); this package is
pre-1.0, so minor versions may include breaking changes until `1.0.0`.

## [Unreleased]

## [0.5.5] — 2026-06-18

### Fixed
- **`LinkCard` title→list spacing.** The parent flex `gap` collapsed against the
  title's line-box, so the item ladder butted directly against the title (0px)
  while items sat ~1.1rem apart from each other — inverted hierarchy. Gave the
  items list an explicit `margin-top: 1.25rem` and matched the internal gap to
  MissionPanel (`1.1rem`), so the title now separates from the group slightly
  more than items separate from each other.

## [0.5.4] — 2026-06-17

### Changed
- **`LinkCard` itemized lists now use the indexed-hairline ladder** (the same
  `01 │ …` treatment as `MissionPanel` axes) instead of plain round bullet dots,
  so itemized content reads consistently across tiles. Items get a tabular
  zero-padded index, a vertical hairline rule, the display font, and slightly
  more breathing room (gap `0.5rem` → `0.7rem`, text `0.9rem`).

## [0.5.3] — 2026-06-17

### Changed
- **Centered navbar: constant height + text↔icon crossfade.** The `centered`
  variant now keeps a CONSTANT pill height across the expanded and compact
  states — only the width animates (expanded fits the text labels; compact hugs
  the icons), so the bar no longer jumps vertically on scroll. The flank
  affordances crossfade between a text label (expanded) and an icon (compact):
  e.g. "Home" ↔ back arrow, "Table of Contents" ↔ list icon.
- **`tocLabel` prop** on `Navbar` (default `"On this page"`) sets the TOC
  toggle's label.

### Fixed
- The default brand-left compact rules were leaking onto the `centered` variant
  (both matched `.talos-navbar[data-compact]`), overriding its padding and
  causing an 8px height jump. Scoped them `:not(.talos-navbar--centered)` so the
  two variants' compact behaviours are fully isolated.

### Internal
- Deduplicated the navbar CSS accumulated across iterations: collapsed the
  redundant `.talos-toc-glyph` state rules (now presentation-only; the centered
  variant owns the show/hide), merged the four crossfade pieces into one shared
  transition, removed an orphaned label margin hack.

## [0.5.2] — 2026-06-17

### Changed
- **Navbar compact state is now a symmetric, centered icon cluster.** On scroll
  the pill collapses to `[back] · [brand] · [toc]` on a `1fr·auto·1fr` grid, so
  the brand mark sits dead-centre with the two icon affordances equidistant on
  either side (previously the brand was left-aligned with dead space to the
  right). The pill takes a fixed compact width (`--talos-navbar-compact-w`,
  default `12rem`) so the grid has room to balance. Collapse animates via
  max-width / opacity only (no `display:none` / `order` swaps, which had killed
  the grow/shrink transition).
- **TOC toggle icon via slot.** The "On this page" button now renders a
  `toc-icon` slot (consumer-supplied, no icon dep; falls back to a `≡` glyph),
  which persists when the label collapses on scroll. Lets consumers use their
  own icon set (e.g. a lucide list icon) for the compact TOC affordance.

## [0.5.1] — 2026-06-17

### Fixed
- **Navbar TOC dead space on scroll** — the compact (scrolled) pill kept the
  width of the collapsed "On this page" panel, leaving a large empty region
  beside the brand. The TOC dropdown now lives outside the pill's flex row, so
  the compact pill hugs brand + back + a `§` toggle glyph (which keeps the TOC
  reachable while scrolled instead of leaving a gap).
- **Navbar TOC dropdown rendering** — the "On this page" panel was clipped by the
  pill's notch `clip-path` (and laid its entries out horizontally inside the
  pill). It now renders as a proper chamfered dropdown card centered below the
  pill — a child of the unclipped `.talos-navbar`, revealed via CSS max-height
  (the wrapper script no longer hand-sizes the pill).
- **Navbar content separation** — added a `backdrop-filter: blur()` to the pill
  so article content scrolling beneath the floating navbar reads cleanly up to
  the pill edge instead of colliding with it.

## [0.5.0] — 2026-06-17

This release finishes the panel extraction: the panel suite now carries the
a11y/animation polish that had drifted into shelfwood.co's local copies, so a
consumer can adopt the package panels without regressing. Adds a prose layer and
two new generic panels.

### Added
- **`talos-prose.css` (opt-in)** — article/long-form typography tinted to the
  talos palette. Built for `@tailwindcss/typography`: maps `--tw-prose-invert-*`
  onto talos channels (use with `class="prose prose-invert"`), and exposes
  `--talos-prose-*` aliases for no-plugin consumers. The core still ships no
  prose by design; this is opt-in. New export `@j_shelfwood/talos-ui/talos-prose.css`.
- **`ProfileHeroPanel.astro`** — profile lockup (avatar slot + name/headline/
  location); avatar via `<slot name="image">`, location glyph via
  `<slot name="location-icon">`. Generalized from a site panel.
- **`QuotePanel.astro`** — centered pull-quote with optional `<slot name="icon">`
  and attribution. Generalized from a site panel.

### Changed
- **Panel polish ported (no API break for these):** `HeroPanel` gains a pulsing
  status dot (with reduced-motion fallback), a gradient hairline rule, headline
  `text-wrap: balance`, and aria-hidden on decorative chrome. `MissionPanel`
  gains the gradient rule, semantic `<header>`/`<h3>`/`<footer>`, refined index
  alignment, and aria-hidden chrome. `FeatureItem` and `ProjectPanel` gain
  optional `<slot name="icon">` / `<slot name="arrow">` (with the prior glyphs as
  fallbacks) for icon-slot convention parity.
- **`Footer` nav prop aligned with `Navbar`:** new canonical `links` prop with
  `{ label, href }` items — the same shape `Navbar` takes — so one nav array
  feeds both. `nav` and the `title` field still work as deprecated aliases.

### Breaking
- **`ToolkitPanel` prop schema:** `groups: { level, items, emphasis? }[]`
  (was `{ level, emphasis, items }` with required `emphasis`). `emphasis` is now
  optional and derived (first group → "high", rest → "low") when omitted.
  Restores an optional leading `<slot name="icon">`.
- **`GlassPanel` `brackets` default:** now defaults to `true` for interactive
  panels (`as="a"`/`"button"`) and `false` otherwise, instead of always `false`.
  Pass an explicit boolean to override. (Brackets still require `talos-motion.css`.)

## [0.4.1] — 2026-06-17

### Fixed
- **`Footer.astro` doc contract** — the JSDoc + `@example` still advertised
  per-link `icon-<key>` nav slots removed in the `links`-slot refactor; a
  consumer copying the example got a silently-dropped icon. Docs now describe
  the real contract (text-only `nav` prop, or the `links` slot for per-link
  icons; contact rows keep `icon-email`/`icon-phone`/`icon-location`/`icon-calendar`).
- **Navbar sheen clip** — `.talos-navbar-pill::after` (cursor sheen) inherited
  the original chamfer clip and could paint past the notched top edge on hover;
  re-clipped to the notch polygon.

### Documentation
- README now shows `Tag` / `BackButton` usage and names their per-component CSS
  dependencies (`talos-feedback.css` / `talos.css`), which were previously
  listed in the wrapper inventory without an example or import cue.

## [0.4.0] — 2026-06-17

### Added
- **Decorative motion layer (opt-in)** — new `talos-motion.css` carrying the
  staggered grid entrance (`.bento-stagger` / `.cascade-in` / `@keyframes
  cascade-in`) and the HUD viewfinder corner brackets (`.hud-bracket`). Both
  were removed from the core on Principle 3 ("motion is telemetry, not
  transition"); they return as a quarantined opt-in module, surfaced via the new
  `stagger` prop on `BentoGrid.astro` and the new `brackets` prop on
  `GlassPanel.astro`. Not imported by `all.css`.
- **New Astro wrappers** — `astro/Tag.astro` (over `.talos-badge`),
  `astro/BackButton.astro` (card + ghost variants), `astro/BentoGrid.astro`
  (over `.talos-grid`), and `astro/LinkCard.astro` — one configurable link tile
  consolidating the former MiniProfileCard / NavigationCard / PreviewCard
  shapes. Icons stay consumer-side via slots (no icon dependency).
- New exports: `@j_shelfwood/talos-ui/talos-motion.css` plus the four wrappers
  via the existing `./astro/*` glob.

- **Marketing chrome layer (opt-in)** — new `talos-marketing.css` plus
  `astro/Navbar.astro` and `astro/Footer.astro` wrappers. The `Navbar` is a
  fixed, auto-width HUD pill (top-edge notch, brand · separator · links) that
  collapses to the brand mark on scroll, with an optional in-pill "On this page"
  table of contents driven by passed-in markdown headings. The `Footer` is a
  data-driven three-column lockup (links · brand · contact) over a GlassPanel.
  Both are config-driven; all visual knobs are CSS custom properties on the
  layer (`--talos-navbar-notch-w`, `--talos-navbar-compact-w`, …), and the layer
  publishes `--talos-nav-h` so layouts can offset content below the fixed pill.
- New exports: `@j_shelfwood/talos-ui/talos-marketing.css`,
  `@j_shelfwood/talos-ui/astro/Navbar.astro`,
  `@j_shelfwood/talos-ui/astro/Footer.astro`.

### Changed
- **Scope note clarified** — README/PHILOSOPHY now record marketing navbar +
  footer as a deliberately *quarantined* opt-in module (never in the core or
  `all.css`), distinct from prose styling, which stays out of scope.

## [0.3.0] — 2026-06-15

### Added
- **Accessibility + render helpers** — new shared `a11y.ts`, `render.ts`, and
  `parse.ts` utilities centralize semantic-role labelling, safe DOM text/SVG
  construction, and toggle/number-list parsing for the web-component layer.
- **Expanded web-component tests** — added focused tests around accessibility
  helpers, render helpers, guarded registration, and toggle keyboard/ARIA
  behavior.

### Changed
- **Telemetry components now expose role-appropriate semantics** — read-only
  instruments no longer default to `role="img"` across the board. Scalar
  telemetry surfaces now use `role="meter"` or `role="status"` with matching
  value text, while picture-like instruments continue to use `role="img"`.
- **DOM rendering paths were hardened** — several instruments now build SVG/text
  nodes with shared helpers instead of stitching strings into `innerHTML`,
  reducing escaping risk while keeping behavior unchanged.
- **Package side-effect declarations are now explicit** — `package.json`
  enumerates the concrete per-component `dist/wc/*.js` entries that register
  custom elements, improving bundler clarity for tree-shaken consumers.
- **Consumer docs were corrected** — the Laravel/Blade example now points at the
  shipped `dist/wc/index.js` entry and the copy instructions clarify that the
  full `dist/wc/` directory should be vendored, not a non-existent `wc.js`.

### Fixed
- **`<talos-toggle>` ARIA semantics and keyboarding** — the control now behaves
  as a proper `radiogroup`, uses `aria-checked`, and supports arrow/Home/End
  navigation plus Enter/Space activation.
- **Telemetry a11y attribute mismatches** — components that announce live values
  now avoid invalid role/ARIA combinations by applying semantics through the new
  shared helpers.

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
