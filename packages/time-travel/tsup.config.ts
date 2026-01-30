import { defineConfig } from "tsup";

export default defineConfig([
  // Server-side plugin code
  {
    entry: ["src/index.ts"],
    outDir: "dist",
    format: ["esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
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
