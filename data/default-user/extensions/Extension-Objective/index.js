import { chat_metadata, saveSettingsDebounced, is_send_press, extension_prompt_types, animation_easing } from '../../../../script.js';
import { getContext, extension_settings, saveMetadataDebounced, renderExtensionTemplateAsync } from '../../../extensions.js';
import {
    substituteParams,
    eventSource,
    event_types,
    generateQuietPrompt,
    animation_duration,
} from '../../../../script.js';
import { waitUntilCondition } from '../../../utils.js';
import { is_group_generating, selected_group } from '../../../group-chats.js';
import { dragElement } from '../../../../scripts/RossAscends-mods.js';
import { loadMovingUIState } from '../../../../scripts/power-user.js';
import { callGenericPopup, Popup, POPUP_TYPE } from '../../../popup.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';

const MODULE_NAME = 'Objective';


let taskTree = null;
let currentChatId = '';
let currentObjective = null;
let currentTask = null;
let checkCounter = 0;
let generateCounter = 0;
let lastMessageWasSwipe = false;
let selectedCustomPrompt = 'default';


const defaultPrompts = {
    'createTask': 'Ignore previous instructions. Please generate a numbered list of plain text tasks to complete an objective. The objective that you must make a numbered task list for is: "{{objective}}". The tasks created should take into account the character traits of {{char}}. These tasks may or may not involve {{user}} directly. Include the objective as the final task.\n\nThe list should be formatted using a number followed by a fullstop and the task on each line, e.g. "1. Take over the world". Include only the list in your reply.',
    'checkTaskCompleted': 'Ignore previous instructions. Determine if this task is completed: [{{task}}]. To do this, examine the most recent messages. Your response must only contain either true or false, and nothing else. Example output: true',
    'currentTask': 'Your current task is [{{task}}]. Balance existing roleplay with completing this task.',
};

let objectivePrompts = defaultPrompts;

//###############################//
//#       Task Management       #//
//###############################//

// Return the task and index or throw an error
function getTaskById(taskId) {
    if (taskId == null) {
        throw 'Null task id';
    }
    return getTaskByIdRecurse(taskId, taskTree);
}

function getTaskByIdRecurse(taskId, task) {
    if (task.id == taskId) {
        return task;
    }
    for (const childTask of task.children) {
        const foundTask = getTaskByIdRecurse(taskId, childTask);
        if (foundTask != null) {
            return foundTask;
        }
    }
    return null;
}

function substituteParamsPrompts(content, substituteGlobal) {
    content = content.replace(/{{objective}}/gi, currentObjective?.description ?? '');
    content = content.replace(/{{task}}/gi, currentTask?.description ?? '');
    content = content.replace(/{{parent}}/gi, currentTask?.parent?.description ?? '');
    if (substituteGlobal) {
        content = substituteParams(content);
    }
    return content;
}

// Call Quiet Generate to create task list using character context, then convert to tasks. Should not be called much.
async function generateTasks() {

    const prompt = substituteParamsPrompts(objectivePrompts.createTask, false);
    console.log('Generating tasks for objective with prompt');
    toastr.info('Generating tasks for objective', 'Please wait...');
    const taskResponse = await generateQuietPrompt(prompt, false, false);

    // Clear all existing objective tasks when generating
    currentObjective.children = [];
    const numberedListPattern = /^\d+\./;

    // Create tasks from generated task list
    for (const task of taskResponse.split('\n').map(x => x.trim())) {
        if (task.match(numberedListPattern) != null) {
            currentObjective.addTask(task.replace(numberedListPattern, '').trim());
        }
    }
    updateUiTaskList();
    setCurrentTask();
    console.info(`Response for Objective: '${currentObjective.description}' was \n'${taskResponse}', \nwhich created tasks \n${JSON.stringify(currentObjective.children.map(v => { return v.toSaveState(); }), null, 2)} `);
    toastr.success(`Generated ${currentObjective.children.length} tasks`, 'Done!');
}

async function markTaskCompleted() {
    console.info(`User determined task '${currentTask.description} is completed.`);
    currentTask.completeTask();
}

