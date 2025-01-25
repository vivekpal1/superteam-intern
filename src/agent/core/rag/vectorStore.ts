// src/agent/core/rag/vectorStore.ts
import { EmbeddingGenerator } from './embeddings.js';
import { PrismaClient, Prisma } from '@prisma/client';
import { VectorDocument } from '../../../types/vector-types.js';

export class VectorStore {
    private prisma: PrismaClient;
    private embeddings: EmbeddingGenerator;

    constructor() {
        this.prisma = new PrismaClient();
        this.embeddings = new EmbeddingGenerator();
    }

    private async executeSingleRowQuery<T>(query: Promise<T[]>): Promise<T> {
        const result = await query;
        if (!result || result.length === 0) {
            throw new Error('Query returned no results');
        }
        return result[0];
    }

    private transformToVectorDocument(doc: Record<string, any>): VectorDocument {
        return {
            id: doc.id,
            content: doc.content,
            embedding: Array.from(doc.embedding),
            metadata: typeof doc.metadata === 'string' 
                ? JSON.parse(doc.metadata) 
                : doc.metadata,
            similarity: doc.similarity,
            type: doc.type,
            status: doc.status
        };
    }

    async addDocument(content: string, metadata: Record<string, any> = {}): Promise<VectorDocument> {
        try {
            const embedding = await this.embeddings.generateEmbedding(content);
            
            const document = await this.executeSingleRowQuery(
                this.prisma.$queryRaw<VectorDocument[]>`
                    INSERT INTO "Document" (
                        id,
                        content,
                        embedding,
                        metadata,
                        type,
                        status,
                        "createdAt",
                        "updatedAt"
                    ) VALUES (
                        gen_random_uuid(),
                        ${content},
                        ${embedding}::vector,
                        ${JSON.stringify(metadata)}::jsonb,
                        'document',
                        'active',
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    RETURNING *
                `
            );

            return this.transformToVectorDocument(document);
        } catch (error) {
            console.error('Error adding document:', error);
            throw error;
        }
    }

    async findSimilar(query: string, options = { threshold: 0.7, limit: 5 }): Promise<VectorDocument[]> {
        try {
            const queryEmbedding = await this.embeddings.generateEmbedding(query);
            
            const documents = await this.prisma.$queryRaw`
                SELECT 
                    id,
                    content,
                    embedding,
                    metadata,
                    type,
                    status,
                    1 - (embedding <=> ${queryEmbedding}::vector) as similarity
                FROM "Document"
                WHERE 1 - (embedding <=> ${queryEmbedding}::vector) > ${options.threshold}
                ORDER BY similarity DESC
                LIMIT ${options.limit}
            `;

            return (documents as any[]).map(doc => this.transformToVectorDocument(doc));
        } catch (error) {
            console.error('Error finding similar documents:', error);
            throw error;
        }
    }

    async createDocument(content: string, data: { embedding: number[]; metadata: any }): Promise<VectorDocument> {
        try {
            const document = await this.executeSingleRowQuery(
                this.prisma.$queryRaw<VectorDocument[]>`
                    INSERT INTO "Document" (
                        id,
                        content,
                        embedding,
                        metadata,
                        type,
                        status,
                        "createdAt",
                        "updatedAt"
                    ) VALUES (
                        gen_random_uuid(),
                        ${content},
                        ${data.embedding}::vector,
                        ${JSON.stringify(data.metadata)}::jsonb,
                        'document',
                        'active',
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    RETURNING *
                `
            );

            return this.transformToVectorDocument(document);
        } catch (error) {
            console.error('Error creating document:', error);
            throw error;
        }
    }

    async deleteDocument(id: string): Promise<void> {
        await this.prisma.document.delete({
            where: { id }
        });
    }

    async searchByMetadata(metadataQuery: Record<string, any>): Promise<VectorDocument[]> {
        const documents = await this.prisma.document.findMany({
            where: {
                metadata: {
                    path: Object.keys(metadataQuery),
                    equals: Object.values(metadataQuery)
                }
            }
        });

        return documents.map(doc => this.transformToVectorDocument(doc));
    }
}