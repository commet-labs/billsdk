/**
 * @billsdk/time-travel
 *
 * Time travel plugin for BillSDK - test subscription cycles by simulating time.
 *
 * @example
 * ```typescript
 * import { billsdk } from "billsdk";
 * import { timeTravelPlugin } from "@billsdk/time-travel";
 *
 * const billing = billsdk({
 *   database: drizzleAdapter(db, { schema }),
 *   plugins: [
 *     timeTravelPlugin(), // Only in development!
 *   ],
 * });
 * ```
 *
 * Then in your React app:
 *
 * ```tsx
 * import { TimeTravelOverlay } from "@billsdk/time-travel/react";
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       {process.env.NODE_ENV === "development" && (
 *         <TimeTravelOverlay baseUrl="/api/billing" />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */

export { timeTravelPlugin } from "./plugin";
export { timeTravelSchema } from "./schema";
export {
  createTimeTravelProvider,
  getSimulatedTime,
  isTimeTravelActive,
  type TimeTravelState,
} from "./time-provider";
