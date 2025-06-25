/**
 * Provides a tool to edit character intros with various formatting options using a popup UI
 * 
 * @returns {Promise<void>}
 */
import editIntrosPopup from './editIntrosPopup.js';

export default async function editIntros() {
    const extensionName = "GuidedGenerations-Extension";
    console.log(`${extensionName}: Opening Edit Intros popup`);
    
    // Initialize and open the popup
    await editIntrosPopup.init();
    editIntrosPopup.open();
}

/**
 * Helper function to execute ST-Script commands
 * @param {string} stscript - The ST-Script command to execute
 */
function executeSTScript(stscript) {
    const extensionName = "GuidedGenerations-Extension";
    try {
        // Use the context executeSlashCommandsWithOptions method
        if (typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function') {
            const context = SillyTavern.getContext();
            // Send the combined script via context
            context.executeSlashCommandsWithOptions(stscript);
            console.log(`${extensionName}: ST-Script executed successfully.`);
        } else {
            console.error(`${extensionName}: SillyTavern.getContext function not found.`);
        }
    } catch (error) {
        console.error(`${extensionName}: Error executing ST-Script:`, error);
    }
}
