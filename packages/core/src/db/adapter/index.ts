/**
 * @billsdk/core/db/adapter
 *
 * Adapter factory for creating database adapters.
 * Use this module to create adapters that work with BillSDK.
 *
 * @example
 * ```typescript
 * import { createAdapterFactory } from "@billsdk/core/db/adapter";
 *
 * export const myAdapter = (db, config) => createAdapterFactory({
 *   config: {
 *     adapterId: "my-adapter",
 *     supportsJSON: true,
 *   },
 *   adapter: (helpers) => ({
 *     create: async ({ model, data }) => { ... },
 *     findOne: async ({ model, where }) => { ... },
 *     // ...
 *   }),
 * });
 * ```
 */

export { createAdapterFactory } from "./factory";
export type {
  AdapterFactory,
  AdapterFactoryConfig,
  AdapterFactoryOptions,
  AdapterHelpers,
  CleanedWhere,
  CustomAdapter,
} from "./types";
