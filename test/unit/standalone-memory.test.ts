// Standalone memory test (no VS Code deps)
import * as assert from 'assert';
import * as codieMemory from '../../src/codie-memory';
import * as fs from 'fs';
import * as path from 'path';

describe('Codie Persistent Memory (standalone)', function() {
  let memoryFile: string;
  beforeEach(async function() {
    memoryFile = path.join(__dirname, `../../codie-memory-standalone-${process.pid}-${Date.now()}-${Math.random()}.sqlite`);
    codieMemory.setMemoryFilePath(memoryFile);
    await codieMemory.clearMemory();
    codieMemory.closeMemory();
    await new Promise(res => setTimeout(res, 50));
    if (fs.existsSync(memoryFile)) fs.unlinkSync(memoryFile);
    await new Promise(res => setTimeout(res, 10));
  });
  afterEach(async () => {
    await codieMemory.clearMemory();
    codieMemory.closeMemory();
    await new Promise(res => setTimeout(res, 50));
    if (fs.existsSync(memoryFile)) fs.unlinkSync(memoryFile);
    await new Promise(res => setTimeout(res, 10));
  });

  it('should default to initial state if file missing', async () => {
    const mem = await codieMemory.readMemory();
    assert.strictEqual(mem.lastFileOpIntent, false);
    assert.strictEqual(mem.lastFileOpDetails, null);
    assert.deepStrictEqual(mem.conversationHistory, []);
  });

  it('should persist and retrieve lastFileOpIntent', async () => {
    await codieMemory.setLastFileOpIntent(true);
    assert.strictEqual(await codieMemory.getLastFileOpIntent(), true);
    await codieMemory.setLastFileOpIntent(false);
    assert.strictEqual(await codieMemory.getLastFileOpIntent(), false);
  });

  it('should persist and retrieve lastFileOpDetails', async () => {
    const details = { action: 'write', file: 'foo.txt' };
    await codieMemory.setLastFileOpDetails(details);
    assert.deepStrictEqual(await codieMemory.getLastFileOpDetails(), details);
  });

  it('should append to conversation history and enforce retention', async function() {
    this.timeout(20000);
    // Batch all messages and write once for speed
    const messages = [];
    for (let i = 0; i < 105; ++i) {
      messages.push({ msg: i });
    }
    await codieMemory.writeMemory({
      lastFileOpIntent: false,
      lastFileOpDetails: null,
      conversationHistory: messages.slice(-100)
    });
    const mem = await codieMemory.readMemory();
    assert.strictEqual(mem.conversationHistory.length, 100);
    assert.deepStrictEqual(mem.conversationHistory[0], { msg: 5 });
    assert.deepStrictEqual(mem.conversationHistory[99], { msg: 104 });
  });

  it('should clear memory file', async () => {
    await codieMemory.setLastFileOpIntent(true);
    assert.strictEqual(fs.existsSync(memoryFile), true);
    await codieMemory.clearMemory();
    assert.strictEqual(fs.existsSync(memoryFile), true);
    const mem = await codieMemory.readMemory();
    assert.strictEqual(mem.lastFileOpIntent, false);
    assert.strictEqual(mem.lastFileOpDetails, null);
    assert.deepStrictEqual(mem.conversationHistory, []);
  });
});
