// src/agent/core/rag/vectorStore.ts
import { PrismaClient } from '@prisma/client';
import { EmbeddingGenerator } from './embeddings.js';

export class VectorStore {
    private prisma: PrismaClient;
    private embeddings: EmbeddingGenerator;

    constructor() {
        this.prisma = new PrismaClient();
        this.embeddings = new EmbeddingGenerator();
    }

    async addDocument(content: string, metadata: Record<string, any> = {}) {
        const embedding = await this.embeddings.generateEmbedding(content);

        return this.prisma.document.create({
            data: {
                content,
                embedding,
                metadata: metadata
            }
        });
    }

    async findSimilar(query: string, options = { threshold: 0.7, limit: 5 }) {
        const queryEmbedding = await this.embeddings.generateEmbedding(query);

        const documents = await this.prisma.$queryRaw`
            SELECT 
                id,
                content,
                metadata,
                1 - (embedding <=> ${queryEmbedding}::vector) as similarity
            FROM "Document"
            WHERE 1 - (embedding <=> ${queryEmbedding}::vector) > ${options.threshold}
            ORDER BY similarity DESC
            LIMIT ${options.limit}
        `;

        return documents;
    }

    async deleteDocument(id: string) {
        return this.prisma.document.delete({
            where: { id }
        });
    }

    async searchByMetadata(metadataQuery: Record<string, any>) {
        return this.prisma.document.findMany({
            where: {
                metadata: {
                    path: Object.keys(metadataQuery),
                    equals: Object.values(metadataQuery)
                }
            }
        });
    }
}