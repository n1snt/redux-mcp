# redux-mcp

`redux-mcp` lets AI tools (via MCP) and your app connect to Redux state in a simple way.

It gives you:

- MCP tools to read state, list actions, dispatch actions, and reset history
- A WebSocket runtime for live state updates
- A simple API to register your own Redux stores

## What It Does

After integration, LLMs or clients can:

- read current Redux state
- see available/observed actions
- dispatch actions into your store
- receive live updates over WebSocket

## Install

Use in your app:

`npm install redux-mcp`

For local development of this repo:

`npm install`

## Integrate In Your App

### Quick start (auto-start runtime)

```ts
import "redux-mcp";
```

This auto-starts the runtime WebSocket server on:

- `ws://localhost:8788/redux-events`

### Register your Redux stores (recommended)

```ts
import { registerStoresForMCP } from "redux-mcp";

registerStoresForMCP({
  stores: [{ storeName: "app", store }],
});
```

Notes:

- `store` should provide `getState()` and `dispatch(...)`
- multiple stores are supported
- action types are learned from observed dispatched actions

### Manual runtime control (optional)

```ts
import { startReduxRuntimeServers } from "redux-mcp";

const runtime = startReduxRuntimeServers({
  websocketPort: 8788,
  websocketPathname: "/redux-events",
});

// runtime.stop();
```

## Install MCP In Cursor

Add this to Cursor MCP config:

```json
{
  "mcpServers": {
    "redux-mcp": {
      "command": "npx",
      "args": ["-y", "redux-mcp"]
    }
  }
}
```

If Cursor cannot find `npx` (`spawn npx ENOENT`), use the absolute `npx` path instead:

```json
{
  "mcpServers": {
    "redux-mcp": {
      "command": "/absolute/path/to/npx",
      "args": ["-y", "redux-mcp"]
    }
  }
}
```

Then restart MCP servers in Cursor.

Available tools:

- `redux_get_state`
- `redux_get_actions`
- `redux_dispatch_action`
- `redux_reset_state`

For detailed Cursor setup: `documentation/cursor-mcp-setup.md`.
