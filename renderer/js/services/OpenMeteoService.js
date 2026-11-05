const Weather = require('../models/Weather');
const Destination = require('../models/Destination');

// OpenMeteoService communicates with the free Open-Meteo weather API and geocoding search.
class OpenMeteoService {
  constructor() {
    this.forecastUrl = 'https://api.open-meteo.com/v1/forecast';
    this.geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';
  }

  // Search places (countries, cities, towns) using Open-Meteo's geocoding service
  async searchLocations(query, count = 10) {
    const trimmed = typeof query === 'string' ? query.trim() : '';
    if (!trimmed) {
      return [];
    }

    const url = new URL(this.geocodingUrl);
    url.searchParams.set('name', trimmed);
    url.searchParams.set('count', String(count));
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const data = await this.request(url.toString());
    const results = Array.isArray(data?.results) ? data.results : [];

    return results.map((item) => {
      const parts = [item.name, item.admin1, item.country].filter(Boolean);
      const uniqueParts = parts.filter((part, idx) => parts.indexOf(part) === idx);

      return new Destination({
        name: item.name,
        lat: item.latitude,
        lon: item.longitude,
        country: item.country || item.name,
        country_code: (item.country_code || '').toLowerCase(),
        state: item.admin1 || '',
        result_type: item.feature_code === 'PCLI' ? 'country' : 'city',
        formatted: uniqueParts.join(', '),
      });
    });
  }

  // Get current weather for a destination with latitude and longitude.
  async getWeather(destination) {
    const lat = destination ? destination.latitude : undefined;
    const lon = destination ? destination.longitude : undefined;

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      throw new Error('A location with valid coordinates is required.');
    }

    const url = new URL(this.forecastUrl);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,precipitation,' +
        'weather_code,wind_speed_10m,wind_direction_10m'
    );
    url.searchParams.set('timezone', 'auto');

    const data = await this.request(url.toString());
    return new Weather(data);
  }

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

module.exports = OpenMeteoService;
