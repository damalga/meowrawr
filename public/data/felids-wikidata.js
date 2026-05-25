import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fetchWikidataByScientificNames(scientificNames) {
  const values = scientificNames.map(name => `"${name}"`).join(' ');

  const sparqlQuery = `
    SELECT ?item ?scientificName WHERE {
      VALUES ?scientificName { ${values} }
      ?item wdt:P225 ?scientificName .
      ?item wdt:P105 ?taxonRank .
    }
  `;

  const url = 'https://query.wikidata.org/sparql?query=' +
    encodeURIComponent(sparqlQuery) + '&format=json';

  try {
    console.log('[felids] Fetching species data from Wikidata...');

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
    const results = {};

    data.results.bindings.forEach(binding => {
      const scientificName = binding.scientificName.value;
      const wikidataId = binding.item.value.split('/').pop();
      if (!results[scientificName]) {
        results[scientificName] = { wikidataId };
      }
    });

    console.log(`[felids] Successfully fetched ${Object.keys(results).length} species from Wikidata`);
    return results;
  } catch (error) {
    console.warn('[felids] Error fetching Wikidata data:', error.message);
    return {};
  }
}

export default async function () {
  const baseSpecies = JSON.parse(
    readFileSync(join(__dirname, 'felids-base.json'), 'utf-8')
  );

  console.log(`[felids] Loaded ${baseSpecies.length} felid species from base data`);

  const scientificNames = baseSpecies.map(species => species.scientificName);

  const wikidataResults = await fetchWikidataByScientificNames(scientificNames);

  baseSpecies.forEach(species => {
    const result = wikidataResults[species.scientificName];
    if (result) {
      species.wikidataId = result.wikidataId;
      species.wikidataURI = `https://www.wikidata.org/wiki/${result.wikidataId}`;
    }
  });

  return baseSpecies;
}
