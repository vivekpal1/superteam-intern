// src/telegram/bot/commands/startCommand.ts
import { Context } from 'telegraf';
import { BotConfig } from '../types/index.js';

/**
 * Creates a handler for the /start command which introduces the bot to new users.
 * This is typically the first interaction a user has with the bot.
 */
export function createStartCommand(config: BotConfig) {
    return async (ctx: Context) => {
        console.log('[StartCommand] Handler called');
        try {
            const message = `👋 Welcome to Superteam VN Assistant!\n\nI'm here to help you with various tasks. Here are some things I can do:\n\n- /help - Show available commands\n- /find - Search for members\n- /events - Show upcoming events\n- /tweet - Create a tweet draft\n\nFeel free to ask me anything!`;
            
            console.log('[StartCommand] Sending welcome message');
            const sent = await ctx.reply(message);
            console.log('[StartCommand] Message sent:', sent.message_id);
            
        } catch (error) {
            console.error('[StartCommand] Error:', error);
            try {
                await ctx.reply('Sorry, there was an error starting the bot. Please try again.');
            } catch (replyError) {
                console.error('[StartCommand] Failed to send error message:', replyError);
            }
        }
    };
}