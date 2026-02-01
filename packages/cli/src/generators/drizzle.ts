import type { DBFieldAttribute, DBSchema, DBTableSchema } from "@billsdk/core";
import * as prettier from "prettier";

export interface DrizzleGeneratorOptions {
  schema: DBSchema;
  provider: "pg" | "mysql" | "sqlite";
  output?: string;
}

/**
 * Convert camelCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
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
      return "integer";
    case "boolean":
      if (provider === "sqlite") return "integer";
      return "boolean";
    case "date":
      if (provider === "pg") return "timestamp";
      if (provider === "mysql") return "datetime";
      return "integer";
    case "json":
      if (provider === "pg") return "jsonb";
      if (provider === "mysql") return "json";
      return "text";
    case "string[]":
      if (provider === "pg") return "text";
      return "text";
    case "number[]":
      if (provider === "pg") return "integer";
      return "text";
    default:
      return "text";
  }
}

function getProviderImport(provider: "pg" | "mysql" | "sqlite"): {
  importPath: string;
  tableFunction: string;
} {
  switch (provider) {
    case "pg":
      return { importPath: "drizzle-orm/pg-core", tableFunction: "pgTable" };
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
 * Generate column definition
 */
function getColumnDefinition(
  fieldName: string,
  field: DBFieldAttribute,
  provider: "pg" | "mysql" | "sqlite",
  schema: DBSchema,
): string {
  const columnType = getColumnType(field, provider);
  const columnName = toSnakeCase(fieldName);
  const parts: string[] = [];

  // Column with name
  if (provider === "mysql" && columnType === "varchar") {
    parts.push(`${fieldName}: ${columnType}("${columnName}", { length: 255 })`);
  } else {
    parts.push(`${fieldName}: ${columnType}("${columnName}")`);
  }

  // Primary key
  if (field.primaryKey) {
    parts.push(".primaryKey()");
  }

  // Unique
  if (field.unique) {
    parts.push(".unique()");
  }

  // Foreign key reference (inline)
  if (field.references) {
    const refTable = field.references.model;
    const onDelete =
      field.references.onDelete === "cascade"
        ? ', { onDelete: "cascade" }'
        : "";
    parts.push(
      `.references(() => ${refTable}.${field.references.field}${onDelete})`,
    );
  }

  // Default value
  if (field.defaultValue !== undefined) {
    if (typeof field.defaultValue === "function") {
      const fnString = field.defaultValue.toString();
      if (fnString.includes("randomUUID") || fnString.includes("crypto")) {
        // For text IDs, use $defaultFn
        parts.push(".$defaultFn(() => crypto.randomUUID())");
      } else if (fnString.includes("new Date")) {
        parts.push(".defaultNow()");
      }
    } else if (typeof field.defaultValue === "string") {
      parts.push(`.default("${field.defaultValue}")`);
    } else if (typeof field.defaultValue === "number") {
      parts.push(`.default(${field.defaultValue})`);
    } else if (typeof field.defaultValue === "boolean") {
      parts.push(
        `.default(${provider === "sqlite" ? (field.defaultValue ? 1 : 0) : field.defaultValue})`,
      );
    }
  }

  // NotNull (after defaults, before references usually, but Drizzle is flexible)
  if (field.required !== false && !field.primaryKey) {
    parts.push(".notNull()");
  }

  return parts.join("");
}

/**
 * Generate table definition
 */
function generateTableDefinition(
  tableName: string,
  table: DBTableSchema,
  provider: "pg" | "mysql" | "sqlite",
  tableFunction: string,
  schema: DBSchema,
): string {
  const columns: string[] = [];

  for (const [fieldName, field] of Object.entries(table.fields)) {
    columns.push(getColumnDefinition(fieldName, field, provider, schema));
  }

  return `export const ${tableName} = ${tableFunction}("${tableName}", {
  ${columns.join(",\n  ")},
});`;
}

/**
 * Generate relations
 */
function generateRelations(schema: DBSchema): string[] {
  const result: string[] = [];

  for (const [tableName, table] of Object.entries(schema)) {
    const oneRels: string[] = [];
    const manyRels: string[] = [];

    // "one" relations (this table has FK to another)
    for (const [fieldName, field] of Object.entries(table.fields)) {
      if (field.references) {
        const refTable = field.references.model;
        oneRels.push(`${refTable}: one(${refTable}, {
    fields: [${tableName}.${fieldName}],
    references: [${refTable}.${field.references.field}],
  })`);
      }
    }

    // "many" relations (other tables have FK to this one)
    for (const [otherTable, otherSchema] of Object.entries(schema)) {
      if (otherTable === tableName) continue;
      for (const field of Object.values(otherSchema.fields)) {
        if (field.references?.model === tableName) {
          manyRels.push(`${otherTable}s: many(${otherTable})`);
        }
      }
    }

    const allRels = [...oneRels, ...manyRels];
    if (allRels.length > 0) {
      // Only include helpers that are actually used
      const helpers: string[] = [];
      if (oneRels.length > 0) helpers.push("one");
      if (manyRels.length > 0) helpers.push("many");

      result.push(`export const ${tableName}Relations = relations(${tableName}, ({ ${helpers.join(", ")} }) => ({
  ${allRels.join(",\n  ")},
}));`);
    }
  }

  return result;
}

/**
 * Collect column types for imports
 */
function collectColumnTypes(
  schema: DBSchema,
  provider: "pg" | "mysql" | "sqlite",
): Set<string> {
  const types = new Set<string>();
  for (const table of Object.values(schema)) {
    for (const field of Object.values(table.fields)) {
      types.add(getColumnType(field, provider));
    }
  }
  return types;
}

/**
 * Generate Drizzle schema
 */
export async function generateDrizzleSchema(
  options: DrizzleGeneratorOptions,
): Promise<{ code: string; fileName: string }> {
  const { schema, provider } = options;
  const { importPath, tableFunction } = getProviderImport(provider);
  const columnTypes = collectColumnTypes(schema, provider);

  // Imports
  const coreImports = [tableFunction, ...Array.from(columnTypes)].join(", ");
  const imports = [
    `import { ${coreImports} } from "${importPath}";`,
    `import { relations } from "drizzle-orm";`,
  ];

  // Tables
  const tables: string[] = [];
  for (const [tableName, table] of Object.entries(schema)) {
    tables.push(
      generateTableDefinition(
        tableName,
        table,
        provider,
        tableFunction,
        schema,
      ),
    );
  }

  // Relations
  const rels = generateRelations(schema);

  // Combine (clean, no section comments)
  const code = `${imports.join("\n")}

${tables.join("\n\n")}

${rels.join("\n\n")}
`;

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
