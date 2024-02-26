// Utilizing async/await for clearer asynchronous code
document.addEventListener('DOMContentLoaded', async () => {
  try {
      const config = await fetchConfig();
      populateCategoryToggles(config);
      updateToggleStatesFromContentScript();

      document.querySelector('.master-category-toggle').addEventListener('change', handleMasterToggleChange);
  } catch (error) {
      console.error('Error initializing popup:', error);
  }
});

function getURL(path) {
  if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
      return browser.runtime.getURL(path);
  }
  else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL(path);
  }
  else {
      console.error('Runtime environment not supported');
      return ''; // Or handle this case as appropriate for your extension
  }
}


async function fetchConfig() {
  const response = await fetch(getURL('config.json'));
  if (!response.ok) throw new Error('Failed to load configuration');
  return response.json();
}

function populateCategoryToggles(config) {
  const container = document.getElementById('category-toggles');
  Object.entries(config.categories).forEach(([key, value]) => {
      const label = createCategoryToggle(key, value.displayName);
      container.appendChild(label);
      container.appendChild(document.createElement('br'));
  });
}

function createCategoryToggle(key, displayName) {
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.classList.add('category-toggle');
  input.value = key;
  label.appendChild(input);
  label.append(` ${displayName}`);
  input.addEventListener('change', () => toggleCategory(key, input.checked));
  return label;
}

async function updateToggleStatesFromContentScript() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const response = await browser.tabs.sendMessage(tabs[0].id, { action: "getEnabledCategories" });
  if (response && response.enabledCategories) {
      updateToggleStates(response.enabledCategories);
  }
}

function handleMasterToggleChange(event) {
  const isMasterEnabled = event.target.checked;
  const categoryToggles = document.querySelectorAll('.category-toggle');
  categoryToggles.forEach(toggle => {
      toggle.checked = isMasterEnabled;
      toggleCategory(toggle.value, isMasterEnabled);
  });
}

function toggleCategory(category, isEnabled) {
  browser.tabs.query({ active: true, currentWindow: true }, tabs => {
      browser.tabs.sendMessage(tabs[0].id, { action: "toggleCategory", category, isEnabled });
  });
}

function updateToggleStates(enabledCategories) {
  const categoryToggles = document.querySelectorAll('.category-toggle');
  categoryToggles.forEach(toggle => {
      toggle.checked = enabledCategories.includes(toggle.value);
  });
  updateMasterToggleState();
}

function updateMasterToggleState() {
  const categoryToggles = document.querySelectorAll('.category-toggle');
  const allChecked = Array.from(categoryToggles).every(toggle => toggle.checked);
  const someChecked = Array.from(categoryToggles).some(toggle => toggle.checked);
  const masterToggle = document.querySelector('.master-category-toggle');

  masterToggle.checked = allChecked;
  masterToggle.classList.toggle('partial', someChecked && !allChecked);
}
