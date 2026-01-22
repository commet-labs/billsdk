/**
 * Customer - represents a billable entity
 */
export interface Customer {
  [key: string]: unknown;
  id: string;
  /**
   * External ID from your application (e.g., user ID)
   */
  externalId: string;
  /**
   * Billing email address
   */
  email: string;
  /**
   * Customer display name
   */
  name?: string;
  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
  /**
   * Timestamp when the customer was created
   */
  createdAt: Date;
  /**
   * Timestamp when the customer was last updated
   */
  updatedAt: Date;
}

/**
 * Plan - a pricing template
 */
export interface Plan {
  [key: string]: unknown;
  id: string;
  /**
   * Unique code for the plan (e.g., "pro", "enterprise")
   */
  code: string;
  /**
   * Display name
   */
  name: string;
  /**
   * Plan description
   */
  description?: string;
  /**
   * Whether the plan is publicly visible
   */
  isPublic: boolean;
  /**
   * Timestamp when the plan was created
   */
  createdAt: Date;
  /**
   * Timestamp when the plan was last updated
   */
  updatedAt: Date;
}

/**
 * Billing interval for prices
 */
export type BillingInterval = "monthly" | "quarterly" | "yearly";

/**
 * PlanPrice - a specific price for a plan
 */
export interface PlanPrice {
  [key: string]: unknown;
  id: string;
  /**
   * Associated plan ID
   */
  planId: string;
  /**
   * Price amount in cents
   */
  amount: number;
  /**
   * Currency code (ISO 4217)
   */
  currency: string;
  /**
   * Billing interval
   */
  interval: BillingInterval;
  /**
   * Whether this is the default price for the plan
   */
  isDefault: boolean;
  /**
   * Trial period in days
   */
  trialDays?: number;
  /**
   * Timestamp when the price was created
   */
  createdAt: Date;
}

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "paused"
  | "incomplete";

/**
 * Subscription - customer-plan relationship
 */
export interface Subscription {
  [key: string]: unknown;
  id: string;
  /**
   * Associated customer ID
   */
  customerId: string;
  /**
   * Associated plan ID
   */
  planId: string;
  /**
   * Associated price ID
   */
  priceId: string;
  /**
   * Current subscription status
   */
  status: SubscriptionStatus;
  /**
   * Start of the current billing period
   */
  currentPeriodStart: Date;
  /**
   * End of the current billing period
   */
  currentPeriodEnd: Date;
  /**
   * When the subscription was canceled (if applicable)
   */
  canceledAt?: Date;
  /**
   * When the subscription ends after cancellation
   */
  cancelAt?: Date;
  /**
   * Trial start date (if applicable)
   */
  trialStart?: Date;
  /**
   * Trial end date (if applicable)
   */
  trialEnd?: Date;
  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
  /**
   * Timestamp when the subscription was created
   */
  createdAt: Date;
  /**
   * Timestamp when the subscription was last updated
   */
  updatedAt: Date;
}

/**
 * Input types for creating/updating models
 */
export interface CreateCustomerInput {
  externalId: string;
  email: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCustomerInput {
  email?: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePlanInput {
  code: string;
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface CreatePlanPriceInput {
  planId: string;
  amount: number;
  currency: string;
  interval: BillingInterval;
  isDefault?: boolean;
  trialDays?: number;
}

export interface CreateSubscriptionInput {
  customerId: string;
  planId: string;
  priceId: string;
  status?: SubscriptionStatus;
  trialDays?: number;
  metadata?: Record<string, unknown>;
}
