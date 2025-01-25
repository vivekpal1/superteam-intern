// src/telegram/middleware/errorHandler.ts
import { Context, Middleware } from 'telegraf';
import { BotConfig } from '../bot/types/index.js';

export function createErrorHandlerMiddleware(config: BotConfig): Middleware<Context> {
    return async (ctx, next) => {
        try {
            await next();
        } catch (error) {
            console.error('[Bot] Error in middleware:', error);
            if (config.debugMode) {
                await ctx.reply('An error occurred while processing your request.');
            }
        }
    };
}