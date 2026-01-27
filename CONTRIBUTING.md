# Contributing

Thanks for your interest in contributing to BillSDK. We're happy to have you here.

Please take a moment to review this document before submitting your first pull request.

## Development

We use pnpm for package management and Turbo for monorepo management.

### Setup

```bash
git clone https://github.com/commet/billsdk.git
cd billsdk
pnpm install
```

### Monorepo Structure

- `apps/website`: The documentation site (billsdk.com)
- `packages/billsdk`: Main package
- `packages/core`: Core billing engine
- `packages/stripe`: Stripe adapter
- `packages/drizzle`: Drizzle adapter
- `demo/saas`: A complete Next.js demo

## Commit Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Linting

We use Biome for linting and formatting.

```bash
pnpm lint
pnpm format
```
