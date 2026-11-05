const Weather = require('../models/Weather');

// OpenMeteoService communicates with the free Open-Meteo weather API.
class OpenMeteoService {
  constructor() {
    this.forecastUrl = 'https://api.open-meteo.com/v1/forecast';
  }

  // Get current weather for a location object or lat/lon coordinates.
  async getWeather(locationOrLat, optionalLon) {
    let lat, lon;
    if (typeof locationOrLat === 'object' && locationOrLat !== null) {
      lat = locationOrLat.latitude !== undefined ? locationOrLat.latitude : locationOrLat.lat;
      lon = locationOrLat.longitude !== undefined ? locationOrLat.longitude : locationOrLat.lon;
    } else {
      lat = locationOrLat;
      lon = optionalLon;
    }

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      throw new Error('A location with valid coordinates is required.');
    }

    const url = new URL(this.forecastUrl);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set(
      'current',
      'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,' +
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
