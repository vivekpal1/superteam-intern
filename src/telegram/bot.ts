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

// Define interfaces
interface UserState {
    waitingFor?: 'tweet' | 'document' | null;
    lastCommand?: string;
    context?: any;
}

export class SuperteamBot {
    // Private properties
    private readonly bot: Telegraf;
    private readonly prisma: PrismaClient;
    private readonly llm: CloudLLM;
    private readonly knowledgeHandler: KnowledgeHandler;
    private readonly tweetManager: TweetManager;
    private readonly contentAdvisor: ContentAdvisor;
    private readonly memberFinder: MemberFinder;
    private readonly twitterService: TwitterService;
    private readonly walletService: WalletService;
    private readonly userStates: Map<number, UserState>;
    private readonly adminIds: Set<number>;
    private readonly debugMode: boolean;
    private initialized: boolean = false;

    public botInfo?: {
        username: string;
        id: number;
        [key: string]: any;
    };

    // Following from the previous class property declarations...

    constructor(debug: boolean = false) {
        // Validate configuration before initializing anything
        if (!config.TELEGRAM_BOT_TOKEN) {
            throw new Error('TELEGRAM_BOT_TOKEN is not configured');
        }
        if (!this.isValidBotToken(config.TELEGRAM_BOT_TOKEN)) {
            throw new Error('Invalid bot token format');
        }

        // Set debug mode for detailed logging
        this.debugMode = debug;
        this.log('Initializing bot instance');

        // Initialize core components
        // We create the Telegram bot with a generous timeout for long-running operations
        this.bot = new Telegraf(config.TELEGRAM_BOT_TOKEN, {
            handlerTimeout: 90_000, // 90 seconds
        });

        // Initialize database connection
        this.prisma = new PrismaClient();

        // Initialize core AI services
        this.llm = new CloudLLM();
        
        // Initialize feature-specific services
        this.knowledgeHandler = new KnowledgeHandler();
        this.tweetManager = new TweetManager();
        this.contentAdvisor = new ContentAdvisor();
        this.memberFinder = new MemberFinder();
        this.twitterService = new TwitterService();
        this.walletService = new WalletService();

        // Initialize state management
        this.userStates = new Map();
        this.adminIds = new Set([/* Add admin Telegram IDs */]);

        this.log('Bot instance created successfully');
    }

    // Utility method for debug logging
    private log(message: string, ...args: any[]): void {
        if (this.debugMode) {
            console.log(`[Bot] ${message}`, ...args);
        }
    }

    // Validates Telegram bot token format
    private isValidBotToken(token: string): boolean {
        return /^\d+:[A-Za-z0-9_-]{35,}$/.test(token);
    }

