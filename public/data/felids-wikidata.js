import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fetchWikidataByScientificNames(scientificNames) {
  // Build SPARQL query to find Wikidata IDs and main image only
  const values = scientificNames.map(name => `"${name}"`).join(' ');

  const sparqlQuery = `
    SELECT ?item ?scientificName ?image ?wikipediaES ?wikipediaEN WHERE {
      VALUES ?scientificName { ${values} }
      ?item wdt:P225 ?scientificName .
      ?item wdt:P105 ?taxonRank .

      # Get main image only
      OPTIONAL { ?item wdt:P18 ?image }

      # Get Wikipedia articles
      OPTIONAL {
        ?wikipediaES schema:about ?item ;
                     schema:isPartOf <https://es.wikipedia.org/> .
      }
      OPTIONAL {
        ?wikipediaEN schema:about ?item ;
                     schema:isPartOf <https://en.wikipedia.org/> .
      }
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

    // Obtenemos IDs, imagen principal y enlaces a Wikipedia
    data.results.bindings.forEach(binding => {
      const scientificName = binding.scientificName.value;
      const wikidataId = binding.item.value.split('/').pop();
      const image = binding.image?.value;
      const wikipediaES = binding.wikipediaES?.value;
      const wikipediaEN = binding.wikipediaEN?.value;

      if (!results[scientificName]) {
        results[scientificName] = {
          wikidataId,
          image: null,
          wikipedia: {}
        };
      }

      // Solo guardamos la primera imagen encontrada
      if (image && !results[scientificName].image) {
        results[scientificName].image = image;
      }

      if (wikipediaES) {
        results[scientificName].wikipedia.es = wikipediaES;
      }

      if (wikipediaEN) {
        results[scientificName].wikipedia.en = wikipediaEN;
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

  // Get all scientific names
  const scientificNames = baseSpecies.map(species => species.scientificName);

  // Fetch Wikidata IDs and images by scientific name
  const wikidataResults = await fetchWikidataByScientificNames(scientificNames);

  // Enrich species with Wikidata IDs, image and Wikipedia links
  let enrichedCount = 0;
  baseSpecies.forEach(species => {
    const result = wikidataResults[species.scientificName];
    if (result) {
      species.wikidataId = result.wikidataId;
      species.wikidataURI = `https://www.wikidata.org/wiki/${result.wikidataId}`;
      species.wikipedia = result.wikipedia || {};

      // Asignar la imagen principal si existe
      if (result.image) {
        species.image = result.image;
        enrichedCount++;
      }
    }
  });

  console.log(`[felids] Added images for ${enrichedCount} species from Wikidata`);

  return baseSpecies;
}
