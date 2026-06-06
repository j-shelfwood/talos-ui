# Changelog

All notable changes to `@shelfwood/talos-ui` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/); this package is
pre-1.0, so minor versions may include breaking changes until `1.0.0`.

## [Unreleased]

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
