export function getDialogueStats(text) {
  const lines = text.split('\n');
  const dialogue = lines.filter(line =>
    /^\s*(["“”']|{{char}}:|{{user}}:)/.test(line.trim())
  ).length;
  const total = lines.length;
  return {
    total,
    dialogue,
    ratio: Math.round((dialogue / (total || 1)) * 100) / 100
  };
}
