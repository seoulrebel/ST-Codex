export default 'InjectManager'; // Init ES module

const unsnake = (/** @type {string} */ str) => str ? str.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : '';
const renderElementDebounced = SillyTavern.libs.lodash.debounce(renderElement, 300);
const settingsKey = 'injectManager';

const injectRoles = Object.freeze({
    /** SYSTEM */
    [0]: '⚙️',
    /** USER */
    [1]: '👤',
    /** ASSISTANT */
    [2]: '🤖',
});

const injectRoleDescriptions = Object.freeze({
    [0]: 'System',
    [1]: 'User',
    [2]: 'Assistant',
});

const InjectPosition = Object.freeze({
    NONE: -1,
    AFTER_PROMPT: 0,
    IN_CHAT: 1,
    BEFORE_PROMPT: 2,
});

const injectPositions = Object.freeze({
    [InjectPosition.NONE]: '–',
    [InjectPosition.AFTER_PROMPT]: '↓',
    [InjectPosition.IN_CHAT]: '@',
    [InjectPosition.BEFORE_PROMPT]: '↑',
});

const injectScans = Object.freeze({
    [false]: '',
    [true]: '✓'
});

const elementPositionClasses = Object.freeze({
    TOP_LEFT: 'topLeft',
    TOP_CENTER: 'topCenter',
    TOP_RIGHT: 'topRight',
    BOTTOM_LEFT: 'bottomLeft',
    BOTTOM_CENTER: 'bottomCenter',
    BOTTOM_RIGHT: 'bottomRight',
});

const elementZIndexClasses = Object.freeze({
    BELOW_PANELS: 'belowPanels',
    ABOVE_PANELS: 'abovePanels',
});

const elementParentSelectors = Object.freeze({
    CHAT: '#chat',
    BODY: 'body',
});

const elementParentClasses = Object.freeze({
    [elementParentSelectors.CHAT]: 'parentChat',
    [elementParentSelectors.BODY]: 'parentBody',
});

const elementSizeClasses = Object.freeze({
    SMALL: 'small',
    NORMAL: 'normal',
    LARGE: 'large',
});

const defaultInjectDepth = 4;
const defaultInjectPosition = InjectPosition.AFTER_PROMPT;

/**
 * @type {InjectManagerSettings}
 * @typedef {Object} InjectManagerSettings
 * @property {boolean} enabled Whether the extension is enabled
 * @property {boolean} showIfEmpty Whether to show the element if there are no injects
 * @property {string} positionClass The position class of the element
 * @property {string} zIndexClass The z-index class of the element
 * @property {string} sizeClass The size class of the element
 * @property {string} parentSelector The selector of the parent element
 */
const defaultSettings = Object.freeze({
    enabled: true,
    showIfEmpty: false,
    positionClass: elementPositionClasses.TOP_LEFT,
    zIndexClass: elementZIndexClasses.ABOVE_PANELS,
    sizeClass: elementSizeClasses.NORMAL,
    parentSelector: elementParentSelectors.CHAT,
});

function isSlashCommandsExecuting() {
    const formSheld = document.getElementById('form_sheld');
    if (!formSheld) {
        return false;
    }
    return formSheld.classList.contains('isExecutingCommandsFromChatInput');
}

/**
 * Render the inject manager element.
 * @param {boolean} forceRender Force render even if slash commands are executing
 * @returns {void}
 */
