import { Context, Middleware } from 'telegraf';
import { UserState } from '../bot/types/userState.js';

export function createStateManagerMiddleware(states: Map<number, UserState>): Middleware<Context> {
    return async (ctx, next) => {
        if (ctx.from?.id) {
            if (!states.has(ctx.from.id)) {
                states.set(ctx.from.id, { 
                    currentState: 'idle'
                });
            }
        }
        await next();
    };
} 