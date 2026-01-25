import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "BillSDK - Own your billing. Use any provider.",
  description:
    "A billing engine that runs inside your application. No lock-in. No revenue share. Subscriptions, feature gating, trials, webhooks, and usage tracking.",
  openGraph: {
    title: "BillSDK - Own your billing. Use any provider.",
    description:
      "A billing engine that runs inside your application. No lock-in. No revenue share. Pure logic.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BillSDK - Own your billing. Use any provider.",
    description:
      "A billing engine that runs inside your application. No lock-in. No revenue share. Pure logic.",
  },
};

const codeExample = `const billing = billsdk({
  features: [
    { code: "api_access", name: "API Access" },
    { code: "priority_support", name: "Priority Support" },
  ],
  plans: [{
    code: "pro",
    prices: [{
      amount: 2000,
      interval: "monthly"
    }],
    features: [
      "api_access",
      "priority_support"
    ]
  }]
});`;

export default function HomePage() {
  return (
    <div className="min-h-screen w-full relative">
      {/* Violet Abyss Background - Dark Mode */}
      <div
        className="absolute inset-0 z-0 dark:opacity-100 opacity-0 transition-opacity"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 90%, #000000 40%, #2b092b 100%)",
        }}
      />

      {/* Light Mode Background */}
      <div
        className="absolute inset-0 z-0 dark:opacity-0 opacity-100 transition-opacity"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 90%, #ffffff 40%, #f5e6f5 100%)",
        }}
      />

      {/* Diamond Grid Pattern - Dark Mode */}
      <div
        className="absolute inset-0 z-1 dark:opacity-100 opacity-0 transition-opacity"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30 Z' fill='none' stroke='rgba(139, 92, 246, 0.05)' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Diamond Grid Pattern - Light Mode */}
      <div
        className="absolute inset-0 z-1 dark:opacity-0 opacity-100 transition-opacity"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30 Z' fill='none' stroke='rgba(139, 92, 246, 0.05)' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto py-20">
        <div className="space-y-20">
          {/* Hero Section - 50/50 Split */}
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
            {/* Left: Hero Text */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-6xl font-medium tracking-tight dark:text-white text-neutral-900 leading-[1.1]">
                  Own your billing.
                  <br />
                  <span className="dark:text-violet-300 text-violet-600">
                    Use any provider.
                  </span>
                </h1>
                <p className="text-lg md:text-xl dark:text-gray-400 text-neutral-600 font-normal leading-relaxed">
                  A billing engine that runs inside your application.
                  <br />
                  No lock-in. No revenue share. Pure logic.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <Link
                  href="/docs"
                  className="px-6 py-3 dark:bg-white dark:text-black bg-neutral-900 text-white font-medium dark:hover:bg-violet-100 hover:bg-neutral-800 transition-colors"
                >
                  Documentation
                </Link>
                <a
                  href="https://github.com/commet/billsdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border dark:border-violet-500/30 border-violet-400/40 dark:text-violet-200 text-violet-700 font-medium dark:hover:border-violet-400/50 hover:border-violet-500/60 dark:hover:text-violet-100 hover:text-violet-800 transition-colors"
                >
                  GitHub
                </a>
              </div>
            </div>

            {/* Right: Code Block */}
            <div className="[&_figure]:bg-white/80! [&_figure]:dark:bg-black/40! [&_figure]:backdrop-blur-md [&_figure]:border! [&_figure]:dark:border-violet-500/20 [&_figure]:border-violet-300/30 [&_figure]:py-2 [&_pre]:bg-transparent! [&_pre]:border-none!">
              <DynamicCodeBlock lang="typescript" code={codeExample} />
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-px dark:bg-violet-500/10 bg-violet-300/20">
            <div className="dark:bg-black/40 bg-white/60 backdrop-blur-md p-8 space-y-3">
              <h3 className="text-lg font-medium dark:text-white text-neutral-900">
                Zero Lock-In
              </h3>
              <p className="text-sm dark:text-gray-400 text-neutral-600 leading-relaxed">
                Switch payment providers without rewriting billing logic.
                Stripe, Paddle, MercadoPago—your choice.
              </p>
            </div>

            <div className="dark:bg-black/40 bg-white/60 backdrop-blur-md p-8 space-y-3">
              <h3 className="text-lg font-medium dark:text-white text-neutral-900">
                In-Process
              </h3>
              <p className="text-sm dark:text-gray-400 text-neutral-600 leading-relaxed">
                No external API calls. Everything runs inside your app.
                Milliseconds, not seconds.
              </p>
            </div>

            <div className="dark:bg-black/40 bg-white/60 backdrop-blur-md p-8 space-y-3">
              <h3 className="text-lg font-medium dark:text-white text-neutral-900">
                Type-Safe
              </h3>
              <p className="text-sm dark:text-gray-400 text-neutral-600 leading-relaxed">
                Plans in code. Version controlled. Full TypeScript inference. No
                database sync.
              </p>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="pt-12 border-t dark:border-violet-500/10 border-violet-300/20 space-y-4">
            <p className="dark:text-gray-500 text-neutral-500 text-sm max-w-2xl">
              Subscriptions. Feature gating. Trials. Webhooks. Usage tracking.
              <br />
              Payment providers move money. BillSDK handles everything else.
            </p>
            <p className="dark:text-violet-400/60 text-violet-600/50 text-xs">
              MIT Licensed · Open Source
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
