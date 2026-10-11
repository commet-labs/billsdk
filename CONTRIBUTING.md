# Contributing

Thanks for your interest in contributing to BillSDK. We're happy to have you here.

Please take a moment to review this document before submitting your first pull request.

## Start with an issue

We review pull requests only for issues a maintainer has approved. Open an issue first; if we agree on the change, a maintainer assigns it to you, and you can then open a pull request that references it with `Closes #<issue number>`. Pull requests without a referenced issue assigned to their author are closed automatically.

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
