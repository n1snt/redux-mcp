# Add Redux MCP to Cursor

## 1) Start from this project path

Use the absolute project path on your machine:

`/Users/nishant/code/redux-mcp`

## 2) Add server config in Cursor MCP settings

Open Cursor MCP settings and add this server entry (recommended):

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

Alternative using absolute `npx` path (use this if Cursor shows `spawn npx ENOENT`):

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

## 3) Restart MCP servers in Cursor

After saving config, restart MCP servers from Cursor so the new server is discovered.

## 4) Validate available tools

You should see:

- `redux_get_state`
- `redux_get_state_diff`
- `redux_get_actions`
- `redux_dispatch_action`
- `redux_reset_state`

## 5) Playground connectivity

When Cursor runs this MCP server, it also exposes:

- WebSocket stream: `ws://localhost:8788/redux-events`

The React playground consumes this single websocket for state queries, action dispatches, and live updates.

## Troubleshooting

- If you see `spawn npx ENOENT`, Cursor cannot resolve `npx` from PATH. Use absolute `npx` path in config.
