/* Document Ready */
document.addEventListener("DOMContentLoaded", function () {
  /* Variables para colocar elementos */
  const header = document.querySelector("header");
  const headerHeight = header.offsetHeight;
  const hero = document.querySelector(".hero");
  const heroHeight = hero.offsetHeight;

  /* Selector de felinos */
  const felidsSelector = document.querySelector(".felids-selector");
  const felidsInput = document.querySelector(".felids-input");
  const felidsOptions = document.querySelector("ul.felids-options");
  const felidsOptionList = document.querySelectorAll("li.option");
  const veil = document.querySelector(".veil");

  if (felidsSelector && felidsOptions) {
    felidsSelector.style.top = (headerHeight + heroHeight) / 1.5 + "px";
    felidsOptions.style.top = -(heroHeight / 1.75) + "px";

    felidsSelector.addEventListener("click", function () {
      felidsOptions.classList.toggle("disp-none");
    });

    felidsOptionList.forEach(function(option) {
      option.addEventListener("click", function () {
        const selectedOption = this.textContent.trim();
        felidsInput.value = selectedOption;
      });
    });

    if (veil) {
      veil.addEventListener("click", function(){
        felidsOptions.classList.toggle("disp-none");
      });
    }
  }

});
