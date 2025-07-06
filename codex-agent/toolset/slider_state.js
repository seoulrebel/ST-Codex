export const sliderState = new Map();

export function setMood(characterId, mood) {
  const state = sliderState.get(characterId) || {};
  state.mood = mood;
  sliderState.set(characterId, state);
}

export function setStyle(characterId, style) {
  const state = sliderState.get(characterId) || {};
  state.style = style;
  sliderState.set(characterId, state);
}

export function getMood(characterId) {
  return sliderState.get(characterId)?.mood ?? 5;
}

export function getStyle(characterId) {
  return sliderState.get(characterId)?.style ?? 'poetic';
}

