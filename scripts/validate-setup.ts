// scripts/validate-setup.ts
import { PrismaClient } from '@prisma/client';
import { LocalLLM } from '../src/agent/core/llm/localLLM.js';
import { CloudLLM } from '../src/agent/core/llm/cloudLLM.js';
import { config } from '../src/config/index.js';

async function validateSetup() {
  console.log('Validating setup...');
  
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }

  const localLLM = new LocalLLM();
  const cloudLLM = new CloudLLM();
  
  try {
    await localLLM.initialize();
    console.log('✅ Local LLM initialized');
  } catch (error) {
    console.error('❌ Local LLM initialization failed:', error);
  }
}

validateSetup();