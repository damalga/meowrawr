import EleventyFetch from "@11ty/eleventy-fetch";

// ============================================================================
// felids-inaturalist-pics.js — Segunda pasada a iNaturalist para bajar la
// galería completa de cada felido (hasta 6 fotos con atribución).
//
// ¿Por qué en un archivo aparte y no dentro de felids-inaturalist.js?
// Porque el endpoint de búsqueda por nombre (que usa el otro) NO devuelve
// taxon_photos (el array de fotos). Para conseguirlo hay que llamar al endpoint
// individual `/v1/taxa/{id}` — un fetch por especie, en serie, con delay.
// Separar ambos pasos deja cada archivo con una responsabilidad clara y permite
// ejecutar solo uno si se quiere (ej. desactivar la galería temporalmente).
// ============================================================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cuántas fotos guardamos por felido. La galería en la ficha muestra 6 (1 grande
// + 6 thumbs) y un botón "Ver más imágenes" que lleva a iNat para el resto.
const MAX_PHOTOS = 6;

// ─── Utilidades ─────────────────────────────────────────────────────────────

// De una URL como https://www.inaturalist.org/taxa/12345 saca "12345".
// Usamos el id ya resuelto en felids-inaturalist.js para no volver a buscar
// por nombre (una llamada menos por especie).
function extractTaxonId(uri) {
  if (!uri) return null;
  const match = uri.match(/\/taxa\/(\d+)/);
  return match ? match[1] : null;
}

// ─── Fetch del taxón individual ──────────────────────────────────────────────
// Endpoint individual: además de todo lo que trae el search, incluye taxon_photos,
// observations_count, preferred_common_name, wikipedia_summary...
// Solo usamos taxon_photos, el resto lo ignoramos (por ahora).
async function fetchTaxonDetails(taxonId) {
  const url = `https://api.inaturalist.org/v1/taxa/${taxonId}`;
  try {
    const data = await EleventyFetch(url, {
      duration: "1w", // cache local de 1 semana
      type: "json",
      fetchOptions: {
        headers: {
          "User-Agent": "Meowrawr/1.0 (Educational Project)",
          Accept: "application/json",
        },
      },
    });
    // La API envuelve el resultado en un array de 1 elemento aunque pidamos
    // por id, así que sacamos results[0].
    return data?.results?.[0] ?? null;
  } catch (e) {
    console.warn(`[felids]   iNat pics failed for ${taxonId}: ${e.message}`);
    return null;
  }
}

// ─── Función principal (export default) ─────────────────────────────────────
// Muta el array `species` in-place añadiendo `iNatPhotos` (array de hasta 6).
// A diferencia de felids-inaturalist.js (que iba en paralelo), aquí vamos en
// SERIE con 400ms de delay porque iNat recomienda ~100 req/min para llamadas
// pesadas. Con 41 felidos son 41×0.4 = ~16s la primera vez; después está todo
// cacheado por eleventy-fetch y va instantáneo.
export default async function enrichWithINaturalistPics(species) {
  console.log("[felids] Fetching iNaturalist taxon photos...");

  let count = 0;
  for (let i = 0; i < species.length; i++) {
    const s = species[i];

    // Necesitamos el id de iNat. Si el felido no lo tiene (porque no apareció
    // en la búsqueda previa), no podemos pedir sus fotos, seguimos con el siguiente.
    const taxonId = extractTaxonId(s.iNaturalistURI);
    if (!taxonId) continue;

    const taxon = await fetchTaxonDetails(taxonId);

    // Delay entre peticiones (excepto en la última) — evita golpear el rate-limit
    // de iNat cuando el cache está vacío.
    if (i < species.length - 1) await sleep(400);
    if (!taxon) continue;

    // taxon_photos es un array de { photo: { square_url, medium_url, ... }, ... }.
    // Nos quedamos con los primeros MAX_PHOTOS y para cada uno guardamos varias
    // resoluciones para poder usar el tamaño adecuado según dónde se muestre:
    //   - thumb    → miniatura (fila inferior de la galería), ~75×75.
    //   - main     → imagen grande centrada, ~500×500.
    //   - original → tamaño completo, se abre al hacer click en la principal.
    // Con `??` vamos cayendo a tamaños alternativos si el ideal no existe.
    const photos = (taxon.taxon_photos ?? [])
      .slice(0, MAX_PHOTOS)
      .map((tp) => ({
        thumb:
          tp.photo?.square_url ?? tp.photo?.small_url ?? tp.photo?.medium_url,
        main: tp.photo?.medium_url ?? tp.photo?.large_url,
        original:
          tp.photo?.original_url ?? tp.photo?.large_url ?? tp.photo?.medium_url,
        // Atribución: iNat exige mostrar autor y licencia. Aparece como texto
        // plano tipo "(c) John Doe, some rights reserved (CC BY-NC)".
        attribution: tp.photo?.attribution ?? null,
        licenseCode: tp.photo?.license_code ?? null,
      }))
      // Descartamos fotos sin URL usable (raro pero pasa con fotos "borradas").
      .filter((p) => p.main);

    if (!photos.length) continue;

    s.iNatPhotos = photos;
    count++;
  }

  console.log(`[felids] Got iNaturalist photos for ${count} species`);
  return species;
}
