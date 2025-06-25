export function boostEmotionTag(text) {
  return text.replace(/\(\(e:(\d)\)\)/, (_, __, level) => {
    const newLevel = Math.min(parseInt(level) + 1, 10);
    return `((e:${newLevel}))`;
  });
}
