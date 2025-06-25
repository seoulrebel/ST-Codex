import { getDialogueStats } from '../toolset/dialogue_bias_analyzer.js';
import { injectOOCWarning } from '../toolset/ooc_injector.js';
import { boostEmotionTag } from '../toolset/tone_rewriter.js';
import '../toolset/slash_commands.js';

console.log("🧠 Codex Agent loaded: Dialogue bias correction active.");

runGenerationInterceptors.push((result) => {
  const stats = getDialogueStats(result);
  let output = injectOOCWarning(result, stats);

  if (stats.ratio > 0.6) {
    output = boostEmotionTag(output);
  }

  return output;
});
