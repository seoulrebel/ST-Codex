// 🧠 Codex Agent – Relationship Preset Tools

export function applyRelationshipPreset(characterCard, presetText) {
  const mainPromptField = characterCard.advanced_defs?.main_prompt ?? "";

  const hasOriginal = mainPromptField.includes("/*ORIGINAL_PROMPT:");
  let safeMainPrompt;

  if (!hasOriginal && mainPromptField.trim().length > 0) {
    safeMainPrompt = \`/*ORIGINAL_PROMPT: \${mainPromptField}*/\\n\${presetText}\`;
  } else if (hasOriginal) {
    safeMainPrompt = mainPromptField.replace(/(\\/\\*ORIGINAL_PROMPT:.*?\\*\\/)/s, \`$1\\n\${presetText}\`);
  } else {
    safeMainPrompt = presetText;
  }

  characterCard.advanced_defs = {
    ...characterCard.advanced_defs,
    main_prompt: safeMainPrompt
  };
}

export function restoreOriginalPrompt(characterCard) {
  const mp = characterCard.advanced_defs?.main_prompt;
  if (!mp) return;

  const match = mp.match(/\\/\\*ORIGINAL_PROMPT:([\\s\\S]*?)\\*\\//);
  if (match) {
    characterCard.advanced_defs.main_prompt = match[1].trim();
  }
}

export function verifyPromptSwap(characterCard) {
  const mp = characterCard.advanced_defs?.main_prompt;
  if (!mp) return false;

  const hasBackup = mp.includes("/*ORIGINAL_PROMPT:");
  const containsPreset = /{{user}}|{{char}}/.test(mp);

  console.log(\`[CodexAgent] RelationshipPreset override verified: Backup = \${hasBackup}, PresetContent = \${containsPreset}\`);
  return hasBackup && containsPreset;
},