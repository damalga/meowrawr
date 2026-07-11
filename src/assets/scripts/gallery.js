/* Galería de imágenes de iNaturalist: cambia la imagen principal al hacer click
 * en las miniaturas o en las flechas. Solo la imagen principal es un <a> que abre
 * la original de iNaturalist en una pestaña nueva. */
document.addEventListener("DOMContentLoaded", function () {
  const gallery = document.querySelector(".felid-gallery-photos");
  if (!gallery) return;

  const mainImg = gallery.querySelector(".gallery-main-img");
  const mainLink = gallery.querySelector(".gallery-main-link");
  const attribution = gallery.querySelector(".gallery-attribution");
  const thumbs = Array.from(gallery.querySelectorAll(".gallery-thumb"));
  const prevBtn = gallery.querySelector(".gallery-prev");
  const nextBtn = gallery.querySelector(".gallery-next");

  if (!mainImg || !mainLink || !thumbs.length) return;

  const baseAlt = mainImg.alt.split(" — ")[0];
  let index = 0;

  function setActive(i) {
    index = ((i % thumbs.length) + thumbs.length) % thumbs.length;
    const thumb = thumbs[index];
    const credit = thumb.dataset.attribution || "";
    mainImg.src = thumb.dataset.main;
    mainImg.alt = credit ? `${baseAlt} — ${credit}` : baseAlt;
    mainLink.href = thumb.dataset.original;
    mainLink.title = credit;
    if (attribution) attribution.textContent = credit;
    thumbs.forEach((t, j) => t.classList.toggle("active", j === index));
  }

  prevBtn?.addEventListener("click", () => setActive(index - 1));
  nextBtn?.addEventListener("click", () => setActive(index + 1));
  thumbs.forEach((t, i) =>
    t.addEventListener("click", () => setActive(i))
  );
});
