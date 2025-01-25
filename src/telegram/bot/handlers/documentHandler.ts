// src/telegram/bot/handlers/documentHandler.ts
import { Context } from 'telegraf';
import { Services } from '../types/services.js';
import { BotConfig, UserState } from '../types/index.js';

export function createDocumentHandler(
    services: Services,
    userStates: Map<number, UserState>,
    config: BotConfig
) {
    return async (ctx: Context) => {
        const state = userStates.get(ctx.from!.id);
        if (state?.waitingFor === 'document') {
            try {
                await services.knowledgeHandler.handleDocument(ctx);
                state.waitingFor = null;  // Reset state after handling
                
                if (config.debugMode) {
                    console.log(`[Bot] Processed document from user ${ctx.from!.id}`);
                }
            } catch (error) {
                console.error('[Bot] Error processing document:', error);
                await ctx.reply('Sorry, there was an error processing your document.');
            }
        }
    };
}