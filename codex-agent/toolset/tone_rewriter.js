export function boostEmotionTag(text) {
  return text.replace(/\(\(e:(\d)\)\)/, (_, __, level) => {
    const newLevel = Math.min(parseInt(level) + 1, 10);
    return `((e:${newLevel}))`;
  });
}

const slangMap = {
  you: 'ya',
  friend: 'bro',
  hello: 'yo'
};

export function toSlang(text) {
  return text.replace(/\b(you|friend|hello)\b/gi, (m) => slangMap[m.toLowerCase()]);
}

const reverseMap = Object.fromEntries(Object.entries(slangMap).map(([k, v]) => [v, k]));

export function toPoetic(text) {
  return text.replace(/\b(ya|bro|yo)\b/gi, (m) => reverseMap[m.toLowerCase()]);
}

export function applyStyle(text, style) {
  return style === 'slang' ? toSlang(text) : toPoetic(text);
}
