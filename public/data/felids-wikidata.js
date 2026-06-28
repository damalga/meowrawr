import EleventyFetch from '@11ty/eleventy-fetch';

// Consulta SPARQL a Wikidata: dados los scientificName, devuelve el wikidataId real de cada uno.
// Red de seguridad: el JSON tiene los IDs correctos hoy, pero si alguien agrega una nueva
// especie con ID mal copiado, el log de "Corrected" lo señala antes de que cause problemas.
async function fetchWikidataIds(scientificNames) {
  // VALUES inyecta la lista de nombres en la query — 1 sola request batch para los 41 felidos.
  const values = scientificNames.map(n => `"${n}"`).join(' ');
  const sparqlQuery = `
    SELECT ?item ?scientificName WHERE {
      VALUES ?scientificName { ${values} }
      ?item wdt:P225 ?scientificName .
      ?item wdt:P105 ?taxonRank .
    }
  `;
  // P225 = "taxon name" (nombre científico). P105 = "taxon rank" → fuerza que ?item sea un taxón
  // real (especie/subespecie), descartando entidades populares con el mismo nombre (ej: Q146 "gato"
  // como concepto cultural vs Q20980826 "Felis catus" como especie).
  const url = 'https://query.wikidata.org/sparql?query=' +
    encodeURIComponent(sparqlQuery) + '&format=json';

  try {
    // eleventy-fetch cachea en disco (1 semana). Builds posteriores no llaman a Wikidata.
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
      // b.item.value viene como "http://www.wikidata.org/entity/Q140" → nos quedamos con "Q140".
      const id = b.item.value.split('/').pop();
      // Si el mismo scientificName matcheó varias veces (raro pero posible con sinónimos),
      // el primero gana — evita pisar un ID válido con otro válido pero menos canónico.
      if (!ids[name]) ids[name] = id;
    });
    return ids;
  } catch (e) {
    // Si Wikidata se cae, seguimos con el resto del pipeline (los IDs del JSON serán fallback).
    console.warn('[felids] Wikidata ID resolution failed:', e.message);
    return {};
  }
}

// Mutación in-place del array `species`: sobreescribe wikidataId con el resolvido por SPARQL
// y deriva wikidataURI a partir de ahí. El resto del pipeline (wikipedia.js) usa este ID.
export default async function resolveWikidataIds(species) {
  console.log('[felids] Resolving Wikidata IDs from scientific names...');
  const ids = await fetchWikidataIds(species.map(s => s.scientificName));

  let resolved = 0, corrected = 0;
  species.forEach(s => {
    const id = ids[s.scientificName];
    // Si Wikidata no devolvió nada para esta especie, dejamos el ID del JSON intacto (mejor algo
    // que nada). Pasa cuando hay typos en el scientificName o la especie es muy nueva en Wikidata.
    if (!id) return;
    // Logueamos las correcciones para que el desarrollador pueda actualizar el JSON si quiere.
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
