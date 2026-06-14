import { defineConfig } from "tsup";
import { readdirSync } from "node:fs";

// Per-component entries: each src/wc/register/<tag>.ts registers ONLY that one
// element, so consumers can `import "@j_shelfwood/talos-ui/wc/talos-gauge"` and
// tree-shake the rest. Generated from the directory so adding a component =
// dropping in its register entry (no config edit).
const perComponent = Object.fromEntries(
  readdirSync("src/wc/register")
    .filter((f) => f.endsWith(".ts"))
    .map((f) => {
      const tag = f.replace(/\.ts$/, "");
      return [`wc/${tag}`, `src/wc/register/${f}`];
    }),
);

export default defineConfig({
  entry: {
    "wc/index": "src/wc/index.ts",
    ambient: "src/ambient.ts",
    ...perComponent,
  },
  format: ["esm"],
  dts: true,
  clean: true,
  minify: false,
  target: "es2022",
  outDir: "dist",
});
