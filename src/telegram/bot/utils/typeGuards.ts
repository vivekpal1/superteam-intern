// src/telegram/bot/utils/typeGuards.ts
import { Services } from '../types/services.js';

export function assertServices(services: any): asserts services is Services {
    if (!services) throw new Error('Services not initialized');
    if (!services.prisma) throw new Error('Prisma not initialized');
    if (!services.llm) throw new Error('LLM not initialized');
    if (!services.knowledgeHandler) throw new Error('KnowledgeHandler not initialized');
    if (!services.stateManager) throw new Error('StateManager not initialized');
    if (!services.tweetManager) throw new Error('TweetManager not initialized');
    if (!services.contentAdvisor) throw new Error('ContentAdvisor not initialized');
    if (!services.memberFinder) throw new Error('MemberFinder not initialized');
    if (!services.twitterService) throw new Error('TwitterService not initialized');
    if (!services.walletService) throw new Error('WalletService not initialized');
}