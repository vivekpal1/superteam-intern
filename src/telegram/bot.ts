// src/telegram/bot.ts
import { Telegraf, Context } from 'telegraf';
import { Message, Update } from 'telegraf/types';
import { config } from '../config/index.js';
import { PrismaClient } from '@prisma/client';
import { KnowledgeHandler } from './handlers/knowledgeHandler.js';
import { TweetManager } from '../agent/services/tweetManager.js';
import { ContentAdvisor } from '../agent/services/contentAdvisor.js';
import { MemberFinder } from '../agent/services/memberFinder.js';
import { TwitterService } from '../agent/services/twitterService.js';
import { WalletService } from '../agent/services/walletService.js';
import { CloudLLM } from '../agent/core/llm/cloudLLM.js';

// Interface for managing user states in conversations
interface UserState {
    waitingFor?: 'tweet' | 'document' | null;
    lastCommand?: string;
    context?: any;
}

export class SuperteamBot {
    private bot: Telegraf<Context>;
    private prisma: PrismaClient;
    private llm: CloudLLM;
    private knowledgeHandler: KnowledgeHandler;
    private tweetManager: TweetManager;
    private contentAdvisor: ContentAdvisor;
    private memberFinder: MemberFinder;
    private twitterService: TwitterService;
    private walletService: WalletService;
    private userStates: Map<number, UserState>;
    private adminIds: Set<number>;
    private botWalletAddress?: string;

    constructor() {
        this.bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);
        this.prisma = new PrismaClient();