// Call Quiet Generate to check if a task is completed
async function checkTaskCompleted() {
    // Make sure there are tasks
    if (jQuery.isEmptyObject(currentTask)) {
        console.warn('No current task to check');
        return String(false);
    }

    try {
        // Wait for group to finish generating
        if (selected_group) {
            await waitUntilCondition(() => is_group_generating === false, 10000, 100);
        }
        // Another extension might be doing something with the chat, so wait for it to finish
        await waitUntilCondition(() => is_send_press === false, 30000, 100);
    } catch {
        console.debug('Failed to wait for group to finish generating');
        return String(false);
    }

    const toast = toastr.info('Checking for task completion.');

    const prompt = substituteParamsPrompts(objectivePrompts.checkTaskCompleted, false);
    const taskResponse = (await generateQuietPrompt(prompt, false, false)).toLowerCase();
    toastr.clear(toast);

    // Check response if task complete
    if (taskResponse.includes('true')) {
        console.info(`Character determined task '${currentTask.description} is completed.`);
        currentTask.completeTask();
        return String(true);
    } else if (!(taskResponse.includes('false'))) {
        console.warn(`checkTaskCompleted response did not contain true or false. taskResponse: ${taskResponse}`);
    } else {
        console.debug(`Checked task completion. taskResponse: ${taskResponse}`);
    }

    return String(false);
}

function getNextIncompleteTaskRecurse(task) {
    if (task.completed === false // Return task if incomplete
        && task.children.length === 0 // Ensure task has no children, it's subtasks will determine completeness
        && task.parentId !== ''  // Must have parent id. Only root task will be missing this and we dont want that
    ) {
        return task;
    }
    for (const childTask of task.children) {
        if (childTask.completed === true) { // Don't recurse into completed tasks
            continue;
        }
        const foundTask = getNextIncompleteTaskRecurse(childTask);
        if (foundTask != null) {
            return foundTask;
        }
    }
    return null;
}

// Set a task in extensionPrompt context. Defaults to first incomplete
function setCurrentTask(taskId = null, skipSave = false) {
    const context = getContext();

    // TODO: Should probably null this rather than set empty object
    currentTask = {};

    // Find the task, either next incomplete, or by provided taskId
    if (taskId === null) {
        currentTask = getNextIncompleteTaskRecurse(taskTree) || {};
    } else {
        currentTask = getTaskById(taskId);
    }

    // Don't just check for a current task, check if it has data
    const description = currentTask.description || null;
    if (description) {
        const extensionPromptText = substituteParamsPrompts(objectivePrompts.currentTask, true);

        // Remove highlights
        $('.objective-task').css({ 'border-color': '', 'border-width': '' });
        // Highlight current task
        let highlightTask = currentTask;
        while (highlightTask.parentId !== '') {
            if (highlightTask.descriptionSpan) {
                highlightTask.descriptionSpan.css({ 'border-color': 'yellow', 'border-width': '2px' });
            }
            const parent = getTaskById(highlightTask.parentId);
            highlightTask = parent;
        }

        // Update the extension prompt
        context.setExtensionPrompt(MODULE_NAME, extensionPromptText, extension_prompt_types.IN_CHAT, Number($('#objective-chat-depth').val()));
        console.info(`Current task in context.extensionPrompts.Objective is ${JSON.stringify(context.extensionPrompts.Objective)}`);
    } else {
        context.setExtensionPrompt(MODULE_NAME, '', extension_prompt_types.NONE, 0);
        console.info('No current task');
    }

    // Save state if not skipping
    if (!skipSave) {
        saveState();
    }
}

function getHighestTaskIdRecurse(task) {
    let nextId = task.id;

    for (const childTask of task.children) {
        const childId = getHighestTaskIdRecurse(childTask);
        if (childId > nextId) {
            nextId = childId;
        }
    }
    return nextId;
}

//###############################//
//#         Task Class          #//
//###############################//
class ObjectiveTask {
    id;
    description;
    completed;
    parentId;
    children;

    // UI Elements
    taskHtml;
    descriptionSpan;
    completedCheckbox;
    deleteTaskButton;
    addTaskButton;
    moveUpBotton;
    moveDownButton;

    constructor({ id = undefined, description, completed = false, parentId = '' }) {
        this.description = description;
        this.parentId = parentId;
        this.children = [];
        this.completed = completed;

        // Generate a new ID if none specified
        if (id == undefined) {
            this.id = getHighestTaskIdRecurse(taskTree) + 1;
        } else {
            this.id = id;
        }
    }

