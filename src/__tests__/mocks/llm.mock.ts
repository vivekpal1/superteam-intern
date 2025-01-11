// src/__tests__/mocks/llm.mock.ts
export class MockLocalLLM {
    async initialize(): Promise<void> {}
    async generateResponse(prompt: string): Promise<string> {
        return "This is a mock response";
    }
}

export class MockCloudLLM {
    async generateResponse(prompt: string): Promise<string> {
        return "This is a cloud mock response";
    }
}