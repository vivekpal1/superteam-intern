import { Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { VectorStore } from '../../agent/core/rag/vectorStore.js';
import { ModelSelector } from '../../agent/core/llm/modelSelector.js';
import { PrismaClient } from '@prisma/client';
import RateLimit from 'express-rate-limit';
import { RateLimiter } from '../../utils/rateLimiter.js';

interface QueryMetrics {
    confidence: number;
    sources: string[];
    processingTime: number;
}

export class KnowledgeHandler {
    private rateLimiter: RateLimiter;
    private vectorStore: VectorStore;
    private model: ModelSelector;
    private prisma: PrismaClient;
    private adminIds: string[];
    private maxFileSize = 10 * 1024 * 1024; // 10MB
    private allowedFileTypes = ['pdf', 'docx', 'txt'];

    constructor(adminIds: string[] = []) {
        this.vectorStore = new VectorStore();
        this.model = new ModelSelector(true);
        this.prisma = new PrismaClient();
        this.adminIds = adminIds;

        this.rateLimiter = new RateLimiter();
    }

    async handleDocument(ctx: Context): Promise<void> {
        if (!ctx.message || !('document' in ctx.message)) {
            await ctx.reply('Please provide a valid document.');
            return;
        }

        const userId = ctx.from?.id.toString();
        if (!userId || !this.adminIds.includes(userId)) {
            await ctx.reply('Sorry, only admins can add documents to the knowledge base.');
            return;
        }

        try {
            const doc = ctx.message.document;
            
            if (doc.file_size > this.maxFileSize) {
                await ctx.reply(`File too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`);
                return;
            }

            const extension = doc.file_name?.split('.').pop()?.toLowerCase();
            if (!extension || !this.allowedFileTypes.includes(extension)) {
                await ctx.reply(`Unsupported file type. Allowed types: ${this.allowedFileTypes.join(', ')}`);
                return;
            }

            await ctx.reply('Processing document...');
            
            const file = await ctx.telegram.getFile(doc.file_id);
            const content = await this.downloadAndProcessFile(file.file_path!);

            if (!this.isValidContent(content)) {
                await ctx.reply('Document content is too short or invalid.');
                return;
            }

            const metadata = {
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

            await this.vectorStore.addDocument(content, metadata);

            await ctx.reply('Document processed and added to knowledge base successfully!');
            
            await this.logDocumentUpload(userId, metadata);
        } catch (error) {
            console.error('Error processing document:', error);
            await ctx.reply('Sorry, I encountered an error processing the document. Please try again or contact support.');
            
            await this.logError('document_processing', error, userId);
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
                await ctx.reply("I don't have enough information to answer that question confidently. You might want to try rephrasing your question or asking something else.");
                return;
            }

            const confidence = this.calculateConfidence(relevantDocs);
            if (confidence < 0.6) {
                await ctx.reply("I'm not confident enough to provide an accurate answer to this question. Could you please rephrase it or provide more context?");
                return;
            }

            const context = this.prepareContext(relevantDocs);
            const prompt = await this.buildPrompt(query, context);
            
            const response = await this.model.generateResponse(prompt);
            
            metrics = {
                confidence,
                sources: relevantDocs.map(doc => doc.metadata.source),
                processingTime: Date.now() - startTime
            };

            if (confidence > 0.8) {
                const formattedResponse = this.formatResponse(response, metrics);
                await ctx.reply(formattedResponse, { parse_mode: 'Markdown' });
            } else {
                await ctx.reply(response);
            }

            await this.logInteraction(ctx.message as Message, response, metrics);
        } catch (error) {
            console.error('Error handling query:', error);
            await ctx.reply('Sorry, I encountered an error processing your query. Please try again.');
            
            await this.logError('query_processing', error, ctx.from?.id.toString(), {
                query,
                metrics
            });
        }
    }

    private async checkRateLimit(ctx: Context): Promise<boolean> {
        const userId = ctx.from?.id.toString() || 'anonymous';
        return this.rateLimiter.checkLimit(userId);
    }

    private isValidQuery(query: string): boolean {
        return query.length >= 3 && query.length <= 500;
    }

    private isValidContent(content: string): boolean {
        return content.length >= 50 && content.length <= 1000000;
    }

    private calculateConfidence(docs: any[]): number {
        if (docs.length === 0) return 0;
        
        const avgSimilarity = docs.reduce((sum, doc) => sum + doc.similarity, 0) / docs.length;
        
        const sourceWeight = Math.min(docs.length / 3, 1);
        
        return avgSimilarity * sourceWeight;
    }

    private prepareContext(docs: any[]): string {
        return docs
            .map(doc => this.cleanContent(doc.content))
            .join('\n\n')
            .slice(0, 3000);
    }

    private async buildPrompt(query: string, context: string): Promise<string> {
        return `Context information is below:
${context}

Given the context information, answer the following question:
${query}

If you can't answer the question based on the context, say so. Do not make up information.
Answer:`;
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

    private async logError(type: string, error: any, userId?: string, metadata?: any) {
        await this.prisma.errorLog.create({
            data: {
                type,
                error: JSON.stringify(error),
                userId,
                metadata: metadata ? JSON.stringify(metadata) : null,
                timestamp: new Date()
            }
        });
    }

    private async logDocumentUpload(userId: string, metadata: any) {
        await this.prisma.activityLog.create({
            data: {
                type: 'document_upload',
                userId,
                metadata: JSON.stringify(metadata),
                timestamp: new Date()
            }
        });
    }
}