/**
 * @file Contains the logic for the Rules Guide option in the Persistent Guides menu.
 */
import { extensionName } from '../../index.js'; // Import from two levels up
import { extension_settings } from '../../../../../extensions.js';
import { runGuideScript } from './runGuide.js';

/**
 * Executes the Rules Guide script to track the explicit rules that characters have learned.
 * This helps maintain consistency in character behavior based on established rules.
 */
const rulesGuide = async (isAuto = false) => {
    const injectionRole = extension_settings[extensionName]?.injectionEndRole ?? 'system';
    // Use user-defined prompt override for Rules Guide
    const promptTemplate = extension_settings[extensionName]?.promptRules ?? `[Create a list of explicit rules that {{char}} has learned and follows from the story and their character description. Only include rules that have been explicitly established in the chat history or character information. Format as a numbered list.] `;
    const genCommandSuffix = promptTemplate;
    const label = `Character's rules: {{pipe}}`;
    const depth = extension_settings[extensionName]?.depthPromptRules ?? 0;
    const finalCommand = `/inject id=rules position=chat scan=true depth=${depth} role=${injectionRole} [Rules for current scene {{pipe}}] |`;
    return await runGuideScript({
        guideId: 'rules',
        genCommandSuffix,
        finalCommand,
        isAuto,
        previousInjectionAction: 'flush',
        raw: extension_settings[extensionName]?.rawPromptRules ?? false
    });
};

// Export the function for use in the main extension file
export default rulesGuide;
