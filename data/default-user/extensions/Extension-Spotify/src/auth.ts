import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { getSettings, ExtensionSettings } from './settings';
import { generateRandomString, sha256, base64encode } from './util';
import { SPOTIFY_SCOPES, VERIFIER_KEY } from './constants';

const { t, saveSettingsDebounced } = SillyTavern.getContext();

export async function authenticateSpotify(): Promise<void> {
    const settings = getSettings();

    if (!settings.clientId) {
        toastr.error(t`Please enter your Spotify Client ID in the settings.`);
        return;
    }

    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);
    const redirectUri = new URL('/callback/spotify', location.origin);
    const params = {
        response_type: 'code',
        client_id: settings.clientId,
        scope: SPOTIFY_SCOPES.join(' '),
        redirect_uri: redirectUri.toString(),
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
    };

    sessionStorage.setItem(VERIFIER_KEY, codeVerifier);
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.search = new URLSearchParams(params).toString();
    window.location.href = authUrl.toString();
}

function readCode(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source');
    if (source !== 'spotify') {
        return null;
    }
    const query = urlParams.get('query');
    if (query) {
        const params = new URLSearchParams(query);
        const code = params.get('code');
        window.history.replaceState({}, document.title, window.location.pathname);
        return code;
    }
    return null;
}

export async function tryGetClientToken(settings: ExtensionSettings): Promise<void> {
    const code = readCode();
    const codeVerifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!code || !codeVerifier || !settings.clientId) {
        return;
    }

    const url = 'https://accounts.spotify.com/api/token';
    const redirectUri = new URL('/callback/spotify', window.location.origin);
    const payload = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: settings.clientId,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri.toString(),
            code_verifier: codeVerifier,
            code,
        }),
    };

    try {
        const body = await fetch(url, payload);
        const token = await body.json();

        settings.clientToken = token;
        sessionStorage.removeItem(VERIFIER_KEY);
        saveSettingsDebounced();

        console.log('Spotify token received:', token);
        toastr.success(t`Successfully authenticated with Spotify!`);
    } catch (error) {
        console.error('Error during Spotify authentication:', error);
        toastr.error(t`Spotify authentication failed. Please try again.`);
    }
}

export async function refreshTokenIfNeeded(settings: ExtensionSettings): Promise<void> {
    if (!settings.clientToken || !settings.clientId) {
        return;
    }

    const tokenExpiration = settings.clientToken.expires;
    const refreshToken = settings.clientToken.refresh_token;
    const currentTime = Date.now();
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes

    if (tokenExpiration && (tokenExpiration - currentTime) < refreshThreshold) {
        const url = 'https://accounts.spotify.com/api/token';
        const payload = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: settings.clientId,
            }),
        };

        try {
            const body = await fetch(url, payload);
            const token = await body.json();
            settings.clientToken = token;
            // When a refresh token is not returned, continue using the existing token.
            if (settings.clientToken && !token.refresh_token) {
                settings.clientToken.refresh_token = refreshToken;
            }
            console.log('Spotify token refreshed:', token);
            saveSettingsDebounced();
        } catch (error) {
            console.error('Error refreshing Spotify token:', error);
        }
    }
}

export function setUserName(name: string): void {
    const userName = document.getElementById('spotify_user_name') as HTMLSpanElement;
    if (userName) {
        userName.innerText = name;
    }
}

export async function tryReadClientData(settings: ExtensionSettings): Promise<void> {
    if (!settings.clientToken || !settings.clientId) {
        setUserName(t`[Not logged in]`);
        return;
    }

    try {
        const api = SpotifyApi.withAccessToken(settings.clientId, settings.clientToken);
        const user = await api.currentUser.profile();
        setUserName(user.display_name || user.id);
    } catch (error) {
        console.error('Error fetching user data:', error);
        settings.clientToken = null;
        setUserName('[Token expired]');
    }
}
