import type { ActionHistoryEntry, RootState } from "../redux/types";

export interface RuntimeStartOptions {
  apiPort?: number;
  websocketPort?: number;
  websocketPathname?: string;
}

export interface ReduxRuntimeHandle {
  apiPort: number;
  websocketPort: number;
  websocketPathname: string;
  stop: () => void;
}

export interface PlaygroundRealtimeMessage {
  type: "state_changed";
  state: RootState;
  dispatchedActions: ActionHistoryEntry[];
}
