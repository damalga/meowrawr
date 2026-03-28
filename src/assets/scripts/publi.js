import $ from "jquery";

/* Document Ready */
$(function () {
  // Config slider
  const sliderConfigs = [
    {
      selector: "#glider-publi-2",
      dots: "#glider-publi-2-dots",
      slidesToShow: 2,
      autoplay: true,
    },
    {
      selector: "#glider-publi-3",
      dots: "#glider-publi-3-dots",
      slidesToShow: 3,
      autoplay: true,
    },
  ];

  sliderConfigs.forEach((config) => {
    setupSlider(config.selector, config.dots, config.autoplay, config.slidesToShow);
  });

  // Setup Slider
  function setupSlider(selector, dots, autoplay, slidesToShow) {
    if (document.querySelector(selector) !== null) {
      const slider = new Glider(document.querySelector(selector), {
        // Mobile-1st
        slidesToScroll: 1,
        slidesToShow: 1,
        draggable: true,
        dots: dots,
        autoplay: true,
        responsive: [
          {
            // Pantallas mayores o iguales a 560px
            breakpoint: 560,
            settings: {
              slidesToShow: slidesToShow,
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

      // Autoplay y bucle
      let currentIndex = 0;
      const slidesCount = slider.track.childElementCount;

      function nextSlide() {
        if (currentIndex === slidesCount - 1) {
          currentIndex = 0;
        } else {
          currentIndex++;
        }
        slider.scrollItem(currentIndex);
      }

      if (autoplay) {
        setInterval(nextSlide, 5000); // Cambia de diapositiva cada 5s
      }

    }
  }
});
