// The home page: search for a country or city, then browse its places by
// category. Places are only requested after the user picks a destination.
const PlaceCategoryCatalog = require('../logics/PlaceCategoryCatalog');
const { ActivityRecommender } = require('../logics/ActivityRecommender');
const Trip = require('../models/Trip');

class HomeApp {
  constructor(geoapifyService, countryService, weatherService, currencyService, tripRepository, unsplashService) {
    if (!geoapifyService || !countryService || !weatherService) {
      throw new Error(
        'HomeApp needs a Geoapify service, a country service and a weather service.'
      );
    }

    this.geoapifyService = geoapifyService;
    this.countryService = countryService;
    this.weatherService = weatherService;
    this.currencyService = currencyService;
    this.tripRepository = tripRepository;
    this.unsplashService = unsplashService;
    this.categoryCatalog = new PlaceCategoryCatalog();
    this.activityRecommender = new ActivityRecommender();
    this.pageSize = geoapifyService.getPageSize();

    // App Navigation & Toasts
    this.navDiscoverBtn = document.getElementById('navDiscoverBtn');
    this.navTripsBtn = document.getElementById('navTripsBtn');
    this.tripsBadge = document.getElementById('tripsBadge');
    this.appToast = document.getElementById('appToast');
    this.toastTimeout = null;

    // Discover & Destination Views
    this.destinationForm = document.getElementById('destinationForm');
    this.destinationInput = document.getElementById('destinationInput');
    this.destinationClearBtn = document.getElementById('destinationClearBtn');
    this.destinationSearchButton = document.getElementById('destinationSearchBtn');
    this.destinationMessage = document.getElementById('destinationMessage');
    this.destinationResults = document.getElementById('destinationResults');

    this.discoverView = document.getElementById('discoverView');
    this.destinationView = document.getElementById('destinationView');
    this.backButton = document.getElementById('backBtn');
    this.destinationCover = document.getElementById('destinationCover');
    this.destinationCoverCredit = document.getElementById('destinationCoverCredit');
    this.destinationType = document.getElementById('destinationType');
    this.destinationTitle = document.getElementById('destinationTitle');
    this.destinationSubtitle = document.getElementById('destinationSubtitle');
    this.saveTripBtn = document.getElementById('saveTripBtn');
    this.photosMessage = document.getElementById('photosMessage');
    this.weatherInfo = document.getElementById('weatherInfo');
    this.countryInfo = document.getElementById('countryInfo');
    this.recommendationsInfo = document.getElementById('recommendationsInfo');
    this.currencyConverter = document.getElementById('currencyConverter');
    this.currencyForm = document.getElementById('currencyForm');
    this.currencyAmount = document.getElementById('currencyAmount');
    this.currencyFrom = document.getElementById('currencyFrom');
    this.currencyTo = document.getElementById('currencyTo');
    this.currencySwapBtn = document.getElementById('currencySwapBtn');
    this.currencyResult = document.getElementById('currencyResult');
    this.currencyMessage = document.getElementById('currencyMessage');
    this.categoryFilters = document.getElementById('categoryFilters');
    this.poiMessage = document.getElementById('poiMessage');
    this.poiResults = document.getElementById('poiResults');

    // My Trips View Elements
    this.tripsView = document.getElementById('tripsView');
    this.tripsMessage = document.getElementById('tripsMessage');
    this.tripsEmptyState = document.getElementById('tripsEmptyState');
    this.emptyStateDiscoverBtn = document.getElementById('emptyStateDiscoverBtn');
    this.tripsGrid = document.getElementById('tripsGrid');

    // Trip Modal Elements
    this.tripModal = document.getElementById('tripModal');
    this.modalTitle = document.getElementById('modalTitle');
    this.modalCloseBtn = document.getElementById('modalCloseBtn');
    this.modalCancelBtn = document.getElementById('modalCancelBtn');
    this.tripForm = document.getElementById('tripForm');
    this.tripIdInput = document.getElementById('tripId');
    this.formDestinationName = document.getElementById('formDestinationName');
    this.formCountry = document.getElementById('formCountry');
    this.formTravelDate = document.getElementById('formTravelDate');
    this.formDuration = document.getElementById('formDuration');
    this.formTravelers = document.getElementById('formTravelers');
    this.formBudget = document.getElementById('formBudget');
    this.formNotes = document.getElementById('formNotes');
    this.formRecommendationsGroup = document.getElementById('formRecommendationsGroup');
    this.formRecommendationsPreview = document.getElementById('formRecommendationsPreview');
    this.formErrorMessage = document.getElementById('formErrorMessage');

    // Delete Confirmation Modal Elements
    this.deleteModal = document.getElementById('deleteModal');
    this.deleteModalCloseBtn = document.getElementById('deleteModalCloseBtn');
    this.deleteCancelBtn = document.getElementById('deleteCancelBtn');
    this.deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
    this.deleteTripDestination = document.getElementById('deleteTripDestination');
    this.pendingDeleteTripId = null;

    this.isSearching = false;
    this.isLoadingPois = false;
    this.destination = null;
    this.currentCountry = null;
    this.currentWeather = null;
    this.currentRecommendations = [];
    this.selectedCategory = null;
    this.offset = 0;
    this.seenPoiIds = new Set();
    this.requestToken = 0;
    this.countryRequestToken = 0;
    this.weatherRequestToken = 0;
    this.currencyRequestToken = 0;
    this.photosRequestToken = 0;
    this.currenciesLoaded = false;
  }

