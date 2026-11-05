// CurrencyConversion models a currency conversion calculation result.
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
    this.convertedAmount = amount * rate;
    this.date = date || new Date().toISOString().slice(0, 10);
  }

  // Format the converted result with currency code
  getFormattedConvertedAmount() {
    return `${this.convertedAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${this.targetCurrency}`;
  }

  // Format the original amount with base currency code
  getFormattedOriginalAmount() {
    return `${this.amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${this.baseCurrency}`;
  }

  getExchangeRateLabel() {
    const rateStr = this.rate >= 1 ? this.rate.toFixed(4) : this.rate.toPrecision(4);
    return `1 ${this.baseCurrency} = ${rateStr} ${this.targetCurrency}`;
  }
}

module.exports = CurrencyConversion;
