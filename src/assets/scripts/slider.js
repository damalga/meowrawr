/* Document Ready */
document.addEventListener("DOMContentLoaded", function () {
  // Glider is loaded globally from glider.min.js script tag
  if (!window.Glider) {
    console.error('Glider is not loaded!');
    return;
  }

  const Glider = window.Glider;

  // Find all gliders on the page and initialize them
  document.querySelectorAll('.glider').forEach((gliderElement) => {
    const gliderId = gliderElement.id;
    if (!gliderId) return;

    const sliderNumber = gliderId.replace('glider-', '');
    const prevArrow = `#prev-${sliderNumber}`;
    const nextArrow = `#next-${sliderNumber}`;

    // Check if it's a publi glider
    const isPubliGlider = gliderId.includes('publi');

    // Randomize felid slides if data-random-count is present
    const randomCount = gliderElement.getAttribute('data-random-count');
    if (randomCount) {
      randomizeFelids(gliderElement, parseInt(randomCount));
    }

    if (isPubliGlider) {
      // Only initialize publi gliders on mobile (<= 560px)
      if (window.innerWidth <= 560) {
        setupPubliSlider(`#${gliderId}`);
      }
    } else {
      // Regular gliders (with arrows)
      setupSlider(`#${gliderId}`, prevArrow, nextArrow);
    }
  });

  // Randomize and hide slides
  function randomizeFelids(gliderElement, count) {
    const felidSlides = Array.from(gliderElement.querySelectorAll('.felid-slide'));

    // Shuffle array
    const shuffled = felidSlides.sort(() => Math.random() - 0.5);

    // Hide all felid slides first
    felidSlides.forEach(slide => {
      slide.style.display = 'none';
    });

    // Show only the first 'count' slides
    shuffled.slice(0, count).forEach(slide => {
      slide.style.display = '';
    });
  }

  // Setup Slider (for regular sliders with arrows)
  function setupSlider(selector, prevArrow, nextArrow) {
    const gliderElement = document.querySelector(selector);
    if (!gliderElement) return;

    try {
      const slider = new Glider(gliderElement, {
        // Mobile-first
        slidesToScroll: 1,
        slidesToShow: 1,
        draggable: true,
        arrows: {
          prev: prevArrow,
          next: nextArrow,
        },
        responsive: [
          {
            // Pantallas mayores o iguales a 775px
            breakpoint: 775,
            settings: {
              slidesToShow: 2.5,
            },
          },
          {
            // Pantallas mayores o iguales a 1025px
            breakpoint: 1025,
            settings: {
              slidesToShow: 3.5,
            },
          },
        ],
      });

    const gliderContainer = document.querySelector(selector);
    const slides = document.querySelectorAll(`${selector} .slide`);

    let isDragging = false;

    gliderContainer.addEventListener("mousedown", dragStart);
    gliderContainer.addEventListener("touchstart", dragStart);
    gliderContainer.addEventListener("mouseup", dragEndDelayed);
    gliderContainer.addEventListener("touchend", dragEndDelayed);

    function dragStart(event) {
      isDragging = true;
    }

    function dragEnd() {
      if (isDragging) {
        const containerWidth = gliderContainer.offsetWidth;

        // Busca el elemento con las clases "active" y "center"
        let activeCenterSlide = null;
        for (const slide of slides) {
          if (
            slide.classList.contains("active") && slide.classList.contains("center")
          ) {
            activeCenterSlide = slide;
            break;
          }
        }

        if (activeCenterSlide) {
          const slideWidth = activeCenterSlide.offsetWidth;
          const slideOffsetLeft = activeCenterSlide.offsetLeft;
          const scrollLeft = slideOffsetLeft - (containerWidth - slideWidth) / 2;

          gliderContainer.style.transition = "scroll-left 0.3s ease";
          gliderContainer.scrollTo({
            left: scrollLeft,
            behavior: "smooth",
          });
        }

        isDragging = false;
      }
    }

    function dragEndDelayed() {
      if (isDragging) {
        setTimeout(dragEnd, 600); // Retrasar la ejecución 0.6 segundos
      }
    }

      // Ajusta el tamaño de las "flechas" (areas degradadas blanco-transparent) del slider
      const sliderMain = gliderElement.closest(".slider-main");
      const gliderArrows = sliderMain?.querySelector(".glider-arrows");

      if (sliderMain && gliderArrows) {
        const sliderMainHeight = sliderMain.offsetHeight;
        const nextArrowEl = gliderArrows.querySelector(".next");
        const prevArrowEl = gliderArrows.querySelector(".prev");

        if (nextArrowEl) nextArrowEl.style.height = sliderMainHeight + "px";
        if (prevArrowEl) prevArrowEl.style.height = sliderMainHeight + "px";
      }
    } catch (error) {
      console.error(`Error initializing Glider for ${selector}:`, error);
    }
  }

  // Setup Publi Slider (mobile only, with dots)
  function setupPubliSlider(selector) {
    const gliderElement = document.querySelector(selector);
    if (!gliderElement) return;

    const gliderId = gliderElement.id;
    const dotsSelector = `#${gliderId}-dots`;
    const dotsElement = document.querySelector(dotsSelector);

    try {
      const config = {
        slidesToScroll: 1,
        slidesToShow: 1,
        draggable: true,
      };

      // Add dots if they exist
      if (dotsElement) {
        config.dots = dotsSelector;
      }

      new Glider(gliderElement, config);
    } catch (error) {
      console.error(`Error initializing Publi Glider for ${selector}:`, error);
    }
  }
});
