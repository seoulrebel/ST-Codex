import { getContext, extension_settings } from '../../../../../extensions.js';
import { extensionName } from '../../index.js';

/**
 * Generic runner for Persistent Guides STScript commands.
 * @param {{
 *   guideId: string,
 *   genAs?: string,
 *   genCommandSuffix?: string,
 *   finalCommand?: string,
 *   isAuto?: boolean,
 *   previousInjectionAction?: 'move' | 'flush' | 'none'
 *   raw?: boolean
 * }} options
 * @returns {Promise<string|null>} Returns pipe output or null on failure.
 */
export async function runGuideScript({ guideId, genAs = '', genCommandSuffix = '', finalCommand = '', isAuto = false, previousInjectionAction = 'none', raw = false }) {
    // Determine user-defined preset for this guide
    const presetKey = `preset${guideId.charAt(0).toUpperCase()}${guideId.slice(1)}`;
    const rawPreset = extension_settings[extensionName]?.[presetKey] ?? '';
    const presetValue = rawPreset.trim();

    // Build preset switch commands
    let presetSwitchStart = '';
    let presetSwitchEnd = '';
    if (presetValue) {
        presetSwitchStart = `
 // Get current preset|
 /preset|
 /setvar key=currentPreset {{pipe}} |
 /if left={{getvar::currentPreset}} rule=neq right="${presetValue}" {:
    /setvar key=oldPreset {{getvar::currentPreset}} |
    /preset ${presetValue} |
:}|
`;
        presetSwitchEnd = `
 /preset {{getvar::oldPreset}} |
`;
    }

    // Handle previous injection based on action
    let initCmd = '';
    if (previousInjectionAction === 'move') {
        initCmd = `// Read existing injection|
/listinjects return=object |
/let injections {{pipe}} |
/let x {{var::injections}} |
/var index=${guideId} x |
/let y {{pipe}} |
/var index=value y |
/inject id=${guideId} position=chat scan=true depth=4 [Relevant Informations for portraying characters {{pipe}}] |`;
    } else if (previousInjectionAction === 'flush') {
        initCmd = `/flushinject ${guideId} |`;
    }

    // Assemble STScript
    const asClause = genAs ? `${genAs} ` : '';
    // Generate guide content: use raw command if requested
    const genLine = raw ? `${genCommandSuffix} |` : `/gen ${asClause}${genCommandSuffix} |`;
    let script = `// Initial guide setup|
${initCmd}

${presetSwitchStart}

// Generate guide content|
${genLine}
${finalCommand}
${presetSwitchEnd}`;

    if (!isAuto) {
        script += '\n/listinjects |';
    } else if (!script.trim().endsWith('|')) {
        script += ' |';
    }

    // Execute STScript via SillyTavern context
    const context = getContext();
    if (context && typeof context.executeSlashCommandsWithOptions === 'function') {
        try {
            const result = await context.executeSlashCommandsWithOptions(script, {
                showOutput: false,
                handleExecutionErrors: true
            });
            if (result && result.pipe != null && result.pipe !== '') {
                return result.pipe;
            }
            return null;
        } catch (err) {
            console.error(`${extensionName}: Error executing guide script for ${guideId}:`, err);
            return null;
        }
    } else {
        console.error(`${extensionName}: Context unavailable to execute guide script for ${guideId}.`);
        return null;
    }
}
