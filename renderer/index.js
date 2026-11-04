const { ipcRenderer } = require('electron');

// Open-Meteo uses WMO weather codes. This object turns a code into readable text.
const WEATHER_DESCRIPTIONS = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

// A Place is one result from the Open-Meteo geocoding API.
// It keeps the data and the display logic together (encapsulation).
class Place {
  constructor(data) {
    if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      throw new Error('Place data is incomplete.');
    }

    this.name = data.name || 'Unknown place';
    this.country = data.country || '';
    this.admin1 = data.admin1 || '';
    this.latitude = data.latitude;
    this.longitude = data.longitude;
  }

  // Places with the same name can exist in different regions,
  // so we include the region and country to tell them apart.
  getDisplayName() {
    const parts = [this.name];

    if (this.admin1 && this.admin1 !== this.name) {
      parts.push(this.admin1);
    }

    if (this.country && this.country !== this.name) {
      parts.push(this.country);
    }

    return parts.join(', ');
  }
}

// A Weather object holds the current weather for one place.
// The UI does not need to know what the WMO codes mean (abstraction).
class Weather {
  constructor(data) {
    const current = data ? data.current : null;

    if (!current || typeof current.temperature_2m !== 'number') {
      throw new Error('Weather data is incomplete.');
    }

    this.temperature = current.temperature_2m;
    this.apparentTemperature =
      typeof current.apparent_temperature === 'number' ? current.apparent_temperature : null;
    this.windSpeed = typeof current.wind_speed_10m === 'number' ? current.wind_speed_10m : null;
    this.weatherCode = current.weather_code;
  }

  getDescription() {
    return WEATHER_DESCRIPTIONS[this.weatherCode] || 'Unknown conditions';
  }
}

// This class is responsible only for talking to the Open-Meteo API.
// The rest of the application uses its methods instead of building URLs itself.
class OpenMeteoService {
  constructor() {
    this.geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';
    this.forecastUrl = 'https://api.open-meteo.com/v1/forecast';
    this.maxResults = 10;
  }

  // Search for every place that matches the name.
  async searchPlaces(query) {
    const url = new URL(this.geocodingUrl);
    url.searchParams.set('name', query);
    url.searchParams.set('count', String(this.maxResults));
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const data = await this.request(url.toString());
    const results = Array.isArray(data.results) ? data.results : [];

    return results.map((item) => new Place(item));
  }

  // Get the current weather for one Place object.
  async getWeather(place) {
    const url = new URL(this.forecastUrl);
    url.searchParams.set('latitude', String(place.latitude));
    url.searchParams.set('longitude', String(place.longitude));
    url.searchParams.set(
      'current',
      'temperature_2m,apparent_temperature,weather_code,wind_speed_10m'
    );
    url.searchParams.set('timezone', 'auto');

    const data = await this.request(url.toString());
    return new Weather(data);
  }

  // One shared request method so error handling is not duplicated.
  async request(url) {
    let response;

    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error('Unable to reach Open-Meteo. Check your internet connection.');
    }

    if (!response.ok) {
      throw new Error(`Open-Meteo request failed (status ${response.status}).`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error('Open-Meteo returned an unreadable response.');
    }
  }
}

// WeatherApp handles the page: reading the form, showing messages,
// and displaying one result card for every matching place.
class WeatherApp {
  constructor(weatherService) {
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

    const itineraryButton = document.createElement('button');
    itineraryButton.type = 'button';
    itineraryButton.textContent = 'Create Itinerary';
    itineraryButton.addEventListener('click', () => {
      ipcRenderer.send('open-itinerary-window', place.getDisplayName());
    });
    card.appendChild(itineraryButton);

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

// Create the objects and give the UI its service (dependency injection).
const weatherService = new OpenMeteoService();
const app = new WeatherApp(weatherService);
app.start();
