// src/agent/core/llm/localLLM.ts

// Add these interfaces at the top of the file
interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}

interface OllamaError {
    error: string;
}

interface OllamaModelResponse {
    models: string[];
}

export class LocalLLM {
    private initialized: boolean = false;
    private readonly apiUrl: string;
    private readonly model: string;

    constructor() {
        this.apiUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        this.model = process.env.LOCAL_MODEL || 'deepseek-r1:1.5b';
    }

    async initialize() {
        try {
            // First verify Ollama is running
            const tagsResponse = await fetch(`${this.apiUrl}/api/tags`);
            const tagsData = await tagsResponse.json() as OllamaModelResponse;
            
            // If model isn't in the list, pull it
            if (!tagsData.models.includes(this.model)) {
                console.log(`Model ${this.model} not found, pulling...`);
                const pullResponse = await fetch(`${this.apiUrl}/api/pull`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: this.model }),
                });
                
                if (!pullResponse.ok) {
                    throw new Error(`Failed to pull model ${this.model}`);
                }
            }

            // Verify model is now available
            const modelResponse = await fetch(`${this.apiUrl}/api/show`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: this.model }),
            });

            if (!modelResponse.ok) {
                throw new Error(`Failed to verify model: ${this.model}`);
            }

            this.initialized = true;
            console.log(`Successfully connected to Ollama with model: ${this.model}`);
        } catch (error) {
            console.error('Error initializing LocalLLM:', error);
            throw error;
        }
    }

    async generateResponse(prompt: string): Promise<string> {
        try {
            console.log('[LocalLLM] Generating response with model:', this.model);
            
            const response = await fetch(`${this.apiUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.8,
                        top_p: 0.9,
                        top_k: 40,
                        num_predict: 2000,  // Increased to allow for longer responses
                        repeat_penalty: 1.2,
                        presence_penalty: 0.2,
                        frequency_penalty: 0.2,
                        mirostat: 2,        // Enable mirostat sampling
                        mirostat_tau: 5,
                        mirostat_eta: 0.1,
                        stop: ["4.", "---", "</s>"]  // Simplified stop tokens
                    }
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to generate response: ${await response.text()}`);
            }

            const data = await response.json();
            console.log('[LocalLLM] Raw response:', data);

            let cleanResponse = data.response
                .replace(/<think>.*?<\/think>/gs, '')
                .replace(/```.*?```/gs, '')
                .trim();

            // If response is empty, try a basic format
            if (!cleanResponse) {
                console.log('[LocalLLM] Empty response, using basic format');
                cleanResponse = `1. 🚀 Exciting update about ${prompt}! #SuperteamVN\n2. ✨ Stay tuned for ${prompt}! #SuperteamVN\n3. 🌟 Big news: ${prompt}! #SuperteamVN`;
            }

            return cleanResponse;
        } catch (error) {
            console.error('[LocalLLM] Error generating response:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        this.initialized = false;
    }
}