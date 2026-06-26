import EleventyFetch from '@11ty/eleventy-fetch';

async function fetchWikidataIds(scientificNames) {
  const values = scientificNames.map(n => `"${n}"`).join(' ');
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
    const data = await EleventyFetch(url, {
      duration: '1w',
      type: 'json',
      fetchOptions: {
        headers: {
          'User-Agent': 'Meowrawr/1.0 (Educational Project)',
          'Accept': 'application/json'
        }
      }
    });

    const ids = {};
    data.results.bindings.forEach(b => {
      const name = b.scientificName.value;
      const id = b.item.value.split('/').pop();
      if (!ids[name]) ids[name] = id;
    });
    return ids;
  } catch (e) {
    console.warn('[felids] Wikidata ID resolution failed:', e.message);
    return {};
  }
}

export default async function resolveWikidataIds(species) {
  console.log('[felids] Resolving Wikidata IDs from scientific names...');
  const ids = await fetchWikidataIds(species.map(s => s.scientificName));

  let resolved = 0, corrected = 0;
  species.forEach(s => {
    const id = ids[s.scientificName];
    if (!id) return;
    if (s.wikidataId && s.wikidataId !== id) {
      console.log(`[felids]   Corrected ${s.scientificName}: ${s.wikidataId} → ${id}`);
      corrected++;
    }
    s.wikidataId = id;
    s.wikidataURI = `https://www.wikidata.org/wiki/${id}`;
    resolved++;
  });
  console.log(`[felids] Resolved ${resolved} Wikidata IDs (${corrected} corrected)`);
  return species;
}
