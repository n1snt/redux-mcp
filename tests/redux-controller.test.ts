import { describe, expect, it } from "vitest";

import {
  InvalidActionPayloadError,
  ReduxController,
  UnsupportedActionError,
} from "../src/redux/controller";
import { incrementPayloadSchema } from "../src/redux/schemas";

describe("ReduxController", () => {
  it("returns initial state", () => {
    const controller: ReduxController = new ReduxController();
    expect(controller.getState()).toEqual({
      counter: { value: 0 },
      todos: { items: [] },
    });
  });

  it("returns available actions metadata", () => {
    const controller: ReduxController = new ReduxController();
    expect(controller.getAvailableActions()).toHaveLength(5);
  });

  it("dispatches counter actions", () => {
    const controller: ReduxController = new ReduxController();
    controller.dispatchAction({ type: "counter/increment", payload: { amount: 5 } });
    controller.dispatchAction({ type: "counter/decrement", payload: { amount: 3 } });
    controller.dispatchAction({ type: "counter/set", payload: { value: 10 } });

    expect(controller.getState().counter.value).toBe(10);
    expect(controller.getDispatchedActions()).toHaveLength(3);
  });

  it("dispatches todo actions", () => {
    const controller: ReduxController = new ReduxController();
    controller.dispatchAction({ type: "todos/add", payload: { id: "1", text: "First" } });
    controller.dispatchAction({ type: "todos/toggle", payload: { id: "1" } });
    controller.dispatchAction({ type: "todos/toggle", payload: { id: "missing" } });

    expect(controller.getState().todos.items).toEqual([{ id: "1", text: "First", done: true }]);
  });

  it("resets state and action history", () => {
    const controller: ReduxController = new ReduxController();
    controller.dispatchAction({ type: "counter/increment", payload: { amount: 2 } });
    controller.dispatchAction({ type: "todos/add", payload: { id: "1", text: "Task" } });
    const resetState = controller.resetState();

    expect(resetState).toEqual({
      counter: { value: 0 },
      todos: { items: [] },
    });
    expect(controller.getDispatchedActions()).toEqual([]);
  });

  it("throws for invalid payload", () => {
    const controller: ReduxController = new ReduxController();
    expect(() =>
      controller.dispatchAction({ type: "counter/increment", payload: { amount: -1 } }),
    ).toThrowError(InvalidActionPayloadError);
  });

  it("throws for unsupported action type", () => {
    const controller: ReduxController = new ReduxController();
    expect(() =>
      controller.dispatchAction({ type: "counter/not-real" as never, payload: {} }),
    ).toThrowError(UnsupportedActionError);
  });

  it("rethrows unknown validation failures", () => {
    const controller: ReduxController = new ReduxController();
    const originalParse = incrementPayloadSchema.parse.bind(incrementPayloadSchema);

    try {
      (incrementPayloadSchema as { parse: (input: unknown) => unknown }).parse = (): never => {
        throw new Error("Unexpected parser failure");
      };

      expect(() =>
        controller.dispatchAction({ type: "counter/increment", payload: { amount: 1 } }),
      ).toThrowError("Unexpected parser failure");
    } finally {
      (incrementPayloadSchema as { parse: (input: unknown) => unknown }).parse = originalParse;
    }
  });
});
