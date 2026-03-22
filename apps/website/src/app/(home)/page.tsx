import Link from "next/link";
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from "@/components/codeblock";
import { DynamicCodeBlock } from "@/components/dynamic-codeblock";

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
      {/* Background gradient */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 90%, var(--background) 40%, var(--muted) 100%)",
        }}
      />

      {/* Diamond Grid Pattern - Dark Mode */}
      <div
        className="absolute inset-0 z-1 dark:opacity-100 opacity-0 transition-opacity"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30 Z' fill='none' stroke='rgba(142, 136, 126, 0.08)' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Diamond Grid Pattern - Light Mode */}
      <div
        className="absolute inset-0 z-1 dark:opacity-0 opacity-100 transition-opacity"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30 Z' fill='none' stroke='rgba(94, 88, 80, 0.06)' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-(--fd-layout-width) mx-auto px-4 sm:px-6 pt-20 pb-12 md:py-20">
        <div className="space-y-12 md:space-y-20">
          {/* Hero Section - 50/50 Split */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-0 lg:min-h-[70vh]">
            {/* Left: Hero Text */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-foreground leading-[1.1]">
                  Own your billing.
                  <br />
                  <span className="text-muted-foreground">
                    Use any provider.
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground font-normal leading-relaxed">
                  A billing engine that runs inside your application.
                  <br />
                  No lock-in. No revenue share. Pure logic.
                </p>
              </div>

              {/* Install Command */}
              <div className="w-full max-w-full overflow-hidden">
                <CodeBlockTabs defaultValue="pnpm">
                  <CodeBlockTabsList>
                    <CodeBlockTabsTrigger value="pnpm">
                      pnpm
                    </CodeBlockTabsTrigger>
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
              </div>

              <div className="flex items-center gap-4">
                <Link
                  href="/docs"
                  className="px-6 py-3 bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  Get Started
                </Link>
                <a
                  href="https://demo.billsdk.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border border-border text-muted-foreground font-medium hover:border-ring/50 hover:text-foreground transition-colors"
                >
                  Demo
                </a>
              </div>
            </div>

            {/* Right: Code Block */}
            <div className="w-full max-w-full overflow-hidden">
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
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-px md:bg-border/50">
            <div className="bg-muted/70 backdrop-blur-md p-8 space-y-3">
              <h3 className="text-lg font-medium text-foreground">
                Zero Lock-In
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Switch payment providers without rewriting billing logic.
                Stripe, Paddle, MercadoPago—your choice.
              </p>
            </div>

            <div className="bg-muted/70 backdrop-blur-md p-8 space-y-3">
              <h3 className="text-lg font-medium text-foreground">
                In-Process
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No external API calls. Everything runs inside your app.
                Milliseconds, not seconds.
              </p>
            </div>

            <div className="bg-muted/70 backdrop-blur-md p-8 space-y-3">
              <h3 className="text-lg font-medium text-foreground">Type-Safe</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Plans in code. Version controlled. Full TypeScript inference. No
                database sync.
              </p>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="pt-12 border-t border-border space-y-4">
            <p className="text-muted-foreground/70 text-sm max-w-2xl">
              Subscriptions. Feature gating. Trials. Webhooks. Usage tracking.
              <br />
              Payment providers move money. BillSDK handles everything else.
            </p>
            <p className="text-muted-foreground/40 text-xs">
              MIT Licensed · Open Source
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
