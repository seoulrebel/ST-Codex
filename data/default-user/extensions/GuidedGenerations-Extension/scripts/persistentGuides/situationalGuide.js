/**
 * @file Contains the logic for the Situational Guide option in the Persistent Guides menu.
 */
import { isGroupChat } from '../../index.js'; // Import from two levels up
import { runGuideScript } from './runGuide.js';
import { getContext, extension_settings } from '../../../../../extensions.js'; 
import { extensionName } from '../../index.js'; // Import extensionName from index.js
/**
 * @param {boolean} isAuto - Whether this guide is auto-triggered (true) or manual (false)
 * @returns {Promise<string|null>}
 */
const situationalGuide = async (isAuto = false) => {
    const defaultPrompt = `[Analyze the chat history and provide a concise summary of:
1. Current location and setting (indoors/outdoors, time of day, weather if relevant)
2. Present characters and their current activities
3. Relevant objects, items, or environmental details that could influence interactions
4. Recent events or topics of conversation (last 10-20 messages)
Keep the overview factual and neutral without speculation. Format in clear paragraphs.] |`;
    const genCommandSuffix = extension_settings[extensionName]?.promptSituational ?? defaultPrompt;
    const depth = extension_settings[extensionName]?.depthPromptSituational ?? 3;
    const finalCommand = `/inject id=situational position=chat scan=true depth=${depth} [Current Situation: {{pipe}}] |`;
    return await runGuideScript({
        guideId: 'situational',
        genCommandSuffix,
        finalCommand,
        isAuto,
        previousInjectionAction: 'flush',
        raw: extension_settings[extensionName]?.rawPromptSituational ?? false
    });
};

export default situationalGuide;
