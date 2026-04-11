import type { ActionDefinition, ActionHistoryEntry, DispatchRequest } from "./types";

export interface RuntimeController {
  getState: () => unknown;
  getAvailableActions: () => ActionDefinition[];
  getDispatchedActions: () => ActionHistoryEntry[];
  dispatchAction: (request: DispatchRequest) => unknown;
  resetState: () => unknown;
}
