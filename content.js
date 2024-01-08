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

function processElementRule(rule, enableHiding) {
    document.querySelectorAll(rule.parentSelector).forEach(parent => {
        rule.childSelectors.forEach(({ selector, method, level }) => {
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

function processTableColumnRule(rule, enableHiding) {
    const table = document.querySelector(rule.tableSelector);
    if (!table) return;

    const targetColumnIndices = []
    if (rule.columnIdentifier.method === 'headerName') {
        const headers = table.querySelectorAll(rule.tableHeaderSelector);
        headers.forEach((header, index) => {
            const headerName = header.querySelector(rule.columnNameSelector);
            // if (headerName && headerName.textContent.trim() === rule.columnIdentifier.value) {
            //     columnIndex = index;
            // }
            if (headerName && rule.columnIdentifier.values.includes(headerName.textContent.trim())) {
                targetColumnIndices.push(index);
            }
        });
    } else if (rule.columnIdentifier.method === 'index') {
        // columnIndex = rule.columnIdentifier.value;
        targetColumnIndices.push(...rule.columnIdentifier.values);
    }

    // if (columnIndex === -1) return;
    if (targetColumnIndices.length === 0) return;

    const rows = table.querySelectorAll(rule.rowSelector);
    rows.forEach(row => {
        targetColumnIndices.forEach(columnIndex => {
            const cell = row.querySelectorAll(rule.cellSelector)[columnIndex];
            if (cell) {
                if (enableHiding) {
                    applyHidingMethod(cell, rule.hidingMethod, rule.level);
                } else {
                    removeHidingMethod(cell, rule.hidingMethod);
                }
            }
        })
    });
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
    config.rules.forEach(rule => {
        if (rule.type === "elementSelector") {
            // Process elementSelector rules
            processElementRule(rule, enableHiding);
        } else if (rule.type === "tableColumn") {
            // Process tableColumn rules
            processTableColumnRule(rule, enableHiding); // As previously defined
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
