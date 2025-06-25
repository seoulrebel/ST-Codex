AGENTS.md – Codex Agent Contributor & Verification Guide

Purpose – Give Codex Agents and human contributors a single reference for where to work, how to work, and how to prove their work is correct.  Follow this guide before opening a PR or committing automated changes.

⸻

1 ▪ Key Areas of the Codebase

Folder	Description	Typical Agent Tasks
extensions/codex/	Core Codex scripts (ai-auto.js, tone_rewriter.js, etc.)	Update APIs, add sliders, ensure UI hooks work
toolsets/	Helper utilities (bias analyser, relationship preset tools)	Refactor functions, add caching, fix deprecated calls
scripts/	Build & test helpers	Maintain CI helpers, pre‑commit hooks
.github/workflows/	CI definitions	Keep lint/test workflows green

⚠︎ Migration note – Any file with the legacy prefix script-1.12.12-beta1.1-* is being migrated to the modern SillyTavern API (≥ 1.12.12). Work only inside those files when performing the migration tasks below.

⸻

2 ▪ Style & Contribution Guidelines
	1.	Code style – Prettier defaults & ESLint rules defined in repo.  Run pnpm lint before committing.
	2.	Token syntax – Always use {{char}}, {{user}}, ((OOC: ...)), and ((e:1–10)) exactly as shown.
	3.	Commit messages / PR titles – 
Format: [<project_name>] <concise description>
Example: [codex] fix deprecated chat.bindings in ai-auto.js
	4.	Documentation – If your change alters sliders, commands, or APIs, update the corresponding section in README.md and this file.

⸻

3 ▪ Verification Steps (Agents must run these)

Codex produces higher‑quality output when it actively validates its own work.  Use the steps below as a checklist after every change.

3.1  Reproduce / Prove an Issue

# 1 Load SillyTavern dev server
npm run dev

# 2 Select a real character card from /characters
# 3 Trigger the bug (describe exact prompt & slider state)
# 4 Collect console errors (copy stack trace)

3.2  Validate a New Feature

# 1 Start ST dev mode with fresh browser cache
npm run dev

# 2 Run the feature scenario (describe conditions)
# 3 Confirm:
#    • no red errors in browser console
#    • UI slider updates state instantly
#    • memory/description fields remain intact

3.3  Lint, Type‑Check & Tests

# Run everything (CI equivalent)
pnpm turbo run test --filter <project_name>

# Or quick local check
pnpm test

# Fix type/lint errors
pnpm lint --filter <project_name>

Tip – For a single failing test use Vitest pattern:
pnpm vitest run -t "<test name>"

⸻

4 ▪ Dev Environment Tips (Monorepo w/ Turbo + PNPM)
	•	Jump to a package: pnpm dlx turbo run where <project_name>
	•	Install deps so Vite/TS see them: pnpm install --filter <project_name>
	•	Spin up a new React + TS package: pnpm create vite@latest <project_name> -- --template react-ts
	•	Always double‑check the name field inside each package’s package.json (skip the root one).

⸻

5 ▪ Agent Workflow Expectations
	1.	Explore context first – Use the repo overview above, plus docs/ and SillyTavern upstream docs, before writing code.
	2.	Write or update code inside the correct package/folder only.
	3.	Add or update tests for every non‑trivial change.
	4.	Run verification steps 3.1 → 3.3 until all are green.
	5.	Prepare PR
	•	Title: [<project_name>] <Title>
	•	Description:

## What & Why
<short rationale>

## Verification
1. Steps to reproduce issue.
2. Steps to validate fix (console output, screenshots, etc.).

## Checklist
- [ ] Lint / tests pass
- [ ] Docs updated


	6.	Never modify user data or memory unless explicitly required by the feature you’re touching.

⸻

6 ▪ Environment Configuration
	•	Environment secrets are managed via Codex → Environment → Secrets (see allowlist.txt for permitted domains).
	•	If you need network during task execution, enable Network access in Environment settings.
	•	Large File Storage is skipped during CI with GIT_LFS_SKIP_SMUDGE=1; run git lfs pull locally if you need the binaries.

⸻

7 ▪ Quick‑Start for First‑Time Contributors

# Clone fork & init sub‑modules (if any)
git clone https://github.com/<you>/ST-Codex.git
cd ST-Codex
git lfs pull  # optional, if you need full assets

# Install root tooling
pnpm install

# Run dev server
npm run dev

# Run full test + lint suite before your first commit
pnpm turbo run test && pnpm lint

Happy hacking!  Keep the sliders smooth, the prose sharp, and the console clean.