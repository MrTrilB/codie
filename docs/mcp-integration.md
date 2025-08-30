# MCP Integration (Provider Docs)

This document explains how Codie integrates Model Context Protocol (MCP) tool servers with AI providers, and how provider authors can consume MCP clients and metadata safely.

## Normalized MCP client

Codie passes a normalized MCP client object to AI providers via the optional `setMcpClients` hook. The normalized shape is:

```ts
export interface NormalizedMcpClient {
  id: string; // unique id for the MCP instance
  label?: string; // optional human-friendly label
  client: any; // underlying SDK instance or HTTP wrapper for the MCP server
}
```

The `client` object may be an SDK instance (if a well-known SDK is available) or a light HTTP wrapper that exposes convenience methods like `listTools()` or `listResources()`.

## Provider contract: `setMcpClients`

Implement the hook in your provider if you want to receive MCP clients:

```ts
setMcpClients?(clients: NormalizedMcpClient[]): void;
```

- The extension will call this method at activation and whenever MCP servers are added/removed via the MCP Manager UI.
- Providers should store the clients and optionally prefetch light metadata. Treat `client` as opaque and check for the method before calling:

```ts
if (typeof client.listTools === 'function') {
  client.listTools().then(tools => { /* store */ }).catch(() => {});
}
```

Keep calls non-blocking and swallow errors — MCP servers may be unavailable or have different APIs.

## Enrichment helper

Codie provides a helper to create a concise MCP summary and merge it into a system prompt:

- File: `src/providers/mcpEnrichment.ts`
- Exports:
  - `buildMcpSummaries(mcpMetadata, options?)`
  - `enrichSystemMessage(originalSystem, mcpMetadata, options?)`

Usage example in a provider before sending messages:

```ts
import { enrichSystemMessage } from './mcpEnrichment';

const system = messages.find(m => m.role === 'system')?.content;
const enriched = enrichSystemMessage(system, this.mcpMetadata);
const chatMessages = messages.map(m => ({
  role: m.role,
  content: m.role === 'system' && enriched ? enriched : m.content
}));
// send chatMessages to the provider SDK
```

`mcpEnrichment` accepts options to control formatting:

```ts
interface MCPEnrichmentOptions {
  limit?: number; // max tools/resources per MCP (default 5)
  prefix?: string; // block prefix (default '[MCP Metadata]')
  separator?: string; // separator between summaries (default '\n')
}
```

## Example provider flow

1. `ProviderRegistry` calls `setMcpClients` with `NormalizedMcpClient[]`.
2. Provider stores the clients, optionally calls `listTools()` safely to build `this.mcpMetadata`.
3. When sending a chat, provider calls `enrichSystemMessage` and includes the result in the system role.

This allows the model to be aware of available tools without forcing providers to implement MCP-specific logic.

## Testing

- For unit tests, mock a `NormalizedMcpClient` and stub the `listTools()` to return predictable metadata.
- Verify `enrichSystemMessage` output directly and/or use provider tests to assert that the outgoing system prompt contains MCP summaries.

Example mock snippet (Mocha + Sinon):

```ts
const mockMcp: NormalizedMcpClient = {
  id: 'mcp1',
  label: 'Test MCP',
  client: { listTools: async () => [{ id: 't1', name: 'tool1' }] }
};
provider.setMcpClients?.([mockMcp]);
await new Promise(r => setTimeout(r, 10)); // wait for prefetch
// call provider.sendMessage and assert system prompt includes 'mcp1 provides tools: tool1'
```

## Notes and best practices

- Keep enrichment concise — tools are summarized, not pasted fully.
- Enrichment is optional and non-blocking; providers must continue to work without MCP clients.
- Consider caching metadata with TTL if your provider frequently queries MCP servers.

---

If you want, I can also:
- Add unit tests for `LMStudioProvider` and `OllamaProvider` similar to the Foundry test.
- Add a small example provider demonstrating full integration.
