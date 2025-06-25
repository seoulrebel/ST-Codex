import { AccessToken } from '@spotify/web-api-ts-sdk';
import { InjectionPosition, InjectionRole, MODULE_NAME } from './constants';
import { authenticateSpotify, setUserName } from './auth';
import { syncFunctionTools, SpotifyTool } from './tools';
import { resetInject } from './prompt';
import html from './settings.html';

const { t, saveSettingsDebounced } = SillyTavern.getContext();

interface ExtensionSettingsBase {
    clientId: string;
    clientToken: AccessToken | null;
    template: string;
    position: InjectionPosition;
    role: InjectionRole;
    depth: number;
    scan: boolean;
    // Allow additional properties
    [key: string]: unknown;
}

type SpotifyToolSettings = {
    [key in SpotifyTool]: boolean;
};

export type ExtensionSettings = ExtensionSettingsBase & SpotifyToolSettings;

interface GlobalSettings {
    [MODULE_NAME]: ExtensionSettings;
}

const defaultSettings: Readonly<ExtensionSettings> = Object.freeze({
    clientId: '',
    clientToken: null,
    template: '[{{user}} is listening to {{song}} by {{artist}} on Spotify]',
    position: InjectionPosition.InChat,
    role: InjectionRole.System,
    depth: 1,
    scan: true,
    searchTracks: true,
    controlPlayback: false,
    playItem: true,
    queueTrack: false,
    getCurrentTrack: true,
    getTopTracks: false,
    getRecentTracks: false,
    getPlaylists: false,
    getPlaylistTracks: false,
});

export function getSettings(): ExtensionSettings {
    const context = SillyTavern.getContext();
    const globalSettings = context.extensionSettings as object as GlobalSettings;

    // Initialize settings if they don't exist
    if (!globalSettings[MODULE_NAME]) {
        globalSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }

    // Ensure all default keys exist (helpful after updates)
    for (const key in defaultSettings) {
        if (globalSettings[MODULE_NAME][key] === undefined) {
            globalSettings[MODULE_NAME][key] = defaultSettings[key];
        }
    }

    return globalSettings[MODULE_NAME];
}

export function addSettingsControls(settings: ExtensionSettings): void {

    const settingsContainer = document.getElementById('spotify_container') ?? document.getElementById('extensions_settings2');
    if (!settingsContainer) {
        return;
    }

    const renderer = document.createElement('template');
    renderer.innerHTML = html;

    settingsContainer.appendChild(renderer.content);

    // Setup UI elements
    const elements = {
        clientId: document.getElementById('spotify_client_id') as HTMLInputElement,
        template: document.getElementById('spotify_template') as HTMLTextAreaElement,
        role: document.getElementById('spotify_role') as HTMLSelectElement,
        position: Array.from(document.getElementsByName('spotify_position')) as HTMLInputElement[],
        depth: document.getElementById('spotify_depth') as HTMLInputElement,
        scan: document.getElementById('spotify_scan') as HTMLInputElement,
        authButton: document.getElementById('spotify_auth') as HTMLDivElement,
        logoutButton: document.getElementById('spotify_logout') as HTMLDivElement,
        tools: {
            searchTracks: document.getElementById('spotify_tool_search_tracks') as HTMLInputElement,
            controlPlayback: document.getElementById('spotify_tool_control_playback') as HTMLInputElement,
            playItem: document.getElementById('spotify_tool_play_item') as HTMLInputElement,
            queueTrack: document.getElementById('spotify_tool_queue_track') as HTMLInputElement,
            getCurrentTrack: document.getElementById('spotify_tool_get_current_track') as HTMLInputElement,
            getTopTracks: document.getElementById('spotify_tool_get_top_tracks') as HTMLInputElement,
            getRecentTracks: document.getElementById('spotify_tool_get_recent_tracks') as HTMLInputElement,
            getPlaylists: document.getElementById('spotify_tool_get_playlists') as HTMLInputElement,
            getPlaylistTracks: document.getElementById('spotify_tool_get_playlist_tracks') as HTMLInputElement,
        },
    };

    // Initialize UI with current settings
    elements.clientId.value = settings.clientId;
    elements.template.value = settings.template;
    elements.role.value = settings.role.toString();
    elements.position.forEach((radio) => {
        radio.checked = settings.position === parseInt(radio.value);
    });
    elements.depth.value = settings.depth.toString();
    elements.scan.checked = settings.scan;
    elements.tools.searchTracks.checked = settings.searchTracks;
    elements.tools.controlPlayback.checked = settings.controlPlayback;
    elements.tools.playItem.checked = settings.playItem;
    elements.tools.queueTrack.checked = settings.queueTrack;
    elements.tools.getCurrentTrack.checked = settings.getCurrentTrack;
    elements.tools.getTopTracks.checked = settings.getTopTracks;
    elements.tools.getRecentTracks.checked = settings.getRecentTracks;
    elements.tools.getPlaylists.checked = settings.getPlaylists;
    elements.tools.getPlaylistTracks.checked = settings.getPlaylistTracks;

    // Define a generic handler for simple input changes
    const handleInputChange = <T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        element: T,
        settingKey: keyof ExtensionSettings,
        transform?: (value: string | boolean) => number | string | boolean,
        callback?: () => void,
    ) => {
        element.addEventListener('input', () => {
            const value = element instanceof HTMLInputElement && element.type === 'checkbox'
                ? element.checked
                : element.value;
            settings[settingKey] = transform ? transform(value) : value;
            if (callback) {
                callback();
            }
            saveSettingsDebounced();
        });
    };

    // Set up event listeners
    handleInputChange(elements.clientId, 'clientId', value => value);
    handleInputChange(elements.template, 'template', value => value, resetInject);
    handleInputChange(elements.role, 'role', value => parseInt(value as string), resetInject);
    handleInputChange(elements.depth, 'depth', value => parseInt(value as string), resetInject);
    handleInputChange(elements.scan, 'scan', value => value, resetInject);
    handleInputChange(elements.tools.searchTracks, 'searchTracks', value => value, syncFunctionTools);
    handleInputChange(elements.tools.controlPlayback, 'controlPlayback', value => value, syncFunctionTools);
    handleInputChange(elements.tools.playItem, 'playItem', value => value, syncFunctionTools);
    handleInputChange(elements.tools.queueTrack, 'queueTrack', value => value, syncFunctionTools);
    handleInputChange(elements.tools.getCurrentTrack, 'getCurrentTrack', value => value, syncFunctionTools);
    handleInputChange(elements.tools.getTopTracks, 'getTopTracks', value => value, syncFunctionTools);
    handleInputChange(elements.tools.getRecentTracks, 'getRecentTracks', value => value, syncFunctionTools);
    handleInputChange(elements.tools.getPlaylists, 'getPlaylists', value => value, syncFunctionTools);
    handleInputChange(elements.tools.getPlaylistTracks, 'getPlaylistTracks', value => value, syncFunctionTools);

    // Handle radio buttons separately
    elements.position.forEach((radio) => {
        radio.addEventListener('input', (e) => {
            settings.position = parseInt((e.target as HTMLInputElement).value);
            saveSettingsDebounced();
        });
    });

    // Auth buttons
    elements.authButton.addEventListener('click', () => {
        authenticateSpotify();
    });

    elements.logoutButton.addEventListener('click', () => {
        settings.clientToken = null;
        setUserName(t`[Not logged in]`);
        saveSettingsDebounced();
    });
}