        // Initialize core services
        this.bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);
        this.prisma = new PrismaClient();
        this.llm = new CloudLLM();
        
        // Initialize feature-specific services
        this.knowledgeHandler = new KnowledgeHandler();
        this.tweetManager = new TweetManager();
        this.contentAdvisor = new ContentAdvisor();
        this.memberFinder = new MemberFinder();
        this.twitterService = new TwitterService();
        this.walletService = new WalletService();

        this.userStates = new Map();
        this.adminIds = new Set([/* Add admin Telegram IDs */]);

        // Set up bot handlers
        this.setupMiddleware();
        this.setupCommandHandlers();
        this.setupMessageHandlers();
    }

    private isValidBotToken(token: string): boolean {
        return /^\d+:[A-Za-z0-9_-]{35,}$/.test(token);
    }

    private setupMiddleware(): void {
        this.bot.use(async (ctx: Context, next: () => Promise<void>) => {
            const start = Date.now();
            await next();
            const ms = Date.now() - start;
            console.log(`[${ctx.from?.id}] ${ctx.updateType}: ${ms}ms`);
        });

        this.bot.use(async (ctx, next) => {
            if (!ctx.from) return next();
            
            if (!this.userStates.has(ctx.from.id)) {
                this.userStates.set(ctx.from.id, {});
            }
            
            await next();
        });

        this.bot.use(async (ctx, next) => {
            try {
                await next();
            } catch (error) {
                console.error('Error in bot middleware:', error);
                await ctx.reply('An error occurred while processing your request. Please try again.');
            }
        });

        this.bot.on('text', async (ctx: Context) => {
            if (!ctx.message || !('text' in ctx.message)) {
                return;
            }
            const text = ctx.message.text;
        });
    }

    private setupCommandHandlers(): void {
        this.bot.command('start', this.handleStart.bind(this));
        
        this.bot.command('help', this.handleHelp.bind(this));
        
        this.bot.command('find', this.handleFind.bind(this));
        
        this.bot.command('tweet', this.handleTweetCommand.bind(this));
        
        this.bot.command('upload', this.handleUploadCommand.bind(this));
        
        this.bot.command('events', this.handleEvents.bind(this));
        
        this.bot.command('approve', this.handleApprove.bind(this));
        this.bot.command('stats', this.handleStats.bind(this));
    }

    private async handleApprove(ctx: Context): Promise<void> {
        const messageId = ctx.message?.text?.split(' ')[1];
        if (!messageId) {
            await ctx.reply('Please provide a message ID to approve.');
            return;
        }
        
        await ctx.reply(`Message ${messageId} approved.`);
    }

    private async handleMessage(ctx: Context) {
        if ('text' in ctx.message!) {
            const messageText = ctx.message.text;
        }
    }

    private async handleStats(ctx: Context): Promise<void> {
        const stats = await this.getStats();
        await ctx.reply(stats);
    }

    private async getStats(): Promise<string> {
        return 'Stats will be implemented soon.';
    }

    private async handleStart(ctx: Context): Promise<void> {
        const message = `
Hello! 👋 I'm Mai, the SuperteamVN intern assistant.

I can help you with:
- Finding SuperteamVN information 📚
- Connecting with team members 👥
- Managing social media content 📱
- Tracking events and opportunities 🎯

Use /help to see all available commands!`;

        await ctx.reply(message);
    }

    private async handleHelp(ctx: Context): Promise<void> {
        const isAdmin = this.adminIds.has(ctx.from?.id || 0);
        
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
    }

    private async handleFind(ctx: Context): Promise<void> {
        const query = ctx.message?.text?.replace('/find', '').trim();
        if (!query) {
            await ctx.reply('Please provide search criteria.\nExample: /find "rust developer"');
            return;
        }

        try {
            const matches = await this.memberFinder.findMembers(query);
            
            if (matches.length === 0) {
                await ctx.reply('No matching members found for your criteria.');
                return;
            }

            // Send top 3 matches
            for (const match of matches.slice(0, 3)) {
                const member = match.member;
                const response = `
👤 *${member.name}*
Match Score: ${(match.matchScore * 100).toFixed(1)}%

💪 Skills: ${member.skills.join(', ')}
📚 Experience: ${member.experience}

Why this match:
${match.matchReason.map(reason => `• ${reason}`).join('\n')}

📱 Contact: ${member.contact}
${member.twitterHandle ? `🐦 Twitter: @${member.twitterHandle}` : ''}`;
                
                await ctx.reply(response, { parse_mode: 'Markdown' });
            }
        } catch (error) {
            console.error('Error finding members:', error);
            await ctx.reply('Sorry, I encountered an error while searching for members.');
        }
    }

    private async handleTweetCommand(ctx: Context): Promise<void> {
        const content = ctx.message?.text?.replace('/tweet', '').trim();
        
        if (!content) {
            await ctx.reply('Please provide tweet content.\nExample: /tweet "Exciting news..."');
            return;
        }

        try {
            const suggestions = await this.contentAdvisor.improveTweet(content);
            const draft = await this.tweetManager.createDraft({
                content,
                userId: ctx.from?.id.toString() || '',
                suggestions
            });

            const response = `
📝 Tweet Draft Created!

Original:
${content}

✨ Suggested Improvements:
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Status: Pending approval
ID: ${draft.id}`;

            await ctx.reply(response);
        } catch (error) {
            console.error('Error creating tweet:', error);
            await ctx.reply('Sorry, I encountered an error processing your tweet.');
        }
    }

    private async handleUploadCommand(ctx: Context): Promise<void> {
        if (!this.adminIds.has(ctx.from?.id || 0)) {
            await ctx.reply('This command is only available to admins.');
            return;
        }

        const state = this.userStates.get(ctx.from!.id);
        if (state) {
            state.waitingFor = 'document';
        }

        await ctx.reply('Please send me the document you want to add to the knowledge base.');
    }

    private async handleEvents(ctx: Context): Promise<void> {
        try {
            const events = await this.prisma.event.findMany({
                where: {
                    date: { gte: new Date() }
                },
                orderBy: { date: 'asc' },
                take: 5
            });

            if (events.length === 0) {
                await ctx.reply('No upcoming events found.');
                return;
            }

            const message = events.map(event => `
🎉 ${event.title}
📅 ${event.date.toLocaleDateString()}
📍 ${event.location}
${event.description}
`).join('\n');

            await ctx.reply(`Upcoming Events:\n${message}`);
        } catch (error) {
            console.error('Error fetching events:', error);
            await ctx.reply('Sorry, I encountered an error fetching events.');
        }
    }

    private setupMessageHandlers(): void {
        // Handle documents
        this.bot.on('document', async (ctx) => {
            const state = this.userStates.get(ctx.from!.id);
            if (state?.waitingFor === 'document') {
                await this.knowledgeHandler.handleDocument(ctx);
                state.waitingFor = null;
            }
        });

        // Handle text messages
        this.bot.on('text', async (ctx) => {
            if (ctx.message.text.startsWith('/')) return;

            try {
                await this.knowledgeHandler.handleQuery(ctx, ctx.message.text);
            } catch (error) {
                console.error('Error handling message:', error);
                await ctx.reply('Sorry, I encountered an error processing your message.');
            }
        });
    }

    public async start(): Promise<void> {
        try {
            console.log('Starting bot...');
            await this.bot.launch();
            console.log('Bot started successfully');

            process.once('SIGINT', () => this.stop('SIGINT'));
            process.once('SIGTERM', () => this.stop('SIGTERM'));
        } catch (error) {
            console.error('Failed to start bot:', error);
            throw error;
        }
    }

    public async stop(signal: string): Promise<void> {
        console.log(`Received ${signal}, shutting down gracefully...`);
        
        try {
            await this.bot.stop();
            await this.prisma.$disconnect();
            console.log('Shutdown complete');
        } catch (error) {
            console.error('Error during shutdown:', error);
            throw error;
        }
    }
}