import { Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { Services, BotConfig, UserState } from '../types/index.js';

export function createMessageHandler(knowledgeHandler: any, debugMode: boolean) {
    return async (ctx: Context) => {
        try {
            if (!ctx.message || !('text' in ctx.message)) {
                return;
            }

            const userId = ctx.from?.id;
            const messageText = ctx.message.text;

            if (debugMode) {
                console.log(`[Bot] Received message from ${userId}: ${messageText}`);
            }

            // Handle commands
            if (messageText.startsWith('/')) {
                return; // Let command handlers handle it
            }

            // Default response for non-command messages
            await ctx.reply('I received your message. Please use /help to see available commands.');

        } catch (error) {
            console.error('[MessageHandler] Error:', error);
            await ctx.reply('Sorry, there was an error processing your message.');
        }
    };
}

export function createDocumentHandler(services: Services, userStates: Map<number, UserState>, config: BotConfig) {
    return async (ctx: Context) => {
        try {
            await ctx.reply('Document handling is not implemented yet.');
        } catch (error) {
            console.error('[DocumentHandler] Error:', error);
            await ctx.reply('Sorry, there was an error processing your document.');
        }
    };
}
