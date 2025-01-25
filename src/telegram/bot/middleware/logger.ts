// src/telegram/bot/middleware/logger.ts
import { Context } from 'telegraf';
import { BotConfig } from '../types/index.js';

export function createLoggerMiddleware(config: BotConfig) {
    return async (ctx: Context, next: () => Promise<void>) => {
        const start = Date.now();
        
        if (config.debugMode) {
            console.log(`[Bot] Received ${ctx.updateType} from ${ctx.from?.id}`);
        }
        
        await next();
        
        const ms = Date.now() - start;
        if (config.debugMode) {
            console.log(`[Bot] [${ctx.from?.id}] ${ctx.updateType} processed in ${ms}ms`);
        }
    };
}