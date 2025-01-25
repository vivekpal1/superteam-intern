import { Context, Middleware } from 'telegraf';
import { BotConfig } from '../bot/types/index.js';

export function createLoggerMiddleware(config: BotConfig): Middleware<Context> {
    return async (ctx, next) => {
        const start = Date.now();
        await next();
        const ms = Date.now() - start;
        
        if (config.debugMode) {
            console.log(`[Bot] ${ctx.updateType} processed in ${ms}ms`);
        }
    };
} 