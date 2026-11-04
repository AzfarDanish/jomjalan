// The home page: search for a country or city, then browse its places by
// category. Places are only requested after the user picks a destination.
const PlaceCategoryCatalog = require('../logics/PlaceCategoryCatalog');

class HomeApp {
  constructor(geoapifyService, countryService) {
    if (!geoapifyService || !countryService) {
      throw new Error('HomeApp needs a Geoapify service and a country service.');
    }

    this.geoapifyService = geoapifyService;
    this.countryService = countryService;
    this.categoryCatalog = new PlaceCategoryCatalog();
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
    this.countryInfo = document.getElementById('countryInfo');
    this.categoryFilters = document.getElementById('categoryFilters');
    this.poiMessage = document.getElementById('poiMessage');
    this.poiResults = document.getElementById('poiResults');
    this.loadMoreButton = document.getElementById('loadMoreBtn');

    this.isSearching = false;
    this.isLoadingPois = false;
    this.destination = null;
    this.selectedCategory = null;
    this.offset = 0;
    this.seenPoiIds = new Set();
    this.requestToken = 0;
    this.countryRequestToken = 0;
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
    this.selectedCategory = this.categoryCatalog.getDefaultGroup();
    this.offset = 0;
    this.seenPoiIds.clear();
    this.poiResults.textContent = '';
    this.loadMoreButton.hidden = true;

    this.destinationType.textContent = destination.getTypeLabel();
    this.destinationTitle.textContent = destination.getDisplayName();
    this.destinationSubtitle.textContent = destination.formatted;

    this.renderCategoryChips();
    this.discoverView.hidden = true;
    this.destinationView.hidden = false;
    window.scrollTo(0, 0);

    // Country facts load in the background so places are not delayed.
    this.loadCountryInfo(destination);
    await this.loadPois({ reset: true });
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

      this.renderCountryInfo(country, destination);
    } catch (error) {
      if (requestToken !== this.countryRequestToken) {
        return;
      }

      this.showCountryInfoMessage(error.message);
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
    summary.className = 'country-info-summary';

    const flag = document.createElement('span');
    flag.className = 'country-info-flag';
    flag.textContent = country.flag || '🏳️';
    summary.appendChild(flag);

    // A country page already shows the name in the heading, so only add it
    // when the destination is a city inside that country.
    if (!destination.isCountry()) {
      const name = document.createElement('span');
      name.className = 'country-info-name';
      name.textContent = country.name;
      summary.appendChild(name);
    }

    const list = document.createElement('dl');
    list.className = 'country-info-facts';

    for (const fact of facts) {
      const item = document.createElement('div');
      item.className = 'country-info-fact';

      const label = document.createElement('dt');
      label.textContent = fact.label;

      const value = document.createElement('dd');
      value.textContent = fact.value;

      item.append(label, value);
      list.appendChild(item);
    }

    this.countryInfo.append(summary, list);
    this.countryInfo.hidden = false;
  }

  showCountryInfoMessage(text) {
    if (!this.countryInfo) {
      return;
    }

    const message = document.createElement('p');
    message.className = 'country-info-message';
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
    this.isLoadingPois = false;
    this.destination = null;
    this.selectedCategory = null;
    this.offset = 0;
    this.seenPoiIds.clear();
    this.clearCountryInfo();
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
