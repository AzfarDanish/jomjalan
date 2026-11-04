const ItineraryService = require('./js/services/ItineraryService');
const ItineraryApp = require('./js/ui/ItineraryApp');

const itineraryService = new ItineraryService();
const itineraryApp = new ItineraryApp(itineraryService);

itineraryApp.start();
