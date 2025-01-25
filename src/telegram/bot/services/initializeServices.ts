// src/telegram/bot/services/initializeServices.ts
import { PrismaClient } from '@prisma/client';
import { Services, StateManager } from '../types/services.js';
import { CloudLLM } from '../../../agent/core/llm/cloudLLM.js';
import { KnowledgeHandler } from '../../handlers/knowledgeHandler.js';
import { TweetManager } from '../../../agent/services/tweetManager.js';
import { ContentAdvisor } from '../../../agent/services/contentAdvisor.js';
import { MemberFinder } from '../../../agent/services/memberFinder.js';
import { TwitterService } from '../../../agent/services/twitterService.js';
import { WalletService } from '../../../agent/services/walletService.js';

class StateManagerImpl implements StateManager {
    private activeUsers = new Set<number>();
    private userStates = new Map<number, any>();

    async getUserState(userId: number): Promise<any> {
        return this.userStates.get(userId) || { state: 'idle' };
    }

    async setUserState(userId: number, state: any): Promise<void> {
        this.userStates.set(userId, {
            ...state,
            lastActivity: Date.now()
        });
        this.activeUsers.add(userId);
    }

    getActiveUserCount(): number {
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        this.activeUsers.forEach(userId => {
            const state = this.userStates.get(userId);
            if (state?.lastActivity < thirtyMinutesAgo) {
                this.activeUsers.delete(userId);
                this.userStates.delete(userId);
            }
        });
        return this.activeUsers.size;
    }
}

export async function initializeServices(): Promise<Services> {
    const prisma = new PrismaClient();
    const llm = new CloudLLM();
    const stateManager = new StateManagerImpl();
    
    try {
        await prisma.$connect();
        console.log('Database connection established');

        await llm.testConnection();
        console.log('LLM connection verified');

        const knowledgeHandler = new KnowledgeHandler();
        const tweetManager = new TweetManager();
        const contentAdvisor = new ContentAdvisor();
        const memberFinder = new MemberFinder();
        const twitterService = new TwitterService();
        const walletService = new WalletService();

        return {
            prisma,
            llm,
            knowledgeHandler,
            stateManager,
            tweetManager,
            contentAdvisor,
            memberFinder,
            twitterService,
            walletService
        };
    } catch (error) {
        await prisma.$disconnect();
        console.error('Service initialization failed:', error);
        throw error;
    }
}