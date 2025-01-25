// scripts/start-bot.ts
import { SuperteamBot } from '../src/telegram/bot.js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

dotenv.config();

async function validateEnvironment() {
    const requiredVars = [
        'TELEGRAM_BOT_TOKEN',
        'DATABASE_URL',
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

async function initializeDatabase() {
    const prisma = new PrismaClient();
    try {
        await prisma.$connect();
        console.log('Database connection established');
        return prisma;
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}

async function loadKnowledgeBase() {
    const knowledgeDir = path.join(process.cwd(), 'src/storage/knowledge');
    try {
        const files = await fs.readdir(knowledgeDir);
        console.log(`Found ${files.length} knowledge files`);
        return files;
    } catch (error) {
        console.error('Error loading knowledge base:', error);
        return [];
    }
}

async function startBot() {
    try {
        console.log('Starting Superteam Vietnam Assistant...');
        
        await validateEnvironment();
        
        const prisma = await initializeDatabase();
        
        await loadKnowledgeBase();
        
        const bot = new SuperteamBot(true);
        await bot.start();
        
        console.log('Bot started successfully! Press Ctrl+C to stop.');

        process.on('SIGINT', async () => {
            console.log('\nGracefully shutting down...');
            await bot.stop('SIGINT');
            await prisma.$disconnect();
            process.exit(0);
        });
    } catch (error) {
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
}

startBot();