/**
 * @file Contains the logic for the Edit Guides option in the Persistent Guides menu.
 */

import editGuidesPopup from './editGuidesPopup.js'; // Import the popup instance

/**
 * Edit Guides Functionality
 * Fetches persistent guide injections directly from context and opens a custom popup for editing.
 */
async function editGuides() {
    try {
        const context = SillyTavern.getContext();
        if (!context || !context.chatMetadata || !context.chatMetadata.script_injects) {
            console.error('[GuidedGenerations] SillyTavern context or persistent injections not available.');
            // Optionally inform the user via echo
            try {
                await context.executeSlashCommandsWithOptions('/echo Error: persistent guide injections not available.', { showOutput: true });
            } catch (echoError) {
                console.error('[GuidedGenerations] Failed to echo error message:', echoError);
            }
            return;
        }

        const injections = context.chatMetadata.script_injects;
        const guidePrompts = {};
        // Map persistent injections into script_inject_ prefixed keys
        for (const name in injections) {
            guidePrompts[`script_inject_${name}`] = {
                value: injections[name].value,
                depth: injections[name].depth
            };
        }

        if (Object.keys(guidePrompts).length === 0) {
            console.warn('[GuidedGenerations] No guide prompts found starting with script_inject_.');
            try {
                await context.executeSlashCommandsWithOptions('/echo No editable guides found. |', { showOutput: true });
            } catch (echoError) { /* Ignore failure to echo */ }
            return;
        }

        // Ensure the popup is initialized (awaits if first time)
        await editGuidesPopup.init(); 

        // Open the popup with the fetched data, explicitly setting customMode to false
        editGuidesPopup.open(guidePrompts, false);

    } catch (error) {
        console.error('[GuidedGenerations] Error in editGuides function:', error);
        // Optionally inform the user via echo
        try {
            const context = SillyTavern.getContext();
            await context.executeSlashCommandsWithOptions(`/echo An error occurred while trying to edit guides: ${error.message} |`, { showOutput: true });
        } catch (echoError) {
            console.error('[GuidedGenerations] Failed to echo error message:', echoError);
        }
    }
}

// Expose the function using default export for dynamic import
export default editGuides;
