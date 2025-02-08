// src/telegram/bot/services/initializeServices.ts
import { PrismaClient } from '@prisma/client';
import { CloudLLM } from '../../../agent/core/llm/cloudLLM.js';
import { ModelSelector } from '../../../agent/core/llm/modelSelector.js';
import { KnowledgeHandler } from '../../handlers/knowledgeHandler.js';
import { Services } from '../types/services.js';
import { TweetManager } from '../../../agent/services/tweetManager.js';
import { ContentAdvisor } from '../../../agent/services/contentAdvisor.js';
import { MemberFinder } from '../../../agent/services/memberFinder.js';
import { TwitterService } from '../../../agent/services/twitterService.js';
import { WalletService } from '../../../agent/services/walletService.js';
import { StateManagerImpl } from './stateManager.js';

export async function initializeServices(): Promise<Services> {
    const prisma = new PrismaClient();
    const llm = new CloudLLM();
    const modelSelector = new ModelSelector(true);
    const stateManager = new StateManagerImpl();
    
    await prisma.$connect();
    await modelSelector.initialize();

    const knowledgeHandler = new KnowledgeHandler();
    const tweetManager = new TweetManager();
    const contentAdvisor = new ContentAdvisor();
    const memberFinder = new MemberFinder();
    const twitterService = new TwitterService();
    const walletService = new WalletService();

    return {
        prisma,
        llm,
        modelSelector,
        knowledgeHandler,
        stateManager,
        tweetManager,
        contentAdvisor,
        memberFinder,
        twitterService,
        walletService
    };
}