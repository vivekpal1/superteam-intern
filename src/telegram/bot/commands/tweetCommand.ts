// src/telegram/bot/commands/tweetCommand.ts
import { Context } from 'telegraf';
import { Services, BotConfig } from '../types/index.js';

interface TweetDraft {
    id: any;
    content: string;
    userId: string;
    suggestions: string[];
}

/**
 * Creates a handler for the /tweet command which allows users to propose tweets.
 * The command processes the tweet content, generates improvement suggestions,
 * and creates a draft for admin approval.
 */
export function createTweetCommand(services: Services, config: BotConfig) {
    return async (ctx: Context) => {
        try {
            if (!ctx.message || !('text' in ctx.message)) {
                await ctx.reply('Please provide tweet content in text format.');
                return;
            }
            
            const content = ctx.message.text.replace(/^\/tweet\s*/, '').trim();
            
            if (!content) {
                await ctx.reply('Please provide the tweet content after /tweet command.\nExample: /tweet Exciting news about our community!');
                return;
            }

            await ctx.reply('Generating tweet suggestions...');

            try {
                const suggestions = await services.knowledgeHandler.improveTweet(content);
                const response = `📝 Here are some suggested tweet versions:\n\n${
                    suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n\n')
                }\n\nChoose a version or modify as needed.`;

                await ctx.reply(response);
            } catch (error) {
                console.error('[TweetCommand] Error generating suggestions:', error);
                await ctx.reply('Sorry, I had trouble generating suggestions. Please try rephrasing your tweet content.');
            }

        } catch (error) {
            console.error('[TweetCommand] Error:', error);
            await ctx.reply('Sorry, there was an error processing your command. Please try again.');
        }
    };
}