# Guided Generations Extension - Code Documentation

This document provides an overview of the JavaScript code structure and functions used in the Guided Generations extension.

## `index.js`

Main entry point for the Guided Generations extension. Initializes the extension, adds UI elements (buttons), and loads settings. Imports button functionality from the `/scripts/` directory.

### Constants

*   `EXTENSION_NAME`: (string) Extension name for logging.
*   `defaultSettings`: (GuidedGenerationsSettings) Default settings for the extension.

### Type Definitions

*   `GuidedGenerationsSettings`: 
    *   `isEnabled`: (boolean) Whether the extension is active and UI elements should be added.

### State Variables

*   `settings`: (GuidedGenerationsSettings) Current settings, loaded from storage or defaults.

### Functions

*   `loadSettings()`
    *   Loads extension settings.
*   `init()`
    *   Initializes the extension.
    *   Loads settings and sets up a MutationObserver to add UI elements when the DOM is ready.
*   `addExtensionButtons()`
    *   Adds the extension buttons to the SillyTavern UI.
    *   **Left Side Menu (Gear Icon):** Creates a gear icon button (`#gg-menu-button`) in `#leftSendForm` (next to the main extensions wand).
        *   This button toggles a popup menu (`#gg-tools-menu`).
        *   Items added to this menu:
            *   Simple Send (`#gg-simple-send-action`)
            *   Recover Input (`#gg-recover-action`)
            *   Corrections (`#gg-corrections-action`)
            *   Spellchecker (`#gg-spellchecker-action`)
    *   **Right Side Buttons:** Creates individual action buttons next to the main send button (`#send_but`) in `#rightSendForm`.
        *   Buttons added (in order before send button): Guided Response (🦮), Guided Swipe (👈), Guided Impersonate (👤)
    *   Attaches event listeners to trigger the corresponding imported functions.
    *   Ensures buttons/menus are not added multiple times.

### Initialization

*   Uses jQuery's `$(document).ready()` to ensure the DOM is loaded before calling `init()`.
*   `init()` uses a `MutationObserver` watching `document.body` to detect when `#rightSendForm`, `#extensions_menu`, and `#send_but` are present before calling `addExtensionButtons()`.

---

## `/scripts/simpleSend.js`

Contains the logic for the Simple Send button.

### Functions

*   `simpleSend()`
    *   Sends the current text in the input box as a message without generating an AI reply.
    *   Saves the current input using the shared JavaScript state function `setPreviousImpersonateInput`.
    *   Uses the stscript command: `/send {{input}} | /setinput`

---

## `/scripts/inputRecovery.js`

Contains the logic for the Input Recovery button.

### Functions

*   `recoverInput()`
    *   Recovers the previously stored input (retrieved via the shared JavaScript state function `getPreviousImpersonateInput`).
    *   Places the recovered text directly into the main chat input field using JavaScript (`textarea.value = ...`).
    *   No longer uses STscript.

---

## `/scripts/guidedResponse.js`

Contains the logic for the Guided Response button.

### Functions

*   `guidedResponse()`
    *   Handles the Guided Response action:
        1.  Saves the current input using the shared JavaScript state function `setPreviousImpersonateInput`.
        2.  Executes STscript to inject context and trigger an AI generation (`/inject`, `/trigger await=true`).
        3.  Uses a `finally` block to ensure the original input is always restored directly to the textarea using JavaScript (`textarea.value = ...`) after the script execution (or if an error occurs).
        4.  No longer uses `gg_old_input` STscript variable for restoration.

---

## `/scripts/guidedSwipe.js`

Contains the logic for the Guided Swipe button.

### Functions

*   `guidedSwipe()`
    *   Handles the Guided Swipe action:
        1.  Saves the current input using the shared JavaScript state function `setPreviousImpersonateInput`.
        2.  Executes the STscript command `/swipe`.
        3.  Uses a `finally` block to ensure the original input is always restored directly to the textarea using JavaScript (`textarea.value = ...`) after the swipe command executes (or if an error occurs).
        4.  No longer uses `gg_old_input` STscript variable for restoration.

---

## `/scripts/guidedImpersonate.js`

Contains the logic for the Guided Impersonate button.

### Functions

*   `guidedImpersonate()`
    *   Handles the Guided Impersonate action (first person):
        1.  Checks if the current input matches the result of the last impersonation (stored in shared JS state `lastImpersonateResult`). If it does, restores the input from *before* that last impersonation (using `getPreviousImpersonateInput`) directly via JavaScript.
        2.  If not restoring, saves the current input using `setPreviousImpersonateInput`.
        3.  Executes the STscript command `/impersonate await=true ...`.
        4.  After successful execution, stores the newly generated text in the shared JS state `lastImpersonateResult`.
        5.  No longer uses `gg_old_input` STscript variable.

---

