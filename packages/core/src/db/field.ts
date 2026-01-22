/**
 * Supported field types for the schema
 */
export type DBFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "json"
  | "string[]"
  | "number[]";

/**
 * Reference configuration for foreign keys
 */
export interface DBFieldReference {
  model: string;
  field: string;
  onDelete?: "cascade" | "restrict" | "set-null";
}

/**
 * Field attribute definition for schema
 */
export interface DBFieldAttribute {
  /**
   * Data type of the field
   */
  type: DBFieldType;

  /**
   * Custom field name in the database (defaults to key)
   */
  fieldName?: string;

  /**
   * Whether the field is required
   * @default true
   */
  required?: boolean;

  /**
   * Whether the field has a unique constraint
   */
  unique?: boolean;

  /**
   * Whether to create an index on this field
   */
  index?: boolean;

  /**
   * Whether this is a primary key
   */
  primaryKey?: boolean;

  /**
   * Foreign key reference
   */
  references?: DBFieldReference;

  /**
   * Default value or function to generate it
   */
  defaultValue?: unknown | (() => unknown);

  /**
   * Whether this field can be set via input
   * @default true
   */
  input?: boolean;

  /**
   * Whether this field is returned in responses
   * @default true
   */
  returned?: boolean;
}

/**
 * Table schema definition
 */
export interface DBTableSchema {
  fields: Record<string, DBFieldAttribute>;
}

/**
 * Full database schema
 */
export type DBSchema = Record<string, DBTableSchema>;

/**
 * Helper to define a field
 */
export function defineField(attribute: DBFieldAttribute): DBFieldAttribute {
  return {
    required: true,
    input: true,
    returned: true,
    ...attribute,
  };
}

/**
 * Helper to define a table
 */
export function defineTable(
  fields: Record<string, DBFieldAttribute>,
): DBTableSchema {
  return { fields };
}
