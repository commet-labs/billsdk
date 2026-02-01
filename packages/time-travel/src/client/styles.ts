export const OVERLAY_STYLES = `
[data-tt-root] {
  /* Sage Clay Palette (BillSDK) - Minimal */
  --tt-bg: #1c1e1d;
  --tt-bg-subtle: #222524;
  --tt-text: #e8ece6;
  --tt-text-muted: #8a8e88;
  --tt-border: hsla(100, 6%, 32%, 40%);
  --tt-danger: #ef4444;
  --tt-success: #6ee7b7;

  /* Timing */
  --tt-timing: cubic-bezier(0.23, 0.88, 0.26, 0.92);
  --tt-timing-bounce: linear(0 0%, 0.006 1%, 0.022 2%, 0.047 3%, 0.078 4%, 0.114 5%, 0.154 6%, 0.197 7%, 0.242 8%, 0.288 9%, 0.334 10%, 0.38 11%, 0.425 12%, 0.469 13%, 0.511 14%, 0.552 15%, 0.591 16%, 0.627 17%, 0.662 18%, 0.695 19%, 0.726 20%, 0.754 21%, 0.78 22%, 0.805 23%, 0.827 24%, 0.848 25%, 0.867 26%, 0.884 27%, 0.899 28%, 0.913 29%, 0.926 30%, 0.937 31%, 0.947 32%, 0.956 33%, 0.964 34%, 0.971 35%, 0.977 36%, 0.982 37%, 0.987 38%, 0.991 39%, 0.994 40%, 0.997 41%, 1 42%, 1.002 43%, 1.003 44%, 1.005 45%, 1.006 46%, 1.007 47%, 1.007 48%, 1.008 49%, 1.008 50%, 1.008 51%, 1.008 52%, 1.008 53%, 1.008 54%, 1.007 55%, 1.007 56%, 1.007 57%, 1.007 58%, 1.006 59%, 1.006 60%, 1.006 61%, 1.005 62%, 1.005 63%, 1.004 64%, 1.004 65%, 1.004 66%, 1.003 67%, 1.003 68%, 1.003 69%, 1.003 70%, 1.002 71%, 1.002 72%, 1.002 73%, 1.002 74%, 1.001 75%, 1.001 76%, 1.001 77%, 1.001 78%, 1.001 79%, 1.001 80%, 1.001 81%, 1 82%, 1 83%, 1 84%, 1 85%, 1 86%, 1 87%, 1 88%, 1 89%, 1 90%);

  /* Spacing */
  --tt-padding: 20px;

  /* Font */
  --tt-font: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --tt-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

  font-family: var(--tt-font);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* Badge */
[data-tt-badge] {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  background: var(--tt-bg);
  border: 1px solid var(--tt-border);
  color: var(--tt-text);
  font-family: var(--tt-font);
  font-size: 13px;
  font-weight: 500;
  cursor: grab;
  user-select: none;
  white-space: nowrap;
  transition: background 150ms ease;
}

[data-tt-badge]:hover {
  background: var(--tt-bg-subtle);
}

[data-tt-badge]:active {
  cursor: grabbing;
}

[data-tt-badge][data-simulated="true"] {
  background: var(--tt-success);
  border-color: var(--tt-success);
  color: var(--tt-bg);
}

[data-tt-badge][data-simulated="true"]:hover {
  filter: brightness(0.95);
}

[data-tt-badge-icon] {
  display: flex;
  width: 16px;
  height: 16px;
}

[data-tt-badge-count] {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--tt-text-muted);
  font-size: 11px;
  font-weight: 600;
  color: var(--tt-bg);
}

/* Panel */
[data-tt-panel] {
  width: 308px;
  background: var(--tt-bg);
  border: 1px solid var(--tt-border);
  overflow: hidden;
  opacity: 0;
  transform: scale(0.96);
  transform-origin: var(--tt-panel-origin, bottom right);
  transition: opacity 200ms var(--tt-timing), transform 200ms var(--tt-timing);
}

[data-tt-panel][data-visible="true"] {
  opacity: 1;
  transform: scale(1);
}

[data-tt-panel-header] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--tt-border);
}

[data-tt-panel-header][data-simulated="true"] {
  background: rgba(110, 231, 183, 0.1);
}

[data-tt-panel-title] {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--tt-text);
}

[data-tt-panel-close] {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: var(--tt-text-muted);
  cursor: pointer;
}

[data-tt-panel-close]:hover {
  color: var(--tt-text);
}

[data-tt-panel-content] {
  padding: 12px;
}

/* Time Display */
[data-tt-time-display] {
  padding: 10px 12px;
  background: var(--tt-bg-subtle);
  margin-bottom: 12px;
}

[data-tt-time-label] {
  font-size: 11px;
  font-weight: 500;
  color: var(--tt-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}

[data-tt-time-value] {
  font-size: 15px;
  font-weight: 600;
  color: var(--tt-text);
}

[data-tt-time-sub] {
  font-size: 12px;
  color: var(--tt-text-muted);
}

/* Buttons - All use same base style */
[data-tt-actions] {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

[data-tt-action],
[data-tt-btn-primary],
[data-tt-btn-reset] {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  background: var(--tt-bg-subtle);
  border: none;
  font-family: var(--tt-font);
  font-size: 12px;
  font-weight: 500;
  color: var(--tt-text);
  cursor: pointer;
  transition: filter 150ms ease;
}

[data-tt-action]:hover:not(:disabled),
[data-tt-btn-primary]:hover:not(:disabled),
[data-tt-btn-reset]:hover:not(:disabled) {
  filter: brightness(0.85);
}

[data-tt-action]:disabled,
[data-tt-btn-primary]:disabled,
[data-tt-btn-reset]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Primary variant */
[data-tt-btn-primary] {
  background: var(--tt-text);
  color: var(--tt-bg);
}

/* Destructive variant */
[data-tt-btn-reset] {
  background: var(--tt-danger);
  color: var(--tt-bg);
}

/* Input */
[data-tt-input] {
  flex: 1;
  height: 32px;
  padding: 0 10px;
  background: var(--tt-bg-subtle);
  border: 1px solid var(--tt-border);
  font-family: var(--tt-font);
  font-size: 13px;
  color: var(--tt-text);
  color-scheme: dark;
}

[data-tt-input]:focus {
  outline: none;
  border-color: var(--tt-text-muted);
}

[data-tt-input]::placeholder {
  color: var(--tt-text-muted);
}

/* Result */
[data-tt-result] {
  padding: 10px;
  background: var(--tt-bg-subtle);
  margin-bottom: 12px;
}

[data-tt-result][data-has-errors="true"] {
  background: rgba(239, 68, 68, 0.1);
}

[data-tt-result-grid] {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  font-size: 12px;
}

[data-tt-result-item] {
  color: var(--tt-text-muted);
}

[data-tt-result-value] {
  font-weight: 600;
  color: var(--tt-text);
}

[data-tt-result-value][data-success] {
  color: var(--tt-success);
}

[data-tt-result-value][data-danger] {
  color: var(--tt-danger);
}

/* Customer Info */
[data-tt-customer] {
  padding: 8px 10px;
  background: var(--tt-bg-subtle);
  font-size: 12px;
  color: var(--tt-text);
  margin-bottom: 12px;
}

[data-tt-customer] strong {
  font-family: var(--tt-font-mono);
}

/* Customers List */
[data-tt-customers-toggle] {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--tt-bg-subtle);
  border: none;
  font-family: var(--tt-font);
  font-size: 12px;
  font-weight: 500;
  color: var(--tt-text);
  cursor: pointer;
  transition: filter 150ms ease;
}

[data-tt-customers-toggle]:hover {
  filter: brightness(0.85);
}

[data-tt-customers-list] {
  margin-top: 8px;
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid var(--tt-border);
}

[data-tt-customer-item] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 11px;
  border-bottom: 1px solid var(--tt-border);
}

[data-tt-customer-item]:last-child {
  border-bottom: none;
}

[data-tt-customer-item][data-active="true"] {
  background: var(--tt-bg-subtle);
}

[data-tt-customer-id] {
  font-family: var(--tt-font-mono);
  color: var(--tt-text);
}

[data-tt-customer-date] {
  color: var(--tt-text-muted);
}

/* Footer */
[data-tt-footer] {
  padding: 6px 12px;
  border-top: 1px solid var(--tt-border);
  font-size: 10px;
  font-weight: 500;
  color: var(--tt-danger);
  text-align: center;
}

/* Grabbing state */
[data-tt-root].tt-grabbing {
  cursor: grabbing !important;
}

[data-tt-root].tt-grabbing * {
  cursor: grabbing !important;
  user-select: none !important;
}

/* Empty state */
[data-tt-empty] {
  padding: 20px;
  text-align: center;
  color: var(--tt-text-muted);
  font-size: 13px;
}

/* Label */
[data-tt-label] {
  font-size: 11px;
  font-weight: 500;
  color: var(--tt-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
`;
