import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import type { RuntimeController } from "../redux/runtime-controller.types";
import {
  handleDispatchAction,
  handleGetActions,
  handleGetStateDiff,
  handleGetState,
  handleResetState,
} from "./handlers";

const cloneStateSnapshot = <TValue>(value: TValue): TValue => {
  return structuredClone(value);
};

export const createMcpServer = (controller: RuntimeController): McpServer => {
  const server: McpServer = new McpServer({
    name: "redux-mcp",
    version: "0.1.0",
  });
  let previousStateSnapshot: unknown | null = null;

  server.registerTool(
    "redux_get_state",
    {
      title: "Get Redux State",
      description: "Return the current Redux store snapshot.",
    },
    async () => handleGetState(controller),
  );

  server.registerTool(
    "redux_get_actions",
    {
      title: "Get Redux Actions",
      description: "Return available actions and optionally dispatched history.",
      inputSchema: z.object({
        includeHistory: z
          .boolean()
          .optional()
          .describe("Whether to include previously dispatched actions in the response. Defaults to true."),
      }),
    },
    async (input) => handleGetActions(controller, input),
  );

  server.registerTool(
    "redux_get_state_diff",
    {
      title: "Get Redux State Diff",
      description:
        "Return field-level changes between current state and the previous snapshot (or a provided baseline).",
      inputSchema: z.object({
        previousState: z
          .unknown()
          .optional()
          .describe("Optional baseline state to diff against. If omitted, the tool uses its last remembered snapshot."),
        rememberCurrentAsPrevious: z
          .boolean()
          .optional()
          .describe("Whether to store the current state as the next baseline snapshot. Defaults to true."),
      }),
    },
    async (input) => {
      const hasCustomPreviousState: boolean = Object.prototype.hasOwnProperty.call(input, "previousState");
      const previousState: unknown | null = hasCustomPreviousState ? (input.previousState ?? null) : previousStateSnapshot;
      const response = handleGetStateDiff(controller, {
        previousState: previousState ?? undefined,
      });

      const shouldRememberCurrent: boolean = input.rememberCurrentAsPrevious ?? true;
      if (shouldRememberCurrent) {
        previousStateSnapshot = cloneStateSnapshot(response.structuredContent.currentState);
      }

      return response;
    },
  );

  server.registerTool(
    "redux_dispatch_action",
    {
      title: "Dispatch Redux Action",
      description: "Dispatch an action to the Redux store.",
      inputSchema: z.object({
        type: z.string().describe("Redux action type to dispatch, for example `counter/increment`."),
        payload: z.unknown().optional().describe("Optional action payload passed through as `action.payload`."),
        storeName: z
          .string()
          .optional()
          .describe("Optional target store name when multiple stores are registered."),
      }),
    },
    async (input) => handleDispatchAction(controller, input),
  );

  server.registerTool(
    "redux_reset_state",
    {
      title: "Reset Redux State",
      description: "Reset Redux state and action history to initial values.",
    },
    async () => handleResetState(controller),
  );

  return server;
};
