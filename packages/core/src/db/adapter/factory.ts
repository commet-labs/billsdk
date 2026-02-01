import type { DBAdapter, Where } from "../../types/adapter";
import { getBillingSchema } from "../schema";
import type {
  AdapterFactory,
  AdapterFactoryConfig,
  AdapterFactoryOptions,
  AdapterHelpers,
  CleanedWhere,
} from "./types";

/**
 * Transform where clauses to ensure all fields are present
 */
function transformWhereClause(where: Where[]): CleanedWhere[] {
  return where.map((w) => ({
    field: w.field,
    operator: w.operator ?? "eq",
    value: w.value,
  }));
}

/**
 * Transform input data based on adapter capabilities
 * Converts types that the database doesn't support natively
 */
function transformInput(
  data: Record<string, unknown>,
  config: AdapterFactoryConfig,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;

    let transformed = value;

    // Handle dates
    if (value instanceof Date && !config.supportsDates) {
      transformed = value.toISOString();
    }

    // Handle booleans
    if (typeof value === "boolean" && !config.supportsBooleans) {
      transformed = value ? 1 : 0;
    }

    // Handle JSON/objects
    if (
      typeof value === "object" &&
      value !== null &&
      !(value instanceof Date) &&
      !config.supportsJSON
    ) {
      transformed = JSON.stringify(value);
    }

    // Handle arrays
    if (Array.isArray(value) && !config.supportsArrays) {
      transformed = JSON.stringify(value);
    }

    result[key] = transformed;
  }

  return result;
}

/**
 * Transform output data based on adapter capabilities
 * Converts types back from database format
 */
function transformOutput(
  data: Record<string, unknown> | null,
  config: AdapterFactoryConfig,
  schema?: Record<string, { type: string }>,
): Record<string, unknown> | null {
  if (!data) return null;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    let transformed = value;

    // Handle dates stored as strings
    if (!config.supportsDates && typeof value === "string") {
      // Check if it looks like an ISO date
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        transformed = new Date(value);
      }
    }

    // Handle booleans stored as numbers
    if (
      !config.supportsBooleans &&
      (value === 0 || value === 1) &&
      schema?.[key]?.type === "boolean"
    ) {
      transformed = value === 1;
    }

    // Handle JSON stored as strings
    if (!config.supportsJSON && typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "object") {
          transformed = parsed;
        }
      } catch {
        // Not JSON, keep as string
      }
    }

    result[key] = transformed;
  }

  return result;
}

/**
 * Create an adapter factory
 *
 * This function wraps a custom adapter with transformation logic,
 * providing a consistent interface for all adapters.
 *
 * @example
 * ```typescript
 * const drizzleAdapter = (db, config) => createAdapterFactory({
 *   config: {
 *     adapterId: "drizzle",
 *     supportsJSON: config.provider === "pg",
 *   },
 *   adapter: ({ getModelName, getFieldName }) => ({
 *     create: async ({ model, data }) => {
 *       const table = db[getModelName(model)];
 *       return db.insert(table).values(data).returning();
 *     },
 *     // ... other methods
 *   }),
 * });
 * ```
 */
