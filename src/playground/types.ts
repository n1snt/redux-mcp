import type { AppActionType } from "../redux/types";

export interface ParsedCommand {
  name: "help" | "state" | "actions" | "dispatch" | "reset" | "exit" | "invalid";
  actionType?: AppActionType;
  payload?: unknown;
  reason?: string;
}

export interface CommandResult {
  message: string;
  shouldExit: boolean;
}
