const {Voonto} = window;
const app = Voonto.getInstance();
const foos = app.components('foo');

foos.forEach((foo) => {
  foo.innerText = `Hello, I am foo ${foo.getAttribute('data-item')} component`;
});
