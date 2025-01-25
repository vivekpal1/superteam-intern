import { PrismaClient } from '@prisma/client';

async function setupDatabase() {
    const prisma = new PrismaClient();
    
    try {
        console.log('Starting database setup...');

        // Test database connection
        await prisma.$queryRaw`SELECT 1`;
        console.log('✓ Database connection successful');

        // Ensure vector extension exists
        await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
        console.log('✓ Vector extension enabled');

        // Verify vector extension
        const extensions = await prisma.$queryRaw`SELECT * FROM pg_extension WHERE extname = 'vector'`;
        console.log('✓ Vector extension status:', extensions);

        // Create vector index if needed
        await prisma.$executeRaw`
        DO $$ 
        BEGIN
            IF EXISTS (
                SELECT FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename = 'Document'
            ) AND NOT EXISTS (
                SELECT 1 
                FROM pg_class c 
                JOIN pg_namespace n ON n.oid = c.relnamespace 
                WHERE c.relname = 'document_embedding_idx'
            ) THEN
                CREATE INDEX document_embedding_idx 
                ON "Document" 
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64);
                RAISE NOTICE 'Created vector index';
            END IF;
        END $$;
        `;
        
        console.log('✓ Database setup completed successfully');
    } catch (error) {
        console.error('❌ Error during database setup:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the setup
setupDatabase()
    .catch((error) => {
        console.error('Failed to set up database:', error);
        process.exit(1);
    })
    .then(() => {
        console.log('Setup completed successfully');
        process.exit(0);
    });