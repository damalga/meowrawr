import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import resolveWikidataIds from './felids-wikidata.js';
import enrichWithWikipedia, { enrichWithEnFallback } from './felids-wikipedia.js';
import enrichWithINaturalist from './felids-inaturalist.js';
import enrichWithINaturalistPics from './felids-inaturalist-pics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function getFelids() {
  const species = JSON.parse(
    readFileSync(join(__dirname, 'felids-base.json'), 'utf-8')
  );
  console.log(`[felids] Loaded ${species.length} felid species from base data`);

  await resolveWikidataIds(species);
  await enrichWithWikipedia(species);
  await enrichWithINaturalist(species);
  await enrichWithINaturalistPics(species);
  await enrichWithEnFallback(species);

  // Drop intermediate fields used only as fallback raw material.
  species.forEach(s => {
    delete s._inatWikipediaURL;
  });

  return species;
}
