const Place = require('../models/Place');
const Weather = require('../models/Weather');

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

module.exports = OpenMeteoService;
