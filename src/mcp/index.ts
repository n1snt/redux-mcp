#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { getRuntimeController } from "../integration/registry";
import { startReduxRuntimeServers } from "../integration/runtime";
import { createMcpServer } from "./server";

const startServer = async (): Promise<void> => {
  startReduxRuntimeServers({});

  const server = createMcpServer(getRuntimeController());
  const transport: StdioServerTransport = new StdioServerTransport();

  await server.connect(transport);
};

void startServer();
