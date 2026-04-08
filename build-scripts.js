import { copyFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

// Copy all scripts from src/assets/scripts to dist
mkdirSync('dist/assets/scripts', { recursive: true });

const scriptsDir = 'src/assets/scripts';
const files = readdirSync(scriptsDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    copyFileSync(
      join(scriptsDir, file),
      join('dist/assets/scripts', file)
    );
  }
});

console.log(`[scripts] Copied ${files.filter(f => f.endsWith('.js')).length} scripts to dist/assets/scripts/`);
