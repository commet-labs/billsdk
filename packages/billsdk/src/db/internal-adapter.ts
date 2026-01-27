import type { DBAdapter } from "../types/adapter";
import type {
  BillingInterval,
  CreateCustomerInput,
  CreatePaymentInput,
  CreateSubscriptionInput,
  Customer,
  Feature,
  Payment,
  Plan,
  PlanPrice,
  Subscription,
} from "../types/models";
import type { FeatureConfig, PlanConfig } from "../types/options";
import { TABLES } from "./schema";

/**
 * Internal adapter that wraps DBAdapter with business logic
 * Plans and features come from config, only customer/subscription from DB
 */
export interface InternalAdapter {
  // Customer operations (DB)
  createCustomer(data: CreateCustomerInput): Promise<Customer>;
  findCustomerById(id: string): Promise<Customer | null>;
  findCustomerByExternalId(externalId: string): Promise<Customer | null>;
  updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | null>;
  deleteCustomer(id: string): Promise<void>;
  listCustomers(options?: {
    limit?: number;
    offset?: number;
  }): Promise<Customer[]>;

  // Plan operations (from config)
  findPlanByCode(code: string): Plan | null;
  listPlans(options?: { includePrivate?: boolean }): Plan[];
  getPlanPrice(planCode: string, interval: BillingInterval): PlanPrice | null;

  // Feature operations (from config)
  findFeatureByCode(code: string): Feature | null;
  listFeatures(): Feature[];
  getPlanFeatures(planCode: string): string[];

  // Subscription operations (DB)
  createSubscription(data: CreateSubscriptionInput): Promise<Subscription>;
  findSubscriptionById(id: string): Promise<Subscription | null>;
  findSubscriptionByCustomerId(
    customerId: string,
  ): Promise<Subscription | null>;
  findSubscriptionByProviderSessionId(
    sessionId: string,
  ): Promise<Subscription | null>;
  updateSubscription(
    id: string,
    data: Partial<Subscription>,
  ): Promise<Subscription | null>;
  cancelSubscription(id: string, cancelAt?: Date): Promise<Subscription | null>;
  listSubscriptions(customerId: string): Promise<Subscription[]>;

  // Feature access check
  checkFeatureAccess(
    customerId: string,
    featureCode: string,
  ): Promise<{ allowed: boolean }>;

