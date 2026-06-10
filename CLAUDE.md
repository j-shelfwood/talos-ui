# CLAUDE.md — @j_shelfwood/talos-ui (the package)

This repo is the **design system package**, published to npm. It was extracted
from the `talos-ui.shelfwood.co` monorepo on 2026-06-09 (`git filter-repo`,
history preserved). The showcase/docs **site** lives in a separate repo:
[`talos-ui.shelfwood.co`](https://github.com/j-shelfwood/talos-ui.shelfwood.co).

## Identity (read this before touching names)

The naming is deliberately mismatched — do not "correct" it:

| Thing | Value |
|---|---|
| GitHub repo | `j-shelfwood/talos-ui` |
| npm package | **`@j_shelfwood/talos-ui`** (user scope, underscore) |
| Brand / docs site | talos-ui.shelfwood.co |

The npm scope is `@j_shelfwood` (the npm **username**), NOT `@shelfwood`.
There is no `shelfwood` npm org; a user-scoped package auto-creates its scope on
first publish, which is why this scope was chosen. **Never rename to
`@shelfwood/*`** — it 404s on publish (the org doesn't exist).

## What this package is

Framework-agnostic CSS + opt-in web-component instruments + Astro wrappers. A
dark-monochrome HUD design system. See `README.md` (consumer docs),
`DESIGN.md`, `PHILOSOPHY.md`.

- `src/*.css` — the CSS layer (tokens + modules; `all.css` is the barrel).
- `src/wc/*.ts` — web components (`<talos-gauge>`, `<talos-panel>`, …). Built by
  `tsup` to `dist/wc/index.js`. The barrel `src/wc/index.ts` registers them.
- `src/astro/*.astro` — Astro wrappers, shipped as raw source (consumer compiles).
- `src/ambient.ts` → `dist/ambient.js`.

### Web-component gotchas (learned, do not regress)

- **`observedAttributes` is a static GETTER, not a class field** — esbuild emits a
  field as a post-class assignment that runs after `customElements.define()`, so
  the browser observes nothing. See the comment in `talos-gauge.ts`.
- **Reactivity uses a filtered `MutationObserver`, not `attributeChangedCallback`**
  — the callback doesn't fire after esbuild's class transform in this build. The
  `attributeFilter` is required (an unfiltered observer loops on render()'s own
  aria/role write-backs and freezes the renderer).
- **Instrument text never overlaps its graphic by fixed fraction** — `talos-gauge`
  computes a keep-out circle from the *rendered* readout box and clamps the needle
  outside it. If you add a text-over-graphic instrument, do the same; don't
  hard-code `bottom:%`/`r*k` placement.

## Build / test

```sh
bun install
bun run build   # tsup → dist/  (run before publish; dist is gitignored)
bun run test    # bun test (currently bands.test.ts; coverage is thin — expand it)
bun run dev     # tsup --watch
```

## Publishing — OIDC trusted publishing (no token, no OTP)

Releases are **tag-driven** and publish via **OIDC trusted publishing** — there
is no `NPM_TOKEN` secret (classic automation tokens were revoked Nov 2025;
granular tokens can't publish).

```sh
# bump version in package.json + CHANGELOG, then:
git tag vX.Y.Z && git push --tags    # → .github/workflows/publish.yml publishes
```

`publish.yml` has `permissions: id-token: write`, upgrades npm to ≥11.5.1, and
runs `npm publish --access public` with no token. **One-time prerequisite:** a
Trusted Publisher must be configured on the npm package settings page (publisher
= GitHub Actions, repo = `j-shelfwood/talos-ui`, workflow = `publish.yml`). npm
only allows that config once the package exists, so `0.1.0` is published once
manually (with an OTP); every release after is hands-off.

The tag version **must** match `package.json` `version` (the workflow asserts it).

## Conventions

- Bun, not npm, for the local toolchain (`bun install`/`bun run`). The CI publish
  step uses `npm` only because OIDC publishing is an npm-CLI feature.
- Pre-1.0: minor versions may break. Keep `CHANGELOG.md` current per release.
