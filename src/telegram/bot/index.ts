// src/telegram/bot/index.ts
import { Telegraf, Context } from 'telegraf';
import { Message, Update } from 'telegraf/types';
import { BotConfig, UserState, BotInfo } from './types/index.js';
import { validateConfig } from './utils/validation.js';
import { 
    createLoggerMiddleware, 
    createStateManagerMiddleware, 
    createErrorHandlerMiddleware 
} from './middleware/index.js';
import { 
    createStartCommand, 
    createHelpCommand,
    createFindCommand,
    createTweetCommand,
    createUploadCommand,
    createEventsCommand,
    createApproveCommand,
    createStatsCommand
} from './commands/index.js';
import { createMessageHandler, createDocumentHandler } from './handlers/index.js';
import { Services } from './types/services.js';

/**
 * Main bot class that handles all Telegram bot functionality
 */
export class SuperteamBot {
    private readonly bot: Telegraf;
    private readonly config: BotConfig;
    private readonly services: Services;
    private readonly userStates: Map<number, UserState>;
    private initialized: boolean = false;
    public botInfo?: BotInfo;

    constructor(config: BotConfig, services: Services) {
        // Validate configuration before proceeding
        validateConfig(config);
        
        this.config = config;
        this.services = services;
        this.userStates = new Map();
        
        // Initialize Telegram bot with config
        this.bot = new Telegraf(config.TELEGRAM_BOT_TOKEN, {
            handlerTimeout: config.handlerTimeout || 90_000,
        });
    }

    /**
     * Starts the bot and all its services
     */
    public async start(): Promise<void> {
        if (this.initialized) {
            throw new Error('Bot has already been initialized');
        }

        try {
            await this.initializeBot();
        } catch (error) {
            await this.cleanup();
            throw error;
        }
    }

    /**
     * Initializes all bot components and starts listening for updates
     */
    private async initializeBot(): Promise<void> {
        // Get bot information
        this.botInfo = await this.bot.telegram.getMe();
        
        // Set up all components
        this.setupMiddleware();
        await this.setupHandlers();
        await this.setupCommands();
        this.setupErrorHandlers();
        
        // Launch bot with timeout protection
        await this.launchBot();
        
        this.initialized = true;
        console.log(`🤖 Bot @${this.botInfo?.username} is running!`);
    }

    /**
     * Sets up all middleware components
     */
    private setupMiddleware(): void {
        this.bot.use(createLoggerMiddleware(this.config));
        this.bot.use(createStateManagerMiddleware(this.userStates));
        this.bot.use(createErrorHandlerMiddleware(this.config));
    }

    /**
     * Sets up all message handlers
     */
    private async setupHandlers(): Promise<void> {
        const messageHandler = createMessageHandler(this.services.knowledgeHandler, this.config.debugMode);
        const documentHandler = createDocumentHandler(this.services, this.userStates, this.config);

        this.bot.on('text', messageHandler);
        this.bot.on('document', documentHandler);
    }

    /**
     * Sets up all command handlers
     */
    private async setupCommands(): Promise<void> {
        // Basic commands
        this.bot.command('start', createStartCommand(this.config));
        this.bot.command('help', createHelpCommand(this.config));
        
        // Feature commands
        this.bot.command('find', createFindCommand(this.services, this.config));
        this.bot.command('tweet', createTweetCommand(this.services, this.config));
        this.bot.command('upload', createUploadCommand(this.services, this.config));
        this.bot.command('events', createEventsCommand(this.services, this.config));
        this.bot.command('approve', createApproveCommand(this.services, this.config));
        this.bot.command('stats', createStatsCommand(this.services, this.config));
    }

    /**
     * Sets up error handling for unhandled errors
     */
    private setupErrorHandlers(): void {
        this.bot.catch((error: any) => {
            console.error('Unhandled bot error:', error);
        });
    }

    /**
     * Launches the bot with timeout protection
     */
    private async launchBot(): Promise<void> {
        await Promise.race([
            this.bot.launch({
                dropPendingUpdates: true,
                allowedUpdates: ['message', 'callback_query']
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Bot launch timeout')), 30000)
            )
        ]);
    }

    /**
     * Stops the bot and cleans up resources
     */
    public async stop(signal: string): Promise<void> {
        console.log(`Stopping bot due to ${signal}...`);
        
        try {
            await this.bot.stop();
            console.log('Bot stopped successfully');
        } catch (error) {
            console.error('Error stopping bot:', error);
            throw error;
        }
    }

    /**
     * Cleans up resources during shutdown or error
     */
    private async cleanup(): Promise<void> {
        try {
            if (this.bot) {
                await this.bot.stop();
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}