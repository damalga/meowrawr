async function fetchWikipediaLinks(scientificNames) {
  const values = scientificNames.map(name => `"${name}"`).join(' ');

  const sparqlQuery = `
    SELECT ?item ?scientificName ?wikipedia WHERE {
      VALUES ?scientificName { ${values} }
      ?item wdt:P225 ?scientificName .
      OPTIONAL {
        ?wikipedia schema:about ?item ;
                   schema:isPartOf <https://es.wikipedia.org/> .
      }
    }
  `;

  const url = 'https://query.wikidata.org/sparql?query=' +
    encodeURIComponent(sparqlQuery) + '&format=json';

  try {
    console.log('[felids] Fetching Wikipedia ES links from Wikidata...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Meowrawr/1.0 (Educational Project)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return {};

    const data = await response.json();
    const links = {};
    data.results.bindings.forEach(binding => {
      const name = binding.scientificName.value;
      if (binding.wikipedia && !links[name]) {
        links[name] = binding.wikipedia.value;
      }
    });

    console.log(`[felids] Got Wikipedia ES links for ${Object.keys(links).length} species`);
    return links;
  } catch (error) {
    console.warn('[felids] Error fetching Wikipedia links:', error.message);
    return {};
  }
}

async function fetchINaturalistURI(scientificName) {
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&rank=species&per_page=20`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Meowrawr/1.0 (Educational Project)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const taxon = data.results?.find(t => t.name.toLowerCase() === scientificName.toLowerCase());
    return taxon ? `https://www.inaturalist.org/taxa/${taxon.id}` : null;
  } catch {
    return null;
  }
}

async function fetchINaturalistURIs(scientificNames) {
  console.log('[felids] Fetching iNaturalist links...');
  const entries = await Promise.all(
    scientificNames.map(async name => [name, await fetchINaturalistURI(name)])
  );
  const links = Object.fromEntries(entries.filter(([, url]) => url));
  console.log(`[felids] Got iNaturalist links for ${Object.keys(links).length} species`);
  return links;
}

export default async function enrichWithLinks(species) {
  const scientificNames = species.map(s => s.scientificName);

  const [wikipediaLinks, iNaturalistLinks] = await Promise.all([
    fetchWikipediaLinks(scientificNames),
    fetchINaturalistURIs(scientificNames),
  ]);

  species.forEach(s => {
    if (wikipediaLinks[s.scientificName]) s.wikipediaURI = wikipediaLinks[s.scientificName];
    if (iNaturalistLinks[s.scientificName]) s.iNaturalistURI = iNaturalistLinks[s.scientificName];
  });

  return species;
}
