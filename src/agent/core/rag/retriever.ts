// src/agent/core/rag/retriever.ts
import { VectorStore } from './vectorStore.js';
import { EmbeddingGenerator } from './embeddings.js';
import { PrismaClient } from '@prisma/client';
import { VectorDocument, VectorSearchOptions } from '../../../types/vector-types.js';

interface RetrievalResult {
    documents: VectorDocument[];
    context: string;
    confidence: number;
}

export class DocumentRetriever {
    private vectorStore: VectorStore;
    private embeddings: EmbeddingGenerator;
    private prisma: PrismaClient;

    constructor() {
        this.vectorStore = new VectorStore();
        this.embeddings = new EmbeddingGenerator(true);
        this.prisma = new PrismaClient();
    }

    async retrieveContext(query: string): Promise<RetrievalResult> {
        try {
            const queryEmbedding = await this.embeddings.generateEmbedding(query);

            const searchOptions: VectorSearchOptions = {
                threshold: 0.7,
                limit: 5,
                embedding: queryEmbedding
            };

            const documents = await this.vectorStore.findSimilar(query, searchOptions);
            const rankedDocs = await this.rerankeDocuments(documents);
            const confidence = this.calculateConfidence(rankedDocs);
            const context = this.generateContext(rankedDocs);

            return {
                documents: rankedDocs,
                context,
                confidence
            };
        } catch (error) {
            console.error('Error retrieving context:', error);
            throw error;
        }
    }

    private async rerankeDocuments(documents: VectorDocument[]): Promise<VectorDocument[]> {
        return documents.map(doc => {
            const metadata = doc.metadata || {};
            let score = doc.similarity || 0;

            if (metadata.verified) score += 0.1;
            if (metadata.source === 'official') score += 0.1;

            if (metadata.timestamp) {
                const ageInDays = this.calculateDocumentAge(metadata.timestamp);
                score += this.getRecencyBoost(ageInDays);
            }

            return {
                ...doc,
                similarity: score
            };
        }).sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    }

    private calculateConfidence(documents: VectorDocument[]): number {
        if (documents.length === 0) return 0;

        const avgSimilarity = documents.reduce((sum, doc) => 
            sum + (doc.similarity || 0), 0) / documents.length;

        const coverageScore = Math.min(documents.length / 3, 1);
        return avgSimilarity * 0.7 + coverageScore * 0.3;
    }

    private generateContext(documents: VectorDocument[]): string {
        const MAX_CONTEXT_LENGTH = 4000;
        let currentLength = 0;
        const contextParts: string[] = [];

        for (const doc of documents) {
            if (currentLength >= MAX_CONTEXT_LENGTH) break;

            const contextPart = `Source: ${doc.metadata?.source || 'Unknown'}
            Relevance: ${(doc.similarity || 0).toFixed(2)}
            Content: ${doc.content}
            ---`;

            if (currentLength + contextPart.length <= MAX_CONTEXT_LENGTH) {
                contextParts.push(contextPart);
                currentLength += contextPart.length;
            } else {
                const remainingSpace = MAX_CONTEXT_LENGTH - currentLength;
                if (remainingSpace > 100) {
                    const truncated = contextPart.slice(0, remainingSpace - 3) + '...';
                    contextParts.push(truncated);
                }
                break;
            }
        }

        return contextParts.join('\n\n');
    }

    async addDocument(content: string, metadata: Record<string, any>): Promise<VectorDocument> {
        try {
            const embedding = await this.embeddings.generateEmbedding(content);
            return await this.vectorStore.addDocument(content, {
                ...metadata,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error adding document:', error);
            throw error;
        }
    }

    async addDocuments(documents: { content: string; metadata: Record<string, any> }[]): Promise<VectorDocument[]> {
        try {
            const contents = documents.map(doc => doc.content);
            const embeddings = await this.embeddings.generateBatchEmbeddings(contents);

            return await Promise.all(
                documents.map((doc, i) => 
                    this.vectorStore.addDocument(doc.content, {
                        ...doc.metadata,
                        timestamp: new Date().toISOString()
                    })
                )
            );
        } catch (error) {
            console.error('Error adding documents in batch:', error);
            throw error;
        }
    }

    private calculateDocumentAge(timestamp: string | Date): number {
        const docDate = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - docDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    private getRecencyBoost(ageInDays: number): number {
        return Math.max(0, 0.2 * Math.exp(-ageInDays / 30));
    }
}