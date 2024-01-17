function applyBlur(element, level = '3px') {
    element.style.filter = `blur(${level})`;
}

function findTextNode(element, searchText) {
    if (element.nodeType === Node.TEXT_NODE && element.textContent.includes(searchText)) {
        return element;
    }

    for (const child of element.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.TEXT_NODE) {
            const foundNode = findTextNode(child, searchText);
            if (foundNode) {
                return foundNode;
            }
        }
    }
    return null;
}

function applyRot13(element) {
    const textNode = findTextNode(element, element.textContent);
    if (!textNode) return; // This shouldn't happen

    textNode.textContent = textNode.textContent.replace(/\w/g, function (char) {
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

function processIndexedRule(rule, enableHiding, categories) {
    const parentElement = document.querySelector(rule.parentSelector);
    if (!parentElement) return;

    const childElement = parentElement.querySelectorAll(rule.childSelector);
    if (rule.index >= childElement.length) return;

    const targetElement = childElement[rule.index];
    const method = rule.method || categories[rule.category].method;
    const level = rule.level || categories[rule.category].level;

    if (enableHiding) {
        applyHidingMethod(targetElement, method, level);
    } else {
        removeHidingMethod(targetElement, method);
    }
}

function processTableColumnRule(rule, enableHiding, categories) {
    const tableSelector = rule.tableSelector || 'table';
    const tableHeaderSelector = rule.tableHeaderSelector || 'th';
    // const columnNameSelector = rule.columnNameSelector || 'th';
    const rowSelector = rule.rowSelector || 'tr';
    const cellSelector = rule.cellSelector || 'td';

    const table = document.querySelector(tableSelector);
    if (!table) return;

    rule.childSelectors.forEach(column => {
        let columnIndex = -1;
        if (rule.identifierMethod === 'headerName') {
            const headers = table.querySelectorAll(tableHeaderSelector);
            headers.forEach((header, index) => {
                // const headerName = header.querySelector(rule.columnNameSelector);
                // if (headerName && headerName.textContent.trim() === column.identifier) {
                //     columnIndex = index;
                // }
                if (header.textContent.trim() === column.identifier) {
                    columnIndex = index;
                }
            });
        } else if (rule.identifierMethod === 'index') {
            columnIndex = column.identifier;
        }

        if (columnIndex !== -1) {
            const method = column.method || categories[column.category].method;
            const level = column.level || categories[column.category].level;

            const rows = table.querySelectorAll(rowSelector);
            rows.forEach(row => {
                const cell = row.querySelectorAll(cellSelector)[columnIndex];
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

const hiddenMarkerClass = 'discreet-display'

function applyHidingMethod(cell, method, level) {
    if (!cell.classList.contains(hiddenMarkerClass)) {
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
        cell.classList.add(hiddenMarkerClass);
    }
}

function removeHidingMethod(cell, method) {
    if (cell.classList.contains(hiddenMarkerClass)) {
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
        cell.classList.remove(hiddenMarkerClass);
    }
}

let isUpdatingStyle = false;

function processAllRules(config, enableHiding) {
    if (isUpdatingStyle) return;
    isUpdatingStyle = true;

    const categories = config.categories;
    config.rules.forEach(rule => {
        if (rule.type === "elementSelector") {
            // Process elementSelector rules
            processElementRule(rule, enableHiding, categories);
        } else if (rule.type === "indexedSelector") {
            processIndexedRule(rule, enableHiding, categories);
        } else if (rule.type === "tableColumn") {
            // Process tableColumn rules
            processTableColumnRule(rule, enableHiding, categories);
        }
    });

    isUpdatingStyle = false;
}


let currentlyBlurred = false; // Track if the blur is currently applied


function observeMutations(config) {
    const observer = new MutationObserver(mutations => {
        processAllRules(config, currentlyBlurred);
    });

    const observerConfig = {
        childList: true,
        subtree: true,
        attributes: false
    };

    const targetNode = document.body;
    observer.observe(targetNode, observerConfig);
}

function validateConfig(config) {
    let isValid = true;

    // Check if all categories are used and all used categories exist
    const usedCategories = new Set();
    const definedCategories = new Set(Object.keys(config.categories));


    Object.entries(config.categories).forEach(([categoryName, categoryDetails]) => {
        if (!categoryDetails.method) {
            console.error(`Error: No hiding method specified for category '${categoryName}'.`);
            isValid = false;
        }
    });


    config.rules.forEach(rule => {
        if (rule.type === "elementSelector" || rule.type === "tableColumn") {
            rule.childSelectors.forEach(child => {
                if (child.category) {
                    usedCategories.add(child.category);
                    if (!definedCategories.has(child.category)) {
                        console.error(`Error: Category '${child.category}' used but not defined.`);
                        isValid = false;
                    }
                } else if (!child.method) {
                    console.error(`Error: No hiding method specified for selector '${child.selector}'.`);
                    isValid = false;
                }
            });
        } else if (rule.type === "indexedSelector") {
            if (rule.category) {
                usedCategories.add(rule.category);
                if (!definedCategories.has(rule.category)) {
                    console.error(`Error: Category '${rule.category}' used but not defined.`);
                    isValid = false;
                }
            } else if (!rule.method) {
                console.error(`Error: No hiding method specified for selector '${rule.selector}'.`);
                isValid = false;
            }
        }
    });

    // Warn about unused categories
    definedCategories.forEach(category => {
        if (!usedCategories.has(category)) {
            console.warn(`Warning: Category '${category}' defined but not used.`);
        }
    });

    return isValid;
}

const runtime = (typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : chrome.runtime;

function fetchAndProcessConfig(isBlurred) {
    fetch(runtime.getURL('config.json'))
        .then(response => response.json())
        .then(config => {
            if (validateConfig(config)) {
                processAllRules(config, isBlurred);
                observeMutations(config);
            } else {
                console.error("Terminating extension due to invalid configuration.");
            }
        })
        .catch(error => console.error('Error loading configuration: ', error));
}
function handleMessage(message, sender, sendResponse) {
    currentlyBlurred = message.isBlurred;
    fetchAndProcessConfig(currentlyBlurred);
}

function initializeExtension() {
    const handleIsBlurred = (result) => {
        const isBlurred = (result.isBlurred !== undefined) ? result.isBlurred : false;
        fetchAndProcessConfig(isBlurred);
    };
    if (typeof browser !== 'undefined' && browser.storage) {
        browser.storage.local.get('isBlurred').then(handleIsBlurred);
    } else if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('isBlurred', handleIsBlurred);
    }
}

initializeExtension();
runtime.onMessage.addListener(handleMessage);
