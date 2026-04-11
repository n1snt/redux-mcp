import { describe, expect, it } from "vitest";

import { ReduxController } from "../src/redux/controller";
import { createPlaygroundApiServer, handlePlaygroundApiRequest } from "../src/playground-api/server";
import { reduxRuntimeController } from "../src/redux/runtime";

const requestFor = (path: string, method: string, body?: string): Request => {
  return new Request(`http://localhost${path}`, {
    method,
    body,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

describe("playground API server", () => {
  it("handles health and options routes", async () => {
    const controller: ReduxController = new ReduxController();
    const healthResponse = await handlePlaygroundApiRequest(controller, requestFor("/health", "GET"));
    const optionsResponse = await handlePlaygroundApiRequest(controller, requestFor("/state", "OPTIONS"));

    expect(healthResponse.status).toBe(200);
    expect(await healthResponse.json()).toEqual({ status: "ok" });
    expect(optionsResponse.status).toBe(204);
    expect(optionsResponse.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("handles state and actions routes", async () => {
    const controller: ReduxController = new ReduxController();
    controller.dispatchAction({
      type: "counter/increment",
      payload: { amount: 2 },
    });
    const stateResponse = await handlePlaygroundApiRequest(controller, requestFor("/state", "GET"));
    const actionsResponse = await handlePlaygroundApiRequest(controller, requestFor("/actions", "GET"));

    expect((await stateResponse.json()) as { state: { counter: { value: number } } }).toEqual({
      state: {
        counter: { value: 2 },
        todos: { items: [] },
      },
    });
    expect(
      (await actionsResponse.json()) as { dispatchedActions: Array<{ type: string }> },
    ).toMatchObject({
      dispatchedActions: [{ type: "counter/increment" }],
    });
  });

  it("handles dispatch and reset routes", async () => {
    const controller: ReduxController = new ReduxController();
    const dispatchResponse = await handlePlaygroundApiRequest(
      controller,
      requestFor("/dispatch", "POST", JSON.stringify({ type: "counter/set", payload: { value: 9 } })),
    );
    const resetResponse = await handlePlaygroundApiRequest(controller, requestFor("/reset", "POST"));

    expect((await dispatchResponse.json()) as { state: { counter: { value: number } } }).toEqual({
      state: {
        counter: { value: 9 },
        todos: { items: [] },
      },
    });
    expect((await resetResponse.json()) as { state: { counter: { value: number } } }).toEqual({
      state: {
        counter: { value: 0 },
        todos: { items: [] },
      },
    });
  });

  it("handles dispatch validation and parsing errors", async () => {
    const controller: ReduxController = new ReduxController();

    const invalidSchemaResponse = await handlePlaygroundApiRequest(
      controller,
      requestFor("/dispatch", "POST", JSON.stringify({ type: "counter/not-real" })),
    );
    const invalidPayloadResponse = await handlePlaygroundApiRequest(
      controller,
      requestFor("/dispatch", "POST", JSON.stringify({ type: "counter/increment", payload: { amount: -1 } })),
    );
    const invalidJsonResponse = await handlePlaygroundApiRequest(
      controller,
      requestFor("/dispatch", "POST", "{"),
    );

    expect(invalidSchemaResponse.status).toBe(400);
    expect(await invalidSchemaResponse.json()).toEqual({ error: "Invalid dispatch payload." });
    expect(invalidPayloadResponse.status).toBe(400);
    expect(await invalidPayloadResponse.json()).toEqual({
      error: "Invalid payload for counter/increment: Too small: expected number to be >0",
    });
    expect(invalidJsonResponse.status).toBe(400);
    expect(await invalidJsonResponse.json()).toEqual({ error: "Invalid JSON body." });
  });

  it("handles unknown errors and not found routes", async () => {
    const crashingController = {
      dispatchAction: (): never => {
        throw new Error("Boom");
      },
    } as unknown as ReduxController;

    const dispatchResponse = await handlePlaygroundApiRequest(
      crashingController,
      requestFor("/dispatch", "POST", JSON.stringify({ type: "counter/set", payload: { value: 1 } })),
    );
    const notFoundResponse = await handlePlaygroundApiRequest(
      new ReduxController(),
      requestFor("/missing", "GET"),
    );

    expect(dispatchResponse.status).toBe(500);
    expect(await dispatchResponse.json()).toEqual({ error: "Unexpected dispatch failure." });
    expect(notFoundResponse.status).toBe(404);
    expect(await notFoundResponse.json()).toEqual({ error: "Not found." });
  });

  it("creates a bun server instance", async () => {
    const server: Bun.Server<unknown> = createPlaygroundApiServer(reduxRuntimeController, 0);
    const response: Response = await fetch(`http://localhost:${server.port}/health`);
    server.stop(true);

    expect(response.status).toBe(200);
    expect(server).toBeDefined();
  });
});
