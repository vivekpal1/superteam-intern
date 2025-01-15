// src/agent/services/twitterService.ts
import { TwitterApi } from 'twitter-api-v2';
import { config } from '../../config/index.js';

export class TwitterService {
    private client: TwitterApi;
    private username: string = 'SuperteamVNintern';

    constructor() {
        this.client = new TwitterApi({
            appKey: config.TWITTER_API_KEY,
            appSecret: config.TWITTER_API_SECRET,
            accessToken: config.TWITTER_ACCESS_TOKEN,
            accessSecret: config.TWITTER_ACCESS_SECRET,
        });
    }

    async tweet(content: string): Promise<string> {
        try {
            const tweet = await this.client.v2.tweet(content);
            console.log('Posted tweet:', tweet.data.id);
            return tweet.data.id;
        } catch (error) {
            console.error('Error posting tweet:', error);
            throw error;
        }
    }

    async reply(tweetId: string, content: string): Promise<string> {
        try {
            const reply = await this.client.v2.reply(content, tweetId);
            return reply.data.id;
        } catch (error) {
            console.error('Error posting reply:', error);
            throw error;
        }
    }

    async followUser(username: string): Promise<void> {
        try {
            const user = await this.client.v2.userByUsername(username);
            await this.client.v2.follow(user.data.id, user.data.id);
        } catch (error) {
            console.error('Error following user:', error);
            throw error;
        }
    }

    async getLatestTweets(query: string, count: number = 10) {
        try {
            const tweets = await this.client.v2.search(query, {
                max_results: count,
                'tweet.fields': ['created_at', 'public_metrics'],
            });
            return tweets.data;
        } catch (error) {
            console.error('Error fetching tweets:', error);
            throw error;
        }
    }
}