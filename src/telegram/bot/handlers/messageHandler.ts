// src/telegram/bot/handlers/messageHandler.ts
import { Context } from 'telegraf';
import { KnowledgeHandler } from '../../handlers/knowledgeHandler.js';

export function createMessageHandler(
    knowledgeHandler: KnowledgeHandler,
    debugMode: boolean
) {
    return async (ctx: Context) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text.startsWith('/')) return;

        try {
            if (debugMode) {
                console.log(`[Bot] Processing text message from user ${ctx.from?.id}`);
            }
            
            await knowledgeHandler.handleQuery(ctx, ctx.message.text);
            
            if (debugMode) {
                console.log('[Bot] Successfully processed text message');
            }
        } catch (error) {
            console.error('[Bot] Error handling message:', error);
            await ctx.reply('Sorry, I encountered an error processing your message.');
        }
    };
}