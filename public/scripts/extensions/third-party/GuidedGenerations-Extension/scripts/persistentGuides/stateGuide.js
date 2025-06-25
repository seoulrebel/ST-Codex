/**
 * @file Contains the logic for the State option in the Persistent Guides menu.
 */

// Import necessary items from SillyTavern's extension system
// Adjust the path based on your actual file structure if needed
import { getContext, extension_settings } from '../../../../../extensions.js'; 
import { extensionName } from '../../index.js'; // Import extensionName from index.js
import { runGuideScript } from './runGuide.js';

/**
 * Executes the State Guide script to track the physical state and positions of characters.
 * This helps maintain spatial awareness and physical continuity in the scene.
 * @param {boolean} isAuto - Whether this guide is being auto-triggered (true) or called directly from menu (false)
 * @returns {Promise<string|null>} The generated state info from the pipe, or null on error.
 */
const stateGuide = async (isAuto = false) => {
    const injectionRole = extension_settings[extensionName]?.injectionEndRole ?? 'system';

    const genAs = 'as=char';
    const defaultPrompt = `[OOC: Answer me out of Character! Considering the last response, write me a list entailing what state and position of all participating characters, including {{user}}, that are present in the current scene. Don't describe their clothes or how they are dressed. Don't mention People who are no longer relevant to the ongoing scene.] `;
    const genCommandSuffix = extension_settings[extensionName]?.promptState ?? defaultPrompt;

    const depth = extension_settings[extensionName]?.depthPromptState ?? 1;
    const finalCommand = `/inject id=state position=chat scan=true depth=${depth} role=${injectionRole} [Relevant Informations for portraying characters {{pipe}}] |`;

    return await runGuideScript({
        guideId: 'state',
        genAs,
        genCommandSuffix,
        finalCommand,
        isAuto,
        previousInjectionAction: 'move',
        raw: extension_settings[extensionName]?.rawPromptState ?? false
    });
};

// Export the function for use in the main extension file
export default stateGuide;
