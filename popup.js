let isBlurred = false; // To keep track of the current state

document.getElementById('toggleSwitch').addEventListener('change', (event) => {
  isBlurred = event.target.checked;
  sendMessageToContentScript(isBlurred);

  // Save the state to storage
  if (typeof browser !== 'undefined' && browser.storage) {
    browser.storage.local.set({ isBlurred });
  } else if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ isBlurred });
  }
});

function sendMessageToContentScript(blurState) {
  const getURL = typeof browser !== 'undefined' && browser.runtime ? browser.runtime.getURL : chrome.runtime.getURL;
  
  fetch(getURL('config.json'))
    .then(response => response.json())
    .then(config => {
      const queryTabs = typeof browser !== 'undefined' && browser.tabs ? browser.tabs.query : chrome.tabs.query;
      queryTabs({ active: true, currentWindow: true }, tabs => {
        const sendMessage = typeof browser !== 'undefined' && browser.tabs ? browser.tabs.sendMessage : chrome.tabs.sendMessage;
        sendMessage(tabs[0].id, { isBlurred: blurState, config });
      });
    })
    .catch(error => console.error('Error loading configuration:', error));
}

document.addEventListener('DOMContentLoaded', () => {
  const getStorage = typeof browser !== 'undefined' && browser.storage ? browser.storage.local.get : chrome.storage.local.get;
  
  getStorage('isBlurred', (result) => {
    document.getElementById('toggleSwitch').checked = result.isBlurred || false;
  });
});
