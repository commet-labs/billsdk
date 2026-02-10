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
   * Secret for signing CSRF tokens
   */
  secret: string;

  /**
   * Resolved trusted origins for origin validation
   */
  trustedOrigins: string[];

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

const DEFAULT_SECRET = "billsdk-development-secret-change-in-production";

/**
 * Resolve trusted origins from config and environment
 */
function resolveTrustedOrigins(
  configOrigins: BillSDKOptions["trustedOrigins"],
): string[] {
  const origins: string[] = [];

  if (Array.isArray(configOrigins)) {
    origins.push(...configOrigins);
  }

  // Merge with env variable (comma-separated)
  const envOrigins =
    typeof globalThis.process !== "undefined"
      ? globalThis.process.env?.BILLSDK_TRUSTED_ORIGINS
      : undefined;
  if (envOrigins) {
    origins.push(
      ...envOrigins
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    );
  }

  return origins;
}

/**
 * Resolve secret from config and environment
 */
function resolveSecret(configSecret: string | undefined): string {
  if (configSecret) return configSecret;

  const envSecret =
    typeof globalThis.process !== "undefined"
      ? globalThis.process.env?.BILLSDK_SECRET
      : undefined;
  if (envSecret) return envSecret;

  return DEFAULT_SECRET;
}

/**
 * Validate security configuration
 */
function validateSecurity(
  secret: string,
  trustedOrigins: string[],
  logger: Logger,
): void {
  const isProduction =
    typeof globalThis.process !== "undefined" &&
    globalThis.process.env?.NODE_ENV === "production";

  if (isProduction && secret === DEFAULT_SECRET) {
    throw new Error(
      "[billsdk] BILLSDK_SECRET is required in production. " +
        "Set it in your environment or pass `secret` to billsdk(). " +
        "Generate one with: openssl rand -base64 32",
    );
  }

  if (secret === DEFAULT_SECRET) {
    logger.warn(
      "Using default development secret. Set BILLSDK_SECRET for production.",
    );
  } else if (secret.length < 32) {
    logger.warn(
      "Secret should be at least 32 characters for adequate security. " +
        "Generate one with: openssl rand -base64 32",
    );
  }

  if (isProduction && trustedOrigins.length === 0) {
    logger.warn(
      "No trustedOrigins configured. " +
        "Set trustedOrigins in your config or BILLSDK_TRUSTED_ORIGINS env var " +
        "to protect mutating endpoints from cross-site requests.",
    );
  }
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
    secret: resolveSecret(options.secret),
    trustedOrigins: resolveTrustedOrigins(options.trustedOrigins),
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

  // Timestamps like createdAt/updatedAt should always be real system time
  const getNow = async () => new Date();

  const internalAdapter = createInternalAdapter(
    adapter,
    options.plans ?? [],
    options.features ?? [],
    getNow,
  );

  // Validate security configuration
  validateSecurity(
    resolvedOptions.secret,
    resolvedOptions.trustedOrigins,
    logger,
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
    trustedOrigins: resolvedOptions.trustedOrigins,
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
