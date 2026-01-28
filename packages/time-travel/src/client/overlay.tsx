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
}

interface TimeTravelState {
  simulatedTime: string | null;
  isSimulated: boolean;
  realTime: string;
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
 *   return (
 *     <>
 *       <YourApp />
 *       {process.env.NODE_ENV === "development" && (
 *         <TimeTravelOverlay baseUrl="/api/billing" />
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
}: TimeTravelOverlayProps) {
  const [state, setState] = useState<TimeTravelState | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isLoading, setIsLoading] = useState(false);
  const [dateInput, setDateInput] = useState("");

  // Fetch current state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/time-travel/get`);
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
  }, [baseUrl]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Advance time
  const advance = async (days: number, months = 0, hours = 0) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/time-travel/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, months, hours }),
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (error) {
      console.error("[TimeTravelOverlay] Failed to advance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set specific time
  const setTime = async (date: string | null) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/time-travel/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (error) {
      console.error("[TimeTravelOverlay] Failed to set time:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to real time
  const reset = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/time-travel/reset`, {
        method: "POST",
      });
      if (res.ok) {
        setDateInput("");
        await fetchState();
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
      // Convert date to ISO string at midnight UTC
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
        </button>
      ) : (
        /* Expanded Panel */
        <div
          style={{
            width: 280,
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

          {/* Current Time Display */}
          <div style={{ padding: 16 }}>
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
              <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
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
                    cursor: isLoading || !dateInput ? "not-allowed" : "pointer",
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
                }}
              >
                Reset to Real Time
              </button>
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
