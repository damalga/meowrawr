import { copyFileSync, mkdirSync } from 'fs';

// Copy scripts to dist
mkdirSync('dist/assets/scripts', { recursive: true });
copyFileSync('src/assets/scripts/slider.js', 'dist/assets/scripts/slider.js');
copyFileSync('src/assets/scripts/hero.js', 'dist/assets/scripts/hero.js');

console.log('[scripts] Scripts copied to dist/assets/scripts/');