function renderElement(forceRender = false) {
    if (isSlashCommandsExecuting() && !forceRender) {
        console.debug('[Inject Manager] Slash commands are still executing, delaying render');
        renderElementDebounced();
        return;
    }

    const context = SillyTavern.getContext();
    const existingElement = document.getElementById('injectManagerElement');
    if (existingElement) {
        existingElement.remove();
    }

    /** @type {InjectManagerSettings} */
    const settings = context.extensionSettings[settingsKey];

    if (!settings.enabled) {
        return;
    }

    const parent = document.querySelector(settings.parentSelector);
    const parentClass = elementParentClasses[settings.parentSelector];

    if (!parent) {
        console.error(`[Inject Manager] Parent selector "${settings.parentSelector}" not found`);
        return;
    }

    const injects = context.chatMetadata['script_injects'];
    const numberOfInjects = (injects && Object.keys(injects).length) ?? 0;

    if (!settings.showIfEmpty && numberOfInjects === 0) {
        return;
    }

    const injectsElement = document.createElement('div');
    injectsElement.id = 'injectManagerElement';
    injectsElement.classList.add('injectsElement', parentClass, settings.positionClass, settings.zIndexClass, settings.sizeClass);
    injectsElement.title = context.t`There are ${numberOfInjects} injects in this chat. Click to manage.`;

    const injectsCountElement = document.createElement('div');
    injectsCountElement.classList.add('injectsCount');
    injectsCountElement.classList.toggle('injectsCountEmpty', numberOfInjects === 0);
    injectsCountElement.textContent = String(numberOfInjects);

    const injectsIconElement = document.createElement('div');
    injectsIconElement.classList.add('injectsIcon', 'fa-solid', 'fa-syringe', 'fa-fw', 'fa-sm');

    injectsElement.append(injectsCountElement, injectsIconElement);
    injectsElement.addEventListener('click', () => toggleSideBar(!isSideBarOpen()));

    const shouldAppend = settings.positionClass.startsWith('bottom') && settings.parentSelector === elementParentSelectors.CHAT;
    shouldAppend ? parent.append(injectsElement) : parent.prepend(injectsElement);

    if (isSideBarOpen()) {
        renderSideBarContent();
    }
}

