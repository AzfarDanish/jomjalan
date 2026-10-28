// Simple Sidebar class using Object-Oriented Programming (OOP)
class Sidebar {
  constructor(containerId, activeTabName = 'Home') {
    this.container = document.getElementById(containerId);
    this.activeTabName = activeTabName;
    this.tabs = [];
    this.init();
  }

  init() {
    this.render();
  }

  addTab(name) {
    this.tabs.push(name);
    this.render();
  }

  selectTab(name) {
    this.activeTabName = name;
    this.render();
  }

  render() {
    if (!this.container) return;

    // Reset container content
    this.container.innerHTML = '';

    // Top title: JomJalan (centered, no icon or logo)
    const titleElement = document.createElement('h2');
    titleElement.className = 'sidebar-title';
    titleElement.textContent = 'JomJalan';
    this.container.appendChild(titleElement);

    // Navigation section
    const navElement = document.createElement('nav');
    navElement.className = 'sidebar-nav';

    // Create the Home tab button
    const tabButton = document.createElement('button');
    tabButton.className = 'sidebar-tab active';
    tabButton.textContent = 'Home';

    tabButton.addEventListener('click', () => {
      this.selectTab('Home');
    });

    navElement.appendChild(tabButton);
    this.container.appendChild(navElement);
  }
}
