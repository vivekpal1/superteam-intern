// src/index.ts
import { SuperteamBot } from './telegram/bot.js';
import { config } from './config/index.js';
import { PrismaClient } from '@prisma/client';
import { TweetManager } from './agent/services/tweetManager.js';
import { ModelSelector } from './agent/core/llm/modelSelector.js';

async function main() {
    try {
        console.log('Starting SuperteamVN Assistant...');

        const prisma = new PrismaClient();
        const model = new ModelSelector(true);
        
        console.log('Initializing services...');
        
        await prisma.$connect();
        console.log('Database connected successfully');

        await model.initialize();
        console.log('AI model initialized successfully');

        const bot = new SuperteamBot();
        await bot.start();
        console.log('Bot started successfully');

        setupMonitoring(prisma);

        setupShutdown(bot, prisma);

    } catch (error) {
        console.error('Initialization error:', error);
        await cleanup();
        process.exit(1);
    }
}

function setupMonitoring(prisma: PrismaClient) {
    setInterval(async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            console.error('Database connection lost:', error);
            process.exit(1);
        }
    }, 60000); // Check every minute

    setInterval(() => {
        const used = process.memoryUsage();
        console.log('Memory usage:', {
            heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`
        });
    }, 300000); // Log every 5 minutes
}

function setupShutdown(bot: SuperteamBot, prisma: PrismaClient) {
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

async function cleanup() {
    try {
        const prisma = new PrismaClient();
        await prisma.$disconnect();
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    cleanup().then(() => process.exit(1));
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    cleanup().then(() => process.exit(1));
});

main().catch(async (error) => {
    console.error('Fatal error:', error);
    await cleanup();
    process.exit(1);
});