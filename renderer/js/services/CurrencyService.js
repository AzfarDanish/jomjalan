const CurrencyConversion = require('../models/CurrencyConversion');

// CurrencyService manages communication with the Frankfurter API (https://api.frankfurter.dev/).
// It provides supported currencies and calculates live exchange rates.
class CurrencyService {
  constructor() {
    this.baseUrl = 'https://api.frankfurter.dev/v1';
    this.cachedCurrencies = null;
  }

  // Fetch the dictionary of supported currencies: { [code]: [name] }
  async getCurrencies() {
    if (this.cachedCurrencies) {
      return this.cachedCurrencies;
    }

    const data = await this.request(`${this.baseUrl}/currencies`);
    this.cachedCurrencies = data;
    return data;
  }

  // Convert an amount from one currency to another using the Frankfurter API.
  async convert(fromCurrency, toCurrency, amount) {
    const from = typeof fromCurrency === 'string' ? fromCurrency.trim().toUpperCase() : '';
    const to = typeof toCurrency === 'string' ? toCurrency.trim().toUpperCase() : '';

    if (!from || !to) {
      throw new Error('Please select both a source and a destination currency.');
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Please enter a valid amount greater than zero.');
    }

    // Boundary case: When both currencies are the same, the rate is exactly 1.
    // Frankfurter returns HTTP 400 for identical currency pairs, so we handle it gracefully here.
    if (from === to) {
      return new CurrencyConversion({
        baseCurrency: from,
        targetCurrency: to,
        amount: numericAmount,
        rate: 1.0,
        date: new Date().toISOString().slice(0, 10),
      });
    }

    const url = `${this.baseUrl}/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`;
    const result = await this.request(url);

    if (!result || !result.rates || typeof result.rates[to] !== 'number') {
      throw new Error(`Exchange rate for ${from} to ${to} is currently unavailable.`);
    }

    return new CurrencyConversion({
      baseCurrency: from,
      targetCurrency: to,
      amount: numericAmount,
      rate: result.rates[to],
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
