import { createDefaultTimeProvider, type TimeProvider } from "@billsdk/core";
import {
  createInternalAdapter,
  type InternalAdapter,
} from "../db/internal-adapter";
import { type DBSchema, getBillingSchema } from "../db/schema";
import type { DBAdapter } from "../types/adapter";
import type { BillSDKOptions, ResolvedBillSDKOptions } from "../types/options";
import type { PaymentAdapter } from "../types/payment";
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
   * Payment adapter (optional)
   */
  paymentAdapter?: PaymentAdapter;

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
   * Time provider for getting current time
   * Can be overridden by plugins (e.g., time-travel) for testing
   */
  timeProvider: TimeProvider;

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
function resolveOptions(
  options: BillSDKOptions,
  adapter: DBAdapter,
): ResolvedBillSDKOptions {
  return {
    database: adapter,
    payment: options.payment,
    basePath: options.basePath ?? "/api/billing",
    secret: options.secret ?? generateDefaultSecret(),
    plans: options.plans,
    features: options.features,
    plugins: options.plugins ?? [],
    hooks: options.hooks ?? {},
    behaviors: options.behaviors,
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
 * Plans and features are read from config, not seeded to DB
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

  // Reference to context for getNow function (resolved after context creation)
  let contextRef: BillingContext | null = null;
  const getNow = async () => contextRef?.timeProvider.now() ?? new Date();

  // Create internal adapter with config (no DB seeding needed!)
  const internalAdapter = createInternalAdapter(
    adapter,
    options.plans ?? [],
    options.features ?? [],
    getNow,
  );

  // Build context
  const context: BillingContext = {
    options: resolvedOptions,
    basePath: resolvedOptions.basePath,
    adapter,
    paymentAdapter: options.payment,
    internalAdapter,
    schema,
    plugins,
    logger,
    secret: resolvedOptions.secret,
    timeProvider: createDefaultTimeProvider(),

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

  // Link context reference so getNow() uses the correct timeProvider
  contextRef = context;

  // Initialize plugins (may override timeProvider)
  for (const plugin of plugins) {
    if (plugin.init) {
      await plugin.init(context);
    }
  }

  logger.debug("BillingContext created", {
    basePath: context.basePath,
    plugins: plugins.map((p) => p.id),
    hasPaymentAdapter: !!context.paymentAdapter,
    plans: options.plans?.length ?? 0,
    features: options.features?.length ?? 0,
  });

  return context;
}
