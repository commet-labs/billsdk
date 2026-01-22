import type { BillingEndpoint } from "../../types/api";

/**
 * Health check endpoint
 */
export const healthEndpoint: Record<string, BillingEndpoint> = {
  health: {
    path: "/health",
    options: {
      method: "GET",
    },
    handler: async () => {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "0.1.0",
      };
    },
  },
};
