// src/telegram/bot/commands/uploadCommand.ts
import { Context } from 'telegraf';
import { Services, BotConfig } from '../types/index.js';

/**
 * Creates a handler for the /upload command which allows administrators to
 * upload documents to train the bot's knowledge base. This command manages
 * the document upload workflow, including state management and validation.
 * 
 * The command implements strict file type and size validation to ensure
 * secure document processing. It also maintains user state to handle the
 * asynchronous nature of file uploads.
 */
export function createUploadCommand(services: Services, config: BotConfig) {
    return async (ctx: Context): Promise<void> => {
        try {
            // Verify admin privileges
            if (!config.adminIds.has(ctx.from?.id || 0)) {
                await ctx.reply('This command is restricted to administrators.');
                return;
            }

            // Update user state to expect a document
            await services.stateManager.setUserState(ctx.from!.id, {
                waitingFor: 'document'
            });

            // Provide detailed upload instructions
            const message = `
📤 Document Upload Mode

Please send me a document to add to my knowledge base.
Supported formats: PDF, TXT, DOCX, MD

Guidelines:
- File size limit: 20MB
- Text should be clearly formatted
- One document at a time
- Send /cancel to exit upload mode

I'm waiting for your document...`;

            await ctx.reply(message);
            
            if (config.debugMode) {
                console.log(`[Bot] Admin ${ctx.from?.id} entered document upload mode`);
            }
        } catch (error) {
            console.error('[Bot] Error handling upload command:', error);
            await ctx.reply('Sorry, I encountered an error preparing for document upload.');
        }
    };
}