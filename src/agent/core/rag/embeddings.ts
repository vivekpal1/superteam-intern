// src/agent/core/rag/embeddings.ts
import { OpenAIEmbeddings } from "@langchain/openai";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

export class EmbeddingGenerator {
    private openAIEmbeddings: OpenAIEmbeddings;
    private localEmbeddings: HuggingFaceInferenceEmbeddings;
    private readonly useLocal: boolean;

    constructor(useLocal = true) {
        this.useLocal = useLocal;
        this.localEmbeddings = new HuggingFaceInferenceEmbeddings({
            model: "sentence-transformers/all-MiniLM-L6-v2"
        });
        this.openAIEmbeddings = new OpenAIEmbeddings();
    }

    async generateEmbedding(text: string): Promise<number[]> {
        try {
            if (this.useLocal) {
                const embedding = await this.localEmbeddings.embedQuery(text);
                return embedding;
            } else {
                const embedding = await this.openAIEmbeddings.embedQuery(text);
                return embedding;
            }
        } catch (error) {
            console.error('Error generating embedding:', error);
            if (this.useLocal) {
                console.log('Falling back to OpenAI embeddings...');
                return await this.openAIEmbeddings.embedQuery(text);
            }
            throw error;
        }
    }

    async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
        try {
            if (this.useLocal) {
                return await this.localEmbeddings.embedDocuments(texts);
            } else {
                return await this.openAIEmbeddings.embedDocuments(texts);
            }
        } catch (error) {
            console.error('Error generating batch embeddings:', error);
            if (this.useLocal) {
                return await this.openAIEmbeddings.embedDocuments(texts);
            }
            throw error;
        }
    }
}

export async function createEmbedding(text: string): Promise<number[]> {
    const generator = new EmbeddingGenerator(true);
    return generator.generateEmbedding(text);
}