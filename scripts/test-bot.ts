// scripts/test-bot.ts
import { SuperteamBot } from '../src/telegram/bot/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testBot() {
    try {
        console.log('Starting bot in test mode...');
        
        const bot = new SuperteamBot({
            TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
            debugMode: true,
            adminIds: new Set([]),
            handlerTimeout: 90000
        }, await initializeServices());
        
        const tests = [
            {
                name: 'Bot Info',
                test: async () => {
                    const info = await bot.botInfo;
                    console.log('Bot info:', info);
                    return !!info;
                }
            },
            {
                name: 'Knowledge Base',
                test: async () => {
                    // knowledge base test here
                    return true;
                }
            }
        ];

        for (const test of tests) {
            console.log(`Running test: ${test.name}`);
            try {
                const passed = await test.test();
                console.log(`✅ ${test.name}: ${passed ? 'PASSED' : 'FAILED'}`);
            } catch (error) {
                console.error(`❌ ${test.name}: ERROR -`, error);
            }
        }

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testBot();

function initializeServices(): import("../src/telegram/bot/types/services.js").Services | PromiseLike<import("../src/telegram/bot/types/services.js").Services> {
    throw new Error('Function not implemented.');
}
