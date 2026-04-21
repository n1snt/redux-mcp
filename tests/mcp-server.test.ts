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
    const firstDiffResult = await tools["redux_get_state_diff"]?.handler({});
    const dispatchResult = await tools["redux_dispatch_action"]?.handler({
      type: "counter/set",
      payload: { value: 4 },
    });
    const secondDiffResult = await tools["redux_get_state_diff"]?.handler({});
    const resetResult = await tools["redux_reset_state"]?.handler({});

    expect(server).toBeDefined();
    expect(server.isConnected()).toBe(false);
    expect(getStateResult).toBeDefined();
    expect(getActionsResult).toBeDefined();
    expect(firstDiffResult).toBeDefined();
    expect(dispatchResult).toBeDefined();
    expect(secondDiffResult).toBeDefined();
    expect(resetResult).toBeDefined();
    expect(
      (secondDiffResult as { structuredContent: { changes: Array<{ path: string }> } }).structuredContent.changes[0]?.path,
    ).toBe("counter.value");
  });
});