  start() {
    // Navigation listeners
    if (this.navDiscoverBtn) {
      this.navDiscoverBtn.addEventListener('click', () => {
        this.showDiscoverView();
      });
    }

    if (this.navTripsBtn) {
      this.navTripsBtn.addEventListener('click', () => {
        this.showTripsView();
      });
    }

    if (this.emptyStateDiscoverBtn) {
      this.emptyStateDiscoverBtn.addEventListener('click', () => {
        this.showDiscoverView();
      });
    }

    // Quick destination recommendation chips
    const quickChips = document.querySelectorAll('.quick-chip');
    quickChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const query = chip.dataset.query;
        if (query && this.destinationInput) {
          this.destinationInput.value = query;
          if (this.destinationClearBtn) {
            this.destinationClearBtn.hidden = false;
          }
          this.searchDestinations();
        }
      });
    });

    // Clear search input button
    if (this.destinationInput && this.destinationClearBtn) {
      this.destinationInput.addEventListener('input', () => {
        this.destinationClearBtn.hidden = !this.destinationInput.value.trim();
      });

      this.destinationClearBtn.addEventListener('click', () => {
        this.destinationInput.value = '';
        this.destinationClearBtn.hidden = true;
        this.destinationInput.focus();
      });
    }

    // Save as Trip Plan button on Destination page
    if (this.saveTripBtn) {
      this.saveTripBtn.addEventListener('click', () => {
        this.openCreateTripModalFromDestination();
      });
    }

    // Trip Modal events
    if (this.modalCloseBtn) {
      this.modalCloseBtn.addEventListener('click', () => {
        this.closeTripModal();
      });
    }

    if (this.modalCancelBtn) {
      this.modalCancelBtn.addEventListener('click', () => {
        this.closeTripModal();
      });
    }

    if (this.tripForm) {
      this.tripForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleTripFormSubmit();
      });
    }

    // Delete Modal events
    if (this.deleteModalCloseBtn) {
      this.deleteModalCloseBtn.addEventListener('click', () => {
        this.closeDeleteModal();
      });
    }

    if (this.deleteCancelBtn) {
      this.deleteCancelBtn.addEventListener('click', () => {
        this.closeDeleteModal();
      });
    }

    if (this.deleteConfirmBtn) {
      this.deleteConfirmBtn.addEventListener('click', () => {
        this.handleConfirmDelete();
      });
    }

    this.destinationForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.searchDestinations();
    });

    this.backButton.addEventListener('click', () => {
      this.showDiscoverView();
    });

    if (this.currencyForm) {
      this.currencyForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.performCurrencyConversion();
      });
    }

    if (this.currencySwapBtn) {
      this.currencySwapBtn.addEventListener('click', () => {
        this.swapCurrencies();
      });
    }

    if (this.currencyFrom) {
      this.currencyFrom.addEventListener('change', () => {
        this.performCurrencyConversion();
      });
    }

    if (this.currencyTo) {
      this.currencyTo.addEventListener('change', () => {
        this.performCurrencyConversion();
      });
    }

    if (!this.geoapifyService.hasApiKey()) {
      this.showDestinationMessage(
        'Geoapify API key is missing. Add geoapifyKey to .env.local and restart the app.',
        true
      );
      this.destinationInput.disabled = true;
      this.destinationSearchButton.disabled = true;
    }

    // Initialize badge count
    this.updateTripsBadge();
  }

  async searchDestinations() {
    if (this.isSearching) {
      return;
    }

    const query = this.destinationInput.value.trim();

    if (!query) {
      this.clearDestinationResults();
      this.showDestinationMessage('Please enter a country or city name.', true);
      return;
    }

    this.isSearching = true;
    this.setSearching(true);
    this.clearDestinationResults();
    this.showDestinationMessage('Searching countries and cities...', false);

    try {
      const destinations = await this.geoapifyService.searchDestinations(query);

      if (destinations.length === 0) {
        this.showDestinationMessage(
          `No country or city found for "${query}".`,
          true
        );
        return;
      }

      this.showDestinationMessage('', false);
      this.renderDestinations(destinations);
    } catch (error) {
      this.showDestinationMessage(error.message, true);
    } finally {
      this.isSearching = false;
      this.setSearching(false);
    }
  }

  renderDestinations(destinations) {
    this.destinationResults.textContent = '';

    for (const destination of destinations) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'destination-card';
      button.setAttribute('aria-label', `Explore ${destination.getDisplayName()}`);

      const type = document.createElement('span');
      type.className = 'destination-type';
      type.textContent = destination.getTypeLabel();

      const name = document.createElement('span');
      name.className = 'destination-name';
      name.textContent = destination.getDisplayName();

      const formatted = document.createElement('span');
      formatted.className = 'destination-formatted';
      formatted.textContent = destination.formatted;

      button.append(type, name, formatted);
      button.addEventListener('click', () => {
        this.openDestination(destination);
      });

      this.destinationResults.appendChild(button);
    }
  }

  async openDestination(destination) {
    this.destination = destination;
    this.currentCountry = null;
    this.currentWeather = null;
    this.selectedCategory = this.categoryCatalog.getDefaultGroup();
    this.offset = 0;
    this.seenPoiIds.clear();
    this.poiResults.textContent = '';

    this.destinationType.textContent = destination.getTypeLabel();
    this.destinationTitle.textContent = destination.getDisplayName();
    this.destinationSubtitle.textContent = destination.formatted;

    this.renderCategoryChips();
    this.clearRecommendations();
    this.clearCurrencyConverter();
    this.clearPhotos();
    this.discoverView.hidden = true;
    this.destinationView.hidden = false;
    window.scrollTo(0, 0);

    // Weather, country facts, and photos load in the background so places are not delayed.
    this.loadWeather(destination);
    this.loadCountryInfo(destination);
    this.loadPhotos(destination);
    await this.loadPois({ reset: true });
  }

  // Ask Open-Meteo about the destination's coordinates. This runs separately
  // from the place search, so one failure does not block the other.
  async loadWeather(destination) {
    if (!this.weatherInfo) {
      return;
    }

    const requestToken = ++this.weatherRequestToken;
    this.clearWeather();

    try {
      const weather = await this.weatherService.getWeather(destination);

      if (requestToken !== this.weatherRequestToken) {
        return;
      }

      this.currentWeather = weather;
      this.renderWeather(weather);
      this.updateRecommendations();
    } catch (error) {
      if (requestToken !== this.weatherRequestToken) {
        return;
      }

      this.currentWeather = null;
      this.showWeatherMessage(error.message);
      this.updateRecommendations();
    }
  }

  renderWeather(weather) {
    this.weatherInfo.textContent = '';

    const current = document.createElement('div');
    current.className = 'weather-current';

    const temperature = document.createElement('span');
    temperature.className = 'weather-temperature';
    temperature.textContent = weather.getTemperatureLabel();

    const description = document.createElement('span');
    description.className = 'weather-description';
    description.textContent = weather.getDescription();

    current.append(temperature, description);

    const facts = [
      { label: 'Feels like', value: weather.getFeelsLikeLabel() },
      { label: 'Humidity', value: weather.getHumidityLabel() },
      { label: 'Wind', value: weather.getWindLabel() },
      { label: 'Wind gusts', value: weather.getWindGustLabel() },
      { label: 'Precipitation', value: weather.getPrecipitationLabel() },
      { label: 'Cloud cover', value: weather.getCloudCoverLabel() },
      { label: 'Today', value: weather.getTemperatureRangeLabel() },
    ].filter((fact) => fact.value);

    this.weatherInfo.append(current, this.createFactList(facts));
    this.weatherInfo.hidden = false;
  }

  showWeatherMessage(text) {
    if (!this.weatherInfo) {
      return;
    }

    const message = document.createElement('p');
    message.className = 'info-message';
    message.textContent = text;

    this.weatherInfo.textContent = '';
    this.weatherInfo.appendChild(message);
    this.weatherInfo.hidden = false;
  }

  clearWeather() {
    if (!this.weatherInfo) {
      return;
    }

    this.weatherInfo.textContent = '';
    this.weatherInfo.hidden = true;
  }

  clearPhotos() {
    if (this.destinationCover) {
      this.destinationCover.hidden = true;
      this.destinationCover.style.backgroundImage = 'none';
    }
    if (this.destinationCoverCredit) {
      this.destinationCoverCredit.textContent = '';
    }
    if (this.photosMessage) {
      this.photosMessage.textContent = '';
      this.photosMessage.hidden = true;
    }
  }

  // Load a single photo from Unsplash for the destination hero cover banner asynchronously
  async loadPhotos(destination) {
    if (!this.destinationCover || !this.unsplashService) {
      return;
    }

    if (!this.unsplashService.hasAccessKey()) {
      return; // If user hasn't configured Unsplash key, keep banner hidden without breaking page
    }

    const requestToken = ++this.photosRequestToken;
    this.clearPhotos();

    try {
      // Use clean destination query: name or city
      const query = destination.isCountry()
        ? destination.name
        : (destination.name || destination.getDisplayName());

      // Fetch 1 landscape photo for the background cover
      const photos = await this.unsplashService.searchPhotos(query, 1);

      if (requestToken !== this.photosRequestToken) {
        return; // Prevent outdated response from replacing newer search
      }

      if (photos.length === 0) {
        return; // Minimalist approach: simply don't show cover if no photo found
      }

      this.renderCoverPhoto(photos[0]);
    } catch (error) {
      if (requestToken !== this.photosRequestToken) {
        return;
      }
      // Silently fail or log, without disrupting destination details
      console.warn('Unsplash cover photo error:', error);
    }
  }

  renderCoverPhoto(photo) {
    if (!this.destinationCover) {
      return;
    }

    const imageUrl = photo.urls.regular || photo.urls.full || photo.urls.small;
    this.destinationCover.style.backgroundImage = `url("${imageUrl}")`;
    this.destinationCover.hidden = false;

    // Track download per Unsplash API guidelines
    if (photo.links.downloadLocation) {
      this.unsplashService.triggerDownload(photo.links.downloadLocation);
    }

    if (this.destinationCoverCredit) {
      this.destinationCoverCredit.textContent = '';

      const photographerLink = document.createElement('a');
      photographerLink.href = photo.getPhotographerAttributionUrl();
      photographerLink.target = '_blank';
      photographerLink.rel = 'noopener noreferrer';
      photographerLink.textContent = photo.photographer.name;

      const unsplashLink = document.createElement('a');
      unsplashLink.href = photo.getUnsplashReferralUrl();
      unsplashLink.target = '_blank';
      unsplashLink.rel = 'noopener noreferrer';
      unsplashLink.textContent = 'Unsplash';

      this.destinationCoverCredit.append('Photo by ', photographerLink, ' on ', unsplashLink);
    }
  }

  // Build the shared label/value grid used by the weather and country panels.
  createFactList(facts) {
    const list = document.createElement('dl');
    list.className = 'info-facts';

    for (const fact of facts) {
      const item = document.createElement('div');
      item.className = 'info-fact';

      const label = document.createElement('dt');
      label.textContent = fact.label;

      const value = document.createElement('dd');
      value.textContent = fact.value;

      item.append(label, value);
      list.appendChild(item);
    }

    return list;
  }

  // Ask the country service about the destination's country. This runs
  // separately from the place search, so one failure does not block the other.
  async loadCountryInfo(destination) {
    if (!this.countryInfo) {
      return;
    }

    const requestToken = ++this.countryRequestToken;
    this.clearCountryInfo();

    if (!destination.countryCode) {
      return;
    }

    try {
      const country = await this.countryService.getCountry(
        destination.countryCode
      );

      if (requestToken !== this.countryRequestToken) {
        return;
      }

      this.currentCountry = country;
      this.renderCountryInfo(country, destination);
      this.updateRecommendations();
      this.initCurrencyConverter(country);
    } catch (error) {
      if (requestToken !== this.countryRequestToken) {
        return;
      }

      this.currentCountry = null;
      this.showCountryInfoMessage(error.message);
      this.updateRecommendations();
      this.initCurrencyConverter(null);
    }
  }

  renderCountryInfo(country, destination) {
    const facts = [
      { label: 'Capital', value: country.capital },
      { label: 'Region', value: country.getRegionLabel() },
      { label: 'Population', value: country.getPopulationLabel() },
      { label: 'Area', value: country.getAreaLabel() },
      { label: 'Currency', value: country.getCurrencyLabel() },
      { label: 'Languages', value: country.getLanguagesLabel() },
      { label: 'Calling code', value: country.getCallingCodeLabel() },
      { label: 'Time zone', value: country.getTimeZoneLabel() },
    ].filter((fact) => fact.value);

    this.countryInfo.textContent = '';

    const summary = document.createElement('div');
    summary.className = 'info-summary';

    const flagIcon = document.createElement('span');
    flagIcon.className = 'material-symbols-sharp info-flag-icon';
    flagIcon.textContent = 'flag';
    summary.appendChild(flagIcon);

    // A country page already shows the name in the heading, so only add it
    // when the destination is a city inside that country.
    if (!destination.isCountry()) {
      const name = document.createElement('span');
      name.className = 'info-name';
      name.textContent = country.name;
      summary.appendChild(name);
    }

    this.countryInfo.append(summary, this.createFactList(facts));
    this.countryInfo.hidden = false;
  }

  showCountryInfoMessage(text) {
    if (!this.countryInfo) {
      return;
    }

    const message = document.createElement('p');
    message.className = 'info-message';
    message.textContent = text;

    this.countryInfo.textContent = '';
    this.countryInfo.appendChild(message);
    this.countryInfo.hidden = false;
  }

  clearCountryInfo() {
    if (!this.countryInfo) {
      return;
    }

    this.countryInfo.textContent = '';
    this.countryInfo.hidden = true;
  }

  clearCurrencyConverter() {
    if (!this.currencyConverter) {
      return;
    }

    this.currencyConverter.hidden = true;
    if (this.currencyResult) {
      this.currencyResult.textContent = '';
      this.currencyResult.hidden = true;
    }
    if (this.currencyMessage) {
      this.currencyMessage.textContent = '';
      this.currencyMessage.className = 'currency-message';
    }
  }

  // Setup the currency options and initiate the initial calculation.
  async initCurrencyConverter(country) {
    if (!this.currencyConverter || !this.currencyService) {
      return;
    }

    const requestToken = ++this.currencyRequestToken;
    this.clearCurrencyConverter();
    this.currencyConverter.hidden = false;

    try {
      const currencies = await this.currencyService.getCurrencies();
      if (requestToken !== this.currencyRequestToken) {
        return;
      }

      this.populateCurrencyDropdowns(currencies);

      // Determine local destination currency if available in Frankfurter API.
      let destinationCurrencyCode = '';
      if (country && Array.isArray(country.currencies) && country.currencies[0]) {
        destinationCurrencyCode = (country.currencies[0].code || '').toUpperCase();
      }

      // Default Base currency: 'MYR' (since this is JomJalan in Malaysia) or 'USD' if MYR isn't found.
      const defaultBase = currencies['MYR'] ? 'MYR' : 'USD';
      if (this.currencyFrom.value !== defaultBase && currencies[defaultBase]) {
        this.currencyFrom.value = defaultBase;
      }

      // If destination currency is supported, select it as 'To'.
      if (destinationCurrencyCode && currencies[destinationCurrencyCode]) {
        this.currencyTo.value = destinationCurrencyCode;
        this.showCurrencyMessage('', false);
      } else if (destinationCurrencyCode) {
        // Destination currency not supported by Frankfurter
        const fallbackTo = defaultBase === 'USD' ? 'EUR' : 'USD';
        this.currencyTo.value = fallbackTo;
        this.showCurrencyMessage(
          `Note: Local currency (${destinationCurrencyCode}) is not tracked by the European Central Bank. Showing ${fallbackTo} instead.`,
          false
        );
      } else {
        this.currencyTo.value = defaultBase === 'USD' ? 'EUR' : 'USD';
      }

      await this.performCurrencyConversion();
    } catch (error) {
      if (requestToken !== this.currencyRequestToken) {
        return;
      }
      this.showCurrencyMessage(error.message, true);
    }
  }

  populateCurrencyDropdowns(currencies) {
    if (this.currenciesLoaded) {
      return;
    }

    const entries = Object.entries(currencies).sort(([a], [b]) => a.localeCompare(b));

    const buildOptions = () => {
      const fragment = document.createDocumentFragment();
      for (const [code, name] of entries) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${code} — ${name}`;
        fragment.appendChild(option);
      }
      return fragment;
    };

    this.currencyFrom.textContent = '';
    this.currencyFrom.appendChild(buildOptions());

    this.currencyTo.textContent = '';
    this.currencyTo.appendChild(buildOptions());

    this.currenciesLoaded = true;
  }

  swapCurrencies() {
    if (!this.currencyFrom || !this.currencyTo) {
      return;
    }

    const temp = this.currencyFrom.value;
    this.currencyFrom.value = this.currencyTo.value;
    this.currencyTo.value = temp;

    this.performCurrencyConversion();
  }

  async performCurrencyConversion() {
    if (!this.currencyService || !this.currencyConverter) {
      return;
    }

    const amountValue = this.currencyAmount ? this.currencyAmount.value.trim() : '';
    const fromCode = this.currencyFrom ? this.currencyFrom.value : '';
    const toCode = this.currencyTo ? this.currencyTo.value : '';

    if (!amountValue) {
      this.showCurrencyMessage('Please enter an amount to convert.', true);
      if (this.currencyResult) {
        this.currencyResult.hidden = true;
      }
      return;
    }

    const amount = Number(amountValue);
    if (isNaN(amount) || amount <= 0) {
      this.showCurrencyMessage('Please enter a valid amount greater than zero.', true);
      if (this.currencyResult) {
        this.currencyResult.hidden = true;
      }
      return;
    }

    if (!fromCode || !toCode) {
      this.showCurrencyMessage('Please choose both source and target currencies.', true);
      return;
    }

    const requestToken = ++this.currencyRequestToken;

    try {
      const conversion = await this.currencyService.convert(fromCode, toCode, amount);
      if (requestToken !== this.currencyRequestToken) {
        return;
      }

      this.renderCurrencyResult(conversion);
      this.showCurrencyMessage('', false);
    } catch (error) {
      if (requestToken !== this.currencyRequestToken) {
        return;
      }
      if (this.currencyResult) {
        this.currencyResult.hidden = true;
      }
      this.showCurrencyMessage(error.message, true);
    }
  }

  renderCurrencyResult(conversion) {
    if (!this.currencyResult) {
      return;
    }

    this.currencyResult.textContent = '';

    const primaryBox = document.createElement('div');
    primaryBox.className = 'currency-primary-result';

    const inputLabel = document.createElement('div');
    inputLabel.className = 'currency-source-amount';
    inputLabel.textContent = `${conversion.getFormattedOriginalAmount()} =`;

    const convertedLabel = document.createElement('div');
    convertedLabel.className = 'currency-target-amount';
    convertedLabel.textContent = conversion.getFormattedConvertedAmount();

    primaryBox.append(inputLabel, convertedLabel);

    const ratesBox = document.createElement('div');
    ratesBox.className = 'currency-rate-details';

    const forwardRate = document.createElement('span');
    forwardRate.className = 'currency-rate-item';
    forwardRate.textContent = conversion.getExchangeRateLabel();

    const inverseRate = document.createElement('span');
    inverseRate.className = 'currency-rate-item';
    inverseRate.textContent = conversion.getInverseRateLabel();

    const rateDate = document.createElement('span');
    rateDate.className = 'currency-rate-date';
    rateDate.textContent = `ECB · ${conversion.getDateLabel()}`;

    ratesBox.append(forwardRate, inverseRate, rateDate);

    this.currencyResult.append(primaryBox, ratesBox);
    this.currencyResult.hidden = false;
  }

  showCurrencyMessage(text, isError) {
    if (!this.currencyMessage) {
      return;
    }

    this.currencyMessage.textContent = text;
    this.currencyMessage.className = isError
      ? 'currency-message error-text'
      : 'currency-message info-note';
  }

  // Update activity suggestions whenever new weather or country data arrives.
  updateRecommendations() {
    if (!this.recommendationsInfo || !this.destination) {
      return;
    }

    const result = this.activityRecommender.recommend(
      this.destination,
      this.currentCountry,
      this.currentWeather
    );

    this.renderRecommendations(result);
  }

  renderRecommendations(result) {
    if (!this.recommendationsInfo) {
      return;
    }

    this.currentRecommendations = result.suggestions || [];
    this.recommendationsInfo.textContent = '';

    const heading = document.createElement('h2');
    heading.className = 'recommendations-heading';
    heading.textContent = 'Suggested Activities';
    this.recommendationsInfo.appendChild(heading);

    if (!result.hasSuggestions()) {
      const fallback = document.createElement('p');
      fallback.className = 'info-message';
      fallback.textContent =
        result.fallbackMessage ||
        'No suitable activity suggestions are currently available.';
      this.recommendationsInfo.appendChild(fallback);
      this.recommendationsInfo.hidden = false;
      return;
    }

    const list = document.createElement('div');
    list.className = 'recommendations-list';

    for (const item of result.suggestions) {
      const card = document.createElement('article');
      card.className = 'recommendation-item';

      const title = document.createElement('h3');
      title.className = 'recommendation-title';
      title.textContent = item.title;

      const desc = document.createElement('p');
      desc.className = 'recommendation-desc';
      desc.textContent = item.description;

      card.append(title, desc);
      list.appendChild(card);
    }

    this.recommendationsInfo.appendChild(list);
    this.recommendationsInfo.hidden = false;
  }

  clearRecommendations() {
    if (!this.recommendationsInfo) {
      return;
    }

    this.recommendationsInfo.textContent = '';
    this.recommendationsInfo.hidden = true;
  }

  renderCategoryChips() {
    this.categoryFilters.textContent = '';

    for (const group of this.categoryCatalog.getGroups()) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.categoryId = group.id;
      chip.textContent = group.label;
      chip.setAttribute('aria-pressed', String(group.id === this.selectedCategory.id));

      if (group.id === this.selectedCategory.id) {
        chip.classList.add('active');
      }

      chip.addEventListener('click', () => {
        this.changeCategory(group);
      });

      this.categoryFilters.appendChild(chip);
    }
  }

  changeCategory(group) {
    if (!this.destination || this.selectedCategory.id === group.id) {
      return;
    }

    this.selectedCategory = group;
    this.updateChipStates();
    this.loadPois({ reset: true });
  }

  updateChipStates() {
    const chips = this.categoryFilters.querySelectorAll('.chip');

    for (const chip of chips) {
      const isActive = chip.dataset.categoryId === this.selectedCategory.id;
      chip.classList.toggle('active', isActive);
      chip.setAttribute('aria-pressed', String(isActive));
    }
  }

  async loadPois({ reset = false } = {}) {
    if (!this.destination || !this.selectedCategory) {
      return;
    }

    if (this.isLoadingPois && !reset) {
      return;
    }

    this.offset = 0;
    this.seenPoiIds.clear();
    this.poiResults.textContent = '';

    const requestToken = ++this.requestToken;
    this.isLoadingPois = true;
    this.showPoiMessage(
      `Loading ${this.selectedCategory.label.toLowerCase()} in ${this.destination.getDisplayName()}...`,
      false
    );

    try {
      // Locked fixed limit of 16 places to evenly fill the 4-column / 2-column grid
      const fixedLimit = 16;
      const result = await this.geoapifyService.searchPlaces(
        this.destination,
        this.selectedCategory.getApiCategories(),
        { limit: fixedLimit, offset: 0 }
      );

      if (requestToken !== this.requestToken) {
        return;
      }

      const freshPois = result.pois.filter((poi) => {
        const id = poi.placeId || `${poi.latitude},${poi.longitude}`;

        if (this.seenPoiIds.has(id)) {
          return false;
        }

        this.seenPoiIds.add(id);
        return true;
      });

      if (freshPois.length === 0 && this.seenPoiIds.size === 0) {
        this.showPoiMessage(
          `No ${this.selectedCategory.label.toLowerCase()} found in ${this.destination.getDisplayName()}. Try another category.`,
          true
        );
        return;
      }

      // Display locked count of places
      const displayPois = freshPois.slice(0, fixedLimit);
      this.renderPois(displayPois);

      this.showPoiMessage(
        `Showing ${displayPois.length} places in ${this.destination.getDisplayName()}.`,
        false
      );
    } catch (error) {
      if (requestToken !== this.requestToken) {
        return;
      }

      this.showPoiMessage(error.message, true);
    } finally {
      if (requestToken === this.requestToken) {
        this.isLoadingPois = false;
      }
    }
  }

  renderPois(pois) {
    this.poiResults.textContent = '';

    for (const poi of pois) {
      this.poiResults.appendChild(this.createPoiCard(poi));
    }
  }

  createPoiCard(poi) {
    const card = document.createElement('article');
    card.className = 'poi-card';

    const category = document.createElement('span');
    category.className = 'poi-category';
    category.textContent = poi.categoryLabel;

    const title = document.createElement('h2');
    title.textContent = poi.name;

    const address = document.createElement('p');
    address.className = 'poi-address';
    address.textContent =
      poi.address && poi.address !== poi.name
        ? poi.address
        : 'Address unavailable';

    const distance = document.createElement('p');
    distance.className = 'poi-distance';
    distance.textContent = poi.getDistanceLabel() || 'Distance unavailable';

    card.append(category, title, address, distance);

    return card;
  }

  showDiscoverView() {
    // Invalidate any request that is still running.
    this.requestToken += 1;
    this.countryRequestToken += 1;
    this.weatherRequestToken += 1;
    this.photosRequestToken += 1;
    this.isLoadingPois = false;
    this.destination = null;
    this.currentCountry = null;
    this.currentWeather = null;
    this.currentRecommendations = [];
    this.selectedCategory = null;
    this.offset = 0;
    this.seenPoiIds.clear();
    this.clearCountryInfo();
    this.clearWeather();
    this.clearRecommendations();
    this.clearCurrencyConverter();
    this.clearPhotos();
    this.poiResults.textContent = '';
    this.poiMessage.textContent = '';
    this.destinationView.hidden = true;
    if (this.tripsView) {
      this.tripsView.hidden = true;
    }
    this.discoverView.hidden = false;

    // Update active nav button
    if (this.navDiscoverBtn) this.navDiscoverBtn.classList.add('active');
    if (this.navTripsBtn) this.navTripsBtn.classList.remove('active');

    window.scrollTo(0, 0);
  }

  showTripsView() {
    this.discoverView.hidden = true;
    this.destinationView.hidden = true;
    if (this.tripsView) {
      this.tripsView.hidden = false;
    }

    if (this.navDiscoverBtn) this.navDiscoverBtn.classList.remove('active');
    if (this.navTripsBtn) this.navTripsBtn.classList.add('active');

    this.renderTripsList();
    window.scrollTo(0, 0);
  }

  // Toast feedback helper
  showToast(message, type = 'success') {
    if (!this.appToast) return;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.appToast.textContent = message;
    this.appToast.className = `app-toast toast-${type}`;
    this.appToast.hidden = false;

    this.toastTimeout = setTimeout(() => {
      this.appToast.hidden = true;
    }, 4000);
  }

  // Update trips badge on navbar
  updateTripsBadge() {
    if (!this.tripsBadge || !this.tripRepository) return;
    const trips = this.tripRepository.getAll();
    const count = trips.length;
    this.tripsBadge.textContent = String(count);
    this.tripsBadge.hidden = count === 0;
  }

  // Render all saved trips in the tripsView
  renderTripsList() {
    if (!this.tripsGrid || !this.tripRepository) return;
    this.tripsGrid.textContent = '';

    const trips = this.tripRepository.getAll();
    this.updateTripsBadge();

    if (trips.length === 0) {
      if (this.tripsEmptyState) this.tripsEmptyState.hidden = false;
      this.tripsGrid.hidden = true;
      return;
    }

    if (this.tripsEmptyState) this.tripsEmptyState.hidden = true;
    this.tripsGrid.hidden = false;

    for (const trip of trips) {
      this.tripsGrid.appendChild(this.createTripCard(trip));
    }
  }

  createTripCard(trip) {
    const card = document.createElement('article');
    card.className = 'trip-card';
    card.dataset.tripId = trip.id;

    // Header with destination name and country
    const header = document.createElement('div');
    header.className = 'trip-card-header';

    const titleWrap = document.createElement('div');
    const typeLabel = document.createElement('span');
    typeLabel.className = 'trip-card-type';
    typeLabel.textContent = trip.destinationType || 'Trip Itinerary';

    const destTitle = document.createElement('h3');
    destTitle.className = 'trip-card-title';
    destTitle.textContent = trip.destinationName;

    titleWrap.append(typeLabel, destTitle);

    const countryTag = document.createElement('span');
    countryTag.className = 'trip-country-tag';
    countryTag.textContent = trip.country ? `${trip.country}` : (trip.countryCode || '');

    header.append(titleWrap, countryTag);

    // Meta details (Date, Duration, Travelers, Budget)
    const metaGrid = document.createElement('div');
    metaGrid.className = 'trip-meta-grid';

    const metaDate = document.createElement('div');
    metaDate.className = 'trip-meta-item';
    metaDate.innerHTML = `<span class="meta-label"><span class="material-symbols-sharp meta-icon">calendar_today</span>Date</span><span class="meta-val">${trip.getFormattedDate()}</span>`;

    const metaDuration = document.createElement('div');
    metaDuration.className = 'trip-meta-item';
    metaDuration.innerHTML = `<span class="meta-label"><span class="material-symbols-sharp meta-icon">schedule</span>Duration</span><span class="meta-val">${trip.durationDays} ${trip.durationDays === 1 ? 'day' : 'days'}</span>`;

    const metaTravelers = document.createElement('div');
    metaTravelers.className = 'trip-meta-item';
    metaTravelers.innerHTML = `<span class="meta-label"><span class="material-symbols-sharp meta-icon">group</span>Travelers</span><span class="meta-val">${trip.travelers} ${trip.travelers === 1 ? 'person' : 'people'}</span>`;

    const metaBudget = document.createElement('div');
    metaBudget.className = 'trip-meta-item';
    metaBudget.innerHTML = `<span class="meta-label"><span class="material-symbols-sharp meta-icon">payments</span>Budget</span><span class="meta-val highlight-val">${trip.getFormattedBudget()}</span>`;

    metaGrid.append(metaDate, metaDuration, metaTravelers, metaBudget);

    // Daily budget calculation label
    const dailyBudget = document.createElement('p');
    dailyBudget.className = 'trip-daily-budget';
    dailyBudget.textContent = `${trip.getFormattedDailyBudget()} / day`;

    // Notes if present
    let notesElem = null;
    if (trip.notes) {
      notesElem = document.createElement('div');
      notesElem.className = 'trip-notes';
      const notesContent = document.createElement('span');
      notesContent.textContent = trip.notes;
      notesElem.append(notesContent);
    }

    // Recommendations preview if attached
    let recsElem = null;
    if (trip.recommendations && trip.recommendations.length > 0) {
      recsElem = document.createElement('div');
      recsElem.className = 'trip-recs-section';
      const recsHeading = document.createElement('h4');
      recsHeading.textContent = `Activities (${trip.recommendations.length}):`;
      const recsList = document.createElement('ul');
      recsList.className = 'trip-recs-list';

      for (const rec of trip.recommendations) {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${rec.title || 'Activity'}</strong> — <span>${rec.description || ''}</span>`;
        recsList.appendChild(li);
      }
      recsElem.append(recsHeading, recsList);
    }

    // Actions row: Edit and Delete buttons
    const actions = document.createElement('div');
    actions.className = 'trip-card-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'button-edit';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      this.openEditTripModal(trip.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'button-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      this.openDeleteModal(trip.id, trip.destinationName);
    });

    actions.append(editBtn, deleteBtn);

    card.append(header, metaGrid, dailyBudget);
    if (notesElem) card.appendChild(notesElem);
    if (recsElem) card.appendChild(recsElem);
    card.appendChild(actions);

    return card;
  }

  // Open modal in Create mode from currently viewed destination
  openCreateTripModalFromDestination() {
    if (!this.destination) return;

    this.resetTripForm();
    if (this.modalTitle) this.modalTitle.textContent = 'Save as Trip Plan';
    this.tripIdInput.value = '';

    this.formDestinationName.value = this.destination.getDisplayName();
    this.formCountry.value = this.currentCountry ? (this.currentCountry.name || '') : '';
    this.currentCountryCode = this.currentCountry
      ? (this.currentCountry.alpha2Code || this.destination.countryCode || '')
      : (this.destination.countryCode || '');

    // Default travel date: tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.formTravelDate.value = tomorrow.toISOString().slice(0, 10);
    this.formDuration.value = 5;
    this.formTravelers.value = 1;
    this.formBudget.value = 2000;
    this.currentTripCurrency = 'RM';

    // Attach active recommendations
    this.attachedRecommendations = [...this.currentRecommendations];
    this.renderFormRecommendationsPreview(this.attachedRecommendations);

    this.tripModal.hidden = false;
  }

  // Open modal in Edit mode
  openEditTripModal(tripId) {
    if (!this.tripRepository) return;
    const trip = this.tripRepository.getById(tripId);
    if (!trip) {
      this.showToast('Trip not found.', 'error');
      return;
    }

    this.resetTripForm();
    if (this.modalTitle) this.modalTitle.textContent = 'Edit Trip Plan';
    this.tripIdInput.value = trip.id;
    this.formDestinationName.value = trip.destinationName;
    this.formCountry.value = trip.country || '';
    this.currentCountryCode = trip.countryCode || '';
    this.formTravelDate.value = trip.travelDate;
    this.formDuration.value = trip.durationDays;
    this.formTravelers.value = trip.travelers;
    this.formBudget.value = trip.budget;
    this.currentTripCurrency = trip.currency || 'RM';
    this.formNotes.value = trip.notes || '';

    this.attachedRecommendations = trip.recommendations ? [...trip.recommendations] : [];
    this.renderFormRecommendationsPreview(this.attachedRecommendations);

    this.tripModal.hidden = false;
  }

  renderFormRecommendationsPreview(recs) {
    if (!this.formRecommendationsPreview) return;
    this.formRecommendationsPreview.textContent = '';

    if (!recs || recs.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'text-muted';
      empty.textContent = 'No recommendations attached to this trip.';
      this.formRecommendationsPreview.appendChild(empty);
      return;
    }

    const badgeList = document.createElement('div');
    badgeList.className = 'form-recs-badges';

    for (const rec of recs) {
      const badge = document.createElement('span');
      badge.className = 'form-rec-chip';
      badge.textContent = rec.title;
      badgeList.appendChild(badge);
    }

    this.formRecommendationsPreview.appendChild(badgeList);
  }

  resetTripForm() {
    if (this.tripForm) this.tripForm.reset();
    if (this.formErrorMessage) {
      this.formErrorMessage.textContent = '';
      this.formErrorMessage.hidden = true;
    }
    this.attachedRecommendations = [];
    this.currentCountryCode = '';
    this.currentTripCurrency = 'RM';
  }

  closeTripModal() {
    if (this.tripModal) this.tripModal.hidden = true;
    this.resetTripForm();
  }

  // Handle Create or Update form submission
  handleTripFormSubmit() {
    const tripId = this.tripIdInput.value;
    const isEdit = Boolean(tripId);

    const tripData = {
      destinationName: this.formDestinationName.value.trim(),
      destinationType: this.destination ? this.destination.getTypeLabel() : 'Destination',
      country: this.formCountry.value.trim(),
      countryCode: (this.currentCountryCode || '').trim().toUpperCase(),
      travelDate: this.formTravelDate.value,
      durationDays: Number(this.formDuration.value),
      travelers: Number(this.formTravelers.value),
      budget: Number(this.formBudget.value),
      currency: this.currentTripCurrency || 'RM',
      notes: this.formNotes.value.trim(),
      recommendations: this.attachedRecommendations || [],
    };

    // Model validation
    const validation = Trip.validate(tripData);
    if (!validation.isValid) {
      this.showFormError(validation.errors.join('<br>'));
      return;
    }

    try {
      if (isEdit) {
        this.tripRepository.update(tripId, tripData);
        this.showToast(`Trip to "${tripData.destinationName}" successfully updated!`, 'success');
      } else {
        this.tripRepository.create(tripData);
        this.showToast(`Trip to "${tripData.destinationName}" saved to My Trips!`, 'success');
      }

      this.closeTripModal();
      this.updateTripsBadge();

      // If user was viewing trips list, refresh the view
      if (!this.tripsView.hidden) {
        this.renderTripsList();
      }
    } catch (error) {
      this.showFormError(error.message);
    }
  }

  showFormError(html) {
    if (!this.formErrorMessage) return;
    this.formErrorMessage.innerHTML = html;
    this.formErrorMessage.hidden = false;
  }

  // Delete modal confirmation
  openDeleteModal(tripId, destinationName) {
    this.pendingDeleteTripId = tripId;
    if (this.deleteTripDestination) {
      this.deleteTripDestination.textContent = destinationName || 'this trip';
    }
    if (this.deleteModal) {
      this.deleteModal.hidden = false;
    }
  }

  closeDeleteModal() {
    this.pendingDeleteTripId = null;
    if (this.deleteModal) {
      this.deleteModal.hidden = true;
    }
  }

  handleConfirmDelete() {
    if (!this.pendingDeleteTripId || !this.tripRepository) return;

    try {
      this.tripRepository.delete(this.pendingDeleteTripId);
      this.showToast('Trip deleted successfully.', 'success');
      this.closeDeleteModal();
      this.renderTripsList();
    } catch (error) {
      this.showToast(`Failed to delete trip: ${error.message}`, 'error');
      this.closeDeleteModal();
    }
  }

  showDestinationMessage(text, isError) {
    this.destinationMessage.textContent = text;
    this.destinationMessage.className = isError
      ? 'message error-text'
      : 'message';
  }

  showPoiMessage(text, isError) {
    this.poiMessage.textContent = text;
    this.poiMessage.className = isError ? 'message error-text' : 'message';
  }

  clearDestinationResults() {
    this.destinationResults.textContent = '';
  }

  setSearching(isSearching) {
    this.destinationSearchButton.disabled = isSearching;
    this.destinationSearchButton.textContent = isSearching
      ? 'Searching...'
      : 'Search';
  }
}

module.exports = HomeApp;
