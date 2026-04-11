import { createPlaygroundApiServer } from "../playground-api/server";
import { reduxRuntimeController } from "../redux/runtime";
import type { RootState } from "../redux/types";
import type { PlaygroundRealtimeMessage, ReduxRuntimeHandle, RuntimeStartOptions } from "./types";

const defaultApiPort: number = 8787;
const defaultWebsocketPort: number = 8788;
const defaultWebsocketPathname: string = "/redux-events";
const defaultRuntimeStartOptions: Required<RuntimeStartOptions> = {
  apiPort: defaultApiPort,
  websocketPort: defaultWebsocketPort,
  websocketPathname: defaultWebsocketPathname,
};

let runtimeHandle: ReduxRuntimeHandle | null = null;
let didWrapController: boolean = false;
let websocketClients: Set<Bun.ServerWebSocket<unknown>> | null = null;

const broadcastState = (): void => {
  if (!websocketClients) {
    return;
  }

  const payload: PlaygroundRealtimeMessage = {
    type: "state_changed",
    state: reduxRuntimeController.getState(),
    dispatchedActions: reduxRuntimeController.getDispatchedActions(),
  };

  const serializedPayload: string = JSON.stringify(payload);
  websocketClients.forEach((socket: Bun.ServerWebSocket<unknown>): void => {
    socket.send(serializedPayload);
  });
};

const wrapControllerForRealtimeBroadcast = (): void => {
  if (didWrapController) {
    return;
  }

  const originalDispatch = reduxRuntimeController.dispatchAction.bind(reduxRuntimeController);
  const originalReset = reduxRuntimeController.resetState.bind(reduxRuntimeController);

  reduxRuntimeController.dispatchAction = (request): RootState => {
    const updatedState: RootState = originalDispatch(request);
    broadcastState();
    return updatedState;
  };

  reduxRuntimeController.resetState = (): RootState => {
    const updatedState: RootState = originalReset();
    broadcastState();
    return updatedState;
  };

  didWrapController = true;
};

export const startReduxRuntimeServers = (options: RuntimeStartOptions): ReduxRuntimeHandle => {
  if (runtimeHandle) {
    return runtimeHandle;
  }

  const resolvedOptions: Required<RuntimeStartOptions> = {
    ...defaultRuntimeStartOptions,
    ...options,
  };
  const { apiPort, websocketPort, websocketPathname } = resolvedOptions;

  const apiServer: Bun.Server<unknown> = createPlaygroundApiServer(reduxRuntimeController, apiPort);
  websocketClients = new Set<Bun.ServerWebSocket<unknown>>();
  wrapControllerForRealtimeBroadcast();

  const websocketServer: Bun.Server<unknown> = Bun.serve({
    port: websocketPort,
    fetch: (request: Request, server: Bun.Server<unknown>): Response | undefined => {
      const url: URL = new URL(request.url);
      if (url.pathname === websocketPathname && server.upgrade(request, { data: undefined })) {
        return undefined;
      }
      return new Response("Not found", { status: 404 });
    },
    websocket: {
      open: (socket: Bun.ServerWebSocket<unknown>): void => {
        websocketClients?.add(socket);
        socket.send(
          JSON.stringify({
            type: "state_changed",
            state: reduxRuntimeController.getState(),
            dispatchedActions: reduxRuntimeController.getDispatchedActions(),
          } satisfies PlaygroundRealtimeMessage),
        );
      },
      close: (socket: Bun.ServerWebSocket<unknown>): void => {
        websocketClients?.delete(socket);
      },
      message: (): void => {},
    },
  });

  runtimeHandle = {
    apiPort,
    websocketPort,
    websocketPathname,
    stop: (): void => {
      websocketServer.stop(true);
      apiServer.stop(true);
      websocketClients = null;
      runtimeHandle = null;
    },
  };

  return runtimeHandle;
};
