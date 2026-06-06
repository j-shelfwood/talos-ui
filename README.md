# @shelfwood/talos-ui

Dark-monochrome **HUD design system**. Chamfered hairline panels, Oxanium
uppercase type, a cursor-tracked ambient grid, and composable
notched-panel web components.

Framework-agnostic by design — three layers, take what you need:

| Layer | What | Needs |
|---|---|---|
| **CSS** | `talos.css` + `tokens.css` + fonts | nothing (just a `<link>`) |
| **Web components** | panel chrome + 7 data-binding instruments | a `<script type="module">` |
| **Astro wrappers** | `GlassPanel.astro` `Button.astro` | Astro |

No Tailwind, no build step required for the CSS layer. Works in Astro,
Laravel/Blade, or plain HTML.

## Install

```sh
bun add @shelfwood/talos-ui
```

## Use — CSS (any project)

```html
<link rel="stylesheet" href="/node_modules/@shelfwood/talos-ui/src/talos.css" />

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
import "@shelfwood/talos-ui/talos.css";
import GlassPanel from "@shelfwood/talos-ui/astro/GlassPanel.astro";
import Button from "@shelfwood/talos-ui/astro/Button.astro";
---
<GlassPanel as="a" href="/work">
  <h2>Projects</h2>
</GlassPanel>
<Button href="/contact">Get in touch</Button>
```

## Use — web components (notched panels)

```html
<script type="module">
  import "@shelfwood/talos-ui/wc";
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

The seven instruments are the heart of the library. Each one binds a visual
property to live state — colour, size, motion all carry meaning, never
decoration (see [`PHILOSOPHY.md`](./PHILOSOPHY.md), *form encodes function*).
They degrade honestly: under `prefers-reduced-motion` the picture stays
readable with the animation removed.

```html
<script type="module">
  import "@shelfwood/talos-ui/wc";
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
  import "@shelfwood/talos-ui/wc";
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

## Use — Laravel / Blade

The CSS layer is class-based, so Blade needs only the stylesheet (and a
module script if you want the web components):

```blade
<link rel="stylesheet" href="{{ asset('vendor/talos-ui/talos.css') }}">
<script type="module" src="{{ asset('vendor/talos-ui/wc.js') }}"></script>

<div class="glass-panel interactive-panel">
  <div class="glass-panel-content">…</div>
</div>
<talos-panel panel-width="360" panel-height="180">…</talos-panel>
```

Copy `src/talos.css`, `src/tokens.css`, `src/fonts/`, and `dist/wc/index.js`
into `public/vendor/talos-ui/` (e.g. via a Composer/npm postinstall step).

## Tokens

All design tokens are `--talos-*` custom properties in `tokens.css`. Override
any of them on `:root` (or a scope) to retheme — e.g. shift `--talos-accent-hsl`
or widen `--talos-chamfer`. See [`DESIGN.md`](./DESIGN.md) for the full spec.

## License

MIT © Joris Schelfhout / Shelfwood
