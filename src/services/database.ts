// src/services/database.ts
import { PrismaClient } from '@prisma/client';

export class DatabaseService {
    private static instance: DatabaseService;
    private prisma: PrismaClient;

    private constructor() {
        this.prisma = new PrismaClient();
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    public async connect() {
        await this.prisma.$connect();
    }

    public getPrisma() {
        return this.prisma;
    }

    public async disconnect() {
        await this.prisma.$disconnect();
    }
}