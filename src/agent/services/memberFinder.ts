// src/agent/services/memberFinder.ts
import { PrismaClient } from '@prisma/client';
import { ModelSelector } from '../core/llm/modelSelector.js';
import { VectorStore } from '../core/rag/vectorStore.js';

interface MemberSearchQuery {
    skills?: string[];
    experience?: string;
    projectType?: string;
    availability?: boolean;
    roleType?: string;
}

interface MemberMatch {
    member: any;
    matchScore: number;
    matchReason: string[];
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
            console.error('Error finding members:', error);
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
            console.error('Error parsing search query:', error);
            return {
                skills: query.toLowerCase().split(/[\s,]+/),
            };
        }
    }

    private async searchMembers(params: MemberSearchQuery) {
        const skillsFilter = params.skills ? {
            skills: {
                hasSome: params.skills
            }
        } : {};

        const experienceFilter = params.experience ? {
            experience: {
                contains: params.experience,
                mode: 'insensitive'
            }
        } : {};

        return this.prisma.member.findMany({
            where: {
                AND: [
                    skillsFilter,
                    experienceFilter,
                ]
            },
            include: {
                projects: true,
                achievements: true,
                contributions: true
            }
        });
    }

    private async rankMatches(members: any[], params: MemberSearchQuery): Promise<MemberMatch[]> {
        const weights = {
            skills: 0.4,
            experience: 0.2,
            projectMatch: 0.15,
            recentActivity: 0.15,
            communityEngagement: 0.1
        };
    
        return members.map(member => {
            let score = 0;
            const reasons: string[] = [];
    
            if (params.skills?.length) {
                const skillMatches = params.skills.filter(skill => 
                    member.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
                );
                const skillScore = (skillMatches.length / params.skills.length) * weights.skills;
                score += skillScore;
                
                if (skillMatches.length > 0) {
                    reasons.push(`Matches ${skillMatches.length} required skills: ${skillMatches.join(', ')}`);
                }
            }
    
            if (params.experience) {
                const expScore = this.calculateExperienceScore(member.experience, params.experience);
                score += expScore * weights.experience;
                if (expScore > 0.5) {
                    reasons.push(`Has relevant ${params.experience} experience`);
                }
            }
    
            if (params.projectType && member.projects.length > 0) {
                const projectScore = member.projects.reduce((acc, project) => {
                    if (project.type.toLowerCase().includes(params.projectType!.toLowerCase())) {
                        acc += 1;
                    }
                    return acc;
                }, 0) / member.projects.length;
                
                score += projectScore * weights.projectMatch;
                if (projectScore > 0) {
                    reasons.push(`Has worked on ${params.projectType} projects`);
                }
            }
    
            const recentActivityScore = this.calculateRecentActivityScore(member);
            score += recentActivityScore * weights.recentActivity;
            if (recentActivityScore > 0.5) {
                reasons.push('Recently active in the community');
            }
    
            const engagementScore = this.calculateEngagementScore(member);
            score += engagementScore * weights.communityEngagement;
            if (engagementScore > 0.7) {
                reasons.push('Highly engaged community member');
            }
    
            return {
                member,
                matchScore: score,
                matchReason: reasons
            };
        }).sort((a, b) => b.matchScore - a.matchScore);
    }
    
    private calculateExperienceScore(memberExp: string, requiredExp: string): number {
        const expLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
        const memberLevel = expLevels.findIndex(level => 
            memberExp.toLowerCase().includes(level)
        );
        const requiredLevel = expLevels.findIndex(level => 
            requiredExp.toLowerCase().includes(level)
        );
        
        if (memberLevel >= requiredLevel) return 1;
        return Math.max(0, 1 - (requiredLevel - memberLevel) * 0.3);
    }
    
    private calculateRecentActivityScore(member: any): number {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        
        const recentContributions = member.contributions.filter(c => 
            new Date(c.date) > thirtyDaysAgo
        ).length;
        
        const mediumContributions = member.contributions.filter(c => 
            new Date(c.date) > ninetyDaysAgo
        ).length;
        
        return Math.min(1, (recentContributions * 0.7 + mediumContributions * 0.3) / 10);
    }
    
    private calculateEngagementScore(member: any): number {
        const totalContributions = member.contributions.length;
        const totalProjects = member.projects.length;
        const totalAchievements = member.achievements.length;
        
        return Math.min(1, (
            (totalContributions * 0.4) + 
            (totalProjects * 0.4) + 
            (totalAchievements * 0.2)
        ) / 10);
    }

    private addMatchExplanations(matches: MemberMatch[], query: MemberSearchQuery): MemberMatch[] {
        return matches.map(match => ({
            ...match,
            matchReason: [
                ...match.matchReason,
                this.generatePersonalizedReason(match.member, query)
            ].filter(Boolean)
        }));
    }

    private generatePersonalizedReason(member: any, query: MemberSearchQuery): string {
        const reasons = [];

        if (member.achievements?.length > 0) {
            const relevantAchievement = member.achievements
                .find(a => query.skills?.some(skill => 
                    a.description.toLowerCase().includes(skill.toLowerCase())
                ));
            if (relevantAchievement) {
                reasons.push(`Has relevant achievement: ${relevantAchievement.description}`);
            }
        }

        const relevantContributions = member.contributions
            .filter(c => query.skills?.some(skill => 
                c.description.toLowerCase().includes(skill.toLowerCase())
            ))
            .length;
        if (relevantContributions > 0) {
            reasons.push(`Has ${relevantContributions} relevant contributions to the ecosystem`);
        }

        return reasons.join('. ');
    }


    async getMemberDetails(memberId: string) {
        return this.prisma.member.findUnique({
            where: { id: memberId },
            include: {
                projects: true,
                achievements: true,
                contributions: true
            }
        });
    }

    async getMembersBySkill(skill: string) {
        return this.prisma.member.findMany({
            where: {
                skills: {
                    has: skill.toLowerCase()
                }
            },
            include: {
                projects: true
            }
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

            return this.findMembers(requiredSkills.join(', '));
        } catch (error) {
            console.error('Error suggesting team members:', error);
            throw error;
        }
    }

    async updateMemberSkills(memberId: string, skills: string[]) {
        return this.prisma.member.update({
            where: { id: memberId },
            data: { skills }
        });
    }
}