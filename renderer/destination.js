const Destination = require('./js/models/Destination');
const OpenMeteoService = require('./js/services/OpenMeteoService');
const CountryService = require('./js/services/CountryService');
const CurrencyService = require('./js/services/CurrencyService');
const ActivityRecommender = require('./js/logics/ActivityRecommender');
const TripRepository = require('./js/data/TripRepository');
const Trip = require('./js/models/Trip');

// Services & State
const weatherService = new OpenMeteoService();
const countryService = new CountryService();
const currencyService = new CurrencyService();
const activityRecommender = new ActivityRecommender();
const tripRepository = new TripRepository();

let currentDestination = null;
let currentCountry = null;
let currentWeather = null;
let currentRecommendations = [];
let conversionDirection = 'myr_to_place';
let currenciesLoaded = false;
let toastTimeout = null;

// DOM Elements
const destinationType = document.getElementById('destinationType');
const destinationTitle = document.getElementById('destinationTitle');
const destinationSubtitle = document.getElementById('destinationSubtitle');
const saveTripBtn = document.getElementById('saveTripBtn');
const weatherInfo = document.getElementById('weatherInfo');
const countryInfo = document.getElementById('countryInfo');
const recommendationsInfo = document.getElementById('recommendationsInfo');
const appToast = document.getElementById('appToast');

// Currency DOM Elements
const currencyConverter = document.getElementById('currencyConverter');
const currencyForm = document.getElementById('currencyForm');
const currencyAmount = document.getElementById('currencyAmount');
const currencyFrom = document.getElementById('currencyFrom');
const currencyTo = document.getElementById('currencyTo');
const currencyFromStatic = document.getElementById('currencyFromStatic');
const currencyToStatic = document.getElementById('currencyToStatic');
const currencyFromLabel = document.getElementById('currencyFromLabel');
const currencyToLabel = document.getElementById('currencyToLabel');
const currencySwapBtn = document.getElementById('currencySwapBtn');
const currencyConvertBtn = document.getElementById('currencyConvertBtn');
const currencyResult = document.getElementById('currencyResult');
const currencyMessage = document.getElementById('currencyMessage');

// Modal DOM Elements
const tripModal = document.getElementById('tripModal');
const modalTitle = document.getElementById('modalTitle');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const tripForm = document.getElementById('tripForm');
const formDestinationName = document.getElementById('formDestinationName');
const formCountry = document.getElementById('formCountry');
const formTravelDate = document.getElementById('formTravelDate');
const formDuration = document.getElementById('formDuration');
const formTravelers = document.getElementById('formTravelers');
const formBudget = document.getElementById('formBudget');
const formNotes = document.getElementById('formNotes');
const formRecommendationsPreview = document.getElementById('formRecommendationsPreview');
const formErrorMessage = document.getElementById('formErrorMessage');

function showToast(message, type = 'success') {
  if (toastTimeout) clearTimeout(toastTimeout);
  appToast.textContent = message;
  appToast.className = `app-toast toast-${type}`;
  appToast.hidden = false;
  toastTimeout = setTimeout(() => { appToast.hidden = true; }, 4000);
}

// Weather & Country
async function loadWeather(dest) {
  try {
    currentWeather = await weatherService.getWeather(dest);
    weatherInfo.innerHTML = `
      <header class="panel-header"><h2>Current Weather</h2></header>
      <div class="weather-current">
        <span class="weather-temp">${currentWeather.getTemperatureLabel()}</span>
        <div class="weather-details">
          <p class="weather-desc">${currentWeather.getDescription()}</p>
          <p class="weather-meta">
            <span>Wind: ${currentWeather.getWindLabel()}</span>
            <span>Humidity: ${currentWeather.getHumidityLabel()}</span>
          </p>
        </div>
      </div>`;
    weatherInfo.hidden = false;
  } catch (error) {
    weatherInfo.innerHTML = `<header class="panel-header"><h2>Current Weather</h2></header><p class="panel-error">Unable to load weather: ${error.message}</p>`;
    weatherInfo.hidden = false;
  }
  updateRecommendations();
}

