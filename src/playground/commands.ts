import { InvalidActionPayloadError, ReduxController, UnsupportedActionError } from "../redux/controller";
import type { DispatchRequest } from "../redux/types";
import type { CommandResult, ParsedCommand } from "./types";

const commandHelp = `Available commands:
- help
- state
- actions
- dispatch <actionType> <payloadJson>
- reset
- exit`;

const parseDispatchCommand = (parts: string[]): ParsedCommand => {
  const actionType: string | undefined = parts[1];
  if (!actionType) {
    return {
      name: "invalid",
      reason: "Dispatch command requires an action type.",
    };
  }

  const payloadRaw: string | undefined = parts[2];
  if (!payloadRaw) {
    return {
      name: "dispatch",
      actionType: actionType as DispatchRequest["type"],
    };
  }

  try {
    const payload: unknown = JSON.parse(payloadRaw);
    return {
      name: "dispatch",
      actionType: actionType as DispatchRequest["type"],
      payload,
    };
  } catch {
    return {
      name: "invalid",
      reason: "Payload must be valid JSON.",
    };
  }
};

export const parseCommand = (input: string): ParsedCommand => {
  const trimmedInput: string = input.trim();
  if (trimmedInput.length === 0) {
    return {
      name: "help",
    };
  }

  const parts: string[] = trimmedInput.split(" ");
  const [command] = parts;
  switch (command) {
    case "help":
      return { name: "help" };
    case "state":
      return { name: "state" };
    case "actions":
      return { name: "actions" };
    case "dispatch":
      return parseDispatchCommand(parts);
    case "reset":
      return { name: "reset" };
    case "exit":
      return { name: "exit" };
    default:
      return {
        name: "invalid",
        reason: `Unknown command: ${command}`,
      };
  }
};

export const executeCommand = (controller: ReduxController, parsed: ParsedCommand): CommandResult => {
  switch (parsed.name) {
    case "help":
      return {
        message: commandHelp,
        shouldExit: false,
      };
    case "state":
      return {
        message: JSON.stringify(controller.getState(), null, 2),
        shouldExit: false,
      };
    case "actions":
      return {
        message: JSON.stringify(
          {
            availableActions: controller.getAvailableActions(),
            dispatchedActions: controller.getDispatchedActions(),
          },
          null,
          2,
        ),
        shouldExit: false,
      };
    case "dispatch":
      return {
        message: JSON.stringify(
          controller.dispatchAction({
            type: parsed.actionType ?? "counter/set",
            payload: parsed.payload,
          }),
          null,
          2,
        ),
        shouldExit: false,
      };
    case "reset":
      return {
        message: JSON.stringify(controller.resetState(), null, 2),
        shouldExit: false,
      };
    case "exit":
      return {
        message: "Exiting playground.",
        shouldExit: true,
      };
    case "invalid":
      return {
        message: parsed.reason ?? "Invalid command.",
        shouldExit: false,
      };
    default:
      return {
        message: "Unhandled command.",
        shouldExit: false,
      };
  }
};

export const runCommand = (controller: ReduxController, input: string): CommandResult => {
  try {
    const parsed: ParsedCommand = parseCommand(input);
    return executeCommand(controller, parsed);
  } catch (error: unknown) {
    if (error instanceof InvalidActionPayloadError || error instanceof UnsupportedActionError) {
      return {
        message: error.message,
        shouldExit: false,
      };
    }

    return {
      message: "Unexpected error while executing command.",
      shouldExit: false,
    };
  }
};
