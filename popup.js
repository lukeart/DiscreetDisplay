let isBlurred = false; // To keep track of the current state

// document.getElementById('toggleSwitch').addEventListener('change', (event) => {
//   isBlurred = event.target.checked;
//   sendMessageToContentScript(isBlurred);

//   // Save the state to storage
//   browser.storage.local.set({ isBlurred });
// });

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
  const masterToggle = document.getElementById('master-category-toggle');
  const categoryToggles = document.querySelectorAll('.category-toggle');

  console.log(masterToggle);
  console.log(categoryToggles);


  const updateMasterToggleState = () => {
    const allEnabled = Array.from(categoryToggles).every(toggle => toggle.checked);
    console.log("allEnabled: " + allEnabled);

    masterToggle.checked = allEnabled;
  };

  
  const toggleCategory = (category, isEnabled) => {
    browser.tabs.query({active: true, currentWindow: true}, tabs => {
        browser.tabs.sendMessage(tabs[0].id, {
            action: "toggleCategory",
            category: category,
            isEnabled: isEnabled
        });
    });
  };

  masterToggle.addEventListener('change', () => {
    const isMasterEnabled = masterToggle.checked;
    categoryToggles.forEach(toggle => {
      toggle.checked = isMasterEnabled;
      toggleCategory(toggle.value, isMasterEnabled);
    });
  });

  categoryToggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
        toggleCategory(toggle.value, toggle.checked);
        updateMasterToggleState();
    });
  });

});
