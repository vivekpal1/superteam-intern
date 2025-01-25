import OpenAI from 'openai';
import { config } from '../../../config/index.js';

type OpenAIModel = 'gpt-4o' | 'gpt-4o-mini';

interface LLMResponse {
    content: string;
    tokenCount?: number;
    model?: string;
}

export class CloudLLM {
    private openai: OpenAI;
    private systemPrompt: string;
    private currentModel: OpenAIModel = 'gpt-4o';

    constructor() {
        if (!config.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured');
        }

        this.openai = new OpenAI({
            apiKey: config.OPENAI_API_KEY,
        });

        this.systemPrompt = `You are Mai, the SuperteamVN intern assistant.`;
    }

    async generateResponse(prompt: string): Promise<LLMResponse> {
        try {
            const response = await this.openai.chat.completions.create({
                model: this.currentModel,
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            });

            return {
                content: response.choices[0]?.message?.content || 'No response generated',
                tokenCount: response.usage?.total_tokens,
                model: response.model
            };
        } catch (error) {
            console.error('Error generating response:', error);
            throw error;
        }
    }

    private estimateTokenCount(text: string): number {
        return Math.ceil(text.length / 4);
    }

    private async validateTokenLimit(prompt: string): Promise<boolean> {
        const estimatedTokens = this.estimateTokenCount(this.systemPrompt + prompt);
        return estimatedTokens <= 4000;
    }

    public async testConnection(): Promise<boolean> {
        return true;
    }

    public getCurrentModel(): OpenAIModel {
        return this.currentModel;
    }
}