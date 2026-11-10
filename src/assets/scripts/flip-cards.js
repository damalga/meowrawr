/* Cards volteables del grid de la home.
 *
 * Click en una card: se saca del grid (dejando un hueco del mismo tamaño), se
 * centra en pantalla creciendo y gira 180° para mostrar la ficha. La URL pasa a
 * /felino/:id/ con history.pushState, sin salir de la home.
 * Click fuera (backdrop), botón × o Escape: vuelve a su sitio y la URL a "/".
 * Al cargar /felino/:id/ directamente, Eleventy sirve la misma home con
 * data-open en el grid y la ficha se abre al instante. */
(function () {
  const grid = document.getElementById("felinosGrid");
  const backdrop = document.getElementById("fcardBackdrop");
  if (!grid || !backdrop) return;

  const root = document.documentElement;
  const HOME_URL = "/";
  const PATH_RE = /^\/felino\/([^/]+)\/?$/;
  const homeTitle = grid.dataset.homeTitle || document.title;

  let openCard = null;
  let placeholder = null;
  let busy = false;

  const byId = (id) => document.getElementById("felino-" + id);

  // Ejecuta fn cuando acaba la transición de `el` (o por timeout si no hay
  // transición, p.ej. con prefers-reduced-motion).
  function afterTransition(el, fn) {
    const dur = parseFloat(getComputedStyle(el).transitionDuration) * 1000 || 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener("transitionend", onEnd);
      fn();
    };
    const onEnd = (e) => { if (e.target === el) finish(); };
    el.addEventListener("transitionend", onEnd);
    setTimeout(finish, dur + 80);
  }

  function setBox(el, r) {
    el.style.top = r.top + "px";
    el.style.left = r.left + "px";
    el.style.width = r.width + "px";
    el.style.height = r.height + "px";
  }

  function targetBox() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gutter = vw < 600 ? 12 : 32;
    const width = Math.min(1040, vw - gutter * 2);
    const height = Math.min(880, vh - gutter * 2);
    return { top: (vh - height) / 2, left: (vw - width) / 2, width, height };
  }

  function loadImages(card) {
    card.querySelectorAll(".fcard-back img[data-src]").forEach((img) => {
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
    });
  }

  function lockScroll(lock) {
    if (lock) {
      const sb = window.innerWidth - root.clientWidth;
      if (sb > 0) root.style.paddingRight = sb + "px";
      root.classList.add("fcard-lock");
    } else {
      root.classList.remove("fcard-lock");
      root.style.paddingRight = "";
    }
  }

  function setUrl(url, title, push) {
    document.title = title;
    if (!push || location.pathname === url) return;
    history.pushState({ felid: url !== HOME_URL }, "", url);
  }

  function open(card, { push = true, animate = true } = {}) {
    if (busy || !card || card === openCard) return;
    if (openCard) close({ push: false, animate: false });
    busy = true;
    openCard = card;
    loadImages(card);

    const rect = card.getBoundingClientRect();
    placeholder = document.createElement("div");
    placeholder.className = "fcard-placeholder";
    placeholder.style.height = rect.height + "px";
    card.before(placeholder);

    lockScroll(true);
    if (!animate) card.classList.add("no-anim");
    card.classList.add("is-active");
    setBox(card, rect);
    backdrop.hidden = false;
    card.offsetWidth; // fuerza reflow: punto de partida de la animación

    backdrop.classList.add("is-visible");
    card.classList.add("is-open");
    setBox(card, targetBox());

    const back = card.querySelector(".fcard-back");
    const settle = () => {
      card.classList.add("is-settled");
      card.classList.remove("no-anim");
      back.focus({ preventScroll: true });
      busy = false;
    };
    if (animate) afterTransition(card, settle);
    else { card.offsetWidth; settle(); }

    setUrl("/felino/" + card.dataset.id + "/", card.dataset.title + " — Meowrawr", push);
  }

  function close({ push = true, animate = true } = {}) {
    if (!openCard) return;
    if (busy && animate) return;
    busy = true;
    const card = openCard;
    const ph = placeholder;
    openCard = null;
    placeholder = null;

    if (!animate) card.classList.add("no-anim");
    card.classList.remove("is-open", "is-settled");
    backdrop.classList.remove("is-visible");
    setBox(card, ph.getBoundingClientRect());

    const finish = () => {
      card.classList.remove("is-active", "no-anim");
      card.removeAttribute("style");
      ph.remove();
      backdrop.hidden = true;
      lockScroll(false);
      card.querySelector(".fcard-front").focus({ preventScroll: true });
      busy = false;
    };
    if (animate) afterTransition(card, finish);
    else finish();

    setUrl(HOME_URL, homeTitle, push);
  }

  grid.addEventListener("click", (e) => {
    const front = e.target.closest(".fcard-front");
    if (front) {
      // Ctrl/Cmd/Shift/middle click: comportamiento normal del enlace
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(front.closest(".fcard"));
      return;
    }
    if (e.target.closest(".ficha-close")) close();
  });

  backdrop.addEventListener("click", () => close());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openCard) close();
  });

  window.addEventListener("resize", () => {
    if (openCard) setBox(openCard, targetBox());
  });

  window.addEventListener("popstate", () => {
    const m = location.pathname.match(PATH_RE);
    const card = m && byId(m[1]);
    if (card) open(card, { push: false });
    else close({ push: false });
  });

  // Carga directa de /felino/:id/
  const initial = grid.dataset.open;
  if (initial && byId(initial)) {
    history.replaceState({ felid: true }, "", location.pathname + location.search);
    open(byId(initial), { push: false, animate: false });
  }
})();
