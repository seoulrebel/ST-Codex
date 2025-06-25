/* eslint-disable no-unused-vars */
import { eventSource, event_types } from '../../../../script.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from '../../../slash-commands/SlashCommandArgument.js';
import { SlashCommandClosure } from '../../../slash-commands/SlashCommandClosure.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommandScope } from '../../../slash-commands/SlashCommandScope.js';

const listeners = new Map();

/**
 * Finds an event ID by name.
 * @param {string} event Event name
 * @returns {string} Event ID
 */
function findEventId(event) {
    return Object.entries(event_types).find(([key, value]) => value.toLowerCase() === event || key.toLowerCase() === event)?.[1];
}

/**
 * Assigns nested variables to a scope.
 * @param {SlashCommandScope} scope Scope to assign variables to.
 * @param {object} arg Object to assign variables from.
 * @param {string} prefix Prefix for the variable names.
 */
function assignNestedVariables(scope, arg, prefix) {
    Object.entries(arg).forEach(([key, value]) => {
        const newPrefix = `${prefix}.${key}`;
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                value.forEach((item, i) => {
                    assignNestedVariables(scope, { [i]: item }, newPrefix);
                });
            } else {
                assignNestedVariables(scope, value, newPrefix);
            }
        } else {
            scope.letVariable(newPrefix, String(value));
        }
    });
}

/**
 * Makes a listener for a closure.
 * @param {SlashCommandClosure} closure Closure to make a listener for.
 * @returns {{listener: function, id: string}} Object with listener and ID.
 */
function makeListener(closure) {
    const id = Math.random().toString(36).substring(2);
    const originalScope = closure.scope.getCopy();
    const listener = (...args) => {
        const scope = originalScope.getCopy();
        args.forEach((arg, index) => {
            if (arg === null || arg === undefined) return;
            scope.letVariable(`arg${index}`, String(arg));

            if (typeof arg === 'object' && arg !== null) {
                if (Array.isArray(arg)) {
                    arg.forEach((item, i) => {
                        assignNestedVariables(scope, { [i]: item }, `arg${index}`);
                    });
                } else {
                    assignNestedVariables(scope, arg, `arg${index}`);
                }
            }
        });

        closure.scope = scope;
        return closure.execute();
    };
    listeners.set(id, listener);
    return { listener, id };
}

function validateAndPrepareEvent(args, closure) {
    if (Array.isArray(closure)) {
        closure = closure.find((c) => c instanceof SlashCommandClosure);
    }

    if (!(closure instanceof SlashCommandClosure)) {
        toastr.error('Callback is not a closure.');
        return null;
    }

    const event = String(args.event).trim().toLowerCase();

    if (!event) {
        toastr.warning('Event name is required.');
        return null;
    }

    const eventId = findEventId(event);

    if (!eventId) {
        toastr.warning(`Event ${event} not found.`);
        return null;
    }

    const { listener, id } = makeListener(closure);
    return { eventId, listener, id };
}

function eventOn(args, closure) {
    const eventDetails = validateAndPrepareEvent(args, closure);
    if (!eventDetails) return '';
    eventSource.on(eventDetails.eventId, eventDetails.listener);
    return eventDetails.id;
}

function eventOnce(args, closure) {
    const eventDetails = validateAndPrepareEvent(args, closure);
    if (!eventDetails) return '';
    eventSource.once(eventDetails.eventId, eventDetails.listener);
    return eventDetails.id;
}

function eventOff(_, value) {
    const id = String(value).trim();
    const listener = listeners.get(id);
    if (!listener) {
        toastr.warning(`Listener with ID ${id} not found.`);
        return '';
    }

    // Need to iterate because we don't save the event name in the listener
    for (const [event, handlersList] of Object.entries(eventSource.events)) {
        if (Array.isArray(handlersList)) {
            const index = handlersList.indexOf(listener);
            if (index !== -1) {
                eventSource.removeListener(event, listener);
                break;
            }
        }
    }

    listeners.delete(id);
    return '';
}

(function init() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'event-on',
        helpString: `
        <div>Sets up an event listener for a known event. Returns an event listener ID to use with <code>/event-off</code>.</div>
        <div>Use <code>/var arg#</code> in the closure code to access the event arguments, where # is an index of the argument (usually 0).<br>For objects, use <code>/var arg#.key</code>.</div>
        <div>Example:</div><ul><li>Output a chat name: <code>/event-on event=CHAT_CHANGED {: /var arg0 | /echo :}</code></li></ul></div>`,
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Event callback closure',
                isRequired: true,
                acceptsMultiple: false,
                typeList: ARGUMENT_TYPE.CLOSURE,
            }),
        ],
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'event',
                description: 'Event name',
                typeList: ARGUMENT_TYPE.STRING,
                isRequired: true,
                acceptsMultiple: false,
                enumList: Object.keys(event_types),
            }),
        ],
        callback: eventOn,
        returns: 'listener ID',
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'event-once',
        helpString: `
        <div>Sets up an event listener for a known event that will be removed after the first call. Returns an event listener ID to use with <code>/event-off</code>.</div>
        <div>Use <code>/var arg#</code> in the closure code to access the event arguments, where # is an index of the argument (usually 0).<br>For objects, use <code>/var arg#.key</code>.</div>
        <div>Example:</div><ul><li>Output a chat name: <code>/event-once event=CHAT_CHANGED {: /var arg0 | /echo :}</code></li></ul></div>`,
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Event callback closure',
                isRequired: true,
                acceptsMultiple: false,
                typeList: ARGUMENT_TYPE.CLOSURE,
            }),
        ],
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'event',
                description: 'Event name',
                typeList: ARGUMENT_TYPE.STRING,
                isRequired: true,
                acceptsMultiple: false,
                enumList: Object.keys(event_types),
            }),
        ],
        callback: eventOnce,
        returns: 'listener ID',
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'event-off',
        helpString: '<div>Removes an event listener by ID.</div>',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'listener ID',
                typeList: ARGUMENT_TYPE.STRING,
                isRequired: true,
                acceptsMultiple: false,
            }),
        ],
        callback: eventOff,
    }));
})();