async function loadCountry(dest) {
  try {
    if (dest.countryCode) {
      currentCountry = await countryService.getCountry(dest.countryCode);
    }
    if (currentCountry) {
      countryInfo.innerHTML = `
        <header class="panel-header"><h2>About ${currentCountry.name}</h2></header>
        <div class="country-facts-grid">
          <div class="fact-item"><span class="fact-label">Capital</span><span class="fact-val">${currentCountry.capital || 'N/A'}</span></div>
          <div class="fact-item"><span class="fact-label">Region</span><span class="fact-val">${currentCountry.getRegionLabel() || 'N/A'}</span></div>
          <div class="fact-item"><span class="fact-label">Population</span><span class="fact-val">${currentCountry.getPopulationLabel() || 'N/A'}</span></div>
          <div class="fact-item"><span class="fact-label">Currency</span><span class="fact-val">${currentCountry.getCurrencyLabel() || 'N/A'}</span></div>
          <div class="fact-item"><span class="fact-label">Languages</span><span class="fact-val">${currentCountry.getLanguagesLabel() || 'N/A'}</span></div>
        </div>`;
      countryInfo.hidden = false;
    }
  } catch {
    countryInfo.innerHTML = '<header class="panel-header"><h2>About this Place</h2></header><p class="panel-error">No regional facts found for this location.</p>';
    countryInfo.hidden = false;
  }
  updateRecommendations();
  setupCurrencyConverter();
}

function updateRecommendations() {
  if (!currentDestination) return;
  const result = activityRecommender.recommend(currentDestination, currentCountry, currentWeather);
  currentRecommendations = result.suggestions || [];
  if (currentRecommendations.length === 0) {
    recommendationsInfo.hidden = true;
    return;
  }
  const itemsHtml = currentRecommendations.map((a) => `
    <article class="activity-card">
      <div class="activity-header"><span class="activity-best-time">${a.bestTime || 'Anytime'}</span></div>
      <h3 class="activity-title">${a.title}</h3>
      <p class="activity-desc">${a.description}</p>
    </article>`).join('');
  recommendationsInfo.innerHTML = `<header class="panel-header"><h2>Suggested Activities</h2></header><div class="activities-grid">${itemsHtml}</div>`;
  recommendationsInfo.hidden = false;
}

// Currency Converter
function getPlaceCurrencyCode() {
  return currentCountry?.currencies?.[0]?.code?.toUpperCase() || 'USD';
}

function updateCurrencyConverterUI() {
  const placeCurrency = getPlaceCurrencyCode();
  const isMyrToPlace = conversionDirection === 'myr_to_place';

  currencyFrom.hidden = !isMyrToPlace;
  currencyFromStatic.hidden = isMyrToPlace;
  if (currencyFromLabel) currencyFromLabel.hidden = !isMyrToPlace;
  if (!isMyrToPlace) currencyFromStatic.textContent = placeCurrency;

  currencyTo.hidden = isMyrToPlace;
  currencyToStatic.hidden = !isMyrToPlace;
  if (currencyToLabel) currencyToLabel.hidden = isMyrToPlace;
  if (isMyrToPlace) currencyToStatic.textContent = placeCurrency;
}

async function setupCurrencyConverter() {
  currencyConverter.hidden = false;
  try {
    if (!currenciesLoaded) {
      const currencies = await currencyService.getCurrencies();
      const optionsHtml = Object.entries(currencies)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([code, name]) => `<option value="${code}">${code} — ${name}</option>`)
        .join('');
      currencyFrom.innerHTML = optionsHtml;
      currencyTo.innerHTML = optionsHtml;
      currencyFrom.value = 'MYR';
      currencyTo.value = 'MYR';
      currenciesLoaded = true;
    }
    updateCurrencyConverterUI();
    currencyResult.hidden = true;
    currencyMessage.hidden = true;
  } catch (error) {
    currencyMessage.textContent = `Unable to load currencies: ${error.message}`;
    currencyMessage.hidden = false;
  }
}

async function handleCurrencySubmit(e) {
  e.preventDefault();
  const amount = Number(currencyAmount.value);
  const placeCurrency = getPlaceCurrencyCode();
  const isMyrToPlace = conversionDirection === 'myr_to_place';
  const from = isMyrToPlace ? (currencyFrom.value || 'MYR') : placeCurrency;
  const to = isMyrToPlace ? placeCurrency : (currencyTo.value || 'MYR');

  if (isNaN(amount) || amount <= 0) {
    currencyMessage.textContent = 'Please enter a valid amount greater than zero.';
    currencyMessage.hidden = false;
    currencyResult.hidden = true;
    return;
  }

  try {
    currencyConvertBtn.disabled = true;
    currencyConvertBtn.textContent = 'Converting...';
    const conv = await currencyService.convert(from, to, amount);
    currencyResult.innerHTML = `
      <span>${conv.getFormattedOriginalAmount()} =</span>
      <strong>${conv.getFormattedConvertedAmount()}</strong>
      <span class="rate-sub">Rate: ${conv.getExchangeRateLabel()}</span>`;
    currencyResult.hidden = false;
    currencyMessage.hidden = true;
  } catch (error) {
    currencyMessage.textContent = `Conversion failed: ${error.message}`;
    currencyMessage.hidden = false;
    currencyResult.hidden = true;
  } finally {
    currencyConvertBtn.disabled = false;
    currencyConvertBtn.textContent = 'Convert';
  }
}

