import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function cleanDatabase() {
    try {
        console.log('Cleaning database...');
        
        const commands = [
            'sudo -u postgres psql -c "DROP DATABASE IF EXISTS superteam_mai;"',
            'sudo -u postgres psql -c "CREATE DATABASE superteam_mai;"',
            'sudo -u postgres psql -d superteam_mai -c "CREATE EXTENSION IF NOT EXISTS vector;"'
        ];

        for (const command of commands) {
            console.log(`Executing: ${command}`);
            const { stdout, stderr } = await execAsync(command);
            if (stdout) console.log(stdout);
            if (stderr) console.error(stderr);
        }

        console.log('Database cleaned successfully');
    } catch (error) {
        console.error('Error cleaning database:', error);
        process.exit(1);
    }
}

cleanDatabase();