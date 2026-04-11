import { reduxRuntimeController } from "../redux/runtime";
import type { RootState } from "../redux/types";
import type {
  ErrorMessage,
  PlaygroundServerMessage,
  RequestMessage,
  ResponseMessage,
  ReduxRuntimeHandle,
  RuntimeStartOptions,
  StateChangedMessage,
} from "./types";

const defaultWebsocketPort: number = 8788;
const defaultWebsocketPathname: string = "/redux-events";
const defaultRuntimeStartOptions: Required<RuntimeStartOptions> = {
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

  const payload: StateChangedMessage = {
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
  switch (request.action) {
    case "get_state":
      return {
        type: "response",
        requestId: request.requestId,
        data: {
          state: reduxRuntimeController.getState(),
        },
      };
    case "get_actions":
      return {
        type: "response",
        requestId: request.requestId,
        data: {
          availableActions: reduxRuntimeController.getAvailableActions(),
          dispatchedActions:
            request.includeHistory === false ? [] : reduxRuntimeController.getDispatchedActions(),
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
          state: reduxRuntimeController.dispatchAction(request.payload),
        },
      };
    case "reset_state":
      return {
        type: "response",
        requestId: request.requestId,
        data: {
          state: reduxRuntimeController.resetState(),
        },
      };
    default:
      throw new Error("Unsupported request action.");
  }
};

export const startReduxRuntimeServers = (options: RuntimeStartOptions): ReduxRuntimeHandle => {
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
        socket.send(
          JSON.stringify({
            type: "state_changed",
            state: reduxRuntimeController.getState(),
            dispatchedActions: reduxRuntimeController.getDispatchedActions(),
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
