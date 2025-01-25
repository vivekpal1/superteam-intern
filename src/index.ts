// src/index.ts
import { SuperteamBot } from './telegram/bot/index.js';
import { config } from './config/index.js';
import { PrismaClient } from '@prisma/client';
import { initializeServices } from './telegram/bot/services/initializeServices.js';
import { ModelSelector } from './agent/core/llm/modelSelector.js';

// Initialize core services that will be used throughout the application
const prisma = new PrismaClient();
const model = new ModelSelector(true); // true enables debug mode

/**
 * Main application entry point that handles initialization of all core services
 * and starts the Telegram bot with proper error handling and monitoring.
 */
async function main() {
    try {
        console.log('Starting SuperteamVN Assistant...');

        // First phase: Initialize core database and AI services
        console.log('Initializing core services...');
        await initializeCoreServices();

        // Second phase: Set up and start the bot
        console.log('Initializing bot...');
        const bot = await initializeBot();

        // Third phase: Set up monitoring and graceful shutdown
        setupSystemMonitoring();
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
        // Initialize database connection
        await prisma.$connect();
        console.log('Database connected successfully');

        // Initialize AI model
        await model.initialize();
        console.log('AI model initialized successfully');

        // Initialize other services
        const services = await initializeServices();
        console.log('All services initialized successfully');

        return services;
    } catch (error: unknown) {
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
    // Create bot instance with required configuration
    const bot = new SuperteamBot({
        debugMode: true,
        adminIds: new Set([/* Add admin Telegram IDs */]),
        TELEGRAM_BOT_TOKEN: config.TELEGRAM_BOT_TOKEN,
        handlerTimeout: 90000,
    }, await initializeServices());

    try {
        console.log('Starting bot...');
        await bot.start();
        console.log('Bot started successfully!');
        return bot;
    } catch (error) {
        console.error('Failed to start bot:', error);
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
    }, 60000); // Check every minute

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