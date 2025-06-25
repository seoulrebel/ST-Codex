/**
 * Edit Intros Popup - Handles UI for editing character intros with various formatting options
 */

// Map of options to their corresponding stscript prompts
const EDIT_INTROS_OPTIONS = {
    // Perspective options
    'first-person-standard': 'Rewrite the intro in first person, where {{user}} is the narrator using I/me. Keep {{char}}\'s references consistent.',
    'first-person-by-name': 'Rewrite the intro in first person, but refer to {{user}} by their name instead of I/me, as if the narrator refers to themselves in the third person.',
    'first-person-as-you': 'Rewrite the intro in first person, but refer to {{user}} as \'you\', creating a self-addressing perspective.',
    'first-person-he-him': 'Rewrite the intro in first person, but refer to {{user}} using he/him pronouns, as if the narrator speaks about themselves in the third person masculine.',
    'first-person-she-her': 'Rewrite the intro in first person, but refer to {{user}} using she/her pronouns, as if the narrator speaks about themselves in the third person feminine.',
    'first-person-they-them': 'Rewrite the intro in first person, but refer to {{user}} using they/them pronouns, as if the narrator speaks about themselves in the third person neutral.',
    'second-person-as-you': 'Rewrite the intro in second person, addressing {{user}} directly as \'you\', and referring to {{char}} accordingly.',
    'third-person-by-name': 'Rewrite the intro in third person, referring to {{user}} by name and appropriate pronouns, and {{char}} by their pronouns, describing surroundings as if viewed from an outside observer.',
    
    // Tense options
    'past-tense': 'Rewrite the intro entirely in the past tense, as if these events had already occurred.',
    'present-tense': 'Rewrite the intro in present tense, making it feel immediate and ongoing.',
    
    // Style options
    'novella-style': 'Change in a novella style format: use full paragraphs, proper punctuation for dialogue, and a consistent narrative voice, as if taken from a published novel. Don\'t use * for narration and Don\'t add anything other to the text. Keep all links to images intakt.',
    'internet-rp-style': 'Change the intro in internet RP style: use asterisks for actions and narration like *She walks towards {{char}}*, keep all dialogue as is with quotes.',
    'literary-style': 'Rewrite the intro in a literary style: employ rich metaphors, intricate descriptions, and a more poetic narrative flow, while maintaining proper punctuation and formatting.',
    'script-style': 'Rewrite the intro in a script style: minimal narration, character names followed by dialogue lines, and brief scene directions in parentheses.',
    
    // Gender options
    'he-him': 'Rewrite the intro changing all references to {{user}} to use he/him pronouns.',
    'she-her': 'Rewrite the intro changing all references to {{user}} to use she/her pronouns.',
    'they-them': 'Rewrite the intro changing all references to {{user}} to use they/them pronouns.'
};

import { generateNewSwipe } from '../guidedSwipe.js';
import { extensionName } from '../../index.js';
import { getContext, extension_settings } from '../../../../../extensions.js';

// Class to handle the popup functionality
export class EditIntrosPopup {
    constructor() {
        // Initialize state for multiple selections
        this.selectedOptions = { 
            perspective: null, 
            tense: null, 
            style: null, 
            gender: null 
        };
        this.isCustomSelected = false; // Track if custom option is active
        this.popupElement = null;
        this.initialized = false;
        this.lastCustomCommand = sessionStorage.getItem('gg_lastCustomCommand') || ''; // Load last command
        // Track how many times applyChanges is called
        this.applyChangesCount = 0;
    }

