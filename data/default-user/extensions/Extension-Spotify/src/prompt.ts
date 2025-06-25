import { SpotifyApi, Track, Episode } from '@spotify/web-api-ts-sdk';
import { INJECT_ID, InjectionPosition } from './constants';
import { getSettings } from './settings';
import { refreshTokenIfNeeded } from './auth';

const { setExtensionPrompt, substituteParamsExtended } = SillyTavern.getContext();

export function resetInject() {
    // Reset the prompt to avoid showing old data
    setExtensionPrompt(INJECT_ID, '', InjectionPosition.None, 0);
}

export async function setCurrentTrack(): Promise<void> {
    resetInject();

    const settings = getSettings();
    if (!settings.clientToken || !settings.clientId || !settings.template || settings.position === InjectionPosition.None) {
        return;
    }

    try {
        await refreshTokenIfNeeded(settings);
        const api = SpotifyApi.withAccessToken(settings.clientId, settings.clientToken);
        const currentlyPlaying = await api.player.getCurrentlyPlayingTrack();
        console.log('Currently playing Spotify track:', currentlyPlaying);
        const params = getPromptParams(currentlyPlaying.item);
        const message = substituteParamsExtended(settings.template, params);
        setExtensionPrompt(INJECT_ID, message, settings.position, settings.depth, settings.scan, settings.role);
    } catch (error) {
        console.error('Error fetching currently playing track:', error);
    }
}

function getPromptParams(value: Track | Episode): Record<string, string> {
    if (!value) {
        return {};
    }
    switch (value.type) {
        case 'track': {
            const track = value as Track;
            return {
                song: track.name,
                artist: track.artists.map(a => a.name)?.join(', '),
                album: track.album.name,
                year: track.album.release_date.split('-')[0],
            };
        };
        case 'show': {
            const episode = value as Episode;
            return {
                song: episode.name,
                artist: episode.show.name,
            };
        };
    }
    return {};
}