    // Accepts optional index. Defaults to adding to end of list.
    addTask(description, index = null) {
        index = index != null ? index : index = this.children.length;
        this.children.splice(index, 0, new ObjectiveTask(
            { description: description, parentId: this.id },
        ));
        saveState();
    }

    getIndex() {
        if (this.parentId !== null) {
            const parent = getTaskById(this.parentId);
            const index = parent.children.findIndex(task => task.id === this.id);
            if (index === -1) {
                throw `getIndex failed: Task '${this.description}' not found in parent task '${parent.description}'`;
            }
            return index;
        } else {
            throw `getIndex failed: Task '${this.description}' has no parent`;
        }
    }

    // Used to set parent to complete when all child tasks are completed
    checkParentComplete() {
        let all_completed = true;
        if (this.parentId !== '') {
            const parent = getTaskById(this.parentId);
            for (const child of parent.children) {
                if (!child.completed) {
                    all_completed = false;
                    break;
                }
            }
            if (all_completed) {
                parent.completed = true;
                console.info(`Parent task '${parent.description}' completed after all child tasks complated.`);
            } else {
                parent.completed = false;
            }
        }
    }

    // Complete the current task, setting next task to next incomplete task
    completeTask() {
        this.completed = true;
        console.info(`Task successfully completed: ${JSON.stringify(this.description)}`);
        this.checkParentComplete();
        setCurrentTask();
        updateUiTaskList();
    }

    // Add a single task to the UI and attach event listeners for user edits
    addUiElement() {
        const template = `
        <div id="objective-task-label-${this.id}" class="flex1 checkbox_label alignItemsCenter">
            <input id="objective-task-complete-${this.id}" type="checkbox">
            <span class="text_pole objective-task" style="display: block" id="objective-task-description-${this.id}" contenteditable>${this.description}</span>
            <div id="objective-task-delete-${this.id}" class="objective-task-button fa-solid fa-xmark fa-fw fa-lg" title="Delete Task"></div>
            <div id="objective-task-add-${this.id}" class="objective-task-button fa-solid fa-plus fa-fw fa-lg" title="Add Task"></div>
            <div id="objective-task-add-branch-${this.id}" class="objective-task-button fa-solid fa-code-fork fa-fw fa-lg" title="Branch Task"></div>
            <div id="objective-task-move-up-${this.id}" class="objective-task-button fa-solid fa-arrow-up fa-fw fa-lg" title="Move Up"></div>
            <div id="objective-task-move-down-${this.id}" class="objective-task-button fa-solid fa-arrow-down fa-fw fa-lg" title="Move Down"></div>
        </div><br>
        `;

        // Add the filled out template
        $('#objective-tasks').append(template);

        this.completedCheckbox = $(`#objective-task-complete-${this.id}`);
        this.descriptionSpan = $(`#objective-task-description-${this.id}`);
        this.addButton = $(`#objective-task-add-${this.id}`);
        this.deleteButton = $(`#objective-task-delete-${this.id}`);
        this.taskHtml = $(`#objective-task-label-${this.id}`);
        this.branchButton = $(`#objective-task-add-branch-${this.id}`);
        this.moveUpButton = $(`objective-task-move-up-${this.id}`);
        this.moveDownButton = $(`objective-task-move-down-${this.id}`);

        // Handle sub-task forking style
        if (this.children.length > 0) {
            this.branchButton.css({ 'color': '#33cc33' });
        } else {
            this.branchButton.css({ 'color': '' });
        }

        const parent = getTaskById(this.parentId);
        if (parent) {
            let index = parent.children.indexOf(this);
            if (index < 1) {
                $(`#objective-task-move-up-${this.id}`).removeClass('fa-arrow-up');
            } else {
                $(`#objective-task-move-up-${this.id}`).addClass('fa-arrow-up');
                $(`#objective-task-move-up-${this.id}`).on('click', () => (this.onMoveUpClick()));
            }

            if (index === (parent.children.length - 1)) {
                $(`#objective-task-move-down-${this.id}`).removeClass('fa-arrow-down');
            } else {
                $(`#objective-task-move-down-${this.id}`).addClass('fa-arrow-down');
                $(`#objective-task-move-down-${this.id}`).on('click', () => (this.onMoveDownClick()));
            }
        }
        // Add event listeners and set properties
        $(`#objective-task-complete-${this.id}`).prop('checked', this.completed);
        $(`#objective-task-complete-${this.id}`).on('click', () => (this.onCompleteClick()));
        $(`#objective-task-description-${this.id}`).on('keyup', () => (this.onDescriptionUpdate()));
        $(`#objective-task-description-${this.id}`).on('focusout', () => (this.onDescriptionFocusout()));
        $(`#objective-task-delete-${this.id}`).on('click', () => (this.onDeleteClick()));
        $(`#objective-task-add-${this.id}`).on('click', () => (this.onAddClick()));
        this.branchButton.on('click', () => (this.onBranchClick()));
    }