  // Payment operations (DB)
  createPayment(data: CreatePaymentInput): Promise<Payment>;
  findPaymentById(id: string): Promise<Payment | null>;
  findPaymentByProviderPaymentId(
    providerPaymentId: string,
  ): Promise<Payment | null>;
  updatePayment(id: string, data: Partial<Payment>): Promise<Payment | null>;
  listPayments(
    customerId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<Payment[]>;
}

/**
 * Convert PlanConfig to Plan
 */
function planConfigToPlan(config: PlanConfig): Plan {
  return {
    code: config.code,
    name: config.name,
    description: config.description,
    isPublic: config.isPublic ?? true,
    prices: config.prices.map((p) => ({
      amount: p.amount,
      currency: p.currency ?? "usd",
      interval: p.interval,
      trialDays: p.trialDays,
    })),
    features: config.features ?? [],
  };
}

/**
 * Convert FeatureConfig to Feature
 */
function featureConfigToFeature(config: FeatureConfig): Feature {
  return {
    code: config.code,
    name: config.name,
    type: config.type ?? "boolean",
  };
}

/**
 * Create an internal adapter from a DBAdapter and config
 */
export function createInternalAdapter(
  adapter: DBAdapter,
  plans: PlanConfig[] = [],
  features: FeatureConfig[] = [],
): InternalAdapter {
  // Build lookup maps for fast access
  const plansByCode = new Map<string, Plan>();
  for (const config of plans) {
    plansByCode.set(config.code, planConfigToPlan(config));
  }

  const featuresByCode = new Map<string, Feature>();
  for (const config of features) {
    featuresByCode.set(config.code, featureConfigToFeature(config));
  }

  return {
    // Customer operations (DB)
    async createCustomer(data: CreateCustomerInput): Promise<Customer> {
      const now = new Date();
      return adapter.create<Customer>({
        model: TABLES.CUSTOMER,
        data: {
          ...data,
          createdAt: now,
          updatedAt: now,
        } as Omit<Customer, "id">,
      });
    },

    async findCustomerById(id: string): Promise<Customer | null> {
      return adapter.findOne<Customer>({
        model: TABLES.CUSTOMER,
        where: [{ field: "id", operator: "eq", value: id }],
      });
    },

    async findCustomerByExternalId(
      externalId: string,
    ): Promise<Customer | null> {
      return adapter.findOne<Customer>({
        model: TABLES.CUSTOMER,
        where: [{ field: "externalId", operator: "eq", value: externalId }],
      });
    },

    async updateCustomer(
      id: string,
      data: Partial<Customer>,
    ): Promise<Customer | null> {
      return adapter.update<Customer>({
        model: TABLES.CUSTOMER,
        where: [{ field: "id", operator: "eq", value: id }],
        update: { ...data, updatedAt: new Date() },
      });
    },

    async deleteCustomer(id: string): Promise<void> {
      await adapter.delete({
        model: TABLES.CUSTOMER,
        where: [{ field: "id", operator: "eq", value: id }],
      });
    },

    async listCustomers(options?: {
      limit?: number;
      offset?: number;
    }): Promise<Customer[]> {
      return adapter.findMany<Customer>({
        model: TABLES.CUSTOMER,
        limit: options?.limit,
        offset: options?.offset,
        sortBy: { field: "createdAt", direction: "desc" },
      });
    },

    // Plan operations (from config - synchronous)
    findPlanByCode(code: string): Plan | null {
      return plansByCode.get(code) ?? null;
    },

    listPlans(options?: { includePrivate?: boolean }): Plan[] {
      const allPlans = Array.from(plansByCode.values());
      if (options?.includePrivate) {
        return allPlans;
      }
      return allPlans.filter((p) => p.isPublic);
    },

    getPlanPrice(
      planCode: string,
      interval: BillingInterval,
    ): PlanPrice | null {
      const plan = plansByCode.get(planCode);
      if (!plan) return null;
      return (
        plan.prices.find((p) => p.interval === interval) ??
        plan.prices[0] ??
        null
      );
    },

    // Feature operations (from config - synchronous)
    findFeatureByCode(code: string): Feature | null {
      return featuresByCode.get(code) ?? null;
    },

    listFeatures(): Feature[] {
      return Array.from(featuresByCode.values());
    },

    getPlanFeatures(planCode: string): string[] {
      const plan = plansByCode.get(planCode);
      return plan?.features ?? [];
    },

    // Subscription operations (DB)
    async createSubscription(
      data: CreateSubscriptionInput,
    ): Promise<Subscription> {
      const now = new Date();
      const interval = data.interval ?? "monthly";
      const currentPeriodEnd = new Date(now);

      // Set period end based on interval
      if (interval === "yearly") {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      } else if (interval === "quarterly") {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3);
      } else {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      }

      let trialStart: Date | undefined;
      let trialEnd: Date | undefined;
      let status = data.status ?? "pending_payment";

      if (data.trialDays && data.trialDays > 0) {
        trialStart = now;
        trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + data.trialDays);
        status = "trialing";
      }

      return adapter.create<Subscription>({
        model: TABLES.SUBSCRIPTION,
        data: {
          customerId: data.customerId,
          planCode: data.planCode,
          interval,
          status,
          providerSubscriptionId: data.providerSubscriptionId,
          providerCheckoutSessionId: data.providerCheckoutSessionId,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd ?? currentPeriodEnd,
          trialStart,
          trialEnd,
          metadata: data.metadata,
          createdAt: now,
          updatedAt: now,
        } as Omit<Subscription, "id">,
      });
    },

    async findSubscriptionById(id: string): Promise<Subscription | null> {
      return adapter.findOne<Subscription>({
        model: TABLES.SUBSCRIPTION,
        where: [{ field: "id", operator: "eq", value: id }],
      });
    },

    async findSubscriptionByCustomerId(
      customerId: string,
    ): Promise<Subscription | null> {
      return adapter.findOne<Subscription>({
        model: TABLES.SUBSCRIPTION,
        where: [
          { field: "customerId", operator: "eq", value: customerId },
          {
            field: "status",
            operator: "in",
            value: ["active", "trialing", "past_due", "pending_payment"],
          },
        ],
      });
    },

