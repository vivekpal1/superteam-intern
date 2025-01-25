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
    return async (ctx: Context): Promise<void> => {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Please provide tweet content.\nExample: /tweet "Exciting news..."');
            return;
        }
    
        const content = ctx.message.text.replace('/tweet', '').trim();
        
        if (!content) {
            await ctx.reply('Please provide tweet content.\nExample: /tweet "Exciting news..."');
            return;
        }

        try {
            if (config.debugMode) {
                console.log(`[Bot] Creating tweet draft for user ${ctx.from?.id}`);
            }

            // Create draft with content improvement suggestions
            const draft: TweetDraft = {
                content,
                userId: ctx.from?.id.toString() || '',
                suggestions: await services.knowledgeHandler.improveTweet(content),
                id: undefined
            };

            const response = `
📝 Tweet Draft Created!

Original:
${content}

✨ Suggested Improvements:
${draft.suggestions.map((suggestion: string, index: number) => 
    `${index + 1}. ${suggestion}`
).join('\n')}

Status: Pending approval
ID: ${draft.id}`;

            await ctx.reply(response);
            
            if (config.debugMode) {
                console.log(`[Bot] Created tweet draft with ID: ${draft.id}`);
            }
        } catch (error) {
            console.error('[Bot] Error creating tweet:', error);
            await ctx.reply('Sorry, I encountered an error processing your tweet.');
        }
    };
}