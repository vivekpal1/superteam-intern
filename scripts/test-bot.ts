// scripts/test-bot.ts
import { SuperteamBot } from '../src/telegram/bot.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function testBot() {
    try {
        const bot = new SuperteamBot();
        await bot.start();
        console.log('Bot test successful');
    } catch (error) {
        console.error('Bot test failed:', error);
        process.exit(1);
    }
}

testBot();