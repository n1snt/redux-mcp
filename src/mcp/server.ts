import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import { ReduxController } from "../redux/controller";
import {
  handleDispatchAction,
  handleGetActions,
  handleGetState,
  handleResetState,
} from "./handlers";

export const createMcpServer = (controller: ReduxController): McpServer => {
  const server: McpServer = new McpServer({
    name: "redux-mcp",
    version: "0.1.0",
  });

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
        includeHistory: z.boolean().optional(),
      }),
    },
    async (input) => handleGetActions(controller, input),
  );

  server.registerTool(
    "redux_dispatch_action",
    {
      title: "Dispatch Redux Action",
      description: "Dispatch an action to the Redux store.",
      inputSchema: z.object({
        type: z.enum(["counter/increment", "counter/decrement", "counter/set", "todos/add", "todos/toggle"]),
        payload: z.unknown().optional(),
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
