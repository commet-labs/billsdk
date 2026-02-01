export type Corner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export interface TimeTravelOverlayProps {
  /**
   * Base URL for the BillSDK API
   * @default "/api/billing"
   */
  baseUrl?: string;

  /**
   * Initial position of the overlay
   * @default "bottom-right"
   */
  defaultPosition?: Corner;

  /**
   * Initial collapsed state
   * @default true
   */
  defaultCollapsed?: boolean;

  /**
   * Customer ID to control time for
   * Required for per-customer time simulation
   */
  customerId?: string;
}

export interface TimeTravelState {
  customerId: string;
  simulatedTime: string | null;
  isSimulated: boolean;
  realTime: string;
}

export interface CustomerTimeState {
  customerId: string;
  simulatedTime: string | null;
}

export interface RenewalResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

export interface Point {
  x: number;
  y: number;
}
