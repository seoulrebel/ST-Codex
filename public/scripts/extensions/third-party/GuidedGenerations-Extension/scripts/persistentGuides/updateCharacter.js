/**
 * @file Contains the logic for the Update Character option in the GG Tools menu.
 */

/**
 * Executes the Update Character script (placeholder).
 * This will eventually update character information based on recent interactions.
 * @returns {Promise<string|null>} The result from the pipe, or null on error.
 */
const updateCharacter = async () => { // Make async
    console.log('[GuidedGenerations] Update Character button clicked');

    // Placeholder STScript - Replace with actual logic later
    let stscriptCommand = `/return test |`;

    // Print the full command for debugging
    console.log(`[GuidedGenerations] Update Character final stscript:`);
    console.log(stscriptCommand);

    console.log(`[GuidedGenerations] Executing Update Character stscript...`);

    // Use the context executeSlashCommandsWithOptions method
    if (typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function') {
        const context = SillyTavern.getContext();
        try {
            // Send the script via context and await the result
            const result = await context.executeSlashCommandsWithOptions(stscriptCommand, {
                showOutput: false, // Keep output hidden
                handleExecutionErrors: true // Allow capturing script errors
            });

            console.log('[GuidedGenerations] Update Character stscript executed. Full Result:', result);

            // Check specifically for STScript execution errors
            if (result && result.isError) {
                console.error(`[GuidedGenerations] STScript execution failed: ${result.errorMessage}`, result);
                toastr.error(`Update Character STScript failed: ${result.errorMessage}`);
                return null; // Indicate failure
            }

            // Check the pipe for the result (Placeholder likely uses /echo which outputs to pipe)
            if (result && result.pipe !== undefined && result.pipe !== null && result.pipe !== '') {
                console.log('[GuidedGenerations] Successfully retrieved pipe value:', result.pipe);
                // You might want to display this result to the user via toastr or another method
                toastr.info(`Update Character Result: ${result.pipe}`);
                return result.pipe; // Return the content from pipe
            } else {
                console.warn('[GuidedGenerations] Update Character did not return a value in the pipe. Result:', result);
                // toastr.warning('Update Character script did not produce output.');
                return null; // Indicate failure or no output
            }
        } catch (error) {
            console.error('[GuidedGenerations] Error executing Update Character script:', error);
            toastr.error('An unexpected error occurred while running the Update Character script.');
            return null; // Indicate failure
        }
    } else {
        console.error('[GuidedGenerations] SillyTavern context or executeSlashCommandsWithOptions not available.');
        toastr.error('SillyTavern context is not available. Cannot run Update Character script.');
        return null; // Indicate failure
    }
};

// Make the function available if using modules or need to export
export { updateCharacter }; // Uncomment if using ES modules
