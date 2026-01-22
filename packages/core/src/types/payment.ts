/**
 * Payment adapter interface for integrating with payment providers
 */
export interface PaymentAdapter {
  /**
   * Unique identifier for this payment provider
   */
  id: string;

  /**
   * Create a checkout session for a subscription
   */
  createCheckoutSession(params: {
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
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<CheckoutResult>;

  /**
   * Handle incoming webhook from payment provider
   */
  handleWebhook(request: Request): Promise<WebhookResult>;
}

/**
 * Result from creating a checkout session
 */
export interface CheckoutResult {
  /**
   * Checkout session ID from the provider
   */
  sessionId: string;
  /**
   * URL to redirect the user to for payment
   */
  url: string;
  /**
   * Provider customer ID (if customer was created)
   */
  providerCustomerId?: string;
}

/**
 * Result from processing a webhook
 */
export interface WebhookResult {
  /**
   * Type of webhook event
   */
  type:
    | "checkout.completed"
    | "subscription.updated"
    | "subscription.canceled"
    | "payment.failed"
    | "unknown";
  /**
   * Event data
   */
  data: {
    sessionId?: string;
    providerSubscriptionId?: string;
    providerCustomerId?: string;
    status?: string;
  };
}
