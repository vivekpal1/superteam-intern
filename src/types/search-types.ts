export interface SearchResult {
    content: string;
    metadata?: Record<string, any>;
    score?: number;
} 