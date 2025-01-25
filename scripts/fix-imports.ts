// scripts/fix-imports.ts
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

const files = glob.sync('src/**/*.ts');

files.forEach(file => {
    let content = readFileSync(file, 'utf-8');
    
    content = content.replace(
        /from ['"]([\.\/]+[^'"]+)['"]/g,
        (match, importPath) => {
            if (!importPath.endsWith('.js')) {
                return `from '${importPath}.js'`;
            }
            return match;
        }
    );
    
    writeFileSync(file, content);
});