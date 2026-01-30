/**
 * Parameters for processing a payment
 */
export interface PaymentParams {
  customer: {
    id: string;
    email: string;
    providerCustomerId?: string;
  };
  plan: {
    code: string;
    name: string;
  };
  price: {
    amount: number;
    currency: string;
    interval: string;
  };
  subscription: {
    id: string;
  };
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

/**
 * Result from processing a payment
 * The adapter decides the flow based on the status returned
 */
export type PaymentResult =
  | PaymentResultActive
  | PaymentResultPending
  | PaymentResultFailed;

/**
 * Payment completed - subscription should be activated immediately
 */
export interface PaymentResultActive {
  status: "active";
  /**
   * Provider customer ID (if created during payment)
   */
  providerCustomerId?: string;
}

/**
 * Payment pending - user needs to complete payment flow
 */
export interface PaymentResultPending {
  status: "pending";
  /**
   * URL to redirect user for payment
   */
  redirectUrl: string;
  /**
   * Session ID for tracking this payment
   */
  sessionId: string;
  /**
   * Provider customer ID (if created)
   */
  providerCustomerId?: string;
}

/**
 * Payment failed
 */
export interface PaymentResultFailed {
  status: "failed";
  /**
   * Error message
   */
  error: string;
}

/**
 * Result from confirming a payment (webhook/callback)
 */
export interface ConfirmResult {
  /**
   * The subscription ID being confirmed
   */
  subscriptionId: string;
  /**
   * Final status after confirmation
   */
  status: "active" | "failed";
  /**
   * Provider subscription ID
   */
  providerSubscriptionId?: string;
  /**
   * Provider customer ID
   */
  providerCustomerId?: string;
  /**
   * Provider payment ID for tracking
   */
  providerPaymentId?: string;
  /**
   * Amount charged in cents
   */
  amount?: number;
  /**
   * Currency code (ISO 4217)
   */
  currency?: string;
  /**
   * Additional provider-specific data
   */
  providerData?: Record<string, unknown>;
}

/**
 * Parameters for charging a customer directly
 * Used for renewals, upgrades, and other charges (not checkout flow)
 */
export interface ChargeParams {
  /**
   * Customer information
   */
  customer: {
    id: string;
    email: string;
    /**
     * Provider customer ID - required for direct charges
     */
    providerCustomerId: string;
  };
  /**
   * Amount to charge in cents
   */
  amount: number;
  /**
   * Currency code (ISO 4217)
   */
  currency: string;
  /**
   * Description of the charge
   */
  description: string;
  /**
   * Additional metadata
   */
  metadata?: Record<string, string>;
}

/**
 * Result from charging a customer
 */
export interface ChargeResult {
  /**
   * Whether the charge succeeded
   */
  status: "success" | "failed";
  /**
   * Provider payment ID for tracking
   */
  providerPaymentId?: string;
  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * Parameters for refunding a payment
 */
export interface RefundParams {
  /**
   * Provider payment ID to refund
   */
  providerPaymentId: string;
  /**
   * Amount to refund in cents (partial refund if less than original)
   * If omitted, full refund is issued
   */
  amount?: number;
  /**
   * Reason for the refund
   */
  reason?: string;
}

/**
 * Result from refunding a payment
 */
export interface RefundResult {
  /**
   * Whether the refund succeeded
   */
  status: "refunded" | "failed";
  /**
   * Provider refund ID for tracking
   */
  providerRefundId?: string;
  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * Payment adapter interface for integrating with payment providers
 *
 * The adapter decides the payment flow:
 * - Return "active" to activate immediately (e.g., free plans, no payment needed)
 * - Return "pending" to redirect user for payment (e.g., Stripe Checkout)
 * - Return "failed" if payment cannot be processed
 *
 * Adapters are thin wrappers - they only move money.
 * BillSDK handles all billing logic (when to charge, how much, proration, etc.)
 */
export interface PaymentAdapter {
  /**
   * Unique identifier for this payment provider
   */
  id: string;

  /**
   * Process payment for a new subscription (checkout flow)
   *
   * The adapter decides the flow:
   * - Return { status: "active" } to activate immediately
   * - Return { status: "pending", redirectUrl, sessionId } for async payment
   * - Return { status: "failed", error } if payment failed
   */
  processPayment(params: PaymentParams): Promise<PaymentResult>;

  /**
   * Confirm an async payment (webhook/callback)
   *
   * Only needed if processPayment returns "pending"
   * Called when the payment provider notifies us of payment completion
   *
   * Return null for webhook events that don't need processing (e.g., customer.created)
   */
  confirmPayment?(request: Request): Promise<ConfirmResult | null>;

  /**
   * Charge a customer directly (for renewals, upgrades, etc.)
   *
   * Unlike processPayment, this charges immediately without a checkout flow.
   * Requires the customer to have a saved payment method (providerCustomerId).
   *
   * Optional - if not implemented, BillSDK will use processPayment instead.
   */
  charge?(params: ChargeParams): Promise<ChargeResult>;

  /**
   * Refund a previous payment
   *
   * Can be full or partial refund based on the amount parameter.
   *
   * Optional - if not implemented, refunds must be handled manually.
   */
  refund?(params: RefundParams): Promise<RefundResult>;
}
