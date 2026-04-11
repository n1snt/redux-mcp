import { afterEach, describe, expect, it } from "vitest";

import { resetRuntimeController } from "../src/integration/registry";
import { reduxRuntimeController } from "../src/redux/runtime";
import { startReduxRuntimeServers } from "../src/integration/runtime";
import type { RequestMessage, ReduxRuntimeHandle, StateChangedMessage } from "../src/integration/types";

const waitForWebSocketOpen = (socket: WebSocket): Promise<void> =>
  new Promise((resolve: () => void, reject: (reason?: unknown) => void) => {
    socket.onopen = (): void => resolve();
    socket.onerror = (): void => reject(new Error("WebSocket failed to open."));
  });

const waitForWebSocketMessage = (socket: WebSocket): Promise<unknown> =>
  new Promise((resolve: (value: unknown) => void, reject: (reason?: unknown) => void) => {
    socket.onmessage = (event: MessageEvent<string>): void => {
      resolve(JSON.parse(event.data) as unknown);
    };
    socket.onerror = (): void => reject(new Error("WebSocket message failed."));
  });

const waitForWebSocketClose = (socket: WebSocket): Promise<void> =>
  new Promise((resolve: () => void) => {
    socket.onclose = (): void => resolve();
  });

const waitForMatchingMessage = async <TMessage>(
  socket: WebSocket,
  matcher: (message: unknown) => message is TMessage,
): Promise<TMessage> => {
  while (true) {
    const nextMessage: unknown = await waitForWebSocketMessage(socket);
    if (matcher(nextMessage)) {
      return nextMessage;
    }
  }
};

