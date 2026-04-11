import type {
  ActionDefinition,
  ActionHistoryEntry,
  DispatchRequest,
  RootState,
} from "../redux/types";

export interface RuntimeStartOptions {
  websocketPort?: number;
  websocketPathname?: string;
}

export interface ReduxRuntimeHandle {
  websocketPort: number;
  websocketPathname: string;
  stop: () => void;
}

export interface StateChangedMessage {
  type: "state_changed";
  state: RootState;
  dispatchedActions: ActionHistoryEntry[];
}

export interface ErrorMessage {
  type: "error";
  requestId?: string;
  error: string;
}

export interface RequestMessage {
  type: "request";
  requestId: string;
  action: "get_state" | "get_actions" | "dispatch_action" | "reset_state";
  payload?: DispatchRequest;
  includeHistory?: boolean;
}

export interface ResponseMessage {
  type: "response";
  requestId: string;
  data:
    | { state: RootState }
    | { availableActions: ActionDefinition[]; dispatchedActions: ActionHistoryEntry[] };
}

export type PlaygroundServerMessage = StateChangedMessage | ErrorMessage | ResponseMessage;
