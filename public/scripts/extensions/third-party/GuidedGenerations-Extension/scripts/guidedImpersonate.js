// scripts/guidedImpersonate.js
import { getPreviousImpersonateInput, setPreviousImpersonateInput, getLastImpersonateResult, setLastImpersonateResult } from '../index.js'; // Import shared state functions
import { getContext, extension_settings } from '../../../../extensions.js';
import { extensionName } from '../index.js';

const guidedImpersonate = async () => {
    const textarea = document.getElementById('send_textarea');
    if (!textarea) {
        console.error('[GuidedGenerations] Textarea #send_textarea not found.');
        return;
    }
    const currentInputText = textarea.value;
    const lastGeneratedText = getLastImpersonateResult(); // Use getter

    // Check if the current input matches the last generated text
    if (lastGeneratedText && currentInputText === lastGeneratedText) {
        textarea.value = getPreviousImpersonateInput(); // Use getter
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        return; // Restoration done, exit
    }

    // --- If not restoring, proceed with impersonation ---
    setPreviousImpersonateInput(currentInputText); // Use setter

    // Determine target preset from settings
    const presetKey = 'presetImpersonate1st';
    const targetPreset = extension_settings[extensionName]?.[presetKey];
    console.log(`[GuidedGenerations] Using preset for 1st-person impersonate: ${targetPreset || 'none'}`);
    let presetSwitchStart = '';
    let presetSwitchEnd = '';
    if (targetPreset) {
        // Capture old preset and switch to user-defined preset
        presetSwitchStart = `/preset|\n/setvar key=oldPreset {{pipe}}|\n/preset ${targetPreset}|\n`;
        presetSwitchEnd = `/preset {{getvar::oldPreset}}|\n`;
    }

    // Use user-defined impersonate prompt override
    const promptTemplate = extension_settings[extensionName]?.promptImpersonate1st ?? '';
    const filledPrompt = promptTemplate.replace('{{input}}', currentInputText);

    // Only the core impersonate command remains
    const presetName = extension_settings[extensionName]?.presetImpersonate1st ?? ''; // Get preset setting
    let stscriptCommand = '';
    if (presetName) {
        stscriptCommand = `/preset name="${presetName}" silent=true | /impersonate await=true ${filledPrompt} |`;
    } else {
        stscriptCommand = `/impersonate await=true ${filledPrompt} |`; // No preset
    }
    const fullScript = presetSwitchStart + stscriptCommand + presetSwitchEnd;

    if (typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function') {
        const context = SillyTavern.getContext();
        try {
            // Execute the command and wait for it to complete
            await context.executeSlashCommandsWithOptions(fullScript); 
            
            // After completion, read the new input and store it using the setter
            setLastImpersonateResult(textarea.value);
            console.log('[GuidedGenerations] Guided Impersonate (1st) stscript executed, new input stored in shared state.');

        } catch (error) {
            console.error(`[GuidedGenerations] Error executing Guided Impersonate (1st) stscript: ${error}`);
            setLastImpersonateResult(''); // Use setter to clear shared state on error
        }
    } else {
        console.error('[GuidedGenerations] SillyTavern.getContext function not found.');
    }
};

// Export the function
export { guidedImpersonate };