    onBranchClick() {
        currentObjective = this;
        updateUiTaskList();
        setCurrentTask();
    }

    complete(completed) {
        this.completed = completed;
        this.children.forEach(child => child.complete(completed));
    }
    onCompleteClick() {
        this.complete(this.completedCheckbox.prop('checked'));
        this.checkParentComplete();
        setCurrentTask();
    }

    onDescriptionUpdate() {
        this.description = this.descriptionSpan.text();
    }

    onDescriptionFocusout() {
        setCurrentTask();
    }

    onDeleteClick() {
        const index = this.getIndex();
        const parent = getTaskById(this.parentId);
        parent.children.splice(index, 1);
        updateUiTaskList();
        setCurrentTask();
    }

    onMoveUpClick() {
        const parent = getTaskById(this.parentId);
        const index = parent.children.indexOf(this);
        if (index != 0) {
            let temp = parent.children[index - 1];
            parent.children[index - 1] = parent.children[index];
            parent.children[index] = temp;

            updateUiTaskList();
            if (currentTask) {
                setCurrentTask(currentTask.taskId);
            }
        }
    }

    onMoveDownClick() {
        const parent = getTaskById(this.parentId);
        const index = parent.children.indexOf(this);
        if (index < (parent.children.length - 1)) {
            let temp = parent.children[index + 1];
            parent.children[index + 1] = parent.children[index];
            parent.children[index] = temp;

            updateUiTaskList();
            setCurrentTask();
        }

    }

    onAddClick() {
        const index = this.getIndex();
        const parent = getTaskById(this.parentId);
        parent.addTask('', index + 1);
        updateUiTaskList();
        setCurrentTask();
    }

    toSaveStateRecurse() {
        let children = [];
        if (this.children.length > 0) {
            for (const child of this.children) {
                children.push(child.toSaveStateRecurse());
            }
        }
        return {
            'id': this.id,
            'description': this.description,
            'completed': this.completed,
            'parentId': this.parentId,
            'children': children,
        };
    }
}

//###############################//
//#       Custom Prompts        #//
//###############################//

