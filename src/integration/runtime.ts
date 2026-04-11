import type {
  ErrorMessage,
  PlaygroundServerMessage,
  RequestMessage,
  ResponseMessage,
  ReduxRuntimeHandle,
  RuntimeStartOptions,
  StateChangedMessage,
} from "./types";
import { getRuntimeController } from "./registry";
import type { RuntimeController } from "../redux/runtime-controller.types";

const defaultWebsocketPort: number = 8788;
const defaultWebsocketPathname: string = "/redux-events";
const defaultRuntimeStartOptions: Required<RuntimeStartOptions> = {
  websocketPort: defaultWebsocketPort,
  websocketPathname: defaultWebsocketPathname,
};

let runtimeHandle: ReduxRuntimeHandle | null = null;
let wrappedController: RuntimeController | null = null;
let websocketClients: Set<Bun.ServerWebSocket<unknown>> | null = null;

const broadcastState = (): void => {
  if (!websocketClients) {
    return;
  }

  const payload: StateChangedMessage = {
    type: "state_changed",
    state: getRuntimeController().getState(),
    dispatchedActions: getRuntimeController().getDispatchedActions(),
  };

  const serializedPayload: string = JSON.stringify(payload);
  websocketClients.forEach((socket: Bun.ServerWebSocket<unknown>): void => {
    socket.send(serializedPayload);
  });
};

const wrapControllerForRealtimeBroadcast = (): void => {
  const runtimeController = getRuntimeController();
  if (wrappedController === runtimeController) {
    return;
  }

  const originalDispatch = runtimeController.dispatchAction.bind(runtimeController);
  const originalReset = runtimeController.resetState.bind(runtimeController);

  runtimeController.dispatchAction = (request): unknown => {
    const updatedState: unknown = originalDispatch(request);
    broadcastState();
    return updatedState;
  };

  runtimeController.resetState = (): unknown => {
    const updatedState: unknown = originalReset();
    broadcastState();
    return updatedState;
  };

  wrappedController = runtimeController;
};

const toErrorPayload = (error: unknown, requestId?: string): ErrorMessage => ({
  type: "error",
  requestId,
  error: `${error}`,
});

const isRequestMessage = (value: unknown): value is RequestMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate: Partial<RequestMessage> = value as Partial<RequestMessage>;
  return (
    candidate.type === "request" &&
    typeof candidate.requestId === "string" &&
    typeof candidate.action === "string"
  );
};

const handleRequestMessage = (request: RequestMessage): ResponseMessage => {
  const runtimeController = getRuntimeController();
  switch (request.action) {
    case "get_state":
      return {
        type: "response",
        requestId: request.requestId,
        data: {
          state: runtimeController.getState(),
        },
      };
    case "get_actions":
      return {
        type: "response",
        requestId: request.requestId,
        data: {
          availableActions: runtimeController.getAvailableActions(),
          dispatchedActions: request.includeHistory === false ? [] : runtimeController.getDispatchedActions(),
        },
      };
    case "dispatch_action":
      if (!request.payload) {
        throw new Error("dispatch_action requires payload.");
      }
      return {
        type: "response",
        requestId: request.requestId,
        data: {
          state: runtimeController.dispatchAction(request.payload),
        },
      };
    case "reset_state":
      return {
        type: "response",
        requestId: request.requestId,
        data: {
          state: runtimeController.resetState(),
        },
      };
    default:
      throw new Error("Unsupported request action.");
  }
};

export const startReduxRuntimeServers = (options: RuntimeStartOptions = {}): ReduxRuntimeHandle => {
  if (runtimeHandle) {
    return runtimeHandle;
  }

  const resolvedOptions: Required<RuntimeStartOptions> = {
    ...defaultRuntimeStartOptions,
    ...options,
  };
  const { websocketPort, websocketPathname } = resolvedOptions;

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
        const runtimeController = getRuntimeController();
        socket.send(
          JSON.stringify({
            type: "state_changed",
            state: runtimeController.getState(),
            dispatchedActions: runtimeController.getDispatchedActions(),
          } satisfies StateChangedMessage),
        );
      },
      close: (socket: Bun.ServerWebSocket<unknown>): void => {
        websocketClients?.delete(socket);
      },
      message: (socket: Bun.ServerWebSocket<unknown>, rawMessage: string | ArrayBuffer | Uint8Array): void => {
        const messageText: string =
          typeof rawMessage === "string"
            ? rawMessage
            : new TextDecoder().decode(rawMessage as ArrayBufferLike);

        let parsedMessage: unknown;
        try {
          parsedMessage = JSON.parse(messageText);
        } catch (error: unknown) {
          socket.send(JSON.stringify(toErrorPayload(error)));
          return;
        }

        if (!isRequestMessage(parsedMessage)) {
          socket.send(JSON.stringify(toErrorPayload(new Error("Invalid request message."))));
          return;
        }

        try {
          const response: ResponseMessage = handleRequestMessage(parsedMessage);
          socket.send(JSON.stringify(response satisfies PlaygroundServerMessage));
        } catch (error: unknown) {
          socket.send(JSON.stringify(toErrorPayload(error, parsedMessage.requestId)));
        }
      },
    },
  });

  runtimeHandle = {
    websocketPort,
    websocketPathname,
    stop: (): void => {
      websocketServer.stop(true);
      websocketClients = null;
      runtimeHandle = null;
    },
  };

  return runtimeHandle;
};

export const stopReduxRuntimeServers = (): void => {
  runtimeHandle?.stop();
  runtimeHandle = null;
};
