const {Voonto} = window;
const app = Voonto.getInstance();
const inviews = app.components('inview');

if (inviews) {
  const options = {
    root: null,
    rootMargin: '0px',
    threshold: 1.0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const elem = entry.target;

        if (entry.intersectionRatio >= 0.75) {
          import(`./inview/${elem.getAttribute('data-voc-component-name')}`).then(({default: component}) => {
            component(elem);
          });
        }
      }
    });
  }, options);

  inviews.forEach((inview) => observer.observe(inview));
}