    /**
     * Initialize the popup
     */
    async init() {
        if (this.initialized) return;

        // Helper function to generate option HTML (to reduce repetition)
        function generateOptionHtml(category, optionKey, title) {
            return `<div class="gg-option" data-category="${category}" data-option="${optionKey}">
                        <span class="gg-option-title">${title}</span>
                    </div>`;
        }

        function generateSubOptionHtml(category, value, title) {
            return `<div class="gg-suboption" data-category="${category}" data-value="${value}">${title}</div>`;
        }

        // Create popup container if it doesn't exist
        if (!document.getElementById('editIntrosPopup')) {
            // Create the popup container
            const popupHtml = `
                <div id="editIntrosPopup" class="gg-popup">
                    <div class="gg-popup-content">
                        <div class="gg-popup-header">
                            <h2>Edit Intros</h2>
                            <span class="gg-popup-close">&times;</span>
                        </div>
                        <div class="gg-popup-body">
                            <!-- Perspective Section -->
                            <div class="gg-popup-section">
                                <h3>Perspective</h3>
                                <div class="gg-option-group">
                                    <div class="gg-option" data-category="perspective" data-option="first-person"> <!-- Grouping Option -->
                                        <span class="gg-option-title">First Person</span>
                                        <div class="gg-suboptions">
                                            ${generateSubOptionHtml('perspective', 'first-person-standard', 'I/me (standard 1st person)')}
                                            ${generateSubOptionHtml('perspective', 'first-person-by-name', '{{user}} by name')}
                                            ${generateSubOptionHtml('perspective', 'first-person-as-you', '{{user}} as you')}
                                            ${generateSubOptionHtml('perspective', 'first-person-he-him', '{{user}} as he/him')}
                                            ${generateSubOptionHtml('perspective', 'first-person-she-her', '{{user}} as she/her')}
                                            ${generateSubOptionHtml('perspective', 'first-person-they-them', '{{user}} as they/them')}
                                        </div>
                                    </div>
                                    <div class="gg-option" data-category="perspective" data-option="second-person"> <!-- Grouping Option -->
                                        <span class="gg-option-title">Second Person</span>
                                        <div class="gg-suboptions">
                                            ${generateSubOptionHtml('perspective', 'second-person-as-you', '{{user}} as you')}
                                        </div>
                                    </div>
                                    <div class="gg-option" data-category="perspective" data-option="third-person"> <!-- Grouping Option -->
                                        <span class="gg-option-title">Third Person</span>
                                        <div class="gg-suboptions">
                                            ${generateSubOptionHtml('perspective', 'third-person-by-name', '{{user}} by name and pronouns')}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Tense Section -->
                            <div class="gg-popup-section">
                                <h3>Tense</h3>
                                <div class="gg-option-group">
                                    ${generateOptionHtml('tense', 'past-tense', 'Past Tense')}
                                    ${generateOptionHtml('tense', 'present-tense', 'Present Tense')}
                                </div>
                            </div>

                            <!-- Style Section -->
                            <div class="gg-popup-section">
                                <h3>Style</h3>
                                <div class="gg-option-group">
                                    ${generateOptionHtml('style', 'novella-style', 'Novella Style')}
                                    ${generateOptionHtml('style', 'internet-rp-style', 'Internet RP Style')}
                                    ${generateOptionHtml('style', 'literary-style', 'Literary Style')}
                                    ${generateOptionHtml('style', 'script-style', 'Script Style')}
                                </div>
                            </div>

                            <!-- Gender Section -->
                            <div class="gg-popup-section">
                                <h3>Gender (for {{user}})</h3>
                                <div class="gg-option-group">
                                    ${generateOptionHtml('gender', 'he-him', 'He/Him')}
                                    ${generateOptionHtml('gender', 'she-her', 'She/Her')}
                                    ${generateOptionHtml('gender', 'they-them', 'They/Them')}
                                </div>
                            </div>

                            <!-- Custom Command Section -->
                            <div class="gg-popup-section gg-custom-command-section">
                                <h3>Custom</h3>
                                <div class="gg-option gg-custom-option" data-category="custom" data-option="custom"> <!-- Added category -->
                                    <span class="gg-option-title">Use Custom Instruction Below</span>
                                </div>
                                <textarea id="gg-custom-edit-command" placeholder="Enter custom rewrite instruction here...">${this.lastCustomCommand}</textarea>
                            </div>
                        </div>
                        <div class="gg-popup-footer">
                            <button id="ggCancelEditIntros" class="gg-button gg-button-secondary">Cancel</button>
                            <button id="ggMakeNewIntro" class="gg-button gg-button-primary">Make New Intro</button>
                            <button id="ggApplyEditIntros" class="gg-button gg-button-primary">Edit Intro</button>
                        </div>
                    </div>
                </div>
            `;

            // Append to body
            const popupContainer = document.createElement('div');
            popupContainer.innerHTML = popupHtml;
            document.body.appendChild(popupContainer.firstElementChild);
        }

        // Get the popup element reference
        this.popupElement = document.getElementById('editIntrosPopup');

        // Setup event listeners
        this.setupEventListeners();

        this.initialized = true;
    }

