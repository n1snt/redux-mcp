# Tech Stack

- Runtime and package manager: Bun.
- Language: TypeScript only, strict mode enabled.
- State engine: Redux Toolkit.
- Validation and tool contract safety: Zod.
- MCP transport and protocol layer: `@modelcontextprotocol/sdk` over stdio.
- Playground integration: Bun HTTP API plus WebSocket live updates from the same runtime.
- Playground UI: React with Vite, run via Bun scripts.
- Testing: Vitest with Istanbul coverage and 100% thresholds for lines, branches, functions, and statements.
