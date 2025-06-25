/**
 * @file Contains the logic for the Spellcheck tool.
 */
import { extensionName, setPreviousImpersonateInput } from '../../index.js'; // Import shared state function
import { getContext, extension_settings } from '../../../../../extensions.js'; 

/**
 * Provides a tool to correct grammar, punctuation, and improve paragraph flow
 * 
 * @returns {Promise<void>}
 */
export default async function spellchecker() {
    console.log('[GuidedGenerations][Spellchecker] Tool activated.');
    const textarea = document.getElementById('send_textarea');
    if (!textarea) {
        console.error('[GuidedGenerations][Spellchecker] Textarea #send_textarea not found.');
        return;
    }
    const originalInput = textarea.value; // Get current input

    // Save the input state using the shared function (even though we overwrite it later)
    setPreviousImpersonateInput(originalInput);
    console.log(`[GuidedGenerations][Spellchecker] Original input saved (for potential recovery elsewhere): "${originalInput}"`);

    // Determine target preset from settings
    const presetKey = 'presetSpellchecker';
    const targetPreset = extension_settings[extensionName]?.[presetKey];
    console.log(`[GuidedGenerations][Spellchecker] Using preset: ${targetPreset || 'none'}`);

    // --- Build Preset Switching Script Parts Conditionally ---
    let presetSwitchStart = '';
    let presetSwitchEnd = '';

    if (targetPreset) {
        // Store old preset then switch to user-defined preset
        presetSwitchStart = `
// Get the currently active preset|
/preset|
/setvar key=oldPreset {{pipe}}|
// Switch to user preset|
/preset ${targetPreset}|
`;
        // Restore previous preset after execution
        presetSwitchEnd = `
// Switch back to the original preset if it was stored|
/preset {{getvar::oldPreset}}|
`;
    }

    // Use user-defined spellchecker prompt override
    const isRaw = extension_settings[extensionName]?.rawPromptSpellchecker ?? false;
    const promptTemplate = extension_settings[extensionName]?.promptSpellchecker ?? '';
    const filledPrompt = promptTemplate.replace('{{input}}', originalInput);

    // Execute the spellchecker workflow
    const stscript = `
        ${presetSwitchStart}

        // Generate correction using the current input|
        ${isRaw ? filledPrompt : `/genraw ${filledPrompt}`} |
        // Replace the input field with the generated correction|
        /setinput {{pipe}}|

        ${presetSwitchEnd}
    `;
    
    executeSTScript(stscript); // Use the existing helper
}

/**
 * Helper function to execute ST-Script commands
 * @param {string} stscript - The ST-Script command to execute
 */
async function executeSTScript(stscript) { // Make helper async if it needs context
    try {
        // Use the context executeSlashCommandsWithOptions method
        const context = getContext(); // Get context via imported function
        console.log(`[GuidedGenerations][Spellchecker] Executing STScript: ${stscript}`);
        // Send the combined script via context
        await context.executeSlashCommandsWithOptions(stscript);
        console.log(`${extensionName}: Spellchecker ST-Script executed successfully.`);
    } catch (error) {
        console.error(`${extensionName}: Spellchecker Error executing ST-Script:`, error);
    }
}
