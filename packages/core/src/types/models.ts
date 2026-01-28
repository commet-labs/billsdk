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
   * Payment provider customer ID (e.g., Stripe customer ID)
   */
  providerCustomerId?: string;
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
 * Billing interval for prices
 */
export type BillingInterval = "monthly" | "quarterly" | "yearly";

/**
 * Plan - a pricing template (from config, not DB)
 */
export interface Plan {
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
   * Prices for different billing intervals
   */
  prices: PlanPrice[];
  /**
   * Feature codes enabled for this plan
   */
  features: string[];
}

/**
 * PlanPrice - a specific price for a plan (from config, not DB)
 */
export interface PlanPrice {
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
   * Trial period in days
   */
  trialDays?: number;
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
  | "incomplete"
  | "pending_payment";

/**
 * Subscription - customer-plan relationship (stored in DB)
 */
export interface Subscription {
  [key: string]: unknown;
  id: string;
  /**
   * Associated customer ID
   */
  customerId: string;
  /**
   * Plan code (references config, not DB)
   */
  planCode: string;
  /**
   * Billing interval for this subscription
   */
  interval: BillingInterval;
  /**
   * Current subscription status
   */
  status: SubscriptionStatus;
  /**
   * Payment provider subscription ID (e.g., Stripe subscription ID)
   */
  providerSubscriptionId?: string;
  /**
   * Payment provider checkout session ID
   */
  providerCheckoutSessionId?: string;
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
   * Scheduled plan change (takes effect at period end)
   */
  scheduledPlanCode?: string;
  /**
   * Scheduled interval change (takes effect at period end)
   */
  scheduledInterval?: BillingInterval;
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
 * Payment status
 */
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

/**
 * Payment type - what triggered this payment
 */
export type PaymentType = "subscription" | "renewal" | "upgrade" | "refund";

/**
 * Payment - a record of a charge or refund (stored in DB)
 */
export interface Payment {
  [key: string]: unknown;
  id: string;
  /**
   * Associated customer ID
   */
  customerId: string;
  /**
   * Associated subscription ID (if applicable)
   */
  subscriptionId?: string;
  /**
   * What triggered this payment
   */
  type: PaymentType;
  /**
   * Current payment status
   */
  status: PaymentStatus;
  /**
   * Amount in cents
   */
  amount: number;
  /**
   * Currency code (ISO 4217)
   */
  currency: string;
  /**
   * Payment provider payment ID (e.g., Stripe charge ID)
   */
  providerPaymentId?: string;
  /**
   * Amount that has been refunded (for partial refunds)
   */
  refundedAmount?: number;
  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
  /**
   * Timestamp when the payment was created
   */
  createdAt: Date;
  /**
   * Timestamp when the payment was last updated
   */
  updatedAt: Date;
}

/**
 * Feature - a capability that can be included in plans (from config)
 */
export interface Feature {
  /**
   * Unique code for the feature (e.g., "api_access", "export")
   */
  code: string;
  /**
   * Display name
   */
  name: string;
  /**
   * Feature type: boolean (on/off), metered (usage-based), seats (per-user)
   */
  type: "boolean" | "metered" | "seats";
}

/**
 * Input types for creating/updating models
 */
export interface CreateCustomerInput {
  externalId: string;
  email: string;
  name?: string;
  providerCustomerId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCustomerInput {
  email?: string;
  name?: string;
  providerCustomerId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSubscriptionInput {
  customerId: string;
  planCode: string;
  interval?: BillingInterval;
  status?: SubscriptionStatus;
  providerSubscriptionId?: string;
  providerCheckoutSessionId?: string;
  trialDays?: number;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentInput {
  customerId: string;
  subscriptionId?: string;
  type: PaymentType;
  status?: PaymentStatus;
  amount: number;
  currency?: string;
  providerPaymentId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePaymentInput {
  status?: PaymentStatus;
  providerPaymentId?: string;
  refundedAmount?: number;
  metadata?: Record<string, unknown>;
}

// Legacy types kept for backwards compatibility but not used
export interface PlanFeature {
  planCode: string;
  featureCode: string;
  enabled: boolean;
}
