// ItineraryApp handles the itinerary form: showing the selected place,
// validating the form, and asking the itinerary service to save it.
class ItineraryApp {
  constructor(itineraryService) {
    if (!itineraryService) {
      throw new Error('ItineraryApp needs an itinerary service.');
    }

    this.itineraryService = itineraryService;
    this.titleElement = document.getElementById('title');
    this.dateInput = document.getElementById('dateInput');
    this.planInput = document.getElementById('planInput');
    this.saveButton = document.getElementById('saveBtn');
    this.selectedPlace = '';
  }

  start() {
    this.itineraryService.onPlaceSelected((placeName) => {
      this.selectedPlace = placeName;
      this.titleElement.textContent = `Create Itinerary for ${placeName}`;
    });

    this.saveButton.addEventListener('click', () => {
      this.save();
    });
  }

  async save() {
    const date = this.dateInput.value;
    const plan = this.planInput.value.trim();

    if (!date || !plan) {
      alert('Please fill all fields.');
      return;
    }

    try {
      const result = await this.itineraryService.saveItinerary({
        country: this.selectedPlace,
        date: date,
        plan: plan,
      });

      if (result.success) {
        alert('Itinerary saved!');
        this.planInput.value = '';
      } else {
        alert(result.message || 'Unable to save the itinerary.');
      }
    } catch (error) {
      alert('Unable to save the itinerary.');
    }
  }
}

module.exports = ItineraryApp;
