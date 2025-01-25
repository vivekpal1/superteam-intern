// src/telegram/bot/commands/startCommand.ts
import { Context } from 'telegraf';
import { BotConfig } from '../types/index.js';

/**
 * Creates a handler for the /start command which introduces the bot to new users.
 * This is typically the first interaction a user has with the bot.
 */
export function createStartCommand(config: BotConfig) {
    return async (ctx: Context): Promise<void> => {
        const message = `
Hello! 👋 I'm Mai, the SuperteamVN intern assistant.

I can help you with:
- Finding SuperteamVN information 📚
- Connecting with team members 👥
- Managing social media content 📱
- Tracking events and opportunities 🎯

Use /help to see all available commands!`;

        await ctx.reply(message);
        
        if (config.debugMode) {
            console.log(`[Bot] Started conversation with user ${ctx.from?.id}`);
        }
    };
}