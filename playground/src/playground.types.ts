import type { ActionDefinition, ActionHistoryEntry, AppActionType, RootState } from "../../src/redux/types";

export interface DispatchFormState {
  actionType: AppActionType;
  payloadJson: string;
}

export interface PlaygroundViewState {
  reduxState: RootState;
  availableActions: ActionDefinition[];
  dispatchedActions: ActionHistoryEntry[];
  feedback: string;
}
