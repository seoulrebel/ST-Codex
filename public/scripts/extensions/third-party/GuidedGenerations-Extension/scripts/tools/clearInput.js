/**
 * Provides a tool to clear the input field
 * 
 * @returns {Promise<void>}
 */
export default async function clearInput() {
    const extensionName = "GuidedGenerations-Extension";
    console.log(`${extensionName}: Executing Clear Input tool`);
    
    // Execute the clearInput workflow
    const stscript = `/setinput`;
    
    executeSTScript(stscript);
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
