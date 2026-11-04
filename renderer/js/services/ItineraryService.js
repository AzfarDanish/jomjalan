const { ipcRenderer } = require('electron');

// This class wraps Electron IPC so the UI classes do not need to know
// how the main process opens windows or saves data.
class ItineraryService {
  openItinerary(placeName) {
    ipcRenderer.send('open-itinerary-window', placeName);
  }

  onPlaceSelected(callback) {
    ipcRenderer.on('country-selected', (event, placeName) => {
      callback(placeName);
    });
  }

  saveItinerary(data) {
    return ipcRenderer.invoke('save-itinerary', data);
  }
}

module.exports = ItineraryService;
