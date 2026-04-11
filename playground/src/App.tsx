import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactElement } from "react";

import type { AppActionType, DispatchRequest } from "../../src/redux/types";
import type {
  ActionsResponse,
  DispatchResponse,
  ErrorResponse,
  ResetResponse,
  StateResponse,
} from "../../src/playground-api/types";
import type { DispatchFormState, PlaygroundViewState } from "./playground.types";

const apiBaseUrl: string = "http://localhost:8787";
const realtimeUrl: string = "ws://localhost:8788/redux-events";
const reconnectDelayMs: number = 1200;

interface RealtimeMessage {
  type: "state_changed";
  state: PlaygroundViewState["reduxState"];
  dispatchedActions: PlaygroundViewState["dispatchedActions"];
}

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
  feedback: "Connects to MCP HTTP API on localhost:8787",
};

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

const parsePayload = (payloadJson: string): unknown => {
  if (payloadJson.trim().length === 0) {
    return undefined;
  }
  return JSON.parse(payloadJson);
};

const parseResponse = async <TSuccess extends Record<string, unknown>>(response: Response): Promise<TSuccess> => {
  if (response.ok) {
    return (await response.json()) as TSuccess;
  }

  const errorBody: ErrorResponse = (await response.json()) as ErrorResponse;
  throw new Error(errorBody.error);
};

const fetchState = async (): Promise<StateResponse> => {
  const response: Response = await fetch(`${apiBaseUrl}/state`);
  return parseResponse<StateResponse>(response);
};

const fetchActions = async (): Promise<ActionsResponse> => {
  const response: Response = await fetch(`${apiBaseUrl}/actions`);
  return parseResponse<ActionsResponse>(response);
};

const dispatchToApi = async (action: DispatchRequest): Promise<DispatchResponse> => {
  const response: Response = await fetch(`${apiBaseUrl}/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(action),
  });
  return parseResponse<DispatchResponse>(response);
};

const resetApi = async (): Promise<ResetResponse> => {
  const response: Response = await fetch(`${apiBaseUrl}/reset`, {
    method: "POST",
  });
  return parseResponse<ResetResponse>(response);
};

const App = (): ReactElement => {
  const [dispatchForm, setDispatchForm] = useState<DispatchFormState>(initialDispatchForm);
  const [viewState, setViewState] = useState<PlaygroundViewState>(initialViewState);

  const refreshData = async (feedbackMessage: string): Promise<void> => {
    try {
      const [stateResponse, actionsResponse] = await Promise.all([fetchState(), fetchActions()]);
      setViewState({
        reduxState: stateResponse.state,
        availableActions: actionsResponse.availableActions,
        dispatchedActions: actionsResponse.dispatchedActions,
        feedback: feedbackMessage,
      });
    } catch (error: unknown) {
      const errorMessage: string = error instanceof Error ? error.message : "Unknown refresh error.";
      setViewState((previousState: PlaygroundViewState) => ({
        ...previousState,
        feedback: `Refresh failed: ${errorMessage}`,
      }));
    }
  };

  useEffect(() => {
    void refreshData("Connected.");
  }, []);

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

      socket.onmessage = (event: MessageEvent<string>): void => {
        try {
          const parsedMessage: RealtimeMessage = JSON.parse(event.data) as RealtimeMessage;
          if (parsedMessage.type === "state_changed") {
            setViewState((previousState: PlaygroundViewState) => ({
              ...previousState,
              reduxState: parsedMessage.state,
              dispatchedActions: parsedMessage.dispatchedActions,
              feedback: "Live update received.",
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
      const resetResponse: ResetResponse = await resetApi();
      const actionsResponse: ActionsResponse = await fetchActions();
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
      const dispatchResponse: DispatchResponse = await dispatchToApi({
        type: dispatchForm.actionType,
        payload,
      });
      const actionsResponse: ActionsResponse = await fetchActions();
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
