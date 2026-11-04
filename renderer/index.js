const OpenMeteoService = require('./js/services/OpenMeteoService');
const ItineraryService = require('./js/services/ItineraryService');
const WeatherApp = require('./js/ui/WeatherApp');

// Create the objects here and pass the services in (composition).
const weatherService = new OpenMeteoService();
const itineraryService = new ItineraryService();
const weatherApp = new WeatherApp(weatherService, itineraryService);

weatherApp.start();
