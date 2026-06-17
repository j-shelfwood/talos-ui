<p align="left">
  <img src="./src/brand/talos-mark.svg" alt="Talos UI" width="56" height="56" />
</p>

# @j_shelfwood/talos-ui

Dark-monochrome **HUD design system**. Chamfered hairline panels, Oxanium
uppercase type, a cursor-tracked ambient grid, and composable
notched-panel web components.

The brand mark — an inverted triangle with a notch cut from its lower-right
edge — ships as a static asset (`@j_shelfwood/talos-ui/brand/talos-mark.svg`)
and as an Astro lockup component (`@j_shelfwood/talos-ui/astro/BrandMark.astro`,
mark + Oxanium wordmark, `compact` prop for mark-only).

Framework-agnostic by design — three layers, take what you need:

| Layer | What | Needs |
|---|---|---|
| **CSS** | `talos.css` + `tokens.css` + fonts | nothing (just a `<link>`) |
| **Web components** | panel chrome + 24 data-binding instruments | a `<script type="module">` |
| **Astro wrappers** | `GlassPanel.astro` `Button.astro` | Astro |

No Tailwind, no build step required for the CSS layer. Works in Astro,
Laravel/Blade, or plain HTML.

> **Layout is out of scope.** Talos ships the HUD *chrome* and the *instruments*,
> plus a handful of layout utilities (`talos-layout.css`: `.talos-grid`,
> `.talos-pad`, `.talos-stack`/`.talos-row`, …). It is **not** a layout framework —
> bring your own (Tailwind, a grid system, or hand-rolled) for page structure.
>
> **Marketing chrome is opt-in.** The one concession to front-of-site needs:
> `talos-marketing.css` + the `Navbar.astro` / `Footer.astro` wrappers ship a
> fixed compact-on-scroll navbar pill (with an optional in-pill table of
> contents) and a data-driven footer. It is a separate import — **not** in the
> core or in `all.css` — so the rest of the pack stays free of page chrome.

## Install

```sh
bun add @j_shelfwood/talos-ui
```

## Use — CSS (any project)

```html
<link rel="stylesheet" href="/node_modules/@j_shelfwood/talos-ui/src/talos.css" />

<div class="glass-panel interactive-panel">
  <div class="glass-panel-content">…</div>
</div>

<a class="talos-button" href="#">Launch</a>
```

The ambient grid needs the cursor position written to two custom properties:

```html
<div class="ambient-overlay"></div>
<script>
  addEventListener("pointermove", (e) => {
    document.documentElement.style.setProperty("--talos-cursor-x", e.clientX + "px");
    document.documentElement.style.setProperty("--talos-cursor-y", e.clientY + "px");
  });
</script>
```

## Use — Astro

```astro
---
import "@j_shelfwood/talos-ui/talos.css";
import GlassPanel from "@j_shelfwood/talos-ui/astro/GlassPanel.astro";
import Button from "@j_shelfwood/talos-ui/astro/Button.astro";
---
<GlassPanel as="a" href="/work">
  <h2>Projects</h2>
</GlassPanel>
<Button href="/contact">Get in touch</Button>
```

Astro wrappers: `GlassPanel`, `Button`, `BrandMark`, `Tag`, `BackButton`,
`BentoGrid`, `LinkCard`, the panel suite (`Hero/Mission/Project/Service/Title/
Toolkit`, `FeatureItem`), and the opt-in marketing chrome (`Navbar`, `Footer`).

```astro
---
import "@j_shelfwood/talos-ui/talos.css";
import "@j_shelfwood/talos-ui/talos-layout.css";
import "@j_shelfwood/talos-ui/talos-motion.css"; // opt-in: stagger + brackets
import BentoGrid from "@j_shelfwood/talos-ui/astro/BentoGrid.astro";
import GlassPanel from "@j_shelfwood/talos-ui/astro/GlassPanel.astro";
import LinkCard from "@j_shelfwood/talos-ui/astro/LinkCard.astro";
---
<BentoGrid stagger>
  <GlassPanel brackets class="col-span-4 lg:col-span-6"><h2>HUD</h2></GlassPanel>
  <LinkCard href="/work" title="Projects" eyebrow="What we ship"
            class="col-span-4 lg:col-span-6" />
</BentoGrid>
```

`Tag` styles come from `talos-feedback.css`; `BackButton` from `talos.css`.
Icons are passed in by slot — the package ships no icon dependency.

