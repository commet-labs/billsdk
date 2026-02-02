# @billsdk/cli

## 0.1.0

Initial release of the BillSDK CLI.

### Features

- **`generate`** — Generate database schema from your billing configuration
  - Auto-detects `billing.ts` config file
  - Merges schemas from plugins (e.g., time-travel)
  - Generates Drizzle ORM schema with proper types for PostgreSQL, MySQL, and SQLite
  - Options: `--config`, `--output`, `--provider`, `--yes`

- **`init`** — Initialize BillSDK in your project
  - Interactive prompts for adapter and provider selection
  - Generates `billing.ts` template with example plans
  - Auto-installs dependencies (billsdk, drizzle-orm, etc.)
  - Detects package manager (npm, pnpm, yarn, bun)
