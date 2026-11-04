const fs = require('fs');

// This class is responsible only for reading and saving itinerary data.
// The file path is injected in the constructor so the store can also be
// tested with a temporary file (dependency injection).
class ItineraryStore {
  constructor(filePath) {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
      throw new Error('An itinerary file path is required.');
    }

    this.filePath = filePath;
  }

  getAll() {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }

    let fileContent;

    try {
      fileContent = fs.readFileSync(this.filePath, 'utf8');
    } catch (error) {
      throw new Error('Unable to read the itinerary file.');
    }

    let itineraries;

    try {
      itineraries = JSON.parse(fileContent);
    } catch (error) {
      throw new Error('The itinerary file does not contain valid JSON.');
    }

    if (!Array.isArray(itineraries)) {
      throw new Error('The itinerary file has an unexpected format.');
    }

    // Check stored records before using them.
    for (const itinerary of itineraries) {
      this.validate(itinerary);
    }

    return itineraries;
  }

  add(data) {
    const itinerary = this.validate(data);
    const itineraries = this.getAll();

    itineraries.push(itinerary);
    this.saveAll(itineraries);

    return itinerary;
  }

  saveAll(itineraries) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(itineraries, null, 2), 'utf8');
    } catch (error) {
      throw new Error('Unable to save the itinerary file.');
    }
  }

  // Validate and clean one itinerary record before it is stored.
  validate(data) {
    if (!data || typeof data.country !== 'string' || data.country.trim() === '') {
      throw new Error('Place name is required.');
    }

    if (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new Error('A valid date is required.');
    }

    if (typeof data.plan !== 'string' || data.plan.trim() === '') {
      throw new Error('Itinerary plan is required.');
    }

    return {
      country: data.country.trim(),
      date: data.date,
      plan: data.plan.trim(),
    };
  }
}

module.exports = ItineraryStore;
