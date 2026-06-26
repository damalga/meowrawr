import EleventyFetch from '@11ty/eleventy-fetch';

async function fetchTaxon(scientificName) {
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&rank=species&per_page=20`;

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
    return data.results?.find(t => t.name.toLowerCase() === scientificName.toLowerCase()) ?? null;
  } catch {
    return null;
  }
}

export default async function enrichWithINaturalist(species) {
  console.log('[felids] Fetching iNaturalist data...');

  const taxa = await Promise.all(species.map(s => fetchTaxon(s.scientificName)));

  let count = 0;
  species.forEach((s, i) => {
    const taxon = taxa[i];
    if (!taxon) return;
    s.iNaturalistURI = `https://www.inaturalist.org/taxa/${taxon.id}`;
    if (taxon.default_photo?.medium_url) {
      s.image = taxon.default_photo.medium_url;
    }
    // Stash for the EN fallback step in felids-wikipedia.js (consumed in felids.js).
    if (taxon.wikipedia_url) s._inatWikipediaURL = taxon.wikipedia_url;
    count++;
  });

  console.log(`[felids] Got iNaturalist data for ${count} species`);
  return species;
}
