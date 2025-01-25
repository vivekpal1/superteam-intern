// src/telegram/bot/commands/helpCommand.ts
import { Context } from 'telegraf';
import { BotConfig } from '../types/index.js';

/**
 * Creates a handler for the /help command which shows available commands based on user role.
 * The command output is customized based on whether the user is an admin or not.
 */
export function createHelpCommand(config: BotConfig) {
    return async (ctx: Context): Promise<void> => {
        const isAdmin = config.adminIds.has(ctx.from?.id || 0);
        
        const message = `
Available Commands:

📚 Knowledge Base
/info <query> - Ask about SuperteamVN
${isAdmin ? '/upload - Upload documents to train me' : ''}

👥 Team Members
/find <skills> - Find team members
Example: /find rust solana

📱 Social Media
/tweet <content> - Propose a tweet
${isAdmin ? '/approve <id> - Approve tweet' : ''}

🎯 Events & Opportunities
/events - List upcoming events

Need help? Just ask me anything!`;

        await ctx.reply(message);
        
        if (config.debugMode) {
            console.log(`[Bot] Sent help message to user ${ctx.from?.id}`);
        }
    };
}