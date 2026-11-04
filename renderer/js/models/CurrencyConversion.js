// CurrencyConversion models a currency conversion calculation result.
// It stores the input amount, the currencies, the exchange rate,
// and provides helper methods to format the calculated result with proper units.

class CurrencyConversion {
  constructor({ baseCurrency, targetCurrency, amount, rate, date }) {
    if (!baseCurrency || !targetCurrency) {
      throw new Error('Both base and target currencies are required.');
    }

    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      throw new Error('A valid non-negative amount is required.');
    }

    if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
      throw new Error('A valid positive exchange rate is required.');
    }

    this.baseCurrency = baseCurrency.toUpperCase();
    this.targetCurrency = targetCurrency.toUpperCase();
    this.amount = amount;
    this.rate = rate;
    this.date = date || new Date().toISOString().slice(0, 10);
  }

  // Calculate the converted amount: amount * exchange rate.
  calculateConvertedAmount() {
    return this.amount * this.rate;
  }

  // Format the converted result with clear currency code and appropriate decimals.
  getFormattedConvertedAmount() {
    const converted = this.calculateConvertedAmount();
    return `${converted.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${this.targetCurrency}`;
  }

  // Format the original amount with base currency code.
  getFormattedOriginalAmount() {
    return `${this.amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${this.baseCurrency}`;
  }

  // Clear label for the forward rate (e.g., 1 USD = 4.0640 MYR).
  getExchangeRateLabel() {
    const rateStr = this.rate >= 1 ? this.rate.toFixed(4) : this.rate.toPrecision(4);
    return `1 ${this.baseCurrency} = ${rateStr} ${this.targetCurrency}`;
  }

  // Clear label for the inverse exchange rate (e.g., 1 MYR = 0.2461 USD).
  getInverseRateLabel() {
    const inverse = 1 / this.rate;
    const invStr = inverse >= 1 ? inverse.toFixed(4) : inverse.toPrecision(4);
    return `1 ${this.targetCurrency} = ${invStr} ${this.baseCurrency}`;
  }

  // Date of the rate record.
  getDateLabel() {
    return this.date;
  }
}

module.exports = CurrencyConversion;