function renderExtensionSettings() {
    const context = SillyTavern.getContext();
    const settingsContainer = document.getElementById('injects_container') ?? document.getElementById('extensions_settings2');
    if (!settingsContainer) {
        return;
    }

    const inlineDrawer = document.createElement('div');
    inlineDrawer.classList.add('inline-drawer');
    settingsContainer.append(inlineDrawer);

    const inlineDrawerToggle = document.createElement('div');
    inlineDrawerToggle.classList.add('inline-drawer-toggle', 'inline-drawer-header');

    const extensionName = document.createElement('b');
    extensionName.textContent = context.t`Inject Manager`;

    const inlineDrawerIcon = document.createElement('div');
    inlineDrawerIcon.classList.add('inline-drawer-icon', 'fa-solid', 'fa-circle-chevron-down', 'down');

    inlineDrawerToggle.append(extensionName, inlineDrawerIcon);

    const inlineDrawerContent = document.createElement('div');
    inlineDrawerContent.classList.add('inline-drawer-content');

    inlineDrawer.append(inlineDrawerToggle, inlineDrawerContent);

    /** @type {InjectManagerSettings} */
    const settings = context.extensionSettings[settingsKey];

    // Enabled
    const enabledCheckboxLabel = document.createElement('label');
    enabledCheckboxLabel.classList.add('checkbox_label');
    enabledCheckboxLabel.htmlFor = 'injectManagerEnabled';
    const enabledCheckbox = document.createElement('input');
    enabledCheckbox.id = 'injectManagerEnabled';
    enabledCheckbox.type = 'checkbox';
    enabledCheckbox.checked = settings.enabled;
    enabledCheckbox.addEventListener('change', () => {
        settings.enabled = enabledCheckbox.checked;
        context.saveSettingsDebounced();
        renderElement(true);
    });
    const enabledCheckboxText = document.createElement('span');
    enabledCheckboxText.textContent = context.t`Enabled`;
    enabledCheckboxLabel.append(enabledCheckbox, enabledCheckboxText);
    inlineDrawerContent.append(enabledCheckboxLabel);

    // Show if empty
    const showIfEmptyCheckboxLabel = document.createElement('label');
    showIfEmptyCheckboxLabel.classList.add('checkbox_label');
    showIfEmptyCheckboxLabel.htmlFor = 'injectManagerShowIfEmpty';
    const showIfEmptyCheckbox = document.createElement('input');
    showIfEmptyCheckbox.id = 'injectManagerShowIfEmpty';
    showIfEmptyCheckbox.type = 'checkbox';
    showIfEmptyCheckbox.checked = settings.showIfEmpty;
    showIfEmptyCheckbox.addEventListener('change', () => {
        settings.showIfEmpty = showIfEmptyCheckbox.checked;
        context.saveSettingsDebounced();
        renderElement(true);
    });
    const showIfEmptyCheckboxText = document.createElement('span');
    showIfEmptyCheckboxText.textContent = context.t`Show if empty`;
    showIfEmptyCheckboxLabel.append(showIfEmptyCheckbox, showIfEmptyCheckboxText);
    inlineDrawerContent.append(showIfEmptyCheckboxLabel);

    // Parent
    const parentSelectLabel = document.createElement('label');
    parentSelectLabel.htmlFor = 'injectManagerParent';
    parentSelectLabel.textContent = context.t`Container element`;
    const parentSelect = document.createElement('select');
    parentSelect.id = 'injectManagerParent';
    parentSelect.classList.add('text_pole');
    parentSelect.addEventListener('change', () => {
        settings.parentSelector = parentSelect.value;
        context.saveSettingsDebounced();
        renderElement(true);
    });
    for (const [key, value] of Object.entries(elementParentSelectors)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = context.translate(unsnake(key));
        parentSelect.append(option);
    }
    parentSelect.value = settings.parentSelector;
    inlineDrawerContent.append(parentSelectLabel, parentSelect);

    // Position
    const positionSelectLabel = document.createElement('label');
    positionSelectLabel.htmlFor = 'injectManagerPosition';
    positionSelectLabel.textContent = context.t`Element position`;
    const positionSelect = document.createElement('select');
    positionSelect.id = 'injectManagerPosition';
    positionSelect.classList.add('text_pole');
    positionSelect.addEventListener('change', () => {
        settings.positionClass = positionSelect.value;
        context.saveSettingsDebounced();
        renderElement(true);
    });
    for (const [key, value] of Object.entries(elementPositionClasses)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = context.translate(unsnake(key));
        positionSelect.append(option);
    }
    positionSelect.value = settings.positionClass;
    inlineDrawerContent.append(positionSelectLabel, positionSelect);

    // Size
    const sizeSelectLabel = document.createElement('label');
    sizeSelectLabel.htmlFor = 'injectManagerSize';
    sizeSelectLabel.textContent = context.t`Element size`;
    const sizeSelect = document.createElement('select');
    sizeSelect.id = 'injectManagerSize';
    sizeSelect.classList.add('text_pole');
    sizeSelect.addEventListener('change', () => {
        settings.sizeClass = sizeSelect.value;
        context.saveSettingsDebounced();
        renderElement(true);
    });
    for (const [key, value] of Object.entries(elementSizeClasses)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = context.translate(unsnake(key));
        sizeSelect.append(option);
    }
    sizeSelect.value = settings.sizeClass;
    inlineDrawerContent.append(sizeSelectLabel, sizeSelect);

    // Z-Index
    const zIndexSelectLabel = document.createElement('label');
    zIndexSelectLabel.htmlFor = 'injectManagerZIndex';
    zIndexSelectLabel.textContent = context.t`Render order`;
    const zIndexSelect = document.createElement('select');
    zIndexSelect.id = 'injectManagerZIndex';
    zIndexSelect.classList.add('text_pole');
    zIndexSelect.addEventListener('change', () => {
        settings.zIndexClass = zIndexSelect.value;
        context.saveSettingsDebounced();
        renderElement(true);
    });
    for (const [key, value] of Object.entries(elementZIndexClasses)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = context.translate(unsnake(key));
        zIndexSelect.append(option);
    }
    zIndexSelect.value = settings.zIndexClass;
    inlineDrawerContent.append(zIndexSelectLabel, zIndexSelect);
}

function renderSideBar() {
    const movingDivs = document.getElementById('movingDivs');

    if (!movingDivs) {
        console.warn('[Inject Manager] Moving divs not found.');
        return;
    }

    const draggableTemplate = /** @type {HTMLTemplateElement} */ (document.getElementById('generic_draggable_template'));

    if (!draggableTemplate) {
        console.warn('[Inject Manager] Draggable template not found.');
        return;
    }

    const fragment = /** @type {DocumentFragment} */ (draggableTemplate.content.cloneNode(true));
    const draggable = fragment.querySelector('.draggable');
    const closeButton = fragment.querySelector('.dragClose');

    if (!draggable || !closeButton) {
        console.warn('[Inject Manager] Failed to find draggable or close button.');
        return;
    }

    draggable.id = 'injectManagerSideBar';
    closeButton.addEventListener('click', () => {
        draggable.classList.remove('visible');
    });

    const scrollContainer = document.createElement('div');
    scrollContainer.id = 'injectManagerSideBarContainer';
    draggable.appendChild(scrollContainer);

    movingDivs.appendChild(draggable);
}

