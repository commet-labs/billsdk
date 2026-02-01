import type { DBAdapter, SortBy, Where } from "../../types/adapter";
import type { DBSchema } from "../field";

/**
 * Configuration for the adapter factory
 * Describes the capabilities of the adapter
 */
export interface AdapterFactoryConfig {
  /**
   * Unique identifier for this adapter (e.g., "drizzle", "prisma", "kysely")
   */
  adapterId: string;

  /**
   * Display name for the adapter
   * @default adapterId
   */
  adapterName?: string;

  /**
   * Whether the database supports JSON columns natively
   * If false, JSON will be serialized to strings
   * @default false
   */
  supportsJSON?: boolean;

  /**
   * Whether the database supports Date objects natively
   * If false, dates will be converted to ISO strings
   * @default true
   */
  supportsDates?: boolean;

  /**
   * Whether the database supports boolean values natively
   * If false, booleans will be converted to 0/1
   * @default true
   */
  supportsBooleans?: boolean;

  /**
   * Whether the database supports array columns natively
   * If false, arrays will be serialized to JSON strings
   * @default false
   */
  supportsArrays?: boolean;

  /**
   * Transaction support
   * Provide a function to wrap operations in a transaction, or false if not supported
   * @default false
   */
  transaction?:
    | false
    | (<R>(callback: (adapter: DBAdapter) => Promise<R>) => Promise<R>);

  /**
   * Enable debug logging
   * @default false
   */
  debugLogs?: boolean;
}

/**
 * Where clause with all fields required (after transformation)
 */
export interface CleanedWhere {
  field: string;
  operator: Where["operator"];
  value: Where["value"];
}

/**
 * Helper functions provided to custom adapters
 */
export interface AdapterHelpers {
  /**
   * Get the actual table name for a model
   * May apply transformations like pluralization
   */
  getModelName(model: string): string;

  /**
   * Get the actual column name for a field
   * May apply transformations like snake_case conversion
   */
  getFieldName(params: { model: string; field: string }): string;

  /**
   * The merged billing schema (core + plugins)
   */
  schema: DBSchema;

  /**
   * The BillSDK options passed during initialization
   */
  options: unknown;

  /**
   * The adapter configuration
   */
  config: AdapterFactoryConfig;
}

/**
 * The interface that adapter authors implement
 * Uses CleanedWhere (all fields required) for cleaner adapter code
 */
export interface CustomAdapter {
  /**
   * Create a new record
   */
  create<T extends Record<string, unknown>>(data: {
    model: string;
    data: Record<string, unknown>;
    select?: string[];
  }): Promise<T>;

  /**
   * Find a single record
   */
  findOne<T extends Record<string, unknown>>(data: {
    model: string;
    where: CleanedWhere[];
    select?: string[];
  }): Promise<T | null>;

  /**
   * Find multiple records
   */
  findMany<T extends Record<string, unknown>>(data: {
    model: string;
    where?: CleanedWhere[];
    limit?: number;
    offset?: number;
    sortBy?: SortBy;
    select?: string[];
  }): Promise<T[]>;

  /**
   * Update a record
   */
  update<T extends Record<string, unknown>>(data: {
    model: string;
    where: CleanedWhere[];
    update: Record<string, unknown>;
  }): Promise<T | null>;

  /**
   * Update multiple records
   */
  updateMany(data: {
    model: string;
    where: CleanedWhere[];
    update: Record<string, unknown>;
  }): Promise<number>;

  /**
   * Delete a record
   */
  delete(data: { model: string; where: CleanedWhere[] }): Promise<void>;

  /**
   * Delete multiple records
   */
  deleteMany(data: { model: string; where: CleanedWhere[] }): Promise<number>;

  /**
   * Count records
   */
  count(data: { model: string; where?: CleanedWhere[] }): Promise<number>;

  /**
   * Optional: Generate schema for CLI
   * If provided, the CLI can use this to generate schema files
   */
  createSchema?(data: {
    file?: string;
    tables: DBSchema;
  }): Promise<{ code: string; fileName: string; overwrite?: boolean }>;

  /**
   * Optional: Adapter-specific options
   */
  options?: Record<string, unknown>;
}

/**
 * Options for creating an adapter factory
 */
export interface AdapterFactoryOptions {
  /**
   * The adapter factory configuration
   */
  config: AdapterFactoryConfig;

  /**
   * Function that creates the custom adapter
   * Receives helper functions and returns the adapter implementation
   */
  adapter: (helpers: AdapterHelpers) => CustomAdapter;
}

/**
 * The function signature returned by createAdapterFactory
 */
export type AdapterFactory = (options: unknown) => DBAdapter;
