// src/__tests__/types/mocks.ts
import { Document, ActivityLog, ErrorLog } from '@prisma/client';

export interface DocumentWithSimilarity extends Document {
    similarity: number;
}

export interface MockedPrismaClient {
    document: {
        create: jest.Mock<Promise<Document>>;
        findMany: jest.Mock<Promise<Document[]>>;
        $queryRaw: jest.Mock<Promise<DocumentWithSimilarity[]>>;
    };
    activityLog: {
        create: jest.Mock<Promise<ActivityLog>>;
    };
    errorLog: {
        create: jest.Mock<Promise<ErrorLog>>;
    };
}

export interface MockedVectorStore {
    addDocument: jest.Mock<Promise<Document>>;
    findSimilar: jest.Mock<Promise<DocumentWithSimilarity[]>>;
}

export interface MockedModelSelector {
    initialize: jest.Mock<Promise<void>>;
    generateResponse: jest.Mock<Promise<string>>;
}