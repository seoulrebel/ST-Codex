import { Sha256 } from '@aws-crypto/sha256-browser';
import { SdkOptions } from '@spotify/web-api-ts-sdk';

export function generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

export function base64encode(input: Uint8Array): string {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

export function sha256(message: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hash = new Sha256();
    hash.update(data);
    return hash.digest();
}

// Spotify URI regex pattern
const SPOTIFY_URI_REGEX = /^spotify:(track|album|playlist|artist):([a-zA-Z0-9]{22})$/;

/**
 * Checks if a string is a valid Spotify URI
 * @param uri - The string to check
 * @returns True if the string is a valid Spotify URI
 */
export function isSpotifyUri(uri: string): boolean {
    return SPOTIFY_URI_REGEX.test(uri);
}

/**
 * Extracts the resource ID from a Spotify URI
 * @param uri - A Spotify URI in the format spotify:(type):(id)
 * @returns The extracted ID or an empty string if not a valid URI
 */
export function getIdFromSpotifyUri(uri: string): string {
    const match = uri.match(SPOTIFY_URI_REGEX);
    return match ? match[2] : '';
}

/**
 * Gets the resource type from a Spotify URI
 * @param uri - A Spotify URI in the format spotify:(type):(id)
 * @returns The resource type (track, album, playlist, artist) or null if not a valid URI
 */
export function getTypeFromSpotifyUri(uri: string): string | null {
    const match = uri.match(SPOTIFY_URI_REGEX);
    return match ? match[1] : null;
}

/**
 * Forgives JSON parsing errors by returning null instead of throwing an error.
 */
export const laxJsonConfig: SdkOptions = {
    deserializer: {
        deserialize: async <TReturnType>(response: Response): Promise<TReturnType> => {
            try {
                return await response.json();
            } catch {
                return null as TReturnType;
            }
        },
    },
};
