# Provider Integration Example

This example demonstrates how to implement `setMcpClients` in a provider, prefetch light metadata, use the `mcpEnrichment` helper to enrich the system prompt, and a small Mocha test snippet showing how to mock an MCP client.

## Example provider snippet

```ts
// src/providers/exampleProvider.ts
import { AIProvider, NormalizedMcpClient } from '../src/providers/AIProvider';
import { enrichSystemMessage } from '../src/providers/mcpEnrichment';

export class ExampleProvider implements AIProvider {
  public readonly key = 'example';
  private mcpClients: NormalizedMcpClient[] = [];
  private mcpMetadata: Record<string, any> = {};

  getName() { return 'Example'; }

  async listModels() { return []; }

  async setActiveModel(modelId: string) { /* ... */ }

  setMcpClients?(clients: NormalizedMcpClient[]) {
    this.mcpClients = clients || [];
    // Safe non-blocking prefetch
    for (const c of this.mcpClients) {
      try {
        if (c.client && typeof c.client.listTools === 'function') {
          c.client.listTools().then((tools: any) => {
            this.mcpMetadata[c.id] = { tools };
          }).catch(() => {});
        }
      } catch (e) { /* ignore */ }
    }
  }

  async sendMessage(modelId: string, messages: Array<{ role: string; content: string }>) {
    // enrich system prompt
    const system = messages.find(m => m.role === 'system')?.content;
    const enriched = enrichSystemMessage(system, this.mcpMetadata);
    const chatMessages = messages.map(m => ({ role: m.role, content: m.role === 'system' && enriched ? enriched : m.content }));

    // send chatMessages to your model runtime and return text
    return 'ok';
  }
}
```

## Example unit test snippet (Mocha + Sinon)

```ts
import assert from 'assert';
import sinon from 'sinon';
import { ExampleProvider } from '../../src/providers/exampleProvider';

describe('ExampleProvider MCP integration', () => {
  it('prefetches mcp metadata and enriches system prompt', async () => {
    const provider = new ExampleProvider();
    const mockClient = {
      listTools: async () => [{ id: 't1', name: 'tool-one' }, { id: 't2', name: 'tool-two' }]
    };
    provider.setMcpClients?.([{ id: 'mcp1', label: 'Test MCP', client: mockClient }]);

    // Allow prefetch to complete
    await new Promise(r => setTimeout(r, 20));

    const messages = [ { role: 'system', content: 'system' }, { role: 'user', content: 'hello' } ];
    const result = await provider.sendMessage('m1', messages as any);
    // The provider's sendMessage returns 'ok' in this example; in a real provider you'd assert
    // the outbound request contained the enriched system message.
    assert.strictEqual(result, 'ok');
  });
});
```

## Notes
- Adjust import paths in the example depending on your project layout.
- The example is intentionally minimal to highlight MCP integration points.

*** End of example file
