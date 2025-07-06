import { SlashCommand } from '/scripts/slash-commands/SlashCommand.js';
import { getDialogueStats } from './dialogue_bias_analyzer.js';

new SlashCommand({
  name: "analyze_dialogue",
  description: "Check the dialogue-to-narration ratio in the last response",
  run(args, context) {
    const last = context.getLastBotMessage();
    const stats = getDialogueStats(last);
    context.reply(`🗣️ Dialogue Ratio: ${stats.ratio * 100}% (${stats.dialogue}/${stats.total} lines)`);
  }
});

new SlashCommand({
  name: "mood",
  description: "Set mood intensity 1-10 for the active character",
  run(args, context) {
    const level = parseInt(args[0], 10);
    if (isNaN(level) || level < 1 || level > 10) {
      context.reply('Usage: /mood <1-10>');
      return;
    }
    context.character.codex_mood = level;
    context.reply(`Mood intensity set to ${level}`);
  }
});

new SlashCommand({
  name: "style",
  description: "Set prose style to poetic or slang",
  run(args, context) {
    const style = String(args[0] || '').toLowerCase();
    if (!['poetic', 'slang'].includes(style)) {
      context.reply('Usage: /style <poetic|slang>');
      return;
    }
    context.character.codex_style = style;
    context.reply(`Prose style set to ${style}`);
  }
});

