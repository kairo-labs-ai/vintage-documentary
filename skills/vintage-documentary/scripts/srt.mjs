#!/usr/bin/env node
// Export subtitles from the narration word timings: node srt.mjs <film-dir> [out.srt]
// Groups words into readable cues (≤ 42 characters, ≤ 3.5 s, breaks after sentence ends).
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(process.argv[2] || 'film');
const out = process.argv[3] || path.join(dir, '..', 'documentary.srt');
const src = fs.readFileSync(path.join(dir, 'words.js'), 'utf8');
const words = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
const ts = s => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const cues = []; let cur = [];
const flush = () => { if (cur.length) cues.push({ s: cur[0].start, e: cur[cur.length - 1].end, t: cur.map(w => w.text).join(' ') }); cur = []; };
for (const w of words) {
  const text = cur.map(x => x.text).join(' ') + ' ' + w.text;
  if (cur.length && (text.length > 42 || w.end - cur[0].start > 3.5)) flush();
  cur.push(w);
  if (/[.!?]$/.test(w.text)) flush();
}
flush();
fs.writeFileSync(out, cues.map((c, i) => `${i + 1}\n${ts(c.s)} --> ${ts(Math.max(c.e, c.s + 0.8))}\n${c.t}\n`).join('\n'));
console.log(`${cues.length} cues → ${out}`);
