const { ipcRenderer } = require('electron');
const GeoapifyService = require('./js/services/GeoapifyService');
const TripRepository = require('./js/data/TripRepository');

// State
let geoapifyService;
let tripRepository;
let isSearching = false;
let requestToken = 0;

// DOM Elements
const destinationForm = document.getElementById('destinationForm');
const destinationInput = document.getElementById('destinationInput');
const destinationClearBtn = document.getElementById('destinationClearBtn');
const destinationSearchBtn = document.getElementById('destinationSearchBtn');
const destinationMessage = document.getElementById('destinationMessage');
const destinationResults = document.getElementById('destinationResults');
const tripsBadge = document.getElementById('tripsBadge');

function updateTripsBadge() {
  const count = tripRepository.getAll().length;
  tripsBadge.textContent = String(count);
  tripsBadge.hidden = count === 0;
}

function showDestinationMessage(text, isError) {
  destinationMessage.textContent = text;
  destinationMessage.className = isError ? 'message error-text' : 'message';
}

function setSearching(searching) {
  isSearching = searching;
  destinationSearchBtn.disabled = searching;
  destinationSearchBtn.textContent = searching ? 'Searching...' : 'Search';
}

async function searchDestinations() {
  if (isSearching) {
    return;
  }

  const query = destinationInput.value.trim();

  if (!query) {
    showDestinationMessage('Please enter a country or city name.', true);
    destinationResults.textContent = '';
    return;
  }

  const token = ++requestToken;
  setSearching(true);
  showDestinationMessage(`Searching for "${query}"...`, false);
  destinationResults.textContent = '';

  try {
    const destinations = await geoapifyService.autocompletePlaces(query);

    if (token !== requestToken) {
      return;
    }

    if (!destinations || destinations.length === 0) {
      showDestinationMessage(`No places found for "${query}". Try another city or country.`, false);
      return;
    }

    destinationMessage.textContent = '';
    renderDestinations(destinations);
  } catch (error) {
    if (token !== requestToken) {
      return;
    }

    showDestinationMessage(`Search failed: ${error.message}`, true);
  } finally {
    if (token === requestToken) {
      setSearching(false);
    }
  }
}

function renderDestinations(destinations) {
  destinationResults.textContent = '';

  for (const destination of destinations) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'destination-card';
    card.setAttribute('aria-label', `Explore ${destination.name}`);

    card.innerHTML = `
      <span class="destination-type">${destination.getTypeLabel()}</span>
      <span class="destination-name">${destination.getDisplayName()}</span>
      <span class="destination-formatted">${destination.formatted}</span>
    `;

    card.addEventListener('click', () => {
      sessionStorage.setItem(
        'currentDestination',
        JSON.stringify({
          name: destination.name,
          lat: destination.latitude,
          lon: destination.longitude,
          country: destination.country,
          country_code: destination.countryCode,
          state: destination.state,
          result_type: destination.resultType,
          formatted: destination.formatted,
          place_id: destination.placeId,
          bbox: destination.bbox,
        })
      );
      window.location.href = 'destination.html';
    });

    destinationResults.appendChild(card);
  }
}

function setupClearButton() {
  const updateVisibility = () => {
    destinationClearBtn.hidden = destinationInput.value.length === 0;
  };

  destinationInput.addEventListener('input', updateVisibility);

  destinationClearBtn.addEventListener('click', () => {
    destinationInput.value = '';
    destinationClearBtn.hidden = true;
    destinationMessage.textContent = '';
    destinationResults.textContent = '';
    destinationInput.focus();
  });
}

function setupQuickChips() {
  const chips = document.querySelectorAll('.quick-chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const query = chip.dataset.query;
      if (query) {
        destinationInput.value = query;
        destinationClearBtn.hidden = false;
        searchDestinations();
      }
    });
  });
}

async function start() {
  let apiKey = '';
  try {
    apiKey = await ipcRenderer.invoke('get-geoapify-key');
  } catch (error) {
    apiKey = '';
  }

  geoapifyService = new GeoapifyService(apiKey);
  tripRepository = new TripRepository();

  destinationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    searchDestinations();
  });

  setupClearButton();
  setupQuickChips();
  updateTripsBadge();

  if (!geoapifyService.hasApiKey()) {
    showDestinationMessage(
      'Geoapify API key is missing. Add geoapifyKey to .env.local and restart the app.',
      true
    );
    destinationInput.disabled = true;
    destinationSearchBtn.disabled = true;
  }
}

start().catch((error) => {
  if (destinationMessage) {
    destinationMessage.textContent = `Unable to start Discover: ${error.message}`;
    destinationMessage.className = 'message error-text';
  }
});
