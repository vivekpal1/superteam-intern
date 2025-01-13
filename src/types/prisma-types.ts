// src/types/prisma-types.ts
import { Prisma } from '@prisma/client';

export type { Prisma }



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

export type Contribution = Prisma.ContributionGetPayload<{}>
export type Achievement = Prisma.AchievementGetPayload<{}>

export type ContentSuggestionInput = {
  content: string;
  type: string;
  metadata?: Prisma.JsonValue;
};

export type ActivityLogInput = {
  type: string;
  metadata?: Prisma.JsonValue;
};

export type ErrorLogInput = {
  type: string;
  error: string;
  metadata?: Prisma.JsonValue;
};