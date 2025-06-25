// scripts/simpleSend.js

import { setPreviousImpersonateInput } from '../index.js'; // Import shared state function

// State variable specific to simpleSend to prevent rapid clicks
let isSending = false; 

const simpleSend = async () => {
    if (isSending) {
        console.log(`[GuidedGenerations][SimpleSend] simpleSend already in progress, skipping.`);
        return;
    }
    isSending = true;

    try {
        const textarea = document.getElementById('send_textarea');
        if (!textarea) {
            console.error('[GuidedGenerations][SimpleSend] Textarea #send_textarea not found.');
            return; // Exit early
        }
        const originalInput = textarea.value;

        // Save the input state using the shared function BEFORE sending/clearing
        setPreviousImpersonateInput(originalInput);
        console.log(`[GuidedGenerations][SimpleSend] Original input saved: "${originalInput}"`);

    // Modified Stscript: Send current input, then clear input
    const command = `/send {{input}} | /setinput`; 

        if (typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function') {
            const context = SillyTavern.getContext();
            // Send the combined script via context and wait for it to complete
            await context.executeSlashCommandsWithOptions(command);
        } else {
            console.error('[GuidedGenerations][SimpleSend] SillyTavern.getContext function not found.');
        }
    } catch (error) {
        console.error("[GuidedGenerations][SimpleSend] Error:", error);
    } finally {
        isSending = false; // Reset the flag after the operation is complete
    }
};

// Export the function
export { simpleSend };
