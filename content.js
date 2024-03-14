const runtime = (typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : chrome.runtime;
const prefix = 'discreet-'
const uniqueStyleId = prefix + 'style';

let enabledCategories = new Set();
let extensionConfig = null;

const ruleProcessors = {
    elementSelector: processElementRule,
    indexedSelector: processIndexedRule,
    tableColumn: processTableColumnRule,
    cssSelector: processCssSelectorRule
};

let isUpdatingStyle = false;

function findTextNode(element, searchText) {
    if (element.nodeType === Node.TEXT_NODE && element.textContent.includes(searchText)) {
        return element;
    }

    for (const child of element.childNodes) {
        const foundNode = findTextNode(child, searchText);
        if (foundNode) {
            return foundNode;
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

    if (enabledCategories.has(category)) {
        element.classList.add(className);
    } else {
        element.classList.remove(className);
    }
}

function processAllRules(config, enableHiding) {
    const categories = config.categories;
    config.rules.forEach(rule => {
        const processRule = ruleProcessors[rule.type];
        if (processRule) {
            processRule(rule, enableHiding, categories);
        } else {
            console.error('No processor defined for rule type: ${rule.type}.')
        }
    });
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

// let enabledCategories = [];

// function handleMessage(message, sender, sendResponse) {
//     console.log(message);
//     if (message.action === "toggleCategory") {
//         if (message.isEnabled) {
//             if (!enabledCategories.includes(message.category)) {
//                 enabledCategories.push(message.category);
//             }
//         } else {
//             enabledCategories = enabledCategories.filter(cat => cat !== message.category);
//         }

//         fetch(browser.runtime.getURL('config.json'))
//             .then(response => response.json())
//             .then(config => {
//                 processAllRules(config, true);
//             })
//             .catch(error => console.error('Error loading configuration:', error));
//     }
// }


function handleMessage(message, sender, sendResponse) {
    // console.log(message);
    if (message.action === "toggleCategory") {
        // console.log(message, message, sendResponse);
        handleCategoryToggle(message.category, message.isEnabled);
    } else if (message.action === "getEnabledCategories") {
        sendResponse({ enabledCategories: Array.from(enabledCategories) });
    }
}

function handleCategoryToggle(category, isEnabled) {
    if (isEnabled) {
        enabledCategories.add(category);
    } else {
        enabledCategories.delete(category);
    }
    // console.log(enabledCategories);
    fetch(runtime.getURL('config.json'))
        .then(response => response.json())
        .then(config => {
            if (validateConfig(config)) {
                injectInlineCss(config);
                processAllRules(config, isEnabled);
                observeMutations(config);
            } else {
                console.error("Terminating extension due to invalid configuration.");
            }
        })
        .catch(error => console.error('Error loading configuration: ', error));
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


async function fetchAndProcessConfig(isBlurred) {
    try {
        const config = await (await fetch(runtime.getURL('config.json'))).json();
        if (validateConfig(config)) {
            processAllRules(config, true);
        } else {
            console.error("Terminating extension due to invalid configuration.");
        }
    } catch (error) {
        console.error('Error loading configuration: ', error);
    }
}
// function handleMessage(message, sender, sendResponse) {
//     currentlyBlurred = message.isBlurred;
//     fetchAndProcessConfig(currentlyBlurred);
// }

function initializeExtension() {
    fetchAndProcessConfig().catch(console.error);
}

runtime.onMessage.addListener(handleMessage);
initializeExtension();

