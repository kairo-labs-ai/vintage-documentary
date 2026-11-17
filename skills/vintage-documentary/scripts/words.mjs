#!/usr/bin/env node
// Print the narration transcript with start times, one sentence per line: node words.mjs <film-dir>
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(process.argv[2] || 'film');
const src = fs.readFileSync(path.join(dir, 'words.js'), 'utf8');
const words = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
let line = [], t0 = null;
for (const w of words) {
  if (t0 === null) t0 = w.start;
  line.push(w.text);
  if (/[.!?]$/.test(w.text)) { console.log(t0.toFixed(2).padStart(7), ' ', line.join(' ')); line = []; t0 = null; }
}
if (line.length) console.log(t0.toFixed(2).padStart(7), ' ', line.join(' '));
