// src/agent/services/contentAdvisor.ts
import { ModelSelector } from "../core/llm/modelSelector.js";
import { PrismaClient } from "@prisma/client";

export class ContentAdvisor {
  private model: ModelSelector;
  private prisma: PrismaClient;

  constructor() {
    this.model = new ModelSelector(true); // Use local LLM
    this.prisma = new PrismaClient();
  }

  async improveTweet(content: string): Promise<string[]> {
    try {
      const prompt = `
            Given this tweet draft:
            "${content}"

            Provide 3 improved versions that:
            1. Maintain the core message
            2. Increase engagement potential
            3. Follow Twitter best practices
            4. Include relevant hashtags
            5. Are optimized for the Solana/Web3 audience

            Format each suggestion as a complete tweet.`;

      const response = await this.model.generateResponse(prompt);

      const suggestions = response
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => line.replace(/^\d+\.\s*/, "").trim())
        .filter((line) => line.length <= 280);

      await this.storeSuggestion(content, suggestions);

      return suggestions;
    } catch (error) {
      console.error("Error improving tweet:", error);
      throw error;
    }
  }

  async generateTwitterThread(
    topic: string,
    points: string[]
  ): Promise<string[]> {
    try {
      const prompt = `
            Create a Twitter thread about:
            "${topic}"

            Key points to cover:
            ${points.join("\n")}

            Create a thread that:
            1. Starts with a strong hook
            2. Breaks down complex ideas
            3. Uses engaging language
            4. Includes relevant hashtags
            5. Ends with a call to action

            Format as numbered tweets, each under 280 characters.`;

      const response = await this.model.generateResponse(prompt);

      const tweets = response
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => line.replace(/^\d+\.\s*/, "").trim())
        .filter((line) => line.length <= 280);

      return tweets;
    } catch (error) {
      console.error("Error generating thread:", error);
      throw error;
    }
  }

  private async storeSuggestion(original: string, suggestions: string[]) {
    await this.prisma.contentSuggestion.create({
      data: {
        content: original,
        type: "tweet",
        suggestions: suggestions as unknown as Prisma.JsonValue,
        metadata: {
          timestamp: new Date().toISOString(),
          platform: "twitter",
        } as unknown as Prisma.JsonValue,
      },
    });
  }

  async analyzeTweetPerformance(tweetId: string) {
    // tweet performance analysis
    throw new Error("Not implemented");
  }
}