export function createAdapterFactory(
  factoryOptions: AdapterFactoryOptions,
): AdapterFactory {
  const { config: cfg, adapter: createCustomAdapter } = factoryOptions;

  // Apply defaults to config
  const config: Required<
    Pick<
      AdapterFactoryConfig,
      | "adapterId"
      | "supportsJSON"
      | "supportsDates"
      | "supportsBooleans"
      | "supportsArrays"
      | "debugLogs"
    >
  > &
    AdapterFactoryConfig = {
    ...cfg,
    adapterName: cfg.adapterName ?? cfg.adapterId,
    supportsJSON: cfg.supportsJSON ?? false,
    supportsDates: cfg.supportsDates ?? true,
    supportsBooleans: cfg.supportsBooleans ?? true,
    supportsArrays: cfg.supportsArrays ?? false,
    debugLogs: cfg.debugLogs ?? false,
    transaction: cfg.transaction ?? false,
  };

  // This function is called when billsdk() is initialized with options
  return (options: unknown): DBAdapter => {
    // Get the merged schema (core + plugins)
    const schema = getBillingSchema();

    // Create helper functions for the adapter
    const helpers: AdapterHelpers = {
      getModelName: (model: string) => {
        // For now, just use the model name directly
        // Future: could support plural names, custom mappings, etc.
        return model;
      },

      getFieldName: ({ field }: { model: string; field: string }) => {
        // For now, just use the field name directly
        // Future: could support snake_case conversion, custom mappings, etc.
        return field;
      },

      schema,
      options,
      config,
    };

    // Create the custom adapter
    const customAdapter = createCustomAdapter(helpers);

    // Debug logging helper
    const debugLog = (method: string, args: unknown) => {
      if (config.debugLogs) {
        console.log(`[${config.adapterName}] ${method}:`, args);
      }
    };

    // Wrap the custom adapter with transformation logic
    const adapter: DBAdapter = {
      id: config.adapterId,

      async create<T extends Record<string, unknown>>(data: {
        model: string;
        data: Omit<T, "id">;
        select?: string[];
      }): Promise<T> {
        debugLog("create", { model: data.model });

        // Generate ID if not provided
        const dataWithId = {
          id: crypto.randomUUID(),
          ...data.data,
        };

        const transformedData = transformInput(dataWithId, config);
        const result = await customAdapter.create<T>({
          model: data.model,
          data: transformedData,
          select: data.select,
        });

        return transformOutput(result, config) as T;
      },

      async findOne<T extends Record<string, unknown>>(data: {
        model: string;
        where: Where[];
        select?: string[];
      }): Promise<T | null> {
        debugLog("findOne", { model: data.model, where: data.where });

        const cleanedWhere = transformWhereClause(data.where);
        const result = await customAdapter.findOne<T>({
          model: data.model,
          where: cleanedWhere,
          select: data.select,
        });

        return transformOutput(result, config) as T | null;
      },

      async findMany<T extends Record<string, unknown>>(data: {
        model: string;
        where?: Where[];
        select?: string[];
        limit?: number;
        offset?: number;
        sortBy?: { field: string; direction: "asc" | "desc" };
      }): Promise<T[]> {
        debugLog("findMany", { model: data.model, where: data.where });

        const cleanedWhere = data.where
          ? transformWhereClause(data.where)
          : undefined;
        const results = await customAdapter.findMany<T>({
          model: data.model,
          where: cleanedWhere,
          select: data.select,
          limit: data.limit,
          offset: data.offset,
          sortBy: data.sortBy,
        });

        return results.map((r) => transformOutput(r, config) as T);
      },

      async update<T extends Record<string, unknown>>(data: {
        model: string;
        where: Where[];
        update: Partial<T>;
      }): Promise<T | null> {
        debugLog("update", { model: data.model, where: data.where });

        const cleanedWhere = transformWhereClause(data.where);
        const transformedUpdate = transformInput(
          data.update as Record<string, unknown>,
          config,
        );
        const result = await customAdapter.update<T>({
          model: data.model,
          where: cleanedWhere,
          update: transformedUpdate,
        });

        return transformOutput(result, config) as T | null;
      },

      async updateMany(data: {
        model: string;
        where: Where[];
        update: Record<string, unknown>;
      }): Promise<number> {
        debugLog("updateMany", { model: data.model, where: data.where });

        const cleanedWhere = transformWhereClause(data.where);
        const transformedUpdate = transformInput(data.update, config);
        return customAdapter.updateMany({
          model: data.model,
          where: cleanedWhere,
          update: transformedUpdate,
        });
      },

      async delete(data: { model: string; where: Where[] }): Promise<void> {
        debugLog("delete", { model: data.model, where: data.where });

        const cleanedWhere = transformWhereClause(data.where);
        return customAdapter.delete({
          model: data.model,
          where: cleanedWhere,
        });
      },

      async deleteMany(data: {
        model: string;
        where: Where[];
      }): Promise<number> {
        debugLog("deleteMany", { model: data.model, where: data.where });

        const cleanedWhere = transformWhereClause(data.where);
        return customAdapter.deleteMany({
          model: data.model,
          where: cleanedWhere,
        });
      },

      async count(data: { model: string; where?: Where[] }): Promise<number> {
        debugLog("count", { model: data.model, where: data.where });

        const cleanedWhere = data.where
          ? transformWhereClause(data.where)
          : undefined;
        return customAdapter.count({
          model: data.model,
          where: cleanedWhere,
        });
      },
    };

    // Add transaction support if available
    if (config.transaction) {
      adapter.transaction = config.transaction;
    }

    return adapter;
  };
}

// Re-export types for convenience
export type {
  AdapterFactory,
  AdapterFactoryConfig,
  AdapterFactoryOptions,
  AdapterHelpers,
  CleanedWhere,
  CustomAdapter,
} from "./types";
