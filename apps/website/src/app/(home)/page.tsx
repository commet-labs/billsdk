import type { Metadata } from "next";
import Link from "next/link";
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from "@/components/codeblock";
import { DynamicCodeBlock } from "@/components/dynamic-codeblock";

export const metadata: Metadata = {
  title: "BillSDK",
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

const configExample = `const billing = billsdk({
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

const checkFeatureExample = `const { allowed } = await billing.checkFeature({
  customerId: "cus_123",
  feature: "api_access"
});

if (allowed) {
  // Grant access to the feature
}`;

export default function HomePage() {
  return (
    <div className="min-h-screen w-full relative">
      {/* Dark Sage Clay Background - Dark Mode */}
      <div
        className="absolute inset-0 z-0 dark:opacity-100 opacity-0 transition-opacity"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 90%, #181A19 40%, #252825 100%)",
        }}
      />

      {/* Light Mode Background - Sage Clay */}
      <div
        className="absolute inset-0 z-0 dark:opacity-0 opacity-100 transition-opacity"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 90%, #ECEEE8 40%, #DFE2DC 100%)",
        }}
      />

      {/* Diamond Grid Pattern - Dark Mode */}
      <div
        className="absolute inset-0 z-1 dark:opacity-100 opacity-0 transition-opacity"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30 Z' fill='none' stroke='rgba(138, 142, 136, 0.08)' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Diamond Grid Pattern - Light Mode */}
      <div
        className="absolute inset-0 z-1 dark:opacity-0 opacity-100 transition-opacity"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30 Z' fill='none' stroke='rgba(92, 94, 88, 0.06)' stroke-width='1'/%3E%3C/svg%3E")`,
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
                <h1 className="text-4xl md:text-6xl font-medium tracking-tight dark:text-[#E8ECE6] text-[#1C1E1A] leading-[1.1]">
                  Own your billing.
                  <br />
                  <span className="dark:text-[#C4C9C2] text-[#5C5E58]">
                    Use any provider.
                  </span>
                </h1>
                <p className="text-lg md:text-xl dark:text-[#8A8E88] text-[#6A6C66] font-normal leading-relaxed">
                  A billing engine that runs inside your application.
                  <br />
                  No lock-in. No revenue share. Pure logic.
                </p>
              </div>

              {/* Install Command */}
              <CodeBlockTabs defaultValue="pnpm">
                <CodeBlockTabsList>
                  <CodeBlockTabsTrigger value="pnpm">pnpm</CodeBlockTabsTrigger>
                  <CodeBlockTabsTrigger value="npm">npm</CodeBlockTabsTrigger>
                  <CodeBlockTabsTrigger value="bun">bun</CodeBlockTabsTrigger>
                </CodeBlockTabsList>
                <CodeBlockTab value="pnpm">
                  <DynamicCodeBlock lang="bash" code="pnpm add billsdk" />
                </CodeBlockTab>
                <CodeBlockTab value="npm">
                  <DynamicCodeBlock lang="bash" code="npm i billsdk" />
                </CodeBlockTab>
                <CodeBlockTab value="bun">
                  <DynamicCodeBlock lang="bash" code="bun add billsdk" />
                </CodeBlockTab>
              </CodeBlockTabs>

              <div className="flex items-center gap-4">
                <Link
                  href="/docs"
                  className="px-6 py-3 dark:bg-[#E8ECE6] dark:text-[#181A19] bg-[#1C1E1A] text-[#ECEEE8] font-medium dark:hover:bg-[#E0E4DE] hover:bg-[#2C2E2A] transition-colors"
                >
                  Get Started
                </Link>
                <a
                  href="https://demo.billsdk.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border dark:border-[#8A8E88]/30 border-[#5C5E58]/30 dark:text-[#C4C9C2] text-[#4A4C46] font-medium dark:hover:border-[#C4C9C2]/50 hover:border-[#5C5E58]/50 dark:hover:text-[#E8ECE6] hover:text-[#1C1E1A] transition-colors"
                >
                  Demo
                </a>
              </div>
            </div>

            {/* Right: Code Block */}
            <CodeBlockTabs defaultValue="config">
              <CodeBlockTabsList>
                <CodeBlockTabsTrigger value="config">
                  Config
                </CodeBlockTabsTrigger>
                <CodeBlockTabsTrigger value="check">
                  Check Feature
                </CodeBlockTabsTrigger>
              </CodeBlockTabsList>
              <CodeBlockTab value="config">
                <DynamicCodeBlock lang="typescript" code={configExample} />
              </CodeBlockTab>
              <CodeBlockTab value="check">
                <DynamicCodeBlock
                  lang="typescript"
                  code={checkFeatureExample}
                />
              </CodeBlockTab>
            </CodeBlockTabs>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-px dark:bg-[#8A8E88]/10 bg-[#5C5E58]/8">
            <div className="dark:bg-[#222524]/60 bg-[#E4E6E0]/70 backdrop-blur-md p-8 space-y-3">
              <h3 className="text-lg font-medium dark:text-[#E8ECE6] text-[#1C1E1A]">
                Zero Lock-In
              </h3>
              <p className="text-sm dark:text-[#8A8E88] text-[#6A6C66] leading-relaxed">
                Switch payment providers without rewriting billing logic.
                Stripe, Paddle, MercadoPago—your choice.
              </p>
            </div>

            <div className="dark:bg-[#222524]/60 bg-[#E4E6E0]/70 backdrop-blur-md p-8 space-y-3">
              <h3 className="text-lg font-medium dark:text-[#E8ECE6] text-[#1C1E1A]">
                In-Process
              </h3>
              <p className="text-sm dark:text-[#8A8E88] text-[#6A6C66] leading-relaxed">
                No external API calls. Everything runs inside your app.
                Milliseconds, not seconds.
              </p>
            </div>

            <div className="dark:bg-[#222524]/60 bg-[#E4E6E0]/70 backdrop-blur-md p-8 space-y-3">
              <h3 className="text-lg font-medium dark:text-[#E8ECE6] text-[#1C1E1A]">
                Type-Safe
              </h3>
              <p className="text-sm dark:text-[#8A8E88] text-[#6A6C66] leading-relaxed">
                Plans in code. Version controlled. Full TypeScript inference. No
                database sync.
              </p>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="pt-12 border-t dark:border-[#8A8E88]/10 border-[#5C5E58]/12 space-y-4">
            <p className="dark:text-[#6A6E68] text-[#7A7C76] text-sm max-w-2xl">
              Subscriptions. Feature gating. Trials. Webhooks. Usage tracking.
              <br />
              Payment providers move money. BillSDK handles everything else.
            </p>
            <p className="dark:text-[#4A4E4A] text-[#9A9C96] text-xs">
              MIT Licensed · Open Source
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
