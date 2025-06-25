// scripts/persistentGuides/editGuidesPopup.js

/**
 * Edit Guides Popup - Handles UI for editing guide injections.
 */
import { extension_settings } from '../../../../../extensions.js';
import { extensionName } from '../../index.js';

export class EditGuidesPopup {
    constructor() {
        this.popupId = 'editGuidesPopup';
        this.popupElement = null;
        this.initialized = false;
        this.injectionData = {}; // To store the {key: {value, depth, ...}} object
        this.selectedGuideKey = null;
        this.customMode = false; // Flag for custom guide creation

        // Define the HTML structure once
        this.popupHtml = `
            <div id="${this.popupId}" class="gg-popup" style="display: none;">
                <div class="gg-popup-content">
                    <div class="gg-popup-header">
                        <h2>Edit Guide</h2>
                        <span class="gg-popup-close">&times;</span>
                    </div>
                    <div class="gg-popup-body">
                        <div class="gg-popup-section">
                            <label for="editGuideSelect">Select Guide:</label>
                            <select id="editGuideSelect">
                                <option value="">-- Select a Guide --</option>
                                <!-- Options will be populated dynamically -->
                            </select>
                        </div>
                        <div class="gg-popup-section">
                            <label for="editGuideTextarea">Guide Content:</label>
                            <textarea id="editGuideTextarea" rows="15" placeholder="Select a guide to see its content..."></textarea>
                        </div>
                        <div class="gg-popup-section custom-create-section" style="display:none;">
                            <p class="gg-popup-note">"Generate" creates a new Guide by running the Gen Prompt to the Model. <br />"Create" creates a blank template for later editing. <br />Start the Gen Prompt with "OOC: Don't continue the chat. Instead" To avoid a continuation of the chat as the guide.</p>
                            <label for="newGuideName">Name:</label>
                            <input id="newGuideName" type="text" placeholder="Guide Name">
                            <label for="newGuideDepth">Depth:</label>
                            <input id="newGuideDepth" type="number" value="1" min="0">
                            <label for="genPromptInput">Gen Prompt:</label>
                            <input id="genPromptInput" type="text" placeholder="OOC: Don't continue the chat. Instead...">
                        </div>
                    </div>
                    <div class="gg-popup-footer">
                        <button id="generateGuideButton" class="gg-button gg-button-secondary">Generate</button>
                        <button id="createGuideButton" class="gg-button gg-button-secondary">Create</button>
                        <button id="editGuideSaveButton" class="gg-button gg-button-primary">Save Changes</button>
                        <button id="editGuideCancelButton" class="gg-button gg-button-secondary">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize the popup elements and event listeners.
     * @param {HTMLElement} parentElement - The DOM element to append the popup to. Defaults to document.body.
     */
    async init(parentElement = document.body) {
        if (this.initialized) return;

        console.log('[GuidedGenerations] Initializing Edit Guides Popup...');

        // Check if popup exists, create if not
        this.popupElement = document.getElementById(this.popupId);
        if (!this.popupElement) {
            parentElement.insertAdjacentHTML('beforeend', this.popupHtml);
            this.popupElement = document.getElementById(this.popupId);
            console.log('[GuidedGenerations] Edit Guides Popup element created.');
        }

        // Ensure popupElement is valid before proceeding
        if (!this.popupElement) {
            console.error('[GuidedGenerations] Failed to find or create Edit Guides Popup element.');
            return;
        }

        this.setupEventListeners();
        this.initialized = true;
        console.log('[GuidedGenerations] Edit Guides Popup initialized successfully.');
    }

    /**
     * Setup event listeners for the popup controls.
     */
    setupEventListeners() {
        if (!this.popupElement) return;

        const closeButton = this.popupElement.querySelector('.gg-popup-close');
        const cancelButton = this.popupElement.querySelector('#editGuideCancelButton');
        const saveButton = this.popupElement.querySelector('#editGuideSaveButton');
        const selectElement = this.popupElement.querySelector('#editGuideSelect');
        const textareaElement = this.popupElement.querySelector('#editGuideTextarea');
        const nameInput = this.popupElement.querySelector('#newGuideName');
        const depthInput = this.popupElement.querySelector('#newGuideDepth');
        const genPromptInput = this.popupElement.querySelector('#genPromptInput');
        const generateButton = this.popupElement.querySelector('#generateGuideButton');
        const createButton = this.popupElement.querySelector('#createGuideButton');

        // Close functionality
        closeButton?.addEventListener('click', () => this.close());
        cancelButton?.addEventListener('click', () => this.close());

        // Guide selection change
        selectElement?.addEventListener('change', (event) => {
            this.selectedGuideKey = event.target.value;
            if (this.selectedGuideKey && this.injectionData[this.selectedGuideKey]) {
                textareaElement.value = this.injectionData[this.selectedGuideKey].value || '';
                textareaElement.disabled = false;
                saveButton.disabled = false;
            } else {
                textareaElement.value = 'Select a guide to see its content...';
                textareaElement.disabled = true;
                saveButton.disabled = true;
                this.selectedGuideKey = null; // Reset if invalid selection
            }
        });

        // Create new custom guide
        createButton?.addEventListener('click', async () => {
            const newName = nameInput.value.trim();
            let parsedDepth = parseInt(depthInput.value, 10);
            // If parsing fails (NaN), default to 1. Otherwise, use the parsed value.
            // If parsing fails (NaN), default to 1. Otherwise, use the parsed value, ensuring it's not less than 0.
            const newDepth = isNaN(parsedDepth) ? 1 : Math.max(0, parsedDepth);
            if (!newName) { console.error('[GuidedGenerations] Guide name required.'); return; }
            // Disallow spaces, pipes, slashes in guide ID
            const validNameRegex = /^[A-Za-z0-9_-]+$/;
            if (!validNameRegex.test(newName)) {
                const msg = 'Invalid guide name: Only letters, numbers, underscores, and hyphens allowed.';
                console.error(`[GuidedGenerations] ${msg}`);
                // Show warning to user
                alert(msg);
                return;
            }
            const role = extension_settings[extensionName]?.injectionEndRole ?? 'system';
            const context = SillyTavern.getContext();
            try {
                await context.executeSlashCommandsWithOptions(`/inject id=custom_${newName} position=chat scan=true depth=${newDepth} role=${role} .|`, { showOutput: false });
                const key = `script_inject_custom_${newName}`;
                this.injectionData[key] = { value: '', depth: newDepth };
                // Persist new injection
                if (typeof context.saveMetadata === 'function') { context.saveMetadata(); }
                // Rebuild dropdown
                selectElement.innerHTML = '<option value="">-- Select a Guide --</option>';
                Object.keys(this.injectionData).forEach(k => {
                    const opt = document.createElement('option');
                    opt.value = k;
                    const disp = k.startsWith('script_inject_') ? k.substring('script_inject_'.length) : k;
                    opt.textContent = disp;
                    selectElement.appendChild(opt);
                });
                selectElement.value = key;
                selectElement.dispatchEvent(new Event('change'));
            } catch (error) {
                console.error(`[GuidedGenerations] Error creating custom guide: ${error}`);
            }
        });

        // Generate new custom guide content without saving
        generateButton?.addEventListener('click', async () => {
            const newName = nameInput.value.trim();
            const newDepth = parseInt(depthInput.value, 10) || 1;
            const genPrompt = genPromptInput.value.trim();
            if (!newName) { alert('Guide ID required.'); return; }
            const validNameRegex = /^[A-Za-z0-9_-]+$/;
            if (!validNameRegex.test(newName)) { alert('Invalid Guide ID. Only letters, numbers, underscores, hyphens allowed.'); return; }
            if (!genPrompt) { alert('Gen Prompt required.'); return; }
            const role = extension_settings[extensionName]?.injectionEndRole ?? 'system';
            const context = SillyTavern.getContext();
            const script = `/gen ${genPrompt} | /inject id=${newName} position=chat scan=true depth=${newDepth} role=${role} [Take into special Consideration: {{pipe}}] | /listinjects |`;
            try {
                await context.executeSlashCommandsWithOptions(script, { showOutput: true });
            } catch (err) {
                console.error('[GuidedGenerations] Error generating guide:', err);
                alert('Error during generation. Check console.');
            }
        });

        // Save functionality
        saveButton?.addEventListener('click', () => this.saveChanges());

        // Disable save button initially
        saveButton.disabled = true;
    }

    /**
     * Open the popup and populate it with guide data.
     * @param {object} injectionData - The object containing guide keys and their data ({ value, depth, ... }).
     * @param {boolean} customMode - Flag for custom guide creation.
     */
    open(injectionData, customMode = false) {
        if (!this.initialized) {
            console.error('[GuidedGenerations] Popup not initialized. Call init() first.');
            // Optionally, try to initialize now
            // await this.init(); // This would make open async
            return;
        }
        this.customMode = customMode; // Store the mode

        // Populate and show
        this._populateAndShow(injectionData); 

        // Get references to the elements after _populateAndShow might have created/ensured them
        const generateButton = this.popupElement.querySelector('#generateGuideButton');
        const createButton = this.popupElement.querySelector('#createGuideButton');
        const customCreateSection = this.popupElement.querySelector('.custom-create-section');

        if (generateButton && createButton && customCreateSection) {
            const displayStyle = this.customMode ? 'inline-block' : 'none'; // For buttons
            const sectionDisplayStyle = this.customMode ? 'block' : 'none'; // For the section

            generateButton.style.display = displayStyle;
            createButton.style.display = displayStyle;
            customCreateSection.style.display = sectionDisplayStyle;
        } else {
            console.error('[GuidedGenerations] Critical error: Could not find custom mode UI elements in editGuidesPopup.');
        }

        this.popupElement.style.display = 'block'; // Show the popup itself
        this.adjustPopupPosition(); // Adjust position when opened
    }

    /**
     * Internal helper to populate and show the popup after init.
     * @param {object} injectionData - The object containing guide keys and their data.
     */
    _populateAndShow(injectionData) {
        this.injectionData = injectionData || {};
        this.selectedGuideKey = null; // Reset selection

        const selectElement = this.popupElement.querySelector('#editGuideSelect');
        const textareaElement = this.popupElement.querySelector('#editGuideTextarea');
        const saveButton = this.popupElement.querySelector('#editGuideSaveButton');

        // Clear previous options
        selectElement.innerHTML = '<option value="">-- Select a Guide --</option>';

        // Populate dropdown
        const guideKeys = Object.keys(this.injectionData);
        if (guideKeys.length > 0) {
            guideKeys.forEach(key => {
                const option = document.createElement('option');
                option.value = key;
                // Display without 'script_inject_' prefix
                const displayKey = key.startsWith('script_inject_') ? key.substring('script_inject_'.length) : key;
                option.textContent = displayKey;
                selectElement.appendChild(option);
            });
        } else {
             // Handle case with no guides - maybe disable select/show message
             console.log("[GuidedGenerations] No guides found to populate editor.");
        }

        // Reset textarea and button state
        textareaElement.value = 'Select a guide to see its content...';
        textareaElement.disabled = true;
        saveButton.disabled = true;

        // Show or hide create row for custom mode
        const createSection = this.popupElement.querySelector('.custom-create-section');
        createSection.style.display = this.customMode ? 'block' : 'none';
    }

    /**
     * Adjust popup position/size based on window dimensions (basic example).
     */
     adjustPopupPosition() {
        if (!this.popupElement) return;

        const popupContent = this.popupElement.querySelector('.gg-popup-content');
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        // Remove JS overrides - CSS will handle max-height/max-width
        // popupContent.style.maxHeight = `${windowHeight * 0.9}px`;
        // popupContent.style.maxWidth = `${windowWidth * 0.8}px`; // Example max width

        // Relying on CSS (e.g., position: absolute, top: 50%, left: 50%, transform: translate(-50%, -50%))
        // and max-height/max-width set in style.css.
        console.log(`[GuidedGenerations] Window size: ${windowWidth}x${windowHeight}. CSS handles popup sizing/positioning.`);
     }

    /**
     * Close the popup.
     */
    close() {
        if (this.popupElement) {
            this.popupElement.style.display = 'none';
        }
        this.selectedGuideKey = null; // Clear selection on close
    }

    /**
     * Save the changes made to the selected guide.
     */
    async saveChanges() {
        if (!this.selectedGuideKey || !this.injectionData[this.selectedGuideKey]) {
            console.error('[GuidedGenerations] No guide selected or data missing for save.');
            return;
        }

        const textareaElement = this.popupElement.querySelector('#editGuideTextarea');
        const newContent = textareaElement.value; // Get potentially modified content

        // Call the direct update method
        const success = await this.updateGuidePromptDirectly(this.selectedGuideKey, newContent);

        if (success) {
            console.log(`[GuidedGenerations] Guide "${this.selectedGuideKey}" updated directly in context.`);
            this.injectionData[this.selectedGuideKey].value = newContent;
            this.close();
            if (window.GuidedGenerations && typeof window.GuidedGenerations.updatePersistentGuideCounter === 'function') {
                window.GuidedGenerations.updatePersistentGuideCounter();
            }
        } else {
            console.error(`[GuidedGenerations] Failed to update guide "${this.selectedGuideKey}" directly.`);
        }
    }

    /**
     * Directly modifies the SillyTavern context's data for guide prompts or injections.
     * @param {string} key - The key/ID of the guide prompt to update (e.g., 'script_inject_state').
     * @param {string} content - The new content for the guide prompt.
     * @returns {boolean} - True if successful, false otherwise.
     */
    async updateGuidePromptDirectly(key, content) {
        try {
            const context = SillyTavern.getContext();
            const guideName = key.startsWith('script_inject_') ? key.substring('script_inject_'.length) : key;

            if (context.chatMetadata && context.chatMetadata.script_injects) {
                const injection = context.chatMetadata.script_injects[guideName];

                if (!injection) {
                    console.error(`[GuidedGenerations] Cannot update persistent injection: context.chatMetadata.script_injects['${guideName}'] not found.`);
                    return false;
                }

                // Update the persisted value
                injection.value = content;

                // Update the live session prompt using the built-in function
                if (typeof context.setExtensionPrompt === 'function') {
                    context.setExtensionPrompt(
                        key, // The prefixed key, e.g., 'script_inject_myguide'
                        content,
                        injection.position,
                        injection.depth,
                        injection.scan,
                        injection.role,
                        null // filterFunction - not supported by this editor
                    );
                }

                // Persist the changes without reloading the whole chat
                if (typeof context.saveMetadata === 'function') {
                    await context.saveMetadata();
                }

                return true;
            }

            console.error(`[GuidedGenerations] Cannot update prompt: no data store for key '${key}'.`);
            return false;
        } catch (error) {
            console.error(`[GuidedGenerations] Error updating prompt for key "${key}":`, error);
            return false;
        }
    }
}

// Create a singleton instance
const editGuidesPopup = new EditGuidesPopup();
export default editGuidesPopup; // Export the instance
