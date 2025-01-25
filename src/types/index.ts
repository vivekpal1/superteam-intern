// src/types/index.ts
import { Prisma, PrismaClient } from '@prisma/client'

export { Prisma }


// Core document types
export interface Document {
    id: string;
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
    similarity?: number;
    type?: string;
    status?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Member {
    id: string;
    name: string;
    skills: string[];
    experience: string;
    bio: string;
    twitterHandle: string | null;
    githubHandle: string | null;
    contact: string;
    projects: Project[];
    achievements: Achievement[];
    contributions: Contribution[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Project {
    id: string;
    name: string;
    type: string;
    description: string;
    skills: string[];
    memberId: string;
    startDate: Date;
    endDate: Date | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    date: Date;
    memberId: string;
    type: string;
    proof: string | null;
    createdAt: Date;
}

export interface Contribution {
    id: string;
    description: string;
    date: Date;
    memberId: string;
    type: string;
    url: string | null;
    createdAt: Date;
}

export interface MemberMatch {
    member: Member;
    matchScore: number;
    matchReason: string[];
}

export interface ErrorLogInput {
    type: string;
    error: string;
    userId?: string;
    metadata?: Prisma.JsonValue;
}

export interface ActivityLogInput {
    type: string;
    userId: string;
    metadata?: Prisma.JsonValue;
}

export interface QueryMetrics {
    confidence: number;
    sources: string[];
    processingTime: number;
    [key: string]: any;
}

export interface SearchQuery {
    text: string;
    metadata?: Record<string, any>;
    threshold?: number;
    limit?: number;
}

export function isPrismaMember(obj: any): obj is Member {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'name' in obj &&
        Array.isArray(obj.skills)
    );
}

export * from '../agent/services/types.js';
