import { getDialogueStats } from '../toolset/dialogue_bias_analyzer.js';
import { injectOOCWarning } from '../toolset/ooc_injector.js';
import { boostEmotionTag, applyStyle } from '../toolset/tone_rewriter.js';
import { getMood, getStyle } from '../toolset/slider_state.js';
import '../toolset/slash_commands.js';

console.log('🧠 Codex Agent loaded: Dialogue bias correction active.');

window.codex_interceptor = async function (chat) {
  const last = chat.at(-1);
  if (!last) return;
  const stats = getDialogueStats(last.mes);
  let output = injectOOCWarning(last.mes, stats);
  if (stats.ratio > 0.6) {
    output = boostEmotionTag(output);
  }
  output = output.replace(/\(\(e:\d+\)\)/, `((e:${getMood(last.name)}))`);
  output = applyStyle(output, getStyle(last.name));
  last.mes = output;
};

