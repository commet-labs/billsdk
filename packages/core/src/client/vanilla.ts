import type { Customer, Plan } from "../types/models";
import { asyncAtom, atom } from "./atoms";
import { createFetch } from "./proxy";
import type {
  AsyncAtom,
  ClientConfig,
  HealthResponse,
  SubscriptionResponse,
} from "./types";

/**
 * Billing client interface
 */
export interface BillingClient {
  // Reactive atoms
  $customer: AsyncAtom<Customer | null>;
  $subscription: AsyncAtom<SubscriptionResponse | null>;
  $plans: AsyncAtom<Plan[]>;

  // API methods
  customer: {
    get(options: {
      query: { externalId: string };
    }): Promise<{ customer: Customer | null }>;
    create(options: {
      body: { externalId: string; email: string; name?: string };
    }): Promise<{ customer: Customer }>;
  };

  plans: {
    list(): Promise<{ plans: Plan[] }>;
  };

  plan: {
    get(options: {
      query: { id?: string; code?: string };
    }): Promise<{ plan: Plan | null; prices: unknown[] }>;
  };

  subscription: {
    get(options: {
      query: { customerId: string };
    }): Promise<SubscriptionResponse>;
  };

  health: {
    get(): Promise<HealthResponse>;
  };

  // Utility methods
  setCustomerId(customerId: string): void;
  refresh(): Promise<void>;
}

/**
 * Create a billing client
 *
 * @example
 * ```typescript
 * import { createBillingClient } from "@billsdk/core/client";
 *
 * const billing = createBillingClient({
 *   baseURL: "/api/billing",
 * });
 *
 * // Set current customer
 * billing.setCustomerId("user_123");
 *
 * // Reactive state
 * billing.$customer.subscribe((customer) => {
 *   console.log("Customer:", customer);
 * });
 *
 * // Direct API calls
 * const plans = await billing.plans.list();
 * ```
 */
export function createBillingClient(config: ClientConfig): BillingClient {
  const $fetch = createFetch(config);

  // Current customer ID atom
  const customerIdAtom = atom<string | null>(null);

  // Async atoms for reactive state
  const $customer = asyncAtom<Customer | null>(
    async () => {
      const customerId = customerIdAtom.get();
      if (!customerId) return null;

      const response = await $fetch<{ customer: Customer | null }>(
        "/customer",
        {
          method: "GET",
          query: { externalId: customerId },
        },
      );
      return response.customer;
    },
    { autoFetch: false },
  );

  const $subscription = asyncAtom<SubscriptionResponse | null>(
    async () => {
      const customerId = customerIdAtom.get();
      if (!customerId) return null;

      const response = await $fetch<SubscriptionResponse>("/subscription", {
        method: "GET",
        query: { customerId },
      });
      return response;
    },
    { autoFetch: false },
  );

  const $plans = asyncAtom<Plan[]>(
    async () => {
      const response = await $fetch<{ plans: Plan[] }>("/plans", {
        method: "GET",
      });
      return response.plans;
    },
    { autoFetch: true },
  );

  return {
    // Atoms
    $customer,
    $subscription,
    $plans,

    // API methods (typed wrapper around proxy)
    customer: {
      async get(options) {
        return $fetch("/customer", { method: "GET", query: options.query });
      },
      async create(options) {
        return $fetch("/customer", { method: "POST", body: options.body });
      },
    },

    plans: {
      async list() {
        return $fetch("/plans", { method: "GET" });
      },
    },

    plan: {
      async get(options) {
        return $fetch("/plan", { method: "GET", query: options.query });
      },
    },

    subscription: {
      async get(options) {
        return $fetch("/subscription", { method: "GET", query: options.query });
      },
    },

    health: {
      async get() {
        return $fetch("/health", { method: "GET" });
      },
    },

    // Utility methods
    setCustomerId(customerId: string) {
      customerIdAtom.set(customerId);
      // Refresh customer-dependent atoms
      $customer.refresh();
      $subscription.refresh();
    },

    async refresh() {
      await Promise.all([
        $customer.refresh(),
        $subscription.refresh(),
        $plans.refresh(),
      ]);
    },
  };
}

export default createBillingClient;
