// scripts/inputRecovery.js
import { getPreviousImpersonateInput } from '../index.js'; // Import the shared state getter

const recoverInput = () => {
    console.log('[GuidedGenerations] Input Recovery button clicked');
    const textarea = document.getElementById('send_textarea');

    if (!textarea) {
        console.error('[GuidedGenerations][InputRecovery] Textarea #send_textarea not found.');
        return;
    }

    try {
        const previousInput = getPreviousImpersonateInput();
        console.log(`[GuidedGenerations][InputRecovery] Recovering input: "${previousInput}"`);
        textarea.value = previousInput;
        // Dispatch event for UI updates
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('[GuidedGenerations][InputRecovery] Input recovered successfully.');
    } catch (error) {
        console.error("[GuidedGenerations][InputRecovery] Error recovering input:", error);
    }
};

// Export the function
export { recoverInput };
