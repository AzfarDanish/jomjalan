// WeatherApp handles the search page: reading the form, showing messages,
// and displaying one result card for every matching place.
class WeatherApp {
  constructor(weatherService) {
    if (!weatherService) {
      throw new Error('WeatherApp needs a weather service.');
    }

    this.weatherService = weatherService;
    this.form = document.getElementById('searchForm');
    this.input = document.getElementById('placeInput');
    this.searchButton = document.getElementById('searchBtn');
    this.messageElement = document.getElementById('message');
    this.resultsElement = document.getElementById('results');
    this.isSearching = false;
  }

  start() {
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.search();
    });
  }

  async search() {
    // Prevent a second search from mixing its results with the first one.
    if (this.isSearching) {
      return;
    }

    const query = this.input.value.trim();

    if (!query) {
      this.clearResults();
      this.showMessage('Please enter a place name.', true);
      return;
    }

    this.clearResults();
    this.showMessage('Searching...', false);
    this.isSearching = true;
    this.setSearching(true);

    try {
      const places = await this.weatherService.searchPlaces(query);

      if (places.length === 0) {
        this.showMessage(`No places found for "${query}".`, true);
        return;
      }

      this.showMessage(`Found ${places.length} place(s) for "${query}".`, false);
      await this.showWeatherForPlaces(places);
    } catch (error) {
      this.showMessage(error.message, true);
    } finally {
      this.isSearching = false;
      this.setSearching(false);
    }
  }

  // Load the weather for all matching places at the same time.
  async showWeatherForPlaces(places) {
    const cards = await Promise.all(places.map((place) => this.loadPlaceCard(place)));

    for (const card of cards) {
      this.resultsElement.appendChild(card);
    }
  }

  // If the weather for one place fails, only that card shows an error.
  async loadPlaceCard(place) {
    try {
      const weather = await this.weatherService.getWeather(place);
      return this.createResultCard(place, weather, null);
    } catch (error) {
      return this.createResultCard(place, null, error.message);
    }
  }

  createResultCard(place, weather, errorMessage) {
    const card = document.createElement('article');
    card.className = 'result-card';

    const title = document.createElement('h2');
    title.textContent = place.getDisplayName();
    card.appendChild(title);

    if (weather) {
      const temperature = document.createElement('p');
      temperature.className = 'temperature';
      temperature.textContent = `${Math.round(weather.temperature)}°C`;
      card.appendChild(temperature);

      const description = document.createElement('p');
      description.textContent = weather.getDescription();
      card.appendChild(description);

      const details = document.createElement('p');
      details.className = 'details';
      details.textContent =
        `Feels like ${this.formatNumber(weather.apparentTemperature, '°C')} | ` +
        `Wind ${this.formatNumber(weather.windSpeed, ' km/h')}`;
      card.appendChild(details);
    } else {
      const errorText = document.createElement('p');
      errorText.className = 'error-text';
      errorText.textContent = `Weather unavailable: ${errorMessage}`;
      card.appendChild(errorText);
    }

    return card;
  }

  // Small helper so missing values show "N/A" instead of "NaN".
  formatNumber(value, unit) {
    if (typeof value !== 'number') {
      return 'N/A';
    }

    return `${Math.round(value)}${unit}`;
  }

  setSearching(isSearching) {
    this.searchButton.disabled = isSearching;
    this.searchButton.textContent = isSearching ? 'Searching...' : 'Search';
  }

  showMessage(text, isError) {
    this.messageElement.textContent = text;
    this.messageElement.className = isError ? 'message error-text' : 'message';
  }

  clearResults() {
    this.resultsElement.textContent = '';
  }
}

module.exports = WeatherApp;
