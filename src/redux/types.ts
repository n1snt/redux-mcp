export type AppActionType =
  | "counter/increment"
  | "counter/decrement"
  | "counter/set"
  | "todos/add"
  | "todos/toggle";

export interface CounterState {
  value: number;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TodosState {
  items: TodoItem[];
}

export interface RootState {
  counter: CounterState;
  todos: TodosState;
}

export interface IncrementPayload {
  amount: number;
}

export interface DecrementPayload {
  amount: number;
}

export interface SetCounterPayload {
  value: number;
}

export interface AddTodoPayload {
  id: string;
  text: string;
}

export interface ToggleTodoPayload {
  id: string;
}

export interface ActionDefinition {
  type: AppActionType;
  description: string;
  payloadSchema: string;
}

export interface ActionHistoryEntry {
  type: AppActionType;
  payload: unknown;
}

export interface DispatchRequest {
  type: AppActionType;
  payload?: unknown;
}
