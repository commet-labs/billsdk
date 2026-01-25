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
   * Additional provider-specific data
   */
  providerData?: Record<string, unknown>;
}

/**
 * Payment adapter interface for integrating with payment providers
 *
 * The adapter decides the payment flow:
 * - Return "active" to activate immediately (e.g., free plans, no payment needed)
 * - Return "pending" to redirect user for payment (e.g., Stripe Checkout)
 * - Return "failed" if payment cannot be processed
 */
export interface PaymentAdapter {
  /**
   * Unique identifier for this payment provider
   */
  id: string;

  /**
   * Process payment for a subscription
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
   */
  confirmPayment?(request: Request): Promise<ConfirmResult>;
}