    /**
     * Setup event listeners for the popup elements
     */
    setupEventListeners() {
        if (!this.popupElement) return;

        const closeButton = this.popupElement.querySelector('.gg-popup-close');
        const cancelButton = this.popupElement.querySelector('#ggCancelEditIntros');
        const applyButton = this.popupElement.querySelector('#ggApplyEditIntros');
        const makeNewIntroButton = this.popupElement.querySelector('#ggMakeNewIntro');
        const options = this.popupElement.querySelectorAll('.gg-option:not(.gg-custom-option)'); // Exclude custom
        const suboptions = this.popupElement.querySelectorAll('.gg-suboption');
        const customOption = this.popupElement.querySelector('.gg-custom-option');
        const customCommandTextarea = this.popupElement.querySelector('#gg-custom-edit-command');

        // Close/Cancel Actions
        closeButton.addEventListener('click', () => this.close());
        cancelButton.addEventListener('click', () => this.close());

        // Apply/Make New Actions
        applyButton.addEventListener('click', () => this.applyChanges());
        makeNewIntroButton.addEventListener('click', () => this.makeNewIntro());

        // --- Category Option/Suboption Click Logic ---
        const handleCategorySelection = (element) => {
            const category = element.dataset.category;
            const value = element.dataset.value || element.dataset.option; // Use data-value for suboptions, data-option for options
            
            // Deselect other options *within the same category*
            this.popupElement.querySelectorAll(`[data-category="${category}"]`).forEach(el => {
                el.classList.remove('selected');
            });

            // Select the clicked option
            element.classList.add('selected');
            // If it's a suboption, also mark its parent option visually (optional, for clarity)
            if (element.classList.contains('gg-suboption')) {
                 element.closest('.gg-option')?.classList.add('selected');
            }

            // Update state
            this.selectedOptions[category] = value;
            this.isCustomSelected = false;

            // Deselect custom option visually
            customOption.classList.remove('selected');
            console.log('Selected Options:', this.selectedOptions);
        };

        options.forEach(option => {
            // Handle clicks on main options that DON'T have suboptions
            if (!option.querySelector('.gg-suboptions')) {
                option.addEventListener('click', (event) => {
                    // Prevent triggering if click was on the suboptions container itself
                    if (event.target.closest('.gg-suboptions')) return; 
                    handleCategorySelection(option);
                 });
            }
            // We don't need listeners on parent options with suboptions, only the suboptions themselves
        });

        suboptions.forEach(suboption => {
            suboption.addEventListener('click', () => {
                handleCategorySelection(suboption);
            });
        });

        // --- Custom Option Click Logic ---
        customOption.addEventListener('click', () => {
            // Deselect all category options
            this.popupElement.querySelectorAll('.gg-option:not(.gg-custom-option), .gg-suboption').forEach(el => {
                el.classList.remove('selected');
            });

            // Reset category selections in state
            Object.keys(this.selectedOptions).forEach(key => {
                this.selectedOptions[key] = null;
            });

            // Select custom option
            customOption.classList.add('selected');
            this.isCustomSelected = true;
            console.log('Custom Selected. Options:', this.selectedOptions);
        });

        // --- Custom Textarea Input Logic ---
        customCommandTextarea.addEventListener('input', () => {
             // Automatically select 'Custom' if the user types in the textarea
            if (!this.isCustomSelected) {
                customOption.click(); // Simulate a click on the custom option
            }
        });
    }

    deselectAllPresets() {
        this.popupElement.querySelectorAll('.gg-option:not(.gg-custom-option), .gg-suboption').forEach(el => {
            el.classList.remove('selected');
        });
        Object.keys(this.selectedOptions).forEach(key => {
            this.selectedOptions[key] = null;
        });
        this.isCustomSelected = false;
    }

