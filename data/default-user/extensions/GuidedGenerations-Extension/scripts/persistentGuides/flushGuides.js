/**
 * @file Contains the logic for the Flush Guides option in the Persistent Guides menu.
 */

/**
 * Executes the Flush Guides script to remove one or all active guides.
 * Allows users to select which guide to flush or remove all guides at once.
 */
const flushGuides = async () => { // Make function async
    console.log('[GuidedGenerations] Flush Guides button clicked');

    // Get SillyTavern context
    let context;
    try {
        context = SillyTavern.getContext(); // Use global context object
        if (!context || typeof context.executeSlashCommandsWithOptions !== 'function') {
            console.error('[GuidedGenerations] SillyTavern context or executeSlashCommandsWithOptions not available.');
            return;
        }
    } catch (error) {
        console.error('[GuidedGenerations] Error getting SillyTavern context:', error);
        return;
    }

    // --- Step 1: Get the list of injections ---
    const listInjectsScript = `/listinjects return=object |`;
    let injectionObject = null;

    try {
        console.log(`[GuidedGenerations] Executing script to list injections...`);
        const result = await context.executeSlashCommandsWithOptions(listInjectsScript, {
            showOutput: false, // Don't show intermediate output
            handleExecutionErrors: true // Capture errors
        });

        console.log('[GuidedGenerations] List injections script result:', result);

        if (result && result.isError) {
            console.error(`[GuidedGenerations] STScript error listing injections: ${result.errorMessage}`);
            return;
        }

        // Assuming the object is returned in the pipe as a stringified JSON
        if (result && result.pipe) {
            try {
                injectionObject = JSON.parse(result.pipe);
                console.log('[GuidedGenerations] Parsed injection object:', injectionObject);
            } catch (parseError) {
                console.error('[GuidedGenerations] Error parsing injection object from pipe:', parseError, 'Pipe content:', result.pipe);
                // Fallback or error handling: maybe the pipe isn't JSON? Or maybe result has the object elsewhere?
                // For now, we'll error out if parsing fails.
                return;
            }
        } else {
             console.warn('[GuidedGenerations] No pipe value returned from listinjects command.');
             injectionObject = {}; // Assume no injections if pipe is empty/missing
        }

    } catch (error) {
        console.error(`[GuidedGenerations] Error executing list injections script: ${error}`);
        return;
    }

    // --- Step 2: Process keys in JS and build the second script ---
    let injectionKeys = [];
    if (injectionObject && typeof injectionObject === 'object') {
         injectionKeys = Object.keys(injectionObject);
    } else {
        console.warn('[GuidedGenerations] Injection data is not a valid object:', injectionObject);
        injectionObject = {}; // Ensure it's an object for safety, keys will be empty
        injectionKeys = [];
    }
    
    // Always add "All" option
    const buttonOptions = [...injectionKeys, "All"]; 
    const buttonLabels = JSON.stringify(buttonOptions); // Format as JSON array string

    const flushLogicScript = `// Display buttons and handle selection |
/buttons labels=${buttonLabels} "Select an Guide to flush:" |
/let selected_injection {{pipe}} |
// Handle "All" selection |
/if left={{var::selected_injection}} rule=eq right="" else={:
/echo {{var::selected_injection}} selected. |
/if left={{var::selected_injection}} rule=eq right="All" else={:
/flushinject {{var::selected_injection}} |
/echo {{var::selected_injection}} Guide flushed. |
:}{:
  /flushinjects |
  /echo All Guides have been flushed. |
:}:}|`;

    // --- Step 3: Execute the second script ---
    try {
        console.log(`[GuidedGenerations] Executing flush logic script with labels: "${buttonLabels}"`);

        await context.executeSlashCommandsWithOptions(flushLogicScript, {
             showOutput: true, // Show the final output/buttons to the user
             handleExecutionErrors: true
        });
        console.log('[GuidedGenerations] Flush logic script executed.');
    } catch (error) {
        console.error(`[GuidedGenerations] Error executing flush logic script: ${error}`);
    }
};

// Export the function for use in the main extension file
export default flushGuides;
