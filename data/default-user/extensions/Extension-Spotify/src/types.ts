export interface TrackViewModel {
    uri: string;
    name: string;
    artist_uri: string | string[];
    artist: string | string[];
    album_uri: string;
    album: string;
    release_date: string;
}

export interface PlaylistViewModel {
    uri: string;
    name: string;
    description: string;
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';
