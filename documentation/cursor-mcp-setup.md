# Add Redux MCP to Cursor

## 1) Start from this project path

Use the absolute project path on your machine:

`/Users/nishant/code/redux-mcp`

## 2) Add server config in Cursor MCP settings

Open Cursor MCP settings and add this server entry (recommended: absolute script path):

```json
{
  "mcpServers": {
    "redux-mcp": {
      "command": "/Users/nishant/.bun/bin/bun",
      "args": ["run", "/Users/nishant/code/redux-mcp/src/mcp/index.ts"],
      "cwd": "/Users/nishant/code/redux-mcp"
    }
  }
}
```

If your Bun binary is on PATH, you can use `"command": "bun"` instead.

Alternative (script-based):

```json
{
  "mcpServers": {
    "redux-mcp": {
      "command": "/Users/nishant/.bun/bin/bun",
      "args": ["run", "dev:mcp"],
      "cwd": "/Users/nishant/code/redux-mcp"
    }
  }
}
```

## 3) Restart MCP servers in Cursor

After saving config, restart MCP servers from Cursor so the new server is discovered.

## 4) Validate available tools

You should see:

- `redux_get_state`
- `redux_get_actions`
- `redux_dispatch_action`
- `redux_reset_state`

## 5) Playground connectivity

When Cursor runs this MCP server, it also exposes:

- HTTP API: `http://localhost:8787`
- WebSocket stream: `ws://localhost:8788/redux-events`

The React playground consumes these for shared-state updates without polling.

## Troubleshooting

- If you see `Module not found "src/mcp/index.ts"`, Cursor is launching from a different working directory. Use the absolute path config shown above.
