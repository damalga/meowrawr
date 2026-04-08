// Gallery slider para las cards de felinos
(function() {
  // Inicializar todos los sliders de cards
  const cardSliders = document.querySelectorAll('.card-gallery-slider');

  cardSliders.forEach(slider => {
    const track = slider.querySelector('.card-gallery-track');
    const prevBtn = slider.querySelector('.card-gallery-prev');
    const nextBtn = slider.querySelector('.card-gallery-next');
    const dotsContainer = slider.querySelector('.card-gallery-dots');

    if (!track) return;

    const slides = track.querySelectorAll('.card-gallery-slide');
    const totalSlides = slides.length;
    let currentSlide = 0;

    // Si solo hay 1 slide, ya se oculta con CSS
    if (totalSlides <= 1) return;

    // Crear dots
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('span');
      dot.classList.add('card-gallery-dot');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }

    const dots = dotsContainer.querySelectorAll('.card-gallery-dot');

    function updateSlider() {
      track.style.transform = `translateX(-${currentSlide * 100}%)`;

      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
      });
    }

    function goToSlide(index) {
      currentSlide = index;
      updateSlider();
    }

    function nextSlide(e) {
      e.preventDefault();
      e.stopPropagation();
      currentSlide = (currentSlide + 1) % totalSlides;
      updateSlider();
    }

    function prevSlide(e) {
      e.preventDefault();
      e.stopPropagation();
      currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
      updateSlider();
    }

    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
  });
})();
