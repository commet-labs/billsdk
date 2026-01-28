"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";

export interface TimeTravelOverlayProps {
  /**
   * Base URL for the BillSDK API
   * @default "/api/billing"
   */
  baseUrl?: string;

  /**
   * Position of the overlay
   * @default "bottom-right"
   */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";

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

interface TimeTravelState {
  customerId: string;
  simulatedTime: string | null;
  isSimulated: boolean;
  realTime: string;
}

interface CustomerTimeState {
  customerId: string;
  simulatedTime: string | null;
}

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
  position = "bottom-right",
  defaultCollapsed = true,
  customerId,
}: TimeTravelOverlayProps) {
  const [state, setState] = useState<TimeTravelState | null>(null);
  const [allCustomers, setAllCustomers] = useState<CustomerTimeState[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isLoading, setIsLoading] = useState(false);
  const [dateInput, setDateInput] = useState("");
  const [customerIdInput, setCustomerIdInput] = useState(customerId ?? "");
  const [showAllCustomers, setShowAllCustomers] = useState(false);

  const activeCustomerId = customerId ?? customerIdInput;

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
  const advance = async (days: number, months = 0, hours = 0) => {
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
          hours,
        }),
      });
      if (res.ok) {
        await fetchState();
        await fetchAllCustomers();
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
        await fetchState();
        await fetchAllCustomers();
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
        await fetchState();
        await fetchAllCustomers();
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

  // Position styles
  const positionStyles: Record<string, CSSProperties> = {
    "bottom-right": { bottom: 16, right: 16 },
    "bottom-left": { bottom: 16, left: 16 },
    "top-right": { top: 16, right: 16 },
    "top-left": { top: 16, left: 16 },
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
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
    if (id.length <= 12) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        ...positionStyles[position],
        zIndex: 99999,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 14,
      }}
    >
      {/* Collapsed Badge */}
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            backgroundColor: state?.isSimulated ? "#fef3c7" : "#f3f4f6",
            color: state?.isSimulated ? "#92400e" : "#374151",
            fontWeight: 500,
            transition: "all 0.2s",
          }}
        >
          <span style={{ fontSize: 16 }}>
            {state?.isSimulated ? "⏰" : "🕐"}
          </span>
          <span>
            {state?.isSimulated && state.simulatedTime
              ? formatDate(state.simulatedTime)
              : "Real Time"}
          </span>
          {allCustomers.length > 0 && (
            <span
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                borderRadius: 9999,
                padding: "2px 6px",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {allCustomers.length}
            </span>
          )}
        </button>
      ) : (
        /* Expanded Panel */
        <div
          style={{
            width: 320,
            backgroundColor: "white",
            borderRadius: 12,
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              backgroundColor: state?.isSimulated ? "#fef3c7" : "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>
                {state?.isSimulated ? "⏰" : "🕐"}
              </span>
              <span style={{ fontWeight: 600, color: "#111827" }}>
                Time Travel
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              style={{
                padding: 4,
                borderRadius: 4,
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                color: "#6b7280",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: 16 }}>
            {/* Customer ID Input (only if not provided via prop) */}
            {!customerId && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Customer ID
                </div>
                <input
                  type="text"
                  value={customerIdInput}
                  onChange={(e) => setCustomerIdInput(e.target.value)}
                  onBlur={fetchState}
                  placeholder="Enter customer ID…"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                    color: "#374151",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            {/* Customer indicator (when provided via prop) */}
            {customerId && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "8px 12px",
                  backgroundColor: "#eff6ff",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#1e40af",
                }}
              >
                Customer: <strong>{truncateId(customerId)}</strong>
              </div>
            )}

            {activeCustomerId ? (
              <>
                {/* Current Time Display */}
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    backgroundColor: "#f9fafb",
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {state?.isSimulated ? "Simulated Time" : "Current Time"}
                  </div>
                  <div
                    style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}
                  >
                    {state?.simulatedTime
                      ? formatDate(state.simulatedTime)
                      : state?.realTime
                        ? formatDate(state.realTime)
                        : "Loading..."}
                  </div>
                  <div style={{ fontSize: 14, color: "#6b7280" }}>
                    {state?.simulatedTime
                      ? formatTime(state.simulatedTime)
                      : state?.realTime
                        ? formatTime(state.realTime)
                        : ""}
                  </div>
                </div>

                {/* Quick Actions */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 8,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Quick Advance
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 8,
                    }}
                  >
                    {[
                      { label: "+1 day", days: 1 },
                      { label: "+1 week", days: 7 },
                      { label: "+1 month", months: 1 },
                    ].map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() =>
                          advance(action.days ?? 0, action.months ?? 0)
                        }
                        disabled={isLoading}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          backgroundColor: "white",
                          cursor: isLoading ? "not-allowed" : "pointer",
                          color: "#374151",
                          fontSize: 13,
                          fontWeight: 500,
                          transition: "all 0.15s",
                          opacity: isLoading ? 0.5 : 1,
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Picker */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 8,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Go to Date
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => {
                        const target = e.target as HTMLInputElement;
                        setDateInput(target.value);
                      }}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                        fontSize: 14,
                        color: "#374151",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleDateSubmit}
                      disabled={isLoading || !dateInput}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 6,
                        border: "none",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        cursor:
                          isLoading || !dateInput ? "not-allowed" : "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                        opacity: isLoading || !dateInput ? 0.5 : 1,
                      }}
                    >
                      Go
                    </button>
                  </div>
                </div>

                {/* Reset Button */}
                {state?.isSimulated && (
                  <button
                    type="button"
                    onClick={reset}
                    disabled={isLoading}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      borderRadius: 6,
                      border: "1px solid #ef4444",
                      backgroundColor: "white",
                      color: "#ef4444",
                      cursor: isLoading ? "not-allowed" : "pointer",
                      fontSize: 14,
                      fontWeight: 500,
                      opacity: isLoading ? 0.5 : 1,
                      marginBottom: 16,
                    }}
                  >
                    Reset to Real Time
                  </button>
                )}
              </>
            ) : (
              <div
                style={{
                  padding: 16,
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                Enter a customer ID to control time
              </div>
            )}

            {/* All Customers Toggle */}
            {allCustomers.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowAllCustomers(!showAllCustomers)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    backgroundColor: "#f9fafb",
                    cursor: "pointer",
                    color: "#374151",
                    fontSize: 13,
                    fontWeight: 500,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    {allCustomers.length} customer(s) with simulated time
                  </span>
                  <span>{showAllCustomers ? "▲" : "▼"}</span>
                </button>

                {showAllCustomers && (
                  <div
                    style={{
                      marginTop: 8,
                      maxHeight: 150,
                      overflowY: "auto",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                    }}
                  >
                    {allCustomers.map((c) => (
                      <div
                        key={c.customerId}
                        style={{
                          padding: "8px 12px",
                          borderBottom: "1px solid #f3f4f6",
                          fontSize: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          backgroundColor:
                            c.customerId === activeCustomerId
                              ? "#eff6ff"
                              : "transparent",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "monospace",
                            color: "#374151",
                          }}
                        >
                          {truncateId(c.customerId)}
                        </span>
                        <span style={{ color: "#6b7280" }}>
                          {c.simulatedTime ? formatDate(c.simulatedTime) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Warning */}
          <div
            style={{
              padding: "8px 16px",
              backgroundColor: "#fef2f2",
              borderTop: "1px solid #fecaca",
              fontSize: 11,
              color: "#991b1b",
              textAlign: "center",
            }}
          >
            Development only - Do not use in production
          </div>
        </div>
      )}
    </div>
  );
}
