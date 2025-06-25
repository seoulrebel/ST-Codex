/**
 * @file Contains the logic for the Clothes option in the Persistent Guides menu.
 */
import { extensionName } from '../../index.js'; // Import from two levels up
import { extension_settings } from '../../../../../extensions.js';
import { runGuideScript } from './runGuide.js';

/**
 * Executes the Clothes Guide script to create a detailed description of what each character is wearing.
 * This helps maintain visual consistency throughout the chat.
 * @param {boolean} isAuto - Whether this guide is being auto-triggered (true) or called directly from menu (false)
 */
const clothesGuide = async (isAuto = false) => {
    const injectionRole = extension_settings[extensionName]?.injectionEndRole ?? 'system';
    const genAs = 'as=char';
    const defaultPrompt = `[OOC: Answer me out of Character! Considering where we are currently in the story, write me a list entailing the clothes and look, what they are currently wearing of all participating characters, including {{user}}, that are present in the current scene. Don't mention People or clothing pieces who are no longer relevant to the ongoing scene.] `;
    const genCommandSuffix = extension_settings[extensionName]?.promptClothes ?? defaultPrompt;
    const depth = extension_settings[extensionName]?.depthPromptClothes ?? 1;
    const finalCommand = `/inject id=clothes position=chat scan=true depth=${depth} role=${injectionRole} [Relevant Informations for portraying characters {{pipe}}] |`;
    return await runGuideScript({
        guideId: 'clothes',
        genAs,
        genCommandSuffix,
        finalCommand,
        isAuto,
        previousInjectionAction: 'move',
        raw: extension_settings[extensionName]?.rawPromptClothes ?? false
    });
};

// Export the function for use in the main extension file
export default clothesGuide;
