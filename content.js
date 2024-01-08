function applyBlur(element, level = '3px') {
    element.style.filter = `blur(${level})`;
}

function applyRot13(element) {
    element.textContent = element.textContent.replace(/\w/g, function (char) {
        if (/[a-zA-Z]/.test(char)) {
            const base = char.charCodeAt(0) >= 97 ? 'a'.charCodeAt(0) : 'A'.charCodeAt(0);
            return String.fromCharCode(base + (char.charCodeAt(0) - base + 13) % 26);
        } else {
            return char;
        }
    });
}

function applyPixelation(element, level) {
    let pixelSize;
    switch (level) {
        case 'low':
            pixelSize = '10px';
            break;
        case 'medium':
            pixelSize = '5px';
            break;
        case 'high':
            pixelSize = '2px';
            break;
        default:
            pixelSize = '5px';
    }

    element.style.filter = `blur(${pixelSize})`;
    // Additional CSS may be required for a more accurate pixelation effect
}

function processElementRule(rule, enableHiding, categories) {
    document.querySelectorAll(rule.parentSelector).forEach(parent => {
        rule.childSelectors.forEach(childSelector => {
            const selector = childSelector.selector;
            const method = childSelector.method || categories[childSelector.category].method;
            const level = childSelector.level || categories[childSelector.category].level;

            const elements = parent.querySelectorAll(selector);
            elements.forEach(element => {
                if (enableHiding) {
                    applyHidingMethod(element, method, level);
                } else {
                    removeHidingMethod(element, method);
                }
            });
        });
    });
}

function processTableColumnRule(rule, enableHiding, categories) {
    const tableSelector = rule.tableSelector || 'table';
    const columnNameSelector = rule.columnNameSelector || 'th';
    const rowSelector = rule.rowSelector || 'tr';
    const cellSelector = rule.cellSelector || 'td';

    const table = document.querySelector(rule.tableSelector);
    if (!table) return;

    rule.columns.forEach(column => {
        let columnIndex = -1;
        if (rule.identifierMethod === 'headerName') {
            const headers = table.querySelectorAll(rule.tableHeaderSelector);
            headers.forEach((header, index) => {
                const headerName = header.querySelector(rule.columnNameSelector);
                if (headerName && headerName.textContent.trim() === column.identifier) {
                    columnIndex = index;
                }
            });
        } else if (rule.identifierMethod === 'index') {
            columnIndex = column.identifier;
        }

        if (columnIndex !== -1) {
            const method = column.method || categories[column.category].method;
            const level = column.level || categories[column.category].level;

            const rows = table.querySelectorAll(rule.rowSelector);
            rows.forEach(row => {
                const cell = row.querySelectorAll(rule.cellSelector)[columnIndex];
                if (cell) {
                    if (enableHiding) {
                        applyHidingMethod(cell, method, level);
                    } else {
                        removeHidingMethod(cell, method);
                    }
                }
            })
        }
    })
}

function applyHidingMethod(cell, method, level) {
    switch (method) {
        case 'blur':
            applyBlur(cell, level);
            break;
        case 'pixelate':
            //
            break;
        case 'scramble':
            applyRot13(cell);
            break;
    }
}

function removeHidingMethod(cell, method) {
    switch (method) {
        case 'blur':
            cell.style.filter = '';
            break;
        case 'pixelate':
            cell.style.filter = '';
            break;
        case 'scramble':
            applyRot13(cell);
            break;
    }
}

function processAllRules(config, enableHiding) {
    const categories = config.categories;
    config.rules.forEach(rule => {
        if (rule.type === "elementSelector") {
            // Process elementSelector rules
            processElementRule(rule, enableHiding, categories);
        } else if (rule.type === "tableColumn") {
            // Process tableColumn rules
            processTableColumnRule(rule, enableHiding, categories); // As previously defined
        }
    });
}


let currentlyBlurred = false; // Track if the blur is currently applied

function observeMutations(config) {
    const observer = new MutationObserver(mutations => {
        // let shouldReapply = mutations.some(mutation => {
        //     // Iterate through all rules to see if the mutation target matches
        //     config.rules.forEach(rule => {
        //         if (rule.type === "tableColumn" && mutation.target.matches(rule.tableSelector)) {
        //             shouldReapply = true;
        //         } else if (rule.type === "elementSelector" && mutation.target.matches(rule.parentSelector)) {
        //             shouldReapply = true;
        //         }
        //     });
        // });

        // if (shouldReapply) {
        processAllRules(config, currentlyBlurred);
        // }
    });

    const observerConfig = {
        childList: true,
        subtree: true,
        attributes: false // If you need to observe attribute changes as well
    };

    const targetNode = document.body; // Adjust this as needed
    observer.observe(targetNode, observerConfig);
}

function handleMessage(message, sender, sendResponse) {
    currentlyBlurred = message.isBlurred;

    fetch(browser.runtime.getURL('config.json'))
        .then(response => response.json())
        .then(config => {
            processAllRules(config, currentlyBlurred);
        })
        .catch(error => console.error('Error loading configuration:', error));
}

function initializeExtension() {
    browser.storage.local.get('isBlurred', (result) => {
        const isBlurred = result.isBlurred || false;
        fetch(browser.runtime.getURL('config.json'))
            .then(response => response.json())
            .then(config => {
                processAllRules(config, isBlurred);
                observeMutations(config);
            })
            .catch(error => console.error('Error loading configuration:', error));
    });
}

initializeExtension();
browser.runtime.onMessage.addListener(handleMessage);
