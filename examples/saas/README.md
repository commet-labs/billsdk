# BillSDK SaaS Example

A simple SaaS pricing page example using BillSDK with Next.js, Drizzle ORM, and Stripe.

## Features

- Pricing page with monthly/yearly toggle
- Stripe checkout integration
- PostgreSQL database with Drizzle ORM
- shadcn/ui components

## Getting Started

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Configure Environment

Copy the example environment file and add your Stripe keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Stripe credentials:
- `STRIPE_SECRET_KEY` - Your Stripe secret key (starts with `sk_test_`)
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret (starts with `whsec_`)

### 3. Install Dependencies

From the monorepo root:

```bash
pnpm install
```

### 4. Push Database Schema

```bash
pnpm db:push
```

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the pricing page.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run Drizzle migrations |
| `pnpm db:push` | Push schema to database (development) |
| `pnpm db:studio` | Open Drizzle Studio |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── billing/
│   │       └── [...path]/
│   │           └── route.ts      # BillSDK API handler
│   ├── pricing/
│   │   └── page.tsx              # Pricing page
│   ├── success/
│   │   └── page.tsx              # Checkout success
│   ├── cancel/
│   │   └── page.tsx              # Checkout canceled
│   └── page.tsx                  # Redirects to /pricing
├── components/
│   ├── ui/                       # shadcn/ui components
│   └── pricing-card.tsx          # Pricing card component
└── lib/
    ├── billing.ts                # BillSDK instance
    ├── db/
    │   ├── index.ts              # Drizzle client
    │   └── schema.ts             # Database schema
    └── utils.ts                  # Utility functions
```

## Plans

The example includes three plans:

| Plan | Monthly | Yearly | Features |
|------|---------|--------|----------|
| Free | $0 | - | API Calls |
| Pro | $29 | $290 | API Calls, Custom Domain |
| Enterprise | $99 | $990 | API Calls, Custom Domain, Priority Support |

## Testing Stripe

For testing, use Stripe's test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

See [Stripe Testing](https://stripe.com/docs/testing) for more test cards.
