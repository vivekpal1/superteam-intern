// src/telegram/bot/middleware/stateManager.ts
import { Context } from 'telegraf';
import { UserState } from '../types/index.js';

export function createStateManagerMiddleware(userStates: Map<number, UserState>) {
    return async (ctx: Context, next: () => Promise<void>) => {
        if (!ctx.from) {
            console.log('[Bot] Received message without user information');
            return next();
        }
        
        if (!userStates.has(ctx.from.id)) {
            userStates.set(ctx.from.id, {});
        }
        
        await next();
    };
}