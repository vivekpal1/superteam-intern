// src/agent/core/llm/localLLM.ts
export class LocalLLM {
    private url: string;
    private model: string;

    constructor() {
        this.url = process.env.OLLAMA_URL || 'http://localhost:11434';
        this.model = process.env.LOCAL_MODEL || 'llama2';
    }

    async initialize() {
        try {
            // Test connection to Ollama
            const response = await fetch(`${this.url}/api/tags`);
            if (!response.ok) {
                throw new Error('Failed to connect to Ollama');
            }
            console.log('Successfully connected to Ollama');
        } catch (error) {
            console.error('Error initializing LocalLLM:', error);
            throw error;
        }
    }

    async generateResponse(prompt: string): Promise<string> {
        try {
            const response = await fetch(`${this.url}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9,
                        top_k: 40,
                        num_predict: 1024,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate response');
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Error generating response:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        // Cleanup
    }
}