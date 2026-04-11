import { afterEach, describe, expect, it } from "vitest";

import { getRuntimeController, resetRuntimeController } from "../src/integration/registry";
import { registerStoresForMCP } from "../src/integration/register";
import { startReduxRuntimeServers, stopReduxRuntimeServers } from "../src/integration/runtime";
import { RegisteredStoresController } from "../src/integration/stores-controller";
import { reduxRuntimeController } from "../src/redux/runtime";

interface CounterState {
  value: number;
}

interface StoreAction {
  type: string;
  payload?: unknown;
}

const createCounterStore = () => {
  let state: CounterState = {
    value: 0,
  };

  return {
    store: {
      getState: (): CounterState => state,
      dispatch: (action: unknown): void => {
        const parsedAction: StoreAction = action as StoreAction;
        if (parsedAction.type === "set") {
          state = { value: Number(parsedAction.payload ?? 0) };
        }
        if (parsedAction.type === "increment") {
          state = { value: state.value + Number(parsedAction.payload ?? 0) };
        }
      },
    },
  };
};

describe("registerStoresForMCP and registered store runtime", () => {
  afterEach(() => {
    stopReduxRuntimeServers();
    resetRuntimeController();
    reduxRuntimeController.resetState();
  });

  it("registers stores and starts runtime automatically", async () => {
    const counter = createCounterStore();

    const runtimeHandle = registerStoresForMCP({
      stores: [
        {
          storeName: "app",
          store: counter.store,
        },
      ],
      runtime: {
        websocketPort: 9901,
      },
    });

    expect(runtimeHandle.websocketPort).toBe(9901);
    expect(getRuntimeController()).not.toBe(reduxRuntimeController);

    const socket = new WebSocket("ws://localhost:9901/redux-events");
    await new Promise<void>((resolve, reject) => {
      socket.onopen = (): void => resolve();
      socket.onerror = (): void => reject(new Error("WebSocket failed to open."));
    });

    const responsePromise = new Promise<{ requestId: string; data: { state: CounterState } }>((resolve) => {
      socket.onmessage = (event: MessageEvent<string>): void => {
        const parsed = JSON.parse(event.data) as { type: string; requestId?: string; data?: { state: CounterState } };
        if (parsed.type === "response" && parsed.requestId === "req-1") {
          resolve(parsed as { requestId: string; data: { state: CounterState } });
        }
      };
    });

    socket.send(
      JSON.stringify({
        type: "request",
        requestId: "req-1",
        action: "dispatch_action",
        payload: {
          type: "app/set",
          payload: 42,
        },
      }),
    );

    const response = await responsePromise;
    expect(response.data.state.value).toBe(42);
    socket.close();
  });

  it("resets to default runtime when stores list is empty", () => {
    registerStoresForMCP({
      stores: [],
      runtime: {
        websocketPort: 9902,
      },
    });

    expect(getRuntimeController()).toBe(reduxRuntimeController);
  });

  it("registered stores controller handles multi-store and fallback dispatch", () => {
    const firstStore = createCounterStore();
    const secondStore = createCounterStore();

    const controller = new RegisteredStoresController([
      {
        storeName: "first",
        store: firstStore.store,
      },
      {
        storeName: "second",
        store: secondStore.store,
      },
    ]);

    expect(controller.getAvailableActions()).toHaveLength(0);
    controller.dispatchAction({ type: "set", payload: 5, storeName: "first" });
    controller.dispatchAction({ type: "second/increment", payload: 7 });
    controller.dispatchAction({ type: "set", payload: 9, storeName: "first" });
    controller.dispatchAction({ type: "set", payload: 11 });
    controller.dispatchAction({ type: "raw_action", payload: 99, storeName: "first" });

    expect(controller.getState()).toEqual({
      first: { value: 11 },
      second: { value: 7 },
    });

    controller.resetState();
    expect(controller.getDispatchedActions()).toEqual([]);
    expect(controller.getState()).toEqual({
      first: { value: 11 },
      second: { value: 7 },
    });
  });

  it("throws for unsupported action when no stores are registered", () => {
    const controller = new RegisteredStoresController([]);
    expect(() => controller.dispatchAction({ type: "unknown" })).toThrowError("Unsupported action type: unknown");
  });

  it("throws for unknown store name dispatch", () => {
    const counter = createCounterStore();
    const controller = new RegisteredStoresController([
      {
        storeName: "app",
        store: counter.store,
      },
    ]);

    expect(() => controller.dispatchAction({ type: "set", storeName: "missing", payload: 1 })).toThrowError(
      "Unsupported action type: set",
    );
  });

  it("runtime start remains idempotent after registration", () => {
    const counter = createCounterStore();
    const registeredHandle = registerStoresForMCP({
      stores: [
        {
          storeName: "app",
          store: counter.store,
        },
      ],
      runtime: {
        websocketPort: 9903,
      },
    });
    getRuntimeController().dispatchAction({
      type: "set",
      payload: 12,
      storeName: "app",
    });

    const state = getRuntimeController().getState() as { value: number };
    expect(state.value).toBe(12);

    const secondHandle = startReduxRuntimeServers({
      websocketPort: 9909,
    });
    expect(secondHandle).toBe(registeredHandle);
  });
});
