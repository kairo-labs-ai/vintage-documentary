#!/usr/bin/env node
// Check every narration cue in board.js BEFORE rendering: node cues.mjs <film-dir>
// Finds at('…') / D.at('…') / D.end('…') phrases and reports the ones the transcript doesn't contain,
// with the closest transcript words so you can fix the phrase. Exit code 1 if any cue is missing.
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(process.argv[2] || 'film');
const src = fs.readFileSync(path.join(dir, 'words.js'), 'utf8');
const words = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
const board = fs.readFileSync(path.join(dir, 'board.js'), 'utf8');
// same normalisation as the engine
const norm = s => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9%$.]+/g, ' ').replace(/\.(?!\d)/g, ' ').trim();
const sq = s => s.replace(/(.)\1+/g, '$1');
const toks = words.map(w => norm(w.text));
const find = (phrase, n = 1) => {
  const p = norm(phrase).split(' ').filter(Boolean); let hit = 0;
  for (let i = 0; i <= toks.length - p.length; i++) {
    if (p.every((x, j) => toks[i + j] === x || sq(toks[i + j]) === sq(x) || (j === p.length - 1 && toks[i + j].startsWith(x)))) if (++hit === n) return words[i].start;
  }
  return null;
};
const re = /\b(?:D\.)?(?:at|end)\(\s*(['"`])((?:(?!\1).)+)\1\s*(?:,\s*(\d+))?\s*\)/g;
let m, ok = 0; const bad = [];
while ((m = re.exec(board))) {
  const t = find(m[2], m[3] ? +m[3] : 1);
  if (t === null) {
    const first = norm(m[2]).split(' ')[0], near = words.map((w, i) => [i, w]).filter(([, w]) => norm(w.text).startsWith(first.slice(0, 4))).slice(0, 3).map(([i]) => words.slice(i, i + 6).map(w => w.text).join(' '));
    bad.push(`  ✗ "${m[2]}"${m[3] ? ' #' + m[3] : ''}   ${near.length ? 'transcript has: ' + near.map(x => `"${x}"`).join(' | ') : '(no similar words)'}`);
  } else ok++;
}
console.log(`${ok} cues found` + (bad.length ? `, ${bad.length} missing:\n${bad.join('\n')}` : ' — all good'));
process.exit(bad.length ? 1 : 0);
