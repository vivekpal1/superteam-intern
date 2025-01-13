// src/agent/core/llm/modelSelector.ts
import { LocalLLM } from './localLLM.js';
import { CloudLLM } from './cloudLLM.js';

export class ModelSelector {
    private localLLM: LocalLLM;
    private cloudLLM: CloudLLM;
    private useLocal: boolean;

    constructor(useLocal = true) {
        this.localLLM = new LocalLLM();
        this.cloudLLM = new CloudLLM();
        this.useLocal = useLocal;
    }

    async initialize() {
        if (this.useLocal) {
            await this.localLLM.initialize();
        }
    }

    async generateResponse(prompt: string): Promise<string> {
        try {
            if (this.useLocal) {
                return await this.localLLM.generateResponse(prompt);
            }
            const response = await this.cloudLLM.generateResponse(prompt);
            return response.content;
        } catch (error) {
            if (this.useLocal) {
                console.log('Falling back to cloud LLM...');
                const fallbackResponse = await this.cloudLLM.generateResponse(prompt);
                return fallbackResponse.content;
            }
            throw error;
        }
    }
}