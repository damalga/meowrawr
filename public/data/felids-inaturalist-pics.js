import EleventyFetch from '@11ty/eleventy-fetch';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const MAX_PHOTOS = 6;

// Extrae el id numérico del taxón desde una URL como https://www.inaturalist.org/taxa/12345.
function extractTaxonId(uri) {
  if (!uri) return null;
  const match = uri.match(/\/taxa\/(\d+)/);
  return match ? match[1] : null;
}

async function fetchTaxonDetails(taxonId) {
  // Endpoint individual del taxón — devuelve taxon_photos, observations_count,
  // preferred_common_name, wikipedia_summary, etc. La búsqueda por scientificName
  // (usada en felids-inaturalist.js) no incluye taxon_photos, por eso este segundo fetch.
  const url = `https://api.inaturalist.org/v1/taxa/${taxonId}`;
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
    return data?.results?.[0] ?? null;
  } catch (e) {
    console.warn(`[felids]   iNat pics failed for ${taxonId}: ${e.message}`);
    return null;
  }
}

export default async function enrichWithINaturalistPics(species) {
  console.log('[felids] Fetching iNaturalist taxon photos...');

  let count = 0;
  for (let i = 0; i < species.length; i++) {
    const s = species[i];
    const taxonId = extractTaxonId(s.iNaturalistURI);
    if (!taxonId) continue;

    const taxon = await fetchTaxonDetails(taxonId);
    // Delay entre requests para no gatillar rate-limit de iNat (100 req/min recomendado).
    if (i < species.length - 1) await sleep(400);
    if (!taxon) continue;

    const photos = (taxon.taxon_photos ?? [])
      .slice(0, MAX_PHOTOS)
      .map(tp => ({
        // Thumbnail para la fila inferior; main para la imagen grande; original para el click.
        thumb: tp.photo?.square_url ?? tp.photo?.small_url ?? tp.photo?.medium_url,
        main: tp.photo?.medium_url ?? tp.photo?.large_url,
        original: tp.photo?.original_url ?? tp.photo?.large_url ?? tp.photo?.medium_url,
        attribution: tp.photo?.attribution ?? null,
        licenseCode: tp.photo?.license_code ?? null,
      }))
      .filter(p => p.main);

    if (!photos.length) continue;

    s.iNatPhotos = photos;
    count++;
  }
  console.log(`[felids] Got iNaturalist photos for ${count} species`);
  return species;
}
