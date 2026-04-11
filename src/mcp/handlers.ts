import type { RuntimeController } from "../redux/runtime-controller.types";
import type { DispatchRequest } from "../redux/types";
import type {
  DispatchActionResponse,
  GetActionsRequest,
  GetActionsResponse,
  GetStateResponse,
  McpToolResponse,
  ResetStateResponse,
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
