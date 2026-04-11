import { ZodError, type ZodType } from "zod";

import {
  addTodoPayloadSchema,
  decrementPayloadSchema,
  incrementPayloadSchema,
  setCounterPayloadSchema,
  toggleTodoPayloadSchema,
} from "./schemas";
import { counterActions, createReduxStore, todoActions, type AppStore, type StoreState } from "./store";
import type {
  ActionDefinition,
  ActionHistoryEntry,
  AddTodoPayload,
  DecrementPayload,
  DispatchRequest,
  IncrementPayload,
  SetCounterPayload,
  ToggleTodoPayload,
} from "./types";

export class InvalidActionPayloadError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidActionPayloadError";
  }
}

export class UnsupportedActionError extends Error {
  public constructor(actionType: string) {
    super(`Unsupported action type: ${actionType}`);
    this.name = "UnsupportedActionError";
  }
}

const actionDefinitions: ActionDefinition[] = [
  {
    type: "counter/increment",
    description: "Increase counter by a positive integer amount.",
    payloadSchema: '{ "amount": number }',
  },
  {
    type: "counter/decrement",
    description: "Decrease counter by a positive integer amount.",
    payloadSchema: '{ "amount": number }',
  },
  {
    type: "counter/set",
    description: "Set counter to an exact integer value.",
    payloadSchema: '{ "value": number }',
  },
  {
    type: "todos/add",
    description: "Add a new todo item.",
    payloadSchema: '{ "id": string, "text": string }',
  },
  {
    type: "todos/toggle",
    description: "Toggle completion state for an existing todo by id.",
    payloadSchema: '{ "id": string }',
  },
];

const assertValidPayload = <TPayload>(
  schema: ZodType<TPayload>,
  payload: unknown,
  actionType: string,
): TPayload => {
  try {
    return schema.parse(payload);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw new InvalidActionPayloadError(
        `Invalid payload for ${actionType}: ${error.issues.map((issue) => issue.message).join(", ")}`,
      );
    }
    throw error;
  }
};

export class ReduxController {
  private store: AppStore;

  private history: ActionHistoryEntry[] = [];

  public constructor() {
    this.store = createReduxStore();
  }

  public getState(): StoreState {
    return this.store.getState();
  }

  public getAvailableActions(): ActionDefinition[] {
    return actionDefinitions;
  }

  public getDispatchedActions(): ActionHistoryEntry[] {
    return this.history;
  }

  public resetState(): StoreState {
    this.history = [];
    this.store = createReduxStore();
    return this.store.getState();
  }

  public dispatchAction(request: DispatchRequest): StoreState {
    const { type, payload } = request;

    switch (type) {
      case "counter/increment": {
        const parsedPayload: IncrementPayload = assertValidPayload(incrementPayloadSchema, payload, type);
        this.store.dispatch(counterActions.increment(parsedPayload));
        break;
      }
      case "counter/decrement": {
        const parsedPayload: DecrementPayload = assertValidPayload(decrementPayloadSchema, payload, type);
        this.store.dispatch(counterActions.decrement(parsedPayload));
        break;
      }
      case "counter/set": {
        const parsedPayload: SetCounterPayload = assertValidPayload(setCounterPayloadSchema, payload, type);
        this.store.dispatch(counterActions.set(parsedPayload));
        break;
      }
      case "todos/add": {
        const parsedPayload: AddTodoPayload = assertValidPayload(addTodoPayloadSchema, payload, type);
        this.store.dispatch(todoActions.add(parsedPayload));
        break;
      }
      case "todos/toggle": {
        const parsedPayload: ToggleTodoPayload = assertValidPayload(toggleTodoPayloadSchema, payload, type);
        this.store.dispatch(todoActions.toggle(parsedPayload));
        break;
      }
      default:
        throw new UnsupportedActionError(type);
    }

    this.history.push({
      type,
      payload,
    });

    return this.store.getState();
  }
}
