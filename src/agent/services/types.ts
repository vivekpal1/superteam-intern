// src/agent/services/types.ts
import { Member } from '../../types/index.js';

export interface MatchResult {
    member: Member;
    matchScore: number;
    matchReason: string[];
}

export interface SearchQuery {
    skills?: string[];
    experience?: string;
    projectType?: string;
    availability?: boolean;
    roleType?: string;
}

export interface ProjectScore {
    score: number;
    reasons: string[];
}

export interface SkillMatch {
    matches: string[];
    score: number;
}

export interface TweetDraft {
    content: string;
    userId: string;
    suggestions?: string[];
}

export interface TweetResult {
    success: boolean;
    error?: string;
    tweetUrl?: string;
}

export interface WalletBalance {
    token: string;
    amount: string;
}

export interface TransferResult {
    success: boolean;
    error?: string;
    transactionId?: string;
}