// Modal & Save Trip
function openCreateTripModal() {
  if (!currentDestination) return;
  tripForm.reset();
  formErrorMessage.hidden = true;
  modalTitle.textContent = 'Save as Trip Plan';

  formDestinationName.value = currentDestination.name || '';
  formCountry.value = currentDestination.country || '';
  formTravelDate.value = new Date().toISOString().split('T')[0];
  formDuration.value = '5';
  formTravelers.value = '1';
  formBudget.value = '2000';

  const tripCurrency = currentCountry?.currencies?.[0]?.code || 'RM';
  const prefixEl = tripForm.querySelector('.currency-prefix');
  if (prefixEl) prefixEl.textContent = tripCurrency;

  formRecommendationsPreview.innerHTML = currentRecommendations.length > 0
    ? `<div class="form-recs-badges">${currentRecommendations.map((r) => `<span class="form-rec-chip">${r.title}</span>`).join('')}</div>`
    : '<span class="text-muted">No recommendations attached.</span>';

  tripModal.hidden = false;
}

function closeTripModal() {
  tripModal.hidden = true;
  tripForm.reset();
  formErrorMessage.hidden = true;
}

function handleTripFormSubmit(e) {
  e.preventDefault();
  const tripCurrency = currentCountry?.currencies?.[0]?.code || 'RM';
  const tripData = {
    destinationName: formDestinationName.value.trim(),
    destinationType: currentDestination ? currentDestination.getTypeLabel() : 'Destination',
    country: formCountry.value.trim(),
    countryCode: (currentDestination?.countryCode || '').trim().toUpperCase(),
    travelDate: formTravelDate.value,
    durationDays: Number(formDuration.value),
    travelers: Number(formTravelers.value),
    budget: Number(formBudget.value),
    currency: tripCurrency,
    notes: formNotes.value.trim(),
    recommendations: currentRecommendations.map((r) => ({ title: r.title, description: r.description })),
  };

  const validation = Trip.validate(tripData);
  if (!validation.isValid) {
    formErrorMessage.innerHTML = validation.errors.join('<br>');
    formErrorMessage.hidden = false;
    return;
  }

  try {
    tripRepository.create(tripData);
    showToast(`Trip to "${tripData.destinationName}" saved to My Trips!`);
    closeTripModal();
  } catch (error) {
    formErrorMessage.textContent = error.message;
    formErrorMessage.hidden = false;
  }
}

// Initialization
async function start() {
  const raw = sessionStorage.getItem('currentDestination') || localStorage.getItem('currentDestination');
  if (!raw) {
    window.location.href = 'discover.html';
    return;
  }

  try {
    currentDestination = Destination.create(JSON.parse(raw));
  } catch {
    window.location.href = 'discover.html';
    return;
  }

  destinationTitle.textContent = currentDestination.name;
  destinationSubtitle.textContent = currentDestination.formatted;
  destinationType.textContent = currentDestination.getTypeLabel();

  currencyForm.addEventListener('submit', handleCurrencySubmit);
  currencySwapBtn.addEventListener('click', () => {
    conversionDirection = conversionDirection === 'myr_to_place' ? 'place_to_myr' : 'myr_to_place';
    updateCurrencyConverterUI();
    currencyResult.hidden = true;
    currencyMessage.hidden = true;
  });

  saveTripBtn.addEventListener('click', openCreateTripModal);
  modalCloseBtn.addEventListener('click', closeTripModal);
  modalCancelBtn.addEventListener('click', closeTripModal);
  tripModal.addEventListener('click', (e) => { if (e.target === tripModal) closeTripModal(); });
  tripForm.addEventListener('submit', handleTripFormSubmit);

  loadWeather(currentDestination);
  loadCountry(currentDestination);
}

start().catch((error) => {
  console.error('Unable to load destination:', error);
});