```astro
---
import "@j_shelfwood/talos-ui/talos.css";        // BackButton
import "@j_shelfwood/talos-ui/talos-feedback.css"; // Tag (.talos-badge)
import Tag from "@j_shelfwood/talos-ui/astro/Tag.astro";
import BackButton from "@j_shelfwood/talos-ui/astro/BackButton.astro";
---
<Tag size="sm">Astro</Tag>
<BackButton href="/work" text="Back to work">
  <Icon slot="arrow" name="lucide:arrow-left" />
</BackButton>
```

## Use — web components (notched panels)

```html
<script type="module">
  import "@j_shelfwood/talos-ui/wc";
</script>

<talos-panel panel-width="400" panel-height="220" animate>
  <talos-corner edge="top-right" radius="22"></talos-corner>
  <talos-corner edge="bottom-left" radius="22"></talos-corner>
  <talos-notch edge="top" width="80" depth="14"></talos-notch>
  <h3>Composable geometry</h3>
</talos-panel>
```

Decorators are declarative: add/remove `<talos-corner>` / `<talos-notch>`
children and the outline re-renders.

## Use — data-binding instruments

The instruments are the heart of the library. Each one binds a visual
property to live state — colour, size, motion all carry meaning, never
decoration (see [`PHILOSOPHY.md`](./PHILOSOPHY.md), *form encodes function*).
They degrade honestly: under `prefers-reduced-motion` the picture stays
readable with the animation removed.

```html
<script type="module">
  import "@j_shelfwood/talos-ui/wc";
</script>
```

| Element | Binds | Drive it by |
|---|---|---|
| `<talos-gauge>` | value → needle + health band | `value` / `warn` / `crit` attrs |
| `<talos-meter>` | value → filled bar + tick band | `value` / `warn` / `crit` attrs |
| `<talos-trend>` | series → sparkline (slope *is* the rate) | `value` attr, or `.push(n)` |
| `<talos-flow>` | rate → dash travel speed along a path | `rate` attr |
| `<talos-orbital>` | a system → radial mesh (ring/size/colour/orbit) | `.nodes = [...]` |
| `<talos-readout>` | value → scramble-decode on change | `value` attr |
| `<talos-sheen>` | pointer → tracked specular highlight | `selector` attr |

**Compact data primitives** — small, inline, single-glance readings:

| Element | Binds | Drive it by |
|---|---|---|
| `<talos-spark>` | series → inline sparkline (small `<talos-trend>`) | `points` attr |
| `<talos-stat>` | value → labelled statistic cell (eyebrow + big number) | `value` / `label` / `unit` attrs |
| `<talos-delta>` | value → change glyph (▲/▼/▬) + magnitude | `value` / `good` attrs |
| `<talos-dots>` | count → filled-of-total dot matrix | `value` / `total` attrs |
| `<talos-led>` | state → single status light (optional pulse) | `state` or `value` attr |
| `<talos-toggle>` | selection → segmented control (active = current value) | `options` / `value` attrs, emits on change |
| `<talos-status>` | many channels → system-mood rollup | `.channels = [...]` |

**Orbital / fleet drill-down** — the constellation family, fleet → spacecraft:

| Element | Binds | Drive it by |
|---|---|---|
| `<talos-matrix>` | N×M units → banded-colour cell grid (the whole shell) | `.cells = [...]` |
| `<talos-histogram>` | population → distribution shape across units | `.values = [...]` |
| `<talos-groundtrack>` | constellation → equirectangular sub-satellite tracks | `.sats = [...]`, `.gateways = [...]` |
| `<talos-plane>` | one orbital plane → its N-satellite train along the track | `.sats = [...]` |
| `<talos-spacecraft>` | one satellite → its anatomy, each part an instrument | `.parts = {...}` |

**Monitoring & telemetry** — signal natures the core set doesn't cover:

| Element | Binds | Drive it by |
|---|---|---|
| `<talos-range>` | value → position within a live min/max tolerance band + setpoint | `value` / `low` / `high` / `setpoint` attrs |
| `<talos-compass>` | heading → 360°-wrap bearing dial (shortest-path needle) | `heading` / `target` attrs |
| `<talos-percentile>` | distribution → p50/p90/p99 box-plot (p99 banded) | `p50`/`p90`/`p99` attrs, or `.stats = {...}` |
| `<talos-ticker>` | events → live severity-coloured event log (newest on top) | `.push({ msg, level })` |
| `<talos-odometer>` | running total → rolling digits (motion = throughput) | `value` attr |

