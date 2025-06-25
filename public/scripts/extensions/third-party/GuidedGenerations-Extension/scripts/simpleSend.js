// scripts/simpleSend.js

import { setPreviousImpersonateInput } from '../index.js'; // Import shared state function

// State variable specific to simpleSend to prevent rapid clicks
let isSending = false; 

const simpleSend = () => {
    if (isSending) {
        console.log(`[GuidedGenerations][SimpleSend] simpleSend already in progress, skipping.`);
        return;
    }
    isSending = true;
    console.log(`[GuidedGenerations][SimpleSend] function entered (isSending = true).`);
    
    const textarea = document.getElementById('send_textarea');
    if (!textarea) {
        console.error('[GuidedGenerations][SimpleSend] Textarea #send_textarea not found.');
        isSending = false; // Reset flag if textarea isn't found
        return;
    }
    const originalInput = textarea.value; // Get current input

    // Save the input state using the shared function BEFORE sending/clearing
    setPreviousImpersonateInput(originalInput);
    console.log(`[GuidedGenerations][SimpleSend] Original input saved: "${originalInput}"`);

    // Modified Stscript: Send current input, then clear input
    const command = `/send {{input}} | /setinput`; 
    
    console.log("[GuidedGenerations][SimpleSend] Executing:", command);
    try {
        // Use the context executeSlashCommandsWithOptions method
        if (typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function') {
            const context = SillyTavern.getContext();
            // Send the combined script via context
            context.executeSlashCommandsWithOptions(command);
            console.log('[GuidedGenerations][SimpleSend] stscript executed.');
        } else {
            console.error('[GuidedGenerations][SimpleSend] SillyTavern.getContext function not found.');
        } 
    } catch (error) {
        console.error("[GuidedGenerations][SimpleSend] Error:", error);
    }

    // Reset the flag after a short delay 
    setTimeout(() => { isSending = false; }, 100); 
    console.log(`[GuidedGenerations][SimpleSend] function finished (isSending = false after delay).`);
};

// Export the function
export { simpleSend };
