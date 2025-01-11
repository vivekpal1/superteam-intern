export class MockEmbeddingGenerator {
    async generateEmbedding(text: string): Promise<number[]> {
        return Array(1536).fill(0.1);
    }
}