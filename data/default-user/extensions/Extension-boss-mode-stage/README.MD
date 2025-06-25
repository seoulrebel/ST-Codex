# Boss Mode Stage (SillyTavern Extension)

This extension lets you take control of your LLM’s behavior using special bracketed instructions that are parsed and injected as stage directions.

## 🧠 Usage

- `[Instruction]` — One-time prompt modifiers (applies to next LLM response only)
- `[[Instruction]]` — Persistent instruction (lasts for 10 turns or until replaced)

### ✅ Examples

```text
{{user}} leans in. [{{char}} recoils slightly.]

{{user}} grins. [[{{char}} always distrusts {{user}}.]]