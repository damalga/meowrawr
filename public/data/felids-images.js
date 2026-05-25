async function fetchImage(scientificName) {
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

    return taxon?.default_photo?.medium_url ?? null;
  } catch {
    return null;
  }
}

export default async function enrichWithImages(species) {
  console.log('[felids] Fetching images from iNaturalist...');

  const entries = await Promise.all(
    species.map(async s => [s.scientificName, await fetchImage(s.scientificName)])
  );

  const images = Object.fromEntries(entries.filter(([, url]) => url));
  console.log(`[felids] Got images for ${Object.keys(images).length} species from iNaturalist`);

  species.forEach(s => {
    if (images[s.scientificName]) {
      s.image = images[s.scientificName];
    }
  });

  return species;
}
