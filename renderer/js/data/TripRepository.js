const Trip = require('../models/Trip');

// TripRepository encapsulates all persistence operations using localStorage.
// It handles reading, storing, updating, deleting, and serializing trips,
// as well as error handling and data corruption safeguards.

class TripRepository {
  constructor(storageKey = 'jomjalan_trips_v1') {
    this.storageKey = storageKey;
  }

  // Helper to safely access localStorage (works in browser and Electron renderer)
  _getStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    // Fallback in-memory storage for non-DOM test environments
    if (!this._memoryStorage) {
      this._memoryStorage = {};
    }
    return {
      getItem: (key) => this._memoryStorage[key] || null,
      setItem: (key, val) => { this._memoryStorage[key] = String(val); },
      removeItem: (key) => { delete this._memoryStorage[key]; },
      clear: () => { this._memoryStorage = {}; },
    };
  }

  // Get all trips as Trip model instances
  getAll() {
    try {
      const storage = this._getStorage();
      const raw = storage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      // Reconstruct Trip instances and filter out any invalid/corrupted records
      return parsed
        .map((item) => {
          try {
            return Trip.fromJSON(item);
          } catch (e) {
            return null;
          }
        })
        .filter((trip) => trip !== null)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } catch (error) {
      console.error('Failed to read trips from storage:', error);
      return [];
    }
  }

  // Find a specific trip by its ID
  getById(id) {
    if (!id) return null;
    const trips = this.getAll();
    return trips.find((t) => t.id === id) || null;
  }

  // Save all trips to storage
  _saveAll(trips) {
    const storage = this._getStorage();
    const serialized = JSON.stringify(trips.map((t) => (t instanceof Trip ? t.toJSON() : t)));
    storage.setItem(this.storageKey, serialized);
  }

  // Create and persist a new trip
  create(tripData) {
    const validation = Trip.validate(tripData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(' '));
    }

    const trip = new Trip(tripData);
    const trips = this.getAll();
    trips.unshift(trip);
    this._saveAll(trips);
    return trip;
  }

  // Update an existing trip by ID
  update(id, updatedData) {
    if (!id) {
      throw new Error('Trip ID is required for update.');
    }

    const validation = Trip.validate(updatedData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(' '));
    }

    const trips = this.getAll();
    const index = trips.findIndex((t) => t.id === id);

    if (index === -1) {
      throw new Error(`Trip with ID "${id}" was not found.`);
    }

    const existing = trips[index];
    const updated = new Trip({
      ...existing.toJSON(),
      ...updatedData,
      id: existing.id, // Preserve record ID
      createdAt: existing.createdAt, // Preserve creation timestamp
      updatedAt: new Date().toISOString(),
    });

    trips[index] = updated;
    this._saveAll(trips);
    return updated;
  }

  // Delete a trip by ID
  delete(id) {
    if (!id) {
      throw new Error('Trip ID is required for deletion.');
    }

    const trips = this.getAll();
    const filtered = trips.filter((t) => t.id !== id);

    if (filtered.length === trips.length) {
      throw new Error(`Trip with ID "${id}" was not found.`);
    }

    this._saveAll(filtered);
    return true;
  }
}

module.exports = TripRepository;
