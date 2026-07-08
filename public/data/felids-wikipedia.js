import EleventyFetch from "@11ty/eleventy-fetch";

// ============================================================================
// felids-wikipedia.js — Enriquece cada felido con:
//   1. wikipediaURI       → URL del artículo en Wikipedia ES.
//   2. wikipediaExtract   → primer párrafo del artículo (HTML limpio).
//   3. wikipediaExtractEn → true si el fallback fue a Wikipedia EN (badge UI).
//
// Depende de `wikidataId` (resuelto antes por felids-wikidata.js) para saber
// qué entidad de Wikidata consultar. Si un felido no tiene wikidataId, se salta.
// ============================================================================

// Utilidad para dormir N milisegundos entre peticiones.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Fetch con reintentos ────────────────────────────────────────────────────
// Wikipedia y Wikidata a veces devuelven 429 (Too Many Requests). Reintentamos
// con backoff creciente (2s, 4s, 6s). Cualquier otro error se propaga.
async function fetchJsonWithRetry(url, label, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await EleventyFetch(url, {
        duration: "1w", // cache local de 1 semana → builds siguientes no llaman a la red
        type: "json",
        fetchOptions: {
          headers: {
            "User-Agent": "Meowrawr/1.0 (Educational Project)",
            Accept: "application/json",
          },
        },
      });
    } catch (e) {
      if (e.message?.includes("429") && attempt < maxRetries) {
        const wait = 2000 * (attempt + 1);
        console.warn(`[felids]   429 for ${label}, retrying in ${wait}ms`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
}

// ─── Paso 1: obtener URLs de Wikipedia ES a partir de wikidataIds ────────────
// SPARQL a Wikidata: "para estos items, ¿qué URL tienen en la Wikipedia ES?".
// Se hace en 1 sola request batch (todos los wikidataIds a la vez).
async function fetchWikipediaURIs(wikidataIds) {
  // wd:Q140 es la sintaxis SPARQL para referirse a la entidad Q140.
  const values = wikidataIds.map((id) => `wd:${id}`).join(" ");

  // La query dice: "para cada item de esta lista, dame la URL de Wikipedia
  // donde schema:isPartOf sea la wiki en español".
  const sparqlQuery = `
    SELECT ?item ?wikipedia WHERE {
      VALUES ?item { ${values} }
      ?wikipedia schema:about ?item ;
                 schema:isPartOf <https://es.wikipedia.org/> .
    }
  `;
  const url =
    "https://query.wikidata.org/sparql?query=" +
    encodeURIComponent(sparqlQuery) +
    "&format=json";

  try {
    const data = await fetchJsonWithRetry(url, "wikipedia URIs");

    // El resultado viene como { results: { bindings: [ { item, wikipedia }, ... ] } }.
    // Los mapeamos a un diccionario { Q140: "https://es.wikipedia.org/wiki/Panthera_leo", ... }.
    const uris = {};
    data.results.bindings.forEach((b) => {
      // b.item.value viene como "http://www.wikidata.org/entity/Q140" → nos quedamos con "Q140".
      const id = b.item.value.split("/").pop();
      uris[id] = b.wikipedia.value;
    });
    return uris;
  } catch (e) {
    // Si Wikidata se cae, seguimos: los felidos simplemente no tendrán wikipediaURI.
    console.warn("[felids] Wikipedia URI query failed:", e.message);
    return {};
  }
}

// ─── Utilidades de parsing HTML ──────────────────────────────────────────────

// De una URL como "https://es.wikipedia.org/wiki/Panthera_leo" saca "Panthera leo"
// (el título tal cual lo pide la API de MediaWiki, con espacios en vez de "_").
function extractTitle(wikipediaURI) {
  const match = wikipediaURI.match(/\/wiki\/(.+)$/);
  return match ? decodeURIComponent(match[1]).replace(/_/g, " ") : null;
}

// Limpia el HTML que devuelve Wikipedia:
//   - Quita las notas al pie tipo <sup class="reference">[1]</sup> (ruido visual).
//   - Convierte los links relativos "/wiki/Xxx" a absolutos "https://es.wikipedia.org/wiki/Xxx"
//     así el usuario que hace click acaba en Wikipedia y no en un 404 nuestro.
function cleanWikipediaHtml(html) {
  return html
    .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/g, "")
    .replace(
      /href="\/wiki\/([^"]+)"/g,
      'href="https://es.wikipedia.org/wiki/$1"',
    );
}

// Del HTML del extract devuelto por la API, saca los primeros `n` párrafos
// que sean "de verdad" (>30 caracteres de texto real, para descartar párrafos
// vacíos o con solo un link/imagen).
function extractParagraphs(html, n) {
  const cleaned = cleanWikipediaHtml(html);
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/g;
  const result = [];
  let match;
  while ((match = re.exec(cleaned)) && result.length < n) {
    const textOnly = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;|&#160;/g, "")
      .trim();
    if (textOnly.length > 30) result.push(match[0]);
  }
  return result.length ? result.join("\n") : null;
}

