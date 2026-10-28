// Feature: search locations using Geoapify
async function searchLocation(apiKeys, text) {
  const query = (text || '').trim();
  if (query.length < 3 || !apiKeys.geoapifyKey) return [];

  try {
    const url =
      `https://api.geoapify.com/v1/geocode/autocomplete` +
      `?text=${encodeURIComponent(query)}&limit=6&lang=en&apiKey=${apiKeys.geoapifyKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Geoapify responded ${response.status}`);
    const data = await response.json();

    const seen = new Set();
    const results = [];
    for (const feature of data.features || []) {
      const props = feature.properties;
      if (!props?.formatted || seen.has(props.formatted)) continue;
      seen.add(props.formatted);

      const [name, ...rest] = props.formatted.split(',');
      results.push({
        name: name.trim(),
        detail: rest.join(',').trim(),
        lat: props.lat,
        lon: props.lon,
      });
    }
    return results;
  } catch (err) {
    console.error('Location search failed:', err.message);
    return [];
  }
}

module.exports = { searchLocation };
