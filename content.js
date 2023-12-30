function applyBlur(element, level = '5px') {
    element.style.filter = `blur(${level})`;
}

function scrambleText(element) {
    element.textContent = element.textContent.replace(/\w/g, function (char) {
        if (char.match(/[a-z]/i)) {
            // Alphabet rotation (ROT13)
            return String.fromCharCode((char <= "Z" ? 90 : 122) >= (char = char.charCodeAt(0) + 13) ? char : char - 26);
        } else if (char.match(/\d/)) {
            // Digit rotation (0-9)
            return String.fromCharCode(('9' >= (char = char.charCodeAt(0) + 1) ? char : char - 10));
        }
        return char; // Non-alphanumeric characters remain unchanged
    });
}

function unscrambleText(element) {
    element.textContent = element.textContent.replace(/\w/g, function (char) {
        if (char.match(/[a-z]/i)) {
            // Reverse ROT13
            return String.fromCharCode((char <= "Z" ? 90 : 122) >= (char = char.charCodeAt(0) + 13) ? char : char - 26);
        } else if (char.match(/\d/)) {
            // Reverse digit shift
            return String.fromCharCode(('0' <= (char = char.charCodeAt(0) - 1) ? char : char + 10));
        }
        return char; // Non-alphanumeric characters remain unchanged
    });
}

function applyHidingMethods(config) {
    config.forEach(({ parentSelector, childSelectors }) => {
        document.querySelectorAll(parentSelector).forEach(parentDiv => {
            childSelectors.forEach(({ selector, method, level }) => {
                const elements = parentDiv.querySelectorAll(selector);
                elements.forEach(element => {
                    if (method === 'blur') {
                        applyBlur(element, level); // Pass level, defaults to '5px' if undefined
                    } else if (method === 'scramble') {
                        scrambleText(element);
                    }
                    // Add more methods as needed
                });
            });
        });
    });
}


function removeHidingMethods(config) {
    config.forEach(({ parentSelector, childSelectors }) => {
        document.querySelectorAll(parentSelector).forEach(parentDiv => {
            childSelectors.forEach(({ selector, method }) => {
                const elements = parentDiv.querySelectorAll(selector);
                elements.forEach(element => {
                    if (method === 'blur') {
                        element.style.filter = ''; // Remove blur
                    } else if (method === 'scramble') {
                        unscrambleText(element); // Reverse scrambling
                    }
                    // Add reversal for more methods as needed
                });
            });
        });
    });
}

let currentlyBlurred = false; // Track if the blur is currently applied

function observeMutations(config) {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (currentlyBlurred && mutation.addedNodes.length) {
            applyHidingMethods(config); // Apply hiding methods to new elements
          }
        });
      });

    const observerConfig = {
        childList: true,
        subtree: true
    };

    const targetNode = document.body; // Adjust this as needed
    observer.observe(targetNode, observerConfig);
}

function handleMessage(message) {
    if (message.isBlurred) {
        applyHidingMethods(message.config);
    } else {
        removeHidingMethods(message.config);
    }
    currentlyBlurred = message.isBlurred;
}

fetch(browser.runtime.getURL('config.json'))
    .then(response => response.json())
    .then(config => {
        observeMutations(config); // Start observing for changes with the initial configuration
    })
    .catch(error => console.error('Error loading configuration:', error));

// Add the listener for messages
browser.runtime.onMessage.addListener(handleMessage);

function initializeExtension() {
    browser.storage.local.get('isBlurred', (result) => {
      const isBlurred = result.isBlurred || false;
      fetch(browser.runtime.getURL('config.json'))
        .then(response => response.json())
        .then(config => {
          if (isBlurred) {
            applyHidingMethods(config); // Apply initially for existing elements
            currentlyBlurred = true;
            observeMutations(config); // Setup observer for dynamic content
          } else {
            observeMutations(config); // Only observe, don't apply
          }
        })
        .catch(error => console.error('Error loading configuration:', error));
    });
  }
  
  
initializeExtension();