    /**
     * Main method to start the bot and initialize all services
     */
    public async start(): Promise<void> {
        if (this.initialized) {
            throw new Error('Bot has already been initialized');
        }

        try {
            this.log('Starting bot initialization...');

            // Test core services first
            await this.testServices();

            // Get and store bot information
            this.botInfo = await this.bot.telegram.getMe();
            this.log(`Bot identity confirmed: @${this.botInfo.username}`);

            // Set up bot infrastructure in correct order
            this.setupMiddleware();
            await this.setupCommandHandlers();
            this.setupMessageHandlers();
            this.setupErrorHandlers();

            // Launch the bot with a timeout to prevent hanging
            this.log('Launching bot...');
            await Promise.race([
                this.bot.launch({
                    dropPendingUpdates: true,
                    allowedUpdates: ['message', 'callback_query']
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Bot launch timeout')), 10000)
                )
            ]);

            this.initialized = true;
            console.log(`🤖 Bot @${this.botInfo.username} is now running!`);

            // Set up graceful shutdown handlers
            this.setupShutdownHandlers();
        } catch (error) {
            console.error('Failed to start bot:', error);
            throw error;
        }
    }

    /**
     * Tests all critical services before full initialization
     */
    private async testServices(): Promise<void> {
        try {
            // Test database connection
            await this.prisma.$queryRaw`SELECT 1`;
            this.log('Database connection verified');

            // Test LLM connection
            await this.llm.testConnection();
            this.log('LLM connection verified');
        } catch (error) {
            console.error('Service test failed:', error);
            throw error;
        }
    }

    /**
     * Sets up middleware for logging, state management, and error handling.
     * Middleware runs in order for every message before command handlers.
     */
    private setupMiddleware(): void {
        // First middleware: Performance and request logging
        this.bot.use(async (ctx: Context, next: () => Promise<void>) => {
            const start = Date.now();
            
            // Log incoming update
            this.log(`Received ${ctx.updateType} from ${ctx.from?.id}`);
            
            // Process next middleware
            await next();
            
            // Log processing time
            const ms = Date.now() - start;
            this.log(`[${ctx.from?.id}] ${ctx.updateType} processed in ${ms}ms`);
        });

        // Second middleware: User state initialization and management
        this.bot.use(async (ctx, next) => {
            if (!ctx.from) {
                this.log('Received message without user information');
                return next();
            }
            
            // Initialize user state if not exists
            if (!this.userStates.has(ctx.from.id)) {
                this.userStates.set(ctx.from.id, {});
                this.log(`Initialized state for user ${ctx.from.id}`);
            }
            
            await next();
        });

        // Third middleware: Global error handling
        this.bot.use(async (ctx, next) => {
            try {
                await next();
            } catch (error) {
                console.error('Error in middleware:', error);
                // Send user-friendly error message
                await ctx.reply('An error occurred while processing your request. Please try again.');
            }
        });
    }

    /**
     * Sets up all command handlers with error handling and logging.
     * Each command is wrapped to ensure consistent error handling.
     */
    private async setupCommandHandlers(): Promise<void> {
        this.log('Setting up command handlers...');

        // Helper function to wrap command handlers with error handling
        const wrap = (handler: (ctx: Context) => Promise<void>) => {
            return async (ctx: Context) => {
                try {
                    this.log(`Executing command handler: ${handler.name}`);
                    await handler.call(this, ctx);
                    this.log(`Successfully completed command: ${handler.name}`);
                } catch (error) {
                    console.error(`Error in ${handler.name}:`, error);
                    await ctx.reply('Sorry, there was an error processing your command.');
                }
            };
        };

        // Basic health check command
        this.bot.command('ping', async (ctx) => {
            await ctx.reply('pong');
            this.log('Ping command processed');
        });

        // Register all command handlers with error wrapping
        this.bot.command('start', wrap(this.handleStart.bind(this)));
        this.bot.command('help', wrap(this.handleHelp.bind(this)));
        this.bot.command('find', wrap(this.handleFind.bind(this)));
        this.bot.command('tweet', wrap(this.handleTweetCommand.bind(this)));
        this.bot.command('upload', wrap(this.handleUploadCommand.bind(this)));
        this.bot.command('events', wrap(this.handleEvents.bind(this)));
        this.bot.command('approve', wrap(this.handleApprove.bind(this)));
        this.bot.command('stats', wrap(this.handleStats.bind(this)));

        this.log('Command handlers setup completed');
    }

    /**
     * Sets up handlers for processing regular messages and documents.
     * These handlers manage non-command interactions with the bot.
     */
    private setupMessageHandlers(): void {
        // Handle document uploads - only process if waiting for a document
        this.bot.on('document', async (ctx) => {
            const state = this.userStates.get(ctx.from!.id);
            if (state?.waitingFor === 'document') {
                try {
                    await this.knowledgeHandler.handleDocument(ctx);
                    state.waitingFor = null;  // Reset state after handling
                    this.log(`Processed document from user ${ctx.from!.id}`);
                } catch (error) {
                    console.error('Error processing document:', error);
                    await ctx.reply('Sorry, there was an error processing your document.');
                }
            }
        });

        // Handle regular text messages - use knowledge base to respond
        this.bot.on('text', async (ctx) => {
            // Ignore commands - they're handled by command handlers
            if (ctx.message.text.startsWith('/')) return;

            try {
                this.log(`Processing text message from user ${ctx.from!.id}`);
                await this.knowledgeHandler.handleQuery(ctx, ctx.message.text);
                this.log('Successfully processed text message');
            } catch (error) {
                console.error('Error handling message:', error);
                await ctx.reply('Sorry, I encountered an error processing your message.');
            }
        });
    }

    /**
     * Handles the /start command - introduces the bot to new users
     */
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
        this.log(`Started conversation with user ${ctx.from?.id}`);
    }

