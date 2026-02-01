import type { DBSchema } from "@billsdk/core";
import { billingSchema } from "@billsdk/core";

/**
 * Plugin interface for schema extraction
 */
interface Plugin {
  id: string;
  schema?: DBSchema;
}

/**
 * Get the merged schema (core + plugins)
 */
export function getMergedSchema(config: unknown): DBSchema {
  // Start with the base billing schema
  let schema = { ...billingSchema };

  const cfg = config as Record<string, unknown>;

  // Try to get plugins from different possible locations
  let plugins: Plugin[] | undefined;

  // Check if it's a billsdk instance with $context
  if (cfg.$context && typeof cfg.$context === "object") {
    const ctx = cfg.$context as { plugins?: Plugin[] };
    plugins = ctx.plugins;
  }

  // Check for plugins directly (raw options)
  if (!plugins && Array.isArray(cfg.plugins)) {
    plugins = cfg.plugins as Plugin[];
  }

  // Check for options property
  if (!plugins && cfg.options && typeof cfg.options === "object") {
    const opts = cfg.options as { plugins?: Plugin[] };
    plugins = opts.plugins;
  }

  // Merge plugin schemas
  if (plugins) {
    for (const plugin of plugins) {
      if (plugin.schema) {
        schema = { ...schema, ...plugin.schema };
      }
    }
  }

  return schema;
}

/**
 * Get adapter info from the config
 */
export function getAdapterInfo(config: unknown): {
  adapterId: string;
  provider?: string;
} | null {
  // The config could be:
  // 1. A billsdk instance (result of billsdk({...}))
  // 2. The raw options object with a database property
  // 3. A module with both billing and billingConfig exports

  const cfg = config as Record<string, unknown>;

  // Check if this is a billsdk instance with $context
  // The context contains the resolved database adapter
  if (cfg.$context && typeof cfg.$context === "object") {
    const ctx = cfg.$context as { database?: { id?: string } };
    if (ctx.database?.id) {
      return {
        adapterId: ctx.database.id,
      };
    }
  }

  // Check for database property directly (raw options)
  if (cfg.database) {
    const db = cfg.database as { id?: string; options?: { provider?: string } };

    // If it's a function that returns an adapter (factory pattern)
    if (typeof db === "function") {
      try {
        const adapter = (db as (opts: unknown) => { id: string })({});
        return {
          adapterId: adapter.id,
        };
      } catch {
        // Fall through
      }
    }

    // If it's already an adapter object
    if (db.id) {
      return {
        adapterId: db.id,
        provider: db.options?.provider,
      };
    }
  }

  // Check for options property (might be exposed on billsdk instance)
  if (cfg.options && typeof cfg.options === "object") {
    const opts = cfg.options as { database?: { id?: string } };
    if (opts.database?.id) {
      return {
        adapterId: opts.database.id,
      };
    }
  }

  // Couldn't detect - will rely on CLI flags
  return null;
}
