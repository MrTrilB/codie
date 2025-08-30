import path from 'path';
import { SQLiteVectorStore } from './tools/SQLiteVectorStore';
import { runtimeRequire } from './utils/runtimeRequire';
import { withCodieServices } from './services/getCodieServices';

// Load better-sqlite3 at runtime to avoid bundling native binary into webpack build
let Database: any = null;
function requireBetterSqlite3() {
    if (!Database) {
    Database = runtimeRequire(['better-sqlite3'], { logName: 'better-sqlite3' });
    if (!Database) {
  try { withCodieServices((mod: any) => { try { mod.codieServices.log('[codie-memory] better-sqlite3 not available; memory persistence will be unavailable.'); } catch {} }); } catch {}
    }
  }
  return Database;
}

let DB_PATH = path.join(__dirname, '../codie-memory.sqlite');
let VECTOR_DIM = 1; // Dummy dimension for now (no real embedding)
let vectorStore: SQLiteVectorStore | null = null;
let db: any = null;

export function closeMemory() {
  if (vectorStore) {
    try { vectorStore.closeDB(); } catch {}
    vectorStore = null;
  }
  if (db) {
    try { db.close(); } catch {}
    db = null;
  }
}

export function setMemoryFilePath(filePath: string) {
  DB_PATH = filePath;
  vectorStore = null;
  db = null;
}

function getDb(): any {
  if (!db) {
    const DB = requireBetterSqlite3();
    if (!DB) throw new Error('better-sqlite3 not available');
    db = new DB(DB_PATH);
    db.exec(`CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);
  }
  return db;
}

function getVectorStore(): SQLiteVectorStore {
  if (!vectorStore) {
    vectorStore = new SQLiteVectorStore(DB_PATH, VECTOR_DIM);
  }
  return vectorStore;
}

const DEFAULT_MEMORY = {
  lastFileOpIntent: false,
  lastFileOpDetails: null,
  conversationHistory: []
};

export async function readMemory() {
  try {
    const db = getDb();
    const vectorStore = getVectorStore();
    // Get kv
    const intentRow = db.prepare('SELECT value FROM kv WHERE key = ?').get('lastFileOpIntent');
    const detailsRow = db.prepare('SELECT value FROM kv WHERE key = ?').get('lastFileOpDetails');
    // Get conversation history (last 100)
    const results = await vectorStore.searchByMetadata({ type: 'conversation' }, 100);
    return {
      lastFileOpIntent: intentRow && typeof intentRow === 'object' && 'value' in intentRow && typeof (intentRow as any).value === 'string' ? JSON.parse((intentRow as any).value) : false,
      lastFileOpDetails: detailsRow && typeof detailsRow === 'object' && 'value' in detailsRow && typeof (detailsRow as any).value === 'string' ? JSON.parse((detailsRow as any).value) : null,
      conversationHistory: results.map(r => JSON.parse(r.content))
    };
  } catch (err) {
    return { ...DEFAULT_MEMORY };
  }
}

export async function writeMemory(memory: any) {
  try {
    const db = getDb();
    const vectorStore = getVectorStore();
    db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)').run('lastFileOpIntent', JSON.stringify(memory.lastFileOpIntent));
    db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)').run('lastFileOpDetails', JSON.stringify(memory.lastFileOpDetails));
    // Clear all conversation vectors
    const old = await vectorStore.searchByMetadata({ type: 'conversation' }, 1000);
    for (const row of old) {
      await vectorStore.deleteVector(row.id);
    }
    // Add new conversation history
    for (let i = 0; i < memory.conversationHistory.length; ++i) {
      const msg = memory.conversationHistory[i];
      await vectorStore.addVector(
        `conv_${i}_${Date.now()}`,
        [0], // Dummy vector
        { role: 'conversation', type: 'conversation', index: i },
        JSON.stringify(msg)
      );
    }
    return true;
  } catch (err) {
    return false;
  }
}

export async function clearMemory() {
  try {
    const db = getDb();
    const vectorStore = getVectorStore();
    db.prepare('DELETE FROM kv').run();
    const old = await vectorStore.searchByMetadata({ type: 'conversation' }, 1000);
    for (const row of old) {
      await vectorStore.deleteVector(row.id);
    }
    return true;
  } catch (err) {
    return false;
  }
}

export async function appendConversation(message: any) {
  const mem = await readMemory();
  if (!Array.isArray(mem.conversationHistory)) mem.conversationHistory = [];
  mem.conversationHistory.push(message);
  // Retain only the last 100 messages (strictly)
  if (mem.conversationHistory.length > 100) {
    mem.conversationHistory = mem.conversationHistory.slice(-100);
  }
  await writeMemory(mem);
}

export async function setLastFileOpIntent(intent: boolean) {
  const mem = await readMemory();
  mem.lastFileOpIntent = intent;
  await writeMemory(mem);
}

export async function setLastFileOpDetails(details: any) {
  const mem = await readMemory();
  mem.lastFileOpDetails = details;
  await writeMemory(mem);
}

export async function getLastFileOpIntent() {
  const mem = await readMemory();
  return mem.lastFileOpIntent;
}

export async function getLastFileOpDetails() {
  const mem = await readMemory();
  return mem.lastFileOpDetails;
}
