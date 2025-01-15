// src/types/index.ts
import { Prisma } from '@prisma/client';

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

// Member-related types
export interface Member {
    id: string;
    name: string;
    skills: string[];
    experience: string;
    bio: string;
    twitterHandle?: string;
    githubHandle?: string;
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
    endDate?: Date;
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
    proof?: string;
    createdAt: Date;
}

export interface Contribution {
    id: string;
    description: string;
    date: Date;
    memberId: string;
    type: string;
    url?: string;
    createdAt: Date;
}

// Log-related types
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

// Query-related types
export interface QueryMetrics {
    [key: string]: any;
    confidence: number;
    sources: string[];
    processingTime: number;
}

export interface SearchQuery {
    text: string;
    metadata?: Record<string, any>;
    threshold?: number;
    limit?: number;
}