import type { DBFieldAttribute, DBSchema, DBTableSchema } from "@billsdk/core";
import * as prettier from "prettier";

/**
 * Options for generating Drizzle schema
 */
export interface DrizzleGeneratorOptions {
  schema: DBSchema;
  provider: "pg" | "mysql" | "sqlite";
  output?: string;
}

/**
 * Map BillSDK field types to Drizzle column types
 */
function getColumnType(
  field: DBFieldAttribute,
  provider: "pg" | "mysql" | "sqlite",
): string {
  const { type } = field;

  switch (type) {
    case "string":
      if (provider === "pg") return "text";
      if (provider === "mysql") return "varchar";
      return "text";

    case "number":
      if (provider === "pg") return "integer";
      if (provider === "mysql") return "int";
      return "integer";

    case "boolean":
      if (provider === "sqlite") return "integer"; // SQLite uses 0/1
      return "boolean";

    case "date":
      if (provider === "pg") return "timestamp";
      if (provider === "mysql") return "datetime";
      return "integer"; // SQLite stores as unix timestamp

    case "json":
      if (provider === "pg") return "jsonb";
      if (provider === "mysql") return "json";
      return "text"; // SQLite stores as JSON string

    case "string[]":
      if (provider === "pg") return "text().array()";
      return "text"; // MySQL/SQLite store as JSON string

    case "number[]":
      if (provider === "pg") return "integer().array()";
      return "text"; // MySQL/SQLite store as JSON string

    default:
      return "text";
  }
}

/**
 * Get the Drizzle import prefix based on provider
 */
function getProviderImport(provider: "pg" | "mysql" | "sqlite"): {
  importPath: string;
  tableFunction: string;
} {
  switch (provider) {
    case "pg":
      return {
        importPath: "drizzle-orm/pg-core",
        tableFunction: "pgTable",
      };
    case "mysql":
      return {
        importPath: "drizzle-orm/mysql-core",
        tableFunction: "mysqlTable",
      };
    case "sqlite":
      return {
        importPath: "drizzle-orm/sqlite-core",
        tableFunction: "sqliteTable",
      };
  }
}

/**
 * Get the column definition for a field
 */
function getColumnDefinition(
  fieldName: string,
  field: DBFieldAttribute,
  provider: "pg" | "mysql" | "sqlite",
): string {
  const columnType = getColumnType(field, provider);
  const parts: string[] = [];

  // Column name and type
  // Handle array types which already include ()
  if (columnType.endsWith(".array()")) {
    const baseType = columnType.replace(".array()", "");
    parts.push(`${fieldName}: ${baseType}`);
  } else if (provider === "mysql" && columnType === "varchar") {
    // MySQL varchar needs length
    parts.push(`${fieldName}: ${columnType}({ length: 255 })`);
  } else {
    parts.push(`${fieldName}: ${columnType}()`);
  }

  // Add constraints
  const constraints: string[] = [];

  if (field.primaryKey) {
    constraints.push("primaryKey()");
  }

  if (field.required === false) {
    // Optional fields get notNull() removed (default is nullable in Drizzle)
  } else {
    // Required fields (default)
    constraints.push("notNull()");
  }

  if (field.unique) {
    constraints.push("unique()");
  }

  // Handle default values
  if (field.defaultValue !== undefined) {
    if (typeof field.defaultValue === "function") {
      // Dynamic defaults - use $defaultFn
      const fnString = field.defaultValue.toString();
      if (fnString.includes("randomUUID") || fnString.includes("crypto")) {
        constraints.push("$defaultFn(() => crypto.randomUUID())");
      } else if (fnString.includes("new Date")) {
        constraints.push("$defaultFn(() => new Date())");
      }
    } else if (typeof field.defaultValue === "string") {
      constraints.push(`default('${field.defaultValue}')`);
    } else if (typeof field.defaultValue === "number") {
      constraints.push(`default(${field.defaultValue})`);
    } else if (typeof field.defaultValue === "boolean") {
      if (provider === "sqlite") {
        constraints.push(`default(${field.defaultValue ? 1 : 0})`);
      } else {
        constraints.push(`default(${field.defaultValue})`);
      }
    }
  }

  // Combine column with constraints
  if (constraints.length > 0) {
    return `${parts[0]}.${constraints.join(".")}`;
  }

  // Handle array types - need to add .array() at the end
  if (columnType.endsWith(".array()")) {
    return `${parts[0]}.array()`;
  }

  return parts[0];
}

