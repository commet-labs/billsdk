import type { DBAdapter, SortBy, Where } from "@billsdk/core";
import { eq, and, or, gt, gte, lt, lte, ne, like, inArray, desc, asc } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

/**
 * Drizzle database instance type
 */
export interface DrizzleDB {
  insert: (table: any) => any;
  select: () => any;
  update: (table: any) => any;
  delete: (table: any) => any;
  transaction?: <T>(fn: (tx: DrizzleDB) => Promise<T>) => Promise<T>;
}

/**
 * Drizzle adapter configuration
 */
export interface DrizzleAdapterConfig {
  /**
   * The schema object that defines the tables
   */
  schema: Record<string, any>;

  /**
   * The database provider
   */
  provider: "pg" | "mysql" | "sqlite";

  /**
   * Enable debug logs
   * @default false
   */
  debugLogs?: boolean;
}

/**
 * Build where clause from BillSDK Where[] format
 */
function buildWhereClause(where: Where[], table: any): SQL | undefined {
  if (!where || where.length === 0) return undefined;

  const conditions: SQL[] = [];

  for (const clause of where) {
    const column = table[clause.field];
    if (!column) continue;

    let condition: SQL | undefined;

    switch (clause.operator) {
      case "eq":
        condition = eq(column, clause.value);
        break;
      case "ne":
        condition = ne(column, clause.value);
        break;
      case "gt":
        condition = gt(column, clause.value as number);
        break;
      case "gte":
        condition = gte(column, clause.value as number);
        break;
      case "lt":
        condition = lt(column, clause.value as number);
        break;
      case "lte":
        condition = lte(column, clause.value as number);
        break;
      case "in":
        if (Array.isArray(clause.value)) {
          condition = inArray(column, clause.value);
        }
        break;
      case "contains":
        condition = like(column, `%${clause.value}%`);
        break;
      case "startsWith":
        condition = like(column, `${clause.value}%`);
        break;
      case "endsWith":
        condition = like(column, `%${clause.value}`);
        break;
    }

    if (condition) {
      conditions.push(condition);
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];

  return and(...conditions);
}

/**
 * Create a Drizzle ORM adapter for BillSDK
 *
 * @example
 * ```typescript
 * import { drizzleAdapter } from "@billsdk/drizzle";
 * import { db } from "./db";
 * import * as schema from "./schema";
 *
 * const adapter = drizzleAdapter(db, {
 *   schema,
 *   provider: "pg",
 * });
 * ```
 */
export function drizzleAdapter(db: DrizzleDB, config: DrizzleAdapterConfig): DBAdapter {
  const getTable = (model: string) => {
    const table = config.schema[model];
    if (!table) {
      throw new Error(`Table "${model}" not found in schema`);
    }
    return table;
  };

  const withReturning = async (
    builder: any,
    model: string,
    where?: Where[],
  ): Promise<any> => {
    if (config.provider !== "mysql") {
      const result = await builder.returning();
      return result[0];
    }

    // MySQL doesn't support RETURNING, so we need to fetch after
    await builder.execute();

    if (where) {
      const table = getTable(model);
      const clause = buildWhereClause(where, table);
      const [result] = await db.select().from(table).where(clause);
      return result;
    }

    return null;
  };

  return {
    id: "drizzle",

    async create<T extends Record<string, unknown>>(data: {
      model: string;
      data: Omit<T, "id">;
      select?: string[];
    }): Promise<T> {
      const table = getTable(data.model);

      // Generate ID if not provided
      const insertData = {
        id: crypto.randomUUID(),
        ...data.data,
      };

      const builder = db.insert(table).values(insertData);

      if (config.provider !== "mysql") {
        const [result] = await builder.returning();
        return result as T;
      }

      await builder.execute();

      // Fetch the inserted record for MySQL
      const [result] = await db
        .select()
        .from(table)
        .where(eq(table.id, insertData.id));

      return result as T;
    },

    async findOne<T extends Record<string, unknown>>(data: {
      model: string;
      where: Where[];
      select?: string[];
    }): Promise<T | null> {
      const table = getTable(data.model);
      const clause = buildWhereClause(data.where, table);

      const query = db.select().from(table);
      const results = clause ? await query.where(clause) : await query;

      return (results[0] as T) ?? null;
    },

    async findMany<T extends Record<string, unknown>>(data: {
      model: string;
      where?: Where[];
      select?: string[];
      limit?: number;
      offset?: number;
      sortBy?: SortBy;
    }): Promise<T[]> {
      const table = getTable(data.model);
      let query = db.select().from(table);

      // Apply where
      if (data.where && data.where.length > 0) {
        const clause = buildWhereClause(data.where, table);
        if (clause) {
          query = query.where(clause);
        }
      }

      // Apply sorting
      if (data.sortBy) {
        const column = table[data.sortBy.field];
        if (column) {
          query = query.orderBy(
            data.sortBy.direction === "desc" ? desc(column) : asc(column),
          );
        }
      }

      // Apply pagination
      if (data.limit) {
        query = query.limit(data.limit);
      }
      if (data.offset) {
        query = query.offset(data.offset);
      }

      const results = await query;
      return results as T[];
    },

    async update<T extends Record<string, unknown>>(data: {
      model: string;
      where: Where[];
      update: Partial<T>;
    }): Promise<T | null> {
      const table = getTable(data.model);
      const clause = buildWhereClause(data.where, table);

      const builder = db.update(table).set(data.update);

      if (clause) {
        builder.where(clause);
      }

      const result = await withReturning(builder, data.model, data.where);
      return result as T;
    },

    async updateMany(data: {
      model: string;
      where: Where[];
      update: Record<string, unknown>;
    }): Promise<number> {
      const table = getTable(data.model);
      const clause = buildWhereClause(data.where, table);

      const builder = db.update(table).set(data.update);

      if (clause) {
        builder.where(clause);
      }

      const result = await builder.execute();

      // Return count based on provider
      if ("rowCount" in result) return result.rowCount ?? 0;
      if ("affectedRows" in result) return result.affectedRows ?? 0;
      if ("changes" in result) return result.changes ?? 0;

      return 0;
    },

    async delete(data: { model: string; where: Where[] }): Promise<void> {
      const table = getTable(data.model);
      const clause = buildWhereClause(data.where, table);

      const builder = db.delete(table);

      if (clause) {
        builder.where(clause);
      }

      await builder.execute();
    },

    async deleteMany(data: { model: string; where: Where[] }): Promise<number> {
      const table = getTable(data.model);
      const clause = buildWhereClause(data.where, table);

      const builder = db.delete(table);

      if (clause) {
        builder.where(clause);
      }

      const result = await builder.execute();

      // Return count based on provider
      if ("rowCount" in result) return result.rowCount ?? 0;
      if ("affectedRows" in result) return result.affectedRows ?? 0;
      if ("changes" in result) return result.changes ?? 0;

      return 0;
    },

    async count(data: { model: string; where?: Where[] }): Promise<number> {
      const table = getTable(data.model);
      let query = db.select().from(table);

      if (data.where && data.where.length > 0) {
        const clause = buildWhereClause(data.where, table);
        if (clause) {
          query = query.where(clause);
        }
      }

      const results = await query;
      return results.length;
    },

    async transaction<R>(callback: (adapter: DBAdapter) => Promise<R>): Promise<R> {
      if (!db.transaction) {
        // If transactions aren't supported, just run the callback
        return callback(this);
      }

      return db.transaction(async (tx) => {
        const txAdapter = drizzleAdapter(tx as DrizzleDB, config);
        return callback(txAdapter);
      });
    },
  };
}
