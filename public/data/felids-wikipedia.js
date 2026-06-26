import EleventyFetch from "@11ty/eleventy-fetch";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJsonWithRetry(url, label, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await EleventyFetch(url, {
        duration: "1w",
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

async function fetchWikipediaURIs(wikidataIds) {
  const values = wikidataIds.map((id) => `wd:${id}`).join(" ");
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
    const uris = {};
    data.results.bindings.forEach((b) => {
      const id = b.item.value.split("/").pop();
      uris[id] = b.wikipedia.value;
    });
    return uris;
  } catch (e) {
    console.warn("[felids] Wikipedia URI query failed:", e.message);
    return {};
  }
}

function extractTitle(wikipediaURI) {
  const match = wikipediaURI.match(/\/wiki\/(.+)$/);
  return match ? decodeURIComponent(match[1]).replace(/_/g, " ") : null;
}

function cleanWikipediaHtml(html) {
  return (
    html
      // strip reference superscripts: <sup class="reference">[1]</sup>
      .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/g, "")
      // make relative wiki links absolute
      .replace(
        /href="\/wiki\/([^"]+)"/g,
        'href="https://es.wikipedia.org/wiki/$1"',
      )
  );
}

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

// Wikipedia anonymous exlimit max = 20
async function fetchExtractsBatch(titles, host = "es.wikipedia.org") {
  if (!titles.length) return {};
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

  // Wikipedia returns final (post-redirect) titles in pages[]. Map them back to requested titles.
  const redirects = data?.query?.redirects ?? [];
  const requestedFor = new Map(); // finalTitle -> requestedTitle
  redirects.forEach((r) => requestedFor.set(r.to, r.from));

  const extracts = {};
  (data?.query?.pages ?? []).forEach((p) => {
    if (!p.extract) return;
    const requested = requestedFor.get(p.title) ?? p.title;
    extracts[requested] = p.extract;
  });
  return extracts;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default async function enrichWithWikipedia(species) {
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

  const targets = species
    .filter((s) => s.wikipediaURI)
    .map((s) => ({ species: s, title: extractTitle(s.wikipediaURI) }))
    .filter((t) => t.title);

  console.log(
    `[felids] Fetching Wikipedia extracts (${targets.length} titles, batched)...`,
  );
  const batches = chunk(targets, 20);
  const allExtracts = {};
  for (let i = 0; i < batches.length; i++) {
    const batchTitles = batches[i].map((t) => t.title);
    const batchResult = await fetchExtractsBatch(batchTitles);
    Object.assign(allExtracts, batchResult);
    if (i < batches.length - 1) await sleep(500);
  }

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

// Fallback: fetch English Wikipedia extracts for species that have no ES extract
// but have a Wikipedia URL from iNaturalist (typically pointing to en.wikipedia.org).
export async function enrichWithEnFallback(species) {
  const targets = species
    .filter(s => !s.wikipediaExtract && s._inatWikipediaURL)
    .map(s => {
      const m = s._inatWikipediaURL.match(/^https?:\/\/en\.wikipedia\.org\/wiki\/(.+)$/);
      if (!m) return null;
      return { species: s, title: decodeURIComponent(m[1]).replace(/_/g, " ") };
    })
    .filter(Boolean);

  if (!targets.length) return species;

  console.log(`[felids] Falling back to EN Wikipedia for ${targets.length} species...`);
  const batches = chunk(targets, 20);
  const allExtracts = {};
  for (let i = 0; i < batches.length; i++) {
    const batchTitles = batches[i].map(t => t.title);
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
    if (!s.wikipediaURI) s.wikipediaURI = s._inatWikipediaURL;
    count++;
  });
  console.log(`[felids] Got EN Wikipedia extracts for ${count} species`);

  return species;
}