describe("startReduxRuntimeServers", () => {
  let handle: ReduxRuntimeHandle | null = null;

  afterEach(() => {
    if (handle) {
      handle.stop();
      handle = null;
    }
    resetRuntimeController();
    reduxRuntimeController.resetState();
  });

  it("starts runtime servers and broadcasts websocket updates", async () => {
    handle = startReduxRuntimeServers({
      websocketPort: 9892,
    });

    const secondHandle = startReduxRuntimeServers();
    expect(secondHandle).toBe(handle);

    const notFoundResponse = await fetch("http://localhost:9892/wrong-path");
    expect(notFoundResponse.status).toBe(404);

    const socket = new WebSocket("ws://localhost:9892/redux-events");
    await waitForWebSocketOpen(socket);
    const initialMessage = (await waitForWebSocketMessage(socket)) as StateChangedMessage;
    expect(initialMessage.type).toBe("state_changed");

    socket.send("noop");
    const invalidMessage = (await waitForMatchingMessage(
      socket,
      (message: unknown): message is { type: string } =>
        Boolean(message) && typeof message === "object" && (message as { type?: string }).type === "error",
    )) as { type: string };
    expect(invalidMessage.type).toBe("error");

    socket.send("1");
    const nonObjectError = (await waitForMatchingMessage(
      socket,
      (message: unknown): message is { type: string; error: string } =>
        Boolean(message) &&
        typeof message === "object" &&
        (message as { type?: string }).type === "error" &&
        (message as { error?: string }).error === "Error: Invalid request message.",
    )) as { type: string; error: string };
    expect(nonObjectError.error).toBe("Error: Invalid request message.");

    socket.send(JSON.stringify({ foo: "bar" }));
    const malformedRequestError = (await waitForMatchingMessage(
      socket,
      (message: unknown): message is { type: string; error: string } =>
        Boolean(message) &&
        typeof message === "object" &&
        (message as { type?: string }).type === "error" &&
        (message as { error?: string }).error === "Error: Invalid request message.",
    )) as { type: string; error: string };
    expect(malformedRequestError.error).toBe("Error: Invalid request message.");

    const stateRequest: RequestMessage = {
      type: "request",
      requestId: "1",
      action: "get_state",
    };
    socket.send(JSON.stringify(stateRequest));
    const stateResponse = (await waitForMatchingMessage(
      socket,
      (
        message: unknown,
      ): message is { type: string; requestId: string; data: { state: { counter: { value: number } } } } =>
        Boolean(message) &&
        typeof message === "object" &&
        (message as { type?: string }).type === "response" &&
        (message as { requestId?: string }).requestId === "1",
    )) as { type: string; requestId: string; data: { state: { counter: { value: number } } } };
    expect(stateResponse.type).toBe("response");
    expect(stateResponse.requestId).toBe("1");
    expect(stateResponse.data.state.counter.value).toBe(0);

    const getActionsRequest: RequestMessage = {
      type: "request",
      requestId: "2",
      action: "get_actions",
      includeHistory: false,
    };
    socket.send(JSON.stringify(getActionsRequest));
    const getActionsResponse = (await waitForMatchingMessage(
      socket,
      (
        message: unknown,
      ): message is { type: string; requestId: string; data: { dispatchedActions: unknown[] } } =>
        Boolean(message) &&
        typeof message === "object" &&
        (message as { type?: string }).type === "response" &&
        (message as { requestId?: string }).requestId === "2",
    )) as { type: string; requestId: string; data: { dispatchedActions: unknown[] } };
    expect(getActionsResponse.data.dispatchedActions).toEqual([]);

    const getActionsWithHistoryRequest: RequestMessage = {
      type: "request",
      requestId: "2b",
      action: "get_actions",
      includeHistory: true,
    };
    socket.send(JSON.stringify(getActionsWithHistoryRequest));
    const getActionsWithHistoryResponse = (await waitForMatchingMessage(
      socket,
      (
        message: unknown,
      ): message is { type: string; requestId: string; data: { availableActions: unknown[] } } =>
        Boolean(message) &&
        typeof message === "object" &&
        (message as { type?: string }).type === "response" &&
        (message as { requestId?: string }).requestId === "2b",
    )) as { type: string; requestId: string; data: { availableActions: unknown[] } };
    expect(getActionsWithHistoryResponse.data.availableActions.length).toBeGreaterThan(0);

    const dispatchWithoutPayloadRequest = {
      type: "request",
      requestId: "3",
      action: "dispatch_action",
    };
    socket.send(JSON.stringify(dispatchWithoutPayloadRequest));
    const dispatchWithoutPayloadError = (await waitForMatchingMessage(
      socket,
      (
        message: unknown,
      ): message is { type: string; requestId: string; error: string } =>
        Boolean(message) &&
        typeof message === "object" &&
        (message as { type?: string }).type === "error" &&
        (message as { requestId?: string }).requestId === "3",
    )) as { type: string; requestId: string; error: string };
    expect(dispatchWithoutPayloadError.error).toContain("requires payload");

    const unsupportedActionRequest = {
      type: "request",
      requestId: "4",
      action: "unknown_action",
    };
    socket.send(JSON.stringify(unsupportedActionRequest));
    const unsupportedActionError = (await waitForMatchingMessage(
      socket,
      (
        message: unknown,
      ): message is { type: string; requestId: string; error: string } =>
        Boolean(message) &&
        typeof message === "object" &&
        (message as { type?: string }).type === "error" &&
        (message as { requestId?: string }).requestId === "4",
    )) as { type: string; requestId: string; error: string };
    expect(unsupportedActionError.error).toContain("Unsupported request action");

    socket.send(new Uint8Array([123, 125]));
    const binaryInvalidRequestError = (await waitForMatchingMessage(
      socket,
      (message: unknown): message is { type: string; error: string } =>
        Boolean(message) &&
        typeof message === "object" &&
        (message as { type?: string }).type === "error" &&
        (message as { error?: string }).error === "Error: Invalid request message.",
    )) as { type: string; error: string };
    expect(binaryInvalidRequestError.error).toBe("Error: Invalid request message.");

    const dispatchRequest: RequestMessage = {
      type: "request",
      requestId: "5",
      action: "dispatch_action",
      payload: {
        type: "counter/set",
        payload: { value: 121 },
      },
    };
    socket.send(JSON.stringify(dispatchRequest));
    const dispatchResponse = (await waitForMatchingMessage(
      socket,
      (
        message: unknown,
      ): message is { type: string; requestId: string; data: { state: { counter: { value: number } } } } =>
        Boolean(message) &&
        typeof message === "object" &&
        (message as { type?: string }).type === "response" &&
        (message as { requestId?: string }).requestId === "5",
    )) as { type: string; requestId: string; data: { state: { counter: { value: number } } } };
    expect(dispatchResponse.data.state.counter.value).toBe(121);

    reduxRuntimeController.dispatchAction({
      type: "counter/set",
      payload: { value: 123 },
    });
    const updateMessage = (await waitForWebSocketMessage(socket)) as StateChangedMessage;
    const updateState = updateMessage.state as { counter: { value: number } };
    expect(updateState.counter.value).toBe(123);
    socket.close();
    await waitForWebSocketClose(socket);
  });

  it("can be restarted after stop", async () => {
    handle = startReduxRuntimeServers({
      websocketPort: 9894,
      websocketPathname: "/custom-events",
    });
    handle.stop();
    handle = null;

    reduxRuntimeController.dispatchAction({
      type: "counter/set",
      payload: { value: 10 },
    });

    handle = startReduxRuntimeServers({
      websocketPort: 9896,
      websocketPathname: "/custom-events",
    });
    const socket = new WebSocket("ws://localhost:9896/custom-events");
    await waitForWebSocketOpen(socket);
    socket.close();
    await waitForWebSocketClose(socket);
  });

  it("handles reset_state websocket request", async () => {
    reduxRuntimeController.dispatchAction({
      type: "counter/set",
      payload: { value: 50 },
    });

    handle = startReduxRuntimeServers({
      websocketPort: 9897,
    });

    const socket = new WebSocket("ws://localhost:9897/redux-events");
    await waitForWebSocketOpen(socket);
    await waitForWebSocketMessage(socket);

    const resetRequest: RequestMessage = {
      type: "request",
      requestId: "6",
      action: "reset_state",
    };
    socket.send(JSON.stringify(resetRequest));

    const resetResponse = (await waitForMatchingMessage(
      socket,
      (
        message: unknown,
      ): message is { type: string; requestId: string; data: { state: { counter: { value: number } } } } =>
        Boolean(message) &&
        typeof message === "object" &&
        (message as { type?: string }).type === "response" &&
        (message as { requestId?: string }).requestId === "6",
    )) as { type: string; requestId: string; data: { state: { counter: { value: number } } } };
    expect(resetResponse.data.state.counter.value).toBe(0);

    socket.close();
    await waitForWebSocketClose(socket);
  });
});
