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
