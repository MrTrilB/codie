// Mocha globals for TypeScript
import type * as Mocha from 'mocha';
declare var describe: any, it: any, beforeEach: any, afterEach: any;
import * as assert from 'assert';
import * as codieMemory from '../../src/codie-memory';
import * as fs from 'fs';
import * as path from 'path';

describe('Codie Persistent Memory - Corruption', function() {
  it('should recover from file corruption', async () => {
    // Use a file name unique to this test
    const corruptionFile = path.join(__dirname, '../../codie-memory-corruption.sqlite');
    codieMemory.setMemoryFilePath(corruptionFile);
    await codieMemory.clearMemory();
    codieMemory.closeMemory();
    if (fs.existsSync(corruptionFile)) fs.unlinkSync(corruptionFile);
    // Write garbage to the SQLite file
    fs.writeFileSync(corruptionFile, '{corrupted sqlite', 'utf8');
    const mem = await codieMemory.readMemory();
    assert.strictEqual(mem.lastFileOpIntent, false);
    assert.strictEqual(mem.lastFileOpDetails, null);
    assert.deepStrictEqual(mem.conversationHistory, []);
    // Clean up
    codieMemory.closeMemory();
    if (fs.existsSync(corruptionFile)) fs.unlinkSync(corruptionFile);
  });
});
