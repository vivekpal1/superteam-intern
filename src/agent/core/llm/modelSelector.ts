// src/agent/core/llm/modelSelector.ts
import { LocalLLM } from './localLLM';
import { CloudLLM } from './cloudLLM';

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
            return await this.cloudLLM.generateResponse(prompt);
        } catch (error) {
            if (this.useLocal) {
                console.log('Falling back to cloud LLM...');
                return await this.cloudLLM.generateResponse(prompt);
            }
            throw error;
        }
    }
}