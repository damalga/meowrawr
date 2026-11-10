// Filtros y búsqueda reactiva del grid de felinos (home)
(function() {
  const searchInput = document.getElementById('searchInput');
  const clearSearch = document.getElementById('clearSearch');
  const subfamilyFilter = document.getElementById('subfamilyFilter');
  const lineageFilter = document.getElementById('lineageFilter');
  const genusFilter = document.getElementById('genusFilter');
  const resetFilters = document.getElementById('resetFilters');
  const resultsCount = document.getElementById('resultsCount');
  const noResults = document.getElementById('noResults');
  const felinosGrid = document.getElementById('felinosGrid');
  if (!felinosGrid || !searchInput) return;
  const cards = Array.from(felinosGrid.querySelectorAll('.fcard'));

  // Normaliza para buscar sin tildes ni mayúsculas
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Poblar filtro de género dinámicamente
  function populateGenusFilter() {
    const genera = new Set(cards.map(card => card.dataset.genus).filter(Boolean));
    Array.from(genera).sort().forEach(genus => {
      const option = document.createElement('option');
      option.value = genus;
      option.textContent = genus;
      genusFilter.appendChild(option);
    });
  }

  function applyFilters() {
    const searchTerm = norm(searchInput.value.trim());
    const subfamily = subfamilyFilter.value;
    const lineage = lineageFilter.value;
    const genus = genusFilter.value;

    let visibleCount = 0;

    cards.forEach(card => {
      const visible =
        (!searchTerm || norm(card.dataset.search || card.dataset.name).includes(searchTerm)) &&
        (!subfamily || card.dataset.subfamily === subfamily) &&
        (!lineage || card.dataset.lineage === lineage) &&
        (!genus || card.dataset.genus === genus);

      card.hidden = !visible;
      if (visible) visibleCount++;
    });

    resultsCount.textContent = visibleCount;
    noResults.hidden = visibleCount !== 0;
    felinosGrid.hidden = visibleCount === 0;
    clearSearch.hidden = !searchTerm;
  }

  searchInput.addEventListener('input', applyFilters);
  subfamilyFilter.addEventListener('change', applyFilters);
  lineageFilter.addEventListener('change', applyFilters);
  genusFilter.addEventListener('change', applyFilters);

  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    applyFilters();
    searchInput.focus();
  });

  resetFilters.addEventListener('click', () => {
    searchInput.value = '';
    subfamilyFilter.value = '';
    lineageFilter.value = '';
    genusFilter.value = '';
    applyFilters();
  });

  // Preseleccionar filtros desde la query string (ej: /?subfamily=Pantherinae).
  // Sólo aplica valores que existen como <option>; ignora inputs inválidos.
  function applyQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const set = (select, value) => {
      if (!value) return;
      const opt = Array.from(select.options).find(o => o.value === value);
      if (opt) select.value = value;
    };
    set(subfamilyFilter, params.get('subfamily'));
    set(lineageFilter, params.get('lineage'));
    set(genusFilter, params.get('genus'));
    const search = params.get('q');
    if (search) searchInput.value = search;
  }

  populateGenusFilter();
  applyQueryParams();
  applyFilters();
})();
