import type { ActionDefinition, ActionHistoryEntry, DispatchRequest, RootState } from "../redux/types";

export interface HealthResponse extends Record<string, unknown> {
  status: "ok";
}

export interface StateResponse extends Record<string, unknown> {
  state: RootState;
}

export interface ActionsResponse extends Record<string, unknown> {
  availableActions: ActionDefinition[];
  dispatchedActions: ActionHistoryEntry[];
}

export interface DispatchResponse extends Record<string, unknown> {
  state: RootState;
}

export interface ResetResponse extends Record<string, unknown> {
  state: RootState;
}

export interface ErrorResponse extends Record<string, unknown> {
  error: string;
}

export type DispatchPayload = DispatchRequest;
