// src/telegram/handlers/knowledgeHandler.ts
import { Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { VectorStore } from '../../agent/core/rag/vectorStore.js';
import { ModelSelector } from '../../agent/core/llm/modelSelector.js';
import { PrismaClient, Prisma } from '@prisma/client';
import { RateLimiter } from '../../utils/rateLimiter.js';
import { QueryMetrics, ErrorLogInput, ActivityLogInput } from '../../types/index.js';
import { VectorDocument } from '../../types/vector-types.js';
import { SearchResult } from '../../types/search-types.js';
import fs from 'fs/promises';

export class KnowledgeHandler {
    private rateLimiter: RateLimiter;
    private vectorStore: VectorStore;
    private model: ModelSelector;
    private prisma: PrismaClient;
    private adminIds: Set<string>;
    private initialized: boolean = false;
    private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
    private readonly allowedFileTypes = new Set(['pdf', 'docx', 'txt']);

    constructor(adminIds: string[] = []) {
        this.rateLimiter = new RateLimiter();
        this.vectorStore = new VectorStore();
        this.model = new ModelSelector(true);
        this.prisma = new PrismaClient();
        this.adminIds = new Set(adminIds);
    }

    async initialize() {
        if (!this.initialized) {
            await this.model.initialize();
            this.initialized = true;
        }
    }

    async improveTweet(content: string): Promise<string[]> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Default context about Superteam VN
            const defaultContext = `
Superteam VN is a community of builders, creators, and contributors in Vietnam's Web3 ecosystem.
We focus on:
- Building and growing the Web3 ecosystem
- Supporting talented developers and creators
- Fostering collaboration and innovation
- Creating opportunities for community members
`;

            console.log('[KnowledgeHandler] Improving tweet:', content);
            
            const prompt = `Using this context about Superteam VN:
${defaultContext}

Write 3 engaging and professional tweets about: "${content}"

Requirements:
- Each tweet must start with a number and emoji (1. 🚀, 2. ✨, 3. 🌟)
- Make it exciting and welcoming
- Include #SuperteamVN hashtag
- Keep under 280 characters
- Focus on community value

Example format:
1. 🚀 Thrilled to welcome @username to Superteam VN! Bringing amazing talent to our ecosystem. Let's build together! #SuperteamVN
2. ✨ Our community grows stronger! Amazing minds joining Superteam VN. Stay tuned for more! #SuperteamVN
3. 🌟 Big news for Superteam VN! Welcoming new builders to our family. The future is bright! #SuperteamVN

Generate 3 unique, contextual tweets:`;

            // Use the model to generate suggestions
            const response = await this.model.generateResponse(prompt);
            console.log('[KnowledgeHandler] Raw LLM response:', response);

            // Process and validate tweets
            const suggestions = response
                .split('\n')
                .filter(line => /^[1-3]\./.test(line))
                .map(line => line.replace(/^[1-3]\.\s*/, '').trim())
                .filter(tweet => 
                    tweet.length > 0 && 
                    tweet.length <= 280 && 
                    tweet.includes('#SuperteamVN') &&
                    (tweet.includes('🚀') || tweet.includes('✨') || tweet.includes('🌟'))
                );

            if (suggestions.length >= 3) {
                return suggestions.slice(0, 3);
            }

            // If we don't get valid suggestions, create contextual fallbacks
            return [
                `🚀 Exciting news! ${content} joining Superteam VN! Together, we'll build amazing things in the Web3 space. #SuperteamVN`,
                `✨ The Superteam VN family grows stronger! Welcoming ${content} to our vibrant community. #SuperteamVN`,
                `🌟 New builders alert! ${content} bringing fresh energy to Superteam VN. Let's create magic! #SuperteamVN`
            ];

        } catch (error) {
            console.error('[KnowledgeHandler] Error improving tweet:', error);
            return [
                `🚀 ${content} #SuperteamVN`,
                `✨ ${content} #SuperteamVN`,
                `🌟 ${content} #SuperteamVN`
            ];
        }
    }

    async handleDocument(ctx: Context): Promise<void> {
        if (!ctx.message || !('document' in ctx.message)) {
            await ctx.reply('Please provide a valid document.');
            return;
        }

        const userId = ctx.from?.id.toString();
        if (!userId || !this.adminIds.has(userId)) {
            await ctx.reply('Sorry, only admins can add documents to the knowledge base.');
            return;
        }

        try {
            const doc = ctx.message.document;
            
            // Safe check for file size
            if (typeof doc.file_size !== 'number' || doc.file_size > this.maxFileSize) {
                await ctx.reply(`File too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`);
                return;
            }

            const extension = doc.file_name?.split('.').pop()?.toLowerCase();
            if (!extension || !this.allowedFileTypes.has(extension)) {
                await ctx.reply(`Unsupported file type. Allowed types: ${Array.from(this.allowedFileTypes).join(', ')}`);
                return;
            }

            await ctx.reply('Processing document...');
            
            const file = await ctx.telegram.getFile(doc.file_id);
            const content = await this.downloadAndProcessFile(file.file_path!);

            if (!this.isValidContent(content)) {
                await ctx.reply('Document content is too short or invalid.');
                return;
            }

            const metadata: Prisma.JsonValue = {
                source: doc.file_name,
                uploadedBy: userId,
                uploadedAt: new Date().toISOString(),
                fileType: extension,
                originalSize: doc.file_size,
                processingMetrics: {
                    chunks: content.length / 1000,
                    timestamp: Date.now()
                }
            };

            await this.vectorStore.addDocument(content, metadata as Record<string, any>);
            await ctx.reply('Document processed and added to knowledge base successfully!');
            
            await this.logActivity({
                type: 'document_upload',
                userId,
                metadata
            });
        } catch (error) {
            console.error('Error processing document:', error);
            await ctx.reply('Sorry, I encountered an error processing the document. Please try again.');
            
            await this.logError({
                type: 'document_processing',
                error: error instanceof Error ? error.message : String(error),
                userId
            });
        }
    }

    async handleQuery(ctx: Context, query: string): Promise<void> {
        const startTime = Date.now();
        let metrics: QueryMetrics | null = null;

        try {
            if (!await this.checkRateLimit(ctx)) {
                return;
            }

            if (!this.isValidQuery(query)) {
                await ctx.reply('Please provide a valid question.');
                return;
            }

            const relevantDocs = await this.vectorStore.findSimilar(query, {
                threshold: 0.7,
                limit: 3
            });

            if (relevantDocs.length === 0) {
                await ctx.reply("I don't have enough information to answer that question confidently.");
                return;
            }

            const confidence = this.calculateConfidence(relevantDocs);
            if (confidence < 0.6) {
                await ctx.reply("I'm not confident enough to provide an accurate answer. Could you rephrase?");
                return;
            }

            const context = this.prepareContext(relevantDocs);
            const prompt = await this.buildPrompt(query, context);
            
            const response = await this.model.generateResponse(prompt);
            
            metrics = {
                confidence,
                sources: relevantDocs.map(doc => 
                    doc.metadata?.source || 'Unknown'
                ).filter(Boolean),
                processingTime: Date.now() - startTime
            };

            const formattedResponse = this.formatResponse(response, metrics);
            await ctx.reply(formattedResponse, { parse_mode: 'Markdown' });

            await this.logActivity({
                type: 'query',
                userId: ctx.from?.id.toString() || 'anonymous',
                metadata: {
                    query,
                    metrics,
                    response: response.slice(0, 1000) // Truncate long responses
                }
            });
        } catch (error) {
            console.error('Error handling query:', error);
            await ctx.reply('Sorry, I encountered an error processing your query. Please try again.');
            
            await this.logError({
                type: 'query_processing',
                error: error instanceof Error ? error.message : String(error),
                userId: ctx.from?.id.toString(),
                metadata: {
                    query,
                    metrics
                }
            });
        }
    }

    private async downloadAndProcessFile(filePath: string): Promise<string> {
        // Implementation would go here
        // Should handle file download and processing
        throw new Error('Not implemented');
    }

    private async logError(input: ErrorLogInput): Promise<void> {
        try {
            await this.prisma.errorLog.create({
                data: {
                    type: input.type,
                    error: input.error,
                    metadata: input.metadata || Prisma.JsonNull,
                    timestamp: new Date()
                }
            });
        } catch (error) {
            console.error('Error logging error:', error);
        }
    }

    private async logActivity(input: ActivityLogInput): Promise<void> {
        try {
            await this.prisma.activityLog.create({
                data: {
                    type: input.type,
                    metadata: input.metadata || Prisma.JsonNull,
                    timestamp: new Date()
                }
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    private isValidContent(content: string): boolean {
        return content.length >= 50 && content.length <= 1_000_000;
    }

    private isValidQuery(query: string): boolean {
        return query.length >= 3 && query.length <= 500;
    }

    private calculateConfidence(docs: VectorDocument[]): number {
        if (docs.length === 0) return 0;
        
        const avgSimilarity = docs.reduce((sum, doc) => 
            sum + (doc.similarity || 0), 0) / docs.length;
        
        const coverageScore = Math.min(docs.length / 3, 1);
        
        return avgSimilarity * 0.7 + coverageScore * 0.3;
    }

    private async checkRateLimit(ctx: Context): Promise<boolean> {
        const userId = ctx.from?.id.toString() || 'anonymous';
        return this.rateLimiter.checkLimit(userId);
    }

    private prepareContext(docs: VectorDocument[]): string {
        return docs
            .map(doc => this.cleanContent(doc.content))
            .join('\n\n')
            .slice(0, 3000);
    }

    private cleanContent(content: string): string {
        return content.trim().replace(/\s+/g, ' ');
    }

    private formatResponse(response: string, metrics: QueryMetrics): string {
        let formatted = response;
        
        if (metrics.confidence > 0.8) {
            formatted += '\n\n---';
            formatted += '\n📚 Sources: ' + metrics.sources.map(s => `\`${s}\``).join(', ');
            formatted += `\n⚡ Response time: ${metrics.processingTime}ms`;
        }
        
        return formatted;
    }

    private async buildPrompt(query: string, context: string): Promise<string> {
        return `Context information is below:
${context}

Given the context information, answer the following question:
${query}

If you can't answer the question based on the context, say so. Do not make up information.
Answer:`;
    }

    async approveContent(contentId: string): Promise<{ success: boolean; error?: string; tweetUrl?: string }> {
        // Implementation
        return { success: true };
    }

    async searchMembers(query: string): Promise<any[]> {
        // Implementation
        return [];
    }

    private async loadKnowledgeBase() {
        try {
            console.log('[KnowledgeHandler] Knowledge base loading skipped temporarily');
            return true;
        } catch (error) {
            console.error('[KnowledgeHandler] Error loading knowledge base:', error);
            return false;
        }
    }
}