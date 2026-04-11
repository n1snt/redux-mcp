import { describe, expect, it } from "vitest";

import { ReduxController } from "../src/redux/controller";
import {
  handleDispatchAction,
  handleGetActions,
  handleGetState,
  handleResetState,
} from "../src/mcp/handlers";

describe("MCP handlers", () => {
  it("returns current state payload", () => {
    const controller: ReduxController = new ReduxController();
    const response = handleGetState(controller);
    const state = response.structuredContent.state as { counter: { value: number } };

    expect(state.counter.value).toBe(0);
    expect(response.content[0]?.text).toContain("Redux state");
  });

  it("returns available actions and history by default", () => {
    const controller: ReduxController = new ReduxController();
    controller.dispatchAction({ type: "counter/increment", payload: { amount: 1 } });

    const response = handleGetActions(controller, {});

    expect(response.structuredContent.availableActions).toHaveLength(5);
    expect(response.structuredContent.dispatchedActions).toHaveLength(1);
  });

  it("returns empty history when includeHistory is false", () => {
    const controller: ReduxController = new ReduxController();
    controller.dispatchAction({ type: "counter/increment", payload: { amount: 1 } });

    const response = handleGetActions(controller, { includeHistory: false });

    expect(response.structuredContent.dispatchedActions).toEqual([]);
  });

  it("dispatches action and returns state", () => {
    const controller: ReduxController = new ReduxController();

    const response = handleDispatchAction(controller, {
      type: "counter/set",
      payload: { value: 42 },
    });
    const state = response.structuredContent.state as { counter: { value: number } };

    expect(state.counter.value).toBe(42);
    expect(response.structuredContent.dispatchedAction.type).toBe("counter/set");
  });

  it("resets state", () => {
    const controller: ReduxController = new ReduxController();
    controller.dispatchAction({ type: "counter/increment", payload: { amount: 7 } });

    const response = handleResetState(controller);
    const state = response.structuredContent.state as { counter: { value: number } };
    expect(state.counter.value).toBe(0);
  });
});
