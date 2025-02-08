import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    await prisma.$executeRaw`
        -- Drop existing index if any
        DROP INDEX IF EXISTS document_embedding_idx;
        
        -- Alter the vector dimension
        ALTER TABLE "Document" 
        ALTER COLUMN embedding TYPE vector(1536);
        
        -- Recreate the index
        CREATE INDEX document_embedding_idx ON "Document" 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    `;
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 