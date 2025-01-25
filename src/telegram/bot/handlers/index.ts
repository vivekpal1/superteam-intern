import { Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { Services, BotConfig, UserState } from '../types/index.js';

export function createMessageHandler(knowledgeHandler: any, debugMode: boolean) {
    return async (ctx: Context) => {
        // Message handling logic
    };
}

export function createDocumentHandler(services: Services, userStates: Map<number, UserState>, config: BotConfig) {
    return async (ctx: Context) => {
        // Document handling logic
    };
}
