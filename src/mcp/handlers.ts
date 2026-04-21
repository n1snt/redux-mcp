import type { RuntimeController } from "../redux/runtime-controller.types";
import type { DispatchRequest } from "../redux/types";
import type {
  DispatchActionResponse,
  GetActionsRequest,
  GetActionsResponse,
  GetStateDiffRequest,
  GetStateDiffResponse,
  GetStateResponse,
  McpToolResponse,
  ResetStateResponse,
  StateDiffChange,
} from "./types";

const toTextResponse = <TPayload>(title: string, payload: TPayload): McpToolResponse<TPayload> => ({
  content: [
    {
      type: "text",
      text: `${title}\n${JSON.stringify(payload, null, 2)}`,
    },
  ],
  structuredContent: payload,
});

export const handleGetState = (controller: RuntimeController): McpToolResponse<GetStateResponse> => {
  return toTextResponse("Redux state", {
    state: controller.getState(),
  });
};

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const appendStateDiffChanges = (
  previousValue: unknown,
  currentValue: unknown,
  path: string,
  changes: StateDiffChange[],
): void => {
  if (Object.is(previousValue, currentValue)) {
    return;
  }

  if (Array.isArray(previousValue) && Array.isArray(currentValue)) {
    const maxLength: number = Math.max(previousValue.length, currentValue.length);
    for (let index: number = 0; index < maxLength; index += 1) {
      const childPath: string = `${path}[${index}]`;
      if (index >= previousValue.length) {
        changes.push({
          path: childPath,
          changeType: "added",
          currentValue: currentValue[index],
        });
        continue;
      }

      if (index >= currentValue.length) {
        changes.push({
          path: childPath,
          changeType: "removed",
          previousValue: previousValue[index],
        });
        continue;
      }

      appendStateDiffChanges(previousValue[index], currentValue[index], childPath, changes);
    }
    return;
  }

  if (isRecordValue(previousValue) && isRecordValue(currentValue)) {
    const keySet: Set<string> = new Set<string>([
      ...Object.keys(previousValue),
      ...Object.keys(currentValue),
    ]);
    const sortedKeys: string[] = [...keySet].sort();
    sortedKeys.forEach((key: string): void => {
      const childPath: string = path.length > 0 ? `${path}.${key}` : key;
      const hasPrevious: boolean = Object.prototype.hasOwnProperty.call(previousValue, key);
      const hasCurrent: boolean = Object.prototype.hasOwnProperty.call(currentValue, key);

      if (!hasPrevious && hasCurrent) {
        changes.push({
          path: childPath,
          changeType: "added",
          currentValue: currentValue[key],
        });
        return;
      }

      if (hasPrevious && !hasCurrent) {
        changes.push({
          path: childPath,
          changeType: "removed",
          previousValue: previousValue[key],
        });
        return;
      }

      appendStateDiffChanges(previousValue[key], currentValue[key], childPath, changes);
    });
    return;
  }

  changes.push({
    path: path.length > 0 ? path : "$",
    changeType: "changed",
    previousValue,
    currentValue,
  });
};

export const handleGetStateDiff = (
  controller: RuntimeController,
  request: GetStateDiffRequest,
): McpToolResponse<GetStateDiffResponse> => {
  const previousState: unknown | null = request.previousState ?? null;
  const currentState: unknown = controller.getState();

  if (previousState === null) {
    return toTextResponse("Redux state diff", {
      previousState,
      currentState,
      hasChanges: false,
      changeCount: 0,
      changes: [],
    });
  }

  const changes: StateDiffChange[] = [];
  appendStateDiffChanges(previousState, currentState, "", changes);

  return toTextResponse("Redux state diff", {
    previousState,
    currentState,
    hasChanges: changes.length > 0,
    changeCount: changes.length,
    changes,
  });
};

export const handleGetActions = (
  controller: RuntimeController,
  request: GetActionsRequest,
): McpToolResponse<GetActionsResponse> => {
  const includeHistory: boolean = request.includeHistory ?? true;
  return toTextResponse("Redux action metadata", {
    availableActions: controller.getAvailableActions(),
    dispatchedActions: includeHistory ? controller.getDispatchedActions() : [],
  });
};

export const handleDispatchAction = (
  controller: RuntimeController,
  request: DispatchRequest,
): McpToolResponse<DispatchActionResponse> => {
  const state = controller.dispatchAction(request);
  return toTextResponse("Redux action dispatched", {
    state,
    dispatchedAction: request,
  });
};

export const handleResetState = (controller: RuntimeController): McpToolResponse<ResetStateResponse> => {
  return toTextResponse("Redux state reset", {
    state: controller.resetState(),
  });
};