    restoreSelectionState() {
        const customOption = this.popupElement.querySelector('.gg-custom-option');
        if (this.isCustomSelected) {
            customOption.classList.add('selected');
        } else {
            Object.keys(this.selectedOptions).forEach(key => {
                const selectedElement = this.popupElement.querySelector(`[data-option="${key}"], [data-value="${this.selectedOptions[key]}"]`);
                if (selectedElement) {
                    selectedElement.classList.add('selected');
                }
            });
            customOption.classList.remove('selected'); 
        }
    }

    /**
     * Resets the selection state both visually and in the internal state object,
     * but preserves the custom command text.
     */
    _resetSelections() {
        // Reset state variables
        this.isCustomSelected = false;
        Object.keys(this.selectedOptions).forEach(key => {
            this.selectedOptions[key] = null;
        });

        // Reset visual state
        this.popupElement.querySelectorAll('.gg-option.selected, .gg-suboption.selected').forEach(el => {
            el.classList.remove('selected');
        });
        // Ensure custom is visually deselected too
        this.popupElement.querySelector('.gg-custom-option')?.classList.remove('selected');
        
        console.log('Selections reset.');
        // NOTE: We intentionally do NOT clear the custom command textarea here.
    }

    /**
     * Show or hide loading indicator by disabling buttons and updating text.
     */
    _setLoading(isLoading) {
        const applyBtn = this.popupElement.querySelector('#ggApplyEditIntros');
        const makeBtn = this.popupElement.querySelector('#ggMakeNewIntro');
        const cancelBtn = this.popupElement.querySelector('#ggCancelEditIntros');
        if (applyBtn) {
            applyBtn.disabled = isLoading;
            applyBtn.textContent = isLoading ? 'Loading...' : 'Edit Intro';
        }
        if (makeBtn) {
            makeBtn.disabled = isLoading;
            makeBtn.textContent = isLoading ? 'Loading...' : 'Make New Intro';
        }
        if (cancelBtn) {
            cancelBtn.disabled = isLoading;
        }
    }

    /**
     * Open the popup
     */
    open() {
        if (!this.initialized) {
            this.init().then(() => {
                if (this.popupElement) {
                    this.popupElement.style.display = 'block';
                }
            });
        } else if (this.popupElement) {
            this.popupElement.style.display = 'block';
        }
    }

    /**
     * Close the popup
     */
    close() {
        if (this.popupElement) {
            this.popupElement.style.display = 'none';
        }
        this.deselectAllPresets();
    }