function onEditPromptClick() {
    let popupText = '';
    popupText += `
    <div class="objective_prompt_modal">
        <div class="objective_prompt_block justifyCenter">
            <label for="objective-custom-prompt-select">Custom Prompt Select</label>
            <select id="objective-custom-prompt-select" class="text_pole"><select>
        </div>
        <div class="objective_prompt_block justifyCenter">
            <input id="objective-custom-prompt-new" class="menu_button" type="submit" value="New Prompt" />
            <input id="objective-custom-prompt-save" class="menu_button" type="submit" value="Update Prompt" />
            <input id="objective-custom-prompt-delete" class="menu_button" type="submit" value="Delete Prompt" />
        </div>
        <hr class="m-t-1 m-b-1">
        <small>Edit prompts used by Objective for this session. You can use {{objective}} or {{task}} plus any other standard template variables. Save template to persist changes.</small>
        <hr class="m-t-1 m-b-1">
        <div>
            <label for="objective-prompt-generate">Generation Prompt</label>
            <textarea id="objective-prompt-generate" type="text" class="text_pole textarea_compact" rows="6"></textarea>
            <label for="objective-prompt-check">Completion Check Prompt</label>
            <textarea id="objective-prompt-check" type="text" class="text_pole textarea_compact" rows="6"></textarea>
            <label for="objective-prompt-extension-prompt">Injected Prompt</label>
            <textarea id="objective-prompt-extension-prompt" type="text" class="text_pole textarea_compact" rows="6"></textarea>
        </div>
    </div>`;
    callGenericPopup(popupText, POPUP_TYPE.TEXT, '', { allowVerticalScrolling: true, wide: true });
    populateCustomPrompts(selectedCustomPrompt);

    // Set current values
    $('#objective-prompt-generate').val(objectivePrompts.createTask);
    $('#objective-prompt-check').val(objectivePrompts.checkTaskCompleted);
    $('#objective-prompt-extension-prompt').val(objectivePrompts.currentTask);

    // Handle value updates
    $('#objective-prompt-generate').on('input', () => {
        objectivePrompts.createTask = String($('#objective-prompt-generate').val());
        saveState();
        setCurrentTask();
    });
    $('#objective-prompt-check').on('input', () => {
        objectivePrompts.checkTaskCompleted = String($('#objective-prompt-check').val());
        saveState();
        setCurrentTask();
    });
    $('#objective-prompt-extension-prompt').on('input', () => {
        objectivePrompts.currentTask = String($('#objective-prompt-extension-prompt').val());
        saveState();
        setCurrentTask();
    });

    // Handle new
    $('#objective-custom-prompt-new').on('click', () => {
        newCustomPrompt();
    });

    // Handle save
    $('#objective-custom-prompt-save').on('click', () => {
        saveCustomPrompt();
    });

    // Handle delete
    $('#objective-custom-prompt-delete').on('click', () => {
        deleteCustomPrompt();
    });

    // Handle load
    $('#objective-custom-prompt-select').on('change', loadCustomPrompt);
}
async function newCustomPrompt() {
    const customPromptName = await Popup.show.input('Custom Prompt name', null);

    if (!customPromptName) {
        toastr.warning('Please set custom prompt name to save.');
        return;
    }
    if (customPromptName == 'default') {
        toastr.error('Cannot save over default prompt');
        return;
    }
    extension_settings.objective.customPrompts[customPromptName] = {};
    Object.assign(extension_settings.objective.customPrompts[customPromptName], objectivePrompts);
    saveSettingsDebounced();
    populateCustomPrompts(customPromptName);
}

function saveCustomPrompt() {
    const customPromptName = String($('#objective-custom-prompt-select').find(':selected').val());
    if (customPromptName == 'default') {
        toastr.error('Cannot save over default prompt');
        return;
    }
    Object.assign(extension_settings.objective.customPrompts[customPromptName], objectivePrompts);
    saveSettingsDebounced();
    populateCustomPrompts(customPromptName);
    toastr.success('Prompt saved as ' + customPromptName);
}

async function deleteCustomPrompt() {
    const customPromptName = String($('#objective-custom-prompt-select').find(':selected').val());

    if (customPromptName == 'default') {
        toastr.error('Cannot delete default prompt');
        return;
    }

    const confirmation = await Popup.show.confirm('Are you sure you want to delete this prompt?', null);

    if (!confirmation) {
        return;
    }

    delete extension_settings.objective.customPrompts[customPromptName];
    saveSettingsDebounced();
    selectedCustomPrompt = 'default';
    populateCustomPrompts(selectedCustomPrompt);
    loadCustomPrompt();
}

function loadCustomPrompt() {
    const optionSelected = String($('#objective-custom-prompt-select').find(':selected').val());
    Object.assign(objectivePrompts, extension_settings.objective.customPrompts[optionSelected]);
    selectedCustomPrompt = optionSelected;

    $('#objective-prompt-generate').val(objectivePrompts.createTask).trigger('input');
    $('#objective-prompt-check').val(objectivePrompts.checkTaskCompleted).trigger('input');
    $('#objective-prompt-extension-prompt').val(objectivePrompts.currentTask).trigger('input');

    saveState();
    setCurrentTask();
}

/**
 * Populate the custom prompt select dropdown with saved prompts.
 * @param {string} selected Optional selected prompt
 */
function populateCustomPrompts(selected) {
    if (!selected) {
        selected = selectedCustomPrompt || 'default';
    }

    // Populate saved prompts
    $('#objective-custom-prompt-select').empty();
    for (const customPromptName in extension_settings.objective.customPrompts) {
        const option = document.createElement('option');
        option.innerText = customPromptName;
        option.value = customPromptName;
        option.selected = customPromptName === selected;
        $('#objective-custom-prompt-select').append(option);
    }
}

//###############################//
//#       UI AND Settings       #//
//###############################//


const defaultSettings = {
    currentObjectiveId: null,
    taskTree: null,
    chatDepth: 2,
    checkFrequency: 3,
    hideTasks: false,
    prompts: defaultPrompts,
};

