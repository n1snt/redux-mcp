export interface ParsedCommand {
  name: "help" | "state" | "actions" | "dispatch" | "reset" | "exit" | "invalid";
  actionType?: string;
  payload?: unknown;
  reason?: string;
}

export interface CommandResult {
  message: string;
  shouldExit: boolean;
}
