import {
  type CleanedWhere,
  type CustomAdapter,
  createAdapterFactory,
  type DBAdapter,
} from "@billsdk/core";

/**
 * In-memory storage for the adapter
 */
type Storage = Map<string, Map<string, Record<string, unknown>>>;

/**
 * Apply where clauses to filter records
 */
function applyWhere(
  record: Record<string, unknown>,
  where: CleanedWhere[],
): boolean {
  return where.every((clause) => {
    const value = record[clause.field];

    switch (clause.operator) {
      case "eq":
        return value === clause.value;
      case "ne":
        return value !== clause.value;
      case "gt":
        return typeof value === "number" && value > (clause.value as number);
      case "gte":
        return typeof value === "number" && value >= (clause.value as number);
      case "lt":
        return typeof value === "number" && value < (clause.value as number);
      case "lte":
        return typeof value === "number" && value <= (clause.value as number);
      case "in":
        return Array.isArray(clause.value) && clause.value.includes(value);
      case "contains":
        return (
          typeof value === "string" && value.includes(clause.value as string)
        );
      case "startsWith":
        return (
          typeof value === "string" && value.startsWith(clause.value as string)
        );
      case "endsWith":
        return (
          typeof value === "string" && value.endsWith(clause.value as string)
        );
      default:
        return true;
    }
  });
}

/**
 * Apply sorting to records
 */
function applySorting<T extends Record<string, unknown>>(
  records: T[],
  sortBy?: { field: string; direction: "asc" | "desc" },
): T[] {
  if (!sortBy) return records;

  return [...records].sort((a, b) => {
    const aValue = a[sortBy.field];
    const bValue = b[sortBy.field];

    if (aValue === bValue) return 0;
    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    const comparison = aValue < bValue ? -1 : 1;
    return sortBy.direction === "asc" ? comparison : -comparison;
  });
}

/**
 * Select specific fields from a record
 */
function selectFields<T extends Record<string, unknown>>(
  record: T,
  select?: string[],
): T {
  if (!select || select.length === 0) return record;

  const result: Record<string, unknown> = {};
  for (const field of select) {
    if (field in record) {
      result[field] = record[field];
    }
  }
  return result as T;
}

/**
 * Create an in-memory database adapter for BillSDK
 *
 * Useful for testing and development. Data is stored in memory
 * and will be lost when the process restarts.
 *
 * @example
 * ```typescript
 * import { billsdk } from "billsdk";
 * import { memoryAdapter } from "@billsdk/memory-adapter";
 *
 * const billing = billsdk({
 *   database: memoryAdapter(),
 *   plans: [...],
 * });
 * ```
 */
export function memoryAdapter(): DBAdapter {
  const storage: Storage = new Map();

  function getTable(model: string): Map<string, Record<string, unknown>> {
    let table = storage.get(model);
    if (!table) {
      table = new Map();
      storage.set(model, table);
    }
    return table;
  }

  // Create the custom adapter implementation
  const createCustomAdapter = (): CustomAdapter => ({
    async create<T extends Record<string, unknown>>(data: {
      model: string;
      data: Record<string, unknown>;
      select?: string[];
    }): Promise<T> {
      const table = getTable(data.model);
      const id = data.data.id as string;
      const record = { ...data.data } as unknown as T;
      table.set(id, record);
      return selectFields(record, data.select);
    },

    async findOne<T extends Record<string, unknown>>(data: {
      model: string;
      where: CleanedWhere[];
      select?: string[];
    }): Promise<T | null> {
      const table = getTable(data.model);

      for (const record of table.values()) {
        if (applyWhere(record, data.where)) {
          return selectFields(record as T, data.select);
        }
      }

      return null;
    },

    async findMany<T extends Record<string, unknown>>(data: {
      model: string;
      where?: CleanedWhere[];
      select?: string[];
      limit?: number;
      offset?: number;
      sortBy?: { field: string; direction: "asc" | "desc" };
    }): Promise<T[]> {
      const table = getTable(data.model);
      let records = Array.from(table.values()) as T[];

      // Apply where clauses
      if (data.where && data.where.length > 0) {
        records = records.filter((record) => applyWhere(record, data.where!));
      }

      // Apply sorting
      records = applySorting(records, data.sortBy);

      // Apply pagination
      if (data.offset) {
        records = records.slice(data.offset);
      }
      if (data.limit) {
        records = records.slice(0, data.limit);
      }

      // Apply field selection
      if (data.select) {
        records = records.map((record) => selectFields(record, data.select));
      }

      return records;
    },

    async update<T extends Record<string, unknown>>(data: {
      model: string;
      where: CleanedWhere[];
      update: Record<string, unknown>;
    }): Promise<T | null> {
      const table = getTable(data.model);

      for (const [id, record] of table.entries()) {
        if (applyWhere(record, data.where)) {
          const updated = { ...record, ...data.update } as T;
          table.set(id, updated);
          return updated;
        }
      }

      return null;
    },

    async updateMany(data: {
      model: string;
      where: CleanedWhere[];
      update: Record<string, unknown>;
    }): Promise<number> {
      const table = getTable(data.model);
      let count = 0;

      for (const [id, record] of table.entries()) {
        if (applyWhere(record, data.where)) {
          table.set(id, { ...record, ...data.update });
          count++;
        }
      }

      return count;
    },

    async delete(data: {
      model: string;
      where: CleanedWhere[];
    }): Promise<void> {
      const table = getTable(data.model);

      for (const [id, record] of table.entries()) {
        if (applyWhere(record, data.where)) {
          table.delete(id);
          return;
        }
      }
    },

    async deleteMany(data: {
      model: string;
      where: CleanedWhere[];
    }): Promise<number> {
      const table = getTable(data.model);
      let count = 0;

      for (const [id, record] of table.entries()) {
        if (applyWhere(record, data.where)) {
          table.delete(id);
          count++;
        }
      }

      return count;
    },

    async count(data: {
      model: string;
      where?: CleanedWhere[];
    }): Promise<number> {
      const table = getTable(data.model);

      if (!data.where || data.where.length === 0) {
        return table.size;
      }

      let count = 0;
      for (const record of table.values()) {
        if (applyWhere(record, data.where)) {
          count++;
        }
      }

      return count;
    },
  });

  // Use the adapter factory and immediately invoke it
  return createAdapterFactory({
    config: {
      adapterId: "memory",
      adapterName: "Memory Adapter",
      supportsJSON: true,
      supportsDates: true,
      supportsBooleans: true,
      supportsArrays: true,
      // Memory adapter transactions - just execute directly
      transaction: async <R>(callback: (adapter: DBAdapter) => Promise<R>) => {
        const adapter = createAdapterFactory({
          config: {
            adapterId: "memory",
            supportsJSON: true,
            supportsDates: true,
            supportsBooleans: true,
            supportsArrays: true,
          },
          adapter: (_helpers) => createCustomAdapter(),
        })({});
        return callback(adapter);
      },
    },
    adapter: (_helpers) => createCustomAdapter(),
  })({});
}
