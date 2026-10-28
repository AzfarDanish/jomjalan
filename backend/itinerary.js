// Feature: save itinerary to data/itineraries.json
const fs = require('fs');
const path = require('path');

function saveItinerary(data) {
  const filePath = path.join(__dirname, '..', 'data', 'itineraries.json');
  let itineraries = [];
  if (fs.existsSync(filePath)) {
    itineraries = JSON.parse(fs.readFileSync(filePath));
  }
  itineraries.push(data);
  fs.writeFileSync(filePath, JSON.stringify(itineraries, null, 2));
}

module.exports = { saveItinerary };
