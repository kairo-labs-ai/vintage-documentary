---
name: vintage-documentary
description: Turn a narration audio file, its script and a folder of real archive images into a finished vintage "evidence board" documentary video (MP4) with HyperFrames — dark green board, cream-bordered photos, typewriter label strips, red marker ink, rubber stamps, camera moves, glitch titles, and optional sepia 2D animation scenes. Use when the user asks to make, edit or extend a documentary / history / true-crime / explainer video from a script + voiceover + images, or says "use the vintage documentary skill".
---

# Vintage Documentary

You are the editor. The user gives you three things; you deliver an MP4.

| Input | What it is |
|---|---|
| `script.md` (or .txt) | The narration text, exactly as spoken. |
| one audio file | The voiceover (mp3/wav/m4a). |
| `images/` | Real photos, documents, maps. **File names describe the content and match the script** (`kasparov_1997_resigns.jpg`, not `IMG_4821.jpg`). Read the names: they tell you where each image belongs. |

Optional: `music.mp3` (quiet bed), a `CREDITS.md` for the images, and a format: landscape 16:9 (default) or **vertical 9:16** for Shorts / Reels / TikTok (`--portrait`).

**Before your first board, read the worked example** `examples/deep-blue/board.js` (a finished 1:45 film) with its `script.md`: it shows the layout, density, camera plan and cue style this skill expects.

Requirements on the machine: Node 18+, ffmpeg, Chrome is downloaded by HyperFrames automatically. A GPU makes the final render faster (`--gpu`).

## Workflow

