import { tryGetClientToken, tryReadClientData, refreshTokenIfNeeded } from './auth';
import { getSettings, addSettingsControls } from './settings';
import { syncFunctionTools } from './tools';
import { setCurrentTrack } from './prompt';

import './style.css';

(async function main() {
    const context = SillyTavern.getContext();
    const settings = getSettings();
    addSettingsControls(settings);
    await tryGetClientToken(settings);
    await refreshTokenIfNeeded(settings);
    await tryReadClientData(settings);
    globalThis.spotify_setCurrentTrack = setCurrentTrack;
    syncFunctionTools();
    context.saveSettingsDebounced();
})();
