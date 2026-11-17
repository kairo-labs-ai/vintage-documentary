#!/usr/bin/env node
// Vintage Documentary — project setup.
// Usage: node setup.mjs <project-dir> [--audio narration.mp3] [--images ./images] [--music bed.mp3] [--portrait] [--no-transcribe]
//   --portrait  makes a 1080x1920 vertical film (Shorts / Reels / TikTok) instead of 1920x1080
// Creates <project-dir>/film (a HyperFrames project) with the engine, your images, your narration,
// word timings (window.WORDS) and image sizes (window.IMAGES). Then Claude writes film/board.js.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(HERE, '..', 'template');
const args = process.argv.slice(2);
const proj = path.resolve(args[0] || '.');
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const has = k => args.includes('--' + k);
const [W, H] = has('portrait') ? [1080, 1920] : [1920, 1080];
const IMG_EXT = /\.(jpe?g|png|webp)$/i, AUD_EXT = /\.(wav|mp3|m4a|aac|ogg|flac)$/i;

const film = path.join(proj, 'film');
const A = p => path.join(film, 'assets', p);
fs.mkdirSync(A('img'), { recursive: true });
// 1. engine + fonts
for (const f of ['doc-engine.js', 'doc.css', 'gsap.min.js', 'board.jpg']) fs.copyFileSync(path.join(TEMPLATE, 'assets', f), A(f));
fs.mkdirSync(A('fonts'), { recursive: true });
for (const f of fs.readdirSync(path.join(TEMPLATE, 'assets', 'fonts'))) fs.copyFileSync(path.join(TEMPLATE, 'assets', 'fonts', f), A('fonts/' + f));
for (const f of ['hyperframes.json', 'package.json']) if (!fs.existsSync(path.join(film, f))) fs.copyFileSync(path.join(TEMPLATE, f), path.join(film, f));

// 2. images (keep your descriptive file names — they tell Claude where each image belongs)
const imgDir = opt('images') ? path.resolve(opt('images')) : [path.join(proj, 'images'), proj].find(d => fs.existsSync(d) && fs.readdirSync(d).some(f => IMG_EXT.test(f)));
const IM = {};
if (imgDir) for (const f of fs.readdirSync(imgDir).filter(f => IMG_EXT.test(f))) {
  const safe = f.toLowerCase().replace(/[^a-z0-9._-]+/g, '_');
  fs.copyFileSync(path.join(imgDir, f), A('img/' + safe));
  const d = dims(fs.readFileSync(A('img/' + safe)));
  if (d) IM[safe] = d; else console.warn('  ! could not read size of', f);
}
fs.writeFileSync(path.join(film, 'images.js'), 'window.IMAGES = ' + JSON.stringify(IM, null, 1) + ';\n');
console.log(`images: ${Object.keys(IM).length} → film/assets/img/`);

// 3. narration (+ optional music bed)
const audSrc = opt('audio') ? path.resolve(opt('audio')) : fs.readdirSync(proj).filter(f => AUD_EXT.test(f) && !/music|bed/i.test(f)).map(f => path.join(proj, f))[0];
if (!audSrc) { console.error('No narration audio found. Pass --audio <file>.'); process.exit(1); }
const audName = 'narration' + path.extname(audSrc).toLowerCase();
fs.copyFileSync(audSrc, A(audName));
const music = opt('music') ? path.resolve(opt('music')) : null;
if (music) fs.copyFileSync(music, A('music' + path.extname(music).toLowerCase()));

// 4. word timings via HyperFrames' built-in transcriber (Parakeet / whisper.cpp, runs locally)
const tj = path.join(film, 'transcript.json');
if (!has('no-transcribe') || !fs.existsSync(tj)) {
  console.log('transcribing narration (first run downloads a local speech model)…');
  try { execSync(`npx --yes hyperframes@0.8.181 transcribe "${A(audName)}" --dir "${film}" --json`, { stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch { console.log('  transcriber not ready — installing Parakeet…'); execSync('npx --yes hyperframes@0.8.181 models install parakeet', { stdio: 'inherit' }); execSync(`npx --yes hyperframes@0.8.181 transcribe "${A(audName)}" --dir "${film}" --json`, { stdio: ['ignore', 'pipe', 'pipe'] }); }
}
const words = JSON.parse(fs.readFileSync(tj, 'utf8')).map(w => ({ text: w.text, start: +w.start.toFixed(3), end: +w.end.toFixed(3) }));
fs.writeFileSync(path.join(film, 'words.js'), 'window.WORDS = ' + JSON.stringify(words) + ';\n');
let dur = words.length ? words[words.length - 1].end + 2.5 : 60;
let audDur = dur - 2.5;
try { audDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${A(audName)}"`).toString()); dur = Math.max(dur, audDur + 1.5); } catch {}
dur = +dur.toFixed(2); audDur = +audDur.toFixed(3);
console.log(`narration: ${words.length} words, ${dur}s · canvas ${W}x${H}`);

// 5. index.html + board.js stub
const html = fs.readFileSync(path.join(TEMPLATE, 'index.html'), 'utf8')
  .replaceAll('{{W}}', W).replaceAll('{{H}}', H).replaceAll('{{DURATION}}', dur).replace('{{AUDDUR}}', audDur).replace('{{AUDIO}}', 'assets/' + audName)
  .replace('{{MUSIC}}', music ? `<audio id="music" src="assets/music${path.extname(music).toLowerCase()}" data-start="0" data-duration="${dur}" data-track-index="3" data-volume="0.12"></audio>` : '');
fs.writeFileSync(path.join(film, 'index.html'), html);
const board = path.join(film, 'board.js');
if (!fs.existsSync(board)) fs.copyFileSync(path.join(TEMPLATE, 'board.example.js'), board);
console.log('\nready: write film/board.js, then in film/:  npx --yes hyperframes@0.8.181 check  →  npx --yes hyperframes@0.8.181 snapshot  →  npx --yes hyperframes@0.8.181 render');

function dims(b) {
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) { let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) }; i += 2 + len; } }
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') { const t = b.toString('ascii', 12, 16); if (t === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) }; if (t === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff }; if (t === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; } }
  return null;
}