    /**
     * Apply the selected changes
     */
    async applyChanges() {
        // Increment and log invocation count
        this.applyChangesCount++;
        console.log(`[GuidedGenerations] applyChanges invocation #${this.applyChangesCount}`);
        this._setLoading(true);
        let instruction = '';
        const customCommandTextarea = this.popupElement.querySelector('#gg-custom-edit-command');

        // --- Build Instruction --- 
        if (this.isCustomSelected) {
            const customCommand = customCommandTextarea.value.trim();
            if (customCommand === '') {
                alert('Custom option is selected, but the instruction text area is empty.');
                this._setLoading(false);
                return;
            }
            instruction = customCommand;
            console.log('[GuidedGenerations] Applying custom instruction.');
            sessionStorage.setItem('gg_lastCustomCommand', customCommand);
        } else {
            const selectedInstructions = [];
            // Combine instructions from selected categories
            Object.keys(this.selectedOptions).forEach(category => {
                const selectedKey = this.selectedOptions[category];
                if (selectedKey && EDIT_INTROS_OPTIONS[selectedKey]) {
                    selectedInstructions.push(EDIT_INTROS_OPTIONS[selectedKey]);
                }
            });
            
            if (selectedInstructions.length === 0) {
                 alert('Please select at least one category option, or choose Custom and enter an instruction.');
                 this._setLoading(false);
                 return; 
            }
            instruction = selectedInstructions.join('. '); // Join instructions with a period and space
            console.log(`[GuidedGenerations] Applying combined presets: ${instruction}`);
        }

        const textareaElement = document.getElementById('send_textarea');
        const customEdit = textareaElement ? textareaElement.value.trim() : '';

        // --- Construct Script (Existing logic, using the new 'instruction') ---
        const scriptPart1 = `

            // Editing Intro messages |
            /sys at=0 Editing Intro messages | 
            /hide 0 |

            // Set the instruction |
            /setvar key=inp "${instruction.replace(/"/g, '\\"')}" |

            // Rewrite the intro |
            /inject id=msgtorework position=chat ephemeral=true scan=true depth=0 role=assistant {{lastMessage}}|
            /inject id=instruct position=chat ephemeral=true scan=true depth=0 [Write msgtorework again but correct it to reflect the following: {{getvar::inp}}. Don't cut the message or make changes besides that.] | `;

        const scriptPart2 = `/cut 0|`;

        // --- Preset Switching Logic ---
        const introPresetSettingKey = 'presetEditIntros'; // CORRECTED: Setting key for the Edit Intros preset
        const targetPresetNameRaw = extension_settings[extensionName]?.[introPresetSettingKey] ?? '';
        const targetPresetName = targetPresetNameRaw.trim();

        let presetSwitchStart = '';
        let presetSwitchEnd = '';

        if (targetPresetName) { // Only switch if a target preset name is configured and not empty
            presetSwitchStart = `
// Get the currently active preset|
/preset|
/setvar key=currentPreset {{pipe}} |
+
// If current preset is already ${targetPresetName}, do NOT overwrite oldPreset|
/if left={{getvar::currentPreset}} rule=neq right="${targetPresetName}" {: 
   // Store the current preset in oldPreset|
   /setvar key=oldPreset {{getvar::currentPreset}} |
   // Now switch to ${targetPresetName}|
   /preset ${targetPresetName} |
:}| 
`;
            presetSwitchEnd = `
// Switch back to the original preset if it was stored|
/preset {{getvar::oldPreset}} |
`;
        } else {
            presetSwitchStart = `// No preset configured for Edit Intros or preset switching disabled.|`;
            presetSwitchEnd = `// No preset configured for Edit Intros or preset switching disabled.|`;
        }

        // --- Execute Script (Existing logic) ---
        try {
            const context = getContext();
            // Log the outgoing Editing Intro script for debugging
            console.log('[GuidedGenerations] Sending Editing Intro scriptPart1:', scriptPart1);
            await context.executeSlashCommandsWithOptions(presetSwitchStart + '\n' + scriptPart1, { showOutput: false });
            const swipeSuccess = await generateNewSwipe();
            if (swipeSuccess) {
                // Wait a short moment before executing the final part
                await new Promise(resolve => setTimeout(resolve, 3000)); 
                await context.executeSlashCommandsWithOptions(scriptPart2 + '\n' + presetSwitchEnd, { showOutput: false });
                console.log('[GuidedGenerations] Edit Intros script executed successfully.');
            } else {
                console.error('[GuidedGenerations] Failed to generate new swipe.');
                 // Still switch back preset on failure?
                 await context.executeSlashCommandsWithOptions(scriptPart2 + '\n' + presetSwitchEnd, { showOutput: false });
            }
        } catch (error) {
            console.error('[GuidedGenerations] Error executing Edit Intros script:', error);
            // Ensure preset is switched back even on error
            await context.executeSlashCommandsWithOptions(scriptPart2 + '\n' + presetSwitchEnd, { showOutput: false });
        }

        // Reset selections before closing, preserving custom text
        this._resetSelections();
        this._setLoading(false);

        if (customEdit && textareaElement) {
            textareaElement.value = '';
        }
        
        this.close();
    }

