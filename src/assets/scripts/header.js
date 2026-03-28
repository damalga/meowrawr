import $ from "jquery";

/* Document Ready */
$(function () {
  $('.clear-icon').on('click', function() {
    $('.search-input').val('');
  });
});
