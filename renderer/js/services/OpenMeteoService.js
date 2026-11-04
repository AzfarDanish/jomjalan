const Weather = require('../models/Weather');

// This class is responsible only for talking to the Open-Meteo API.
// The rest of the application uses its methods instead of building URLs itself.
class OpenMeteoService {
  constructor() {
    this.forecastUrl = 'https://api.open-meteo.com/v1/forecast';
  }

  // Get the current weather for anything with coordinates, such as a
  // Destination.
  async getWeather(location) {
    if (
      !location ||
      typeof location.latitude !== 'number' ||
      typeof location.longitude !== 'number'
    ) {
      throw new Error('A location with coordinates is required.');
    }

    const url = new URL(this.forecastUrl);
    url.searchParams.set('latitude', String(location.latitude));
    url.searchParams.set('longitude', String(location.longitude));
    url.searchParams.set(
      'current',
      'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,' +
        'weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m'
    );
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');
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
