import assert from 'assert';
import sinon, { SinonStubbedInstance } from 'sinon';
import { FoundryLocalProvider } from '../../src/providers/FoundryLocalProvider';
import Mocha from 'mocha';

export function registerFoundryLocalProviderTests(parentSuite: Mocha.Suite) {
  const suite = Mocha.Suite.create(parentSuite, 'FoundryLocalProvider (SDK-based)');

  let provider: FoundryLocalProvider;
  let sdkStub: SinonStubbedInstance<any>;

  suite.beforeEach(function () {
    provider = new FoundryLocalProvider();
    // Stub the foundryManager methods
    sdkStub = sinon.stub((provider as any)['foundryManager']);
    (provider as any)['endpoint'] = 'http://localhost:60244';
    (provider as any)['apiKey'] = 'test-key';
  });

  suite.afterEach(function () {
    sinon.restore();
  });

  suite.addTest(new Mocha.Test('should construct with explicit endpoint', function () {
    const p = new FoundryLocalProvider('http://localhost:60244');
    assert.strictEqual((p as any)['endpoint'], 'http://localhost:60244');
  }));

  suite.addTest(new Mocha.Test('should expose discoverEndpoint as a public method', function () {
    assert.strictEqual(typeof provider.discoverEndpoint, 'function');
  }));

  suite.addTest(new Mocha.Test('should return provider name', function () {
    assert.strictEqual(provider.getName(), 'FoundryLocal');
  }));

  suite.addTest(new Mocha.Test('should call SDK to discover endpoint', async function () {
    sdkStub.isServiceRunning.resolves(true);
    sdkStub.endpoint = 'http://localhost:60244';
    sdkStub.apiKey = 'test-key';
    const ep = await provider.discoverEndpoint();
    assert.strictEqual(ep, 'http://localhost:60244');
  }));

  suite.addTest(new Mocha.Test('should list models using SDK', async function () {
    sdkStub.listCatalogModels.resolves([
      { id: 'm1', name: 'Model 1', description: 'desc1' },
      { id: 'm2', name: 'Model 2', description: 'desc2' },
    ]);
    sdkStub.listCachedModels.resolves([
      { id: 'm2', name: 'Model 2', description: 'desc2' },
      { id: 'm3', name: 'Model 3', description: 'desc3' },
    ]);
    const models = await provider.listModels();
    assert.strictEqual(models.length, 3);
    assert.deepStrictEqual(models.map((m: any) => m.id).sort(), ['m1', 'm2', 'm3']);
  }));

  suite.addTest(new Mocha.Test('should call SDK to load model in setActiveModel', async function () {
    sdkStub.loadModel.resolves();
    await provider.setActiveModel('m1');
    assert(sdkStub.loadModel.calledWith('m1'));
  }));

  suite.addTest(new Mocha.Test('should send message using OpenAI client with SDK endpoint', async function () {
    // Patch OpenAI client
    (provider as any)['openai'] = {
      chat: {
        completions: {
          create: async ({ model, messages }: { model: string, messages: any[] }) => ({
            choices: [{ message: { content: `Echo: ${messages[1].content}` } }],
          }),
        },
      },
    };
    const chatHistory = [
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hello' }
    ];
    const reply = await provider.sendMessage('m1', chatHistory);
    assert.strictEqual(reply, 'Echo: hello');
  }));

  suite.addTest(new Mocha.Test('should include MCP metadata in system prompt when available', async function () {
    // Prepare provider and stub OpenAI
    const captured: any = { messages: null };
    (provider as any)['openai'] = {
      chat: {
        completions: {
          create: async ({ model, messages }: { model: string, messages: any[] }) => {
            captured.messages = messages;
            return { choices: [{ message: { content: `Echo: ${messages.find(m=>m.role==='user')?.content}` } }] };
          }
        }
      }
    };

    // Inject MCP client metadata via setMcpClients
    const mockMcpClient = {
      id: 'mcp1',
      label: 'TestMCP',
      client: {
        listTools: async () => [ { id: 't1', name: 'tool-one' }, { id: 't2', name: 'tool-two' } ]
      }
    };
    // Call the provider hook
    if (typeof (provider as any).setMcpClients === 'function') {
      (provider as any).setMcpClients([mockMcpClient]);
      // Wait a tick for any async prefetch to complete
      await new Promise(r => setTimeout(r, 10));
    }

    const chatHistory = [
      { role: 'system', content: 'system-instructions' },
      { role: 'user', content: 'hello' }
    ];
    const reply = await provider.sendMessage('m1', chatHistory);
    assert.strictEqual(reply, 'Echo: hello');
    // Verify the system message sent to OpenAI contains MCP metadata summary
    assert.ok(captured.messages, 'OpenAI was not called');
    const sys = captured.messages.find((m: any) => m.role === 'system');
    assert.ok(sys.content.includes('MCP Metadata'), 'System prompt was not enriched with MCP metadata');
    assert.ok(sys.content.includes('mcp1 provides tools'), 'MCP tools summary missing');
  }));

  // Additional tests for error handling, edge cases, and integration with Foundry Local SDK can be added here.
}
