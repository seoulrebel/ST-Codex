/**
 * @file Contains the logic for the Thinking option in the Persistent Guides menu.
 */
import { getContext, extension_settings } from '../../../../../extensions.js';
import { runGuideScript } from './runGuide.js';

const extensionName = "GuidedGenerations-Extension";

/**
 * Executes the Thinking Guide script to create an insight into what the character is thinking.
 * This helps authors understand character motivations and inner thoughts.
 * @param {boolean} isAuto - Whether this guide is being auto-triggered.
 */
const thinkingGuide = async (isAuto = false) => {
    const injectionRole = extension_settings[extensionName]?.injectionEndRole ?? 'system';

    let genCommandSuffix = extension_settings[extensionName]?.promptThinking ?? `[OOC: Answer me out of Character! Write what each characters in the current scene are currently thinking, pure thought only. Do NOT continue the story or include narration or dialogue. Do not include the⁣ {{user}}'s thoughts.]`;
    const injectLabel = `Characters are currently thinking: {{pipe}}`;
    const depth = extension_settings[extensionName]?.depthPromptThinking ?? 0;
    const finalCommand = `/inject id=thinking position=chat scan=true depth=${depth} role=${injectionRole} [${injectLabel}] |`;

    return await runGuideScript({
        guideId: 'thinking',
        genCommandSuffix,
        finalCommand,
        isAuto,
        previousInjectionAction: 'flush',
        raw: extension_settings[extensionName]?.rawPromptThinking ?? false
    });
};

// Export the function for use in the main extension file
export default thinkingGuide;