    /**
     * Creates a new intro based on the selected option or custom instruction.
     */
    async makeNewIntro() {
        this._setLoading(true);
        console.log('Make New Intro button clicked');
        let instruction = '';
        const customCommandTextarea = this.popupElement.querySelector('#gg-custom-edit-command');

        // --- Build Instruction (Same logic as applyChanges) --- 
        if (this.isCustomSelected) {
            const customCommand = customCommandTextarea.value.trim();
            if (customCommand === '') {
                alert('Custom option is selected, but the instruction text area is empty.');
                this._setLoading(false);
                return;
            }
            instruction = customCommand;
            console.log('[GuidedGenerations] Making new intro with custom instruction.');
            sessionStorage.setItem('gg_lastCustomCommand', customCommand);
        } else {
            const selectedInstructions = [];
            // Combine instructions from selected categories
            Object.keys(this.selectedOptions).forEach(category => {
                const selectedKey = this.selectedOptions[category];
                if (selectedKey && EDIT_INTROS_OPTIONS[selectedKey]) {
                    selectedInstructions.push(EDIT_INTROS_OPTIONS[selectedKey]);
                }
            });
            
            if (selectedInstructions.length === 0) {
                 alert('Please select at least one category option, or choose Custom and enter an instruction.');
                 this._setLoading(false);
                 return; 
            }
            instruction = selectedInstructions.join('. '); // Join instructions with a period and space
            console.log(`[GuidedGenerations] Making new intro with combined presets: ${instruction}`);
        }

        // --- Construct Modified Script (Existing logic, using new 'instruction') ---
        const scriptPart1 = `
            // Making New Intro message |
            /sys at=0 Making New Intro message |

            // Set the instruction |
            /setvar key=inp "${instruction.replace(/"/g, '\\"')}" |

            // Generate the new intro |
            /inject id=newIntro position=chat ephemeral=true scan=true depth=0 [Write the intro based on the following description: {{getvar::inp}}] | `;
        const scriptPart2 = `/cut 0|`;

        // --- Preset Switching Logic ---
        const introPresetSettingKey = 'presetEditIntros'; // CORRECTED: Setting key for the Edit Intros preset
        const targetPresetNameRaw = extension_settings[extensionName]?.[introPresetSettingKey] ?? '';
        const targetPresetName = targetPresetNameRaw.trim();

        let presetSwitchStart = '';
        let presetSwitchEnd = '';

        if (targetPresetName) { // Only switch if a target preset name is configured and not empty
            presetSwitchStart = `
// Get the currently active preset|
/preset|
/setvar key=currentPreset {{pipe}} |
+
// If current preset is already ${targetPresetName}, do NOT overwrite oldPreset|
/if left={{getvar::currentPreset}} rule=neq right="${targetPresetName}" {: 
   // Store the current preset in oldPreset|
   /setvar key=oldPreset {{getvar::currentPreset}} |
   // Now switch to ${targetPresetName}|
   /preset ${targetPresetName} |
:}| 
`;
            presetSwitchEnd = `
// Switch back to the original preset if it was stored|
/preset {{getvar::oldPreset}} |
`;
        } else {
            presetSwitchStart = `// No preset configured for Edit Intros or preset switching disabled.|`;
            presetSwitchEnd = `// No preset configured for Edit Intros or preset switching disabled.|`;
        }

        // --- Execute Script (Existing logic) ---
        try {
            const context = getContext();
            // Debug: log outgoing Make New Intro script for clarity
            console.log('[GuidedGenerations] Sending Make New Intro scriptPart1:', scriptPart1);
            await context.executeSlashCommandsWithOptions(presetSwitchStart + '\n' + scriptPart1, { showOutput: false });
            // Wait a short moment *after* initial commands before generating
            await new Promise(resolve => setTimeout(resolve, 300)); 
            const swipeSuccess = await generateNewSwipe();
            if (swipeSuccess) {
                // Wait a short moment before switching preset back
                await new Promise(resolve => setTimeout(resolve, 300)); 
                // Only need to switch preset back
                await context.executeSlashCommandsWithOptions(scriptPart2 + '\n' + presetSwitchEnd, { showOutput: false });
                console.log('[GuidedGenerations] Make New Intro script executed successfully.');
            } else {
                console.error('[GuidedGenerations] Failed to generate new swipe for Make New Intro.');
                // Still switch back preset on failure?
                 await context.executeSlashCommandsWithOptions(scriptPart2 + '\n' + presetSwitchEnd, { showOutput: false });
            }
        } catch (error) {
            console.error('[GuidedGenerations] Error executing Make New Intro script:', error);
            // Ensure preset is switched back even on error
             await context.executeSlashCommandsWithOptions(scriptPart2 + '\n' + presetSwitchEnd, { showOutput: false });
        }

        // Reset selections before closing, preserving custom text
        this._resetSelections();
        this._setLoading(false);

        this.close();
    }

}
// Singleton instance
const editIntrosPopup = new EditIntrosPopup();
export default editIntrosPopup;
