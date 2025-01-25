import { BotConfig } from "../types/botTypes.js";

// src/telegram/bot/utils/validation.ts
export function isValidBotToken(token: string): boolean {
    return /^\d+:[A-Za-z0-9_-]{35,}$/.test(token);
}

export function validateConfig(config: BotConfig): void {
    if (!config.TELEGRAM_BOT_TOKEN) {
        throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }
    if (!isValidBotToken(config.TELEGRAM_BOT_TOKEN)) {
        throw new Error('Invalid bot token format');
    }
}