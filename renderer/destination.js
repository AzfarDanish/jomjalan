const CountryService = require('./js/services/CountryService');
const OpenMeteoService = require('./js/services/OpenMeteoService');
const CurrencyService = require('./js/services/CurrencyService');
const ActivityRecommender = require('./js/logics/ActivityRecommender');
const TripRepository = require('./js/data/TripRepository');
const Destination = require('./js/models/Destination');
const Trip = require('./js/models/Trip');

// Services
let countryService;
let weatherService;
let currencyService;
let tripRepository;
const activityRecommender = new ActivityRecommender();

// Active Destination State
let currentDestination = null;
let currentCountry = null;
let currentWeather = null;
let currentRecommendations = [];
let currenciesLoaded = false;
let toastTimeout = null;

// Modal Form State
let attachedRecommendations = [];
let currentCountryCode = '';
let currentTripCurrency = 'RM';

// Request tokens to ignore outdated async responses
let countryRequestToken = 0;
let weatherRequestToken = 0;
let currencyRequestToken = 0;

// DOM Elements
const tripsBadge = document.getElementById('tripsBadge');
const appToast = document.getElementById('appToast');

const destinationType = document.getElementById('destinationType');
const destinationTitle = document.getElementById('destinationTitle');
const destinationSubtitle = document.getElementById('destinationSubtitle');
const saveTripBtn = document.getElementById('saveTripBtn');
const weatherInfo = document.getElementById('weatherInfo');
const countryInfo = document.getElementById('countryInfo');
const recommendationsInfo = document.getElementById('recommendationsInfo');

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

function updateTripsBadge() {
  const count = tripRepository.getAll().length;
  tripsBadge.textContent = String(count);
  tripsBadge.hidden = count === 0;
}

function showToast(message, type) {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  appToast.textContent = message;
  appToast.className = `app-toast toast-${type}`;
  appToast.hidden = false;

  toastTimeout = setTimeout(() => {
    appToast.hidden = true;
  }, 4000);
}

function clearPanel(panel) {
  panel.textContent = '';
  panel.hidden = true;
}

function showPanelLoading(panel, title, text) {
  panel.innerHTML = `
    <header class="panel-header"><h2>${title}</h2></header>
    <p class="panel-loading"><span class="loading-spinner"></span> ${text}</p>
  `;
  panel.hidden = false;
}

function showPanelError(panel, title, errorText) {
  panel.innerHTML = `
    <header class="panel-header"><h2>${title}</h2></header>
    <p class="panel-error">${errorText}</p>
  `;
  panel.hidden = false;
}

// -------------------------------------------------------------
// Weather & Country Display
// -------------------------------------------------------------

async function loadWeather(destination) {
  const token = ++weatherRequestToken;
  clearPanel(weatherInfo);

  try {
    showPanelLoading(weatherInfo, 'Current Weather', 'Fetching current weather...');
    const weather = await weatherService.getWeather(destination);

    if (token !== weatherRequestToken) return;

    currentWeather = weather;
    renderWeather(weather);
    updateRecommendations();
  } catch (error) {
    if (token !== weatherRequestToken) return;
    currentWeather = null;
    showPanelError(weatherInfo, 'Current Weather', `Unable to load weather: ${error.message}`);
    updateRecommendations();
  }
}

function renderWeather(weather) {
  weatherInfo.innerHTML = `
    <header class="panel-header"><h2>Current Weather</h2></header>
    <div class="weather-current">
      <span class="weather-temp">${weather.getTemperatureLabel()}</span>
      <div class="weather-details">
        <p class="weather-desc">${weather.getDescription()}</p>
        <p class="weather-meta">
          <span>Wind: ${weather.getWindLabel()}</span>
          <span>Humidity: ${weather.getHumidityLabel()}</span>
        </p>
      </div>
    </div>
  `;
  weatherInfo.hidden = false;
}

