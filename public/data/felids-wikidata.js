import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fetchWikidataByScientificNames(scientificNames) {
  // Build SPARQL query to find Wikidata IDs and ALL images from Wikimedia Commons
  const values = scientificNames.map(name => `"${name}"`).join(' ');

  const sparqlQuery = `
    SELECT ?item ?scientificName ?image WHERE {
      VALUES ?scientificName { ${values} }
      ?item wdt:P225 ?scientificName .
      ?item wdt:P105 ?taxonRank .

      # Get Commons category
      OPTIONAL {
        ?item wdt:P373 ?commonsCategory .
      }

      # Get main image
      OPTIONAL { ?item wdt:P18 ?image }
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

    // Primero obtenemos IDs y categorías
    data.results.bindings.forEach(binding => {
      const scientificName = binding.scientificName.value;
      const wikidataId = binding.item.value.split('/').pop();
      const commonsCategory = binding.commonsCategory?.value;
      const image = binding.image?.value;

      if (!results[scientificName]) {
        results[scientificName] = {
          wikidataId,
          commonsCategory,
          images: []
        };
      }

      if (image && !results[scientificName].images.includes(image)) {
        results[scientificName].images.push(image);
      }
    });

    // Ahora obtenemos imágenes de Commons para cada categoría
    for (const scientificName in results) {
      const categoryName = results[scientificName].commonsCategory;
      if (categoryName) {
        const commonsImages = await fetchCommonsImages(categoryName);
        results[scientificName].images.push(...commonsImages);
      }
    }

    console.log(`[felids] Successfully fetched ${Object.keys(results).length} species from Wikidata`);
    return results;
  } catch (error) {
    console.warn('[felids] Error fetching Wikidata data:', error.message);
    return {};
  }
}

async function fetchCommonsImages(categoryName, limit = 10) {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?` +
      `action=query&` +
      `format=json&` +
      `generator=categorymembers&` +
      `gcmtitle=Category:${encodeURIComponent(categoryName)}&` +
      `gcmtype=file&` +
      `gcmlimit=${limit}&` +
      `prop=imageinfo&` +
      `iiprop=url&` +
      `origin=*`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Meowrawr/1.0 (Educational Project)'
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const images = [];

    if (data.query?.pages) {
      for (const page of Object.values(data.query.pages)) {
        if (page.imageinfo?.[0]?.url) {
          images.push(page.imageinfo[0].url);
        }
      }
    }

    console.log(`[felids] Found ${images.length} images in Commons category: ${categoryName}`);
    return images;
  } catch (error) {
    console.warn(`[felids] Error fetching Commons images for ${categoryName}:`, error.message);
    return [];
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

  // Enrich species with Wikidata IDs and images
  let enrichedCount = 0;
  baseSpecies.forEach(species => {
    const result = wikidataResults[species.scientificName];
    if (result) {
      species.wikidataId = result.wikidataId;
      species.images = result.images || [];
      // La primera imagen como imagen principal
      if (result.images && result.images.length > 0) {
        species.image = result.images[0];
        enrichedCount++;
      }
    }
  });

  console.log(`[felids] Added images for ${enrichedCount} species from Wikidata`);

  return baseSpecies;
}
