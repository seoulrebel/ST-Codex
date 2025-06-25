export enum InjectionPosition {
    None = -1,
    AfterPrompt = 0,
    InChat = 1,
    BeforePrompt = 2,
}

export enum InjectionRole {
    System = 0,
    User = 1,
    Assistant = 2,
}

export const MODULE_NAME = 'spotify';
export const INJECT_ID = 'spotify_inject';
export const VERIFIER_KEY = 'spotify_verifier';

export const SPOTIFY_SCOPES = [
    'user-read-private',
    'user-read-playback-state',
    'user-top-read',
    'user-modify-playback-state',
    'playlist-read-private',
];