async function loadCountry(destination) {
  const token = ++countryRequestToken;
  clearPanel(countryInfo);

  try {
    showPanelLoading(countryInfo, 'About this Place', 'Fetching country facts...');
    let country = null;

    if (destination.countryCode) {
      try {
        country = await countryService.getCountry(destination.countryCode);
      } catch (e) {
        country = null;
      }
    }

    if (token !== countryRequestToken) return;

    currentCountry = country;

    if (country) {
      renderCountry(country);
    } else {
      showPanelError(countryInfo, 'About this Place', 'No regional facts found for this location.');
    }

    updateRecommendations();
    setupCurrencyConverter();
  } catch (error) {
    if (token !== countryRequestToken) return;
    currentCountry = null;
    showPanelError(countryInfo, 'About this Place', `Unable to load facts: ${error.message}`);
    updateRecommendations();
  }
}

function renderCountry(country) {
  countryInfo.innerHTML = `
    <header class="panel-header"><h2>About ${country.name}</h2></header>
    <div class="country-facts-grid">
      <div class="fact-item"><span class="fact-label">Capital</span><span class="fact-val">${country.capital || 'N/A'}</span></div>
      <div class="fact-item"><span class="fact-label">Region</span><span class="fact-val">${country.getRegionLabel() || 'N/A'}</span></div>
      <div class="fact-item"><span class="fact-label">Population</span><span class="fact-val">${country.getPopulationLabel() || 'N/A'}</span></div>
      <div class="fact-item"><span class="fact-label">Currency</span><span class="fact-val">${country.getCurrencyLabel() || 'N/A'}</span></div>
      <div class="fact-item"><span class="fact-label">Languages</span><span class="fact-val">${country.getLanguagesLabel() || 'N/A'}</span></div>
    </div>
  `;
  countryInfo.hidden = false;
}

// -------------------------------------------------------------
// Currency Converter
// -------------------------------------------------------------

// Conversion direction: 'myr_to_place' or 'place_to_myr'
let conversionDirection = 'myr_to_place';
let myrSideCurrency = 'MYR';

function getPlaceCurrencyCode() {
  if (currentCountry && currentCountry.currencies && currentCountry.currencies.length > 0) {
    const code = currentCountry.currencies[0].code;
    if (code) return code.toUpperCase();
  }
  return 'USD';
}

function updateCurrencyConverterUI() {
  const placeCurrency = getPlaceCurrencyCode();
  const selectEl = conversionDirection === 'myr_to_place' ? currencyFrom : currencyTo;

  if (selectEl.options.length > 0) {
    const hasOption = Array.from(selectEl.options).some((o) => o.value === myrSideCurrency);
    if (hasOption) {
      selectEl.value = myrSideCurrency;
    }
  }

  if (conversionDirection === 'myr_to_place') {
    // FROM: Select (editable, defaults to MYR)
    currencyFrom.hidden = false;
    currencyFromStatic.hidden = true;
    if (currencyFromLabel) currencyFromLabel.hidden = false;

    // TO: Static badge (place currency) - No label per requirements
    currencyTo.hidden = true;
    currencyToStatic.textContent = placeCurrency;
    currencyToStatic.hidden = false;
    if (currencyToLabel) currencyToLabel.hidden = true;
  } else {
    // FROM: Static badge (place currency) - No label per requirements
    currencyFrom.hidden = true;
    currencyFromStatic.textContent = placeCurrency;
    currencyFromStatic.hidden = false;
    if (currencyFromLabel) currencyFromLabel.hidden = true;

    // TO: Select (editable, defaults to MYR)
    currencyTo.hidden = false;
    currencyToStatic.hidden = true;
    if (currencyToLabel) currencyToLabel.hidden = false;
  }
}

async function setupCurrencyConverter() {
  const token = ++currencyRequestToken;

  try {
    currencyConverter.hidden = false;

    if (!currenciesLoaded) {
      const currencies = await currencyService.getCurrencies();
      if (token !== currencyRequestToken) return;
      populateCurrencySelects(currencies);
      currenciesLoaded = true;
    }

    if (token !== currencyRequestToken) return;

    updateCurrencyConverterUI();
    currencyResult.hidden = true;
    currencyMessage.hidden = true;
  } catch (error) {
    if (token !== currencyRequestToken) return;
    currencyConverter.hidden = false;
    currencyMessage.textContent = `Unable to load currencies: ${error.message}`;
    currencyMessage.hidden = false;
  }
}

