import fs from 'fs';
import path from 'path';

const CARD_DIR = path.resolve(__dirname, '../cards');
const OUT_DIR = path.resolve(__dirname, '../cards/normalized');

const REQUIRED = ['name','description','personality','scenario','first_mes','mes_example','metadata'];

function validateCard(card) {
  const issues = [];
  REQUIRED.forEach(f => {
    if (!(f in card)) issues.push(`Missing field: ${f}`);
  });
  ['description','personality','scenario','first_mes','mes_example'].forEach(field => {
    if (typeof card[field] !== 'string' || !card[field].includes('{{char}}') || !card[field].includes('{{user}}')) {
      issues.push(`${field} must be string including {{char}} and {{user}}`);
    }
  });
  if (!/\(\(e:\d\)\)/.test(card.first_mes)) issues.push('first_mes missing default ((e:X)) tag');
  const c = card.metadata?.custom;
  if (!c || typeof c.codex_style_dialect !== 'number' || typeof c.codex_romantic_intensity !== 'number') {
    issues.push('metadata.custom.codex_style_dialect or romantic_intensity invalid');
  }
  return issues;
}

function normalizeCard(card) {
  REQUIRED.forEach(f => {
    if (!(f in card)) card[f] = '';
  });
  const fields = ['description','personality','scenario','first_mes','mes_example'];
  fields.forEach(f => {
    let v = card[f];
    v = v.replace(/\{\{[Cc]har(acter)?\}\}/g,'{{char}}')
         .replace(/\{\{[Uu]ser\}\}/g,'{{user}}')
         .replace(/\[OOC\]|\(OOC\)/gi,'((OOC: ')
         .replace(/\)\)(?!$)/g,'))');
    card[f] = v;
  });
  if (!/\(\(e:\d\)\)/.test(card.first_mes)) card.first_mes += '\n\n((e:2))';
  if (!card.metadata) card.metadata = {};
  if (!card.metadata.custom) card.metadata.custom = {codex_style_dialect:0,codex_romantic_intensity:0};
  return card;
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

fs.readdirSync(CARD_DIR).forEach(fn => {
  if (fn.endsWith('.json')) {
    const file = path.join(CARD_DIR, fn);
    const card = JSON.parse(fs.readFileSync(file,'utf-8'));
    const issues = validateCard(card);
    if (issues.length) {
      console.warn(`⚠️ ${fn} validation issues:\n  - ${issues.join('\n  - ')}`);
    }
    const norm = normalizeCard(card);
    fs.writeFileSync(path.join(OUT_DIR, fn), JSON.stringify(norm, null, 2));
  }
});
