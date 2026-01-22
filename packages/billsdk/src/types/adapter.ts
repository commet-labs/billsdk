/**
 * Where clause operator
 */
export type WhereOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "contains"
  | "startsWith"
  | "endsWith";

/**
 * Where clause for filtering
 */
export interface Where {
  field: string;
  operator: WhereOperator;
  value: unknown;
}

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Sort by configuration
 */
export interface SortBy {
  field: string;
  direction: SortDirection;
}

/**
 * Database adapter interface
 * Implements the repository pattern for data access
 */
export interface DBAdapter {
  /**
   * Unique identifier for this adapter
   */
  id: string;

  /**
   * Create a new record
   */
  create<T extends Record<string, unknown>>(data: {
    model: string;
    data: Omit<T, "id">;
    select?: string[];
  }): Promise<T>;

  /**
   * Find a single record
   */
  findOne<T extends Record<string, unknown>>(data: {
    model: string;
    where: Where[];
    select?: string[];
  }): Promise<T | null>;

  /**
   * Find multiple records
   */
  findMany<T extends Record<string, unknown>>(data: {
    model: string;
    where?: Where[];
    select?: string[];
    limit?: number;
    offset?: number;
    sortBy?: SortBy;
  }): Promise<T[]>;

  /**
   * Update a record
   */
  update<T extends Record<string, unknown>>(data: {
    model: string;
    where: Where[];
    update: Partial<T>;
  }): Promise<T | null>;

  /**
   * Update multiple records
   */
  updateMany(data: {
    model: string;
    where: Where[];
    update: Record<string, unknown>;
  }): Promise<number>;

  /**
   * Delete a record
   */
  delete(data: { model: string; where: Where[] }): Promise<void>;

  /**
   * Delete multiple records
   */
  deleteMany(data: { model: string; where: Where[] }): Promise<number>;

  /**
   * Count records
   */
  count(data: { model: string; where?: Where[] }): Promise<number>;

  /**
   * Execute operations in a transaction
   */
  transaction?<R>(callback: (adapter: DBAdapter) => Promise<R>): Promise<R>;
}
