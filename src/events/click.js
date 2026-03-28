import sportsTabHandler from './click/sports-tab';

const {Voonto} = window;
const app = Voonto.getInstance();

app.component('logo').addEventListener('click', function() {
  import(/* webpackChunkName: "logo" */ './click/logo').then(({default: logo}) => {
    logo(this);
  });
});

app.component('footer-arrow').addEventListener('click', function() {
  console.log('footer arrow clicked');
});

app.component('sports-tab').addEventListener('click', sportsTabHandler);

/* header.js */
app.component('clear-icon').addEventListener('click', function() {
  app.component('search-input').val('');
});
