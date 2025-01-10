// src/__tests__/setup.ts
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        conversation: {
            create: jest.fn().mockResolvedValue({}),
        },
    }))
}));