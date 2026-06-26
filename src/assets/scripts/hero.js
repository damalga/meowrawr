/* Document Ready */
document.addEventListener("DOMContentLoaded", function () {
  /* Pick N random felid tickets, remove the rest from the DOM */
  const tickets = document.querySelector(".tickets");
  if (tickets) {
    const count = parseInt(tickets.getAttribute("data-random-count"), 10) || 10;
    const felidTickets = Array.from(tickets.querySelectorAll(".felid-ticket"));
    const shuffled = [...felidTickets].sort(() => Math.random() - 0.5);
    shuffled.slice(count).forEach((t) => t.remove());
  }

  /* Selector de felinos */
  const felidsSelector = document.querySelector(".felids-selector");
  const felidsInput = document.querySelector(".felids-input");
  const felidsOptions = document.querySelector("ul.felids-options");
  const felidsOptionList = document.querySelectorAll("li.option");

  if (felidsSelector && felidsOptions) {
    felidsSelector.addEventListener("click", function (e) {
      e.stopPropagation();
      felidsOptions.classList.toggle("disp-none");
    });

    felidsOptionList.forEach(function (option) {
      option.addEventListener("click", function () {
        const selectedOption = this.textContent.trim();
        felidsInput.value = selectedOption;
      });
    });

    document.addEventListener("click", function () {
      felidsOptions.classList.add("disp-none");
    });
  }
});
