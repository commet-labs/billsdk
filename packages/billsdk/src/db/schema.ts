// Re-export from @billsdk/core for convenience
// Users can import from "billsdk" instead of "@billsdk/core/db"
export {
  billingSchema,
  type DBSchema,
  getBillingSchema,
  TABLES,
  type TableName,
} from "@billsdk/core/db";
