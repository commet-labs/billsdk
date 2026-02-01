import { Command } from "commander";
import { generateCommand } from "./commands/generate";
import { initCommand } from "./commands/init";

const program = new Command();

program
  .name("@billsdk/cli")
  .description(
    "CLI for BillSDK - Generate schemas and manage billing configuration",
  )
  .version("0.1.0");

// Add commands
program.addCommand(generateCommand);
program.addCommand(initCommand);

// Parse command line arguments
program.parse();
