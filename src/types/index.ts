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
