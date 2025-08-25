// (stray top-level closeDB removed)
// SQLiteVectorStore.ts
// Local, cross-platform vector store for Codie using SQLite (with fallback to brute-force search)
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { VectorStoreAdapter, VectorMetadata, VectorSearchResult, VectorGetResult } from './VectorStoreAdapter';

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class SQLiteVectorStore implements VectorStoreAdapter {
  private db: Database.Database;
  private dim: number;

  constructor(dbPath: string, dim: number) {
    this.dim = dim;
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(`CREATE TABLE IF NOT EXISTS vectors (
      id TEXT PRIMARY KEY,
      vector BLOB NOT NULL,
      metadata TEXT,
      content TEXT
    )`);
  }

  public closeDB(): void {
    if (this.db) {
      this.db.close();
    }
  }


  async addVector(id: string, vector: number[], metadata: VectorMetadata, content: string): Promise<void> {
    const buf = Buffer.from(new Float32Array(vector).buffer);
    this.db.prepare('INSERT OR REPLACE INTO vectors (id, vector, metadata, content) VALUES (?, ?, ?, ?)')
      .run(id, buf, JSON.stringify(metadata), content);
  }

  async getById(ids: string[]): Promise<VectorGetResult[]> {
    const stmt = this.db.prepare('SELECT id, vector, metadata, content FROM vectors WHERE id IN (' + ids.map(() => '?').join(',') + ')');
    return stmt.all(...ids).map((row: any) => ({
      id: row.id,
      vector: Array.from(new Float32Array(row.vector.buffer, row.vector.byteOffset, row.vector.length / 4)),
      metadata: JSON.parse(row.metadata),
      content: row.content
    }));
  }

  async search(queryVector: number[], limit: number): Promise<VectorSearchResult[]> {
    // Brute-force search: load all vectors, compute cosine similarity
    const rows = this.db.prepare('SELECT id, vector, metadata, content FROM vectors').all();
    const results = rows.map((row: any) => {
      const vec = Array.from(new Float32Array(row.vector.buffer, row.vector.byteOffset, row.vector.length / 4));
      return {
        id: row.id,
        score: cosineSimilarity(queryVector, vec),
        metadata: JSON.parse(row.metadata),
        content: row.content
      };
    });
  return results.sort((a: VectorSearchResult, b: VectorSearchResult) => b.score - a.score).slice(0, limit);
  }

  async searchByMetadata(filter: Partial<VectorMetadata>, limit: number): Promise<VectorGetResult[]> {
    // Simple filter: match JSON stringified keys/values
    const rows = this.db.prepare('SELECT id, vector, metadata, content FROM vectors').all();
    const matches = rows.filter((row: any) => {
      const meta = JSON.parse(row.metadata);
      return Object.entries(filter).every(([k, v]) => meta[k] === v);
    });
    return matches.slice(0, limit).map((row: any) => ({
      id: row.id,
      vector: Array.from(new Float32Array(row.vector.buffer, row.vector.byteOffset, row.vector.length / 4)),
      metadata: JSON.parse(row.metadata),
      content: row.content
    }));
  }

  async deleteVector(id: string): Promise<void> {
    this.db.prepare('DELETE FROM vectors WHERE id = ?').run(id);
  }
}