// Convenient single call. Not much at the moment.
function resetState() {
    lastMessageWasSwipe = false;
    loadSettings();
}

//
function saveState() {
    const context = getContext();

    if (currentChatId == '') {
        currentChatId = context.chatId;
    }

    chat_metadata['objective'] = {
        currentObjectiveId: currentObjective.id,
        taskTree: taskTree.toSaveStateRecurse(),
        checkFrequency: $('#objective-check-frequency').val(),
        generateFrequency: $('#objective-generate-frequency').val(),
        chatDepth: $('#objective-chat-depth').val(),
        hideTasks: $('#objective-hide-tasks').prop('checked'),
        prompts: objectivePrompts,
        selectedCustomPrompt: selectedCustomPrompt,
    };

    saveMetadataDebounced();
}

// Dump core state
function debugObjectiveExtension() {
    console.log(JSON.stringify({
        'currentTask': currentTask,
        'currentObjective': currentObjective,
        'taskTree': taskTree.toSaveStateRecurse(),
        'chat_metadata': chat_metadata['objective'],
        'extension_settings': extension_settings['objective'],
        'prompts': objectivePrompts,
    }, null, 2));
}

globalThis.debugObjectiveExtension = debugObjectiveExtension;


// Populate UI task list
function updateUiTaskList() {
    $('#objective-tasks').empty();

    // Show button to navigate back to parent objective if parent exists
    if (currentObjective) {
        if (currentObjective.parentId !== '') {
            $('#objective-parent').show();
        } else {
            $('#objective-parent').hide();
        }
    }

    $('#objective-text').val(currentObjective.description);
    if (currentObjective.children.length > 0) {
        // Show tasks if there are any to show
        for (const task of currentObjective.children) {
            task.addUiElement();
        }
    } else {
        // Show button to add tasks if there are none
        $('#objective-tasks').append(`
        <input id="objective-task-add-first" type="button" class="menu_button" value="Add Task">
        `);
        $('#objective-task-add-first').on('click', () => {
            currentObjective.addTask('');
            setCurrentTask();
            updateUiTaskList();
        });
    }
}

function onParentClick() {
    currentObjective = getTaskById(currentObjective.parentId);
    updateUiTaskList();
    setCurrentTask();
}

// Trigger creation of new tasks with given objective.
async function onGenerateObjectiveClick() {
    await generateTasks();
    saveState();
}

// Update extension prompts
function onChatDepthInput() {
    saveState();
    setCurrentTask(); // Ensure extension prompt is updated
}

function onObjectiveTextFocusOut() {
    if (currentObjective) {
        currentObjective.description = $('#objective-text').val();
        saveState();
    }
}

// Update how often we check for task completion
function onCheckFrequencyInput() {
    checkCounter = Number($('#objective-check-frequency').val());
    $('#objective-counter').text(checkCounter);
    saveState();
}

function onGenerateFrequencyInput() {
    generateCounter = Number($('#objective-generate-frequency').val());
    $('#generate-counter').text(generateCounter);
    saveState();
}

function onHideTasksInput() {
    $('#objective-tasks').prop('hidden', $('#objective-hide-tasks').prop('checked'));
    saveState();
}

function onClearTasksClick() {
    if (currentObjective) {
        currentObjective.children = [];
        updateUiTaskList();
        setCurrentTask();
        saveState();
        toastr.success('All tasks cleared');
    }
}

function loadTaskChildrenRecurse(savedTask) {
    let tempTaskTree = new ObjectiveTask({
        id: savedTask.id,
        description: savedTask.description,
        completed: savedTask.completed,
        parentId: savedTask.parentId,
    });
    for (const task of savedTask.children) {
        const childTask = loadTaskChildrenRecurse(task);
        tempTaskTree.children.push(childTask);
    }
    return tempTaskTree;
}

