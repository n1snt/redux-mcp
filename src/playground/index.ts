import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { ReduxController } from "../redux/controller";
import { runCommand } from "./commands";

const startPlayground = async (): Promise<void> => {
  const controller: ReduxController = new ReduxController();
  const readline = createInterface({ input, output });

  output.write("Redux MCP Playground\n");
  output.write("Type `help` to see available commands.\n");

  let shouldExit: boolean = false;
  while (!shouldExit) {
    const commandInput: string = await readline.question("> ");
    const result = runCommand(controller, commandInput);
    output.write(`${result.message}\n`);
    shouldExit = result.shouldExit;
  }

  readline.close();
};

void startPlayground();