function populateCurrencySelects(currencies) {
  currencyFrom.textContent = '';
  currencyTo.textContent = '';

  const sorted = Object.entries(currencies).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [code, name] of sorted) {
    const optFrom = document.createElement('option');
    optFrom.value = code;
    optFrom.textContent = `${code} — ${name}`;
    currencyFrom.appendChild(optFrom);

    const optTo = document.createElement('option');
    optTo.value = code;
    optTo.textContent = `${code} — ${name}`;
    currencyTo.appendChild(optTo);
  }
}

function handleCurrencySwap() {
  conversionDirection = conversionDirection === 'myr_to_place' ? 'place_to_myr' : 'myr_to_place';
  updateCurrencyConverterUI();
  currencyResult.hidden = true;
  currencyMessage.hidden = true;
}

async function handleCurrencySubmit(e) {
  e.preventDefault();

  const amount = Number(currencyAmount.value);
  const placeCurrency = getPlaceCurrencyCode();

  let from, to;
  if (conversionDirection === 'myr_to_place') {
    from = currencyFrom.value || myrSideCurrency;
    to = placeCurrency;
  } else {
    from = placeCurrency;
    to = currencyTo.value || myrSideCurrency;
  }

  currencyMessage.textContent = '';
  currencyMessage.hidden = true;
  currencyResult.hidden = true;

  if (isNaN(amount) || amount <= 0) {
    currencyMessage.textContent = 'Please enter a valid amount greater than zero.';
    currencyMessage.hidden = false;
    return;
  }

  try {
    currencyConvertBtn.disabled = true;
    currencyConvertBtn.textContent = 'Converting...';

    const conversion = await currencyService.convert(from, to, amount);
    currencyResult.innerHTML = `
      <span>${conversion.getFormattedOriginalAmount()} =</span>
      <strong>${conversion.getFormattedConvertedAmount()}</strong>
      <span class="rate-sub">Rate: ${conversion.getExchangeRateLabel()}</span>
    `;
    currencyResult.hidden = false;
  } catch (error) {
    currencyMessage.textContent = `Conversion failed: ${error.message}`;
    currencyMessage.hidden = false;
  } finally {
    currencyConvertBtn.disabled = false;
    currencyConvertBtn.textContent = 'Convert';
  }
}

// -------------------------------------------------------------
// Activity Recommendations
// -------------------------------------------------------------

function updateRecommendations() {
  if (!currentDestination) return;

  const result = activityRecommender.recommend(currentDestination, currentCountry, currentWeather);
  currentRecommendations = result.suggestions || [];
  renderRecommendations(currentRecommendations);
}

function renderRecommendations(suggestions) {
  clearPanel(recommendationsInfo);

  if (!suggestions || suggestions.length === 0) {
    return;
  }

  const itemsHtml = suggestions
    .map(
      (a) => `
      <article class="activity-card">
        <div class="activity-header">
          <span class="activity-category-tag">${a.category || 'Sightseeing'}</span>
          <span class="activity-best-time">${a.bestTime || 'Anytime'}</span>
        </div>
        <h3 class="activity-title">${a.title}</h3>
        <p class="activity-desc">${a.description}</p>
      </article>
    `
    )
    .join('');

  recommendationsInfo.innerHTML = `
    <header class="panel-header"><h2>Suggested Activities</h2></header>
    <div class="activities-grid">${itemsHtml}</div>
  `;
  recommendationsInfo.hidden = false;
}

// -------------------------------------------------------------
// Save as Trip Plan Modal
// -------------------------------------------------------------

