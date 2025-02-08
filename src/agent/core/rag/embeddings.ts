// src/agent/core/rag/embeddings.ts
import OpenAI from 'openai';

export class EmbeddingGenerator {
    private openai: OpenAI;
    private model: string = 'text-embedding-ada-002'; // This model generates 1536 dimensions

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const response = await this.openai.embeddings.create({
                model: this.model,
                input: text,
                encoding_format: 'float',
            });

            if (!response.data[0].embedding) {
                throw new Error('No embedding generated');
            }

            return response.data[0].embedding;
        } catch (error) {
            console.error('[EmbeddingGenerator] Error generating embedding:', error);
            // Return a zero vector of correct dimension as fallback
            return new Array(1536).fill(0);
        }
    }

    async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
        try {
            const response = await this.openai.embeddings.create({
                model: this.model,
                input: texts,
                encoding_format: 'float',
            });

            return response.data.map(item => item.embedding);
        } catch (error) {
            console.error('[EmbeddingGenerator] Error generating batch embeddings:', error);
            return texts.map(() => new Array(1536).fill(0));
        }
    }

    getTokenCount(text: string): number {
        // Simple estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
}

export async function createEmbedding(text: string): Promise<number[]> {
    const generator = new EmbeddingGenerator();
    return generator.generateEmbedding(text);
}