1. **Set up** (once per project). From the folder that holds the inputs:
   ```bash
   node <skill-dir>/scripts/setup.mjs . --audio <voiceover> --images images          # add --portrait for 1080x1920
   ```
   This creates `film/` with the engine, copies the images (lower-cased, safe names) to `film/assets/img/`, measures them into `film/images.js`, and transcribes the voiceover locally into word timings `film/words.js` (HyperFrames' built-in transcriber; the first run downloads a small speech model). Re-run it if the audio changes.

2. **Read before you design.** Read the script, `film/images.js` (names + sizes) and LOOK at every image (Read tool). Note which line each image belongs to.

3. **Plan the board** (write the plan as a comment at the top of `film/board.js`):
   - One beat per sentence or clause. Each beat = one item on the board (photo, note, wire card, map) + 1–2 label strips + at most one "hit" (ink circle, stamp, strike, line, flash).
   - Lay items out on the world (7000×4000 px) roughly in story order, left→right and top→bottom, with 150–400 px gaps, so wide pull-backs show a readable "case file". Photos 600–1100 px wide, tilts between −7° and +7°, never two neighbours with the same tilt sign.
   - Plan 1–2 **pull-backs** (`D.cam(t,'all')` or a group of ids) at turning points, and a title card for the cold open or a chapter turn.

4. **Write `film/board.js`** with the engine API (below). Cue everything to the narration with `D.at('phrase')` — never hard-code seconds. Then check:
   ```bash
   cd film && npx --yes hyperframes@0.8.181 check
   ```
   and read the console for `[doc] cue not found` warnings (fix the phrase to match the transcript in `words.js`). The transcript may write numbers as digits ("19", "3.5") and split or join names ("Alpha Zero"): cue phrases must match `words.js`, not the script. Print the transcript with times: `node <skill-dir>/scripts/words.mjs film`. **Fastest check, no browser:** `node <skill-dir>/scripts/cues.mjs film` lists every `at('…')` phrase missing from the transcript, with the closest transcript words.

5. **QA stills**: `npx --yes hyperframes@0.8.181 snapshot --at 2,8,15,... --no-end -o ../qa` (≤10 times per call) and LOOK at them: labels readable and not covering faces, nothing cut off at frame edges, every beat has something new on screen within ~2 s, red ink lands on the right spot.

6. **Render**: `npx --yes hyperframes@0.8.181 render --gpu --browser-gpu -o ../documentary.mp4` (drop the gpu flags without an NVIDIA/AMD GPU). Then tell the user where the file is and list the image credits. Offer subtitles: `node <skill-dir>/scripts/srt.mjs film` writes `documentary.srt` next to the film.

7. **Edits**: the user can ask for changes in plain words ("slow down scene 3", "add a 2D animation when he leaves the board"). Change `board.js`, re-check, re-snapshot the affected seconds, re-render.

## Engine API (`film/board.js`)

```js
const D = DOC.init();                       // duration comes from the narration
const at = D.at, img = n => 'assets/img/' + n;

// items stay on the board for the whole film; they "develop" in at their cue
D.photo('kasp85', { src: img('kasparov_1985_world_champion.jpg'), x: 400, y: 600, w: 760, rot: 4, at: at('Garry Kasparov') });
D.note('timeline', { x: 1500, y: 700, w: 640, head: 'MAY 1997', lines: ['> GAME 1', 'KASPAROV WINS', '', '> GAME 2', 'DEEP BLUE WINS'], at: at('rematch') });
D.wire('result', { x: 2400, y: 500, w: 900, kicker: 'WIRE REPORT · 11 MAY 1997', title: 'Machine defeats world champion', body: 'Final score 3½–2½ after six games.', at: at('final score') });
D.map('ny', { src: img('map.jpg'), x: 0, y: 0, w: 1800, at: 0 });          // teal-tinted, feathered map plate
D.card('custom', { x, y, w, h, rot, html: '<div>…</div>', at });            // any HTML paper

// annotations (cue them on the NOUN for labels, on the VERB for hits)
D.label('l1', { on: 'kasp85', side: 'tr', text: 'Garry Kasparov', at: at('Kasparov') });   // black typewriter strip + red pin & leader. side: tr|br|tl|bl|top|bottom, or x/y
D.label('l2', { on: 'kasp85', side: 'tr', dy: 56, pin: false, text: 'World champion · age 22', at: at('champion') });
D.circle('c1', { on: 'board6', cx: .3, cy: .55, rx: 120, ry: 90, at: at('nineteen moves') });    // hand-drawn red ellipse (cx/cy = 0..1 of the item)
D.line('r1', { from: { on: 'a', fx: .9, fy: .5 }, to: { on: 'b', fx: .1, fy: .5 }, dash: true, at });   // dash | dot | plain; arrow() adds a head
D.strike('s1', { on: 'result', y: .32, at });                 // red strike-through across a line of an item
D.stamp('st', { on: 'kasp85', text: 'RESIGNED', rot: -12, at: at('resigned') });   // rubber stamp with a 4-frame RGB glitch
D.flash(at('fired'));                                          // white exposure flash
D.quote('q1', { x, y, w: 900, text: 'A real, short quote', who: 'Name, year', at });   // attributed quote card — only real, sourced quotes

// camera: one stop per beat. The move takes 0.55 s; between stops it slowly drifts (never static)
D.cam(0, 'kasp85');                       // id, [ids], {x,y,w,h}, or 'all'
D.cam(at('rematch') - 0.6, 'timeline');   // arrive ~0.5 s before the cue word so the item develops on screen
D.cam(at('final score'), 'all', { pad: .9 });   // pull-back payoff: the whole case file

// titles (fixed overlays)
D.title(0.2, { kicker: 'Not just a game', strikeKicker: true, text: 'Checkmate', dot: '.', hold: 3 });   // typed serif title over a darkened board
D.endTitle(at('rules') + 1.2, { text: 'New York, 1997', sub: 'The last human champion' });           // red glitch slam, board dims
D.credits(at('rules') + 5, { dur: 7, lines: ['Photo title — Author, CC BY-SA 4.0', '…'] });           // rolling image credits (from CREDITS.md) over the dimmed board

// vintage 2D animation scene (flat sepia silhouettes, iris in/out, film grain + scratches)
D.film(at('stood up'), 4.5, (K, tl, t0) => {
  K.floor(800); K.spot(960);
  K.table(960, 640, 640); K.chessboard(860, 590, 200);
  const p = K.figure(700, 800, 380);
  tl.to(p.g, { y: -30, duration: .8, ease: 'power2.out' }, t0 + 1.0);   // he stands up
  tl.to(p.g, { x: -500, duration: 2.2, ease: 'power1.in' }, t0 + 2.0);  // and walks away
});
D.done();
```

2D kit `K` (all return SVG nodes you can animate with `tl`): `rect, ellipse, path, text, group, floor, spot, figure(x, baseY, h, {hat, hair, fill}) → {g, head, armL, armR}`, `crowd(y, n, h)`, `building(x,y,w,h,{sign})`, `table`, `chessboard`, `piece`, `machine(x,y,w,h)` (cabinet with LEDs), `monitor`, `smoke`. Colours: `K.C.ink / mid / soft / paper / light / red`. Keep 2D scenes static-ish: one rigid move at a time (slide, rise, an arm rotating with `svgOrigin`), 3–6 s long, vintage not cartoon.

## Style rules (what makes it look right)

- **The camera never stops.** Every stop drifts ~3.5 % over its hold. Moves are 0.4–0.6 s, `power3.inOut`.
- **Order inside a beat:** camera arrives → item develops → pin + label types (≈21 chars/s) → second label → one red hit → hold → next.
- **Labels on nouns, hits on verbs.** Start a label at the noun (`at('Kasparov')`), land a stamp/flash/strike on the verb (`at('resigned')`).
- **Nothing leaves the board.** Labels, ink and stamps persist; the pull-back shows the whole investigation.
- Label text ≤ 26 characters, CAPS, factual (names, dates, numbers). Two strips max per item.
- New visual information every 1.5–3 s; a stop longer than ~7 s needs a second label or ink.
- Use only images the user is allowed to use. Never invent quotes or fake newspaper mastheads: use `D.wire` (a re-typeset report card) or `D.note` for headlines and dates.
- Respect the facts in the script — label text must not add claims the narration doesn't make.

## Seek-safety (HyperFrames renders frames out of order)

Everything is driven by the one paused GSAP timeline the engine registers. Don't use `setTimeout`, `requestAnimationFrame`, CSS animations or `Math.random()` in `board.js`; use `tl` tweens and fixed numbers.

## Vertical (9:16) films
Set up with `--portrait`. Lay the board out **top → bottom** instead of left → right, keep photos 600–900 px wide, put labels `side: 'bottom'` or `'top'` (side labels run off a narrow frame), and keep label text ≤ 20 characters. Titles scale down automatically.

## Troubleshooting
| Symptom | Fix |
|---|---|
| A label/stamp appears at 0 s or never | Its cue phrase isn't in the transcript — run `scripts/cues.mjs film`. |
| Render hangs with an empty log | A killed render left `film/.hyperframes/video-state-lock` (an empty folder). Delete that folder and render again. |
| Render is slow / uses the CPU | Pass `--gpu --browser-gpu`; check the output with `ffprobe -show_entries stream_tags=encoder` (expect `h264_nvenc` on NVIDIA). |
| Camera frames a note badly | Give the item an explicit `h`, or frame a group: `D.cam(at, ['note', 'label'])`. |
| Transcription fails | `npx --yes hyperframes@0.8.181 models install parakeet`, then re-run setup. |
