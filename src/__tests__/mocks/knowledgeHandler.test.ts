// src/__tests__/knowledgeHandler.test.ts
import { Context } from 'telegraf';
import { KnowledgeHandler } from '../../telegram/handlers/knowledgeHandler.js';
import { MockContext, createMockDocument } from './telegramContext.js';
import { VectorStore } from '../../agent/core/rag/vectorStore.js';
import { ModelSelector } from '../../agent/core/llm/modelSelector.js';

jest.mock('../agent/core/rag/vectorStore.js');
jest.mock('../agent/core/llm/modelSelector.js');
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        conversation: {
            create: jest.fn().mockResolvedValue({})
        },
        activityLog: {
            create: jest.fn().mockResolvedValue({})
        },
        errorLog: {
            create: jest.fn().mockResolvedValue({})
        }
    }))
}));

describe('KnowledgeHandler', () => {
    let handler: KnowledgeHandler;
    let mockCtx: MockContext;

    beforeEach(() => {
        jest.clearAllMocks();
        
        handler = new KnowledgeHandler(['12345']);
        mockCtx = new MockContext();

        (VectorStore as jest.Mock).mockImplementation(() => ({
            addDocument: jest.fn().mockResolvedValue(true),
            findSimilar: jest.fn().mockResolvedValue([])
        }));

        (ModelSelector as jest.Mock).mockImplementation(() => ({
            generateResponse: jest.fn().mockResolvedValue('Test response')
        }));
    });

    describe('Document Handling', () => {
        test('should reject documents from non-admins', async () => {
            const ctx = mockCtx.withUser('54321');
            ctx.message = createMockDocument('test.pdf', 1000);

            await handler.handleDocument(ctx as unknown as Context);

            expect(ctx.replies).toContain('Sorry, only admins can add documents to the knowledge base.');
        });

        test('should reject oversized files', async () => {
            const ctx = mockCtx.withUser('12345');
            ctx.message = createMockDocument('test.pdf', 20 * 1024 * 1024);

            await handler.handleDocument(ctx as unknown as Context);

            expect(ctx.replies).toContain('File too large. Maximum size is 10MB');
        });

        test('should successfully process valid PDF', async () => {
            const ctx = mockCtx.withUser('12345');
            ctx.message = createMockDocument('test.pdf', 1024);
            
            jest.spyOn(handler as any, 'downloadAndProcessFile')
                .mockResolvedValue('Test content for vector store');

            await handler.handleDocument(ctx as unknown as Context);

            expect(ctx.replies).toContain('Document processed and added to knowledge base successfully!');
        });
    });

    // Test query handling
    describe('Query Handling', () => {
        test('should handle queries that have no matching documents', async () => {
            const ctx = mockCtx.withUser('12345');
            
            // Mock vector store to return no matches
            jest.spyOn(handler['vectorStore'], 'findSimilar')
                .mockResolvedValue([]);

            await handler.handleQuery(ctx as unknown as Context, 'What is Solana?');

            expect(ctx.replies).toContain("I don't have enough information to answer that question confidently.");
        });

        test('should successfully answer questions with high confidence', async () => {
            const ctx = mockCtx.withUser('12345');
            
            jest.spyOn(handler['vectorStore'], 'findSimilar')
                .mockResolvedValue([
                    { 
                        content: 'Solana is a high-performance blockchain',
                        similarity: 0.9,
                        metadata: { source: 'intro.pdf' }
                    }
                ]);

            jest.spyOn(handler['model'], 'generateResponse')
                .mockResolvedValue('Solana is a high-performance blockchain platform.');

            await handler.handleQuery(ctx as unknown as Context, 'What is Solana?');

            expect(ctx.replies[0]).toContain('Solana is a high-performance blockchain platform');
            expect(ctx.replies[0]).toContain('Sources: `intro.pdf`');
        });
    });

    describe('Error Handling', () => {
        test('should handle document processing errors gracefully', async () => {
            const ctx = mockCtx.withUser('12345');
            ctx.message = createMockDocument('test.pdf', 1024);
            
            jest.spyOn(handler as any, 'downloadAndProcessFile')
                .mockRejectedValue(new Error('Network error'));

            await handler.handleDocument(ctx as unknown as Context);

            expect(ctx.replies).toContain('Sorry, I encountered an error processing the document.');
        });

        test('should handle query errors gracefully', async () => {
            const ctx = mockCtx.withUser('12345');
            
            jest.spyOn(handler['vectorStore'], 'findSimilar')
                .mockRejectedValue(new Error('Database error'));

            await handler.handleQuery(ctx as unknown as Context, 'What is Solana?');

            expect(ctx.replies).toContain('Sorry, I encountered an error processing your query.');
        });
    });
});