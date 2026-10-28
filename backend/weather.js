// Feature: get weather using open-meteo
const { fetchWeatherApi } = require('openmeteo');

async function getWeather(lat, lon) {
  if (lat == null || lon == null) return null;

  try {
    const params = {
      latitude: lat,
      longitude: lon,
      hourly: 'temperature_2m',
    };
    const url = 'https://api.open-meteo.com/v1/forecast';
    const responses = await fetchWeatherApi(url, params);
    const response = responses[0];

    const utcOffsetSeconds = response.utcOffsetSeconds();
    const hourly = response.hourly();

    // Build a simple list of times and temperatures.
    const timeArray = Array.from(
      { length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() },
      (_, i) => new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) * 1000)
    );
    const temperatures = hourly.variables(0).valuesArray();

    return {
      temperature: temperatures[0],
      time: timeArray[0],
      hourly: timeArray.map((t, i) => ({
        time: t,
        temperature: temperatures[i],
      })),
    };
  } catch (err) {
    console.error('Weather fetch failed:', err.message);
    return null;
  }
}

module.exports = { getWeather };
