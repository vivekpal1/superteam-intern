// src/types/vector-types.ts
export interface VectorSearchOptions {
    threshold: number;
    limit: number;
    embedding?: number[];
}

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  similarity?: number;
  type?: string;
  status?: string;
}