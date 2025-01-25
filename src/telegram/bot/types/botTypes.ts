// src/telegram/bot/types/botTypes.ts
import { Context } from 'telegraf';

export interface BotConfig {
    debugMode: boolean;
    adminIds: Set<number>;
    TELEGRAM_BOT_TOKEN: string;
    handlerTimeout?: number;
}

export interface UserState {
    waitingFor?: 'tweet' | 'document' | null;
    lastCommand?: string;
    context?: any;
}

export interface BotInfo {
    username: string;
    id: number;
    [key: string]: any;
}

export interface CommandContext extends Context {
    state: UserState;
}

export type CommandHandler = (ctx: CommandContext) => Promise<void>;