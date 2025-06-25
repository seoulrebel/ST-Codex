// d:\Windsurf\Guided Generations Extension\scripts\ui\versionNotificationPopup.js

/**
 * Version Notification Popup - Handles displaying a custom modal for extension updates.
 */

const POPUP_ID = 'gg-version-notification-popup';
let popupElement = null;
let resolvePromise = null;

function createPopupHTML(title, message) {
    return `
        <div id="${POPUP_ID}" class="gg-popup" style="display: none; z-index: 1005;">
            <div class="gg-popup-content" style="max-width: 500px;">
                <div class="gg-popup-header">
                    <h2 id="${POPUP_ID}-title">${title}</h2>
                </div>
                <div class="gg-popup-body">
                    <p id="${POPUP_ID}-message" style="white-space: pre-wrap;">${message}</p>
                </div>
                <div class="gg-popup-footer" style="display: flex; justify-content: flex-end;">
                    <button id="${POPUP_ID}-show-later" class="gg-button gg-button-secondary" style="margin-right: 10px;">Show Again Later</button>
                    <button id="${POPUP_ID}-acknowledge" class="gg-button gg-button-primary">Acknowledge</button>
                </div>
            </div>
        </div>
    `;
}

function acknowledge() {
    hide();
    if (resolvePromise) {
        resolvePromise(true);
        resolvePromise = null;
    }
}

function showAgainLater() {
    hide();
    if (resolvePromise) {
        resolvePromise(false);
        resolvePromise = null;
    }
}

function hide() {
    if (popupElement) {
        popupElement.style.display = 'none';
        const acknowledgeButton = popupElement.querySelector(`#${POPUP_ID}-acknowledge`);
        const showLaterButton = popupElement.querySelector(`#${POPUP_ID}-show-later`);
        if (acknowledgeButton) acknowledgeButton.removeEventListener('click', acknowledge);
        if (showLaterButton) showLaterButton.removeEventListener('click', showAgainLater);
    }
}

export function showVersionNotification(title, messageContent) {
    return new Promise((resolve) => {
        resolvePromise = resolve;

        popupElement = document.getElementById(POPUP_ID);
        if (!popupElement) {
            document.body.insertAdjacentHTML('beforeend', createPopupHTML(title, messageContent));
            popupElement = document.getElementById(POPUP_ID);
        } else {
            // Update content if popup already exists
            const titleEl = popupElement.querySelector(`#${POPUP_ID}-title`);
            const messageEl = popupElement.querySelector(`#${POPUP_ID}-message`);
            if (titleEl) titleEl.textContent = title;
            if (messageEl) messageEl.textContent = messageContent;
        }

        if (popupElement) {
            const acknowledgeButton = popupElement.querySelector(`#${POPUP_ID}-acknowledge`);
            const showLaterButton = popupElement.querySelector(`#${POPUP_ID}-show-later`);

            acknowledgeButton.addEventListener('click', acknowledge);
            showLaterButton.addEventListener('click', showAgainLater);

            popupElement.style.display = 'flex'; // Use flex to center like other popups
        }
    });
}
