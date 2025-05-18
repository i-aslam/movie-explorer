// omdb api key
const API_KEY = '4b27b95d';

// dom elements
const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const yearInput = document.getElementById('year-input');
const suggestionsList = document.getElementById('suggestions');
const resultsContainer = document.getElementById('results');
const paginationContainer = document.getElementById('pagination-controls');
const homeTitle = document.getElementById('home-title');
const homeDescription = document.getElementById('home-description');

// state variables
let searchTerm = '';
let currentPage = 1;
let totalResults = 0;
let debounceTimer = null;

// reset view when title is clicked
homeTitle.addEventListener('click', () => {
  input.value = '';
  yearInput.value = '';
  suggestionsList.innerHTML = '';
  resultsContainer.innerHTML = '';
  paginationContainer.innerHTML = '';  // clear pagination buttons
  homeDescription.style.display = 'block';
});

// autocomplete on typing
input.addEventListener('input', () => {
  clearTimeout(debounceTimer); // cancel previous timer
  const query = input.value.trim();
  if (query.length < 3) {
    suggestionsList.innerHTML = ''; // hide suggestions if too short
    return;
  }

  // debounce api call by 300ms
  debounceTimer = setTimeout(async () => {
    try {
      const response = await fetch(
        `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(query)}&page=1`
      );
      const data = await response.json();
      if (data.Response === 'True') {
        renderSuggestions(data.Search); // show up to 5 suggestions
      } else {
        suggestionsList.innerHTML = ''; // clear if no results
      }
    } catch {
      suggestionsList.innerHTML = ''; // clear on error
    }
  }, 300);
});

// render autocomplete suggestions
function renderSuggestions(movies) {
  suggestionsList.innerHTML = movies
    .slice(0, 5)
    .map(movie => `<li data-title="${movie.Title}">${movie.Title} (${movie.Year})</li>`)
    .join('');

    // fill input and search
  suggestionsList.querySelectorAll('li').forEach(item => {
    item.addEventListener('click', () => {
      input.value = item.dataset.title;
      suggestionsList.innerHTML = ''; // remove dropdown
      clearTimeout(debounceTimer); // cancel any pending fetch
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
  });
}

// handle form submit
form.addEventListener('submit', event => {
  event.preventDefault();
  clearTimeout(debounceTimer);   // cancel any pending autocomplete and clear suggestions
  suggestionsList.innerHTML = '';

  searchTerm = input.value.trim();
  currentPage = 1; // reset to first page

  if (!searchTerm) {
    alert('please enter a movie name');
    return;
  }
  searchMovies();
});

// fetch movie list and show pagination
async function searchMovies() {
  suggestionsList.innerHTML = ''; // clear any leftover suggestions
  homeDescription.style.display = 'none';
  resultsContainer.innerHTML = '<p>loading...</p>';
  paginationContainer.innerHTML = ''; //clear old pagination

  const year = yearInput.value.trim(); // optional year filter
  let url = `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(searchTerm)}&page=${currentPage}`;
  if (year) url += `&y=${encodeURIComponent(year)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.Response === 'True') {
      totalResults = parseInt(data.totalResults, 10); // save total
      displayResults(data.Search);
      showPagination();
    } else {
      resultsContainer.innerHTML = `<p>error: ${data.Error || 'no results found'}</p>`;
    }
  } catch {
    resultsContainer.innerHTML = '<p>network error please check your connection</p>';
  }
}

// render movie cards
function displayResults(movies) {
  resultsContainer.innerHTML = movies.map(movie => {
    const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : './no-poster-available.jpg'; // display this image when no poster is available
    return `
      <div class="card">
        <img src="${poster}" alt="${movie.Title}" onerror="this.onerror=null;this.src='./no-poster-available.jpg'">
        <h3>${movie.Title} (${movie.Year})</h3>
        <button class="action-button" data-id="${movie.imdbID}">Details</button>
      </div>
    `;
  }).join('');

  // attach click handlers to detail buttons
  document.querySelectorAll('.action-button').forEach(btn => {
    btn.addEventListener('click', () => fetchMovieDetails(btn.dataset.id));
  });
}

// show pagination buttons
function showPagination() {
  const totalPages = Math.ceil(totalResults / 10); // compute number of pages
  if (totalPages <= 1) return;

  // previous button if not on first page
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'previous';
    prevBtn.addEventListener('click', () => {
      currentPage--;
      searchMovies();
    });
    paginationContainer.appendChild(prevBtn);
  }

  // next button if more pages left
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'next';
    nextBtn.addEventListener('click', () => {
      currentPage++;
      searchMovies();
    });
    paginationContainer.appendChild(nextBtn);
  }
}

// fetch and show movie details
async function fetchMovieDetails(id) {
  homeDescription.style.display = 'none'; // hide intro if visible
  resultsContainer.innerHTML = '<p>loading details...</p>';
  paginationContainer.innerHTML = '';

  try {
    const response = await fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&i=${id}&plot=full`);
    const data = await response.json();
    if (data.Response === 'True') {
      showMovieDetails(data); // show detailed view
    } else {
      resultsContainer.innerHTML = `<p>error: ${data.Error || 'details not found'}</p>`;
    }
  } catch {
    resultsContainer.innerHTML = '<p>network error please try again later</p>';
  }
}

// display full movie details
function showMovieDetails(movie) { // if poster is missing
  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : 'no-poster-available.jpg';
  resultsContainer.innerHTML = `
    <div class="card" style="grid-column: span 2; text-align: left;">
      <img src="${poster}" alt="${movie.Title}" style="width:100%;max-width:300px;" onerror="this.onerror=null;this.src='no-poster-available.jpg'">
      <div>
        <h2>${movie.Title} (${movie.Year})</h2>
        <p><strong>imdb rating:</strong> ${movie.imdbRating}</p>
        <p><strong>genre:</strong> ${movie.Genre}</p>
        <p><strong>director:</strong> ${movie.Director}</p>
        <p><strong>actors:</strong> ${movie.Actors}</p>
        <p><strong>plot:</strong> ${movie.Plot}</p>
        <button class="action-button" onclick="searchMovies()">← back to results</button>
      </div>
    </div>
  `;
}