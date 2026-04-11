import { afterEach, describe, expect, it } from "vitest";

import { reduxRuntimeController } from "../src/redux/runtime";
import { startReduxRuntimeServers } from "../src/integration/runtime";
import type { PlaygroundRealtimeMessage, ReduxRuntimeHandle } from "../src/integration/types";

const waitForWebSocketOpen = (socket: WebSocket): Promise<void> =>
  new Promise((resolve: () => void, reject: (reason?: unknown) => void) => {
    socket.onopen = (): void => resolve();
    socket.onerror = (): void => reject(new Error("WebSocket failed to open."));
  });

const waitForWebSocketMessage = (socket: WebSocket): Promise<PlaygroundRealtimeMessage> =>
  new Promise((resolve: (value: PlaygroundRealtimeMessage) => void, reject: (reason?: unknown) => void) => {
    socket.onmessage = (event: MessageEvent<string>): void => {
      resolve(JSON.parse(event.data) as PlaygroundRealtimeMessage);
    };
    socket.onerror = (): void => reject(new Error("WebSocket message failed."));
  });

const waitForWebSocketClose = (socket: WebSocket): Promise<void> =>
  new Promise((resolve: () => void) => {
    socket.onclose = (): void => resolve();
  });

describe("startReduxRuntimeServers", () => {
  let handle: ReduxRuntimeHandle | null = null;

  afterEach(() => {
    if (handle) {
      handle.stop();
      handle = null;
    }
    reduxRuntimeController.resetState();
  });

  it("starts runtime servers and broadcasts websocket updates", async () => {
    handle = startReduxRuntimeServers({
      apiPort: 9891,
      websocketPort: 9892,
    });

    const secondHandle = startReduxRuntimeServers({
      apiPort: 9991,
      websocketPort: 9992,
    });
    expect(secondHandle).toBe(handle);

    const healthResponse = await fetch("http://localhost:9891/health");
    expect(healthResponse.status).toBe(200);

    const notFoundResponse = await fetch("http://localhost:9892/wrong-path");
    expect(notFoundResponse.status).toBe(404);

    const socket = new WebSocket("ws://localhost:9892/redux-events");
    await waitForWebSocketOpen(socket);
    const initialMessage = await waitForWebSocketMessage(socket);
    expect(initialMessage.type).toBe("state_changed");
    socket.send("noop");

    reduxRuntimeController.dispatchAction({
      type: "counter/set",
      payload: { value: 123 },
    });
    const updateMessage = await waitForWebSocketMessage(socket);
    expect(updateMessage.state.counter.value).toBe(123);
    socket.close();
    await waitForWebSocketClose(socket);
  });

  it("can be restarted after stop", async () => {
    handle = startReduxRuntimeServers({
      apiPort: 9893,
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
      apiPort: 9895,
      websocketPort: 9896,
      websocketPathname: "/custom-events",
    });
    const healthResponse = await fetch("http://localhost:9895/health");
    expect(healthResponse.status).toBe(200);
  });
});
