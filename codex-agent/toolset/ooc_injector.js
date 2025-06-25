export function injectOOCWarning(text, stats) {
  if (stats.ratio < 0.3) {
    return text + "\n\n((OOC: Try using more in-character dialogue instead of narration.))";
  }
  return text;
}
