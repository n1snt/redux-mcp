import type {
  ActionDefinition,
  ActionHistoryEntry,
  DispatchRequest,
} from "../redux/types";
import type { RuntimeController } from "../redux/runtime-controller.types";

export interface RuntimeStartOptions {
  websocketPort?: number;
  websocketPathname?: string;
}

export interface ReduxRuntimeHandle {
  websocketPort: number;
  websocketPathname: string;
  stop: () => void;
}

export interface StoreLike {
  getState: () => unknown;
  dispatch: (action: unknown) => unknown;
}

export interface StoreRegistration {
  storeName: string;
  store: StoreLike;
}

export interface RegisterStoresForMCPOptions {
  stores: StoreRegistration[];
  runtime?: RuntimeStartOptions;
}

export interface StoreRuntimeController extends RuntimeController {}

export interface StateChangedMessage {
  type: "state_changed";
  state: unknown;
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
    | { state: unknown }
    | { availableActions: ActionDefinition[]; dispatchedActions: ActionHistoryEntry[] };
}

export type PlaygroundServerMessage = StateChangedMessage | ErrorMessage | ResponseMessage;
