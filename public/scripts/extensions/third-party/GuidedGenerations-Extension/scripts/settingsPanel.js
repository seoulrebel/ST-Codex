// scripts/settingsPanel.js

import { extensionName, loadSettings, updateSettingsUI, addSettingsEventListeners, defaultSettings } from '../index.js';
import { renderExtensionTemplateAsync } from '../../../../extensions.js';

/**
 * Loads and renders the settings HTML for the extension.
 */
export async function loadSettingsPanel() {
    const containerId = `extension_settings_${extensionName}`;
    let container = document.getElementById(containerId);

    const parentContainer = document.getElementById('extensions_settings');
    console.log(`[${extensionName}] Checking parent container #extensions_settings:`, parentContainer ? 'Found' : 'NOT Found');

    if (!container) {
        if (parentContainer) {
            console.log(`[${extensionName}] Settings container #${containerId} not initially found. Ensuring it exists...`);
            container = document.createElement('div');
            container.id = containerId;
            parentContainer.appendChild(container);
        } else {
            console.error(`${extensionName}: Could not find main settings area (#extensions_settings) to create container.`);
            return;
        }
    } else {
        console.log(`${extensionName}: Settings container #${containerId} found.`);
        container.innerHTML = '';
    }

    try {
        console.log(`${extensionName}: Rendering settings template using renderExtensionTemplateAsync...`);
        const settingsHtml = await renderExtensionTemplateAsync(`third-party/${extensionName}`, 'settings');
        console.log(`${extensionName}: Settings template rendered successfully.`);
        $(container).html(settingsHtml);

            // Remove any manual clear buttons to avoid duplicates
            container.querySelectorAll('.gg-clear-button').forEach(btn => btn.remove());

            setTimeout(() => {
                console.log(`${extensionName}: DOM updated, now loading settings and adding listeners...`);
                loadSettings();
                updateSettingsUI();
                addSettingsEventListeners();

                // Setup preset and clear buttons with native event handlers
                const presetButtons = container.querySelectorAll('.gg-preset-button');
                presetButtons.forEach(btn => {
                    // Use existing clear button if present, else create one
                    let clearBtn = btn.nextElementSibling;
                    if (!clearBtn || !clearBtn.classList.contains('gg-clear-button')) {
                        clearBtn = document.createElement('button');
                        clearBtn.type = 'button';
                        clearBtn.className = 'gg-clear-button';
                        clearBtn.setAttribute('data-target', btn.getAttribute('data-target'));
                        clearBtn.textContent = '✖';
                        clearBtn.style.marginLeft = '4px';
                        clearBtn.style.color = 'red';
                        btn.insertAdjacentElement('afterend', clearBtn);
                    } else {
                        clearBtn.setAttribute('data-target', btn.getAttribute('data-target'));
                    }

                    // Preset fill click
                    btn.addEventListener('click', () => {
                        const key = btn.getAttribute('data-target');
                        const input = document.getElementById(`gg_${key}`);
                        if (input) {
                            input.value = 'GGSytemPrompt';
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });

                    // Clear click
                    clearBtn.addEventListener('click', () => {
                        const key = clearBtn.getAttribute('data-target');
                        const input = document.getElementById(`gg_${key}`);
                        if (input) {
                            input.value = '';
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                });

                // Setup default buttons with native event handlers
                const defaultButtons = container.querySelectorAll('.gg-default-button');
                defaultButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const key = btn.getAttribute('data-target'); // e.g., 'promptGuidedSwipe'
                        const input = document.getElementById(`gg_${key}`); // e.g., '#gg_promptGuidedSwipe'
                        if (input && defaultSettings.hasOwnProperty(key)) {
                            input.value = defaultSettings[key];
                            // Trigger change event to ensure SillyTavern recognizes the update
                            input.dispatchEvent(new Event('change', { bubbles: true })); 
                        } else {
                            console.warn(`[${extensionName}] Could not find input for gg_${key} or default setting for ${key}`);
                        }
                    });
                });

                // Static Raw checkboxes are defined in settings.html; dynamic insertion removed

                // Set width on preset text inputs
                container.querySelectorAll('.gg-setting-input[type="text"]').forEach(input => {
                    input.style.minWidth = '200px';
                });

                console.log(`[${extensionName}] Settings panel actions complete.`);
            }, 100);
    } catch (error) {
        console.error(`[${extensionName}] Error rendering settings template:`, error);
        if (container) {
            container.innerHTML = '<p>Error: Could not render settings template. Check browser console (F12).</p>';
        }
    }
}
