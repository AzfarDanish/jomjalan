// The home page: search for a country or city, then browse its places by
// category. Places are only requested after the user picks a destination.
const PlaceCategoryCatalog = require('../logics/PlaceCategoryCatalog');
const { ActivityRecommender } = require('../logics/ActivityRecommender');

class HomeApp {
  constructor(geoapifyService, countryService, weatherService, currencyService) {
    if (!geoapifyService || !countryService || !weatherService) {
      throw new Error(
        'HomeApp needs a Geoapify service, a country service and a weather service.'
      );
    }

    this.geoapifyService = geoapifyService;
    this.countryService = countryService;
    this.weatherService = weatherService;
    this.currencyService = currencyService;
    this.categoryCatalog = new PlaceCategoryCatalog();
    this.activityRecommender = new ActivityRecommender();
    this.pageSize = geoapifyService.getPageSize();

    this.destinationForm = document.getElementById('destinationForm');
    this.destinationInput = document.getElementById('destinationInput');
    this.destinationSearchButton = document.getElementById('destinationSearchBtn');
    this.destinationMessage = document.getElementById('destinationMessage');
    this.destinationResults = document.getElementById('destinationResults');

    this.discoverView = document.getElementById('discoverView');
    this.destinationView = document.getElementById('destinationView');
    this.backButton = document.getElementById('backBtn');
    this.destinationType = document.getElementById('destinationType');
    this.destinationTitle = document.getElementById('destinationTitle');
    this.destinationSubtitle = document.getElementById('destinationSubtitle');
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
    this.loadMoreButton = document.getElementById('loadMoreBtn');

    this.isSearching = false;
    this.isLoadingPois = false;
    this.destination = null;
    this.currentCountry = null;
    this.currentWeather = null;
    this.selectedCategory = null;
    this.offset = 0;
    this.seenPoiIds = new Set();
    this.requestToken = 0;
    this.countryRequestToken = 0;
    this.weatherRequestToken = 0;
    this.currencyRequestToken = 0;
    this.currenciesLoaded = false;
  }

  start() {
    this.destinationForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.searchDestinations();
    });

    this.backButton.addEventListener('click', () => {
      this.showDiscoverView();
    });

    this.loadMoreButton.addEventListener('click', () => {
      this.loadPois({ append: true });
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

      this.showDestinationMessage(
        `Found ${destinations.length} destination(s) for "${query}". Click one to explore.`,
        false
      );
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

      const action = document.createElement('span');
      action.className = 'destination-action';
      action.textContent = 'Explore places →';

      button.append(type, name, formatted, action);
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
    this.loadMoreButton.hidden = true;

    this.destinationType.textContent = destination.getTypeLabel();
    this.destinationTitle.textContent = destination.getDisplayName();
    this.destinationSubtitle.textContent = destination.formatted;

    this.renderCategoryChips();
    this.clearRecommendations();
    this.clearCurrencyConverter();
    this.discoverView.hidden = true;
    this.destinationView.hidden = false;
    window.scrollTo(0, 0);

    // Weather and country facts load in the background so places are not delayed.
    this.loadWeather(destination);
    this.loadCountryInfo(destination);
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

    const flag = document.createElement('span');
    flag.className = 'info-flag';
    flag.textContent = country.flag || '🏳️';
    summary.appendChild(flag);

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
    rateDate.textContent = `Rates updated: ${conversion.getDateLabel()} (via European Central Bank)`;

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

      const badge = document.createElement('span');
      badge.className = `recommendation-badge badge-${item.type}`;
      badge.textContent = item.type;

      const title = document.createElement('h3');
      title.className = 'recommendation-title';
      title.textContent = item.title;

      const desc = document.createElement('p');
      desc.className = 'recommendation-desc';
      desc.textContent = item.description;

      card.append(badge, title, desc);
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

  async loadPois({ reset = false, append = false } = {}) {
    if (!this.destination || !this.selectedCategory) {
      return;
    }

    // "Load more" must wait for the current request. A new category or
    // destination is allowed to replace an in-flight request.
    if (this.isLoadingPois && !reset) {
      return;
    }

    if (reset) {
      this.offset = 0;
      this.seenPoiIds.clear();
      this.poiResults.textContent = '';
      this.loadMoreButton.hidden = true;
    }

    const requestToken = ++this.requestToken;
    this.isLoadingPois = true;
    this.setLoadMoreLoading(true);
    this.showPoiMessage(
      `Loading ${this.selectedCategory.label.toLowerCase()} in ${this.destination.getDisplayName()}...`,
      false
    );

    try {
      const result = await this.geoapifyService.searchPlaces(
        this.destination,
        this.selectedCategory.getApiCategories(),
        { limit: this.pageSize, offset: this.offset }
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

      this.renderPois(freshPois, append);
      this.offset += this.pageSize;
      this.loadMoreButton.hidden = !result.hasMore;

      this.showPoiMessage(
        `Showing ${this.seenPoiIds.size} place(s) in ${this.destination.getDisplayName()}.`,
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
        this.setLoadMoreLoading(false);
      }
    }
  }

  renderPois(pois, append) {
    if (!append) {
      this.poiResults.textContent = '';
    }

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
    this.isLoadingPois = false;
    this.destination = null;
    this.currentCountry = null;
    this.currentWeather = null;
    this.selectedCategory = null;
    this.offset = 0;
    this.seenPoiIds.clear();
    this.clearCountryInfo();
    this.clearWeather();
    this.clearRecommendations();
    this.poiResults.textContent = '';
    this.poiMessage.textContent = '';
    this.loadMoreButton.hidden = true;
    this.destinationView.hidden = true;
    this.discoverView.hidden = false;
    window.scrollTo(0, 0);
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

  setLoadMoreLoading(isLoading) {
    this.loadMoreButton.disabled = isLoading;
    this.loadMoreButton.textContent = isLoading
      ? 'Loading...'
      : 'Load more places';
  }
}

module.exports = HomeApp;
