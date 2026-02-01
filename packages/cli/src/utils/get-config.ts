import path from "node:path";
import { createJiti } from "jiti";

/**
 * Default config file names to search for
 */
const CONFIG_FILES = [
  "billing.ts",
  "billing.js",
  "billing.mts",
  "billing.mjs",
  "src/billing.ts",
  "src/billing.js",
  "src/billing.mts",
  "src/billing.mjs",
  "lib/billing.ts",
  "lib/billing.js",
  "app/billing.ts",
  "app/billing.js",
];

/**
 * Result of loading the billing config
 */
export interface ConfigResult {
  config: unknown;
  configPath: string;
}

/**
 * Find the billing config file in the current directory
 */
export async function findConfigFile(cwd: string): Promise<string | null> {
  const fs = await import("node:fs/promises");

  for (const file of CONFIG_FILES) {
    const configPath = path.join(cwd, file);
    try {
      await fs.access(configPath);
      return configPath;
    } catch {
      // File doesn't exist, try next
    }
  }

  return null;
}

/**
 * Load the billing config from a file
 */
export async function loadConfig(configPath: string): Promise<ConfigResult> {
  // Create jiti instance for loading TypeScript files
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    moduleCache: false,
    fsCache: false,
  });

  try {
    const module = await jiti.import(configPath);

    // Look for common export names
    const config =
      (module as Record<string, unknown>).billing ||
      (module as Record<string, unknown>).default ||
      module;

    return {
      config,
      configPath,
    };
  } catch (error) {
    throw new Error(
      `Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get the billing config, searching for it if no path is provided
 */
export async function getConfig(
  configPath?: string,
  cwd = process.cwd(),
): Promise<ConfigResult> {
  let resolvedPath: string;

  if (configPath) {
    // Use provided path
    resolvedPath = path.isAbsolute(configPath)
      ? configPath
      : path.join(cwd, configPath);
  } else {
    // Search for config file
    const found = await findConfigFile(cwd);
    if (!found) {
      throw new Error(
        `Could not find billing config. Looked for: ${CONFIG_FILES.join(", ")}\n` +
          "Create a billing.ts file or specify the path with --config",
      );
    }
    resolvedPath = found;
  }

  return loadConfig(resolvedPath);
}