/**
 * Toggle the sidebar visibility.
 * @param {boolean} state New visibility state
 */
function toggleSideBar(state) {
    const sideBar = document.getElementById('injectManagerSideBar');
    if (!sideBar) {
        console.warn('[Inject Manager] Sidebar not found.');
        return;
    }

    sideBar.classList.toggle('visible', state);
    renderSideBarContent();
}

function isSideBarOpen() {
    const sideBar = document.getElementById('injectManagerSideBar');
    return sideBar && sideBar.classList.contains('visible');
}

function createInjectionForm(context, { isEdit = false, initialData = {} }) {
    const form = document.createElement('form');
    form.classList.add('injectManagerForm');

    const header = document.createElement('div');
    header.classList.add('injectFormHeader');
    header.textContent = isEdit ? context.t`Edit` : context.t`New`;
    form.append(header);

    const elements = {};

    // ID
    const idGroup = document.createElement('div');
    idGroup.classList.add('injectFormGroup');
    const idLabel = document.createElement('label');
    idLabel.textContent = context.t`ID`;
    idLabel.title = context.t`Injection ID`;
    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.classList.add('text_pole');
    idInput.required = true;
    idInput.readOnly = isEdit;
    if (initialData.id) idInput.value = initialData.id;
    idGroup.append(idLabel, idInput);
    form.append(idGroup);
    elements.id = idInput;

    // Scan
    const scanGroup = document.createElement('div');
    scanGroup.classList.add('injectFormGroup', 'checkboxGroup');
    const scanLabel = document.createElement('label');
    scanLabel.classList.add('flex-container', 'alignItemsCenter', 'gap-1');
    const scanCheckbox = document.createElement('input');
    scanCheckbox.type = 'checkbox';
    scanCheckbox.classList.add('checkbox');
    if (initialData.scan) scanCheckbox.checked = initialData.scan;
    const scanText = document.createElement('span');
    scanText.textContent = context.t`Include in World Info Scanning`;
    scanText.title = context.t`Include injection content into World Info scans`;
    scanLabel.append(scanCheckbox, scanText);
    scanGroup.append(scanLabel);
    form.append(scanGroup);
    elements.scan = scanCheckbox;

    // Position
    const positionGroup = document.createElement('div');
    positionGroup.classList.add('injectFormGroup', 'injectFormPosition');
    const positionLabel = document.createElement('label');
    positionLabel.textContent = context.t`Position`;
    positionLabel.title = context.t`Injection Position`;
    positionGroup.prepend(positionLabel);
    const positionOptions = [
        {
            value: InjectPosition.NONE,
            label: context.t`None (not injected)`,
            desc: context.t`Hidden injections can trigger World Info entries`
        },
        {
            value: InjectPosition.BEFORE_PROMPT,
            label: context.t`Before Main Prompt / Story String`
        },
        {
            value: InjectPosition.AFTER_PROMPT,
            label: context.t`After Main Prompt / Story String`
        },
        {
            value: InjectPosition.IN_CHAT,
            label: context.t`In-chat @ Depth`,
            desc: context.t`How many messages before the current end of the chat`
        },
    ];
    positionOptions.forEach(opt => {
        const container = document.createElement('label');
        container.classList.add('injectPositionOption');

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'injectPosition';
        radio.value = opt.value;
        if (initialData.position == opt.value) radio.checked = true;

        const textContainer = document.createElement('div');
        textContainer.classList.add('injectPositionText');

        const mainLabel = document.createElement('div');
        mainLabel.textContent = opt.label;
        textContainer.append(mainLabel);
        if (opt.desc) textContainer.title = opt.desc;
        container.append(radio, textContainer);

        if (opt.value === InjectPosition.IN_CHAT) {
            const inputsContainer = document.createElement('div');
            inputsContainer.classList.add('injectPositionInChat');

            // Depth
            const depthGroup = document.createElement('div');
            depthGroup.classList.add('injectInChatGroup');
            const depthInput = document.createElement('input');
            depthInput.type = 'number';
            depthInput.min = '0';
            depthInput.classList.add('text_pole', 'injectInChatDepth');
            if (initialData.depth) depthInput.value = initialData.depth;
            depthGroup.append(depthInput);
            elements.depth = depthGroup.querySelector('input');

            // Role
            const roleGroup = document.createElement('div');
            roleGroup.classList.add('injectInChatGroup');
            const roleSelect = document.createElement('select');
            roleSelect.classList.add('text_pole', 'injectInChatRole');
            Object.entries(injectRoles).forEach(([key, icon]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = icon + " " + context.translate(injectRoleDescriptions[key]);
                if (initialData.role == key) option.selected = true;
                roleSelect.append(option);
            });
            const roleSpan = document.createElement('span');
            roleSpan.textContent = context.t`as`;
            roleGroup.append(roleSpan, roleSelect);
            elements.role = roleSelect;

            inputsContainer.append(depthGroup, roleGroup);
            container.append(inputsContainer);
        }
        positionGroup.append(container);
        elements.position = radio;
    });
    form.append(positionGroup);

    // Value
    const valueGroup = document.createElement('div');
    valueGroup.classList.add('injectFormGroup');
    const valueLabel = document.createElement('label');
    valueLabel.textContent = context.t`Content`;
    valueLabel.title = context.t`Injection Content`;
    const valueInput = document.createElement('textarea');
    valueInput.classList.add('text_pole', 'monospace');
    valueInput.rows = 5;
    if (initialData.value) valueInput.value = initialData.value;
    valueGroup.append(valueLabel, valueInput);
    form.append(valueGroup);
    elements.value = valueInput;

    return { form, elements };
}

