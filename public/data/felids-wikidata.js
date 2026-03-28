import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fetchWikidataImages(wikidataIds) {
  const sparqlQuery = `
    SELECT ?item ?image WHERE {
      VALUES ?item { ${wikidataIds.map(id => `wd:${id}`).join(' ')} }
      OPTIONAL { ?item wdt:P18 ?image }
    }
  `;

  const url = 'https://query.wikidata.org/sparql?query=' +
    encodeURIComponent(sparqlQuery) + '&format=json';

  try {
    console.log('[felids] Fetching images from Wikidata...');

    // Use Node.js native fetch (available in Node 18+)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Meowrawr/1.0 (Educational Project)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('[felids] Wikidata query failed:', response.status);
      return {};
    }

    const data = await response.json();
    const images = {};

    data.results.bindings.forEach(binding => {
      const wikidataId = binding.item.value.split('/').pop();
      if (binding.image) {
        images[wikidataId] = binding.image.value;
      }
    });

    console.log(`[felids] Successfully fetched ${Object.keys(images).length} images from Wikidata`);
    return images;
  } catch (error) {
    console.warn('[felids] Error fetching Wikidata images:', error.message);
    return {};
  }
}

export default async function () {
  const baseSpecies = JSON.parse(
    readFileSync(join(__dirname, 'felids-base.json'), 'utf-8')
  );

  console.log(`[felids] Loaded ${baseSpecies.length} felid species from base data`);

  // Fetch images from Wikidata
  const wikidataIds = baseSpecies
    .map(species => species.wikidataId)
    .filter(Boolean);

  if (wikidataIds.length > 0) {
    console.log(`[felids] Fetching images for ${wikidataIds.length} species from Wikidata...`);
    const images = await fetchWikidataImages(wikidataIds);

    // Enrich species with images
    baseSpecies.forEach(species => {
      if (species.wikidataId && images[species.wikidataId]) {
        species.image = images[species.wikidataId];
      }
    });

    console.log(`[felids] Added ${Object.keys(images).length} images from Wikidata`);
  }

  return baseSpecies;
}
