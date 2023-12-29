function applyBlurToElements(config) {
    config.forEach(({ parentSelector, childSelector }) => {
        document.querySelectorAll(parentSelector).forEach(parentDiv => {
            const childDivs = parentDiv.querySelectorAll(childSelector);
            childDivs.forEach(div => div.style.filter = 'blur(5px)');
        });
    });
}

function removeBlurFromElements(config) {
    config.forEach(({ parentSelector, childSelector }) => {
        document.querySelectorAll(parentSelector).forEach(parentDiv => {
            const childDivs = parentDiv.querySelectorAll(childSelector);
            childDivs.forEach(div => div.style.filter = ''); // Remove the blur
        });
    });
}

function observeMutations(config) {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                blurElements(config); // Re-apply blur to new elements
            }
        });
    });

    const observerConfig = {
        childList: true,
        subtree: true // To observe changes in all descendants, not just children
    };

    const targetNode = document.body; // You might want to narrow this down
    observer.observe(targetNode, observerConfig);
}

function handleMessage(message) {
    if (message.action === 'blur') {
        applyBlurToElements(message.config);
    } else if (message.action === 'unblur') {
        removeBlurFromElements(message.config);
    }
}

fetch(browser.runtime.getURL('config.json'))
    .then(response => response.json())
    .then(config => {
        blurElements(config); // Initial blur
        observeMutations(config); // Start observing for changes
    })
    .catch(error => console.error('Error loading configuration:', error));

browser.runtime.onMessage.addListener(handleMessage);