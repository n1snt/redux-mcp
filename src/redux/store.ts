import {
  configureStore,
  createSlice,
  type EnhancedStore,
  type PayloadAction,
  type UnknownAction,
} from "@reduxjs/toolkit";

import type {
  AddTodoPayload,
  CounterState,
  DecrementPayload,
  IncrementPayload,
  RootState,
  SetCounterPayload,
  TodosState,
  ToggleTodoPayload,
} from "./types";

const initialCounterState: CounterState = {
  value: 0,
};

const initialTodosState: TodosState = {
  items: [],
};

const counterSlice = createSlice({
  name: "counter",
  initialState: initialCounterState,
  reducers: {
    increment: (state: CounterState, action: PayloadAction<IncrementPayload>): void => {
      state.value += action.payload.amount;
    },
    decrement: (state: CounterState, action: PayloadAction<DecrementPayload>): void => {
      state.value -= action.payload.amount;
    },
    set: (state: CounterState, action: PayloadAction<SetCounterPayload>): void => {
      state.value = action.payload.value;
    },
  },
});

const todosSlice = createSlice({
  name: "todos",
  initialState: initialTodosState,
  reducers: {
    add: (state: TodosState, action: PayloadAction<AddTodoPayload>): void => {
      state.items.push({
        id: action.payload.id,
        text: action.payload.text,
        done: false,
      });
    },
    toggle: (state: TodosState, action: PayloadAction<ToggleTodoPayload>): void => {
      const matchingItem = state.items.find((item) => item.id === action.payload.id);
      if (matchingItem) {
        matchingItem.done = !matchingItem.done;
      }
    },
  },
});

export const counterActions = counterSlice.actions;
export const todoActions = todosSlice.actions;

export const createReduxStore = (): EnhancedStore<RootState, UnknownAction> =>
  configureStore({
    reducer: {
      counter: counterSlice.reducer,
      todos: todosSlice.reducer,
    },
  });

export type AppStore = ReturnType<typeof createReduxStore>;
export type AppDispatch = AppStore["dispatch"];
export type StoreState = RootState;
