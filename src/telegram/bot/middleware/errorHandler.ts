// src/telegram/bot/middleware/errorHandler.ts
import { Context } from 'telegraf';
import { BotConfig } from '../types/index.js';

export function createErrorHandlerMiddleware(config: BotConfig) {
    return async (ctx: Context, next: () => Promise<void>) => {
        try {
            await next();
        } catch (error) {
            console.error('Error in middleware:', error);
            await ctx.reply('An error occurred while processing your request. Please try again.');
            
            if (config.debugMode) {
                console.error('[Bot] Error details:', error);
            }
        }
    };
}