import $ from "jquery";

/* Document Ready */
$(function () {
  function removeBars() {
    $("footer .footer-links ul li:not(:last-child)").each(function () {
      $(this)
        .contents()
        .filter(function () {
          return this.nodeType === 3 && $(this).text().trim() === "|";
        })
        .remove();
    });
  }

  function checkWindowSize() {
    if ($(window).width() < 1024) {
      removeBars();
    }
  }

  $(function () {
    checkWindowSize();
  });

  $(window).resize(function () {
    checkWindowSize();
  });
});
