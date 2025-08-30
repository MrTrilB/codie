import 'mocha';
import * as assert from 'assert';
import sinon from 'sinon';
import MCPClient from '../../src/mcp/Client';

describe('MCPClient', () => {
  const fakeConfig = { endpoint: 'http://localhost:4000', apiKey: 'abc' } as any;
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    // stub global.fetch
    fetchStub = sinon.stub(global as any, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('listTools should call /tools and return parsed JSON', async () => {
    const client = new MCPClient(fakeConfig);
    const tools = [{ id: 't1', label: 'T1' }];
    fetchStub.resolves({ ok: true, json: async () => tools } as any);

    const res = await client.listTools();
    assert.deepStrictEqual(res, tools);
    sinon.assert.calledOnce(fetchStub);
  });

  it('invokeTool should POST to /tools/:id/invoke and return response', async () => {
    const client = new MCPClient(fakeConfig);
    const result = { success: true, output: 'ok' };
    fetchStub.resolves({ ok: true, json: async () => result } as any);

    const res = await client.invokeTool('tool-x', { foo: 'bar' });
    assert.deepStrictEqual(res, result);
    sinon.assert.calledOnce(fetchStub);
    const callArgs = fetchStub.getCall(0).args;
    assert.ok(callArgs[0].includes('/tools/tool-x/invoke'));
    assert.strictEqual(callArgs[1].method, 'POST');
  });

  it('getResource should throw on non-ok response', async () => {
    const client = new MCPClient(fakeConfig);
    fetchStub.resolves({ ok: false, status: 404, statusText: 'Not Found', text: async () => 'no' } as any);
    try {
      await client.getResource('nope');
      throw new Error('expected error');
    } catch (err: any) {
      assert.match(err.message, /MCP GET \/resources\/nope failed/);
    }
  });
});
