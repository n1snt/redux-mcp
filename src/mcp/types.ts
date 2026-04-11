import type { ActionDefinition, ActionHistoryEntry, DispatchRequest } from "../redux/types";

export interface GetActionsRequest extends Record<string, unknown> {
  includeHistory?: boolean;
}

export interface GetActionsResponse extends Record<string, unknown> {
  availableActions: ActionDefinition[];
  dispatchedActions: ActionHistoryEntry[];
}

export interface GetStateResponse extends Record<string, unknown> {
  state: unknown;
}

export interface DispatchActionResponse extends Record<string, unknown> {
  state: unknown;
  dispatchedAction: DispatchRequest;
}

export interface ResetStateResponse extends Record<string, unknown> {
  state: unknown;
}

export interface McpTextContent {
  type: "text";
  text: string;
}

export interface McpToolResponse<TContent> extends Record<string, unknown> {
  content: McpTextContent[];
  structuredContent: TContent;
}
