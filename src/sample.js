export function sum(a, b) {
  return a + b;
}

export function retrieve() {
  return new Promise((resolve) => {
    setTimeout(resolve, 100, 'foo');
  });
}
