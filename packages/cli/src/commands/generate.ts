import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { generateSchema, getSupportedAdapters } from "../generators";
import { getAdapterInfo, getConfig, getMergedSchema } from "../utils";

export const generateCommand = new Command("generate")
  .description("Generate database schema from your billing configuration")
  .option("-c, --config <path>", "Path to billing config file")
  .option("-o, --output <path>", "Output file path", "billing-schema.ts")
  .option(
    "-p, --provider <provider>",
    "Database provider (pg, mysql, sqlite)",
    "pg",
  )
  .option("-y, --yes", "Skip confirmation prompts", false)
  .action(async (options) => {
    const cwd = process.cwd();

    p.intro(chalk.cyan("@billsdk/cli generate"));

    const spinner = p.spinner();

    try {
      // Load config
      spinner.start("Loading billing configuration…");
      const { config, configPath } = await getConfig(options.config, cwd);
      spinner.stop(
        chalk.green("✓") +
          ` Found ${chalk.dim(path.relative(cwd, configPath))}`,
      );

      // Get adapter info (or use defaults)
      const adapterInfo = getAdapterInfo(config);

      // Default to drizzle if adapter couldn't be detected
      const adapterId = adapterInfo?.adapterId ?? "drizzle";
      const provider = options.provider || adapterInfo?.provider || "pg";

      if (!adapterInfo) {
        p.log.warn(
          `Could not detect adapter from config. Using default: ${adapterId} with ${provider}`,
        );
      }

      // Check if adapter is supported
      const supportedAdapters = getSupportedAdapters();
      if (!supportedAdapters.includes(adapterId)) {
        p.log.error(
          `Adapter "${adapterId}" is not supported for schema generation.\n` +
            `Supported adapters: ${supportedAdapters.join(", ")}`,
        );
        process.exit(1);
      }

      p.log.info(
        `Detected adapter: ${chalk.cyan(adapterId)}, provider: ${chalk.cyan(provider)}`,
      );

      // Get merged schema
      spinner.start("Analyzing schema…");
      const schema = getMergedSchema(config);
      const tableCount = Object.keys(schema).length;
      spinner.stop(`${chalk.green("✓")} Found ${tableCount} tables`);

      // Check for existing file
      const outputPath = path.isAbsolute(options.output)
        ? options.output
        : path.join(cwd, options.output);

      try {
        await fs.access(outputPath);
        // File exists - ask for confirmation unless --yes flag
        if (!options.yes) {
          const overwrite = await p.confirm({
            message: `File ${chalk.dim(options.output)} already exists. Overwrite?`,
            initialValue: true,
          });

          if (p.isCancel(overwrite) || !overwrite) {
            p.log.warn("Generation cancelled.");
            process.exit(0);
          }
        }
      } catch {
        // File doesn't exist, continue
      }

      // Generate schema
      spinner.start("Generating schema…");
      const result = await generateSchema({
        schema,
        adapterId,
        provider,
        output: options.output,
      });
      spinner.stop(`${chalk.green("✓")} Schema generated`);

      // Write file
      spinner.start("Writing file…");
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, result.code, "utf-8");
      spinner.stop(
        `${chalk.green("✓")} Written to ${chalk.dim(options.output)}`,
      );

      // Success message
      p.log.success(
        `Generated ${chalk.cyan(result.fileName)} with ${tableCount} tables`,
      );

      // Next steps
      p.note(
        "Run migrations:\n" +
          chalk.dim("  npx drizzle-kit generate\n") +
          chalk.dim("  npx drizzle-kit migrate"),
        "Next steps",
      );

      p.outro(chalk.green("Done!"));
    } catch (error) {
      spinner.stop(`${chalk.red("✗")} Failed`);
      p.log.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
