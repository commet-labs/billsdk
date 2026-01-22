import { createInternalAdapter, type InternalAdapter } from "../db/internal-adapter";
import { type DBSchema, getBillingSchema } from "../db/schema";
import type { DBAdapter } from "../types/adapter";
import type { BillSDKOptions, FeatureConfig, PlanConfig, ResolvedBillSDKOptions } from "../types/options";
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
    payment: options.payment,
    basePath: options.basePath ?? "/api/billing",
    secret: options.secret ?? generateDefaultSecret(),
    plans: options.plans,
    features: options.features,
    plugins: options.plugins ?? [],
    hooks: options.hooks ?? {},
    logger: {
      level: options.logger?.level ?? "info",
      disabled: options.logger?.disabled ?? false,
    },
  };
}

/**
 * Seed features from configuration
 */
async function seedFeatures(
  features: FeatureConfig[],
  internalAdapter: InternalAdapter,
  logger: Logger,
): Promise<void> {
  for (const featureConfig of features) {
    const existing = await internalAdapter.findFeatureByCode(featureConfig.code);
    if (!existing) {
      await internalAdapter.createFeature({
        code: featureConfig.code,
        name: featureConfig.name,
        type: featureConfig.type ?? "boolean",
      });
      logger.debug(`Created feature: ${featureConfig.code}`);
    }
  }
}

/**
 * Seed plans from configuration
 */
async function seedPlans(
  plans: PlanConfig[],
  internalAdapter: InternalAdapter,
  logger: Logger,
): Promise<void> {
  for (const planConfig of plans) {
    let plan = await internalAdapter.findPlanByCode(planConfig.code);

    if (!plan) {
      plan = await internalAdapter.createPlan({
        code: planConfig.code,
        name: planConfig.name,
        description: planConfig.description,
        isPublic: planConfig.isPublic ?? true,
      });
      logger.debug(`Created plan: ${planConfig.code}`);
    }

    // Create prices if they don't exist
    const existingPrices = await internalAdapter.listPlanPrices(plan.id);

    for (const priceConfig of planConfig.prices) {
      const existingPrice = existingPrices.find(
        (p) => p.interval === priceConfig.interval && p.currency === (priceConfig.currency ?? "usd"),
      );

      if (!existingPrice) {
        await internalAdapter.createPlanPrice({
          planId: plan.id,
          amount: priceConfig.amount,
          currency: priceConfig.currency ?? "usd",
          interval: priceConfig.interval,
          isDefault: true,
          trialDays: priceConfig.trialDays,
        });
        logger.debug(`Created price for ${planConfig.code}: ${priceConfig.interval}`);
      }
    }

    // Create plan features
    if (planConfig.features) {
      const existingPlanFeatures = await internalAdapter.listPlanFeatures(plan.id);

      for (const featureCode of planConfig.features) {
        const existingPlanFeature = existingPlanFeatures.find(
          (pf) => pf.featureCode === featureCode,
        );

        if (!existingPlanFeature) {
          await internalAdapter.createPlanFeature({
            planId: plan.id,
            featureCode,
            enabled: true,
          });
          logger.debug(`Enabled feature ${featureCode} for plan ${planConfig.code}`);
        }
      }
    }
  }
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
    paymentAdapter: options.payment,
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

  // Seed features from configuration
  if (options.features && options.features.length > 0) {
    await seedFeatures(options.features, internalAdapter, logger);
  }

  // Seed plans from configuration
  if (options.plans && options.plans.length > 0) {
    await seedPlans(options.plans, internalAdapter, logger);
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
