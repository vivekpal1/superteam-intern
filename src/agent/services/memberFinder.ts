// src/agent/services/memberFinder.ts
import { Achievement, PrismaClient } from "@prisma/client";
import { ModelSelector } from "../core/llm/modelSelector.js";
import { VectorStore } from "../core/rag/vectorStore.js";
import { Member, Project, Contribution } from "../../types/index.js";

interface MemberSearchQuery {
  skills?: string[];
  experience?: string;
  projectType?: string;
  availability?: boolean;
  roleType?: string;
}

interface PrismaMember {
  id: string;
  name: string;
  skills: string[];
  experience: string;
  bio: string;
  twitterHandle: string | null;
  githubHandle: string | null;
  contact: string;
  projects: {
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
  }[];
  achievements: Achievement[];
  contributions: Contribution[];
  createdAt: Date;
  updatedAt: Date;
}

interface MemberMatch {
  member: Member;
  matchScore: number;
  matchReason: string[];
}

interface ProjectScore {
  score: number;
  reasons: string[];
}

// Helper types for explicit typing
type SkillMatchResult = {
  matches: string[];
  score: number;
};

function isPrismaMember(obj: any): obj is PrismaMember {
    return (
        obj &&
        typeof obj === 'object' &&
        'id' in obj &&
        'name' in obj &&
        Array.isArray(obj.skills) &&
        Array.isArray(obj.projects) &&
        Array.isArray(obj.achievements) &&
        Array.isArray(obj.contributions)
    );
}

export class MemberFinder {
  private prisma: PrismaClient;
  private model: ModelSelector;
  private vectorStore: VectorStore;

  constructor() {
    this.prisma = new PrismaClient();
    this.model = new ModelSelector(true);
    this.vectorStore = new VectorStore();
  }

  async findMembers(query: string): Promise<MemberMatch[]> {
    try {
      const searchParams = await this.parseSearchQuery(query);
      const members = await this.searchMembers(searchParams);
      const rankedMatches = await this.rankMatches(members, searchParams);
      return this.addMatchExplanations(rankedMatches, searchParams);
    } catch (error) {
      console.error("Error finding members:", error);
      throw error;
    }
  }

