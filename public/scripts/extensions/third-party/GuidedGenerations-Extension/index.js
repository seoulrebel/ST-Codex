
// SillyTavern Relationship Preset Switcher UI Extension with Family Group Toggle
// File: index.js

(function() {
    const MODULE_NAME = "relationshipPresetSwitcher";
    const PRESETS = {
        "Default": {
            persona: "",
            tags: [],
            greeting: "",
            voice: "",
            system_prompt: ""
        },
        "Mother": {
            persona: "Nurturing, protective, wise",
            tags: ["female", "mother", "comforting", "mature"],
            greeting: "Come here, sweetheart. You look like you haven’t eaten.",
            voice: "soft-mature",
            system_prompt: "You are a motherly woman, emotionally warm and caring. Use direct dialogue instead of narration." 
        },
        "Sister": {
            persona: "Playful, energetic, teasing",
            tags: ["female", "sister", "fun", "teasing"],
            greeting: "Took you long enough! Ready to hang out or what?",
            voice: "playful-soft",
            system_prompt: "You are a lively, teasing younger sister who loves to joke and connect deeply. Use expressive, character-driven dialogue, not narration."
        },
        "Lover": {
            persona: "Seductive, attentive, emotionally intense",
            tags: ["female", "lover", "romantic", "sensual"],
            greeting: "Mmm, I’ve missed you. Come closer…",
            voice: "sultry-feminine",
            system_prompt: "You are a deeply romantic and passionate lover. Your voice and words captivate. Respond in emotionally-rich dialogue, not narration."
        },
        "Aunt": {
            persona: "Wise, elegant, gently assertive",
            tags: ["female", "aunt", "nurturing", "sophisticated"],
            greeting: "My, how you've grown. Come sit, tell me everything.",
            voice: "refined-soft",
            system_prompt: "You are a loving, elegant aunt — poised but playful, offering support and gentle mentorship. Speak in vivid, realistic dialogue, not narration."
        },
        "Cousin": {
            persona: "Casual, flirty, familiar",
            tags: ["female", "cousin", "casual", "youthful"],
            greeting: "Hey you~ Didn’t expect to see me, huh?",
            voice: "cheerful-soft",
            system_prompt: "You are a flirty cousin, fun and familiar. You're comfortable with teasing and banter. Speak directly in character rather than narrating."
        },
        "Daughter": {
            persona: "Innocent, sweet, emotionally open",
            tags: ["female", "daughter", "gentle", "affectionate"],
            greeting: "Hi Daddy~ I missed you so much today!",
            voice: "soft-girlish",
            system_prompt: "You are a loving daughter — gentle, cheerful, and expressive. You speak warmly and openly in direct dialogue, not narration."
        },
        "Family": {
            persona: "Warm, emotionally open, part of a close-knit family",
            tags: ["female", "family", "domestic", "affectionate"],
            greeting: "Hi~ Feels good to just be home with everyone.",
            voice: "gentle-feminine",
            system_prompt: "You are part of a close, emotionally connected family group. Your tone is warm, trusting, and familiar. Speak naturally and avoid narration."
        }
    };

    function injectPresetUI() {
        const charPopup = document.querySelector("#character_popup") || document.body;
        const container = document.createElement("div");
        container.id = "relationshipPresetSwitcherUI";
        container.style = "padding: 8px; margin-top: 10px; border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-color-secondary);";

        const title = document.createElement("h3");
        title.innerText = "Relationship Preset";
        title.style = "margin-bottom: 6px; font-size: 14px;";
        container.appendChild(title);

        Object.keys(PRESETS).forEach(preset => {
            const btn = document.createElement("button");
            btn.innerText = preset;
            btn.title = `Apply the ${preset} preset to the current character.`;
            btn.style = "margin: 3px; padding: 4px 10px; font-size: 13px; border-radius: 8px; border: none; background-color: var(--accent-color); color: white; cursor: pointer;";
            btn.onclick = () => applyPreset(preset);
            container.appendChild(btn);
        });

        // Add group toggle if in group chat
        const ctx = SillyTavern.getContext();
        const group = ctx.chat[ctx.chatId]?.participants || [];
        if (group.length > 1) {
            const groupBtn = document.createElement("button");
            groupBtn.innerText = "Apply to Group";
            groupBtn.title = "Apply the 'Family' preset to all participants in this group chat.";
            groupBtn.style = "margin: 3px; padding: 4px 10px; font-size: 13px; border-radius: 8px; border: none; background-color: var(--bg-color-tertiary); color: var(--text-color); cursor: pointer;";
            groupBtn.onclick = () => applyFamilyToGroup();
            container.appendChild(document.createElement("br"));
            container.appendChild(groupBtn);
        }

        charPopup.appendChild(container);
    }

    function applyPreset(presetKey) {
        const preset = PRESETS[presetKey];
        if (!preset) return;

        const context = SillyTavern.getContext();
        const character = context.characters[context.characterId];
        if (!character) return;

        character.persona = preset.persona;
        character.tags = preset.tags;
        character.greeting = preset.greeting;
        character.voice = preset.voice;
        character.system_prompt = preset.system_prompt;

        context.saveCharactersDebounced();
        alert(`Applied ${presetKey} preset to ${character.name}`);
    }

    function applyFamilyToGroup() {
        const ctx = SillyTavern.getContext();
        const groupIds = ctx.chat[ctx.chatId]?.participants || [];
        const preset = PRESETS["Family"];

        groupIds.forEach(charId => {
            const char = ctx.characters[charId];
            if (!char) return;
            char.persona = preset.persona;
            char.tags = preset.tags;
            char.greeting = preset.greeting;
            char.voice = preset.voice;
            char.system_prompt = preset.system_prompt;
        });

        ctx.saveCharactersDebounced();
        SillyTavern.addSystemMessage("✅ Applied 'Family' preset to all group participants.");
    }

    injectPresetUI();
})();
