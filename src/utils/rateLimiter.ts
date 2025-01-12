// src/utils/rateLimiter.ts
export class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private readonly windowMs: number;
    private readonly max: number;
  
    constructor(windowMs = 60000, max = 20) {
      this.windowMs = windowMs;
      this.max = max;
    }
  
    async checkLimit(userId: string): Promise<boolean> {
      const now = Date.now();
      const userRequests = this.requests.get(userId) || [];
      
      const validRequests = userRequests.filter(
        timestamp => now - timestamp < this.windowMs
      );
      
      if (validRequests.length >= this.max) {
        return false;
      }
      
      validRequests.push(now);
      this.requests.set(userId, validRequests);
      return true;
    }
  }