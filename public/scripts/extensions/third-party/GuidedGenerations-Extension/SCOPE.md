# SillyTavern Guided Generations Extension - Scope Definition

## Introduction

This document outlines the scope of the SillyTavern extension based on the functionality observed in the "Guided Generations V8" Quick Reply (QR) set. The goal of the extension is to replicate the features of this QR set within the SillyTavern extension framework, providing a more integrated user experience.

## Core Features from QR Set

The extension should aim to implement the following core functionalities:

1.  **Guided Response Generation:**
    *   **Goal:** Allow users to provide instructions/guidance in the input field, which directs the AI's next generated message.
    *   **QR Logic Summary:**
        *   Temporarily store the user's original input.
        *   Inject the provided guidance into the chat context for the AI (e.g., using `inject id=instruct`).
        *   Trigger the AI to generate a new response.
        *   Restore the user's original input to the input field.
        *   Handle group chats by allowing the user to select target members for the guided response.
        *   Integrate with System features (Clothes, State, Thinking) if they are enabled.

2.  **Guided Swipe Generation:**
    *   **Goal:** Allow users to provide instructions/guidance to generate a new AI message *swipe*.
    *   **QR Logic Summary:**
        *   Inject the provided guidance.
        *   Trigger a new swipe (`/swipes-swipe`).
        *   Should only be active/available if the last message is from the AI.

3.  **Guided Impersonation:**
    *   **Goal:** Allow users to write a brief outline and have the AI expand it into a full message, written from the user's perspective.
    *   **QR Logic Summary:**
        *   Provide options for first-person, second-person, and third-person perspectives.
        *   Use the `/impersonate` command with appropriate instructions.
        *   Temporarily store the user's outline.
        *   Include logic to prevent re-triggering if the input text hasn't changed since the last impersonation.
        *   Allow toggling the visibility of 2nd/3rd person options (potentially via settings).

4.  **Settings Management:**
    *   **Goal:** Provide a user interface to configure the extension's behavior, mirroring the QR Settings.
    *   **QR Logic Summary:**
        *   Allow toggling the automatic triggering of "System" features (Clothes, State, Thinking).
        *   Allow toggling the visibility/availability of the different impersonation modes (1st, 2nd, 3rd person).
        *   Use buttons or similar UI elements for configuration.

5.  **System Features (Auto-Triggers):**
    *   **Goal:** Implement the underlying logic for automatic context injection based on settings (Clothes, State, Thinking).
    *   **QR Logic Summary:** These seem to be background functions triggered conditionally (likely by the main Guided Response feature) to inject specific guidance automatically if enabled in settings. The exact content/logic needs further definition if not fully clear from the QR set.
    *   **Refined Understanding:** These are specific *types* of Persistent Guides (`SysClothes`, `SysState`, `SysThinking`) that generate context about character appearance, physical state, and internal thoughts, respectively. They use `/gen` and inject with IDs `clothes`, `state`, and `thinking`. They can be triggered automatically (if enabled in Settings) or manually via the Persistent Guides menu. They temporarily switch to a specific preset (`GGSytemPrompt`) for generation.

6.  **Persistent Guides Management:**
    *   **Goal:** Provide a central hub for creating, viewing, editing, and deleting various types of persistent contextual guides injected into the chat to influence AI behavior over multiple turns.
    *   **QR Logic Summary (Main Menu - 🤔Persistant Guides):**
        *   Presents a button-based menu for managing guides.
        *   **Situational Guides (CoT Light):** Generates context from chat history/description (using `/gen`), potentially focused by user input, and injects it (ID: `situation`).
        *   **Thinking Guide:** Triggers the `SysThinking` QR to generate and inject character thoughts (ID: `thinking`).
        *   **Clothes Guide:** Triggers the `SysClothes` QR to generate and inject character appearance (ID: `clothes`).
        *   **State Guide:** Triggers the `SysState` QR to generate and inject character physical state (ID: `state`).
        *   **Rules Guide:** Generates/updates a list of explicit in-story rules learned by characters (using `/gen` and temporary preset `GGSytemPrompt`), injecting/updating the `rule_guide` ID.
        *   **Custom Guide:** Allows direct user input via a large text box (`/input`) and injects it with the ID `Custom`. Shows existing guide content for editing.
        *   **Edit Guides:** Lists active guides (`/listinjects`), allows selection, presents content in an editor (`/input`), and re-injects the modified guide under its original ID.
        *   **Show Guides:** Displays all active guide injections in a popup (`/listinjects return=popup-html`).
        *   **Flush Guides:** Lists active guides, allows selection (including "All"), and removes the chosen guide(s) using `/flushinjects`.

7.  **Input Recovery:**
    *   **Goal:** Provide a simple way for the user to recover their original input text after using a guided generation/impersonation feature.
    *   **QR Logic Summary:** Restore a previously saved version of the input field content (`{{getglobalvar::old_input}}`).

8.  **Simple Send:**
    *   **Goal:** Basic functionality to send the current input as a message.
    *   **QR Logic Summary:** Equivalent to the standard send button but potentially used in QR chains.

## Documentation

- Internal code documentation and explanations can be found in [`JSDoc.md`](./JSDoc.md).

## Overall Goal

The extension should provide these guided generation and impersonation tools seamlessly within the SillyTavern UI, likely through dedicated buttons or context menu options, replacing the need for the original QR set while maintaining its established functionalities.
