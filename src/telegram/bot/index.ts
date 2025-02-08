// src/telegram/bot/index.ts

import { Telegraf, Context } from 'telegraf';
import { Message, Update } from 'telegraf/types';
import axios, { AxiosError } from 'axios';
import https from 'https';
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
import { MessageHandler } from './handlers/messageHandler.js';
import { AxiosProxyConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export class SuperteamBot {
    private readonly bot: Telegraf;
    private readonly config: BotConfig;
    private readonly services: Services;
    private readonly userStates: Map<number, UserState>;
    private initialized: boolean = false;
    private connectionRetries: number = 3;
    private connectionTimeout: number = 30000; // Increased timeout to 30 seconds
    private readonly httpsAgent: https.Agent;
    public botInfo?: BotInfo;

    constructor(config: BotConfig, services: Services) {
        if (!config.TELEGRAM_BOT_TOKEN || config.TELEGRAM_BOT_TOKEN === '') {
            throw new Error('TELEGRAM_BOT_TOKEN is required but not provided');
        }

        if (config.TELEGRAM_BOT_TOKEN.split(':').length !== 2) {
            throw new Error('TELEGRAM_BOT_TOKEN format is invalid. Should be in format "<bot_id>:<token>"');
        }

        validateConfig(config);
        
        this.config = config;
        this.services = services;
        this.userStates = new Map();
        
        // Create a custom HTTPS agent with optimized settings
        this.httpsAgent = new https.Agent({
            keepAlive: true,
            keepAliveMsecs: 30000,
            timeout: 30000,
            maxSockets: 25,
            maxFreeSockets: 10,
            scheduling: 'fifo',
            rejectUnauthorized: true
        });

        // Configure Telegraf with proxy support if needed
        const telegrafConfig: any = {
            telegram: {
                apiRoot: 'https://api.telegram.org',
                agent: this.httpsAgent,
                timeout: 30000,
                webhookReply: false
            }
        };

        // Add proxy configuration if HTTPS_PROXY is set
        if (process.env.HTTPS_PROXY) {
            telegrafConfig.telegram.agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
        }

        this.bot = new Telegraf(this.config.TELEGRAM_BOT_TOKEN, telegrafConfig);
    
        if (config.debugMode) {
            this.bot.use(async (ctx, next) => {
                const maxRetries = 3;
                let retryCount = 0;
    
                const executeWithRetry = async (): Promise<void> => {
                    try {
                        const start = Date.now();
                        console.log(`[Bot] Received ${ctx.updateType}`);
                        
                        await next();
                        
                        const ms = Date.now() - start;
                        console.log(`[Bot] Response time: ${ms}ms`);
                    } catch (error) {
                        console.error(`[Bot] Error (attempt ${retryCount + 1}/${maxRetries}):`, error);
                        
                        if (retryCount < maxRetries - 1) {
                            retryCount++;
                            const delay = 1000 * Math.pow(2, retryCount);
                            console.log(`[Bot] Retrying in ${delay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                            return executeWithRetry();
                        }
                        
                        throw error;
                    }
                };
    
                await executeWithRetry();
            });
        }
    }

    public async start(): Promise<void> {
        try {
            if (this.initialized) {
                console.log('Bot is already running');
                return;
            }

            // Test DNS resolution
            try {
                const dns = await import('dns/promises');
                const { address } = await dns.lookup('api.telegram.org');
                console.log('DNS resolution successful:', address);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.warn('DNS resolution warning:', errorMessage);
            }

            // Verify token format
            if (!this.config.TELEGRAM_BOT_TOKEN.includes(':')) {
                throw new Error('Invalid bot token format. Should be in format "<bot_id>:<token>"');
            }

            // Test connection with retries
            await this.testConnection();

            // Initialize bot
            await this.initializeBot();

            console.log('Bot started successfully');
        } catch (error) {
            console.error('Failed to start bot:', error);
            await this.cleanup();
            throw error;
        }
    }

    public async stop(signal?: string): Promise<void> {
        console.log(`Stopping bot${signal ? ` due to ${signal}` : ''}...`);
        
        try {
            if (this.initialized) {
                await this.bot.stop();
                this.initialized = false;
                console.log('Bot stopped successfully');
            }
        } catch (error) {
            console.error('Error stopping bot:', error);
            throw error;
        }
    }

    private async testConnection(): Promise<void> {
        const maxRetries = 3;
        const baseDelay = 2000; // Start with 2 second delay

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Testing Telegram API connection (attempt ${attempt}/${maxRetries})...`);
                
                const config: any = {
                    timeout: this.connectionTimeout,
                    httpsAgent: this.httpsAgent,
                    validateStatus: null
                };

                // Add proxy if configured
                if (process.env.HTTPS_PROXY) {
                    config.proxy = false; // Disable axios proxy handling
                    config.httpsAgent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
                }

                const response = await axios.get(
                    `https://api.telegram.org/bot${this.config.TELEGRAM_BOT_TOKEN}/getMe`,
                    config
                );

                if (!response.data?.ok) {
                    throw new Error(`Invalid response: ${JSON.stringify(response.data)}`);
                }

                console.log('Connection test successful');
                return;
            } catch (error) {
                const isAxiosError = error instanceof AxiosError;
                const errorMessage = isAxiosError ? 
                    `${error.code || error.message} (${error.response?.status || 'no status'})` : 
                    String(error);

                console.error(`Connection attempt ${attempt} failed:`, errorMessage);

                if (attempt === maxRetries) {
                    throw new Error(`Failed to connect after ${maxRetries} attempts. Last error: ${errorMessage}`);
                }

                // Exponential backoff
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.log(`Waiting ${delay}ms before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    private async checkNetworkStatus(): Promise<void> {
        try {
            // Test basic internet connectivity
            console.log('Testing internet connectivity...');
            const internetTest = await axios.get('https://8.8.8.8', { 
                timeout: 5000,
                httpsAgent: new https.Agent({ family: 4 })
            });
            console.log('Internet connection successful');
    
            // Test DNS resolution
            console.log('Testing DNS resolution...');
            const dns = await import('dns/promises');
            const addresses = await dns.resolve4('api.telegram.org');
            console.log('DNS resolution successful:', addresses);
    
            // Test direct IP connection
            console.log('Testing direct IP connection...');
            for (const ip of addresses) {
                try {
                    const response = await axios.get(`https://${ip}`, {
                        timeout: 5000,
                        headers: { 'Host': 'api.telegram.org' },
                        httpsAgent: new https.Agent({ 
                            family: 4,
                            rejectUnauthorized: false 
                        })
                    });
                    console.log(`Connection to ${ip} successful`);
                } catch (error) {
                    if (error instanceof Error) {
                        console.error(`Failed to connect to ${ip}:`, error.message);
                    } else {
                        console.error(`Failed to connect to ${ip}:`, String(error));
                    }
                }
            }
        } catch (error) {
            console.error('Network diagnostics failed:', error);
        }
    }

    private async initializeBot(): Promise<void> {
        try {
            // Get bot info with retry
            let botInfo;
            for (let i = 0; i < this.connectionRetries; i++) {
                try {
                    botInfo = await this.bot.telegram.getMe();
                    break;
                } catch (error) {
                    if (i === this.connectionRetries - 1) throw error;
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

            if (!botInfo) {
                throw new Error('Failed to get bot info');
            }

            this.botInfo = botInfo;
            console.log(`Bot info received: @${botInfo.username}`);

            // Setup message handler
            const messageHandler = new MessageHandler(this.services, botInfo.username);

            // Listen for all message types
            this.bot.on('message', async (ctx) => {
                try {
                    console.log('[Bot] Received message event:', {
                        type: ctx.updateType,
                        message: ctx.message,
                        from: ctx.from,
                        chat: ctx.chat
                    });
                    
                    await messageHandler.handleMessage(ctx);
                } catch (error) {
                    console.error('[Bot] Message handler error:', error);
                    try {
                        await ctx.reply('Sorry, I encountered an error. Please try again in a moment.');
                    } catch (replyError) {
                        console.error('[Bot] Failed to send error message:', replyError);
                    }
                }
            });

            // Setup handlers and middleware
            await this.setupHandlers();
            this.setupMiddleware();
            await this.setupCommands();

            // Launch bot with error handling
            await this.bot.launch({
                dropPendingUpdates: true,
                allowedUpdates: ['message', 'callback_query']
            });

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize bot:', error);
            throw error;
        }
    }

    private setupMiddleware(): void {
        this.bot.use(createLoggerMiddleware(this.config));
        this.bot.use(createStateManagerMiddleware(this.userStates));
        this.bot.use(createErrorHandlerMiddleware(this.config));
    }

    private async setupHandlers(): Promise<void> {
        try {
            // Remove all middleware and handlers temporarily
            // Only keep command handlers
            console.log('Setting up basic handlers...');
        } catch (error) {
            console.error('Error setting up handlers:', error);
            throw error;
        }
    }

    private async setupCommands(): Promise<void> {
        try {
            console.log('Setting up commands...');
            
            // Create command handlers
            const startHandler = createStartCommand(this.config);
            const helpHandler = createHelpCommand(this.config);
            const findHandler = createFindCommand(this.services, this.config);
            const tweetHandler = createTweetCommand(this.services, this.config);
            const eventsHandler = createEventsCommand(this.services, this.config);

            // Register command handlers with error handling
            const registerCommand = (command: string, handler: Function) => {
                this.bot.command(command, async (ctx) => {
                    console.log(`[Bot] Processing /${command} command`);
                    try {
                        await handler(ctx);
                        console.log(`[Bot] Successfully executed /${command} command`);
                    } catch (error) {
                        console.error(`[Bot] Error in /${command} command:`, error);
                        await ctx.reply('Sorry, something went wrong. Please try again.').catch(console.error);
                    }
                });
            };

            // Register all commands
            registerCommand('start', startHandler);
            registerCommand('help', helpHandler);
            registerCommand('find', findHandler);
            registerCommand('tweet', tweetHandler);
            registerCommand('events', eventsHandler);

            // Register commands with Telegram
            await this.bot.telegram.setMyCommands([
                { command: 'start', description: 'Start the bot' },
                { command: 'help', description: 'Show help' },
                { command: 'find', description: 'Search members' },
                { command: 'tweet', description: 'Create tweet' },
                { command: 'events', description: 'Show events' }
            ]);

            console.log('Commands registered successfully');
        } catch (error) {
            console.error('Error setting up commands:', error);
            throw error;
        }
    }

    private setupErrorHandlers(): void {
        this.bot.catch((error: unknown) => {
            console.error('Unhandled bot error:', error);
        });

        process.once('SIGINT', () => this.stop('SIGINT'));
        process.once('SIGTERM', () => this.stop('SIGTERM'));
    }

    private async launchBot(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('Starting bot in long polling mode...');
            
            const timeoutDuration = 120000;
            let timeoutId: NodeJS.Timeout;
    
            const launchPromise = this.bot.launch({
                dropPendingUpdates: true,
                allowedUpdates: ['message', 'callback_query']
            });
    
            const timeoutPromise = new Promise((_, timeoutReject) => {
                timeoutId = setTimeout(() => {
                    console.log('Bot launch is taking longer than expected...');
                    this.bot.telegram.getMe()
                        .then(info => {
                            console.log('Bot is actually running:', info);
                            resolve();
                        })
                        .catch(() => {
                            timeoutReject(new Error(`Bot launch timeout after ${timeoutDuration}ms`));
                        });
                }, timeoutDuration);
            });
    
            let retryCount = 0;
            const maxRetries = 3;
    
            const attemptLaunch = () => {
                Promise.race([launchPromise, timeoutPromise])
                    .then(() => {
                        clearTimeout(timeoutId);
                        console.log('Bot successfully started in long polling mode');
                        resolve();
                    })
                    .catch(async (error: Error) => {
                        clearTimeout(timeoutId);
                        console.error(`Launch attempt ${retryCount + 1} failed:`, error);
    
                        if (retryCount < maxRetries) {
                            retryCount++;
                            console.log(`Retrying launch (attempt ${retryCount + 1}/${maxRetries + 1})...`);
                            await new Promise(resolve => setTimeout(resolve, 5000 * retryCount));
                            attemptLaunch();
                        } else {
                            console.error('Max retries reached');
                            reject(error);
                        }
                    });
            };
    
            attemptLaunch();
        });
    }

    private async checkWebhookStatus(): Promise<void> {
        try {
            const webhookInfo = await this.bot.telegram.getWebhookInfo();
            console.log('Current webhook status:', {
                url: webhookInfo.url,
                pendingUpdateCount: webhookInfo.pending_update_count,
                hasCustomCertificate: webhookInfo.has_custom_certificate,
                lastErrorDate: webhookInfo.last_error_date,
                lastErrorMessage: webhookInfo.last_error_message,
                maxConnections: webhookInfo.max_connections
            });
        } catch (error) {
            console.error('Failed to check webhook status:', error);
        }
    }
    

    private async cleanup(): Promise<void> {
        try {
            await this.stop();
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}