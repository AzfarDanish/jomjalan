// Feature: load API keys from .env.local
const fs = require('fs');
const path = require('path');

function loadKeys() {
  const apiKeys = {};
  try {
    const lines = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n');
    for (const line of lines) {
      const separator = line.indexOf('=');
      if (separator > 0) {
        apiKeys[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
      }
    }
  } catch (err) {
    console.error('Could not read .env.local:', err.message);
  }
  return apiKeys;
}

module.exports = { loadKeys };
