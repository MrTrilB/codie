// VectorStoreAdapter.ts
// Universal, local, cross-platform vector store interface for Codie

export interface VectorMetadata {
  role: string;
  type?: string;
  createdAt?: number;
  tool?: string;
  parameters?: Record<string, any>;
  error?: string;
  [key: string]: any;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
  content: string;
}

export interface VectorGetResult {
  id: string;
  vector?: number[];
  metadata: VectorMetadata;
  content: string;
}

export interface VectorStoreAdapter {
  addVector(id: string, vector: number[], metadata: VectorMetadata, content: string): Promise<void>;
  getById(ids: string[]): Promise<VectorGetResult[]>;
  search(vector: number[], limit: number): Promise<VectorSearchResult[]>;
  searchByMetadata(filter: Partial<VectorMetadata>, limit: number): Promise<VectorGetResult[]>;
  deleteVector(id: string): Promise<void>;
  close?(): void;
}
