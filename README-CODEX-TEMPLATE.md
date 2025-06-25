# 🧠 Codex Agent Project – Setup & Template

## ✅ PROJECT REPO SETUP

- **Repo location:**
  ```
  /Volumes/WDBLU500/Codex/SillyTavern-Codex
  ```
- Initialized with:
  ```bash
  git init
  git remote add origin https://github.com/seoulrebel/SillyTavern-Codex.git
  git checkout -b main
  ```
- **.gitignore** moved to repo root:
  ```bash
  mv /Volumes/WDBLU500/Codex/.gitignore.txt /Volumes/WDBLU500/Codex/SillyTavern-Codex/.gitignore
  ```

---

## 🧠 CODEX AGENT SYSTEM PROMPT TEMPLATE

### Mission
> Maintain, verify, and update SillyTavern extensions and logic for compatibility with the latest release, operating independently.

### Codex Agent Tasks
1. Validate & refactor legacy scripts:
   - `scripts/ai-auto.js`
   - `scripts/script-1.12.12-*.js`
2. Ensure SillyTavern compatibility
3. Fix & validate GUI extensions:
   - `relationship-preset`
   - `Extension-Boss-Mode-Stage`
   - `venice-image-button`
4. Validate characters use:
   - `\{\{char\}\}, \{\{user\}\}`
   - `((OOC: ))`
5. Fix narration imbalance
6. Validate & fix all character cards

---

## 🧰 TOOLSET DIRECTORY

- `card_validator.js` – Ensures card JSON structure compliance
- `dialogue_bias_analyzer.js` – Detects over-narration
- `relationshippresettools.js` – Caches & restores descriptions
- `ooc_injector.js` – Manages `OOC:` logic
- `tone_rewriter.js` – Converts writing tone
- `slash_commands.js` – Adds UI triggers

---

## 🧪 INTERFACE & SLIDERS

- **Mood Slider**: `((e:1–10))` scale
- **Style Slider**: Poetic ⇄ Slang

Implemented via:
- `tone_rewriter.js`
- `dialogue_bias_analyzer.js`

---

## 🔁 RELATIONSHIP PRESET HANDLING

### Original Problem
Preset overwrote `description` field.

### Solution
1. **Preferred**: Use new field `"preset_state"`
2. **Alt**: Cache & comment original description
   - Comment out original
   - Restore post-session

Implemented in:
- `relationshippresettools.js`

---

## 🧠 AGENT POLICY

- Autonomous validation of logic
- No manual changes unless explicitly authorized

---

## 📁 FILE STRUCTURE

```
SillyTavern-Codex/
├── codex-agent/
│   ├── scripts/
│   ├── toolset/
│   └── README.md
├── extensions/
├── models/
├── output/
└── scenarios/
```

---

## 📄 File: `README-CODEX-TEMPLATE.md`
This file serves as your operational reference and setup template.
