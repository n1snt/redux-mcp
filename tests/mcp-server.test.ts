import { describe, expect, it } from "vitest";

import { ReduxController } from "../src/redux/controller";
import { createMcpServer } from "../src/mcp/server";

describe("createMcpServer", () => {
  it("creates an MCP server instance with registered tools", async () => {
    const controller: ReduxController = new ReduxController();
    const server = createMcpServer(controller);
    const tools = (server as unknown as {
      _registeredTools: Record<string, { handler: (input: unknown) => Promise<unknown> }>;
    })._registeredTools;

    const getStateResult = await tools["redux_get_state"]?.handler({});
    const getActionsResult = await tools["redux_get_actions"]?.handler({
      includeHistory: false,
    });
    const dispatchResult = await tools["redux_dispatch_action"]?.handler({
      type: "counter/set",
      payload: { value: 4 },
    });
    const resetResult = await tools["redux_reset_state"]?.handler({});

    expect(server).toBeDefined();
    expect(server.isConnected()).toBe(false);
    expect(getStateResult).toBeDefined();
    expect(getActionsResult).toBeDefined();
    expect(dispatchResult).toBeDefined();
    expect(resetResult).toBeDefined();
  });
});
