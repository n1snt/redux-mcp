import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from "react";

import type {
  PlaygroundServerMessage,
  RequestMessage,
  ResponseMessage,
} from "../../src/integration/types";
import type { ActionDefinition, ActionHistoryEntry, AppActionType, DispatchRequest } from "../../src/redux/types";
import type { DispatchFormState, PlaygroundViewState } from "./playground.types";

const realtimeUrl: string = "ws://localhost:8788/redux-events";
const reconnectDelayMs: number = 1200;

const initialDispatchForm: DispatchFormState = {
  actionType: "counter/increment",
  payloadJson: '{ "amount": 1 }',
};

const initialViewState: PlaygroundViewState = {
  reduxState: {
    counter: { value: 0 },
    todos: { items: [] },
  },
  availableActions: [],
  dispatchedActions: [],
  feedback: "Connects to MCP websocket runtime on localhost:8788",
};

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

const parsePayload = (payloadJson: string): unknown => {
  if (payloadJson.trim().length === 0) {
    return undefined;
  }
  return JSON.parse(payloadJson);
};

const App = (): ReactElement => {
  const [dispatchForm, setDispatchForm] = useState<DispatchFormState>(initialDispatchForm);
  const [viewState, setViewState] = useState<PlaygroundViewState>(initialViewState);
  const socketRef = useRef<WebSocket | null>(null);
  const requestIndex = useRef<number>(0);
  const pendingRequests = useRef<
    Map<string, { resolve: (message: ResponseMessage) => void; reject: (error: Error) => void }>
  >(
    new Map<string, { resolve: (message: ResponseMessage) => void; reject: (error: Error) => void }>(),
  );

  const sendRequest = <TData extends ResponseMessage["data"]>(
    action: RequestMessage["action"],
    args: Partial<RequestMessage> = {},
  ): Promise<TData> => {
    return new Promise<TData>((resolve, reject) => {
      const socket: WebSocket | null = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        reject(new Error("Websocket is not connected yet."));
        return;
      }

      requestIndex.current += 1;
      const requestId: string = `req-${requestIndex.current}`;
      pendingRequests.current.set(requestId, {
        resolve: (message: ResponseMessage) => {
          resolve(message.data as TData);
        },
        reject,
      });

      const requestPayload: RequestMessage = {
        type: "request",
        requestId,
        action,
        ...args,
      };

      socket.send(JSON.stringify(requestPayload));

      setTimeout(() => {
        if (pendingRequests.current.has(requestId)) {
          pendingRequests.current.delete(requestId);
          reject(new Error(`Request timeout: ${action}`));
        }
      }, 5000);
    });
  };

  const refreshData = async (feedbackMessage: string): Promise<void> => {
    try {
      const [stateData, actionsData] = await Promise.all([
        sendRequest<{ state: PlaygroundViewState["reduxState"] }>("get_state"),
        sendRequest<{ availableActions: ActionDefinition[]; dispatchedActions: ActionHistoryEntry[] }>("get_actions"),
      ]);
      setViewState({
        reduxState: stateData.state,
        availableActions: actionsData.availableActions,
        dispatchedActions: actionsData.dispatchedActions,
        feedback: feedbackMessage,
      });
    } catch (error: unknown) {
      setViewState((previousState: PlaygroundViewState) => ({
        ...previousState,
        feedback: error instanceof Error ? error.message : "Refresh failed.",
      }));
    }
  };

  useEffect(() => {
    let isUnmounted: boolean = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;
    let currentSocket: WebSocket | null = null;

    const connect = (): void => {
      if (isUnmounted) {
        return;
      }

      const socket: WebSocket = new WebSocket(realtimeUrl);
      currentSocket = socket;
      socketRef.current = socket;

      socket.onmessage = (event: MessageEvent<string>): void => {
        try {
          const parsedMessage: PlaygroundServerMessage = JSON.parse(event.data) as PlaygroundServerMessage;
          if (parsedMessage.type === "state_changed") {
            setViewState((previousState: PlaygroundViewState) => ({
              ...previousState,
              reduxState: parsedMessage.state,
              dispatchedActions: parsedMessage.dispatchedActions,
              feedback: "Live update received.",
            }));
            return;
          }

          if (parsedMessage.type === "response") {
            const requestEntry = pendingRequests.current.get(parsedMessage.requestId);
            if (requestEntry) {
              pendingRequests.current.delete(parsedMessage.requestId);
              requestEntry.resolve(parsedMessage);
            }
            return;
          }

          if (parsedMessage.type === "error") {
            if (parsedMessage.requestId) {
              const requestEntry = pendingRequests.current.get(parsedMessage.requestId);
              pendingRequests.current.delete(parsedMessage.requestId);
              requestEntry?.reject(new Error(parsedMessage.error));
            }
            setViewState((previousState: PlaygroundViewState) => ({
              ...previousState,
              feedback: parsedMessage.error,
            }));
          }
        } catch {
          setViewState((previousState: PlaygroundViewState) => ({
            ...previousState,
            feedback: "Invalid realtime message.",
          }));
        }
      };

      socket.onopen = (): void => {
        setViewState((previousState: PlaygroundViewState) => ({
          ...previousState,
          feedback: "Realtime websocket connected.",
        }));
        void refreshData("Connected.");
      };

      socket.onerror = (): void => {
        setViewState((previousState: PlaygroundViewState) => ({
          ...previousState,
          feedback: "Realtime websocket connection error. Retrying...",
        }));
      };

      socket.onclose = (): void => {
        if (isUnmounted) {
          return;
        }

        setViewState((previousState: PlaygroundViewState) => ({
          ...previousState,
          feedback: "Realtime websocket disconnected. Reconnecting...",
        }));

        reconnectTimer = setTimeout(() => {
          connect();
        }, reconnectDelayMs);
      };
    };

    // Avoid creating a socket in StrictMode's first throwaway mount cycle.
    connectTimer = setTimeout(() => {
      connect();
    }, 0);

    return () => {
      isUnmounted = true;
      if (connectTimer) {
        clearTimeout(connectTimer);
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      pendingRequests.current.clear();
      socketRef.current = null;
      currentSocket?.close();
    };
  }, []);

  const updateActionType = (event: ChangeEvent<HTMLSelectElement>): void => {
    const actionType: AppActionType = event.target.value as AppActionType;
    setDispatchForm((previousValue: DispatchFormState) => ({
      ...previousValue,
      actionType,
    }));
  };

  const updatePayload = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setDispatchForm((previousValue: DispatchFormState) => ({
      ...previousValue,
      payloadJson: event.target.value,
    }));
  };

  const refreshState = (): void => {
    void refreshData("State refreshed.");
  };

  const resetState = async (): Promise<void> => {
    try {
      const resetResponse = await sendRequest<{ state: PlaygroundViewState["reduxState"] }>("reset_state");
      const actionsResponse =
        await sendRequest<{ availableActions: ActionDefinition[]; dispatchedActions: ActionHistoryEntry[] }>(
          "get_actions",
        );
      setViewState({
        reduxState: resetResponse.state,
        availableActions: actionsResponse.availableActions,
        dispatchedActions: actionsResponse.dispatchedActions,
        feedback: "State reset.",
      });
    } catch (error: unknown) {
      const errorMessage: string = error instanceof Error ? error.message : "Unknown reset error.";
      setViewState((previousState: PlaygroundViewState) => ({
        ...previousState,
        feedback: `Reset failed: ${errorMessage}`,
      }));
    }
  };

  const dispatchAction = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      const payload: unknown = parsePayload(dispatchForm.payloadJson);
      const dispatchResponse = await sendRequest<{ state: PlaygroundViewState["reduxState"] }>("dispatch_action", {
        payload: {
          type: dispatchForm.actionType,
          payload,
        } satisfies DispatchRequest,
      });
      const actionsResponse =
        await sendRequest<{ availableActions: ActionDefinition[]; dispatchedActions: ActionHistoryEntry[] }>(
          "get_actions",
        );
      setViewState({
        reduxState: dispatchResponse.state,
        availableActions: actionsResponse.availableActions,
        dispatchedActions: actionsResponse.dispatchedActions,
        feedback: `Dispatched ${dispatchForm.actionType}. Waiting for websocket sync.`,
      });
    } catch (error: unknown) {
      if (error instanceof SyntaxError) {
        setViewState((previousState: PlaygroundViewState) => ({
          ...previousState,
          feedback: "Payload JSON is invalid.",
        }));
        return;
      }

      setViewState((previousState: PlaygroundViewState) => ({
        ...previousState,
        feedback: error instanceof Error ? error.message : "Unexpected error while dispatching action.",
      }));
    }
  };

  const availableActions = useMemo(() => viewState.availableActions, [viewState.availableActions]);
  const dispatchedActions = useMemo(() => viewState.dispatchedActions, [viewState.dispatchedActions]);

  return (
    <main>
      <h1>Redux MCP Playground</h1>
      <p>Use this React app to inspect and dispatch actions against shared MCP runtime state.</p>

      <section>
        <h2>Dispatch Action</h2>
        <form onSubmit={(event: FormEvent<HTMLFormElement>) => void dispatchAction(event)}>
          <label htmlFor="actionType">Action type</label>
          <select id="actionType" value={dispatchForm.actionType} onChange={updateActionType}>
            {availableActions.map((action) => (
              <option key={action.type} value={action.type}>
                {action.type}
              </option>
            ))}
          </select>

          <label htmlFor="payloadJson">Payload JSON</label>
          <textarea id="payloadJson" value={dispatchForm.payloadJson} onChange={updatePayload} rows={6} />
          <button type="submit">Dispatch</button>
        </form>
      </section>

      <section>
        <h2>State Controls</h2>
        <button type="button" onClick={refreshState}>
          Refresh
        </button>
        <button type="button" onClick={() => void resetState()}>
          Reset
        </button>
      </section>

      <section>
        <h2>Status</h2>
        <pre>{viewState.feedback}</pre>
      </section>

      <section>
        <h2>Redux State</h2>
        <pre>{formatJson(viewState.reduxState)}</pre>
      </section>

      <section>
        <h2>Available Actions</h2>
        <pre>{formatJson(availableActions)}</pre>
      </section>

      <section>
        <h2>Dispatched Actions</h2>
        <pre>{formatJson(dispatchedActions)}</pre>
      </section>
    </main>
  );
};

export default App;
