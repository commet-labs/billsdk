import type { Customer, Plan } from "../../types/models";
import { asyncAtom, atom } from "../atoms";
import { createFetch } from "../proxy";
import type {
  AsyncAtom,
  CancelSubscriptionInput,
  CancelSubscriptionResponse,
  ClientConfig,
  CreateSubscriptionInput,
  CreateSubscriptionResponse,
  HealthResponse,
  SubscriptionResponse,
} from "../types";
import { useAsyncStore } from "./react-store";

/**
 * React billing client interface
 */
export interface BillingClientReact {
  // React hooks (auto-subscribing)
  useCustomer: () => {
    data: Customer | null;
    isLoading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
  };
  useSubscription: () => {
    data: SubscriptionResponse | null;
    isLoading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
  };
  usePlans: () => {
    data: Plan[];
    isLoading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
  };

  // Raw atoms (for advanced usage)
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
    create(options: {
      body: CreateSubscriptionInput;
    }): Promise<CreateSubscriptionResponse>;
    cancel(options: {
      body: CancelSubscriptionInput;
    }): Promise<CancelSubscriptionResponse>;
  };

  health: {
    get(): Promise<HealthResponse>;
  };

  // Utility methods
  setCustomerId(customerId: string): void;
  refresh(): Promise<void>;
}

/**
 * Create a React billing client
 *
 * @example
 * ```typescript
 * import { createBillingClient } from "@billsdk/core/react";
 *
 * // Uses default baseURL: "/api/billing"
 * export const billing = createBillingClient();
 *
 * // In a component
 * function Dashboard() {
 *   const { data: subscription, isLoading } = billing.useSubscription();
 *
 *   if (isLoading) return <Loading />;
 *   return <div>Plan: {subscription?.plan?.name}</div>;
 * }
 * ```
 */
export function createBillingClient(
  config: ClientConfig = {},
): BillingClientReact {
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
    // React hooks
    useCustomer: () => useAsyncStore($customer),
    useSubscription: () => useAsyncStore($subscription),
    usePlans: () =>
      useAsyncStore($plans) as {
        data: Plan[];
        isLoading: boolean;
        error: Error | null;
        refresh: () => Promise<void>;
      },

    // Raw atoms
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
      async create(options) {
        return $fetch("/subscription", { method: "POST", body: options.body });
      },
      async cancel(options) {
        return $fetch("/subscription/cancel", {
          method: "POST",
          body: options.body,
        });
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

// Re-export types
export type * from "../types";
// Re-export store hooks for advanced usage
export { useAsyncStore, useStore } from "./react-store";
