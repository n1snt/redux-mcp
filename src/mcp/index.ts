import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { startReduxRuntimeServers } from "../integration/runtime";
import { reduxRuntimeController } from "../redux/runtime";
import { createMcpServer } from "./server";

const startServer = async (): Promise<void> => {
  startReduxRuntimeServers({});

  const server = createMcpServer(reduxRuntimeController);
  const transport: StdioServerTransport = new StdioServerTransport();

  await server.connect(transport);
};

void startServer();
