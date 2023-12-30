let isBlurred = false; // To keep track of the current state

document.getElementById('toggleSwitch').addEventListener('change', (event) => {
  isBlurred = event.target.checked;
  sendMessageToContentScript(isBlurred);

  // Save the state to storage
  browser.storage.local.set({ isBlurred });
});

function sendMessageToContentScript(blurState) {
  fetch(browser.runtime.getURL('config.json'))
    .then(response => response.json())
    .then(config => {
      browser.tabs.query({ active: true, currentWindow: true }, tabs => {
        browser.tabs.sendMessage(tabs[0].id, { isBlurred: blurState, config });
      });
    })
    .catch(error => console.error('Error loading configuration:', error));
}

document.addEventListener('DOMContentLoaded', () => {
  browser.storage.local.get('isBlurred', (result) => {
    isBlurred = result.isBlurred || false; // Default to false if not set
    document.getElementById('toggleSwitch').checked = isBlurred;
  });
});
