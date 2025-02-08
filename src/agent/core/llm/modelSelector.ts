// src/agent/core/llm/modelSelector.ts
import { LocalLLM } from './localLLM.js';
import { CloudLLM } from './cloudLLM.js';

export class ModelSelector {
    private localLLM: LocalLLM;
    private cloudLLM: CloudLLM;
    private useLocalLLM: boolean;

    constructor(useLocal: boolean = true) {
        this.useLocalLLM = useLocal;
        this.localLLM = new LocalLLM();
        this.cloudLLM = new CloudLLM();
        console.log(`[ModelSelector] Initialized with ${useLocal ? 'local' : 'cloud'} LLM`);
    }

    async initialize(): Promise<void> {
        try {
            if (this.useLocalLLM) {
                await this.localLLM.initialize();
                console.log('[ModelSelector] Local LLM initialized successfully');
            }
        } catch (error) {
            console.error('[ModelSelector] Failed to initialize local LLM:', error);
            throw error;
        }
    }

    async generateResponse(prompt: string): Promise<string> {
        try {
            console.log('[ModelSelector] Generating response with prompt:', prompt);
            
            if (this.useLocalLLM) {
                console.log('[ModelSelector] Using local LLM');
                const response = await this.localLLM.generateResponse(prompt);
                console.log('[ModelSelector] Local LLM response:', response);
                return response;
            } else {
                console.log('[ModelSelector] Using cloud LLM');
                const response = await this.cloudLLM.generateResponse(prompt);
                return response.content;
            }
        } catch (error) {
            console.error('[ModelSelector] Error generating response:', error);
            throw error;
        }
    }
}