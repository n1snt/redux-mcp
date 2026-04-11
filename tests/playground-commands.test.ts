import { describe, expect, it } from "vitest";

import { ReduxController } from "../src/redux/controller";
import { executeCommand, parseCommand, runCommand } from "../src/playground/commands";

describe("playground commands", () => {
  it("parses command variants", () => {
    expect(parseCommand("")).toEqual({ name: "help" });
    expect(parseCommand("help")).toEqual({ name: "help" });
    expect(parseCommand("state")).toEqual({ name: "state" });
    expect(parseCommand("actions")).toEqual({ name: "actions" });
    expect(parseCommand("reset")).toEqual({ name: "reset" });
    expect(parseCommand("exit")).toEqual({ name: "exit" });
  });

  it("parses dispatch with and without payload", () => {
    expect(parseCommand("dispatch counter/increment {\"amount\":2}")).toEqual({
      name: "dispatch",
      actionType: "counter/increment",
      payload: { amount: 2 },
    });

    expect(parseCommand("dispatch counter/set")).toEqual({
      name: "dispatch",
      actionType: "counter/set",
    });
  });

  it("returns invalid parse results", () => {
    expect(parseCommand("dispatch")).toEqual({
      name: "invalid",
      reason: "Dispatch command requires an action type.",
    });
    expect(parseCommand("dispatch counter/set {invalid_json}")).toEqual({
      name: "invalid",
      reason: "Payload must be valid JSON.",
    });
    expect(parseCommand("unknown")).toEqual({
      name: "invalid",
      reason: "Unknown command: unknown",
    });
  });

  it("executes command branches", () => {
    const controller: ReduxController = new ReduxController();
    controller.dispatchAction({ type: "counter/increment", payload: { amount: 1 } });

    expect(executeCommand(controller, { name: "help" }).message).toContain("Available commands");
    expect(executeCommand(controller, { name: "state" }).message).toContain("\"counter\"");
    expect(executeCommand(controller, { name: "actions" }).message).toContain("\"availableActions\"");
    expect(
      executeCommand(controller, {
        name: "dispatch",
        actionType: "counter/set",
        payload: { value: 9 },
      }).message,
    ).toContain("\"value\": 9");
    expect(
      executeCommand(controller, {
        name: "dispatch",
        payload: { value: 3 },
      }).message,
    ).toContain("\"value\": 3");
    expect(executeCommand(controller, { name: "reset" }).message).toContain("\"value\": 0");
    expect(executeCommand(controller, { name: "invalid", reason: "Bad command" }).message).toBe(
      "Bad command",
    );
    expect(executeCommand(controller, { name: "invalid" }).message).toBe("Invalid command.");
    expect(executeCommand(controller, { name: "unknown" as never }).message).toBe("Unhandled command.");
    expect(executeCommand(controller, { name: "exit" })).toEqual({
      message: "Exiting playground.",
      shouldExit: true,
    });
  });

  it("runs command with expected error handling", () => {
    const controller: ReduxController = new ReduxController();

    expect(runCommand(controller, "dispatch counter/increment {\"amount\":-1}").message).toContain(
      "Invalid payload",
    );

    expect(runCommand(controller, "dispatch not-supported {}").message).toContain(
      "Unsupported action type",
    );
  });

  it("returns fallback message for unknown runtime errors", () => {
    const controller = {
      dispatchAction: (): never => {
        throw new Error("Boom");
      },
    } as unknown as ReduxController;

    const result = runCommand(controller, "dispatch counter/set {\"value\":1}");
    expect(result.message).toBe("Unexpected error while executing command.");
    expect(result.shouldExit).toBe(false);
  });
});