function renderSideBarContent() {
    const context = SillyTavern.getContext();
    const container = document.getElementById('injectManagerSideBarContainer');

    if (!container) {
        console.warn('[Inject Manager] Sidebar container not found.');
        return;
    }

    const injects = context.chatMetadata['script_injects'] ?? {};
    container.innerHTML = '';

    const createButton = document.createElement('div');
    createButton.classList.add('fa-solid', 'fa-plus', 'menu_button');
    createButton.title = context.t`New`;
    createButton.addEventListener('click', async () => {
        const { form, elements } = createInjectionForm(context, {
            initialData: {
                depth: defaultInjectDepth.toString(),
                position: defaultInjectPosition,
            }
        });

        let formValues = null;
        let validationError = null;

        const result = await context.callGenericPopup(
            form,
            context.POPUP_TYPE.TEXT,
            '',
            {
                title: context.t`New`,
                customButtons: [
                    {
                        text: context.t`Cancel`,
                        result: context.POPUP_RESULT.CANCELLED,
                        classes: ['menu_button', 'popup-button-cancel'],
                        appendAtEnd: true
                    }
                ],
                allowVerticalScrolling: true,
                leftAlign: true,
                onClosing: async (popup) => {
                    // Only validate when clicking OK
                    if (popup.result !== context.POPUP_RESULT.AFFIRMATIVE) return true;

                    const currentId = elements.id.value.trim();

                    if (!currentId) {
                        validationError = context.t`ID is required`;
                        toastr.error(validationError, '', { timeOut: 3000 });
                        return false;
                    }

                    // Check for existing ID
                    const existingInjects = context.chatMetadata['script_injects'] || {};
                    if (existingInjects[currentId]) {
                        const overwrite = await context.Popup.show.confirm(
                            context.t`ID already exists. Overwrite?`,
                            context.t`This will replace the existing injection.`
                        );
                        if (!overwrite) return false;
                    }

                    const selectedRadio = Array.from(form.querySelectorAll('input[name=injectPosition]:checked')).pop();
                    const positionValue = selectedRadio ? parseInt(selectedRadio.value) : undefined;

                    const depthValue = positionValue === InjectPosition.IN_CHAT ? parseInt(elements.depth.value) : undefined;
                    const roleValue = positionValue === InjectPosition.IN_CHAT ? parseInt(elements.role.value) : undefined;

                    formValues = {
                        id: currentId,
                        position: positionValue,
                        depth: depthValue,
                        role: roleValue,
                        scan: elements.scan.checked,
                        value: elements.value.value.trim()
                    };

                    return true;
                }
            }
        );

        if (result === context.POPUP_RESULT.AFFIRMATIVE && formValues) {
            try {
                const prefixedId = `script_inject_${formValues.id}`;
                context.setExtensionPrompt(
                    prefixedId,
                    formValues.value,
                    formValues.position,
                    formValues.depth,
                    formValues.scan,
                    formValues.role
                );
                if (!context.chatMetadata['script_injects']) {
                    context.chatMetadata['script_injects'] = {};
                }
                context.chatMetadata['script_injects'][formValues.id] = {
                    value: formValues.value,
                    position: formValues.position,
                    depth: formValues.depth,
                    role: formValues.role,
                    scan: formValues.scan
                };

                await context.saveMetadata();
                renderSideBarContent();
                renderElement(true);
                toastr.success(context.t`Injection saved!`, '', { timeOut: 2000 });
            } catch (error) {
                console.error('[Inject Manager] Save failed:', error);
                toastr.error(context.t`Save failed: ${error.message}`, '', { timeOut: 3000 });
            }
        }
    });
    container.appendChild(createButton);

    const hasAnyInjects = Object.keys(injects).length > 0;

    if (!hasAnyInjects) {
        const noInjects = document.createElement('div');
        noInjects.classList.add('sideBarNoInjects');
        noInjects.textContent = context.t`No injects found.`;
        container.append(noInjects);
        return;
    }

    for (const [id, inject] of Object.entries(injects)) {
        const prefixedId = `script_inject_${id}`;
        const injectContainer = document.createElement('div');
        injectContainer.classList.add('sideBarInjectContainer');

        const injectInfoContainer = document.createElement('div');
        const injectInfoTopRow = document.createElement('div');
        const injectInfoBottomRow = document.createElement('div');
        injectInfoContainer.classList.add('sideBarInjectInfoContainer');
        injectInfoTopRow.classList.add('sideBarInjectInfoTopRow');
        injectInfoBottomRow.classList.add('sideBarInjectInfoBottomRow');
        injectInfoContainer.append(injectInfoTopRow, injectInfoBottomRow);

        const injectId = document.createElement('div');
        injectId.classList.add('sideBarInjectId');
        injectId.textContent = id;
        injectId.title = id;

        const injectValue = document.createElement('div');
        injectValue.classList.add('sideBarInjectValue');
        injectValue.textContent = inject.value;
        injectValue.title = inject.value;

        const injectScan = document.createElement('div');
        injectScan.classList.add('sideBarInjectScan');
        injectScan.textContent = injectScans[inject.scan];

        const injectRole = document.createElement('div');
        injectRole.classList.add('sideBarInjectRole');
        injectRole.textContent = injectRoles[inject.role];

        const injectPosition = document.createElement('div');
        injectPosition.classList.add('sideBarInjectPosition');
        injectPosition.textContent = injectPositions[inject.position];

        const injectDepth = document.createElement('div');
        injectDepth.classList.add('sideBarInjectDepth');
        injectDepth.textContent = inject.depth;

        injectInfoTopRow.append(injectId, injectScan, injectRole, injectPosition, injectDepth);
        injectInfoBottomRow.append(injectValue);

        const injectActions = document.createElement('div');
        injectActions.classList.add('sideBarInjectActions');

        const injectEdit = document.createElement('div');
        injectEdit.classList.add('fa-solid', 'fa-pen', 'menu_button');
        injectEdit.title = context.t`Edit`;
        injectEdit.addEventListener('click', async (event) => {
            event.stopPropagation();

            const { form, elements } = createInjectionForm(context, {
                isEdit: true,
                initialData: {
                    id: id,
                    position: inject.position.toString(),
                    depth: inject.depth ? inject.depth.toString() : defaultInjectDepth,
                    role: inject.role ? inject.role.toString() : undefined,
                    scan: inject.scan,
                    value: inject.value
                }
            });

            const result = await context.callGenericPopup(
                form,
                context.POPUP_TYPE.TEXT,
                '',
                {
                    title: context.t`Edit`,
                    customButtons: [
                        {
                            text: context.t`Cancel`,
                            result: context.POPUP_RESULT.CANCELLED,
                            classes: ['menu_button', 'popup-button-cancel'],
                            appendAtEnd: true
                        }
                    ],
                    allowVerticalScrolling: true,
                    leftAlign: true
                }
            );

            if (result === context.POPUP_RESULT.AFFIRMATIVE) {
                const selectedRadio = Array.from(form.querySelectorAll('input[name=injectPosition]:checked')).pop();
                const positionValue = selectedRadio ? parseInt(selectedRadio.value) : undefined;
                inject.position = positionValue;
                if (inject.position === InjectPosition.IN_CHAT) inject.depth = parseInt(elements.depth.value);
                inject.role = inject.position === InjectPosition.IN_CHAT ? parseInt(elements.role.value) : undefined;
                inject.scan = elements.scan.checked;
                inject.value = elements.value.value.trim();

                context.setExtensionPrompt(
                    prefixedId,
                    inject.value,
                    inject.position,
                    inject.depth,
                    inject.scan,
                    inject.role
                );

                await context.saveMetadata();
                renderSideBarContent();
                renderElement(true);
            }
        });
        injectActions.append(injectEdit);

        const injectDelete = document.createElement('div');
        injectDelete.classList.add('fa-solid', 'fa-trash-alt', 'menu_button');
        injectDelete.title = context.t`Delete`;
        injectDelete.addEventListener('click', async (event) => {
            event.stopPropagation();
            const confirmation = await context.Popup.show.confirm(context.t`Are you sure?`, null);

            if (!confirmation) {
                return;
            }

            delete injects[id];
            context.setExtensionPrompt(prefixedId, '', inject.position, inject.depth, inject.scan, inject.role);
            await context.saveMetadata();

            renderSideBarContent();
            renderElement(true);
        });
        injectActions.append(injectDelete);

        injectContainer.append(injectInfoContainer, injectActions);
        injectContainer.addEventListener('click', async () => {
            const viewTextArea = document.createElement('textarea');
            viewTextArea.value = inject.value;
            viewTextArea.classList.add('injectManagerViewTextArea', 'text_pole', 'monospace');
            viewTextArea.addEventListener('input', () => {
                inject.value = viewTextArea.value;
                injectValue.textContent = viewTextArea.value;
                injectValue.title = viewTextArea.value;
                context.setExtensionPrompt(prefixedId, viewTextArea.value, inject.position, inject.depth, inject.scan, inject.role);
                context.saveMetadata();
            });
            const popupPromise = context.callGenericPopup(viewTextArea, context.POPUP_TYPE.TEXT);
            viewTextArea.focus();
            await popupPromise;
            await context.saveMetadata();
        });
        container.append(injectContainer);
    }
}

