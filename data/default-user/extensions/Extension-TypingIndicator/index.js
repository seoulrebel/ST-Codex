import {
    name2,
    eventSource,
    event_types,
    isStreamingEnabled,
    saveSettingsDebounced,
} from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { selected_group } from '../../../group-chats.js';
import { t } from '../../../i18n.js';

const MODULE = 'typing_indicator';
const legacyIndicatorTemplate = document.getElementById('typing_indicator_template');

/**
 * @typedef {Object} TypingIndicatorSettings
 * @property {boolean} enabled
 * @property {boolean} streaming
 */

/**
 * @type {TypingIndicatorSettings}
 */
const defaultSettings = {
    enabled: false,
    streaming: false,
};

/**
 * Get the settings for this extension.
 * If the settings are not found, the default settings are initialized.
 * @returns {TypingIndicatorSettings} Settings object
 */
function getSettings() {
    if (extension_settings[MODULE] === undefined) {
        extension_settings[MODULE] = structuredClone(defaultSettings);
    }

    for (const key in defaultSettings) {
        if (extension_settings[MODULE][key] === undefined) {
            extension_settings[MODULE][key] = defaultSettings[key];
        }
    }

    return extension_settings[MODULE];
}

/**
 * Draws the settings for this extension.
 * @param {TypingIndicatorSettings} settings Settings object
 * @returns {void}
 */
function addExtensionSettings(settings) {
    const settingsContainer = document.getElementById('typing_indicator_container') ?? document.getElementById('extensions_settings');
    if (!settingsContainer) {
        return;
    }

    const inlineDrawer = document.createElement('div');
    inlineDrawer.classList.add('inline-drawer');
    settingsContainer.append(inlineDrawer);

    const inlineDrawerToggle = document.createElement('div');
    inlineDrawerToggle.classList.add('inline-drawer-toggle', 'inline-drawer-header');

    const extensionName = document.createElement('b');
    extensionName.textContent = t`Typing Indicator`;

    const inlineDrawerIcon = document.createElement('div');
    inlineDrawerIcon.classList.add('inline-drawer-icon', 'fa-solid', 'fa-circle-chevron-down', 'down');

    inlineDrawerToggle.append(extensionName, inlineDrawerIcon);

    const inlineDrawerContent = document.createElement('div');
    inlineDrawerContent.classList.add('inline-drawer-content');

    inlineDrawer.append(inlineDrawerToggle, inlineDrawerContent);

    // Enabled
    const enabledCheckboxLabel = document.createElement('label');
    enabledCheckboxLabel.classList.add('checkbox_label');
    enabledCheckboxLabel.htmlFor = 'typingIndicatorEnabled';
    const enabledCheckbox = document.createElement('input');
    enabledCheckbox.id = 'typingIndicatorEnabled';
    enabledCheckbox.type = 'checkbox';
    enabledCheckbox.checked = settings.enabled;
    enabledCheckbox.addEventListener('change', () => {
        settings.enabled = enabledCheckbox.checked;
        saveSettingsDebounced();
    });
    const enabledCheckboxText = document.createElement('span');
    enabledCheckboxText.textContent = t`Enabled`;
    enabledCheckboxLabel.append(enabledCheckbox, enabledCheckboxText);
    inlineDrawerContent.append(enabledCheckboxLabel);

    // Show if streaming
    const showIfStreamingCheckboxLabel = document.createElement('label');
    showIfStreamingCheckboxLabel.classList.add('checkbox_label');
    showIfStreamingCheckboxLabel.htmlFor = 'typingIndicatorShowIfStreaming';
    const showIfStreamingCheckbox = document.createElement('input');
    showIfStreamingCheckbox.id = 'typingIndicatorShowIfStreaming';
    showIfStreamingCheckbox.type = 'checkbox';
    showIfStreamingCheckbox.checked = settings.streaming;
    showIfStreamingCheckbox.addEventListener('change', () => {
        settings.streaming = showIfStreamingCheckbox.checked;
        saveSettingsDebounced();
    });
    const showIfStreamingCheckboxText = document.createElement('span');
    showIfStreamingCheckboxText.textContent = t`Show if streaming`;
    showIfStreamingCheckboxLabel.append(showIfStreamingCheckbox, showIfStreamingCheckboxText);
    inlineDrawerContent.append(showIfStreamingCheckboxLabel);
}

/**
 * Shows a typing indicator in the chat.
 * @param {string} type Generation type
 * @param {any} _args Generation arguments
 * @param {boolean} dryRun Is this a dry run?
 * @returns {void}
 */
function showTypingIndicator(type, _args, dryRun) {
    const settings = getSettings();
    const noIndicatorTypes = ['quiet', 'impersonate'];

    if (noIndicatorTypes.includes(type) || dryRun) {
        return;
    }

    if (!settings.enabled || !name2 || (!settings.streaming && isStreamingEnabled())) {
        return;
    }

    if (legacyIndicatorTemplate && selected_group && !isStreamingEnabled()) {
        return;
    }

    const svgAnimation = `
        <span class="svg_dots" style="display: inline-block; vertical-align: middle; margin-right: 3px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 30 16" fill="var(--SmartThemeBodyColor)">
                <style>
                    .dot-fade-1 { animation: smoothFade 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0s infinite; }
                    .dot-fade-2 { animation: smoothFade 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s infinite; }
                    .dot-fade-3 { animation: smoothFade 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s infinite; }

                    @keyframes smoothFade {
                        0% { opacity: 0.2; }
                        30% { opacity: 1; }
                        60% { opacity: 0.4; }
                        100% { opacity: 0.2; }
                    }
                </style>
                <circle class="dot-fade-1" cx="5" cy="8" r="3" />
                <circle class="dot-fade-2" cx="15" cy="8" r="3" />
                <circle class="dot-fade-3" cx="25" cy="8" r="3" />
            </svg>
        </span>
    `;

    const baseText = t`${name2} is typing...`;
    const htmlContent = `${svgAnimation}${baseText}`;

    const existingIndicator = document.getElementById('typing_indicator');
    if (existingIndicator) {
        existingIndicator.innerHTML = htmlContent;
        return;
    }

    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typing_indicator';
    typingIndicator.classList.add('typing_indicator');
    typingIndicator.innerHTML = htmlContent;
    $(typingIndicator).hide();

    const chat = document.getElementById('chat');
    if (chat) {
        chat.appendChild(typingIndicator);
        const wasChatScrolledDown = Math.ceil(chat.scrollTop + chat.clientHeight) >= chat.scrollHeight;
        $(typingIndicator).show(() => {
            if (!wasChatScrolledDown) {
                return;
            }

            const computedStyle = getComputedStyle(typingIndicator);
            const bottomOffset = parseInt(computedStyle.bottom) + parseInt(computedStyle.marginBottom);
            chat.scrollTop += typingIndicator.clientHeight + bottomOffset;
        });
    }
}

/**
 * Hides the typing indicator.
 */
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing_indicator');
    if (typingIndicator) {
        $(typingIndicator).hide(() => typingIndicator.remove());
    }
}

(function () {
    const settings = getSettings();
    addExtensionSettings(settings);

    const showIndicatorEvents = [
        event_types.GENERATION_AFTER_COMMANDS,
    ];

    const hideIndicatorEvents = [
        event_types.GENERATION_STOPPED,
        event_types.GENERATION_ENDED,
        event_types.CHAT_CHANGED,
    ];

    showIndicatorEvents.forEach(e => eventSource.on(e, showTypingIndicator));
    hideIndicatorEvents.forEach(e => eventSource.on(e, hideTypingIndicator));
})();
