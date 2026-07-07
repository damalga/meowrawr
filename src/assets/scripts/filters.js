// Filtros y búsqueda reactiva para la página de felinos
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
  const cards = Array.from(document.querySelectorAll('.card'));

  // Poblar filtro de género dinámicamente
  function populateGenusFilter() {
    const genera = new Set();
    cards.forEach(card => {
      const genus = card.dataset.genus;
      if (genus) genera.add(genus);
    });

    const sortedGenera = Array.from(genera).sort();
    sortedGenera.forEach(genus => {
      const option = document.createElement('option');
      option.value = genus;
      option.textContent = genus;
      genusFilter.appendChild(option);
    });
  }

  // Función principal de filtrado
  function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const subfamily = subfamilyFilter.value;
    const lineage = lineageFilter.value;
    const genus = genusFilter.value;

    let visibleCount = 0;

    cards.forEach(card => {
      const cardName = card.dataset.name.toLowerCase();
      const cardSubfamily = card.dataset.subfamily;
      const cardLineage = card.dataset.lineage;
      const cardGenus = card.dataset.genus;

      const matchesSearch = !searchTerm || cardName.includes(searchTerm);
      const matchesSubfamily = !subfamily || cardSubfamily === subfamily;
      const matchesLineage = !lineage || cardLineage === lineage;
      const matchesGenus = !genus || cardGenus === genus;

      if (matchesSearch && matchesSubfamily && matchesLineage && matchesGenus) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // Actualizar contador
    resultsCount.textContent = visibleCount;

    // Mostrar/ocultar mensaje de "sin resultados"
    if (visibleCount === 0) {
      noResults.style.display = 'block';
      felinosGrid.style.display = 'none';
    } else {
      noResults.style.display = 'none';
      felinosGrid.style.display = 'grid';
    }

    // Mostrar/ocultar botón de limpiar búsqueda
    clearSearch.style.display = searchTerm ? 'block' : 'none';
  }

  // Event listeners
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

  // Preseleccionar filtros desde la query string (ej: /felinos/?subfamily=Pantherinae).
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

  // Inicializar
  populateGenusFilter();
  applyQueryParams();
  applyFilters();
})();
