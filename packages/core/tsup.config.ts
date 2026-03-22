import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: [
    "src/index.ts",
    "src/api/index.ts",
    "src/error/index.ts",
    "src/db/schema.ts",
    "src/types/index.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: !options.watch,
  splitting: false,
  treeshake: true,
  external: [],
}));
