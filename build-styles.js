import * as sass from 'sass';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const result = sass.compile('src/assets/styles/styles.scss');

const outputPath = 'dist/assets/styles/index.css';
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, result.css);

console.log('[styles] CSS compiled to dist/assets/styles/index.css');