```html
<!-- Attribute-driven: change value and colour/needle follow the bands. -->
<talos-gauge value="78" min="0" max="100" warn="70" crit="90"
             label="CPU" unit="%"></talos-gauge>

<talos-meter value="84" warn="70" crit="90" label="MEM" unit="%"></talos-meter>

<talos-flow rate="42" max="100" warn="70" crit="90"
            x1="0" y1="20" x2="200" y2="20"></talos-flow>
```

```html
<!-- Imperative: feed a live series or a whole system. -->
<talos-trend id="rx" min="0" max="100" label="RX" unit="MB/s"></talos-trend>
<talos-orbital id="mesh" rings="3" core-label="ATLAS"></talos-orbital>

<script type="module">
  import "@j_shelfwood/talos-ui/wc";
  setInterval(() => rx.push(20 + Math.round(40 * Math.random())), 1000);

  mesh.nodes = [
    // ring = subsystem, value = health, load = size, rate = orbit speed
    { id: "auth", ring: 1, value: 22, load: 0.6, rate: 80, label: "auth" },
    { id: "db",   ring: 2, value: 71, load: 0.9, rate: 45, label: "db" },
    { id: "cdn",  ring: 3, value: 8,  load: 0.3, rate: 95, label: "cdn" },
  ];
</script>
```

Every instrument reads `warn` / `crit` thresholds the same way and snaps
through `--talos-success` → `--talos-warning` → `--talos-danger`. Re-read any
of them while a system runs and the value differs — they are instruments, not
illustrations.

### Import one instrument, not all of them

`import "@j_shelfwood/talos-ui/wc"` registers every element. To ship only the
ones you use (and let your bundler tree-shake the rest), import the
per-component entry — each registers exactly its own tag:

```js
import "@j_shelfwood/talos-ui/wc/talos-gauge";   // only <talos-gauge>
import "@j_shelfwood/talos-ui/wc/talos-ticker";  // only <talos-ticker>
```

Registration is idempotent — mixing the barrel and per-component imports is
safe. TypeScript input types are exported from the barrel: `OrbitalNode`,
`PercentileStats`, `TickerEvent`, `GroundSat`, `Gateway`, `TrackSat`,
`Parts` / `PartState`, `ToggleOption`, `Band`.

### Interaction & events

The interactive instruments emit `composed`, bubbling `CustomEvent`s (they
cross shadow boundaries), and are keyboard-operable (focusable, arrow keys move
the selection, Enter/Space activate):

| Element | Event | `detail` |
|---|---|---|
| `<talos-toggle>` | `talos:change` | `{ value }` |
| `<talos-matrix>` | `talos:cell` | `{ col, row, index }` |
| `<talos-plane>` | `talos:sat` | `{ slot }` |
| `<talos-spacecraft>` | `talos:part` | `{ part }` |

Read-only instruments expose the role that matches their semantics plus a live
`aria-label`: picture-like instruments use `role="img"`, scalar telemetry uses
`role="meter"` or `role="status"`, and `<talos-ticker>` is a `role="log"` with
`aria-live="polite"` so new events are announced.

## Use — Laravel / Blade

The CSS layer is class-based, so Blade needs only the stylesheet (and a
module script if you want the web components):

```blade
<link rel="stylesheet" href="{{ asset('vendor/talos-ui/talos.css') }}">
<script type="module" src="{{ asset('vendor/talos-ui/dist/wc/index.js') }}"></script>

<div class="glass-panel interactive-panel">
  <div class="glass-panel-content">…</div>
</div>
<talos-panel panel-width="360" panel-height="180">…</talos-panel>
```

Copy `src/talos.css`, `src/tokens.css`, `src/fonts/`, and the `dist/wc/`
directory into `public/vendor/talos-ui/` (e.g. via a Composer/npm postinstall
step).

## Tokens

All design tokens are `--talos-*` custom properties in `tokens.css`. Override
any of them on `:root` (or a scope) to retheme — e.g. shift `--talos-accent-hsl`
or widen `--talos-chamfer`. See [`DESIGN.md`](./DESIGN.md) for the full spec.

## License

MIT © Joris Schelfhout / Shelfwood