    /**
     * Handles the /help command - shows available commands based on user role
     */
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
        this.log(`Sent help message to user ${ctx.from?.id}`);
    }

    /**
     * Handles the /find command - searches for team members with specific skills
     */
    private async handleFind(ctx: Context): Promise<void> {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Please provide search criteria.');
            return;
        }
    
        const query = ctx.message.text.replace('/find', '').trim();
        if (!query) {
            await ctx.reply('Please provide search criteria.\nExample: /find "rust developer"');
            return;
        }

        try {
            this.log(`Searching for members with criteria: ${query}`);
            const matches = await this.memberFinder.findMembers(query);
            
            if (matches.length === 0) {
                await ctx.reply('No matching members found for your criteria.');
                return;
            }

            // Send top 3 matches with formatted profiles
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
            
            this.log(`Found ${matches.length} matches for query: ${query}`);
        } catch (error) {
            console.error('Error finding members:', error);
            await ctx.reply('Sorry, I encountered an error while searching for members.');
        }
    }

    /**
     * Handles the /tweet command - creates and processes tweet drafts
     */
    private async handleTweetCommand(ctx: Context): Promise<void> {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Please provide tweet content.');
            return;
        }
    
        const content = ctx.message.text.replace('/tweet', '').trim();
        
        if (!content) {
            await ctx.reply('Please provide tweet content.\nExample: /tweet "Exciting news..."');
            return;
        }

        try {
            this.log(`Creating tweet draft for user ${ctx.from?.id}`);
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
            this.log(`Created tweet draft with ID: ${draft.id}`);
        } catch (error) {
            console.error('Error creating tweet:', error);
            await ctx.reply('Sorry, I encountered an error processing your tweet.');
        }
    }

    /**
     * Handles the /upload command - allows admins to upload documents
     */
    private async handleUploadCommand(ctx: Context): Promise<void> {
        if (!this.adminIds.has(ctx.from?.id || 0)) {
            await ctx.reply('This command is only available to admins.');
            return;
        }

        const state = this.userStates.get(ctx.from!.id);
        if (state) {
            state.waitingFor = 'document';
            this.log(`Waiting for document from admin ${ctx.from?.id}`);
        }

        await ctx.reply('Please send me the document you want to add to the knowledge base.');
    }

    /**
     * Handles the /events command - lists upcoming events
     */
    private async handleEvents(ctx: Context): Promise<void> {
        try {
            this.log('Fetching upcoming events');
            const events = await this.prisma.event.findMany({
                where: {
                    date: { gte: new Date() }  // Only future events
                },
                orderBy: { date: 'asc' },
                take: 5  // Limit to next 5 events
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
            this.log(`Sent ${events.length} events to user ${ctx.from?.id}`);
        } catch (error) {
            console.error('Error fetching events:', error);
            await ctx.reply('Sorry, I encountered an error fetching events.');
        }
    }

    /**
     * Handles the /stats command - shows bot usage statistics
     */
    private async handleStats(ctx: Context): Promise<void> {
        try {
            if (!this.adminIds.has(ctx.from?.id || 0)) {
                await ctx.reply('Stats are only available to admins.');
                return;
            }

            // Get basic usage statistics
            const stats = {
                messageCount: await this.prisma.activityLog.count({
                    where: { type: 'message' }
                }),
                userCount: this.userStates.size,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            };

            const message = `
📊 Bot Statistics

Messages Processed: ${stats.messageCount}
Active Users: ${stats.userCount}
Uptime: ${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m
Memory Usage: ${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}MB`;

            await ctx.reply(message);
            this.log(`Sent stats to admin ${ctx.from?.id}`);
        } catch (error) {
            console.error('Error fetching stats:', error);
            await ctx.reply('Sorry, I encountered an error retrieving stats.');
        }
    }

    /**
     * Handles the /approve command - approves pending content (admin only)
     */
    private async handleApprove(ctx: Context): Promise<void> {
        try {
            if (!ctx.message || !('text' in ctx.message)) {
                await ctx.reply('Please provide an ID to approve.');
                return;
            }

            if (!this.adminIds.has(ctx.from?.id || 0)) {
                await ctx.reply('Approval is restricted to admins.');
                return;
            }

            const parts = ctx.message.text.split(' ');
            if (parts.length !== 2) {
                await ctx.reply('Please provide the ID to approve. Format: /approve <id>');
                return;
            }

            const id = parts[1];
            this.log(`Processing approval for content ID: ${id}`);

            // Find and approve the content
            const result = await this.tweetManager.approveDraft(id);
            
            if (result.success) {
                await ctx.reply(`✅ Content with ID ${id} has been approved and will be published.`);
                this.log(`Content ${id} approved by admin ${ctx.from?.id}`);
            } else {
                await ctx.reply(`❌ Couldn't approve content: ${result.error}`);
            }
        } catch (error) {
            console.error('Error in approval process:', error);
            await ctx.reply('Sorry, there was an error processing the approval.');
        }
    }

    /**
     * Sets up error handlers for the bot
     */
    private setupErrorHandlers(): void {
        this.bot.catch(async (error: any, ctx: Context) => {
            console.error('Unhandled bot error:', error);
            await ctx.reply('An unexpected error occurred. Please try again later.');
        });
    }

    /**
     * Sets up graceful shutdown handlers for the bot
     */
    private setupShutdownHandlers(): void {
        const shutdownHandler = (signal: string) => {
            this.log(`Received ${signal} signal`);
            this.stop(signal);
        };

        process.once('SIGINT', () => shutdownHandler('SIGINT'));
        process.once('SIGTERM', () => shutdownHandler('SIGTERM'));
    }

    /**
     * Stops the bot and cleans up resources
     */
    public async stop(signal: string): Promise<void> {
        this.log(`Stopping bot due to ${signal}...`);
        
        try {
            // Stop accepting new messages
            await this.bot.stop();
            
            // Close database connection
            await this.prisma.$disconnect();
            
            // Log final statistics
            const stats = {
                uptime: process.uptime(),
                activeUsers: this.userStates.size
            };
            
            this.log('Final statistics:', stats);
            this.log('Bot stopped successfully');
        } catch (error) {
            console.error('Error stopping bot:', error);
            throw error;
        }
    }
}