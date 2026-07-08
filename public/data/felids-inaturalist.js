import EleventyFetch from "@11ty/eleventy-fetch";

// ============================================================================
// felids-inaturalist.js — Primer contacto con la API de iNaturalist.
// Por cada felido busca su ficha en iNat y saca:
//   • iNaturalistURI      → URL de la ficha del taxón (para "Enlaces externos").
//   • image               → foto por defecto del taxón (usada como fallback cuando
//                            no hay galería de fotos completa).
//   • _inatWikipediaURL   → pista para el fallback EN de Wikipedia.
//                            El "_" al principio marca campo "interno": se usa en
//                            el pipeline pero se borra antes de exportar el objeto
//                            final (ver felids.js).
//
// Nota: NO trae la galería completa. Eso lo hace felids-inaturalist-pics.js con
// una segunda pasada al endpoint individual del taxón (la búsqueda no incluye
// taxon_photos).
// ============================================================================

// ─── Fetch de un taxón por nombre científico ─────────────────────────────────
// Endpoint de búsqueda: devuelve hasta 20 candidatos que "empatan" con el nombre.
// Nos quedamos con el que coincide EXACTAMENTE (case-insensitive) con el
// scientificName pedido, para descartar sinónimos y subespecies que también
// aparecen en la búsqueda.
async function fetchTaxon(scientificName) {
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&rank=species&per_page=20`;

  try {
    const data = await EleventyFetch(url, {
      duration: "1w", // cache local de 1 semana → builds siguientes no llaman a la red
      type: "json",
      fetchOptions: {
        headers: {
          "User-Agent": "Meowrawr/1.0 (Educational Project)",
          Accept: "application/json",
        },
      },
    });
    // find() devuelve el primero que empata exactamente por nombre. Si la
    // búsqueda no devolvió el felido que queremos (raro, pero pasa), retornamos
    // null y el felido se queda sin datos de iNat.
    return (
      data.results?.find(
        (t) => t.name.toLowerCase() === scientificName.toLowerCase(),
      ) ?? null
    );
  } catch {
    // Cualquier fallo de red o parseo → seguimos con el resto. Un felido sin
    // datos de iNat aparece sin foto/link pero no rompe el build.
    return null;
  }
}

// ─── Función principal (export default) ─────────────────────────────────────
// Muta el array `species` in-place. Al contrario del pipeline de Wikipedia
// (que va con delay para no gatillar 429), aquí lanzamos las 41 peticiones
// en paralelo con Promise.all porque iNat tolera bien la búsqueda concurrente.
export default async function enrichWithINaturalist(species) {
  console.log("[felids] Fetching iNaturalist data...");

  // Lanza las 41 peticiones a la vez. Promise.all espera a que TODAS acaben
  // (o alguna falle, pero fetchTaxon ya captura los errores).
  const taxa = await Promise.all(
    species.map((s) => fetchTaxon(s.scientificName)),
  );

  let count = 0;
  species.forEach((s, i) => {
    const taxon = taxa[i];
    if (!taxon) return; // este felido no fue encontrado en iNat, se salta

    // URL de la ficha pública del taxón (usada en la sección "Enlaces externos").
    s.iNaturalistURI = `https://www.inaturalist.org/taxa/${taxon.id}`;

    // Foto por defecto (versión media, ~500px). Se usa como fallback si por
    // algún motivo no hay galería en iNatPhotos (ver felino.hbs).
    if (taxon.default_photo?.medium_url) {
      s.image = taxon.default_photo.medium_url;
    }

    // URL del artículo de Wikipedia asociado en iNat (típicamente en.wikipedia.org).
    // Se usa como pista para el fallback EN de wikipedia.js cuando no hay artículo
    // en ES. Es "interno" (prefijo "_"): felids.js lo borra antes de exportar.
    if (taxon.wikipedia_url) s._inatWikipediaURL = taxon.wikipedia_url;

    count++;
  });

  console.log(`[felids] Got iNaturalist data for ${count} species`);
  return species;
}
