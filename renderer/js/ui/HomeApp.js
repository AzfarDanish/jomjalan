// The home page: search for a country or city, then browse its places by
// category. Places are only requested after the user picks a destination.
const PlaceCategoryCatalog = require('../logics/PlaceCategoryCatalog');
const ActivityRecommender = require('../logics/ActivityRecommender');
const Trip = require('../models/Trip');

class HomeApp {
  constructor(geoapifyService, countryService, weatherService, currencyService, tripRepository, unsplashService) {
    if (!geoapifyService || !countryService || !weatherService) {
      throw new Error('HomeApp needs a Geoapify service, a country service and a weather service.');
    }

    this.geoapifyService = geoapifyService;
    this.countryService = countryService;
    this.weatherService = weatherService;
    this.currencyService = currencyService;
    this.tripRepository = tripRepository;
    this.unsplashService = unsplashService;
    this.categoryCatalog = new PlaceCategoryCatalog();
    this.activityRecommender = new ActivityRecommender();

    // App navigation and toasts
    this.navDiscoverBtn = document.getElementById('navDiscoverBtn');
    this.navTripsBtn = document.getElementById('navTripsBtn');
    this.tripsBadge = document.getElementById('tripsBadge');
    this.appToast = document.getElementById('appToast');
    this.toastTimeout = null;

    // Discover and destination views
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

    // My Trips view
    this.tripsView = document.getElementById('tripsView');
    this.tripsEmptyState = document.getElementById('tripsEmptyState');
    this.emptyStateDiscoverBtn = document.getElementById('emptyStateDiscoverBtn');
    this.tripsGrid = document.getElementById('tripsGrid');

    // Trip modal
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
    this.formRecommendationsPreview = document.getElementById('formRecommendationsPreview');
    this.formErrorMessage = document.getElementById('formErrorMessage');

    // Delete confirmation modal
    this.deleteModal = document.getElementById('deleteModal');
    this.deleteModalCloseBtn = document.getElementById('deleteModalCloseBtn');
    this.deleteCancelBtn = document.getElementById('deleteCancelBtn');
    this.deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
    this.deleteTripDestination = document.getElementById('deleteTripDestination');
    this.pendingDeleteTripId = null;

    this.isSearching = false;
    this.destination = null;
    this.currentCountry = null;
    this.currentWeather = null;
    this.currentRecommendations = [];
    this.selectedCategory = null;

    // Each loader bumps its token so a slow, outdated response is ignored.
    this.requestToken = 0;
    this.countryRequestToken = 0;
    this.weatherRequestToken = 0;
    this.currencyRequestToken = 0;
    this.photosRequestToken = 0;
    this.currenciesLoaded = false;
  }

