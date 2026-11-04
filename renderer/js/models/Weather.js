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
      typeof current.apparent_temperature === 'number'
        ? current.apparent_temperature
        : null;
    this.humidity =
      typeof current.relative_humidity_2m === 'number'
        ? current.relative_humidity_2m
        : null;
    this.precipitation =
      typeof current.precipitation === 'number' ? current.precipitation : null;
    this.cloudCover =
      typeof current.cloud_cover === 'number' ? current.cloud_cover : null;
    this.windSpeed =
      typeof current.wind_speed_10m === 'number' ? current.wind_speed_10m : null;
    this.windDirection =
      typeof current.wind_direction_10m === 'number'
        ? current.wind_direction_10m
        : null;
    this.windGusts =
      typeof current.wind_gusts_10m === 'number' ? current.wind_gusts_10m : null;
    this.weatherCode = current.weather_code;

    // The daily values are optional, so the weather page still works
    // when the API returns only the current conditions.
    const daily = data.daily || {};
    this.highTemperature = this.readDailyValue(daily.temperature_2m_max);
    this.lowTemperature = this.readDailyValue(daily.temperature_2m_min);
  }

  readDailyValue(values) {
    if (!Array.isArray(values) || typeof values[0] !== 'number') {
      return null;
    }

    return values[0];
  }

  getDescription() {
    return WEATHER_DESCRIPTIONS[this.weatherCode] || 'Unknown conditions';
  }

  getTemperatureLabel() {
    return this.formatTemperature(this.temperature);
  }

  getFeelsLikeLabel() {
    return this.formatTemperature(this.apparentTemperature);
  }

  getHumidityLabel() {
    if (typeof this.humidity !== 'number') {
      return '';
    }

    return `${Math.round(this.humidity)}%`;
  }

  getPrecipitationLabel() {
    if (typeof this.precipitation !== 'number') {
      return '';
    }

    return `${Math.round(this.precipitation * 10) / 10} mm`;
  }

  getCloudCoverLabel() {
    if (typeof this.cloudCover !== 'number') {
      return '';
    }

    return `${Math.round(this.cloudCover)}%`;
  }

  // Wind comes from the compass direction, e.g. "12 km/h from NE".
  getWindLabel() {
    if (typeof this.windSpeed !== 'number') {
      return '';
    }

    const speed = `${Math.round(this.windSpeed)} km/h`;
    const direction = this.getWindDirectionLabel();

    return direction ? `${speed} from ${direction}` : speed;
  }

  getWindDirectionLabel() {
    if (typeof this.windDirection !== 'number') {
      return '';
    }

    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(this.windDirection / 45) % 8;

    return directions[index];
  }

  getWindGustLabel() {
    if (typeof this.windGusts !== 'number') {
      return '';
    }

    return `${Math.round(this.windGusts)} km/h`;
  }

  getTemperatureRangeLabel() {
    const high = this.formatTemperature(this.highTemperature);
    const low = this.formatTemperature(this.lowTemperature);

    if (high && low) {
      return `High ${high} · Low ${low}`;
    }

    if (high) {
      return `High ${high}`;
    }

    if (low) {
      return `Low ${low}`;
    }

    return '';
  }

  // Small helper so missing temperatures show nothing instead of "NaN".
  formatTemperature(value) {
    if (typeof value !== 'number') {
      return '';
    }

    return `${Math.round(value)}°C`;
  }
}

module.exports = Weather;
