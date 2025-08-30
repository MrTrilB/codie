import 'mocha';
import * as assert from 'assert';
import sinon from 'sinon';
import { registerMcpServerHelper, unregisterMcpServerHelper } from '../../src/tools/mcpRegistration';
import { MCPToolProvider } from '../../src/tools/MCPToolProvider';

describe('MCP registration helpers', () => {
  afterEach(() => sinon.restore());

  it('registerMcpServerHelper persists and creates provider via factory', async () => {
    const current: any[] = [];
    const updateFn = sinon.stub().resolves();
    const created: any[] = [];

    const provider = await registerMcpServerHelper(current, updateFn, { endpoint: 'http://a', apiKey: 'k', label: 'A' }, (s) => {
      const p = new MCPToolProvider(s.endpoint, s.apiKey, s.label);
      created.push(p);
      return p;
    }, (p) => { /* no-op for tests */ });

    sinon.assert.calledOnce(updateFn);
    assert.ok(created.length === 1, 'provider factory not called');
    assert.ok(provider && provider.id && provider.id.startsWith('mcp:'), 'provider id malformed');
  });

  it('unregisterMcpServerHelper updates list and disposes matching providers', async () => {
    const current = [{ endpoint: 'http://x' }, { endpoint: 'http://y' }];
    const updateFn = sinon.stub().resolves();
    const p1 = new MCPToolProvider('http://x', '', 'X');
    const p2 = new MCPToolProvider('http://y', '', 'Y');
    const disposed: string[] = [];
    p1.dispose = () => disposed.push(p1.id);

    const remaining = await unregisterMcpServerHelper(current, updateFn, 'http://x', [p1, p2], (p) => { try { p.dispose(); } catch (e) {} }, (id: string) => {});

    sinon.assert.calledOnce(updateFn);
    assert.deepStrictEqual(disposed, [p1.id]);
    assert.ok(Array.isArray(remaining) && remaining.length === 1 && remaining[0].endpoint === 'http://y');
  });
});