    async findSubscriptionByProviderSessionId(
      sessionId: string,
    ): Promise<Subscription | null> {
      return adapter.findOne<Subscription>({
        model: TABLES.SUBSCRIPTION,
        where: [
          {
            field: "providerCheckoutSessionId",
            operator: "eq",
            value: sessionId,
          },
        ],
      });
    },

    async updateSubscription(
      id: string,
      data: Partial<Subscription>,
    ): Promise<Subscription | null> {
      return adapter.update<Subscription>({
        model: TABLES.SUBSCRIPTION,
        where: [{ field: "id", operator: "eq", value: id }],
        update: { ...data, updatedAt: new Date() },
      });
    },

    async cancelSubscription(
      id: string,
      cancelAt?: Date,
    ): Promise<Subscription | null> {
      const now = new Date();
      return adapter.update<Subscription>({
        model: TABLES.SUBSCRIPTION,
        where: [{ field: "id", operator: "eq", value: id }],
        update: {
          status: cancelAt ? "active" : "canceled",
          canceledAt: now,
          cancelAt: cancelAt ?? now,
          updatedAt: now,
        },
      });
    },

    async listSubscriptions(customerId: string): Promise<Subscription[]> {
      return adapter.findMany<Subscription>({
        model: TABLES.SUBSCRIPTION,
        where: [{ field: "customerId", operator: "eq", value: customerId }],
        sortBy: { field: "createdAt", direction: "desc" },
      });
    },

    // Feature access check
    async checkFeatureAccess(
      customerId: string,
      featureCode: string,
    ): Promise<{ allowed: boolean }> {
      // Find customer by external ID
      const customer = await adapter.findOne<Customer>({
        model: TABLES.CUSTOMER,
        where: [{ field: "externalId", operator: "eq", value: customerId }],
      });

      if (!customer) {
        return { allowed: false };
      }

      // Find active subscription
      const subscription = await adapter.findOne<Subscription>({
        model: TABLES.SUBSCRIPTION,
        where: [
          { field: "customerId", operator: "eq", value: customer.id },
          { field: "status", operator: "in", value: ["active", "trialing"] },
        ],
      });

      if (!subscription) {
        return { allowed: false };
      }

      // Check if plan has the feature (from config)
      const planFeatures = this.getPlanFeatures(subscription.planCode);
      return { allowed: planFeatures.includes(featureCode) };
    },

    // Payment operations (DB)
    async createPayment(data: CreatePaymentInput): Promise<Payment> {
      const now = new Date();
      return adapter.create<Payment>({
        model: TABLES.PAYMENT,
        data: {
          customerId: data.customerId,
          subscriptionId: data.subscriptionId,
          type: data.type,
          status: data.status ?? "pending",
          amount: data.amount,
          currency: data.currency ?? "usd",
          providerPaymentId: data.providerPaymentId,
          metadata: data.metadata,
          createdAt: now,
          updatedAt: now,
        } as Omit<Payment, "id">,
      });
    },

    async findPaymentById(id: string): Promise<Payment | null> {
      return adapter.findOne<Payment>({
        model: TABLES.PAYMENT,
        where: [{ field: "id", operator: "eq", value: id }],
      });
    },

    async findPaymentByProviderPaymentId(
      providerPaymentId: string,
    ): Promise<Payment | null> {
      return adapter.findOne<Payment>({
        model: TABLES.PAYMENT,
        where: [
          {
            field: "providerPaymentId",
            operator: "eq",
            value: providerPaymentId,
          },
        ],
      });
    },

    async updatePayment(
      id: string,
      data: Partial<Payment>,
    ): Promise<Payment | null> {
      return adapter.update<Payment>({
        model: TABLES.PAYMENT,
        where: [{ field: "id", operator: "eq", value: id }],
        update: { ...data, updatedAt: new Date() },
      });
    },

    async listPayments(
      customerId: string,
      options?: { limit?: number; offset?: number },
    ): Promise<Payment[]> {
      return adapter.findMany<Payment>({
        model: TABLES.PAYMENT,
        where: [{ field: "customerId", operator: "eq", value: customerId }],
        limit: options?.limit,
        offset: options?.offset,
        sortBy: { field: "createdAt", direction: "desc" },
      });
    },
  };
}
