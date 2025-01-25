// src/telegram/bot/commands/approveCommand.ts
import { Context } from 'telegraf';
import { Services, BotConfig } from '../types/index.js';

interface ApprovalResult {
    success: boolean;
    error?: string;
    tweetUrl?: string;
}

/**
 * Creates a handler for the /approve command which allows administrators to
 * approve pending content like tweet drafts. This command implements a critical
 * moderation workflow where admins can review and publish user-submitted content.
 * 
 * The command requires admin privileges and includes comprehensive validation
 * and error handling to ensure secure content moderation.
 */
export function createApproveCommand(services: Services, config: BotConfig) {
    return async (ctx: Context): Promise<void> => {
        try {
            // Validate command format and admin status
            if (!ctx.message || !('text' in ctx.message)) {
                await ctx.reply('Please provide an ID to approve.\nFormat: /approve <id>');
                return;
            }

            // Verify admin privileges
            if (!config.adminIds.has(ctx.from?.id || 0)) {
                await ctx.reply('This command is restricted to administrators.');
                return;
            }

            // Parse the content ID from the command
            const parts = ctx.message.text.split(' ');
            if (parts.length !== 2) {
                await ctx.reply('Please provide the ID to approve.\nFormat: /approve <id>');
                return;
            }

            const contentId = parts[1];
            if (config.debugMode) {
                console.log(`[Bot] Processing approval for content ID: ${contentId}`);
            }

            // Attempt to approve and publish the content
            const result = await services.knowledgeHandler.approveContent(contentId);
            
            if (result.success) {
                const message = formatApprovalSuccess(contentId, result);
                await ctx.reply(message, { parse_mode: 'Markdown' });
                
                if (config.debugMode) {
                    console.log(`[Bot] Content ${contentId} approved by admin ${ctx.from?.id}`);
                }
            } else {
                await ctx.reply(`❌ Approval failed: ${result.error}`);
            }
        } catch (error) {
            console.error('[Bot] Error in approval process:', error);
            await ctx.reply('Sorry, there was an error processing the approval.');
        }
    };
}

function formatApprovalSuccess(contentId: string, result: ApprovalResult): string {
    return `
✅ Content Approved Successfully!

ID: \`${contentId}\`
Status: Published
${result.tweetUrl ? `🔗 URL: ${result.tweetUrl}` : ''}

The content will be published shortly.`;
}