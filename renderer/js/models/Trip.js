// Trip represents a saved travel plan in JomJalan.
// It encapsulates trip data, validation, calculation of daily budget,
// formatted labels, and JSON serialization/deserialization.

class Trip {
  constructor({
    id,
    destinationName,
    destinationType = 'Destination',
    country = '',
    countryCode = '',
    travelDate,
    durationDays,
    travelers,
    budget,
    currency = 'RM',
    notes = '',
    recommendations = [],
    createdAt,
    updatedAt,
  }) {
    this.id = id || `trip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.destinationName = typeof destinationName === 'string' ? destinationName.trim() : '';
    this.destinationType = destinationType || 'Destination';
    this.country = typeof country === 'string' ? country.trim() : '';
    this.countryCode = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : '';
    this.travelDate = travelDate || '';
    this.durationDays = Number(durationDays) || 1;
    this.travelers = Number(travelers) || 1;
    this.budget = Number(budget) || 0;
    this.currency = currency ? currency.trim().toUpperCase() : 'RM';
    this.notes = typeof notes === 'string' ? notes.trim() : '';
    this.recommendations = Array.isArray(recommendations) ? recommendations : [];
    
    const nowIso = new Date().toISOString();
    this.createdAt = createdAt || nowIso;
    this.updatedAt = updatedAt || nowIso;
  }

  // Validate all fields according to business rules.
  // Returns { isValid: boolean, errors: string[] }
  static validate(data) {
    const errors = [];

    if (!data.destinationName || typeof data.destinationName !== 'string' || !data.destinationName.trim()) {
      errors.push('Destination name is required.');
    }

    if (!data.travelDate || typeof data.travelDate !== 'string' || !data.travelDate.trim()) {
      errors.push('Travel date is required.');
    } else {
      const parsedDate = new Date(data.travelDate);
      if (isNaN(parsedDate.getTime())) {
        errors.push('A valid travel date is required.');
      }
    }

    const duration = Number(data.durationDays);
    if (!Number.isInteger(duration) || duration <= 0) {
      errors.push('Duration must be a whole number of at least 1 day.');
    }

    const travelers = Number(data.travelers);
    if (!Number.isInteger(travelers) || travelers <= 0) {
      errors.push('Number of travelers must be at least 1 person.');
    }

    const budget = Number(data.budget);
    if (isNaN(budget) || budget < 0) {
      errors.push('Budget must be a valid non-negative number.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Calculate estimated budget per day
  getDailyBudget() {
    if (this.durationDays <= 0) return 0;
    return this.budget / this.durationDays;
  }

  // Formatted date string for display (e.g. "12 Oct 2026")
  getFormattedDate() {
    if (!this.travelDate) return 'No date set';
    try {
      const parts = this.travelDate.split('-');
      if (parts.length === 3) {
        // Create date with local year, month, day to avoid timezone off-by-one shifts
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return this.travelDate;
    } catch {
      return this.travelDate;
    }
  }

  // Formatted budget with currency label (e.g. "RM 2,000.00" or "2,000.00 EUR")
  getFormattedBudget() {
    const formattedNum = this.budget.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return this.currency === 'RM' || this.currency === 'MYR'
      ? `RM ${formattedNum}`
      : `${formattedNum} ${this.currency}`;
  }

  getFormattedDailyBudget() {
    const formattedNum = this.getDailyBudget().toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return this.currency === 'RM' || this.currency === 'MYR'
      ? `RM ${formattedNum}`
      : `${formattedNum} ${this.currency}`;
  }

  // Serialize object for storage
  toJSON() {
    return {
      id: this.id,
      destinationName: this.destinationName,
      destinationType: this.destinationType,
      country: this.country,
      countryCode: this.countryCode,
      travelDate: this.travelDate,
      durationDays: this.durationDays,
      travelers: this.travelers,
      budget: this.budget,
      currency: this.currency,
      notes: this.notes,
      recommendations: this.recommendations,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // Reconstruct a Trip instance from stored raw data
  static fromJSON(json) {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid trip data format.');
    }
    return new Trip(json);
  }
}

module.exports = Trip;
