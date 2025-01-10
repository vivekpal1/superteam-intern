// src/agent/services/tweetManager.ts
import { TwitterApi } from 'twitter-api-v2';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config/index.js';

interface TweetDraft {
    content: string;
    userId: string;
    suggestions?: string[];
}

export class TweetManager {
    private twitter: TwitterApi;
    private prisma: PrismaClient;

    constructor() {
        this.twitter = new TwitterApi({
            appKey: config.TWITTER_API_KEY,
            appSecret: config.TWITTER_API_SECRET,
            accessToken: config.TWITTER_ACCESS_TOKEN,
            accessSecret: config.TWITTER_ACCESS_SECRET,
        });
        this.prisma = new PrismaClient();
    }

    async createDraft(data: TweetDraft) {
        try {
            // Validate tweet content
            if (!this.isValidTweet(data.content)) {
                throw new Error('Invalid tweet content');
            }

            // Create draft in database
            const draft = await this.prisma.tweet.create({
                data: {
                    content: data.content,
                    authorId: data.userId,
                    status: 'draft',
                    metadata: {
                        suggestions: data.suggestions || [],
                        version: 1,
                        originalContent: data.content
                    }
                }
            });

            return draft;
        } catch (error) {
            console.error('Error creating tweet draft:', error);
            throw error;
        }
    }

    async approveDraft(tweetId: string) {
        try {
            const tweet = await this.prisma.tweet.findUnique({
                where: { id: tweetId }
            });

            if (!tweet) {
                throw new Error('Tweet not found');
            }

            if (tweet.status !== 'draft') {
                throw new Error('Tweet is not in draft status');
            }

            // Post to Twitter
            const result = await this.twitter.v2.tweet(tweet.content);

            // Update database
            await this.prisma.tweet.update({
                where: { id: tweetId },
                data: {
                    status: 'posted',
                    postedAt: new Date(),
                    metadata: {
                        ...tweet.metadata,
                        twitterId: result.data.id
                    }
                }
            });

            return result;
        } catch (error) {
            console.error('Error approving tweet:', error);
            throw error;
        }
    }

    async scheduleTweet(tweetId: string, scheduledFor: Date) {
        try {
            const tweet = await this.prisma.tweet.update({
                where: { id: tweetId },
                data: {
                    status: 'scheduled',
                    scheduledFor
                }
            });

            return tweet;
        } catch (error) {
            console.error('Error scheduling tweet:', error);
            throw error;
        }
    }

    private isValidTweet(content: string): boolean {
        if (!content || content.length === 0) return false;
        if (content.length > 280) return false;
        return true;
    }

    async getTweetDrafts() {
        return this.prisma.tweet.findMany({
            where: { status: 'draft' },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getScheduledTweets() {
        return this.prisma.tweet.findMany({
            where: { status: 'scheduled' },
            orderBy: { scheduledFor: 'asc' }
        });
    }
}