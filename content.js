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

function processElementRule(rule, enableHiding, categories) {
    document.querySelectorAll(rule.parentSelector).forEach(parent => {
        rule.childSelectors.forEach(childSelector => {
            const selector = childSelector.selector;
            const category = childSelector.category;

            const elements = parent.querySelectorAll(selector);
            elements.forEach(element => {
                toggleHidingMethod(element, category, categories, enableHiding);
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

    toggleHidingMethod(targetElement, rule.category, categories, enableHiding);
}

function processTableColumnRule(rule, enableHiding, categories) {
    const tableSelector = rule.tableSelector || 'table';
    const tableHeaderSelector = rule.tableHeaderSelector || 'th';
    const rowSelector = rule.rowSelector || 'tr';
    const cellSelector = rule.cellSelector || 'td';

    const table = document.querySelector(tableSelector);
    if (!table) return;

    rule.childSelectors.forEach(column => {
        let columnIndex = -1;
        if (rule.identifierMethod === 'headerName') {
            const headers = table.querySelectorAll(tableHeaderSelector);
            headers.forEach((header, index) => {
                console.log(header.textContent.trim());
                if (header.textContent.trim() === column.identifier) {
                    columnIndex = index;
                }
            });
        } else if (rule.identifierMethod === 'index') {
            columnIndex = column.identifier;
        }

        if (columnIndex !== -1) {
            const rows = table.querySelectorAll(rowSelector);
            rows.forEach(row => {
                const cell = row.querySelectorAll(cellSelector)[columnIndex];
                if (cell) {
                    toggleHidingMethod(cell, column.category, categories, enableHiding);
                }
            })
        }
    })
}

function processCssSelectorRule(rule, enableHiding, categories) {
    const elements = document.querySelectorAll(rule.selector);
    const category = rule.category;
    
    elements.forEach(element => {
        toggleHidingMethod(element, category, categories, enableHiding)
    })
}

const prefix = 'discreet-'
const uniqueStyleId = prefix + 'style';

function injectInlineCss(config) {
    if (document.getElementById(uniqueStyleId)) {
        return;
    }

    const styleEl = document.createElement('style');
    styleEl.id = uniqueStyleId;

    document.head.appendChild(styleEl);

    let cssContent = '';

    Object.entries(config.categories).forEach(([categoryName, categoryDetails]) => {
        let cssRule = '';
        switch (categoryDetails.method) {
            case 'blur':
                cssRule = `filter: blur(${categoryDetails.level || '3px'});`;
                break;
            case 'pixelate':
                const pixelSize = categoryDetails.level === 'low' ? '10px' :
                    categoryDetails.level === 'medium' ? '5px' : '2px';
                cssRule = `filter: blur(${pixelSize});`;
                break;
            case 'scramble':
                // Class serves as a marker. Actual scrambling is done by JS.
                break;
            case 'invisible':
                cssRule = 'visibility: hidden;';
                break;
            // ... other methods ...
        }
        if (cssRule) {
            cssContent += `.${prefix}${categoryName} { ${cssRule} }\n`;
        }
    });

    styleEl.textContent = cssContent;
}

function toggleHidingMethod(element, category, categories, shouldApply) {
    const className = `${prefix}${category}`;
    const method = categories[category].method;
    
    if (shouldApply) {
        if (!element.classList.contains(className)) {
            element.classList.add(className);
            if (method === 'scramble') {
                applyRot13(element);
            }
        }
    } else {
        if (element.classList.contains(className)) {
            element.classList.remove(className);
            if (method === 'scramble') {
                applyRot13(element);
            }
        }
    }
}

const ruleProcessors = {
    "elementSelector": processElementRule,
    "indexedSelector": processIndexedRule,
    "tableColumn": processTableColumnRule,
    "cssSelector": processCssSelectorRule
};

let isUpdatingStyle = false;

function processAllRules(config, enableHiding) {
    if (isUpdatingStyle) return;
    isUpdatingStyle = true;

    const categories = config.categories;
    config.rules.forEach(rule => {
        const processRule = ruleProcessors[rule.type];
        if (processRule) {
            processRule(rule, enableHiding, categories);
        } else {
            console.error('No processor defined for rule type: ${rule.type}.')
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
        switch (rule.type) {
            case "elementSelector":
            case "tableColumn": {
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
                break;
            }
            case "cssSelector":
            case "indexedSelector": {
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
                break;
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
                injectInlineCss(config);
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
