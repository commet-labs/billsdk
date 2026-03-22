import { defineConfig } from "tsup";

export default defineConfig((options) => [
  // Server-side plugin code
  {
    entry: ["src/index.ts"],
    outDir: "dist",
    format: ["esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: !options.watch,
    external: ["@billsdk/core", "zod"],
  },
  // Client-side React components (needs "use client")
  {
    entry: { "client/index": "src/client/index.ts" },
    outDir: "dist",
    format: ["esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    external: ["react"],
    banner: {
      js: '"use client";',
    },
  },
]);
