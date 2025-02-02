// src/agent/services/tweetManager.ts
import { TwitterApi } from "twitter-api-v2";
import { Prisma, PrismaClient } from "@prisma/client";
import { config } from "../../config/index.js";

interface TweetDraft {
  content: string;
  userId: string;
  suggestions?: string[];
}

interface TweetResult {
  success: boolean;
  error?: string;
  data?: any;
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
        throw new Error("Invalid tweet content");
      }

      // Create draft in database
      const draft = await this.prisma.tweet.create({
        data: {
          content: data.content,
          authorId: data.userId,
          status: "draft",
          metadata: {
            suggestions: data.suggestions || [],
            version: 1,
            originalContent: data.content,
          },
        },
      });

      return draft;
    } catch (error) {
      console.error("Error creating tweet draft:", error);
      throw error;
    }
  }

  // src/agent/services/tweetManager.ts
  async approveDraft(
    tweetId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const tweet = await this.prisma.tweet.findUnique({
        where: { id: tweetId },
      });

      if (!tweet) {
        return { success: false, error: "Tweet not found" };
      }

      const twitterResult = await this.twitter.v2.tweet(tweet.content);

      const metadata =
        typeof tweet.metadata === "string"
          ? JSON.parse(tweet.metadata)
          : tweet.metadata;

      await this.prisma.tweet.update({
        where: { id: tweetId },
        data: {
          status: "posted",
          postedAt: new Date(),
          metadata: JSON.stringify({
            ...metadata,
            twitterId: twitterResult.data.id,
          }) as unknown as Prisma.InputJsonValue,
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Error approving tweet:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async scheduleTweet(tweetId: string, scheduledFor: Date) {
    try {
      const tweet = await this.prisma.tweet.update({
        where: { id: tweetId },
        data: {
          status: "scheduled",
          scheduledFor,
        },
      });

      return tweet;
    } catch (error) {
      console.error("Error scheduling tweet:", error);
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
      where: { status: "draft" },
      orderBy: { createdAt: "desc" },
    });
  }

  async getScheduledTweets() {
    return this.prisma.tweet.findMany({
      where: { status: "scheduled" },
      orderBy: { scheduledFor: "asc" },
    });
  }
}
