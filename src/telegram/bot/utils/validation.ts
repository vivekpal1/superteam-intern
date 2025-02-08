import { BotConfig } from "../types/botTypes.js";

// src/telegram/bot/utils/validation.ts
export function isValidBotToken(token: string): boolean {
    return /^\d+:[A-Za-z0-9_-]{35,}$/.test(token);
}
export async function validateBotToken(token: string): Promise<boolean> {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const data = await response.json();
        return data.ok === true;
    } catch (error) {
        return false;
    }
}

export function validateConfig(config: BotConfig): void {
    if (!config.TELEGRAM_BOT_TOKEN) {
        throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    if (!config.TELEGRAM_BOT_TOKEN.match(/^\d+:[A-Za-z0-9_-]{35}$/)) {
        throw new Error('Invalid TELEGRAM_BOT_TOKEN format');
    }
}
