# @billsdk/time-travel

Time travel plugin for BillSDK - test subscription cycles by simulating time.

## Features

- **Advance time**: Jump forward by days, weeks, or months
- **Go to specific date**: Set any date for testing
- **Persistent state**: Simulated time survives server restarts
- **React overlay**: Beautiful floating UI for controlling time
- **Zero config**: Just add the plugin and you're ready

## Installation

```bash
npm install @billsdk/time-travel
# or
pnpm add @billsdk/time-travel
```

## Usage

### 1. Add the plugin (server-side)

```typescript
import { billsdk } from "billsdk";
import { timeTravelPlugin } from "@billsdk/time-travel";

const billing = billsdk({
  database: drizzleAdapter(db, { schema }),
  plugins: [
    timeTravelPlugin(), // Only in development!
  ],
});
```

### 2. Add the overlay (React)

```tsx
import { TimeTravelOverlay } from "@billsdk/time-travel/react";

function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV === "development" && (
        <TimeTravelOverlay baseUrl="/api/billing" />
      )}
    </>
  );
}
```

## API Endpoints

The plugin adds these endpoints to your BillSDK API:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/time-travel/get` | GET | Get current time state |
| `/time-travel/set` | POST | Set specific simulated time |
| `/time-travel/advance` | POST | Advance time by days/months/hours |
| `/time-travel/reset` | POST | Reset to real time |

### Examples

```typescript
// Get current state
const res = await fetch("/api/billing/time-travel/get");
const { simulatedTime, isSimulated, realTime } = await res.json();

// Set specific time
await fetch("/api/billing/time-travel/set", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ date: "2024-06-15T12:00:00.000Z" }),
});

// Advance by 1 month
await fetch("/api/billing/time-travel/advance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ months: 1 }),
});

// Reset to real time
await fetch("/api/billing/time-travel/reset", { method: "POST" });
```

## How it works

1. The plugin adds a `timeProvider` to the BillSDK context
2. Business logic (renewals, trials, etc.) uses `ctx.timeProvider.now()` instead of `new Date()`
3. The simulated time is stored in a database table (`time_travel_state`)
4. The React overlay calls the plugin endpoints to control the time

## Warning

**This plugin is for development and testing only.** It modifies how BillSDK perceives time, which can affect subscription states, renewals, and other time-based logic.

Do NOT include this plugin in production builds.

## License

MIT
