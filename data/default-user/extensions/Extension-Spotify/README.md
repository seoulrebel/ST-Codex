# Spotify Extension for SillyTavern

Provides function tools and information about the currently playing song on Spotify in SillyTavern prompts.

## Installation

Requires the latest SillyTavern staging branch for the auth flow to function.

Install via the extension installed using the following URL:

```txt
https://github.com/SillyTavern/Extension-Spotify
```

## Usage

> **Requires to register an application on the Spotify developer dashboard and provide the client ID in the extension settings.**

### Register an app

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and log in with your Spotify account.
2. Press "Create app" in the top right corner of the dashboard.
3. Fill in the required fields:
    - App name (e.g. "SillyTavern Extension")
    - App description (e.g. "SillyTavern Spotify Extension")
    - Redirect URIs (see below)
4. Check "Web API" in the "Which API/SDKs are you planning to use?" section.
5. Accept the terms and conditions.
6. Press "Save".

### Redirect URIs

The redirect URI **must** correspond to the URL you access SillyTavern on, plus the `/callback/spotify` suffix. For example, if you access SillyTavern via `http://127.0.0.1:8000`, the redirect URI should be: `http://127.0.0.1:8000/callback/spotify`

Other examples:

- `http://localhost:8000/callback/spotify`
- `https://myhost.mydomain.local/callback/spotify`

> **Don't forget to click "Add" after entering the redirect URI.**

### Client ID

1. Go to the "Settings" tab of your app.
2. Copy the "Client ID" and paste it into the extension settings in SillyTavern.
3. Press "Authenticate". You'll be redirected to the Spotify login page.
4. Log in to your Spotify account and authorize the app.
5. After authorization, you'll be redirected to the SillyTavern page with a success message.
6. If you want to log out, you can do so by clicking the "Logout" button in the extension settings.

## Configuration

After performing the initial setup, the extension will now be able to access your Spotify account and provide information about the currently playing song. You can configure the extension, including the injection template, role, position and depth.

### Template macros

Apart from the usual SillyTavern macros, the template field also supports the following additional parameters:

- `{{song}}`: The name of the song.
- `{{artist}}`: The name of the artist.
- `{{album}}`: The name of the album.
- `{{year}}`: The URL of the album cover.

Example:

```txt
{{user}} is listening to {{song}} by {{artist}} from the album {{album}} ({{year}}).
```

### Function tools

The extension provides [function tools](https://docs.sillytavern.app/for-contributors/function-calling/) for supported APIs. The following functions are available (can be toggled individually in the extension settings):

1. "Search Tracks": Search for tracks by name, artist or album.
2. "Play Item": Play a track, album, artist, or playlist.
3. "Queue Track": Add a track to the queue.
4. "Control Playback": Pause, resume, skip to the next track or the previous track.
5. "Get Current Track": Get a track that is currently playing.
6. "Get Top Tracks": Get top tracks of the user.
7. "Get Recent Tracks": Get recently played tracks.
8. "Get User Playlists": Get playlists of the user.
9. "Get Playlist Tracks": Get a list of tracks from a playlist.

> "Search Tracks", "Play Item" and "Get Current Track" are enabled by default. The rest are disabled by default.

## Contributing

To build the extension, run the following command in the root directory of the extension:

```bash
npm install
npm run build
```

**Create an issue** if you have ideas for new function tools.
**Create a pull request** if you want to contribute to the extension.

## License

AGPL-3.0. See [LICENSE](LICENSE) for more details.
