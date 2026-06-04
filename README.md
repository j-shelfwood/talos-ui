# @shelfwood/talos-ui

Dark-monochrome **HUD design system**. Chamfered hairline panels, Oxanium
uppercase type, a cursor-tracked ambient grid, and composable
notched-panel web components.

Framework-agnostic by design — three layers, take what you need:

| Layer | What | Needs |
|---|---|---|
| **CSS** | `talos.css` + `tokens.css` + fonts | nothing (just a `<link>`) |
| **Web components** | `<talos-panel>` `<talos-corner>` `<talos-notch>` | a `<script type="module">` |
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