(function initExtension() {
    const context = SillyTavern.getContext();

    if (!context.extensionSettings[settingsKey]) {
        context.extensionSettings[settingsKey] = structuredClone(defaultSettings);
    }

    for (const key of Object.keys(defaultSettings)) {
        if (context.extensionSettings[settingsKey][key] === undefined) {
            context.extensionSettings[settingsKey][key] = defaultSettings[key];
        }
    }

    const eventsToRender = [
        context.eventTypes.APP_READY,
        context.eventTypes.CHAT_CREATED,
        context.eventTypes.CHAT_CHANGED,
        context.eventTypes.CHARACTER_MESSAGE_RENDERED,
        context.eventTypes.USER_MESSAGE_RENDERED,
        context.eventTypes.GROUP_MEMBER_DRAFTED,
        context.eventTypes.WORLD_INFO_ACTIVATED,
        context.eventTypes.GENERATION_STARTED,
        context.eventTypes.GENERATION_ENDED,
        context.eventTypes.GENERATION_STOPPED,
        context.eventTypes.GENERATION_AFTER_COMMANDS,
    ];

    for (const event of eventsToRender) {
        context.eventSource.makeLast(event, renderElementDebounced);
    }

    context.saveSettingsDebounced();

    renderExtensionSettings();
    renderElementDebounced();
    renderSideBar();
})();
