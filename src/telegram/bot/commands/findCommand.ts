// src/telegram/bot/commands/findCommand.ts
import { Context } from 'telegraf';
import { Services, BotConfig } from '../types/index.js';

// Define interfaces for type safety and clear data structure
interface TeamMember {
    name: string;
    skills: string[];
    experience: string;
    contact: string;
    twitterHandle?: string;
}

interface MatchResult {
    member: TeamMember;
    matchScore: number;
    matchReason: string[];
}

/**
 * Creates a handler for the /find command which helps users find team members
 * based on specified skills or requirements. This command uses fuzzy matching
 * and relevance scoring to find the most appropriate team members.
 */
export function createFindCommand(services: Services, config: BotConfig) {
    return async (ctx: Context): Promise<void> => {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Please provide search criteria.\nExample: /find rust solana');
            return;
        }
    
        const query = ctx.message.text.replace('/find', '').trim();
        if (!query) {
            await ctx.reply('Please provide search criteria.\nExample: /find "rust developer"');
            return;
        }

        try {
            if (config.debugMode) {
                console.log(`[Bot] Searching for members with criteria: ${query}`);
            }
            
            // Search for matching members using the knowledge handler
            const matches = await services.knowledgeHandler.searchMembers(query);
            
            if (matches.length === 0) {
                await ctx.reply('No matching members found for your criteria.');
                return;
            }

            // Send detailed profiles for top 3 matches
            for (const match of matches.slice(0, 3)) {
                const response = formatMemberProfile(match);
                await ctx.reply(response, { parse_mode: 'Markdown' });
            }
            
            if (config.debugMode) {
                console.log(`[Bot] Found ${matches.length} matches for query: ${query}`);
            }
        } catch (error) {
            console.error('[Bot] Error finding members:', error);
            await ctx.reply('Sorry, I encountered an error while searching for members.');
        }
    };
}

/**
 * Formats a member's profile information into a readable message
 */
function formatMemberProfile(match: MatchResult): string {
    return `
👤 *${match.member.name}*
Match Score: ${(match.matchScore * 100).toFixed(1)}%

💪 Skills: ${match.member.skills.join(', ')}
📚 Experience: ${match.member.experience}

Why this match:
${match.matchReason.map(reason => `• ${reason}`).join('\n')}

📱 Contact: ${match.member.contact}
${match.member.twitterHandle ? `🐦 Twitter: @${match.member.twitterHandle}` : ''}`;
}