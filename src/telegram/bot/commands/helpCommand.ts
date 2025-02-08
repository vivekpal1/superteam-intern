// src/telegram/bot/commands/helpCommand.ts
import { Context } from 'telegraf';
import { BotConfig } from '../types/index.js';

/**
 * Creates a handler for the /help command which shows available commands based on user role.
 * The command output is customized based on whether the user is an admin or not.
 */
export function createHelpCommand(config: BotConfig) {
    return async (ctx: Context) => {
        try {
            console.log('[HelpCommand] Processing help command');
            const message = `
Available commands:

🚀 /start - Start the bot
❓ /help - Show this help message
🔍 /find - Search for members
📝 /tweet - Create a tweet draft
📅 /events - Show upcoming events

Need more help? Just ask!`;

            await ctx.reply(message);
            console.log('[HelpCommand] Help message sent');
        } catch (error) {
            console.error('[HelpCommand] Error:', error);
            await ctx.reply('Sorry, there was an error showing help. Please try again.');
        }
    };
}