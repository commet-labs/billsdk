"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useClickOutside, useDrag } from "./hooks";
import { BillSDKLogo, ChevronIcon, CloseIcon } from "./icons";
import { OVERLAY_STYLES } from "./styles";
import type {
  Corner,
  CustomerTimeState,
  RenewalResult,
  TimeTravelOverlayProps,
  TimeTravelState,
} from "./types";

export type { Corner, TimeTravelOverlayProps } from "./types";

const STORAGE_KEY = "billsdk-time-travel-position";

/**
 * Time Travel Overlay Component
 *
 * A floating UI component that allows you to control simulated time
 * for testing billing cycles, trials, and renewals.
 *
 * @example
 * ```tsx
 * import { TimeTravelOverlay } from "@billsdk/time-travel/react";
 *
 * function App() {
 *   const { user } = useAuth();
 *   return (
 *     <>
 *       <YourApp />
 *       {process.env.NODE_ENV === "development" && user?.customerId && (
 *         <TimeTravelOverlay
 *           baseUrl="/api/billing"
 *           customerId={user.customerId}
 *         />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function TimeTravelOverlay({
  baseUrl = "/api/billing",
  defaultPosition = "bottom-right",
  defaultCollapsed = true,
  customerId,
}: TimeTravelOverlayProps) {
  // Load position from localStorage
  const [position, setPosition] = useState<Corner>(() => {
    if (typeof window === "undefined") return defaultPosition;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (
        saved &&
        ["bottom-right", "bottom-left", "top-right", "top-left"].includes(saved)
      ) {
        return saved as Corner;
      }
    } catch {}
    return defaultPosition;
  });

  const [state, setState] = useState<TimeTravelState | null>(null);
  const [allCustomers, setAllCustomers] = useState<CustomerTimeState[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingRenewals, setIsProcessingRenewals] = useState(false);
  const [renewalResult, setRenewalResult] = useState<RenewalResult | null>(
    null,
  );
  const [dateInput, setDateInput] = useState("");
  const [customerIdInput, setCustomerIdInput] = useState(customerId ?? "");
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const activeCustomerId = customerId ?? customerIdInput;

  // Handle position change and persist to localStorage
  const handlePositionChange = useCallback((newPosition: Corner) => {
    setPosition(newPosition);
    try {
      localStorage.setItem(STORAGE_KEY, newPosition);
    } catch {}
  }, []);

  // Draggable badge
  const { ref: dragRef, isDragging } = useDrag({
    position,
    onPositionChange: handlePositionChange,
    disabled: !isCollapsed,
  });

  // Close panel on click outside
  useClickOutside(
    panelRef,
    () => {
      setIsCollapsed(true);
      setPanelVisible(false);
    },
    !isCollapsed,
  );

  // Animate panel visibility
  useLayoutEffect(() => {
    if (!isCollapsed) {
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        setPanelVisible(true);
      });
    } else {
      setPanelVisible(false);
    }
  }, [isCollapsed]);

  // Fetch current state for the active customer
  const fetchState = useCallback(async () => {
    if (!activeCustomerId) {
      setState(null);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/time-travel/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: activeCustomerId }),
      });
      if (res.ok) {
        const data = (await res.json()) as TimeTravelState;
        setState(data);
        if (data.simulatedTime) {
          const datePart = data.simulatedTime.split("T")[0];
          if (datePart) {
            setDateInput(datePart);
          }
        }
      }
    } catch (error) {
      console.error("[TimeTravelOverlay] Failed to fetch state:", error);
    }
  }, [baseUrl, activeCustomerId]);

  // Fetch all customers with simulated time
  const fetchAllCustomers = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/time-travel/list`);
      if (res.ok) {
        const data = (await res.json()) as { customers: CustomerTimeState[] };
        setAllCustomers(data.customers);
      }
    } catch (error) {
      console.error("[TimeTravelOverlay] Failed to fetch customers:", error);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchState();
    fetchAllCustomers();
  }, [fetchState, fetchAllCustomers]);

  // Advance time
  const advance = async (days: number, months = 0) => {
    if (!activeCustomerId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/time-travel/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: activeCustomerId,
          days,
          months,
        }),
      });
      if (res.ok) {
        await Promise.all([fetchState(), fetchAllCustomers()]);
      }
    } catch (error) {
      console.error("[TimeTravelOverlay] Failed to advance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set specific time
  const setTime = async (date: string | null) => {
    if (!activeCustomerId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/time-travel/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: activeCustomerId, date }),
      });
      if (res.ok) {
        await Promise.all([fetchState(), fetchAllCustomers()]);
      }
    } catch (error) {
      console.error("[TimeTravelOverlay] Failed to set time:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to real time
  const reset = async () => {
    if (!activeCustomerId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/time-travel/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: activeCustomerId }),
      });
      if (res.ok) {
        setDateInput("");
        await Promise.all([fetchState(), fetchAllCustomers()]);
      }
    } catch (error) {
      console.error("[TimeTravelOverlay] Failed to reset:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date input submission
  const handleDateSubmit = () => {
    if (dateInput) {
      const date = new Date(dateInput);
      date.setUTCHours(12, 0, 0, 0);
      setTime(date.toISOString());
    }
  };

  // Process renewals for the current customer
  const processRenewals = async (dryRun = false) => {
    if (!activeCustomerId) return;

    setIsProcessingRenewals(true);
    setRenewalResult(null);
    try {
      const params = new URLSearchParams({
        customerId: activeCustomerId,
        ...(dryRun && { dryRun: "true" }),
      });
      const res = await fetch(`${baseUrl}/renewals?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as RenewalResult;
        setRenewalResult(data);
      }
    } catch (error) {
      console.error("[TimeTravelOverlay] Failed to process renewals:", error);
    } finally {
      setIsProcessingRenewals(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatShortDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateId = (id: string) => {
    if (id.length <= 10) return id;
    return `${id.slice(0, 5)}…${id.slice(-4)}`;
  };

  // Position styles
  const [vertical, horizontal] = position.split("-") as [string, string];
  const positionStyles: Record<string, string> = {
    [vertical]: "var(--tt-padding)",
    [horizontal]: "var(--tt-padding)",
  };

  // Panel transform origin based on position
  const panelOrigin = position.replace("-", " ");

  return (
    <div
      data-tt-root
      style={{
        position: "fixed",
        ...positionStyles,
        zIndex: 2147483646,
      }}
    >
      <style>{OVERLAY_STYLES}</style>

      {isCollapsed ? (
        /* Collapsed Badge */
        <div ref={dragRef}>
          <button
            type="button"
            data-tt-badge
            data-simulated={state?.isSimulated ?? false}
            onClick={() => {
              // Only open if not dragging
              if (!isDragging) {
                setIsCollapsed(false);
              }
            }}
            aria-label="Open Time Travel panel"
          >
            <span data-tt-badge-icon>
              <BillSDKLogo />
            </span>
            <span>
              {state?.isSimulated && state.simulatedTime
                ? formatShortDate(state.simulatedTime)
                : "Real Time"}
            </span>
            {allCustomers.length > 0 && (
              <span data-tt-badge-count>{allCustomers.length}</span>
            )}
          </button>
        </div>
      ) : (
        /* Expanded Panel */
        <div
          ref={panelRef}
          data-tt-panel
          data-visible={panelVisible}
          style={{ "--tt-panel-origin": panelOrigin } as React.CSSProperties}
        >
          {/* Header */}
          <div
            data-tt-panel-header
            data-simulated={state?.isSimulated ?? false}
          >
            <div data-tt-panel-title>
              <BillSDKLogo />
              <span>Time Travel</span>
            </div>
            <button
              type="button"
              data-tt-panel-close
              onClick={() => setIsCollapsed(true)}
              aria-label="Close panel"
            >
              <CloseIcon />
            </button>
          </div>

          <div data-tt-panel-content>
            {/* Customer ID Input (only if not provided via prop) */}
            {!customerId && (
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="tt-customer-id" data-tt-label>
                  Customer ID
                </label>
                <input
                  id="tt-customer-id"
                  type="text"
                  data-tt-input
                  value={customerIdInput}
                  onChange={(e) => setCustomerIdInput(e.target.value)}
                  onBlur={fetchState}
                  onKeyDown={(e) => e.key === "Enter" && fetchState()}
                  placeholder="Enter customer ID…"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Customer indicator (when provided via prop) */}
            {customerId && (
              <div data-tt-customer>
                Customer: <strong>{truncateId(customerId)}</strong>
              </div>
            )}

            {activeCustomerId ? (
              <>
                {/* Current Time Display */}
                <div data-tt-time-display>
                  <div data-tt-time-label>
                    {state?.isSimulated ? "Simulated Time" : "Current Time"}
                  </div>
                  <div data-tt-time-value>
                    {state?.simulatedTime
                      ? formatDate(state.simulatedTime)
                      : state?.realTime
                        ? formatDate(state.realTime)
                        : "Loading…"}
                  </div>
                  <div data-tt-time-sub>
                    {state?.simulatedTime
                      ? formatTime(state.simulatedTime)
                      : state?.realTime
                        ? formatTime(state.realTime)
                        : ""}
                  </div>
                </div>

                {/* Quick Actions */}
                <div data-tt-label>Quick Advance</div>
                <div data-tt-actions>
                  <button
                    type="button"
                    data-tt-action
                    onClick={() => advance(1, 0)}
                    disabled={isLoading}
                  >
                    +1 day
                  </button>
                  <button
                    type="button"
                    data-tt-action
                    onClick={() => advance(7, 0)}
                    disabled={isLoading}
                  >
                    +1 week
                  </button>
                  <button
                    type="button"
                    data-tt-action
                    onClick={() => advance(0, 1)}
                    disabled={isLoading}
                  >
                    +1 month
                  </button>
                </div>

                {/* Date Picker */}
                <label htmlFor="tt-date-input" data-tt-label>
                  Go to Date
                </label>
                <input
                  id="tt-date-input"
                  type="date"
                  data-tt-input
                  style={{ width: "100%", marginBottom: 6 }}
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDateSubmit()}
                />
                <div data-tt-actions style={{ marginBottom: 12 }}>
                  <button
                    type="button"
                    data-tt-btn-primary
                    onClick={handleDateSubmit}
                    disabled={isLoading || !dateInput}
                  >
                    Go
                  </button>
                  <button
                    type="button"
                    data-tt-btn-reset
                    onClick={reset}
                    disabled={isLoading || !state?.isSimulated}
                  >
                    Reset
                  </button>
                </div>

                {/* Billing Actions */}
                <div data-tt-label>Billing</div>
                <button
                  type="button"
                  data-tt-btn-primary
                  style={{ width: "100%", marginBottom: 12 }}
                  onClick={() => processRenewals(false)}
                  disabled={isProcessingRenewals}
                >
                  {isProcessingRenewals ? "Processing…" : "Process Renewals"}
                </button>

                {/* Renewal Result */}
                {renewalResult && (
                  <div
                    data-tt-result
                    data-has-errors={renewalResult.failed > 0}
                  >
                    <div data-tt-result-grid>
                      <div data-tt-result-item>
                        Processed:{" "}
                        <span data-tt-result-value>
                          {renewalResult.processed}
                        </span>
                      </div>
                      <div data-tt-result-item>
                        Succeeded:{" "}
                        <span data-tt-result-value data-success>
                          {renewalResult.succeeded}
                        </span>
                      </div>
                      <div data-tt-result-item>
                        Failed:{" "}
                        <span data-tt-result-value data-danger>
                          {renewalResult.failed}
                        </span>
                      </div>
                      <div data-tt-result-item>
                        Skipped:{" "}
                        <span data-tt-result-value>
                          {renewalResult.skipped}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div data-tt-empty>Enter a customer ID to control time</div>
            )}

            {/* All Customers Toggle */}
            {allCustomers.length > 0 && (
              <div>
                <button
                  type="button"
                  data-tt-customers-toggle
                  onClick={() => setShowAllCustomers(!showAllCustomers)}
                >
                  <span>
                    {allCustomers.length} customer(s) with simulated time
                  </span>
                  <ChevronIcon open={showAllCustomers} />
                </button>

                {showAllCustomers && (
                  <div data-tt-customers-list>
                    {allCustomers.map((c) => (
                      <div
                        key={c.customerId}
                        data-tt-customer-item
                        data-active={c.customerId === activeCustomerId}
                      >
                        <span data-tt-customer-id>
                          {truncateId(c.customerId)}
                        </span>
                        <span data-tt-customer-date>
                          {c.simulatedTime
                            ? formatShortDate(c.simulatedTime)
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Warning */}
          <div data-tt-footer>Development only — Do not use in production</div>
        </div>
      )}
    </div>
  );
}
