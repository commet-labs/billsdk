# @billsdk/cli

## 0.1.2

### Patch Changes

- Updated dependencies [[`976ba1b`](https://github.com/commet-labs/billsdk/commit/976ba1b6a04bc1610dc0da32b676fd542348235f)]:
  - @billsdk/core@0.5.0

## 0.1.1

### Patch Changes

- 4114955: Version bump for npm publish

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
