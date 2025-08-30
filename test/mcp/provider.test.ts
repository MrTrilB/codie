import 'mocha';
import * as assert from 'assert';
import sinon from 'sinon';
import { ToolRegistry } from '../../src/tools/ToolRegistry';
import { MCPToolProvider } from '../../src/tools/MCPToolProvider';
import MCPClient from '../../src/mcp/Client';

describe('MCPToolProvider', () => {
  const cfg = { endpoint: 'http://localhost:4000', apiKey: 'k' } as any;
  let clientStub: sinon.SinonStub;

  beforeEach(() => {
    // stub MCPClient.prototype.listTools and invokeTool
    clientStub = sinon.stub(MCPClient.prototype, 'listTools');
    sinon.stub(MCPClient.prototype, 'invokeTool').resolves({ success: true, output: 'ok' } as any);
    // clear registry
    for (const t of ToolRegistry.list()) {
      // @ts-ignore
      ToolRegistry.unregisterTool(t.id);
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  it('refresh registers tools from MCP client', async () => {
    const provider = new MCPToolProvider(cfg.endpoint, cfg.apiKey, 'Local MCP');
    clientStub.resolves([{ id: 'tool-a', label: 'A' } as any]);
    await provider.refresh();
    const tools = ToolRegistry.list();
    assert.ok(tools.find(t => t.id === 'tool-a'));
  });

  it('registered tool execute calls client.invokeTool', async () => {
    const provider = new MCPToolProvider(cfg.endpoint, cfg.apiKey, 'Local MCP');
    clientStub.resolves([{ id: 'tool-run', label: 'Run' } as any]);
    await provider.refresh();
    const res = await ToolRegistry.execute('tool-run', { x: 1 }, { workspaceFolder: 'w' } as any);
    assert.deepStrictEqual(res, { success: true, output: 'ok' });
  });
});
