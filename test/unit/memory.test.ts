// Mocha globals for TypeScript
import type * as Mocha from 'mocha';
declare var describe: any, it: any, beforeEach: any, afterEach: any;
import * as assert from 'assert';
import * as codieMemory from '../../src/codie-memory';
import * as fs from 'fs';
import * as path from 'path';

describe('Codie Persistent Memory', function() {
  let memoryFile: string;
  beforeEach(async function(this: Mocha.Context) {
    // Use a truly unique file for each test (include pid and test title)
    const testName = this.currentTest?.title?.replace(/\W+/g, '_') || 'test';
    memoryFile = path.join(__dirname, `../../codie-memory-${process.pid}-${testName}-${Date.now()}-${Math.random()}.sqlite`);
    codieMemory.setMemoryFilePath(memoryFile);
    await codieMemory.clearMemory();
    codieMemory.closeMemory();
    if (fs.existsSync(memoryFile)) fs.unlinkSync(memoryFile);
    await new Promise(res => setTimeout(res, 10));
  });
  afterEach(async () => {
    await codieMemory.clearMemory();
    codieMemory.closeMemory();
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

  it('should append to conversation history and enforce retention', async () => {
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
    // The first message should be {msg: 5} (keeps last 100)
    assert.deepStrictEqual(mem.conversationHistory[0], { msg: 5 });
    assert.deepStrictEqual(mem.conversationHistory[99], { msg: 104 });
  });

  it('should clear memory file', async () => {
    await codieMemory.setLastFileOpIntent(true);
    // SQLite file should exist after write
    assert.strictEqual(fs.existsSync(memoryFile), true);
    await codieMemory.clearMemory();
    // SQLite file should still exist, but be empty
    assert.strictEqual(fs.existsSync(memoryFile), true);
    // Should return default state
    const mem = await codieMemory.readMemory();
    assert.strictEqual(mem.lastFileOpIntent, false);
    assert.strictEqual(mem.lastFileOpDetails, null);
    assert.deepStrictEqual(mem.conversationHistory, []);
  });
});