function loadSettings() {
    // Load/Init settings for chatId
    currentChatId = getContext().chatId;

    // Reset Objectives and Tasks in memory
    taskTree = null;
    currentObjective = null;

    // Init extension settings
    if (Object.keys(extension_settings.objective).length === 0) {
        Object.assign(extension_settings.objective, { 'customPrompts': { 'default': defaultPrompts } });
    }

    // Generate a temporary chatId if none exists
    if (currentChatId == undefined) {
        currentChatId = 'no-chat-id';
    }

    // Migrate existing settings
    if (currentChatId in extension_settings.objective) {
        // TODO: Remove this soon
        chat_metadata['objective'] = extension_settings.objective[currentChatId];
        delete extension_settings.objective[currentChatId];
    }

    if (!('objective' in chat_metadata)) {
        Object.assign(chat_metadata, { objective: defaultSettings });
    }

    // Migrate legacy flat objective to new objectiveTree and currentObjective
    if ('objective' in chat_metadata.objective) {

        // Create root objective from legacy objective
        taskTree = new ObjectiveTask({ id: 0, description: chat_metadata.objective.objective });
        currentObjective = taskTree;

        // Populate root objective tree from legacy tasks
        if ('tasks' in chat_metadata.objective) {
            let idIncrement = 0;
            taskTree.children = chat_metadata.objective.tasks.map(task => {
                idIncrement += 1;
                return new ObjectiveTask({
                    id: idIncrement,
                    description: task.description,
                    completed: task.completed,
                    parentId: taskTree.id,
                });
            });
        }
        saveState();
        delete chat_metadata.objective.objective;
        delete chat_metadata.objective.tasks;
    } else {
        // Load Objectives and Tasks (Normal path)
        if (chat_metadata.objective.taskTree) {
            taskTree = loadTaskChildrenRecurse(chat_metadata.objective.taskTree);
        }
    }

    // Make sure there's a root task
    if (!taskTree) {
        taskTree = new ObjectiveTask({ id: 0, description: $('#objective-text').val() });
    }

    currentObjective = taskTree;
    checkCounter = chat_metadata['objective'].checkFrequency;
    generateCounter = Number(chat_metadata['objective'].generateFrequency) || 0;
    objectivePrompts = chat_metadata['objective'].prompts;
    selectedCustomPrompt = chat_metadata['objective'].selectedCustomPrompt || 'default';

    // Update UI elements
    $('#objective-counter').text(checkCounter);
    $('#generate-counter').text(generateCounter);
    $('#objective-text').text(taskTree.description);
    updateUiTaskList();
    $('#objective-chat-depth').val(chat_metadata['objective'].chatDepth);
    $('#objective-check-frequency').val(chat_metadata['objective'].checkFrequency);
    $('#objective-generate-frequency').val(chat_metadata['objective'].generateFrequency || 0);
    $('#objective-hide-tasks').prop('checked', chat_metadata['objective'].hideTasks);
    $('#objective-tasks').prop('hidden', $('#objective-hide-tasks').prop('checked'));
    setCurrentTask(null, true);
}

function addManualTaskCheckUi() {
    const getWandContainer = () => $(document.getElementById('objective_wand_container') ?? document.getElementById('extensionsMenu'));
    const container = getWandContainer();
    container.append(`
        <div id="objective-task-manual-check-menu-item" class="list-group-item flex-container flexGap5">
            <div id="objective-task-manual-check" class="extensionsMenuExtensionButton fa-regular fa-square-check"/></div>
            Manual Task Check
        </div>`);
    container.append(`
        <div id="objective-task-complete-current-menu-item" class="list-group-item flex-container flexGap5">
            <div id="objective-task-complete-current" class="extensionsMenuExtensionButton fa-regular fa-list-check"/></div>
            Complete Current Task
        </div>`);
    $('#objective-task-manual-check-menu-item').attr('title', 'Trigger AI check of completed tasks').on('click', checkTaskCompleted);
    $('#objective-task-complete-current-menu-item').attr('title', 'Mark the current task as completed.').on('click', markTaskCompleted);
}

