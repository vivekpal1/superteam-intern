// src/telegram/bot/commands/eventsCommand.ts
import { Context } from 'telegraf';
import { Services, BotConfig } from '../types/index.js';
import { formatDateTime } from '../utils/formatters.js';

interface Event {
    id: string;
    title: string;
    description: string;
    date: Date;
    location: string;
    createdAt: Date;
    type?: string;
}

/**
 * Creates a handler for the /events command which displays upcoming events.
 * Events are fetched from the database and sorted by date, showing only
 * future events to keep information relevant.
 */
export function createEventsCommand(services: Services, config: BotConfig) {
    return async (ctx: Context): Promise<void> => {
        try {
            if (config.debugMode) {
                console.log('[Bot] Fetching upcoming events');
            }

            const events = await services.prisma.event.findMany({
                where: {
                    date: { 
                        gte: new Date()
                    }
                },
                orderBy: { 
                    date: 'asc' 
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    date: true,
                    location: true,
                    createdAt: true
                },
                take: 5,
            });

            if (events.length === 0) {
                await ctx.reply('No upcoming events found.');
                return;
            }

            const message = formatEventsList(events);
            await ctx.reply(message);

            if (config.debugMode) {
                console.log(`[Bot] Sent ${events.length} events to user ${ctx.from?.id}`);
            }
        } catch (error) {
            console.error('[Bot] Error fetching events:', error);
            await ctx.reply('Sorry, I encountered an error fetching events.');
        }
    };
}

/**
 * Formats a list of events into a readable message
 */
function formatEventsList(events: Event[]): string {
    const eventsList = events.map(event => `
🎉 ${event.title}
📅 ${formatDateTime(event.date)}
📍 ${event.location}
${event.description}
`).join('\n───────────────\n');

    return `📅 Upcoming Events\n\n${eventsList}\n\nUse /help to see other available commands!`;
}