function openCreateTripModal() {
  if (!currentDestination) return;

  tripForm.reset();
  formErrorMessage.textContent = '';
  formErrorMessage.hidden = true;
  attachedRecommendations = [];

  modalTitle.textContent = 'Save as Trip Plan';

  formDestinationName.value = currentDestination.name || '';
  formCountry.value = currentDestination.country || '';
  currentCountryCode = currentDestination.countryCode || '';

  const today = new Date().toISOString().split('T')[0];
  formTravelDate.value = today;
  formDuration.value = '5';
  formTravelers.value = '1';
  formBudget.value = '2000';

  if (currentCountry && currentCountry.currencies && currentCountry.currencies.length > 0) {
    currentTripCurrency = currentCountry.currencies[0].code || 'RM';
  } else {
    currentTripCurrency = 'RM';
  }

  const prefixEl = tripForm.querySelector('.currency-prefix');
  if (prefixEl) {
    prefixEl.textContent = currentTripCurrency;
  }

  if (currentRecommendations && currentRecommendations.length > 0) {
    attachedRecommendations = currentRecommendations.map((r) => ({
      title: r.title,
      category: r.category,
      description: r.description,
    }));
  }

  renderFormRecommendations();
  tripModal.hidden = false;
}

function renderFormRecommendations() {
  if (!attachedRecommendations || attachedRecommendations.length === 0) {
    formRecommendationsPreview.innerHTML = '<span class="text-muted">No recommendations attached.</span>';
    return;
  }

  const badgesHtml = attachedRecommendations
    .map((r) => `<span class="form-rec-chip">${r.title}</span>`)
    .join('');

  formRecommendationsPreview.innerHTML = `<div class="form-recs-badges">${badgesHtml}</div>`;
}

function closeTripModal() {
  tripModal.hidden = true;
  tripForm.reset();
  formErrorMessage.textContent = '';
  formErrorMessage.hidden = true;
}

function handleTripFormSubmit(e) {
  e.preventDefault();

  const tripData = {
    destinationName: formDestinationName.value.trim(),
    destinationType: currentDestination ? currentDestination.getTypeLabel() : 'Destination',
    country: formCountry.value.trim(),
    countryCode: currentCountryCode.trim().toUpperCase(),
    travelDate: formTravelDate.value,
    durationDays: Number(formDuration.value),
    travelers: Number(formTravelers.value),
    budget: Number(formBudget.value),
    currency: currentTripCurrency,
    notes: formNotes.value.trim(),
    recommendations: attachedRecommendations,
  };

  const validation = Trip.validate(tripData);
  if (!validation.isValid) {
    formErrorMessage.innerHTML = validation.errors.join('<br>');
    formErrorMessage.hidden = false;
    return;
  }

  try {
    tripRepository.create(tripData);
    showToast(`Trip to "${tripData.destinationName}" saved to My Trips!`, 'success');
    closeTripModal();
    updateTripsBadge();
  } catch (error) {
    formErrorMessage.textContent = error.message;
    formErrorMessage.hidden = false;
  }
}

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------

async function start() {
  const raw = sessionStorage.getItem('currentDestination') || localStorage.getItem('currentDestination');
  if (!raw) {
    window.location.href = 'discover.html';
    return;
  }

  try {
    currentDestination = new Destination(JSON.parse(raw));
  } catch (e) {
    window.location.href = 'discover.html';
    return;
  }

  countryService = new CountryService();
  weatherService = new OpenMeteoService();
  currencyService = new CurrencyService();
  tripRepository = new TripRepository();

  destinationTitle.textContent = currentDestination.name;
  destinationSubtitle.textContent = currentDestination.formatted;
  destinationType.textContent = currentDestination.getTypeLabel();
  destinationType.hidden = false;

  currencyForm.addEventListener('submit', handleCurrencySubmit);
  currencySwapBtn.addEventListener('click', handleCurrencySwap);
  currencyFrom.addEventListener('change', () => {
    myrSideCurrency = currencyFrom.value;
  });
  currencyTo.addEventListener('change', () => {
    myrSideCurrency = currencyTo.value;
  });

  saveTripBtn.addEventListener('click', openCreateTripModal);
  modalCloseBtn.addEventListener('click', closeTripModal);
  modalCancelBtn.addEventListener('click', closeTripModal);
  tripForm.addEventListener('submit', handleTripFormSubmit);

  tripModal.addEventListener('click', (e) => {
    if (e.target === tripModal) closeTripModal();
  });

  updateTripsBadge();

  loadWeather(currentDestination);
  loadCountry(currentDestination);
  setupCurrencyConverter();
}

start().catch((error) => {
  console.error('Unable to load destination:', error);
});
