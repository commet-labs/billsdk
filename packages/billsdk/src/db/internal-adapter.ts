import type { DBAdapter, Where } from "../types/adapter";
import type {
  CreateCustomerInput,
  CreatePlanInput,
  CreatePlanPriceInput,
  CreateSubscriptionInput,
  Customer,
  Plan,
  PlanPrice,
  Subscription,
} from "../types/models";
import { TABLES } from "./schema";

/**
 * Internal adapter that wraps DBAdapter with business logic
 * Provides typed methods for billing operations
 */
export interface InternalAdapter {
  // Customer operations
  createCustomer(data: CreateCustomerInput): Promise<Customer>;
  findCustomerById(id: string): Promise<Customer | null>;
  findCustomerByExternalId(externalId: string): Promise<Customer | null>;
  updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | null>;
  deleteCustomer(id: string): Promise<void>;
  listCustomers(options?: { limit?: number; offset?: number }): Promise<Customer[]>;

  // Plan operations
  createPlan(data: CreatePlanInput): Promise<Plan>;
  findPlanById(id: string): Promise<Plan | null>;
  findPlanByCode(code: string): Promise<Plan | null>;
  updatePlan(id: string, data: Partial<Plan>): Promise<Plan | null>;
  deletePlan(id: string): Promise<void>;
  listPlans(options?: { includePrivate?: boolean }): Promise<Plan[]>;

  // Plan Price operations
  createPlanPrice(data: CreatePlanPriceInput): Promise<PlanPrice>;
  findPlanPriceById(id: string): Promise<PlanPrice | null>;
  listPlanPrices(planId: string): Promise<PlanPrice[]>;
  deletePlanPrice(id: string): Promise<void>;

  // Subscription operations
  createSubscription(data: CreateSubscriptionInput): Promise<Subscription>;
  findSubscriptionById(id: string): Promise<Subscription | null>;
  findSubscriptionByCustomerId(customerId: string): Promise<Subscription | null>;
  updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription | null>;
  cancelSubscription(id: string, cancelAt?: Date): Promise<Subscription | null>;
  listSubscriptions(customerId: string): Promise<Subscription[]>;
}

/**
 * Create an internal adapter from a DBAdapter
 */
export function createInternalAdapter(adapter: DBAdapter): InternalAdapter {
  return {
    // Customer operations
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

    async findCustomerByExternalId(externalId: string): Promise<Customer | null> {
      return adapter.findOne<Customer>({
        model: TABLES.CUSTOMER,
        where: [{ field: "externalId", operator: "eq", value: externalId }],
      });
    },

    async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | null> {
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

    async listCustomers(options?: { limit?: number; offset?: number }): Promise<Customer[]> {
      return adapter.findMany<Customer>({
        model: TABLES.CUSTOMER,
        limit: options?.limit,
        offset: options?.offset,
        sortBy: { field: "createdAt", direction: "desc" },
      });
    },

    // Plan operations
    async createPlan(data: CreatePlanInput): Promise<Plan> {
      const now = new Date();
      return adapter.create<Plan>({
        model: TABLES.PLAN,
        data: {
          ...data,
          isPublic: data.isPublic ?? true,
          createdAt: now,
          updatedAt: now,
        } as Omit<Plan, "id">,
      });
    },

    async findPlanById(id: string): Promise<Plan | null> {
      return adapter.findOne<Plan>({
        model: TABLES.PLAN,
        where: [{ field: "id", operator: "eq", value: id }],
      });
    },

    async findPlanByCode(code: string): Promise<Plan | null> {
      return adapter.findOne<Plan>({
        model: TABLES.PLAN,
        where: [{ field: "code", operator: "eq", value: code }],
      });
    },

    async updatePlan(id: string, data: Partial<Plan>): Promise<Plan | null> {
      return adapter.update<Plan>({
        model: TABLES.PLAN,
        where: [{ field: "id", operator: "eq", value: id }],
        update: { ...data, updatedAt: new Date() },
      });
    },

    async deletePlan(id: string): Promise<void> {
      await adapter.delete({
        model: TABLES.PLAN,
        where: [{ field: "id", operator: "eq", value: id }],
      });
    },

    async listPlans(options?: { includePrivate?: boolean }): Promise<Plan[]> {
      const where: Where[] = options?.includePrivate
        ? []
        : [{ field: "isPublic", operator: "eq", value: true }];

      return adapter.findMany<Plan>({
        model: TABLES.PLAN,
        where: where.length > 0 ? where : undefined,
        sortBy: { field: "createdAt", direction: "desc" },
      });
    },

    // Plan Price operations
    async createPlanPrice(data: CreatePlanPriceInput): Promise<PlanPrice> {
      return adapter.create<PlanPrice>({
        model: TABLES.PLAN_PRICE,
        data: {
          ...data,
          isDefault: data.isDefault ?? false,
          createdAt: new Date(),
        } as Omit<PlanPrice, "id">,
      });
    },

    async findPlanPriceById(id: string): Promise<PlanPrice | null> {
      return adapter.findOne<PlanPrice>({
        model: TABLES.PLAN_PRICE,
        where: [{ field: "id", operator: "eq", value: id }],
      });
    },

    async listPlanPrices(planId: string): Promise<PlanPrice[]> {
      return adapter.findMany<PlanPrice>({
        model: TABLES.PLAN_PRICE,
        where: [{ field: "planId", operator: "eq", value: planId }],
      });
    },

    async deletePlanPrice(id: string): Promise<void> {
      await adapter.delete({
        model: TABLES.PLAN_PRICE,
        where: [{ field: "id", operator: "eq", value: id }],
      });
    },

    // Subscription operations
    async createSubscription(data: CreateSubscriptionInput): Promise<Subscription> {
      const now = new Date();
      const currentPeriodEnd = new Date(now);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // Default to monthly

      let trialStart: Date | undefined;
      let trialEnd: Date | undefined;
      let status = data.status ?? "active";

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
          planId: data.planId,
          priceId: data.priceId,
          status,
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

    async findSubscriptionByCustomerId(customerId: string): Promise<Subscription | null> {
      return adapter.findOne<Subscription>({
        model: TABLES.SUBSCRIPTION,
        where: [
          { field: "customerId", operator: "eq", value: customerId },
          { field: "status", operator: "in", value: ["active", "trialing", "past_due"] },
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

    async cancelSubscription(id: string, cancelAt?: Date): Promise<Subscription | null> {
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
  };
}
