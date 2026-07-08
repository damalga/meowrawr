import EleventyFetch from "@11ty/eleventy-fetch";

// ============================================================================
// felids-wikidata.js — Resuelve el wikidataId canónico de cada felido a partir
// de su scientificName. Es el PRIMER paso del pipeline (antes de wikipedia.js
// e inaturalist-pics.js) porque el resto necesita saber el ID correcto para
// pedirle datos a Wikidata/Wikipedia.
//
// Red de seguridad: el JSON tiene los IDs correctos hoy, pero si alguien agrega
// una nueva especie con ID mal copiado, el log de "Corrected" lo detecta.
// ============================================================================

// ─── Consulta SPARQL a Wikidata ──────────────────────────────────────────────
// SPARQL es el lenguaje de query para bases de datos "de grafo" como Wikidata.
// Aquí decimos: "dame los items que tengan estos scientificName y que sean
// taxones reales (no conceptos culturales)".
async function fetchWikidataIds(scientificNames) {
  // VALUES inyecta la lista de nombres en la query → 1 sola request batch para
  // los 41 felidos (mucho más eficiente que preguntar uno por uno).
  const values = scientificNames.map((n) => `"${n}"`).join(" ");

  const sparqlQuery = `
    SELECT ?item ?scientificName WHERE {
      VALUES ?scientificName { ${values} }
      ?item wdt:P225 ?scientificName .
      ?item wdt:P105 ?taxonRank .
    }
  `;
  // P225 = "taxon name" (nombre científico).
  // P105 = "taxon rank" → obliga a que ?item sea un taxón real (especie/subespecie),
  //         descartando entidades populares con el mismo nombre. Ejemplo clásico:
  //         "Felis catus" existe como Q146 ("gato" como concepto cultural) y como
  //         Q20980826 ("Felis catus" como especie biológica). Sin P105 podíamos
  //         acabar mostrando el artículo cultural en vez del biológico.
  const url =
    "https://query.wikidata.org/sparql?query=" +
    encodeURIComponent(sparqlQuery) +
    "&format=json";

  try {
    // eleventy-fetch cachea la respuesta en disco durante 1 semana. Solo el
    // primer build después de un cache-miss llama a Wikidata; los siguientes
    // leen del cache local (súper rápido).
    const data = await EleventyFetch(url, {
      duration: "1w",
      type: "json",
      fetchOptions: {
        headers: {
          "User-Agent": "Meowrawr/1.0 (Educational Project)",
          Accept: "application/json",
        },
      },
    });

    // La respuesta viene como { results: { bindings: [ { item, scientificName }, ... ] } }.
    // La convertimos a un diccionario { "Panthera leo": "Q140", ... }.
    const ids = {};
    data.results.bindings.forEach((b) => {
      const name = b.scientificName.value;
      // b.item.value viene como "http://www.wikidata.org/entity/Q140" → nos quedamos con "Q140".
      const id = b.item.value.split("/").pop();
      // Si el mismo scientificName matcheó varias veces (raro pero posible con
      // sinónimos), el primero gana — evita pisar un ID válido con otro válido
      // pero menos canónico.
      if (!ids[name]) ids[name] = id;
    });
    return ids;
  } catch (e) {
    // Si Wikidata se cae, seguimos con el resto del pipeline (los IDs del JSON
    // servirán de fallback). Es lo que evita que un problema temporal de la
    // API rompa el build entero.
    console.warn("[felids] Wikidata ID resolution failed:", e.message);
    return {};
  }
}

// ─── Función principal (export default) ─────────────────────────────────────
// Muta el array `species` in-place: para cada felido, resuelve el wikidataId
// contra Wikidata y sobreescribe el que traía del JSON. También deriva
// wikidataURI (URL amigable para el usuario final).
export default async function resolveWikidataIds(species) {
  console.log("[felids] Resolving Wikidata IDs from scientific names...");
  const ids = await fetchWikidataIds(species.map((s) => s.scientificName));

  let resolved = 0,
    corrected = 0;
  species.forEach((s) => {
    const id = ids[s.scientificName];
    // Si Wikidata no devolvió nada para esta especie, dejamos el ID del JSON
    // intacto (mejor algo que nada). Pasa cuando hay typos en el scientificName
    // o cuando la especie es muy nueva en Wikidata.
    if (!id) return;
    // Logueamos las correcciones para que el desarrollador pueda actualizar el
    // JSON. Idealmente esto siempre debe imprimir "0 corrected"; si empieza a
    // aparecer algo, es señal de que el JSON quedó atrás.
    if (s.wikidataId && s.wikidataId !== id) {
      console.log(
        `[felids]   Corrected ${s.scientificName}: ${s.wikidataId} → ${id}`,
      );
      corrected++;
    }
    s.wikidataId = id;
    s.wikidataURI = `https://www.wikidata.org/wiki/${id}`;
    resolved++;
  });
  console.log(
    `[felids] Resolved ${resolved} Wikidata IDs (${corrected} corrected)`,
  );
  return species;
}
