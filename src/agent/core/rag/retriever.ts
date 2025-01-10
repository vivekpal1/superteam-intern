// src/agent/core/rag/retriever.ts
import { VectorStore } from './vectorStore.js';
import { EmbeddingGenerator } from './embeddings.js';
import { PrismaClient } from '@prisma/client';

interface Document {
    id: string;
    content: string;
    metadata: Record<string, any>;
    similarity?: number;
}

interface RetrievalResult {
    documents: Document[];
    context: string;
    confidence: number;
}

export class DocumentRetriever {
    private vectorStore: VectorStore;
    private embeddings: EmbeddingGenerator;
    private prisma: PrismaClient;

    constructor() {
        this.vectorStore = new VectorStore();
        this.embeddings = new EmbeddingGenerator(true); // Use local embeddings
        this.prisma = new PrismaClient();
    }

    /**
     * Retrieves relevant documents and generates a context string for the query
     * Uses a multi-stage retrieval process:
     * 1. Semantic search using embeddings
     * 2. Relevance filtering
     * 3. Context window optimization
     */
    async retrieveContext(query: string): Promise<RetrievalResult> {
        try {
            const queryEmbedding = await this.embeddings.generateEmbedding(query);

            const documents = await this.vectorStore.findSimilar(query, {
                embedding: queryEmbedding,
                threshold: 0.7,
                limit: 5
            });

            const rankedDocs = await this.rerankeDocuments(documents, query);

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

    /**
     * Reranks documents based on multiple factors:
     * - Semantic similarity
     * - Recency
     * - Source reliability
     */
    private async rerankeDocuments(
        documents: Document[],
        query: string
    ): Promise<Document[]> {
        return documents.map(doc => {
            let score = doc.similarity || 0;

            if (doc.metadata.verified) score += 0.1;
            if (doc.metadata.source === 'official') score += 0.1;

            if (doc.metadata.timestamp) {
                const ageInDays = this.calculateDocumentAge(doc.metadata.timestamp);
                score += this.getRecencyBoost(ageInDays);
            }

            return {
                ...doc,
                similarity: score
            };
        }).sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    }

    /**
     * Calculates a confidence score for the retrieval results
     * Based on:
     * - Average similarity of top documents
     * - Number of relevant documents found
     * - Consistency of information across documents
     */
    private calculateConfidence(documents: Document[]): number {
        if (documents.length === 0) return 0;

        const avgSimilarity = documents.reduce(
            (sum, doc) => sum + (doc.similarity || 0),
            0
        ) / documents.length;

        const coverageScore = Math.min(documents.length / 3, 1);

        return avgSimilarity * 0.7 + coverageScore * 0.3;
    }

    /**
     * Generates an optimized context string from retrieved documents
     * Implements smart truncation and ordering to fit within context limits
     */
    private generateContext(documents: Document[]): string {
        const MAX_CONTEXT_LENGTH = 4000;
        let currentLength = 0;
        const contextParts: string[] = [];

        for (const doc of documents) {
            if (currentLength >= MAX_CONTEXT_LENGTH) break;

            const contextPart = `Source: ${doc.metadata.source || 'Unknown'}
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

    private calculateDocumentAge(timestamp: string | Date): number {
        const docDate = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - docDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    private getRecencyBoost(ageInDays: number): number {
        return Math.max(0, 0.2 * Math.exp(-ageInDays / 30));
    }

    /**
     * Adds a new document to the retrieval system
     * Handles embedding generation and storage
     */
    async addDocument(
        content: string,
        metadata: Record<string, any>
    ): Promise<Document> {
        try {
            const embedding = await this.embeddings.generateEmbedding(content);

            const document = await this.vectorStore.addDocument(content, {
                embedding,
                metadata: {
                    ...metadata,
                    timestamp: new Date().toISOString()
                }
            });

            return document;
        } catch (error) {
            console.error('Error adding document:', error);
            throw error;
        }
    }

    /**
     * Batch adds multiple documents
     * Optimizes embedding generation and storage
     */
    async addDocuments(
        documents: { content: string; metadata: Record<string, any> }[]
    ): Promise<Document[]> {
        try {
            const contents = documents.map(doc => doc.content);
            const embeddings = await this.embeddings.generateBatchEmbeddings(contents);

            const storedDocs = await Promise.all(
                documents.map((doc, i) => 
                    this.vectorStore.addDocument(doc.content, {
                        embedding: embeddings[i],
                        metadata: {
                            ...doc.metadata,
                            timestamp: new Date().toISOString()
                        }
                    })
                )
            );

            return storedDocs;
        } catch (error) {
            console.error('Error adding documents in batch:', error);
            throw error;
        }
    }
}