  start() {
    this.navDiscoverBtn.addEventListener('click', () => this.showDiscoverView());
    this.navTripsBtn.addEventListener('click', () => this.showTripsView());
    this.emptyStateDiscoverBtn.addEventListener('click', () => this.showDiscoverView());
    this.backButton.addEventListener('click', () => this.showDiscoverView());

    const quickChips = document.querySelectorAll('.quick-chip');
    for (const chip of quickChips) {
      chip.addEventListener('click', () => {
        if (chip.dataset.query) {
          this.destinationInput.value = chip.dataset.query;
          this.destinationClearBtn.hidden = false;
          this.searchDestinations();
        }
      });
    }

    this.destinationInput.addEventListener('input', () => {
      this.destinationClearBtn.hidden = !this.destinationInput.value.trim();
    });

    this.destinationClearBtn.addEventListener('click', () => {
      this.destinationInput.value = '';
      this.destinationClearBtn.hidden = true;
      this.destinationInput.focus();
    });

    this.destinationForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.searchDestinations();
    });

    this.saveTripBtn.addEventListener('click', () => this.openCreateTripModalFromDestination());
    this.modalCloseBtn.addEventListener('click', () => this.closeTripModal());
    this.modalCancelBtn.addEventListener('click', () => this.closeTripModal());
    this.tripForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleTripFormSubmit();
    });

    this.deleteModalCloseBtn.addEventListener('click', () => this.closeDeleteModal());
    this.deleteCancelBtn.addEventListener('click', () => this.closeDeleteModal());
    this.deleteConfirmBtn.addEventListener('click', () => this.handleConfirmDelete());

    this.currencyForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.performCurrencyConversion();
    });
    this.currencySwapBtn.addEventListener('click', () => this.swapCurrencies());
    this.currencyFrom.addEventListener('change', () => this.performCurrencyConversion());
    this.currencyTo.addEventListener('change', () => this.performCurrencyConversion());

    if (!this.geoapifyService.hasApiKey()) {
      this.showDestinationMessage(
        'Geoapify API key is missing. Add geoapifyKey to .env.local and restart the app.',
        true
      );
      this.destinationInput.disabled = true;
      this.destinationSearchButton.disabled = true;
    }

    this.updateTripsBadge();
  }

  async searchDestinations() {
    if (this.isSearching) {
      return;
    }

    const query = this.destinationInput.value.trim();

    if (!query) {
      this.destinationResults.textContent = '';
      this.showDestinationMessage('Please enter a country or city name.', true);
      return;
    }

    this.isSearching = true;
    this.setSearching(true);
    this.destinationResults.textContent = '';
    this.showDestinationMessage('Searching countries and cities...', false);

    try {
      const destinations = await this.geoapifyService.searchDestinations(query);

      if (destinations.length === 0) {
        this.showDestinationMessage(`No country or city found for "${query}".`, true);
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
      button.addEventListener('click', () => this.openDestination(destination));

      this.destinationResults.appendChild(button);
    }
  }

  async openDestination(destination) {
    this.destination = destination;
    this.currentCountry = null;
    this.currentWeather = null;
    this.selectedCategory = this.categoryCatalog.getDefaultGroup();
    this.poiResults.textContent = '';

    this.destinationType.textContent = destination.getTypeLabel();
    this.destinationTitle.textContent = destination.getDisplayName();
    this.destinationSubtitle.textContent = destination.formatted;

    this.renderCategoryChips();
    this.clearPanel(this.recommendationsInfo);
    this.clearCurrencyConverter();
    this.clearPhotos();
    this.discoverView.hidden = true;
    this.destinationView.hidden = false;
    window.scrollTo(0, 0);

    // Weather, country facts, and photos load in the background so places are not delayed.
    this.loadWeather(destination);
    this.loadCountryInfo(destination);
    this.loadPhotos(destination);
    await this.loadPois();
  }

  // Weather and places load separately, so one failure does not block the other.
  async loadWeather(destination) {
    const requestToken = ++this.weatherRequestToken;
    this.clearPanel(this.weatherInfo);

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
      this.showInfoMessage(this.weatherInfo, error.message);
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
    ];

    this.weatherInfo.append(current, this.createFactList(facts));
    this.weatherInfo.hidden = false;
  }

  clearPhotos() {
    this.destinationCover.hidden = true;
    this.destinationCover.style.backgroundImage = 'none';
    this.destinationCoverCredit.textContent = '';
    this.photosMessage.textContent = '';
    this.photosMessage.hidden = true;
  }

  // The cover photo is optional: without an Unsplash key the banner stays hidden.
  async loadPhotos(destination) {
    if (!this.unsplashService.hasAccessKey()) {
      return;
    }

    const requestToken = ++this.photosRequestToken;
    this.clearPhotos();

    try {
      const photos = await this.unsplashService.searchPhotos(destination.name, 1);

      if (requestToken !== this.photosRequestToken) {
        return;
      }

      if (photos.length > 0) {
        this.renderCoverPhoto(photos[0]);
      }
    } catch (error) {
      if (requestToken !== this.photosRequestToken) {
        return;
      }
      console.warn('Unsplash cover photo error:', error);
    }
  }

  renderCoverPhoto(photo) {
    const imageUrl = photo.urls.regular || photo.urls.full || photo.urls.small;
    this.destinationCover.style.backgroundImage = `url("${imageUrl}")`;
    this.destinationCover.hidden = false;

    // Unsplash API guidelines require reporting the download.
    if (photo.links.downloadLocation) {
      this.unsplashService.triggerDownload(photo.links.downloadLocation);
    }

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

    this.destinationCoverCredit.textContent = '';
    this.destinationCoverCredit.append('Photo by ', photographerLink, ' on ', unsplashLink);
  }

  // Label/value grid shared by the weather and country panels. Empty values are skipped.
  createFactList(facts) {
    const list = document.createElement('dl');
    list.className = 'info-facts';

    for (const fact of facts) {
      if (!fact.value) {
        continue;
      }

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

  async loadCountryInfo(destination) {
    const requestToken = ++this.countryRequestToken;
    this.clearPanel(this.countryInfo);

    if (!destination.countryCode) {
      return;
    }

    try {
      const country = await this.countryService.getCountry(destination.countryCode);

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
      this.showInfoMessage(this.countryInfo, error.message);
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
    ];

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

  showInfoMessage(panel, text) {
    const message = document.createElement('p');
    message.className = 'info-message';
    message.textContent = text;

    panel.textContent = '';
    panel.appendChild(message);
    panel.hidden = false;
  }

  clearPanel(panel) {
    panel.textContent = '';
    panel.hidden = true;
  }

  clearCurrencyConverter() {
    this.currencyConverter.hidden = true;
    this.currencyResult.textContent = '';
    this.currencyResult.hidden = true;
    this.currencyMessage.textContent = '';
    this.currencyMessage.className = 'currency-message';
  }

  async initCurrencyConverter(country) {
    const requestToken = ++this.currencyRequestToken;
    this.clearCurrencyConverter();
    this.currencyConverter.hidden = false;

    try {
      const currencies = await this.currencyService.getCurrencies();
      if (requestToken !== this.currencyRequestToken) {
        return;
      }

      this.populateCurrencyDropdowns(currencies);

      let destinationCurrencyCode = '';
      if (country && country.currencies[0]) {
        destinationCurrencyCode = (country.currencies[0].code || '').toUpperCase();
      }

      // JomJalan is a Malaysian app, so convert from MYR when it is available.
      const defaultBase = currencies['MYR'] ? 'MYR' : 'USD';
      if (currencies[defaultBase]) {
        this.currencyFrom.value = defaultBase;
      }

      const fallbackTo = defaultBase === 'USD' ? 'EUR' : 'USD';

      if (destinationCurrencyCode && currencies[destinationCurrencyCode]) {
        this.currencyTo.value = destinationCurrencyCode;
        this.showCurrencyMessage('', false);
      } else if (destinationCurrencyCode) {
        this.currencyTo.value = fallbackTo;
        this.showCurrencyMessage(
          `Note: Local currency (${destinationCurrencyCode}) is not tracked by the European Central Bank. Showing ${fallbackTo} instead.`,
          false
        );
      } else {
        this.currencyTo.value = fallbackTo;
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

    const codes = Object.keys(currencies).sort((a, b) => a.localeCompare(b));

    for (const dropdown of [this.currencyFrom, this.currencyTo]) {
      dropdown.textContent = '';

      for (const code of codes) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${code} — ${currencies[code]}`;
        dropdown.appendChild(option);
      }
    }

    this.currenciesLoaded = true;
  }

  swapCurrencies() {
    const temp = this.currencyFrom.value;
    this.currencyFrom.value = this.currencyTo.value;
    this.currencyTo.value = temp;

    this.performCurrencyConversion();
  }

  async performCurrencyConversion() {
    const amountValue = this.currencyAmount.value.trim();
    const fromCode = this.currencyFrom.value;
    const toCode = this.currencyTo.value;

    if (!amountValue) {
      this.showCurrencyMessage('Please enter an amount to convert.', true);
      this.currencyResult.hidden = true;
      return;
    }

    const amount = Number(amountValue);
    if (isNaN(amount) || amount <= 0) {
      this.showCurrencyMessage('Please enter a valid amount greater than zero.', true);
      this.currencyResult.hidden = true;
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
      this.currencyResult.hidden = true;
      this.showCurrencyMessage(error.message, true);
    }
  }

  renderCurrencyResult(conversion) {
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
    this.currencyMessage.textContent = text;
    this.currencyMessage.className = isError
      ? 'currency-message error-text'
      : 'currency-message info-note';
  }

  // Activity suggestions are refreshed whenever new weather or country data arrives.
  updateRecommendations() {
    if (!this.destination) {
      return;
    }

    const result = this.activityRecommender.recommend(
      this.destination,
      this.currentCountry,
      this.currentWeather
    );

    this.currentRecommendations = result.suggestions || [];
    this.recommendationsInfo.textContent = '';

    const heading = document.createElement('h2');
    heading.className = 'recommendations-heading';
    heading.textContent = 'Suggested Activities';
    this.recommendationsInfo.appendChild(heading);

    if (!result.suggestions || result.suggestions.length === 0) {
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

      const description = document.createElement('p');
      description.className = 'recommendation-desc';
      description.textContent = item.description;

      card.append(title, description);
      list.appendChild(card);
    }

    this.recommendationsInfo.appendChild(list);
    this.recommendationsInfo.hidden = false;
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

      chip.addEventListener('click', () => this.changeCategory(group));

      this.categoryFilters.appendChild(chip);
    }
  }

  changeCategory(group) {
    if (!this.destination || this.selectedCategory.id === group.id) {
      return;
    }

    this.selectedCategory = group;

    const chips = this.categoryFilters.querySelectorAll('.chip');
    for (const chip of chips) {
      const isActive = chip.dataset.categoryId === this.selectedCategory.id;
      chip.classList.toggle('active', isActive);
      chip.setAttribute('aria-pressed', String(isActive));
    }

    this.loadPois();
  }

  async loadPois() {
    this.poiResults.textContent = '';

    const requestToken = ++this.requestToken;
    const categoryName = this.selectedCategory.label.toLowerCase();
    const destinationName = this.destination.getDisplayName();
    this.showPoiMessage(`Loading ${categoryName} in ${destinationName}...`, false);

    try {
      // 16 places fill the 4-column and 2-column grids evenly.
      const placeLimit = 16;
      const result = await this.geoapifyService.searchPlaces(
        this.destination,
        this.selectedCategory.getApiCategories(),
        { limit: placeLimit, offset: 0 }
      );

      if (requestToken !== this.requestToken) {
        return;
      }

      // The API can return the same place twice, so skip repeats.
      const seenPoiIds = new Set();
      const freshPois = [];
      for (const poi of result.pois) {
        const id = poi.placeId || `${poi.latitude},${poi.longitude}`;
        if (!seenPoiIds.has(id)) {
          seenPoiIds.add(id);
          freshPois.push(poi);
        }
      }

      if (freshPois.length === 0) {
        this.showPoiMessage(`No ${categoryName} found in ${destinationName}. Try another category.`, true);
        return;
      }

      const displayPois = freshPois.slice(0, placeLimit);
      for (const poi of displayPois) {
        this.poiResults.appendChild(this.createPoiCard(poi));
      }

      this.showPoiMessage(`Showing ${displayPois.length} places in ${destinationName}.`, false);
    } catch (error) {
      if (requestToken !== this.requestToken) {
        return;
      }

      this.showPoiMessage(error.message, true);
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
    if (poi.address && poi.address !== poi.name) {
      address.textContent = poi.address;
    } else {
      address.textContent = 'Address unavailable';
    }

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
    this.destination = null;
    this.currentCountry = null;
    this.currentWeather = null;
    this.currentRecommendations = [];
    this.selectedCategory = null;
    this.clearPanel(this.countryInfo);
    this.clearPanel(this.weatherInfo);
    this.clearPanel(this.recommendationsInfo);
    this.clearCurrencyConverter();
    this.clearPhotos();
    this.poiResults.textContent = '';
    this.poiMessage.textContent = '';
    this.destinationView.hidden = true;
    this.tripsView.hidden = true;
    this.discoverView.hidden = false;

    this.navDiscoverBtn.classList.add('active');
    this.navTripsBtn.classList.remove('active');

    window.scrollTo(0, 0);
  }

  showTripsView() {
    this.discoverView.hidden = true;
    this.destinationView.hidden = true;
    this.tripsView.hidden = false;

    this.navDiscoverBtn.classList.remove('active');
    this.navTripsBtn.classList.add('active');

    this.renderTripsList();
    window.scrollTo(0, 0);
  }

  showToast(message, type) {
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

  updateTripsBadge() {
    const count = this.tripRepository.getAll().length;
    this.tripsBadge.textContent = String(count);
    this.tripsBadge.hidden = count === 0;
  }

  renderTripsList() {
    this.tripsGrid.textContent = '';

    const trips = this.tripRepository.getAll();
    this.updateTripsBadge();

    if (trips.length === 0) {
      this.tripsEmptyState.hidden = false;
      this.tripsGrid.hidden = true;
      return;
    }

    this.tripsEmptyState.hidden = true;
    this.tripsGrid.hidden = false;

    for (const trip of trips) {
      this.tripsGrid.appendChild(this.createTripCard(trip));
    }
  }

  createTripCard(trip) {
    const card = document.createElement('article');
    card.className = 'trip-card';
    card.dataset.tripId = trip.id;

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
    countryTag.textContent = trip.country || trip.countryCode || '';

    header.append(titleWrap, countryTag);

    const metaGrid = document.createElement('div');
    metaGrid.className = 'trip-meta-grid';

    const metaItems = [
      { icon: 'calendar_today', label: 'Date', value: trip.getFormattedDate(), valueClass: 'meta-val' },
      { icon: 'schedule', label: 'Duration', value: `${trip.durationDays} ${trip.durationDays === 1 ? 'day' : 'days'}`, valueClass: 'meta-val' },
      { icon: 'group', label: 'Travelers', value: `${trip.travelers} ${trip.travelers === 1 ? 'person' : 'people'}`, valueClass: 'meta-val' },
      { icon: 'payments', label: 'Budget', value: trip.getFormattedBudget(), valueClass: 'meta-val highlight-val' },
    ];

    for (const meta of metaItems) {
      const metaItem = document.createElement('div');
      metaItem.className = 'trip-meta-item';
      metaItem.innerHTML = `<span class="meta-label"><span class="material-symbols-sharp meta-icon">${meta.icon}</span>${meta.label}</span><span class="${meta.valueClass}">${meta.value}</span>`;
      metaGrid.appendChild(metaItem);
    }

    const dailyBudget = document.createElement('p');
    dailyBudget.className = 'trip-daily-budget';
    dailyBudget.textContent = `${trip.getFormattedDailyBudget()} / day`;

    card.append(header, metaGrid, dailyBudget);

    if (trip.notes) {
      const notes = document.createElement('div');
      notes.className = 'trip-notes';
      const notesContent = document.createElement('span');
      notesContent.textContent = trip.notes;
      notes.append(notesContent);
      card.appendChild(notes);
    }

    if (trip.recommendations && trip.recommendations.length > 0) {
      const recsSection = document.createElement('div');
      recsSection.className = 'trip-recs-section';
      const recsHeading = document.createElement('h4');
      recsHeading.textContent = `Activities (${trip.recommendations.length}):`;
      const recsList = document.createElement('ul');
      recsList.className = 'trip-recs-list';

      for (const rec of trip.recommendations) {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${rec.title || 'Activity'}</strong> — <span>${rec.description || ''}</span>`;
        recsList.appendChild(item);
      }
      recsSection.append(recsHeading, recsList);
      card.appendChild(recsSection);
    }

    const actions = document.createElement('div');
    actions.className = 'trip-card-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'button-edit';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => this.openEditTripModal(trip.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'button-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => this.openDeleteModal(trip.id, trip.destinationName));

    actions.append(editBtn, deleteBtn);
    card.appendChild(actions);

    return card;
  }

  openCreateTripModalFromDestination() {
    if (!this.destination) {
      return;
    }

    this.resetTripForm();
    this.modalTitle.textContent = 'Save as Trip Plan';
    this.tripIdInput.value = '';

    this.formDestinationName.value = this.destination.getDisplayName();
    if (this.currentCountry) {
      this.formCountry.value = this.currentCountry.name || '';
      this.currentCountryCode = this.currentCountry.alpha2Code || this.destination.countryCode || '';
    } else {
      this.formCountry.value = '';
      this.currentCountryCode = this.destination.countryCode || '';
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.formTravelDate.value = tomorrow.toISOString().slice(0, 10);
    this.formDuration.value = 5;
    this.formTravelers.value = 1;
    this.formBudget.value = 2000;
    this.currentTripCurrency = 'RM';

    this.attachedRecommendations = [...this.currentRecommendations];
    this.renderFormRecommendationsPreview(this.attachedRecommendations);

    this.tripModal.hidden = false;
  }

  openEditTripModal(tripId) {
    const trip = this.tripRepository.getById(tripId);
    if (!trip) {
      this.showToast('Trip not found.', 'error');
      return;
    }

    this.resetTripForm();
    this.modalTitle.textContent = 'Edit Trip Plan';
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

  renderFormRecommendationsPreview(recommendations) {
    this.formRecommendationsPreview.textContent = '';

    if (recommendations.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'text-muted';
      empty.textContent = 'No recommendations attached to this trip.';
      this.formRecommendationsPreview.appendChild(empty);
      return;
    }

    const badgeList = document.createElement('div');
    badgeList.className = 'form-recs-badges';

    for (const recommendation of recommendations) {
      const badge = document.createElement('span');
      badge.className = 'form-rec-chip';
      badge.textContent = recommendation.title;
      badgeList.appendChild(badge);
    }

    this.formRecommendationsPreview.appendChild(badgeList);
  }

  resetTripForm() {
    this.tripForm.reset();
    this.formErrorMessage.textContent = '';
    this.formErrorMessage.hidden = true;
    this.attachedRecommendations = [];
    this.currentCountryCode = '';
    this.currentTripCurrency = 'RM';
  }

  closeTripModal() {
    this.tripModal.hidden = true;
    this.resetTripForm();
  }

  handleTripFormSubmit() {
    const tripId = this.tripIdInput.value;

    const tripData = {
      destinationName: this.formDestinationName.value.trim(),
      destinationType: this.destination ? this.destination.getTypeLabel() : 'Destination',
      country: this.formCountry.value.trim(),
      countryCode: this.currentCountryCode.trim().toUpperCase(),
      travelDate: this.formTravelDate.value,
      durationDays: Number(this.formDuration.value),
      travelers: Number(this.formTravelers.value),
      budget: Number(this.formBudget.value),
      currency: this.currentTripCurrency,
      notes: this.formNotes.value.trim(),
      recommendations: this.attachedRecommendations,
    };

    const validation = Trip.validate(tripData);
    if (!validation.isValid) {
      this.showFormError(validation.errors.join('<br>'));
      return;
    }

    try {
      if (tripId) {
        this.tripRepository.update(tripId, tripData);
        this.showToast(`Trip to "${tripData.destinationName}" successfully updated!`, 'success');
      } else {
        this.tripRepository.create(tripData);
        this.showToast(`Trip to "${tripData.destinationName}" saved to My Trips!`, 'success');
      }

      this.closeTripModal();
      this.updateTripsBadge();

      if (!this.tripsView.hidden) {
        this.renderTripsList();
      }
    } catch (error) {
      this.showFormError(error.message);
    }
  }

  showFormError(html) {
    this.formErrorMessage.innerHTML = html;
    this.formErrorMessage.hidden = false;
  }

  openDeleteModal(tripId, destinationName) {
    this.pendingDeleteTripId = tripId;
    this.deleteTripDestination.textContent = destinationName || 'this trip';
    this.deleteModal.hidden = false;
  }

  closeDeleteModal() {
    this.pendingDeleteTripId = null;
    this.deleteModal.hidden = true;
  }

  handleConfirmDelete() {
    if (!this.pendingDeleteTripId) {
      return;
    }

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
    this.destinationMessage.className = isError ? 'message error-text' : 'message';
  }

  showPoiMessage(text, isError) {
    this.poiMessage.textContent = text;
    this.poiMessage.className = isError ? 'message error-text' : 'message';
  }

  setSearching(isSearching) {
    this.destinationSearchButton.disabled = isSearching;
    this.destinationSearchButton.textContent = isSearching ? 'Searching...' : 'Search';
  }
}

module.exports = HomeApp;
