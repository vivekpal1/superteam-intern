// src/types/index.ts
export interface Document {
    id: string;
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Member {
    id: string;
    name: string;
    skills: string[];
    experience: string;
    projects: Project[];
    achievements: Achievement[];
    contributions: Contribution[];
    contact: string;
    twitterHandle?: string;
    githubHandle?: string;
  }