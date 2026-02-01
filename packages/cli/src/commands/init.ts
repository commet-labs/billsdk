import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import * as prettier from "prettier";

export const initCommand = new Command("init")
  .description("Initialize BillSDK in your project")
  .option("-y, --yes", "Skip confirmation prompts and use defaults", false)
  .action(async (options) => {
    const cwd = process.cwd();

    p.intro(chalk.cyan("@billsdk/cli init"));

    try {
      // Check if billing.ts already exists
      const configPath = path.join(cwd, "billing.ts");
      try {
        await fs.access(configPath);
        p.log.warn("billing.ts already exists. Skipping initialization.");
        p.outro(chalk.yellow("Already initialized"));
        return;
      } catch {
        // File doesn't exist, we can continue
      }

      let provider = "pg";
      let adapter = "drizzle";
      let installDeps = true;

      if (!options.yes) {
        // Ask for adapter
        const adapterChoice = await p.select({
          message: "Which database adapter do you want to use?",
          options: [
            { value: "drizzle", label: "Drizzle ORM", hint: "recommended" },
            { value: "memory", label: "In-Memory", hint: "for testing" },
          ],
        });

        if (p.isCancel(adapterChoice)) {
          p.log.warn("Initialization cancelled.");
          process.exit(0);
        }

        adapter = adapterChoice as string;

        // Ask for provider if using drizzle
        if (adapter === "drizzle") {
          const providerChoice = await p.select({
            message: "Which database provider?",
            options: [
              { value: "pg", label: "PostgreSQL", hint: "recommended" },
              { value: "mysql", label: "MySQL" },
              { value: "sqlite", label: "SQLite" },
            ],
          });

          if (p.isCancel(providerChoice)) {
            p.log.warn("Initialization cancelled.");
            process.exit(0);
          }

          provider = providerChoice as string;
        }

        // Ask about installing dependencies
        const shouldInstall = await p.confirm({
          message: "Install dependencies?",
          initialValue: true,
        });

        if (p.isCancel(shouldInstall)) {
          p.log.warn("Initialization cancelled.");
          process.exit(0);
        }

        installDeps = shouldInstall;
      }

      const spinner = p.spinner();

      // Generate billing.ts content
      const configContent = generateConfigContent(adapter, provider);

      // Write config file
      spinner.start("Creating billing.ts…");
      const formatted = await prettier.format(configContent, {
        parser: "typescript",
        semi: true,
        singleQuote: false,
        tabWidth: 2,
      });
      await fs.writeFile(configPath, formatted, "utf-8");
      spinner.stop(`${chalk.green("✓")} Created billing.ts`);

      // Install dependencies
      if (installDeps) {
        spinner.start("Installing dependencies…");
        const deps = getDependencies(adapter, provider);
        const packageManager = await detectPackageManager(cwd);

        try {
          const { execSync } = await import("node:child_process");
          const installCmd = getInstallCommand(packageManager, deps);
          execSync(installCmd, { cwd, stdio: "pipe" });
          spinner.stop(`${chalk.green("✓")} Installed dependencies`);
        } catch (_error) {
          spinner.stop(`${chalk.yellow("⚠")} Failed to install dependencies`);
          p.log.warn(
            `Install manually:\n${chalk.dim(
              `  ${packageManager} install ${deps.join(" ")}`,
            )}`,
          );
        }
      }

      // Success message
      p.log.success("BillSDK initialized!");

      // Next steps
      const nextSteps = [
        "1. Update your database connection in billing.ts",
        "2. Configure your plans",
        "3. Run: npx @billsdk/cli generate",
        "4. Run: npx drizzle-kit generate && npx drizzle-kit migrate",
      ];

      p.note(nextSteps.join("\n"), "Next steps");

      p.outro(chalk.green("Done!"));
    } catch (error) {
      p.log.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Generate the billing.ts config content
 */
function generateConfigContent(adapter: string, provider: string): string {
  if (adapter === "memory") {
    return `import { billsdk, memoryAdapter } from "billsdk";

export const billing = billsdk({
  database: memoryAdapter(),
  plans: [
    {
      code: "free",
      name: "Free",
      description: "Get started for free",
      price: { monthly: 0, yearly: 0 },
      features: {
        projects: { type: "limit", value: 3 },
      },
    },
    {
      code: "pro",
      name: "Pro",
      description: "For growing teams",
      price: { monthly: 1900, yearly: 19000 }, // in cents
      features: {
        projects: { type: "limit", value: 100 },
        analytics: { type: "boolean", value: true },
      },
    },
  ],
});
`;
  }

  // Drizzle adapter
  return `import { billsdk } from "billsdk";
import { drizzleAdapter } from "@billsdk/drizzle-adapter";
import { db } from "./db"; // Your Drizzle DB instance
import * as schema from "./billing-schema"; // Generated by CLI

export const billing = billsdk({
  database: drizzleAdapter(db, {
    schema,
    provider: "${provider}",
  }),
  plans: [
    {
      code: "free",
      name: "Free",
      description: "Get started for free",
      price: { monthly: 0, yearly: 0 },
      features: {
        projects: { type: "limit", value: 3 },
      },
    },
    {
      code: "pro",
      name: "Pro",
      description: "For growing teams",
      price: { monthly: 1900, yearly: 19000 }, // in cents
      features: {
        projects: { type: "limit", value: 100 },
        analytics: { type: "boolean", value: true },
      },
    },
  ],
});
`;
}

/**
 * Get dependencies to install
 */
function getDependencies(adapter: string, provider: string): string[] {
  const deps = ["billsdk"];

  if (adapter === "drizzle") {
    deps.push("@billsdk/drizzle-adapter", "drizzle-orm", "drizzle-kit");

    switch (provider) {
      case "pg":
        deps.push("postgres");
        break;
      case "mysql":
        deps.push("mysql2");
        break;
      case "sqlite":
        deps.push("better-sqlite3");
        break;
    }
  } else if (adapter === "memory") {
    deps.push("@billsdk/memory-adapter");
  }

  return deps;
}

/**
 * Detect package manager
 */
async function detectPackageManager(
  cwd: string,
): Promise<"npm" | "pnpm" | "yarn" | "bun"> {
  try {
    await fs.access(path.join(cwd, "pnpm-lock.yaml"));
    return "pnpm";
  } catch {}

  try {
    await fs.access(path.join(cwd, "yarn.lock"));
    return "yarn";
  } catch {}

  try {
    await fs.access(path.join(cwd, "bun.lockb"));
    return "bun";
  } catch {}

  return "npm";
}

/**
 * Get install command for package manager
 */
function getInstallCommand(
  packageManager: "npm" | "pnpm" | "yarn" | "bun",
  deps: string[],
): string {
  switch (packageManager) {
    case "pnpm":
      return `pnpm add ${deps.join(" ")}`;
    case "yarn":
      return `yarn add ${deps.join(" ")}`;
    case "bun":
      return `bun add ${deps.join(" ")}`;
    default:
      return `npm install ${deps.join(" ")}`;
  }
}
