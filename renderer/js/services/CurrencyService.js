const CurrencyConversion = require('../models/CurrencyConversion');

// CurrencyService manages communication with the Frankfurter API (https://api.frankfurter.dev/).
class CurrencyService {
  constructor() {
    this.baseUrl = 'https://api.frankfurter.dev/v1';
    this.cachedCurrencies = null;
  }

  // Fetch the dictionary of supported currencies
  async getCurrencies() {
    if (this.cachedCurrencies) {
      return this.cachedCurrencies;
    }

    const data = await this.request(`${this.baseUrl}/currencies`);
    this.cachedCurrencies = data;
    return data;
  }

  // Convert an amount between currencies
  async convert(from, to, amount) {
    const fromCode = typeof from === 'string' ? from.trim().toUpperCase() : '';
    const toCode = typeof to === 'string' ? to.trim().toUpperCase() : '';

    if (!fromCode || !toCode) {
      throw new Error('Please select both a source and a destination currency.');
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Please enter a valid amount greater than zero.');
    }

    if (fromCode === toCode) {
      return new CurrencyConversion({
        baseCurrency: fromCode,
        targetCurrency: toCode,
        amount: numericAmount,
        rate: 1.0,
        date: new Date().toISOString().slice(0, 10),
      });
    }

    const url = `${this.baseUrl}/latest?base=${encodeURIComponent(fromCode)}&symbols=${encodeURIComponent(toCode)}`;
    const result = await this.request(url);

    if (!result || !result.rates || typeof result.rates[toCode] !== 'number') {
      throw new Error(`Exchange rate for ${fromCode} to ${toCode} is currently unavailable.`);
    }

    return new CurrencyConversion({
      baseCurrency: fromCode,
      targetCurrency: toCode,
      amount: numericAmount,
      rate: result.rates[toCode],
      date: result.date,
    });
  }

  async request(url) {
    let response;

    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error(
        'Unable to reach the currency exchange service. Please check your internet connection.'
      );
    }

    if (response.status === 404) {
      throw new Error('The requested currency exchange rate was not found.');
    }

    if (!response.ok) {
      throw new Error(`Currency service request failed (status ${response.status}).`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error('The currency service returned an unreadable response.');
    }
  }
}

module.exports = CurrencyService;
