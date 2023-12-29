// Function to send a message to the content script
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
  
  // Event listeners for buttons
  document.getElementById('blurButton').addEventListener('click', () => {
    sendMessageToContentScript('blur');
  });
  
  document.getElementById('unblurButton').addEventListener('click', () => {
    sendMessageToContentScript('unblur');
  });
  