  private async parseSearchQuery(query: string): Promise<MemberSearchQuery> {
    const prompt = `
        Parse this member search query into structured data:
        "${query}"
        
        Extract:
        1. Required skills
        2. Experience level
        3. Project type (if mentioned)
        4. Role type
        
        Format as JSON.`;

    try {
      const response = await this.model.generateResponse(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error("Error parsing search query:", error);
      return {
        skills: query.toLowerCase().split(/[\s,]+/),
      };
    }
  }

  private async searchMembers(params: MemberSearchQuery) {
    // Using proper Prisma types for filtering
    const skillsFilter = params.skills?.length
      ? {
          skills: {
            hasSome: params.skills,
          },
        }
      : {};

    const experienceFilter = params.experience
      ? {
          experience: params.experience,
        }
      : {};

    return this.prisma.member.findMany({
      where: {
        AND: [skillsFilter, experienceFilter],
      },
      include: {
        projects: true,
        achievements: true,
        contributions: true,
      },
    });
  }

  private async rankMatches(
    members: PrismaMember[],
    params: MemberSearchQuery
): Promise<MemberMatch[]> {
    const weights = {
        skills: 0.4,
        experience: 0.2,
        projectMatch: 0.15,
        recentActivity: 0.15,
        communityEngagement: 0.1,
    };

    const convertToMember = (prismaMember: PrismaMember): Member => ({
        ...prismaMember,
        twitterHandle: prismaMember.twitterHandle,
        githubHandle: prismaMember.githubHandle,
        projects: prismaMember.projects.map(p => ({
            ...p,
            endDate: p.endDate
        })),
        achievements: prismaMember.achievements.map(a => ({
            ...a,
            proof: a.proof
        })),
        contributions: prismaMember.contributions.map(c => ({
            ...c,
            url: c.url
        }))
    });


    return members
        .filter(isPrismaMember)
        .map((member) => {
            let score = 0;
            const reasons: string[] = [];
            const convertedMember = convertToMember(member);

        if (params.skills?.length) {
          const skillMatch = this.calculateSkillMatch(
            member.skills,
            params.skills
          );
          score += skillMatch.score * weights.skills;

          if (skillMatch.matches.length > 0) {
            reasons.push(
              `Matches ${skillMatch.matches.length} required skills: ${skillMatch.matches.join(", ")}`
            );
          }
        }

        if (params.experience) {
          const expScore = this.calculateExperienceScore(
            member.experience,
            params.experience
          );
          score += expScore * weights.experience;
          if (expScore > 0.5) {
            reasons.push(`Has relevant ${params.experience} experience`);
          }
        }

        const projectScore = this.calculateProjectScore(
          member.projects,
          params.projectType
        );
        score += projectScore.score * weights.projectMatch;
        if (projectScore.score > 0) {
          reasons.push(...projectScore.reasons);
        }

        const recentActivityScore = this.calculateRecentActivityScore(
          member.contributions
        );
        score += recentActivityScore * weights.recentActivity;
        if (recentActivityScore > 0.5) {
          reasons.push("Recently active in the community");
        }

        const engagementScore = this.calculateEngagementScore(member);
        score += engagementScore * weights.communityEngagement;
        if (engagementScore > 0.7) {
          reasons.push("Highly engaged community member");
        }

        return {
            member: convertedMember,
            matchScore: score,
            matchReason: reasons,
        };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

  private calculateSkillMatch(
    memberSkills: string[],
    requiredSkills: string[]
  ): SkillMatchResult {
    const matches = requiredSkills.filter((skill) =>
      memberSkills.some((s: string) =>
        s.toLowerCase().includes(skill.toLowerCase())
      )
    );

    return {
      matches,
      score: matches.length / requiredSkills.length,
    };
  }

  private calculateExperienceScore(
    memberExp: string,
    requiredExp: string
  ): number {
    const expLevels = ["beginner", "intermediate", "advanced", "expert"];
    const memberLevel = expLevels.findIndex((level) =>
      memberExp.toLowerCase().includes(level)
    );
    const requiredLevel = expLevels.findIndex((level) =>
      requiredExp.toLowerCase().includes(level)
    );

    if (memberLevel >= requiredLevel) return 1;
    return Math.max(0, 1 - (requiredLevel - memberLevel) * 0.3);
  }

  private calculateProjectScore(
    projects: Project[],
    projectType?: string
  ): ProjectScore {
    if (!projectType || !projects.length) {
      return { score: 0, reasons: [] };
    }

    const matchingProjects = projects.filter((project) =>
      project.type.toLowerCase().includes(projectType.toLowerCase())
    );

    return {
      score: matchingProjects.length / projects.length,
      reasons:
        matchingProjects.length > 0
          ? [`Has worked on ${matchingProjects.length} ${projectType} projects`]
          : [],
    };
  }

  private calculateRecentActivityScore(contributions: Contribution[]): number {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const recentContributions = contributions.filter(
      (c) => new Date(c.date) > thirtyDaysAgo
    ).length;

    const mediumContributions = contributions.filter(
      (c) => new Date(c.date) > ninetyDaysAgo
    ).length;

    return Math.min(
      1,
      (recentContributions * 0.7 + mediumContributions * 0.3) / 10
    );
  }

  private calculateEngagementScore(member: Member): number {
    const totalContributions = member.contributions.length;
    const totalProjects = member.projects.length;
    const totalAchievements = member.achievements.length;

    return Math.min(
      1,
      (totalContributions * 0.4 +
        totalProjects * 0.4 +
        totalAchievements * 0.2) /
        10
    );
  }

  private addMatchExplanations(
    matches: MemberMatch[],
    query: MemberSearchQuery
  ): MemberMatch[] {
    return matches.map((match) => ({
      ...match,
      matchReason: [
        ...match.matchReason,
        this.generatePersonalizedReason(match.member, query),
      ].filter(Boolean),
    }));
  }

  private generatePersonalizedReason(
    member: any,
    query: MemberSearchQuery
  ): string {
    const reasons = [];

    if (member.achievements?.length > 0) {
      const relevantAchievement = member.achievements.find((a: Achievement) =>
        query.skills?.some((skill: string) =>
          a.description.toLowerCase().includes(skill.toLowerCase())
        )
      );
      if (relevantAchievement) {
        reasons.push(
          `Has relevant achievement: ${relevantAchievement.description}`
        );
      }
    }

    const relevantContributions = member.contributions.filter(
      (c: Contribution) =>
        query.skills?.some((skill: string) =>
          c.description.toLowerCase().includes(skill.toLowerCase())
        )
    ).length;
    if (relevantContributions > 0) {
      reasons.push(
        `Has ${relevantContributions} relevant contributions to the ecosystem`
      );
    }

    return reasons.join(". ");
  }

  async getMemberDetails(memberId: string) {
    return this.prisma.member.findUnique({
      where: { id: memberId },
      include: {
        projects: true,
        achievements: true,
        contributions: true,
      },
    });
  }

  async getMembersBySkill(skill: string) {
    return this.prisma.member.findMany({
      where: {
        skills: {
          has: skill.toLowerCase(),
        },
      },
      include: {
        projects: true,
      },
    });
  }

  async suggestTeamMembers(projectDescription: string): Promise<MemberMatch[]> {
    const prompt = `
        Extract key technical skills and roles needed for this project:
        "${projectDescription}"
        
        List them as JSON array of strings.`;

    try {
      const skillsResponse = await this.model.generateResponse(prompt);
      const requiredSkills = JSON.parse(skillsResponse);

      return this.findMembers(requiredSkills.join(", "));
    } catch (error) {
      console.error("Error suggesting team members:", error);
      throw error;
    }
  }

  async updateMemberSkills(memberId: string, skills: string[]) {
    return this.prisma.member.update({
      where: { id: memberId },
      data: { skills },
    });
  }
}
