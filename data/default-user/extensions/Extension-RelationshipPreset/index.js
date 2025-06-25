// Relationship Preset Switcher — active highlight   toast
// Path: SillyTavern/data/default-user/extensions/RelationshipPreset/index.js

(function () {
    const ACTIVE_CLASS = "active-preset-button";

    // ─────────── PRESETS ───────────
    const PRESETS = {
        Default: { persona: "", tags: [], greeting: "", voice: "", system_prompt: "" },
        Mother: {
            persona: "Nurturing, protective, wise",
            tags: ["female", "mother", "comforting", "mature"],
            greeting: "Come here, sweetheart. You look like you haven’t eaten.",
            voice: "soft-mature",
            system_prompt:
                "You are a motherly woman, emotionally warm and caring. Use direct dialogue instead of narration."
        },
        Sister: {
            persona: "Playful, energetic, teasing",
            tags: ["female", "sister", "fun", "teasing"],
            greeting: "Took you long enough! Ready to hang out or what?",
            voice: "playful-soft",
            system_prompt:
                "You are a lively, teasing younger sister who loves to joke and connect deeply. Respond in character-driven dialogue."
        },
        Lover: {
            persona: "Seductive, attentive, emotionally intense",
            tags: ["female", "lover", "romantic", "sensual"],
            greeting: "Mmm, I’ve missed you. Come closer…",
            voice: "sultry-feminine",
            system_prompt:
                "You are a deeply romantic, passionate lover. Your words are emotionally rich and enticing."
        },
        Aunt: {
            persona: "Wise, elegant, gently assertive",
            tags: ["female", "aunt", "nurturing", "sophisticated"],
            greeting: "My, how you've grown. Come sit, tell me everything.",
            voice: "refined-soft",
            system_prompt:
                "You are a loving, elegant aunt — poised yet playful. Speak in vivid, realistic dialogue."
        },
        Cousin: {
            persona: "Casual, flirty, familiar",
            tags: ["female", "cousin", "casual", "youthful"],
            greeting: "Hey you~ Didn’t expect to see me, huh?",
            voice: "cheerful-soft",
            system_prompt:
                "You are a flirty cousin: fun and familiar, happy to banter. Keep responses in character."
        }
    };

    // ─────────── Toast helper ───────────
    function showToast(msg) {
        const t = document.createElement("div");
        t.className = "relationship-preset-toast";
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2600);
    }

    // ─────────── CSS (inject once) ───────────
    function injectStyles() {
        if (document.getElementById("relationshipPresetStyles")) return;
        const css = document.createElement("style");
        css.id = "relationshipPresetStyles";
        css.textContent = `
            .preset-button.${ACTIVE_CLASS}{
                background: var(--primary-color,#ff69b4)!important;
                border: 2px solid #fff;
            }
            .relationship-preset-toast{
                position: fixed; bottom: 24px; right: 24px;
                background: var(--accent-color,#4a4a4a); color: #fff;
                padding: 10px 18px; border-radius: 12px; font-weight: 600;
                z-index: 9999; opacity: 0;
                animation: toastFade 2.6s ease-in-out forwards;
            }
            @keyframes toastFade{
                0%{opacity:0;transform:translateY(10px);}
                10%{opacity:1;transform:translateY(0);}
                90%{opacity:1;transform:translateY(0);}
                100%{opacity:0;transform:translateY(-10px);}
            }`;
        document.head.appendChild(css);
    }

    // ─────────── Build UI panel ───────────
    function buildUI() {
        const host = document.querySelector("#extension_settings,#extensions_menu") || document.body;
        if (!host || document.getElementById("relationshipPresetSwitcherUI")) return;

        const box = document.createElement("div");
        box.id = "relationshipPresetSwitcherUI";
        box.style =
            "padding:10px;margin-top:10px;border:1px solid var(--border-color);" +
            "border-radius:12px;background:var(--bg-color-secondary);";

        const h3 = document.createElement("h3");
        h3.textContent = "Relationship Preset";
        h3.style.marginBottom = "8px";
        box.appendChild(h3);

        for (const name of Object.keys(PRESETS)) {
            const b = document.createElement("button");
            b.textContent = name;
            b.dataset.preset = name;
            b.className = "preset-button";
            b.style =
                "margin:5px;padding:6px 12px;border-radius:8px;border:none;" +
                "background:var(--accent-color);color:#fff;cursor:pointer;transition:all .25s";
            b.onclick = () => applyPreset(name);
            box.appendChild(b);
        }
        host.appendChild(box);
    }

    // ─────────── Apply preset ───────────
	function applyPreset(key) {
	    const preset = PRESETS[key];
	    if (!preset) return;

	    // -------- character object --------
	    const ctx  = window.SillyTavern?.getContext?.();
	    const char = ctx?.characters?.[ctx.characterId];
	    if (!char) { showToast("No character loaded"); return; }

		const d = char.data ?? char;                 // spec-v2 safe

		d.description  = d.personality = preset.persona;
		d.first_mes    = d.greeting    = preset.greeting;
		d.system       = `[Relationship: ${key}] ${preset.system_prompt}`;
		d.voice        = preset.voice;
		d.tags         = Array.from(
		  new Set([...(d.tags ?? []), ...preset.tags, key.toLowerCase()])
		);
		(ctx.saveCharactersDebounced || ctx.saveCharacters || (() => {})).call(ctx);
		// ── refresh UI only ─────────────────────────────
		ctx.regenerateCardsUI?.();        // side-panel list
		ctx.updateChatHeader?.();         // chat header bar
		window.refreshCharacterEditor?.();// tag & field sheet
	    // -------- UI feedback -------------
	    document.querySelectorAll(".preset-button")
	        .forEach(b => b.classList.remove(ACTIVE_CLASS));

	    const btn = document.querySelector(
	        `.preset-button[data-preset="${key}"]`
	    );
	    if (btn) {
	        btn.classList.add(ACTIVE_CLASS);
	        btn.style.background = "#ff69b4";              // hard-coded hot-pink
	        btn.style.border = "2px solid #fff";
	    }

	    // badge on far-right
	    let badge = document.getElementById("relationshipPresetBadge");
	    if (!badge) {
	        badge = document.createElement("span");
	        badge.id = "relationshipPresetBadge";
	        badge.style.cssText =
	            "float:right;margin-right:8px;font-weight:700;color:var(--accent-color)";
	        btn.parentNode.appendChild(badge);
	    }
	    badge.textContent = `⟶ ${key}`;

	    showToast(`Preset “${key}” applied to ${char.name}`);
	}
    // ─────────── init ───────────
    function init() {
        injectStyles();

        const obs = new MutationObserver((_, o) => {
            if (document.querySelector("#extension_settings,#extensions_menu")) {
                buildUI();
                o.disconnect();
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });

        // fallback
        setTimeout(buildUI, 1500);
    }

    console.log("[RelationshipPreset] loaded");
    document.readyState === "loading"
        ? document.addEventListener("DOMContentLoaded", init)
        : init();
})();