// ─── Paso 2: descargar los extracts en batch ─────────────────────────────────
// La API de MediaWiki permite pedir hasta 20 artículos por request para usuarios
// anónimos (exlimit=20). Chunkeamos si hay más de 20.
async function fetchExtractsBatch(titles, host = "es.wikipedia.org") {
  if (!titles.length) return {};

  // action=query&prop=extracts&exintro=1  → solo el resumen (párrafo de intro).
  // formatversion=2  → estructura JSON más limpia (array de páginas en vez de mapa por id).
  // redirects=1  → si el título es una redirección, sigue la redirección automáticamente.
  const url =
    `https://${host}/w/api.php?action=query&prop=extracts&exintro=1&exlimit=${titles.length}` +
    `&format=json&formatversion=2&redirects=1&titles=${titles.map(encodeURIComponent).join("|")}`;

  let data;
  try {
    data = await fetchJsonWithRetry(url, `extracts batch (${titles.length})`);
  } catch (e) {
    console.warn(`[felids]   extracts batch failed: ${e.message}`);
    return {};
  }

  // Wikipedia responde con el título FINAL (post-redirect). Si pedimos
  // "Felis silvestris lybica" y redirige a "Felis lybica", la página vendrá con
  // title="Felis lybica" pero nosotros la habíamos indexado como el original.
  // Mapeamos back al título pedido usando el bloque `redirects` que también viene.
  const redirects = data?.query?.redirects ?? [];
  const requestedFor = new Map(); // finalTitle -> requestedTitle
  redirects.forEach((r) => requestedFor.set(r.to, r.from));

  const extracts = {};
  (data?.query?.pages ?? []).forEach((p) => {
    if (!p.extract) return; // páginas sin artículo (desambiguaciones, borradas...)
    const requested = requestedFor.get(p.title) ?? p.title;
    extracts[requested] = p.extract;
  });
  return extracts;
}

// Chunker genérico: parte un array en trozos de tamaño `size`.
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─── Función principal (export default) ─────────────────────────────────────
// Enriquece cada felido en `species` con wikipediaURI y wikipediaExtract.
// Muta el array in-place y también lo devuelve.
export default async function enrichWithWikipedia(species) {
  // Paso 1: para cada wikidataId, pedimos a Wikidata la URL de Wikipedia ES.
  console.log("[felids] Fetching Wikipedia URIs...");
  const uris = await fetchWikipediaURIs(
    species.map((s) => s.wikidataId).filter(Boolean),
  );
  species.forEach((s) => {
    if (uris[s.wikidataId]) s.wikipediaURI = uris[s.wikidataId];
  });
  console.log(
    `[felids] Got Wikipedia URIs for ${Object.keys(uris).length} species`,
  );

  // Paso 2: preparamos la lista de artículos a descargar (los que sí tienen URI).
  // Formato: [{ species, title }, ...] para poder mutar la especie después.
  const targets = species
    .filter((s) => s.wikipediaURI)
    .map((s) => ({ species: s, title: extractTitle(s.wikipediaURI) }))
    .filter((t) => t.title);

  console.log(
    `[felids] Fetching Wikipedia extracts (${targets.length} titles, batched)...`,
  );

  // Chunkeamos en grupos de 20 (límite anónimo de exlimit). Delay entre batches
  // para no gatillar el 429 de Wikipedia.
  const batches = chunk(targets, 20);
  const allExtracts = {};
  for (let i = 0; i < batches.length; i++) {
    const batchTitles = batches[i].map((t) => t.title);
    const batchResult = await fetchExtractsBatch(batchTitles);
    Object.assign(allExtracts, batchResult);
    if (i < batches.length - 1) await sleep(500);
  }

  // Paso 3: por cada felido, sacamos el primer párrafo del extract y lo pegamos.
  let count = 0;
  targets.forEach(({ species: s, title }) => {
    const html = allExtracts[title];
    if (!html) return;
    const paragraphs = extractParagraphs(html, 1);
    if (paragraphs) {
      s.wikipediaExtract = paragraphs;
      count++;
    }
  });
  console.log(`[felids] Got Wikipedia extracts for ${count} species`);

  return species;
}

// ─── Fallback a Wikipedia EN ─────────────────────────────────────────────────
// Algunos felidos (los taxones más recientes, split de especies, etc.) NO tienen
// artículo en Wikipedia ES. Para no quedarnos sin descripción, usamos la URL
// EN que iNaturalist ya nos había dado en `_inatWikipediaURL` y hacemos otra
// tanda de extracts contra en.wikipedia.org. Marcamos con wikipediaExtractEn=true
// para que la ficha muestre el badge "en inglés".
export async function enrichWithEnFallback(species) {
  const targets = species
    .filter((s) => !s.wikipediaExtract && s._inatWikipediaURL)
    .map((s) => {
      // Solo aceptamos URLs de en.wikipedia.org (por si iNat trajo otra wiki).
      const m = s._inatWikipediaURL.match(
        /^https?:\/\/en\.wikipedia\.org\/wiki\/(.+)$/,
      );
      if (!m) return null;
      return { species: s, title: decodeURIComponent(m[1]).replace(/_/g, " ") };
    })
    .filter(Boolean);

  if (!targets.length) return species;

  console.log(
    `[felids] Falling back to EN Wikipedia for ${targets.length} species...`,
  );
  const batches = chunk(targets, 20);
  const allExtracts = {};
  for (let i = 0; i < batches.length; i++) {
    const batchTitles = batches[i].map((t) => t.title);
    const batchResult = await fetchExtractsBatch(batchTitles, "en.wikipedia.org");
    Object.assign(allExtracts, batchResult);
    if (i < batches.length - 1) await sleep(500);
  }

  let count = 0;
  targets.forEach(({ species: s, title }) => {
    const html = allExtracts[title];
    if (!html) return;
    const paragraphs = extractParagraphs(html, 1);
    if (!paragraphs) return;
    s.wikipediaExtract = paragraphs;
    s.wikipediaExtractEn = true;
    // Si no tenía URI (porque no había ES), usamos la EN como link "Leer más".
    if (!s.wikipediaURI) s.wikipediaURI = s._inatWikipediaURL;
    count++;
  });
  console.log(`[felids] Got EN Wikipedia extracts for ${count} species`);

  return species;
}
