/**
 * Create a button for the context size menu.
 * @param {object} param - The parameters
 * @param {HTMLInputElement} param.slider The slider element
 * @param {HTMLInputElement} param.unlock Unlock checkbox
 * @param {number} param.size The value to set
 * @returns {HTMLButtonElement} The button element
 */
function createContextSizeButton({ slider, unlock, size }) {
    const button = document.createElement('button');
    button.id = `${slider.id}_quick_context_size_${size}`;
    button.dataset.size = String(size);
    button.classList.add('menu_button', 'quick_context_size');
    const labelValue = document.createElement('span');
    labelValue.textContent = (size / 1024).toFixed(0);
    const labelSuffix = document.createElement('small');
    labelSuffix.textContent = 'k';
    button.append(labelValue, labelSuffix);
    button.addEventListener('click', () => {
        const maxValue = parseInt(slider.max, 10);

        if (size > maxValue && !unlock.checked) {
            unlock.checked = true;
            unlock.dispatchEvent(new Event('change', { bubbles: true }));
            unlock.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }

        slider.value = String(size);
        slider.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    return button;
}

/**
 * Initialize the context size buttons.
 * @param {object} param - The parameters
 * @param {string} param.placeAfterSelector - The selector for the element to place after
 * @param {string} param.sliderSelector - The selector for the slider element
 * @param {string} param.unlockSelector - The selector for the unlock element
 * @param {number[]} param.sizes - The sizes to create buttons for
 * @returns {void}
 */
function init({ placeAfterSelector, sliderSelector, unlockSelector, sizes }) {
    const placeAfter = document.querySelector(placeAfterSelector);
    if (!placeAfter || !(placeAfter instanceof HTMLElement)) {
        console.error(`Element not found or not an HTMLElement: ${placeAfterSelector}`);
        return;
    }

    const slider = document.querySelector(sliderSelector);
    if (!slider || !(slider instanceof HTMLInputElement)) {
        console.error(`Element not found or not an HTMLInputElement: ${sliderSelector}`);
        return;
    }

    const unlock = document.querySelector(unlockSelector);
    if (!unlock || !(unlock instanceof HTMLInputElement)) {
        console.error(`Element not found or not an HTMLInputElement: ${unlockSelector}`);
        return;
    }

    const container = document.createElement('div');
    container.classList.add('quick_context_size_container');
    placeAfter.insertAdjacentElement('afterend', container);

    for (const size of sizes) {
        const button = createContextSizeButton({ slider, unlock, size });
        container.appendChild(button);
    }
}

function toggleButtonVisibility() {
    const context = SillyTavern.getContext();
    const buttons = document.querySelectorAll('button.quick_context_size');

    for (const button of buttons) {
        if (!(button instanceof HTMLButtonElement)) {
            console.warn('Button is not an HTMLButtonElement:', button);
            continue;
        }
        const size = button.dataset.size;
        const isHidden = context.accountStorage.getItem(`qcs_hidden_${size}`) === 'true';
        button.classList.toggle('displayNone', isHidden);
    }
}

function addSlashCommand(sizes) {
    const context = SillyTavern.getContext();
    context.SlashCommandParser.addCommandObject(context.SlashCommand.fromProps({
        name: 'qcs-toggle',
        callback: (_, value) => {
            if (!value) {
                toastr.warning('Please provide a size to toggle.');
                return '';
            }

            if (typeof value !== 'string') {
                toastr.warning('Size value must be a string in numeric format.');
                return '';
            }

            let stringValue = String(value).trim();
            let size = parseInt(stringValue, 10);

            if (/^\d+k$/.test(stringValue)) {
                size = parseInt(stringValue.replace('k', '')) * 1024;
            }

            if (isNaN(size)) {
                toastr.warning('Invalid size provided.');
                return '';
            }

            if (!sizes.includes(size)) {
                toastr.warning(`Invalid size provided. Valid sizes are: ${sizes.join(', ')}`);
                return '';
            }

            const context = SillyTavern.getContext();
            const newState = context.accountStorage.getItem(`qcs_hidden_${size}`) === 'true' ? 'false' : 'true';
            context.accountStorage.setItem(`qcs_hidden_${size}`, newState);
            context.saveSettingsDebounced();

            toggleButtonVisibility();
            return newState;
        },
        helpString: 'Toggles the visibility of the quick context size button.',
        returns: 'new visibility state',
        namedArgumentList: [],
        unnamedArgumentList: [
            context.SlashCommandArgument.fromProps({
                description: 'value',
                enumList: sizes.map(size => `${size / 1024}k`),
                isRequired: true,
            }),
        ],
    }));
}

(function () {
    const sizes = [
        2 * 1024,
        4 * 1024,
        6 * 1024,
        8 * 1024,
        12 * 1024,
        16 * 1024,
        24 * 1024,
        32 * 1024,
        48 * 1024,
        64 * 1024,
        96 * 1024,
        128 * 1024,
    ];
    const chatCompletionSettings = {
        placeAfterSelector: '.range-block:has(#openai_max_context_counter)',
        sliderSelector: '#openai_max_context',
        unlockSelector: '#oai_max_context_unlocked',
        sizes: sizes,
    };
    const textCompletionSettings = {
        placeAfterSelector: '#pro-settings-block',
        sliderSelector: '#max_context',
        unlockSelector: '#max_context_unlocked',
        sizes: sizes,
    };

    init(chatCompletionSettings);
    init(textCompletionSettings);
    addSlashCommand(sizes);
    toggleButtonVisibility();
})();
