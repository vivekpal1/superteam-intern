// src/config/index.ts
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    // Basic Bot
    TELEGRAM_BOT_TOKEN: z.string().min(1, "Telegram bot token is required"),
    DATABASE_URL: z.string().min(1, "Database URL is required"),
    
    // OpenAI
    OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
    
    // Twitter
    TWITTER_API_KEY: z.string().min(1, "Twitter API key is required"),
    TWITTER_API_SECRET: z.string().min(1, "Twitter API secret is required"),
    TWITTER_ACCESS_TOKEN: z.string().min(1, "Twitter access token is required"),
    TWITTER_ACCESS_SECRET: z.string().min(1, "Twitter access secret is required"),
    
    // Crossmint
    CROSSMINT_API_KEY: z.string().min(1, "Crossmint API key is required"),
    CROSSMINT_PROJECT_ID: z.string().min(1, "Crossmint project ID is required"),
    
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

function validateEnv() {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        console.error('Invalid environment variables:', error);
        process.exit(1);
    }
}

export const config = validateEnv();