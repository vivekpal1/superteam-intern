// src/types/prisma.ts
import { Prisma } from '@prisma/client'

// Re-export types from Prisma
export type Member = Prisma.MemberGetPayload<{
  include: {
    projects: true,
    achievements: true,
    contributions: true
  }
}>

export type Project = Prisma.ProjectGetPayload<{}>
export type Contribution = Prisma.ContributionGetPayload<{}>
export type Achievement = Prisma.AchievementGetPayload<{}>