/**
 * Generate the table definition for a single table
 */
function generateTableDefinition(
  tableName: string,
  table: DBTableSchema,
  provider: "pg" | "mysql" | "sqlite",
  tableFunction: string,
): string {
  const columns: string[] = [];

  for (const [fieldName, field] of Object.entries(table.fields)) {
    columns.push(getColumnDefinition(fieldName, field, provider));
  }

  return `export const ${tableName} = ${tableFunction}("${tableName}", {
  ${columns.join(",\n  ")}
});`;
}

/**
 * Generate relation definitions
 */
function generateRelations(schema: DBSchema): string[] {
  const relations: string[] = [];

  for (const [tableName, table] of Object.entries(schema)) {
    const tableRelations: string[] = [];

    // Find foreign keys in this table
    for (const [fieldName, field] of Object.entries(table.fields)) {
      if (field.references) {
        const refTable = field.references.model;
        // This table has a "one" relation to the referenced table
        tableRelations.push(
          `${refTable}: one(${refTable}, {
    fields: [${tableName}.${fieldName}],
    references: [${refTable}.${field.references.field}],
  })`,
        );
      }
    }

    // Find tables that reference this table (many side)
    for (const [otherTable, otherSchema] of Object.entries(schema)) {
      if (otherTable === tableName) continue;

      for (const [, field] of Object.entries(otherSchema.fields)) {
        if (field.references?.model === tableName) {
          // This table has a "many" relation from otherTable
          tableRelations.push(`${otherTable}s: many(${otherTable})`);
        }
      }
    }

    if (tableRelations.length > 0) {
      relations.push(`export const ${tableName}Relations = relations(${tableName}, ({ one, many }) => ({
  ${tableRelations.join(",\n  ")}
}));`);
    }
  }

  return relations;
}

/**
 * Collect all column types used in the schema
 */
function collectColumnTypes(
  schema: DBSchema,
  provider: "pg" | "mysql" | "sqlite",
): Set<string> {
  const types = new Set<string>();

  for (const table of Object.values(schema)) {
    for (const field of Object.values(table.fields)) {
      const colType = getColumnType(field, provider);

      // Extract base type (remove array suffix)
      const baseType = colType.replace("().array()", "").replace("()", "");
      types.add(baseType);
    }
  }

  return types;
}

/**
 * Generate Drizzle schema code from BillSDK schema
 */
export async function generateDrizzleSchema(
  options: DrizzleGeneratorOptions,
): Promise<{ code: string; fileName: string }> {
  const { schema, provider } = options;
  const { importPath, tableFunction } = getProviderImport(provider);

  // Collect used column types
  const columnTypes = collectColumnTypes(schema, provider);

  // Build imports
  const imports: string[] = [];

  // Core type imports
  const coreImports = [tableFunction, ...Array.from(columnTypes)].join(", ");
  imports.push(`import { ${coreImports} } from "${importPath}";`);

  // Relations import
  imports.push(`import { relations } from "drizzle-orm";`);

  // Generate table definitions
  const tables: string[] = [];
  for (const [tableName, table] of Object.entries(schema)) {
    tables.push(
      generateTableDefinition(tableName, table, provider, tableFunction),
    );
  }

  // Generate relations
  const relations = generateRelations(schema);

  // Combine everything
  const code = `/**
 * BillSDK Database Schema
 * Generated by @billsdk/cli
 * 
 * DO NOT EDIT - This file is auto-generated.
 * Re-run "npx @billsdk/cli generate" to regenerate.
 */

${imports.join("\n")}

// =====================
// Tables
// =====================

${tables.join("\n\n")}

// =====================
// Relations
// =====================

${relations.join("\n\n")}

// =====================
// Type exports
// =====================

${Object.keys(schema)
  .map(
    (tableName) =>
      `export type ${capitalize(tableName)} = typeof ${tableName}.$inferSelect;
export type New${capitalize(tableName)} = typeof ${tableName}.$inferInsert;`,
  )
  .join("\n")}
`;

  // Format with prettier
  const formatted = await prettier.format(code, {
    parser: "typescript",
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "all",
  });

  return {
    code: formatted,
    fileName: options.output || "billing-schema.ts",
  };
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
