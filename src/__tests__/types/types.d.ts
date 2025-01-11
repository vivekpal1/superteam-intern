// src/__tests__/mocks/types.ts
import { jest } from '@jest/globals';

export interface Document {
    id: string;
    content: string;
    embedding: number[];
    metadata: any;
    createdAt: Date;
    updatedAt: Date;
}

export interface DocumentWithSimilarity extends Document {
    similarity: number;
}

export interface ActivityLog {
    id: string;
    type: string;
    userId: string;
    metadata: any;
    timestamp: Date;
}

export interface ErrorLog {
    id: string;
    type: string;
    error: string;
    userId: string;
    metadata: any | null;
    timestamp: Date;
}