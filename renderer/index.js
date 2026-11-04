const OpenMeteoService = require('./js/services/OpenMeteoService');
const WeatherApp = require('./js/ui/WeatherApp');

// Create the objects here and pass the service in (composition).
const weatherService = new OpenMeteoService();
const weatherApp = new WeatherApp(weatherService);

weatherApp.start();
