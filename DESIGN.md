# Talos UI — Design Language

The aesthetic in one line: **pure-black surfaces, hairline white-on-black
chamfered panels, Oxanium uppercase wide-tracked type, a cursor-tracked
ambient dot grid, and restrained overshoot motion.**

Lineage: invented in the `talos-ui` lab (geometric notched panels, neon),
applied in `tesseract-dash` (HUD telemetry), refined to monochrome in
`shelfwood.co`. This package is the refined monochrome distillation.

## Palette

Strictly monochrome. Emphasis comes from **contrast and geometry**, not hue.

| Token | Value | Use |
|---|---|---|
| `--talos-background-hsl` | `0 0% 0%` | page void |
| `--talos-foreground-hsl` | `0 0% 100%` | primary text |
| `--talos-muted-hsl` | `0 0% 10%` | raised surfaces |
| `--talos-muted-foreground-hsl` | `0 0% 60%` | labels, hints |
| `--talos-border-hsl` | `0 0% 20%` | dividers |
| `--talos-accent-hsl` | `140 90% 60%` | the *one* accent — status pulse only |

HSL channel vars compose opacity: `hsl(var(--talos-foreground-hsl) / 0.6)`.

**Do** keep accent rare (a single live-status dot). **Don't** reintroduce the
old talos cyan/orange/red neon — the monochrome direction is deliberate.

## Type

- **Display:** Oxanium variable (200–800), self-hosted. Used for all HUD
  headings + labels.
- **Weight:** 300 (light) for headings — light + uppercase is the voice.
- **Transform:** `uppercase`.
- **Tracking:** `--talos-tracking-hud` (0.18em) for headlines/labels;
  `--talos-tracking-hud-tight` (0.08em) for compact headings.
- **System slugs:** monospace-feel labels like `// Mission`, `SYS://HOME`,
  `//02` carry the technical persona.

## Chamfer geometry

Corners are **cut, never rounded**. Geometry replaces `border-radius`.

- Panels: `--talos-chamfer` 14px, on **top-right + bottom-left** (top-left +
  bottom-right stay square; brackets attach there).
- Buttons: `--talos-chamfer-btn` 10px, bottom-right only.
- Flags/pills: `--talos-chamfer-flag` 8px, top-right only.

Two-layer hairline technique: host element = edge color clipped to the
chamfered shape; `::before` inset 1px clipped to a 1px-smaller chamfer = the
fill. Produces an even 1px border along every edge including the cuts.
(`border` can't follow `clip-path`; `mask-composite` was unreliable on
Chromium.)

Web components render the same family of outlines as an **SVG path** via
`PanelShapeBuilder`, which additionally supports **notches** (centered edge
cut-outs) — the one motif the CSS layer doesn't do.

## Interaction

- **Cursor sheen:** interactive panels track the pointer (`--talos-mx/my`) and
  paint a soft radial spotlight. Dropped on touch / `hover: none`.
- **Lift:** `-3px` translate + brightened edge + drop-shadow on hover.
- **Viewfinder brackets:** 14px L-shapes fade in on the two square corners on
  hover.
- **Focus:** edge goes bright white + a single brightness pulse.

## Ambient

Fixed full-viewport `.ambient-overlay`: 32px dot grid + a vertical/horizontal
crosshair tracking the cursor, radial vignette mask so it never reads as a
hard frame. Crosshair hidden on touch.

## Motion

| Token | Curve / value | Use |
|---|---|---|
| `--talos-ease-glass` | `cubic-bezier(.22,.68,0,1.2)` | hover/lift (gentle overshoot) |
| `--talos-ease-liquid` | `cubic-bezier(.34,1.4,.64,1)` | entrance (stronger settle) |
| `--talos-ease-out` | `cubic-bezier(0,0,.2,1)` | focus pulse (decel only) |
| `--talos-dur-fast/mid/slow` | 180 / 360 / 600ms | — |

Bento entrance: children of `.bento-stagger` cascade in (blur+brightness,
60ms stagger). Keyframes touch opacity + filter only, never `transform`, so
hover lifts keep working. All motion respects `prefers-reduced-motion`.

## Do / Don't

- **Do** build emphasis from contrast, geometry, tracking — not color.
- **Do** keep borders hairline (1px); let the chamfer do the work.
- **Don't** round corners. **Don't** add the legacy neon glow.
- **Don't** require Tailwind for the CSS layer — it must link standalone.
