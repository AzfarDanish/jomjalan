// Feature: location search UI
class LocationSearch {
  constructor(input, suggestionsBox, clearBtn, onSelect) {
    this.input = input;
    this.suggestionsBox = suggestionsBox;
    this.clearBtn = clearBtn;
    this.onSelect = onSelect;

    this.results = [];
    this.activeIndex = -1;
    this.debounceTimer = null;

    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('keydown', (event) => this.handleKeydown(event));
    this.clearBtn.addEventListener('click', () => this.clear());
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.search-bar')) this.hideSuggestions();
    });
  }

  handleInput() {
    this.clearBtn.classList.toggle('visible', this.input.value.length > 0);
    clearTimeout(this.debounceTimer);

    const text = this.input.value.trim();
    if (text.length < 3) {
      this.hideSuggestions();
      return;
    }

    this.debounceTimer = setTimeout(() => this.runSearch(), 300);
  }

  async runSearch() {
    const text = this.input.value.trim();
    if (text.length < 3) {
      this.hideSuggestions();
      return;
    }
    clearTimeout(this.debounceTimer);

    this.results = await ipcRenderer.invoke('search-location', text);
    this.activeIndex = -1;
    this.renderSuggestions();
  }

  renderSuggestions() {
    this.suggestionsBox.innerHTML = '';

    if (this.results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'no-results';
      empty.textContent = 'No destinations found';
      this.suggestionsBox.appendChild(empty);
      this.suggestionsBox.classList.remove('hidden');
      return;
    }

    this.results.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'suggestion-item';

      const name = document.createElement('div');
      name.className = 'suggestion-name';
      name.textContent = item.name;
      row.appendChild(name);

      if (item.detail) {
        const detail = document.createElement('div');
        detail.className = 'suggestion-detail';
        detail.textContent = item.detail;
        row.appendChild(detail);
      }

      row.addEventListener('click', () => this.select(index));
      this.suggestionsBox.appendChild(row);
    });

    this.suggestionsBox.classList.remove('hidden');
  }

  handleKeydown(event) {
    const isOpen = !this.suggestionsBox.classList.contains('hidden');
    if (!isOpen) return;

    const rows = this.suggestionsBox.querySelectorAll('.suggestion-item');
    if (!rows.length) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : rows.length - 1;
      this.activeIndex = (this.activeIndex + step) % rows.length;
      rows.forEach((row, index) => row.classList.toggle('active', index === this.activeIndex));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.select(this.activeIndex >= 0 ? this.activeIndex : 0);
    } else if (event.key === 'Escape') {
      this.hideSuggestions();
    }
  }

  select(index) {
    const item = this.results[index];
    if (!item) return;

    this.input.value = item.detail ? `${item.name}, ${item.detail}` : item.name;
    this.input.blur();
    this.hideSuggestions();

    if (typeof this.onSelect === 'function') {
      this.onSelect(item);
    }
  }

  clear() {
    this.input.value = '';
    this.results = [];
    this.clearBtn.classList.remove('visible');
    this.hideSuggestions();
    this.input.focus();
  }

  hideSuggestions() {
    this.suggestionsBox.classList.add('hidden');
    this.activeIndex = -1;
  }
}
