import type { ActionDefinition, ActionHistoryEntry } from "../../src/redux/types";

export interface DispatchFormState {
  actionType: string;
  payloadJson: string;
}

export interface PlaygroundViewState {
  reduxState: unknown;
  availableActions: ActionDefinition[];
  dispatchedActions: ActionHistoryEntry[];
  feedback: string;
}
