/**
 * @file Contains the logic for the Corrections tool.
 */
import { extensionName, setPreviousImpersonateInput } from '../../index.js'; // Import shared state function
import { getContext, extension_settings } from '../../../../../extensions.js'; 
import { generateNewSwipe } from '../guidedSwipe.js'; // Import the new function

// Helper function for delays (copied from guidedSwipe.js)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Provides a tool to modify the last message based on user's instructions
 * 
 * @returns {Promise<void>}
 */
export default async function corrections() {
    console.log('[GuidedGenerations][Corrections] Tool activated.');
    const textarea = document.getElementById('send_textarea');
    if (!textarea) {
        console.error('[GuidedGenerations][Corrections] Textarea #send_textarea not found.');
        return;
    }
    const originalInput = textarea.value; // Get current input

    // Save the input state using the shared function
    setPreviousImpersonateInput(originalInput);
    console.log(`[GuidedGenerations][Corrections] Original input saved: "${originalInput}"`);

    // Use user-defined corrections prompt override
    const isRaw = extension_settings[extensionName]?.rawPromptCorrections ?? false;
    const promptTemplate = extension_settings[extensionName]?.promptCorrections ?? '';
    const filledPrompt = promptTemplate.replace('{{input}}', originalInput);

    // Determine target preset from settings
    const presetKey = 'presetCorrections';
    const targetPreset = extension_settings[extensionName]?.[presetKey];
    console.log(`[GuidedGenerations][Corrections] Using preset: ${targetPreset || 'none'}`);

    // --- Build Preset Switching Script Parts Conditionally ---
    let presetSwitchStartScript = '';
    let presetSwitchEndScript = '';

    if (targetPreset) {
        // Store old preset then switch to user-defined preset
        presetSwitchStartScript = `
// Get the currently active preset|
/preset|
/setvar key=oldPreset {{pipe}}|

// Switch to user preset|
/preset ${targetPreset}|
`;
        // Restore previous preset after execution
        presetSwitchEndScript = `
// Switch back to the original preset if it was stored|
/preset {{getvar::oldPreset}}|
`;
    }

    // --- Part 1: Execute STscript for Presets and Injections --- 
    const instructionInjection = isRaw ? filledPrompt : `[${filledPrompt}]`;
    const depth = extension_settings[extensionName]?.depthPromptCorrections ?? 0;
    const stscriptPart1 = `
        ${presetSwitchStartScript}

        // Inject assistant message to rework and instructions|
        /inject id=msgtorework position=chat ephemeral=true scan=true depth=${depth} role=assistant {{lastMessage}}|
        // Inject instructions using user override prompt|
        /inject id=instruct position=chat ephemeral=true scan=true depth=${depth} ${instructionInjection}|
    `;
    
    try {
        console.log('[GuidedGenerations][Corrections] Executing STScript Part 1 (Presets/Injections)...');
        await executeSTScript(stscriptPart1); // Use the helper for STscript
        console.log('[GuidedGenerations][Corrections] STScript Part 1 executed.');

        // --- Part 2: Execute JS Swipe Logic --- 
        console.log('[GuidedGenerations][Corrections] Starting JS Swipe Logic...');
        const jQueryRef = (typeof $ !== 'undefined') ? $ : jQuery;
        if (!jQueryRef) {
            console.error("[GuidedGenerations][Corrections] jQuery not found.");
            alert("Corrections Tool Error: jQuery not available.");
            // Attempt to run preset end script even if swipe fails
             await executeSTScript(presetSwitchEndScript);
            return; 
        }

        console.log("[GuidedGenerations][Corrections] Attempting to generate new swipe using generateNewSwipe()...");
        const swipeSuccess = await generateNewSwipe(); // Call the imported function

        if (swipeSuccess) {
            console.log("[GuidedGenerations][Corrections] generateNewSwipe() reported success.");
        } else {
            console.error("[GuidedGenerations][Corrections] generateNewSwipe() reported failure or an issue occurred. Attempting to run preset end script.");
            // generateNewSwipe() itself often alerts on failure. If it throws, the main catch block will also alert.
            // We run the end script here for cases where it returns false without throwing, to ensure cleanup.
            if (presetSwitchEndScript && typeof executeSTScript === 'function') { // Ensure dependencies are available
                try {
                    await executeSTScript(presetSwitchEndScript);
                } catch (scriptError) {
                    console.error("[GuidedGenerations][Corrections] Error executing presetSwitchEndScript after generateNewSwipe failure:", scriptError);
                    // Optionally alert here too, or rely on main catch if this rethrows.
                }
            }
            // Note: The function will continue to the final log and exit the try block.
            // The outer catch in correctionsTool handles broader errors.
        }

        console.log('[GuidedGenerations][Corrections] JS Swipe Logic finished.');

    } catch (error) {
        console.error("[GuidedGenerations][Corrections] Error during Corrections tool execution:", error);
        alert(`Corrections Tool Error: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
        // --- Part 3: Execute STscript for Preset End --- 
        console.log('[GuidedGenerations][Corrections] Executing STScript Part 2 (Preset End)...');
        await executeSTScript(presetSwitchEndScript); // Ensure presets are switched back
        console.log('[GuidedGenerations][Corrections] Corrections tool finished.');
    }
}

/**
 * Helper function to execute ST-Script commands
 * @param {string} stscript - The ST-Script command to execute
 */
async function executeSTScript(stscript) { // Make helper async
    if (!stscript || stscript.trim() === '') {
        console.log('[GuidedGenerations][Corrections] executeSTScript: No script provided, skipping.');
        return;
    }
    try {
        // Use the context executeSlashCommandsWithOptions method
        const context = getContext(); // Get context via imported function
        // Send the combined script via context
        console.log(`[GuidedGenerations][Corrections] Executing STScript: ${stscript}`);
        await context.executeSlashCommandsWithOptions(stscript);
        console.log(`${extensionName}: Corrections ST-Script executed successfully.`);
    } catch (error) {
        console.error(`${extensionName}: Corrections Error executing ST-Script:`, error);
         // Optional: Re-throw or handle differently if needed
    }
}
