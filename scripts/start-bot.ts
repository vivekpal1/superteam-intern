// scripts/start-bot.ts
import { SuperteamBot } from '../src/telegram/bot.js';
import dotenv from 'dotenv';

dotenv.config();

async function startBot() {
    try {
        const bot = new SuperteamBot();
        await bot.start();
        console.log('Bot started successfully');
    } catch (error) {
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
}

startBot();