## `/scripts/tools/corrections.js`

Contains the logic for the Corrections tool, accessed via the tools menu (Gear Icon).

### Functions

*   `corrections()`
    *   Provides a way to modify the last AI message based on user instructions provided in the input field.
    *   Saves the user's instruction input using the shared JavaScript state function `setPreviousImpersonateInput`.
    *   Optionally switches ST presets (if `useGGSytemPreset` setting is true) using STscript.
    *   Injects the last AI message and the user's instructions as ephemeral context using STscript (`/inject`).
    *   Uses complex JavaScript/jQuery logic (copied from `guidedSwipe.js`) to navigate to the last swipe of the previous message and trigger a new generation by simulating a click on the swipe button.
    *   Restores the original ST preset (if changed) using STscript in a `finally` block.

---

## `/scripts/tools/spellchecker.js`

Contains the logic for the Spellchecker tool, accessed via the tools menu (Gear Icon).

### Functions

*   `spellchecker()`
    *   Corrects grammar, punctuation, and flow of the text currently in the input field.
    *   Saves the current input using the shared JavaScript state function `setPreviousImpersonateInput` (mainly for consistency, as the input is overwritten).
    *   Optionally switches ST presets (if `useGGSytemPreset` setting is true) using STscript.
    *   Uses the STscript command `/genraw ... {{input}} |` to generate the corrected text based on the current input.
    *   Uses the STscript command `/setinput {{pipe}} |` to replace the content of the input field with the generated correction.
    *   Restores the original ST preset (if changed) using STscript.

---

## Executing STscript Commands

To interact with SillyTavern's core functionality like sending messages, swiping, setting input, managing context, or using global variables from within extension JavaScript code, you should use STscript slash commands.

The standard way to execute these commands is via the SillyTavern context object:

1.  **Get the Context:** Use `const context = SillyTavern.getContext();` or `import { getContext } from '../../../../extensions.js'; const context = getContext();`.
2.  **Execute Command:** Call the `executeSlashCommandsWithOptions(commandString)` method on the context object. This method can handle single commands (e.g., `/send Hello`) or multiple commands chained with `|` (e.g., `/setglobalvar key=x {{input}} | /send {{getglobalvar::x}}`).

**Example (Saving/Restoring Global Variable - Still used for presets etc.):**

```javascript
import { getContext } from '../../../../extensions.js';

async function setAndRestoreInput() {
    const inputElement = document.getElementById('send_textarea');
    const currentInput = inputElement ? inputElement.value : '';
    const escapedInput = currentInput.replace(/\|/g, '\\|'); // Escape pipe characters

    const commandSave = `/setglobalvar key=my_saved_var ${escapedInput}`; // Example using a global variable
    const commandRestore = `/setinput {{getglobalvar::my_saved_var}}`;

    try {
        const context = getContext(); // Or SillyTavern.getContext();

        // Check if the method exists before calling
        if (typeof context.executeSlashCommandsWithOptions === 'function') {
            // Save the input
            await context.executeSlashCommandsWithOptions(commandSave);
            console.log("Input saved.");

            // Do other stuff...

            // Restore the input
            await context.executeSlashCommandsWithOptions(commandRestore);
            console.log("Input restored.");
        } else {
            console.error("context.executeSlashCommandsWithOptions not found!");
        }
    } catch (error) {
        console.error("Error executing STScript:", error);
    }
}

*   Note: While the example above uses `/setglobalvar` for saving/restoring input, the core Guided Generation buttons (Response, Swipe, Impersonate, SimpleSend, InputRecovery) have been refactored to use **JavaScript shared state** (`setPreviousImpersonateInput`, `getPreviousImpersonateInput` defined in `index.js`) for managing the user's input before/after actions, rather than the STscript global variable `gg_old_input`. Global variables are still used for other purposes like managing presets.
*   Always check if `SillyTavern.getContext` and `context.executeSlashCommandsWithOptions` exist before calling them to avoid errors if the SillyTavern version changes or the extension loads unexpectedly.
*   Escape special characters (like `|`) within user input (`{{input}}`) if inserting it directly into a command string to prevent parsing issues. Using `/setglobalvar` to store complex input first, then referencing it with `{{getglobalvar::key}}` can help.
*   The `executeSlashCommandsWithOptions` function might be asynchronous, so using `await` is recommended if you need subsequent actions to wait for the command to complete (though the exact behavior might depend on the specific STscript command being run).
*   **CRITICAL**: In STScript, EVERY line must end with a pipe character `|`, including comments! For example:
    ```
    // This is a comment and needs a pipe |
    /echo This is a command | /setvar key=test Hello | 
    ```
    Failing to end comments with a pipe character will cause the script to break, as the STScript parser treats every line as a command that must end with the pipe delimiter.

---

### `guidedResponse()`
{{ ... }}
    }
}
