import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "wc/index": "src/wc/index.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  minify: false,
  target: "es2022",
  outDir: "dist",
});