function doPopout(e) {
    const target = e.target;

    //repurposes the zoomed avatar template to server as a floating div
    if ($('#objectiveExtensionPopout').length === 0) {
        console.debug('did not see popout yet, creating');
        const originalHTMLClone = $(target).parent().parent().parent().find('.inline-drawer-content').html();
        const originalElement = $(target).parent().parent().parent().find('.inline-drawer-content');
        const template = $('#zoomed_avatar_template').html();
        const controlBarHtml = `<div class="panelControlBar flex-container">
        <div id="objectiveExtensionPopoutheader" class="fa-solid fa-grip drag-grabber hoverglow"></div>
        <div id="objectiveExtensionPopoutClose" class="fa-solid fa-circle-xmark hoverglow dragClose"></div>
    </div>`;
        const newElement = $(template);
        newElement.attr('id', 'objectiveExtensionPopout')
            .css({ display: 'flex', opacity: 0 })
            .removeClass('zoomed_avatar')
            .addClass('draggable')
            .empty();
        originalElement.html('<div class="flex-container alignitemscenter justifyCenter wide100p"><small>Currently popped out</small></div>');
        newElement.append(controlBarHtml).append(originalHTMLClone);
        $('#movingDivs').append(newElement);
        newElement.transition({ opacity: 1, duration: animation_duration, easing: animation_easing });
        $('#objectiveExtensionDrawerContents').addClass('scrollY');
        loadSettings();
        loadMovingUIState();

        dragElement(newElement);

        //setup listener for close button to restore extensions menu
        $('#objectiveExtensionPopoutClose').off('click').on('click', function () {
            $('#objectiveExtensionDrawerContents').removeClass('scrollY');
            const objectivePopoutHTML = $('#objectiveExtensionDrawerContents');
            $('#objectiveExtensionPopout').fadeOut(animation_duration, () => {
                originalElement.empty();
                originalElement.append(objectivePopoutHTML);
                $('#objectiveExtensionPopout').remove();
            });
            loadSettings();
        });
    } else {
        console.debug('saw existing popout, removing');
        $('#objectiveExtensionPopout').fadeOut(animation_duration, () => { $('#objectiveExtensionPopoutClose').trigger('click'); });
    }
}

jQuery(async () => {
    const settingsHtml = await renderExtensionTemplateAsync('third-party/Extension-Objective', 'settings');

    addManualTaskCheckUi();
    const getContainer = () => $(document.getElementById('objective_container') ?? document.getElementById('extensions_settings'));
    getContainer().append(settingsHtml);
    $(document).on('click', '#objective-generate', onGenerateObjectiveClick);
    $(document).on('input', '#objective-chat-depth', onChatDepthInput);
    $(document).on('input', '#objective-check-frequency', onCheckFrequencyInput);
    $(document).on('input', '#objective-generate-frequency', onGenerateFrequencyInput);
    $(document).on('click', '#objective-hide-tasks', onHideTasksInput);
    $(document).on('click', '#objective-clear', onClearTasksClick);
    $(document).on('click', '#objective_prompt_edit', onEditPromptClick);
    $(document).on('click', '#objective-parent', onParentClick);
    $(document).on('focusout', '#objective-text', onObjectiveTextFocusOut);
    $(document).on('click', '#objectiveExtensionPopoutButton', function (e) {
        doPopout(e);
        e.stopPropagation();
    });
    $('#objective-parent').hide();
    loadSettings();

    eventSource.on(event_types.CHAT_CHANGED, () => {
        resetState();
    });
    eventSource.on(event_types.MESSAGE_SWIPED, () => {
        lastMessageWasSwipe = true;
    });
    eventSource.on(event_types.MESSAGE_RECEIVED, () => {
        if (currentChatId == undefined || jQuery.isEmptyObject(currentTask) || lastMessageWasSwipe) {
            lastMessageWasSwipe = false;
            return;
        }
        let checkForCompletion = false;
        const noCheckTypes = ['continue', 'quiet', 'impersonate'];
        const lastType = substituteParams('{{lastGenerationType}}');
        if (Number($('#objective-check-frequency').val()) > 0 && !noCheckTypes.includes(lastType)) {
            if (--checkCounter <= 0) {
                checkForCompletion = true;
                checkCounter = Number($('#objective-check-frequency').val());
            }
        }

        let generateNewTasks = false;
        if (Number($('#objective-generate-frequency').val()) > 0 && !noCheckTypes.includes(lastType)) {
            if (--generateCounter <= 0) {
                generateNewTasks = true;
                generateCounter = Number($('#objective-generate-frequency').val());
            }
        }

        const checkTaskPromise = checkForCompletion ? checkTaskCompleted() : Promise.resolve();
        const generatePromise = generateNewTasks ? generateTasks() : Promise.resolve();

        Promise.all([checkTaskPromise, generatePromise]).finally(() => {
            setCurrentTask();
            $('#objective-counter').text(checkCounter);
            $('#generate-counter').text(generateCounter);
        });
    });

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'taskcheck',
        callback: checkTaskCompleted,
        helpString: 'Checks if the current task is completed',
        returns: 'true or false',
    }));
});
