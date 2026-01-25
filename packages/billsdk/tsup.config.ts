import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/client/index.ts",
    "src/client/react/index.ts",
    "src/adapters/drizzle/index.ts",
    "src/adapters/payment/index.ts",
    "src/integrations/next.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ["@billsdk/core", "react", "drizzle-orm"],
});
