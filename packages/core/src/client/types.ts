import type { Customer, Plan, PlanPrice, Subscription } from "../types/models";

/**
 * Client configuration options
 */
export interface ClientConfig {
  /**
   * Base URL for the billing API
   * @default "/api/billing"
   */
  baseURL?: string;

  /**
   * Custom fetch function
   */
  fetch?: typeof fetch;

  /**
   * Custom headers to include in all requests
   */
  headers?: Record<string, string>;

  /**
   * Credentials mode for fetch requests
   * @default "include"
   */
  credentials?: "include" | "omit" | "same-origin";
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}

/**
 * Customer with subscription info
 */
export interface CustomerWithSubscription {
  customer: Customer;
  subscription: Subscription | null;
  plan: Plan | null;
  price: PlanPrice | null;
}

/**
 * Subscription response
 */
export interface SubscriptionResponse {
  subscription: Subscription | null;
  plan: Plan | null;
  price: PlanPrice | null;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: "ok";
  timestamp: string;
  version: string;
}

/**
 * Atom-like interface for reactive state
 */
export interface Atom<T> {
  get(): T;
  set(value: T): void;
  subscribe(callback: (value: T) => void): () => void;
}

/**
 * Async atom that tracks loading state
 */
export interface AsyncAtom<T> {
  get(): T | null;
  isLoading(): boolean;
  error(): Error | null;
  refresh(): Promise<void>;
  subscribe(callback: (value: T | null) => void): () => void;
}
