import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from '../../../slash-commands/SlashCommandArgument.js';
import { enumIcons } from '../../../slash-commands/SlashCommandCommonEnumsProvider.js';
import { enumTypes, SlashCommandEnumValue } from '../../../slash-commands/SlashCommandEnumValue.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { isTrueBoolean } from '../../../utils.js';

/**
 * @typedef {Object} SamplerParameter - Represents a sampler parameter.
 * @property {string} id - ID of the sampler parameter.
 * @property {string} name - Name of the sampler parameter.
 * @property {number} max - Maximum value.
 * @property {number} min - Minimum value.
 * @property {number} value - Current value.
 * @property {string} type - 'range' or 'checkbox'.
 * @property {boolean} checked - Only for checkbox type.
 * @property {HTMLInputElement} control - The input element.
 */

/**
 * Gets the title of the sampler parameter
 * @param {HTMLElement} element Sampler parameter element.
 * @returns {HTMLElement} Element containing the title of the sampler parameter.
 */
function getTitleParent(element) {
    const parent = element.closest('.range-block') || element.closest('label') || element.closest('h4') || element.closest('div');

    if (!(parent instanceof HTMLElement)) {
        return null;
    }

    const rangeBlockTitle = parent.querySelector('.range-block-title');

    if (rangeBlockTitle instanceof HTMLElement && rangeBlockTitle.textContent.trim()) {
        return rangeBlockTitle;
    }

    const smallTextNode = parent.querySelector('small');

    if (smallTextNode instanceof HTMLElement && smallTextNode.textContent.trim()) {
        return smallTextNode;
    }

    const checkboxLabel = parent.querySelector('.checkbox_label');

    if (checkboxLabel instanceof HTMLElement && checkboxLabel.textContent.trim()) {
        return checkboxLabel;
    }

    return parent;
}

/**
 * Enumerates all sampler parameters available in the UI.
 * @returns {SamplerParameter[]} List of sampler parameters.
 */
function enumerateSamplerParameters() {
    const leftPanel = document.getElementById('left-nav-panel');
    const computedStyle = window.getComputedStyle(leftPanel);
    const leftPanelDisplay = computedStyle.display;
    if (leftPanelDisplay === 'none') {
        leftPanel.style.opacity = '0';
        leftPanel.style.visibility = 'hidden';
        leftPanel.style.display = 'block';
    }

    const sanitizeId = id => id.replace('_counter', '').replace('_textgenerationwebui', '').replace('_openai', '').replace('_novel', '').replace('openai_', '').replace('oai_', '');
    const isVisible = e => e instanceof HTMLElement && e.offsetHeight > 0 && e.offsetWidth > 0;
    const rangeSliders = Array.from(leftPanel.querySelectorAll('input[type="range"], input[type="checkbox"], input[type="number"]:not([data-for])')).filter(isVisible);
    const roundToPrecision = (num, precision = 1e4) => ((num = parseFloat(num + '') || 0), Math.round((num + Number.EPSILON) * precision) / precision);

    /** @type {SamplerParameter[]} */
    const samplerParameters = [];

    for (const control of rangeSliders) {
        if (!(control instanceof HTMLInputElement)) {
            continue;
        }

        // Those are not sampler parameters.
        if (control.closest('#openai_settings')) {
            continue;
        }

        const name = getTitleParent(control)?.textContent?.trim();

        const sampler = {
            id: sanitizeId(control.id),
            name: name,
            max: roundToPrecision(parseFloat(control.max)),
            min: roundToPrecision(parseFloat(control.min)),
            value: roundToPrecision(parseFloat(control.value)),
            checked: control.checked,
            type: control.type,
            control: control,
        };

        if (!sampler.id || !sampler.name) {
            continue;
        }

        samplerParameters.push(sampler);
    }

    leftPanel.style.visibility = '';
    leftPanel.style.opacity = '';
    leftPanel.style.display = leftPanelDisplay;

    return samplerParameters;
}

(() => {
    const enumProvider = () => enumerateSamplerParameters()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(p => {
            const name = `${p.name} ⇒ ${p.type == 'range' ? `${p.value} [${p.min}..${p.max}]` : p.checked}`;
            const icon = p.type === 'range' ? enumIcons.number : enumIcons.boolean;
            return new SlashCommandEnumValue(p.id, name, enumTypes.number, icon);
        });

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'sampler-get',
        helpString: 'Gets the value of a sampling parameter.',
        returns: 'number / boolean',
        callback: (_, name) => {
            if (!name) {
                throw new Error('Parameter name is required.');
            }
            if (typeof name !== 'string') {
                throw new Error('Parameter name must be a string.');
            }
            name = name.trim().toLowerCase();
            const parameter = enumerateSamplerParameters().find(p => p.name.toLowerCase() === name || p.id.toLowerCase() === name);
            if (!parameter) {
                throw new Error(`Parameter "${name}" not found.`);
            }
            return parameter.type === 'checkbox' ? String(parameter.checked) : String(parameter.value);
        },
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'The name of the parameter to get.',
                typeList: [ARGUMENT_TYPE.STRING],
                enumProvider: enumProvider,
                isRequired: true,
                acceptsMultiple: false,
            }),
        ],
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'sampler-set',
        helpString: 'Sets the value of a sampling parameter.',
        returns: 'void',
        callback: (args, value) => {
            let { name } = args;
            if (!name) {
                throw new Error('Parameter name is required.');
            }
            if (typeof name !== 'string') {
                throw new Error('Parameter name must be a string.');
            }
            name = name.trim().toLowerCase();
            const parameter = enumerateSamplerParameters().find(p => p.name.toLowerCase() === name || p.id.toLowerCase() === name);
            if (!parameter) {
                throw new Error(`Parameter "${name}" not found.`);
            }
            if (!value) {
                throw new Error('Value is required.');
            }
            if (typeof value !== 'string') {
                throw new Error('Value must be a string.');
            }
            if (parameter.type === 'checkbox') {
                const isTrue = isTrueBoolean(String(value));
                parameter.control.checked = isTrue;
            } else {
                const number = parseFloat(String(value));
                if (isNaN(number) || !isFinite(number)) {
                    throw new Error('Value must be convertible to a finite number.');
                }
                const clamped = Math.min(Math.max(number, parameter.min), parameter.max);
                parameter.control.value = String(clamped);
            }

            parameter.control.dispatchEvent(new Event('input', { bubbles: true }));
            return '';
        },
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'name',
                description: 'The name of the parameter to set.',
                typeList: [ARGUMENT_TYPE.STRING],
                enumProvider: enumProvider,
                isRequired: true,
                acceptsMultiple: false,
            }),
        ],
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'The value to set.',
                typeList: [ARGUMENT_TYPE.NUMBER, ARGUMENT_TYPE.BOOLEAN],
                isRequired: true,
                acceptsMultiple: false,
            }),
        ],
    }));
})();
