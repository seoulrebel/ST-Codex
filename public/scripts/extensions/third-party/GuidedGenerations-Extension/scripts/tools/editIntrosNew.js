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
