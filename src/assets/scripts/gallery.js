/* Galería de imágenes de iNaturalist: cambia la imagen principal al hacer click
 * en las miniaturas o en las flechas. Solo la imagen principal es un <a> que abre
 * la original de iNaturalist en una pestaña nueva. */
document.addEventListener("DOMContentLoaded", function () {
  const gallery = document.querySelector(".felid-gallery-photos");
  if (!gallery) return;

  const mainImg = gallery.querySelector(".gallery-main-img");
  const mainLink = gallery.querySelector(".gallery-main-link");
  const thumbs = Array.from(gallery.querySelectorAll(".gallery-thumb"));
  const prevBtn = gallery.querySelector(".gallery-prev");
  const nextBtn = gallery.querySelector(".gallery-next");

  if (!mainImg || !mainLink || !thumbs.length) return;

  let index = 0;

  function setActive(i) {
    index = ((i % thumbs.length) + thumbs.length) % thumbs.length;
    const thumb = thumbs[index];
    mainImg.src = thumb.dataset.main;
    mainLink.href = thumb.dataset.original;
    mainLink.title = thumb.dataset.attribution || "";
    thumbs.forEach((t, j) => t.classList.toggle("active", j === index));
  }

  prevBtn?.addEventListener("click", () => setActive(index - 1));
  nextBtn?.addEventListener("click", () => setActive(index + 1));
  thumbs.forEach((t, i) =>
    t.addEventListener("click", () => setActive(i))
  );
});
