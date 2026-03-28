const context = require.context(
  /*directory*/   '../tests',
  /*recursive*/   true,
  /*match files*/ /-spec.js$/
);

window.chai.should();
window.expect = window.chai.expect;
context.keys().forEach(context);
