# redux-mcp

Redux MCP server with a React playground for querying Redux state, listing actions, and dispatching actions.

## Requirements

- Bun 1.3+

## Install

`bun install`

## Run MCP Server

`bun run dev:mcp`

When running, this process now also exposes playground integration endpoints:

- HTTP API: `http://localhost:8787`
- WebSocket live updates: `ws://localhost:8788/redux-events`

### Exposed MCP tools

- `redux_get_state`
- `redux_get_actions`
- `redux_dispatch_action`
- `redux_reset_state`

## Run Playground

`bun run dev:playground`

This starts a React app (Vite) that consumes the MCP runtime through HTTP + WebSocket (no polling).

## Library Integration (Auto-start)

Importing this package auto-starts the runtime servers (HTTP + WebSocket) inside your Bun app process.

- `import "redux-mcp";`
- Optional manual control: `startReduxRuntimeServers(...)` from `redux-mcp`

## MCP Setup in Cursor

See `documentation/cursor-mcp-setup.md`.

## Quality Gates

- Strict TypeScript only.
- Zod schemas for action payload validation.
- 100% coverage thresholds enforced in tests.
