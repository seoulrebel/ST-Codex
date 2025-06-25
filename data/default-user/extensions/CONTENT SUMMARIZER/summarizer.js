// ==UserScript==
// @name         Context Summarizer (Episodic)
// @description  Auto-summarize when nearing token limits; manual button & episodic memory.
// ==/UserScript==

(async () => {
  const MODULE = 'context_summarizer';

  // ——— 1. Defaults & State Management ———
  const defaultConfig = {
    tokenLimit:     8192,
    triggerThresh:  7000,
    summaryPrompt:  'Summarize this conversation block, retaining tone and key facts:',
    episodicLimit:  5
  };

  // Access ST APIs
  const context = SillyTavern.getContext();
  const { extensionSettings, saveSettingsDebounced, eventSource, event_types } = context;
  const settings = extensionSettings[MODULE] = extensionSettings[MODULE] || {};
  Object.assign(settings, defaultConfig, settings);
  saveSettingsDebounced();

  let memory = [];  // in-RAM list of summaries

  // Helper: import generateQuietPrompt
  async function importGen() {
    const { generateQuietPrompt } = await import(/* webpackIgnore: true */'../../../../script.js');
    return generateQuietPrompt;
  }

  // ——— 2. Summarization Logic ———
  function countTokens(text) {
    return Math.ceil(text.split(/\s+/).length * 1.5);
  }

  async function summarizeBlock(blockMessages) {
    const gen = await importGen();
    const flat = blockMessages.map(m => m.text ?? m.content).join('\n');
    const prompt = `${settings.summaryPrompt}\n\n${flat}`;
    return await gen(prompt);
  }

  async function maybeAutoSummarize() {
    const chat = context.chat;  // mutable array of { role, text, ... }
    const fullText = chat.map(m => m.text ?? m.content).join('\n');
    if (countTokens(fullText) < settings.triggerThresh) return;

    console.log('⏳ [ContextSummarizer] Threshold reached, summarizing…');
    const summary = await summarizeBlock(chat);
    if (memory.length >= settings.episodicLimit) memory.shift();
    memory.push(summary);

    // rebuild context: episodes + last 20 messages
    const episodes = memory.map((s,i) => `Episode ${i+1}: ${s}`).join('\n\n');
    const tail = chat.slice(-20);
    context.chat.splice(0, context.chat.length, 
      { role:'system', text:`Episodic Summaries:\n\n${episodes}` },
      ...tail
    );

    eventSource.emit(event_types.CHAT_CHANGED, context.chat);
    saveSettingsDebounced();
    console.log('✅ [ContextSummarizer] Context replaced with summary.');
  }

  // ——— 3. Manual Button ———
  function addManualButton() {
    const btn = document.createElement('button');
    btn.textContent = '🧠 Summarize Now';
    btn.style = 'margin-left:8px;padding:4px 8px;';
    btn.onclick = maybeAutoSummarize;
    const sendBar = document.querySelector('#send-area') || document.body;
    sendBar.appendChild(btn);
  }

  // ——— 4. Settings Panel ———
  function buildSettingsPanel() {
    const panel = document.createElement('div');
    panel.style.padding = '10px';
    panel.innerHTML = `
      <h3>ContextSummarizer Settings</h3>
      <label>Trigger Threshold: <input id="thresh" type="number" value="${settings.triggerThresh}"/></label><br>
      <label>Max Episodes: <input id="limit" type="number" value="${settings.episodicLimit}"/></label><br>
      <label>Summary Prompt:</label><br>
      <textarea id="prompt" rows="3" cols="40">${settings.summaryPrompt}</textarea><br>
      <button id="saveBtn">Save</button>
    `;
    panel.querySelector('#saveBtn').onclick = () => {
      settings.triggerThresh = parseInt(panel.querySelector('#thresh').value, 10);
      settings.episodicLimit = parseInt(panel.querySelector('#limit').value, 10);
      settings.summaryPrompt = panel.querySelector('#prompt').value;
      saveSettingsDebounced();
      alert('ContextSummarizer settings saved.');
    };
    return panel;
  }

  // ——— 5. Hook into ST ———
  eventSource.on(event_types.MESSAGE_SENT, () => {
    // run just before each send
    maybeAutoSummarize();
  });

  addManualButton();
  if (context.PluginManager) {
    context.PluginManager.addPluginTab('ContextSummarizer', buildSettingsPanel);
  }
})();