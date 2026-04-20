// ══════════════════════════════════════════
// CONFIGURACIÓN Y ESTADO
// ══════════════════════════════════════════
const API_KEY = "228099c79d4153ae0d3c0b43caf1e6b8";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/original";

let savedMovies = JSON.parse(localStorage.getItem('cinevault_saved')) || [];
let selectedGenres = [];

// ══════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    fetchPopularMovies();
    fetchGenres();
    updateSavedBadge();
    initSearchLogic();
    initCursorSpotlight();
    
    // Cerrar modal
    document.getElementById('modalClose').onclick = () => {
        document.getElementById('modalOverlay').classList.remove('open');
    };
});

// ── NAVEGACIÓN ─────────────────────────────
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-section');

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === `section-${target}`) sec.classList.add('active');
            });

            if (target === 'saved') renderSavedMovies();
        });
    });
}

// ── OBTENER PELÍCULAS POPULARES ─────────────
async function fetchPopularMovies() {
    const grid = document.getElementById('popularGrid');
    try {
        const response = await fetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=es-ES`);
        const data = await response.json();
        grid.innerHTML = '';
        renderMovies(data.results, grid);
    } catch (error) {
        showToast("Error de conexión");
    }
}

// ── LÓGICA DE GÉNEROS ───────────────────────
async function fetchGenres() {
    const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=es-ES`);
    const data = await response.json();
    const container = document.getElementById('genreChips');
    
    data.genres.forEach(genre => {
        const chip = document.createElement('span');
        chip.className = 'genre-chip'; // Coincide con tu CSS
        chip.textContent = genre.name;
        chip.onclick = () => {
            chip.classList.toggle('active');
            if (chip.classList.contains('active')) selectedGenres.push(genre.id);
            else selectedGenres = selectedGenres.filter(id => id !== genre.id);
            performSearch();
        };
        container.appendChild(chip);
    });
}

// ── RENDERIZADO DE CARDS ────────────────────
function renderMovies(movies, container) {
    movies.forEach(movie => {
        if (!movie.poster_path) return;

        const isSaved = savedMovies.some(m => m.id === movie.id);
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <div class="movie-card__poster-wrap">
                <img src="${IMAGE_BASE}${movie.poster_path}" class="movie-card__poster" alt="${movie.title}">
                <div class="movie-card__overlay"></div>
                <button class="btn-heart ${isSaved ? 'saved' : ''}" onclick="toggleSave(event, ${movie.id}, '${movie.title.replace(/'/g, "\\'")}', '${movie.poster_path}', '${movie.release_date}', ${movie.vote_average})">
                    <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
                <div class="movie-card__rating">⭐ ${movie.vote_average.toFixed(1)}</div>
            </div>
            <div class="movie-card__info">
                <h3 class="movie-card__title">${movie.title}</h3>
                <p class="movie-card__year">${movie.release_date ? movie.release_date.split('-')[0] : 'S/F'}</p>
            </div>
        `;
        card.onclick = (e) => {
            if (!e.target.closest('.btn-heart')) showMovieDetails(movie.id);
        };
        container.appendChild(card);
    });
}

// ── MANEJO DE FAVORITOS ─────────────────────
function toggleSave(event, id, title, poster_path, release_date, vote_average) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const movieData = { id, title, poster_path, release_date, vote_average };
    
    const index = savedMovies.findIndex(m => m.id === id);

    if (index > -1) {
        savedMovies.splice(index, 1);
        btn.classList.remove('saved');
        showToast("Eliminada de favoritos");
    } else {
        savedMovies.push(movieData);
        btn.classList.add('saved', 'pop');
        setTimeout(() => btn.classList.remove('pop'), 400);
        showToast("¡Añadida a tu Vault!");
    }

    localStorage.setItem('cinevault_saved', JSON.stringify(savedMovies));
    updateSavedBadge();
    if (document.getElementById('section-saved').classList.contains('active')) renderSavedMovies();
}

// ── DETALLES (MODAL) ────────────────────────
async function showMovieDetails(movieId) {
    const modalOverlay = document.getElementById('modalOverlay');
    try {
        const [det, cred, vid] = await Promise.all([
            fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=es-ES`).then(r => r.json()),
            fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}&language=es-ES`).then(r => r.json()),
            fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}&language=es-ES`).then(r => r.json())
        ]);

        document.getElementById('modalBackdrop').src = BACKDROP_BASE + det.backdrop_path;
        document.getElementById('modalPoster').src = IMAGE_BASE + det.poster_path;
        document.getElementById('modalTitle').textContent = det.title;
        document.getElementById('modalYear').textContent = det.release_date.split('-')[0];
        document.getElementById('modalScore').textContent = det.vote_average.toFixed(1);
        document.getElementById('modalOverview').textContent = det.overview;
        
        // Géneros en el modal
        const genreContainer = document.getElementById('modalGenres');
        genreContainer.innerHTML = det.genres.map(g => `<span class="modal__genre-tag">${g.name}</span>`).join('');

        modalOverlay.classList.add('open');
    } catch (e) {
        showToast("No se pudo cargar la información");
    }
}

// ── BUSCADOR ────────────────────────────────
function initSearchLogic() {
    const toggle = document.getElementById('filtersToggle');
    const body = document.getElementById('filtersBody');
    
    toggle.onclick = () => {
        toggle.classList.toggle('open');
        body.classList.toggle('open');
    };

    document.getElementById('searchInput').oninput = debounce(() => performSearch(), 600);
}

async function performSearch() {
    const query = document.getElementById('searchInput').value;
    const grid = document.getElementById('searchGrid');
    const empty = document.getElementById('searchEmpty');
    
    let url = query.length > 2 
        ? `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=es-ES`
        : `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${selectedGenres.join(',')}&language=es-ES`;

    const res = await fetch(url);
    const data = await res.json();
    
    grid.innerHTML = '';
    if (data.results.length > 0) {
        empty.classList.remove('visible');
        renderMovies(data.results, grid);
    } else {
        empty.classList.add('visible');
    }
}

// ── UTILS ───────────────────────────────────
function updateSavedBadge() {
    const badge = document.getElementById('savedBadge');
    badge.textContent = savedMovies.length;
    badge.style.display = savedMovies.length > 0 ? 'flex' : 'none';
}

function renderSavedMovies() {
    const grid = document.getElementById('savedGrid');
    const empty = document.getElementById('savedEmpty');
    grid.innerHTML = '';
    if (savedMovies.length === 0) empty.classList.add('visible');
    else {
        empty.classList.remove('visible');
        renderMovies(savedMovies, grid);
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.classList.add('show'); // Coincide con tu CSS .toast.show
    setTimeout(() => t.classList.remove('show'), 3000);
}

function debounce(f, d) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), d); };
}

function initCursorSpotlight() {
    const s = document.getElementById('cursorSpotlight');
    window.onmousemove = (e) => { s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; };
}