import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: !options.watch,
  splitting: false,
  treeshake: true,
  external: ["@billsdk/core", "stripe"],
}));
