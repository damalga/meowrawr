const {Voonto} = window;
const app = Voonto.getInstance();
const bar = app.component('bar');

if (bar) {
  bar.innerText = 'Hello, I am bar component';
}
