// Feature: weather card UI
class WeatherCard {
  constructor(element) {
    this.element = element;
  }

  show(weather) {
    this.element.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'weather-title';
    title.textContent = '🌤 Weather';
    this.element.appendChild(title);

    const temp = document.createElement('div');
    temp.className = 'weather-temp';
    temp.textContent = `${weather.temperature} °C`;
    this.element.appendChild(temp);

    if (weather.time) {
      const time = document.createElement('div');
      time.className = 'weather-time';
      time.textContent = new Date(weather.time).toLocaleString();
      this.element.appendChild(time);
    }

    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
    this.element.innerHTML = '';
  }
}
