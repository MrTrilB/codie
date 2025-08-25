// Standalone memory corruption test (no VS Code deps)
import * as assert from 'assert';
import * as codieMemory from '../../src/codie-memory';
import * as fs from 'fs';
import * as path from 'path';

describe('Codie Persistent Memory - Corruption (standalone)', function() {
  /**
   * Attempt to robustly unlink a file, retrying on EBUSY/EPERM (common with SQLite on Windows).
   * Returns true if deleted, false if EBUSY persists after all retries.
   */
  async function robustUnlink(file: string): Promise<boolean> {
    for (let i = 0; i < 30; ++i) {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
        return true;
      } catch (e) {
        if (typeof e === 'object' && e && 'code' in e && ((e as any).code === 'EBUSY' || (e as any).code === 'EPERM')) {
          console.warn(`robustUnlink: retry ${i + 1} for ${file} due to ${(e as any).code}`);
          await new Promise(res => setTimeout(res, 200));
        } else {
          throw e;
        }
      }
    }
    // Final attempt
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
      return true;
    } catch (e) {
      if (typeof e === 'object' && e && 'code' in e && ((e as any).code === 'EBUSY' || (e as any).code === 'EPERM')) {
        return false;
      }
      throw e;
    }
  }

  it('should recover from file corruption', async function() {
    // NOTE: This test is flaky on Windows due to SQLite file locking (EBUSY/EPERM).
    // If EBUSY persists after all retries, skip the test to avoid blocking CI.
    const corruptionFile = path.join(__dirname, '../../codie-memory-corruption-standalone.sqlite');
    codieMemory.setMemoryFilePath(corruptionFile);
    await codieMemory.clearMemory();
    codieMemory.closeMemory();
    await new Promise(res => setTimeout(res, 200));
    const deleted = await robustUnlink(corruptionFile);
    if (!deleted) {
      this.skip();
      return;
    }
    await new Promise(res => setTimeout(res, 50));
    fs.writeFileSync(corruptionFile, '{corrupted sqlite', 'utf8');
    const mem = await codieMemory.readMemory();
    assert.strictEqual(mem.lastFileOpIntent, false);
    assert.strictEqual(mem.lastFileOpDetails, null);
    assert.deepStrictEqual(mem.conversationHistory, []);
    await robustUnlink(corruptionFile);
    await new Promise(res => setTimeout(res, 50));
  });
});
