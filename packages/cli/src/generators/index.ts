import type { DBSchema } from "@billsdk/core";
import { generateDrizzleSchema } from "./drizzle";

/**
 * Options for schema generation
 */
export interface GenerateSchemaOptions {
  schema: DBSchema;
  adapterId: string;
  provider?: string;
  output?: string;
}

/**
 * Result of schema generation
 */
export interface GenerateSchemaResult {
  code: string;
  fileName: string;
  overwrite?: boolean;
}

/**
 * Map of adapter IDs to their generator functions
 */
const generators: Record<
  string,
  (options: GenerateSchemaOptions) => Promise<GenerateSchemaResult>
> = {
  drizzle: async (opts) => {
    const provider = (opts.provider as "pg" | "mysql" | "sqlite") || "pg";
    return generateDrizzleSchema({
      schema: opts.schema,
      provider,
      output: opts.output,
    });
  },
  // Future: add more generators
  // prisma: generatePrismaSchema,
  // kysely: generateKyselySchema,
};

/**
 * Generate schema based on adapter type
 */
export async function generateSchema(
  options: GenerateSchemaOptions,
): Promise<GenerateSchemaResult> {
  const generator = generators[options.adapterId];

  if (!generator) {
    throw new Error(
      `No schema generator found for adapter "${options.adapterId}".\n` +
        `Available generators: ${Object.keys(generators).join(", ")}`,
    );
  }

  return generator(options);
}

/**
 * Get list of supported adapters
 */
export function getSupportedAdapters(): string[] {
  return Object.keys(generators);
}

export { generateDrizzleSchema } from "./drizzle";
export type { DrizzleGeneratorOptions } from "./drizzle";
