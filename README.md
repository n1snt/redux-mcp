# redux-mcp

Redux MCP server with a React playground for querying Redux state, listing actions, and dispatching actions.

## Requirements

- Bun 1.3+

## Install

`bun install`

## Run MCP Server

`bun run dev:mcp`

When running, this process exposes the playground websocket endpoint:

- WebSocket: `ws://localhost:8788/redux-events`

### Exposed MCP tools

- `redux_get_state`
- `redux_get_actions`
- `redux_dispatch_action`
- `redux_reset_state`

## Run Playground

`bun run dev:playground`

This starts a React app (Vite) that consumes the MCP runtime through WebSocket only (no polling, no REST).

## Library Integration (Auto-start)

Importing this package auto-starts the runtime websocket server inside your Bun app process.

- `import "redux-mcp";`
- Optional manual control: `startReduxRuntimeServers(...)` from `redux-mcp`
- Register your app stores and auto-boot runtime in one call: `registerStoresForMCP(...)` from `redux-mcp`

Example registration shape:

- `registerStoresForMCP({ stores: [{ storeName, store }], runtime? })`
- Exposed action types are learned from observed dispatched actions.
- If you provide multiple stores, state responses include all stores keyed by `storeName`.

## MCP Setup in Cursor

See `documentation/cursor-mcp-setup.md`.

## Quality Gates

- Strict TypeScript only.
- Zod schemas for action payload validation.
- 100% coverage thresholds enforced in tests.
