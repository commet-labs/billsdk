import { createInternalAdapter, type InternalAdapter } from "../db/internal-adapter";
import { type DBSchema, getBillingSchema } from "../db/schema";
import type { DBAdapter } from "../types/adapter";
import type { BillSDKOptions, ResolvedBillSDKOptions } from "../types/options";
import type { BillSDKPlugin } from "../types/plugins";

/**
 * Logger interface for the billing context
 */
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

/**
 * The billing context containing all runtime state
 */
export interface BillingContext {
  /**
   * Resolved options with defaults
   */
  options: ResolvedBillSDKOptions;

  /**
   * Base path for the API
   */
  basePath: string;

  /**
   * Database adapter
   */
  adapter: DBAdapter;

  /**
   * Internal adapter with business logic
   */
  internalAdapter: InternalAdapter;

  /**
   * Database schema
   */
  schema: DBSchema;

  /**
   * Registered plugins
   */
  plugins: BillSDKPlugin[];

  /**
   * Logger instance
   */
  logger: Logger;

  /**
   * Secret for signing
   */
  secret: string;

  /**
   * Check if a plugin is registered
   */
  hasPlugin: (id: string) => boolean;

  /**
   * Get a plugin by ID
   */
  getPlugin: <T extends BillSDKPlugin>(id: string) => T | null;

  /**
   * Generate a unique ID
   */
  generateId: () => string;
}

/**
 * Create a logger instance
 */
function createLogger(options: BillSDKOptions["logger"]): Logger {
  const level = options?.level ?? "info";
  const disabled = options?.disabled ?? false;

  const levels = ["debug", "info", "warn", "error"];
  const currentLevelIndex = levels.indexOf(level);

  const shouldLog = (logLevel: string) => {
    if (disabled) return false;
    return levels.indexOf(logLevel) >= currentLevelIndex;
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog("debug")) console.debug(`[billsdk] ${message}`, ...args);
    },
    info: (message: string, ...args: unknown[]) => {
      if (shouldLog("info")) console.info(`[billsdk] ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog("warn")) console.warn(`[billsdk] ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      if (shouldLog("error")) console.error(`[billsdk] ${message}`, ...args);
    },
  };
}

/**
 * Resolve options with defaults
 */
function resolveOptions(options: BillSDKOptions, adapter: DBAdapter): ResolvedBillSDKOptions {
  return {
    database: adapter,
    basePath: options.basePath ?? "/api/billing",
    secret: options.secret ?? generateDefaultSecret(),
    plugins: options.plugins ?? [],
    hooks: options.hooks ?? {},
    logger: {
      level: options.logger?.level ?? "info",
      disabled: options.logger?.disabled ?? false,
    },
  };
}

/**
 * Generate a default secret (for development only)
 */
function generateDefaultSecret(): string {
  // In production, users should provide their own secret
  return "billsdk-development-secret-change-in-production";
}

/**
 * Create the billing context
 */
export async function createBillingContext(
  adapter: DBAdapter,
  options: BillSDKOptions,
): Promise<BillingContext> {
  const resolvedOptions = resolveOptions(options, adapter);
  const logger = createLogger(options.logger);
  const plugins = resolvedOptions.plugins;

  // Get base schema
  let schema = getBillingSchema();

  // Extend schema with plugins
  for (const plugin of plugins) {
    if (plugin.schema) {
      schema = { ...schema, ...plugin.schema };
    }
  }

  // Create internal adapter
  const internalAdapter = createInternalAdapter(adapter);

  // Build context
  const context: BillingContext = {
    options: resolvedOptions,
    basePath: resolvedOptions.basePath,
    adapter,
    internalAdapter,
    schema,
    plugins,
    logger,
    secret: resolvedOptions.secret,

    hasPlugin(id: string): boolean {
      return plugins.some((p) => p.id === id);
    },

    getPlugin<T extends BillSDKPlugin>(id: string): T | null {
      const plugin = plugins.find((p) => p.id === id);
      return (plugin as T) ?? null;
    },

    generateId(): string {
      return crypto.randomUUID();
    },
  };

  // Initialize plugins
  for (const plugin of plugins) {
    if (plugin.init) {
      await plugin.init(context);
    }
  }

  logger.debug("BillingContext created", {
    basePath: context.basePath,
    plugins: plugins.map((p) => p.id),
  });

  return context;
}
