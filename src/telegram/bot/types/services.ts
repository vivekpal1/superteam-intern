// src/telegram/bot/types/services.ts
import { PrismaClient } from '@prisma/client';
import { CloudLLM } from '../../../agent/core/llm/cloudLLM.js';
import { KnowledgeHandler } from '../../handlers/knowledgeHandler.js';
import { TweetManager } from '../../../agent/services/tweetManager.js';
import { ContentAdvisor } from '../../../agent/services/contentAdvisor.js';
import { MemberFinder } from '../../../agent/services/memberFinder.js';
import { TwitterService } from '../../../agent/services/twitterService.js';
import { WalletService } from '../../../agent/services/walletService.js';
import { ModelSelector } from '../../../agent/core/llm/modelSelector.js';

export interface StateManager {
    getUserState: (userId: number) => Promise<any>;
    setUserState: (userId: number, state: any) => Promise<void>;
    getActiveUserCount: () => number;
}

export interface Services {
    prisma: PrismaClient;
    llm: CloudLLM;
    knowledgeHandler: KnowledgeHandler;
    stateManager: StateManager;
    tweetManager: TweetManager;
    contentAdvisor: ContentAdvisor;
    memberFinder: MemberFinder;
    twitterService: TwitterService;
    walletService: WalletService;
    modelSelector: ModelSelector;
}