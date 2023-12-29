let isBlurred = false; // To keep track of the current state

document.getElementById('toggleSwitch').addEventListener('change', (event) => {
  isBlurred = event.target.checked;
  sendMessageToContentScript(isBlurred ? 'blur' : 'unblur');
});

function sendMessageToContentScript(action) {
  fetch(browser.runtime.getURL('config.json'))
    .then(response => response.json())
    .then(config => {
      browser.tabs.query({ active: true, currentWindow: true }, tabs => {
        browser.tabs.sendMessage(tabs[0].id, { action, config });
      });
    })
    .catch(error => console.error('Error loading configuration:', error));
}
