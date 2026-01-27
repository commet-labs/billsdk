// Re-export from @billsdk/core for convenience
// Users can import from "billsdk" instead of "@billsdk/core/db"
export {
  type DBFieldAttribute,
  type DBFieldReference,
  type DBFieldType,
  type DBSchema,
  type DBTableSchema,
  defineField,
  defineTable,
} from "@billsdk/core/db";
