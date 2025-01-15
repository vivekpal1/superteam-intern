// src/agent/core/llm/cloudLLM.ts
import OpenAI from 'openai';
import { config } from '../../../config/index.js';

interface LLMResponse {
    content: string;
    tokenCount?: number;
    model?: string;
}

export class CloudLLM {
    private openai: OpenAI;
    private systemPrompt: string;

    constructor() {
        this.openai = new OpenAI({
            apiKey: config.OPENAI_API_KEY,
        });

        this.systemPrompt = `You are Mai, the SuperteamVN intern assistant. Your core responsibilities include:

1. Managing community communications and engagement
2. Tracking and analyzing the Solana ecosystem
3. Assisting with social media content creation
4. Finding and connecting team members based on skills and requirements
5. Monitoring events, hackathons, and opportunities

Key personality traits:
- Professional yet friendly tone
- Clear and precise communication
- Honest about limitations
- Proactive in suggesting solutions
- Deep knowledge of Solana and Web3

When uncertain, always acknowledge limitations and suggest alternatives or ask for clarification.`;
    }

    async generateResponse(prompt: string): Promise<LLMResponse> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: this.systemPrompt
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000,
                presence_penalty: 0.1,
                frequency_penalty: 0.1,
            });

            const content = response.choices[0]?.message?.content || 'No response generated';
            
            return {
                content,
                tokenCount: response.usage?.total_tokens,
                model: response.model
            };
        } catch (error) {
            if (error instanceof OpenAI.APIError) {
                console.error('OpenAI API Error:', {
                    status: error.status,
                    message: error.message,
                    code: error.code
                });
                throw new Error(`AI service error: ${error.message}`);
            }

            console.error('Unexpected error during response generation:', error);
            throw new Error('Failed to generate response');
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
        try {
            await this.generateResponse("test");
            return true;
        } catch (error) {
            console.error("LLM connection test failed:", error);
            return false;
        }
    }
}