import * as z from "zod";

import {
  InvalidActionPayloadError,
  ReduxController,
  UnsupportedActionError,
} from "../redux/controller";
import type { DispatchRequest } from "../redux/types";
import type { ActionsResponse, DispatchResponse, ErrorResponse, HealthResponse, ResetResponse, StateResponse } from "./types";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const dispatchSchema = z.object({
  type: z.enum(["counter/increment", "counter/decrement", "counter/set", "todos/add", "todos/toggle"]),
  payload: z.unknown().optional(),
});

const jsonResponse = <TBody extends Record<string, unknown>>(body: TBody, status: number = 200): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
};

const parseJsonBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body.");
  }
};

const handleDispatch = async (
  controller: ReduxController,
  request: Request,
): Promise<Response> => {
  try {
    const rawBody: unknown = await parseJsonBody(request);
    const parsedBody: DispatchRequest = dispatchSchema.parse(rawBody);
    const responseBody: DispatchResponse = {
      state: controller.dispatchAction(parsedBody),
    };
    return jsonResponse(responseBody);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const responseBody: ErrorResponse = {
        error: "Invalid dispatch payload.",
      };
      return jsonResponse(responseBody, 400);
    }

    if (error instanceof InvalidActionPayloadError || error instanceof UnsupportedActionError) {
      const responseBody: ErrorResponse = {
        error: error.message,
      };
      return jsonResponse(responseBody, 400);
    }

    if (error instanceof Error && error.message === "Invalid JSON body.") {
      const responseBody: ErrorResponse = {
        error: error.message,
      };
      return jsonResponse(responseBody, 400);
    }

    const responseBody: ErrorResponse = {
      error: "Unexpected dispatch failure.",
    };
    return jsonResponse(responseBody, 500);
  }
};

export const handlePlaygroundApiRequest = async (
  controller: ReduxController,
  request: Request,
): Promise<Response> => {
  const requestUrl: URL = new URL(request.url);
  const { pathname } = requestUrl;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method === "GET" && pathname === "/health") {
    const responseBody: HealthResponse = {
      status: "ok",
    };
    return jsonResponse(responseBody);
  }

  if (request.method === "GET" && pathname === "/state") {
    const responseBody: StateResponse = {
      state: controller.getState(),
    };
    return jsonResponse(responseBody);
  }

  if (request.method === "GET" && pathname === "/actions") {
    const responseBody: ActionsResponse = {
      availableActions: controller.getAvailableActions(),
      dispatchedActions: controller.getDispatchedActions(),
    };
    return jsonResponse(responseBody);
  }

  if (request.method === "POST" && pathname === "/dispatch") {
    return handleDispatch(controller, request);
  }

  if (request.method === "POST" && pathname === "/reset") {
    const responseBody: ResetResponse = {
      state: controller.resetState(),
    };
    return jsonResponse(responseBody);
  }

  const responseBody: ErrorResponse = {
    error: "Not found.",
  };
  return jsonResponse(responseBody, 404);
};

export const createPlaygroundApiServer = (
  controller: ReduxController,
  port: number,
): Bun.Server<unknown> => {
  return Bun.serve({
    port,
    fetch: (request: Request): Promise<Response> => handlePlaygroundApiRequest(controller, request),
  });
};
