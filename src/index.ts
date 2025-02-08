// src/index.ts
import { SuperteamBot } from './telegram/bot/index.js';
import { config } from './config/index.js';
import { PrismaClient } from '@prisma/client';
import { initializeServices } from './telegram/bot/services/initializeServices.js';
import { ModelSelector } from './agent/core/llm/modelSelector.js';

const prisma = new PrismaClient();
const model = new ModelSelector(true);

/**
 * Main application entry point that handles initialization of all core services
 * and starts the Telegram bot with proper error handling and monitoring.
 */
async function main() {
    try {
        console.log('Starting SuperteamVN Assistant...');
        
        console.log('Initializing core services...');
        await initializeCoreServices();

        console.log('Initializing bot...');
        const bot = await initializeBot();
        
        setupGracefulShutdown(bot);
        
        console.log('System initialization complete');
    } catch (error) {
        await handleFatalError(error);
    }
}

/**
 * Initializes core services like database and AI model
 */
async function initializeCoreServices() {
    try {
        await prisma.$connect();
        console.log('Database connected successfully');

        await model.initialize();
        console.log('AI model initialized successfully');

        const services = await initializeServices();
        console.log('All services initialized successfully');

        return services;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to initialize core services: ${error.message}`);
        } else {
            throw new Error('Failed to initialize core services: Unknown error');
        }
    }
}

/**
 * Initializes and starts the Telegram bot
 */
async function initializeBot() {
    const services = await initializeServices();
    
    const bot = new SuperteamBot({
        debugMode: true,
        adminIds: new Set([]),
        TELEGRAM_BOT_TOKEN: config.TELEGRAM_BOT_TOKEN,
        handlerTimeout: 90000,
    }, services);

    try {
        await bot.start();
        console.log('Bot started successfully!');
        return bot;
    } catch (error) {
        console.error('Failed to start bot:', error);
        await bot.stop();
        throw error;
    }
}

/**
 * Sets up system monitoring for database connectivity and memory usage
 */
function setupSystemMonitoring() {
    // Monitor database connection
    setInterval(async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            console.error('Database connection lost:', error);
            process.exit(1);
        }
    }, 60000);

    // Monitor memory usage
    setInterval(() => {
        const used = process.memoryUsage();
        console.log('Memory usage:', {
            heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`
        });
    }, 300000); // Log every 5 minutes
}

/**
 * Sets up graceful shutdown handlers for clean process termination
 */
function setupGracefulShutdown(bot: SuperteamBot) {
    async function shutdown(signal: string) {
        console.log(`${signal} signal received. Starting graceful shutdown...`);
        
        try {
            await bot.stop(signal);
            await prisma.$disconnect();
            console.log('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    }

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
}

/**
 * Handles cleanup of resources during error scenarios
 */
async function cleanup() {
    try {
        await prisma.$disconnect();
        console.log('Cleanup completed successfully');
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

/**
 * Handles fatal errors with proper logging and cleanup
 */
async function handleFatalError(error: any) {
    console.error('Fatal initialization error:', error);
    if (error instanceof Error) {
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
    }
    await cleanup();
    process.exit(1);
}

// Set up global error handlers
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    cleanup().then(() => process.exit(1));
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    cleanup().then(() => process.exit(1));
});

// Start the application
main().catch(async (error) => {
    console.error('Fatal error:', error);
    await cleanup();
    process.exit(1);
});