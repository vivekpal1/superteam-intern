// src/telegram/bot/commands/statsCommand.ts
import { Context } from 'telegraf';
import { Services, BotConfig } from '../types/index.js';
import { formatUptime, formatBytes } from '../utils/formatters.js';

interface SystemStats {
    messageCount: number;
    todayMessages: number;
    totalUsers: number;
    totalEvents: number;
    totalDocs: number;
    activeUsers: number;
    memory: NodeJS.MemoryUsage;
}

/**
 * Creates a handler for the /stats command which provides system statistics
 * and performance metrics to administrators. This command aggregates data
 * from various services to provide a comprehensive system overview.
 * 
 * The command includes memory usage, message counts, user activity,
 * and other key metrics that help monitor the bot's performance.
 */
export function createStatsCommand(services: Services, config: BotConfig) {
    return async (ctx: Context): Promise<void> => {
        try {
            // Verify admin privileges
            if (!config.adminIds.has(ctx.from?.id || 0)) {
                await ctx.reply('This command is restricted to administrators.');
                return;
            }

            // Gather system statistics
            const stats = await gatherSystemStats(services);
            const message = formatSystemStats(stats);

            await ctx.reply(message, { parse_mode: 'Markdown' });
            
            if (config.debugMode) {
                console.log(`[Bot] Sent stats to admin ${ctx.from?.id}`);
            }
        } catch (error) {
            console.error('[Bot] Error fetching stats:', error);
            await ctx.reply('Sorry, I encountered an error retrieving statistics.');
        }
    };
}

/**
 * Gathers comprehensive system statistics from various services
 */
async function gatherSystemStats(services: Services): Promise<SystemStats> {
    const [
        messageCount,
        todayMessages,
        totalUsers,
        totalEvents,
        totalDocs
    ] = await Promise.all([
        services.prisma.activityLog.count({
            where: { type: 'message' }
        }),
        services.prisma.activityLog.count({
            where: {
                type: 'message',
                timestamp: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }
        }),
        services.prisma.member.count(),
        services.prisma.event.count(),
        services.prisma.document.count()
    ]);

    return {
        messageCount,
        todayMessages,
        totalUsers,
        totalEvents,
        totalDocs,
        activeUsers: services.stateManager.getActiveUserCount(),
        memory: process.memoryUsage()
    };
}

/**
 * Formats system statistics into a readable message
 */
function formatSystemStats(stats: SystemStats): string {
    return `
📊 *Bot Statistics*

Message Stats:
├ Total Messages: ${stats.messageCount}
├ Messages Today: ${stats.todayMessages}
└ Active Users: ${stats.activeUsers}

Memory Usage:
├ Heap Used: ${formatBytes(stats.memory.heapUsed)}
└ Heap Total: ${formatBytes(stats.memory.heapTotal)}

System Info:
├ Uptime: ${formatUptime(process.uptime())}
├ Node Version: ${process.version}
└ Platform: ${process.platform}

Database Stats:
├ Total Users: ${stats.totalUsers}
├ Total Events: ${stats.totalEvents}
└ Total Documents: ${stats.totalDocs}`;
}