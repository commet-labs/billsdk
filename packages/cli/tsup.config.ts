import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  // Don't bundle - use external dependencies
  noExternal: [],
  external: [
    // Keep all dependencies external - they're in package.json
    /@billsdk\/.*/,
    "billsdk",
    "drizzle-orm",
    "jiti",
    "c12",
    "commander",
    "chalk",
    "@clack/prompts",
    "prettier",
    "dotenv",
    // Database drivers (loaded dynamically)
    "better-sqlite3",
    "pg",
    "mysql2",
    "postgres",
  ],
});
