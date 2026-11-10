/* Cards volteables del grid de la home (con aparición al scroll y teclado).
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

  const cards = Array.from(grid.querySelectorAll(".fcard"));
  const visibleCards = () => cards.filter((c) => !c.hidden);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* ── Aparición al hacer scroll ──
   * Las cards entran con fundido + subida escalonada por fila. Sin JS, o con
   * prefers-reduced-motion, se ven todas desde el principio. */
  root.classList.add("js");
  if ("IntersectionObserver" in window && !reduceMotion) {
    cards.forEach((c) => c.classList.add("reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        let n = 0;
        entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
          .forEach((e) => {
            e.target.style.setProperty("--reveal-delay", Math.min(n++, 8) * 70 + "ms");
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    cards.forEach((c) => io.observe(c));
  }

  /* ── Teclado ──
   * Grid: flechas mueven el foco a la card vecina según su posición en pantalla
   *       (←/→ la anterior/siguiente, ↑/↓ la de la fila de arriba/abajo), Inicio/Fin
   *       saltan a la primera/última, Enter abre.
   * Ficha abierta: ←/→ pasan al felino anterior/siguiente, Tab queda dentro de la
   *       ficha y Escape cierra.
   * Global: "/" enfoca la búsqueda; ↓ desde la búsqueda baja a la primera card. */
  const fronts = () => visibleCards().map((c) => c.querySelector(".fcard-front"));

  function neighbour(from, dir) {
    const list = fronts();
    const i = list.indexOf(from);
    if (i < 0) return list[0];
    if (dir === "next") return list[i + 1] || from;
    if (dir === "prev") return list[i - 1] || from;
    if (dir === "first") return list[0];
    if (dir === "last") return list[list.length - 1];
    // arriba/abajo: la card más cercana en horizontal de la fila contigua
    const r = from.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const rows = list
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter((o) => (dir === "down" ? o.r.top > r.top + 4 : o.r.top < r.top - 4));
    if (!rows.length) return from;
    const nearestTop = dir === "down" ? Math.min(...rows.map((o) => o.r.top)) : Math.max(...rows.map((o) => o.r.top));
    return rows
      .filter((o) => Math.abs(o.r.top - nearestTop) < 4)
      .sort((a, b) => Math.abs(a.r.left + a.r.width / 2 - cx) - Math.abs(b.r.left + b.r.width / 2 - cx))[0].el;
  }

  function focusFront(el) {
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  }

  grid.addEventListener("focusin", (e) => {
    cards.forEach((c) => c.classList.remove("kb-focus"));
    const front = e.target.closest(".fcard-front");
    if (front && e.target.matches(":focus-visible")) front.closest(".fcard").classList.add("kb-focus");
  });
  grid.addEventListener("focusout", () => cards.forEach((c) => c.classList.remove("kb-focus")));

  function step(dir) {
    const list = visibleCards();
    const i = list.indexOf(openCard);
    const next = list[i + (dir === "next" ? 1 : -1)];
    if (!next) return;
    next.classList.add("is-in"); // por si aún no había aparecido
    next.scrollIntoView({ block: "center" });
    open(next);
  }

  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select";

    if (openCard) {
      if (e.key === "Tab") {
        const f = Array.from(
          openCard.querySelectorAll(".fcard-back button, .fcard-back a[href], .fcard-back [tabindex='0']")
        ).filter((el) => el.offsetParent !== null);
        const back = openCard.querySelector(".fcard-back");
        if (!f.length) { e.preventDefault(); back.focus(); return; }
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === back)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      } else if (!typing && (e.key === "ArrowRight" || e.key === "ArrowLeft") && !busy) {
        e.preventDefault();
        step(e.key === "ArrowRight" ? "next" : "prev");
      }
      return;
    }

    if (e.key === "/" && !typing) {
      e.preventDefault();
      document.getElementById("searchInput")?.focus();
      return;
    }
    if (e.target.id === "searchInput" && e.key === "ArrowDown") {
      const first = fronts()[0];
      if (first) { e.preventDefault(); focusFront(first); }
      return;
    }
    const front = e.target.closest && e.target.closest(".fcard-front");
    if (!front) return;
    const map = { ArrowRight: "next", ArrowLeft: "prev", ArrowDown: "down", ArrowUp: "up", Home: "first", End: "last" };
    if (!map[e.key]) return;
    e.preventDefault();
    const target = neighbour(front, map[e.key]);
    if (target === front && e.key === "ArrowUp") document.getElementById("searchInput")?.focus();
    else focusFront(target);
  });

  // Carga directa de /felino/:id/
  const initial = grid.dataset.open;
  if (initial && byId(initial)) {
    history.replaceState({ felid: true }, "", location.pathname + location.search);
    open(byId(initial), { push: false, animate: false });
  }
})();
