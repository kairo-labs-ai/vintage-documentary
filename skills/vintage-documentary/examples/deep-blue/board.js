/* PLAN — "Deep Blue: The Machine That Didn't Think" (105 s)
   Row 1 (the machine is born):  game-6 board · Kasparov 1985 · 1996 game-1 board · 1996 note · Deep Blue cabinet · processor node
   Row 2 (the rematch):          speed note · Equitable Center (game-by-game labels) · overhead board (game 2) · case note · SP rack
   Row 3 (what it meant):        how-it-won note · AlphaZero note
   Beats: cold-open title → final position (19 moves) → Kasparov LOST → 1996: first loss, 4–2 → rebuilt: 2 cabinets, 30 nodes,
   480 chips, ~200M pos/s → New York: G1 Kasparov, G2 Deep Blue + dispute (DENIED) → G3–5 drawn, G6 19 moves →
   PULL-BACK on the final score → rematch refused, RETIRED → search vs learning → AlphaZero → end title.
*/
const D = DOC.init({ worldW: 9000, worldH: 5200 });
const at = D.at, img = n => 'assets/img/' + n;

// ---------- row 1 ----------
D.photo('g6', { src: img('game6_1997_kasparov_resigns_move19_final.png'), x: 300, y: 500, w: 760, rot: -4, at: at('best chess player') - 0.4, tone: 'sepia' });
D.label('g6a', { on: 'g6', side: 'tr', text: 'Game 6 · 11 May 1997', at: at('best chess player') + 0.4 });
D.label('g6b', { on: 'g6', side: 'tr', dy: 58, pin: false, text: '19 moves', at: at('nineteen moves') });
D.circle('g6c', { on: 'g6', cx: .33, cy: .52, rx: 95, ry: 80, at: at('nineteen moves') + 0.3 });

D.photo('k85', { src: img('kasparov_1985_world_champion.jpg'), x: 1900, y: 420, w: 560, rot: 5, at: at('Garry Kasparov') - 0.45, tone: 'bw' });
D.label('k85a', { on: 'k85', side: 'tr', text: 'Garry Kasparov', at: at('Garry Kasparov') });
D.label('k85b', { on: 'k85', side: 'tr', dy: 58, pin: false, text: 'World champion', at: at('Garry Kasparov') + 1.0 });
D.stamp('k85s', { on: 'k85', text: 'Lost', rot: -14, y: .62, at: at('lost a match') });

D.photo('g1', { src: img('game1_1996_deep_blue_first_win_final.png'), x: 3400, y: 560, w: 720, rot: 3, at: at('Philadelphia') - 0.5, tone: 'sepia' });
D.label('g1a', { on: 'g1', side: 'tr', text: 'Game 1 · Philadelphia', at: at('Philadelphia') });
D.label('g1b', { on: 'g1', side: 'tr', dy: 58, pin: false, text: 'Feb 1996', at: at('single game') });
D.label('g1c', { on: 'g1', side: 'bottom', text: 'First champion to lose a game', pin: false, at: at('first time') + 0.3 });

D.note('n96', { x: 4950, y: 620, w: 640, rot: -2, head: 'FEB 1996', lines: ['> GAME 1', 'DEEP BLUE WINS', '', '> MATCH', 'KASPAROV 4-2'], at: at('still took the match') - 0.5 });
D.circle('n96c', { on: 'n96', cx: .42, cy: .84, rx: 210, ry: 50, at: at('four games to two') });

D.photo('cab', { src: img('deep_blue_cabinet_chm.jpg'), x: 6300, y: 380, w: 640, rot: -3, at: at('rebuilt the machine') - 0.5, focus: '50% 40%' });
D.label('caba', { on: 'cab', side: 'tr', text: 'Deep Blue · 1997', at: at('rebuilt the machine') + 0.2 });
D.label('cabb', { on: 'cab', side: 'tr', dy: 58, pin: false, text: 'Two cabinets', at: at('two tall cabinets') });

D.photo('node', { src: img('deep_blue_processor_node_chm.jpg'), x: 7800, y: 600, w: 560, rot: 4, at: at('thirty processors') - 0.5, ratio: 1.1, focus: '50% 22%' });
D.label('nodea', { on: 'node', side: 'bottom', text: '30 processors', at: at('thirty processors') + 0.2 });
D.label('nodeb', { on: 'node', side: 'bottom', dy: 58, pin: false, text: '480 chess chips', at: at('custom chess chips') - 0.6 });

// ---------- row 2 ----------
D.note('speed', { x: 7700, y: 2300, w: 760, rot: -2, head: 'QUIET POSITIONS', lines: ['> SEARCH SPEED', 'ALMOST 200,000,000', 'POSITIONS PER SECOND'], at: at('quiet positions') - 0.5 });
D.circle('speedc', { on: 'speed', cx: .5, cy: .66, rx: 330, ry: 60, at: at('two hundred million') });

D.photo('eq', { src: img('equitable_center_new_york.jpg'), x: 5900, y: 2150, w: 560, rot: 3, ratio: 1.25, focus: '50% 30%', at: at('rematch was played') - 0.5 });
D.label('eqa', { on: 'eq', side: 'tl', text: 'New York · May 1997', at: at('New York') });
D.label('eqb', { on: 'eq', side: 'tl', dy: 58, pin: false, text: 'Game 1 · Kasparov', at: at('won the first game') });
D.label('eqc', { on: 'eq', side: 'tl', dy: 116, pin: false, text: 'Game 2 · Deep Blue', at: at('in game two') });
D.label('eqd', { on: 'eq', side: 'tl', dy: 174, pin: false, text: 'Games 3-5 · drawn', at: at('three draws') });
D.label('eqe', { on: 'eq', side: 'tl', dy: 232, pin: false, text: 'Game 6 · Deep Blue', at: at('in game six') });

D.photo('ob', { src: img('chessboard_overhead_bw.jpg'), x: 3500, y: 2250, w: 880, rot: -4, at: at('calm, patient move') - 0.6, tone: 'bw' });
D.label('oba', { on: 'ob', side: 'top', text: 'Game 2', pin: false, at: at('calm, patient move') });
D.label('obb', { on: 'ob', side: 'bottom', text: 'A move that looked human', pin: false, at: at('looked almost human') - 0.2 });

D.wire('case', { x: 1700, y: 2200, w: 900, rot: 2, kicker: 'Case note · Game 2', title: 'Did people help the machine?', body: 'Kasparov resigned, then suggested human help. IBM denied it.', at: at('Kasparov resigned') - 0.5 });
D.stamp('cases', { on: 'case', text: 'Denied', rot: -10, y: .7, x: .62, at: at('IBM denied it') + 0.3 });
D.label('casea', { on: 'case', side: 'bottom', text: 'Engines pick the same move', pin: false, at: at('choose the very same move') - 0.3 });

D.photo('rack', { src: img('deep_blue_rs6000_sp_rack.jpg'), x: 300, y: 2150, w: 600, rot: -3, ratio: 1.2, focus: '50% 35%', at: at('another rematch') - 0.6 });
D.label('racka', { on: 'rack', side: 'tr', text: 'Rematch: refused', at: at('said no') });
D.stamp('racks', { on: 'rack', text: 'Retired', rot: -12, y: .55, at: at('retired the machine') });

D.note('score', { x: 4550, y: 3150, w: 680, rot: -2.5, head: 'FINAL SCORE', lines: ['> DEEP BLUE    3.5', '> KASPAROV     2.5'], at: at('final score') - 0.2 });
D.circle('scorec', { on: 'score', cx: .36, cy: .6, rx: 190, ry: 40, at: at('final score') + 2.0 });

// ---------- row 3 ----------
D.note('how', { x: 2000, y: 3900, w: 760, rot: -1.5, head: 'HOW IT WON', lines: ['> JUDGMENT', 'SET LARGELY BY HAND', '', '> SEARCH', 'FASTER THAN ANY HUMAN'], at: at('never learned a thing') - 0.5 });
D.strike('hows', { on: 'how', y: .14, x0: .06, x1: .6, at: at('never learned a thing') + 0.6 });
D.note('az', { x: 3500, y: 3820, w: 760, rot: 2.5, head: 'TWENTY YEARS LATER', lines: ['> ALPHAZERO', 'TEACHES ITSELF CHESS', 'FROM THE RULES ALONE'], at: at('Twenty years later') - 0.4 });
D.line('azl', { from: { on: 'how', fx: 1, fy: .45 }, to: { on: 'az', fx: 0, fy: .45 }, dash: true, at: at('Twenty years later') + 0.3, bend: -60 });

// ---------- camera ----------
D.cam(0, 'g6', { max: 1.05 });
D.cam(at('best chess player') - 0.5, ['g6', 'g6a'], { pad: .82 });
D.cam(at('Garry Kasparov') - 0.6, ['k85', 'k85a']);
D.cam(at('Philadelphia') - 0.6, ['g1', 'g1a', 'g1c']);
D.cam(at('still took the match') - 0.6, 'n96', { max: 1.15 });
D.cam(at('rebuilt the machine') - 0.6, ['cab', 'caba']);
D.cam(at('thirty processors') - 0.6, ['node', 'nodeb']);
D.cam(at('quiet positions') - 0.6, 'speed', { max: 1.15 });
D.cam(at('rematch was played') - 0.6, ['eq', 'eqa', 'eqe']);
D.cam(at('calm, patient move') - 0.7, ['ob', 'oba', 'obb']);
D.cam(at('Kasparov resigned') - 0.6, ['case', 'casea']);
D.cam(at('three draws') - 0.5, ['eq', 'eqa', 'eqe']);
D.cam(at('in game six') - 0.4, ['g6', 'g6b']);
D.cam(at('final score') - 0.5, ['case', 'ob', 'eq', 'eqa', 'score'], { pad: .94 });   // pull-back: the rematch case file
D.cam(at('final score') + 1.3, 'score', { max: 1.15 });
D.cam(at('another rematch') - 0.6, ['rack', 'racka']);
D.cam(at('never learned a thing') - 0.6, 'how', { max: 1.15 });
D.cam(at('Twenty years later') - 0.3, ['how', 'az'], { pad: .86 });
D.cam(at('rules') + 0.4, 'all', { pad: .98, dur: 1.2 });

// ---------- titles ----------
D.title(0.05, { kicker: 'Man vs machine', text: 'Nineteen moves', dot: '.', hold: 2.4 });
// ---------- vintage 2D scene: the champion stands up and leaves the board (requested edit) ----------
D.film(at('stood up') - 0.15, 3.35, (K, tl, t0) => {
  K.floor(800); K.spot(820, 760);
  const p = K.figure(600, 800, 360, { hair: true });             // Kasparov, seated at the table
  K.table(780, 640, 560); K.chessboard(690, 0, 180).setAttribute('transform', 'translate(0,604) scale(1,0.2)'); K.piece(730, 622, 44); K.piece(835, 618, 44, K.C.light);   // board seen almost edge-on
  const m = K.machine(1240, 260, 300, 540);                       // the machine: a dark cabinet with blinking lights
  K.text(1390, 880, 'DEEP BLUE', 30, K.C.ink);
  gsap.set(p.g, { y: 70 });
  tl.to(p.g, { y: 0, duration: 0.7, ease: 'power2.out' }, t0 + 0.55);           // he stands up
  tl.to(p.g, { x: -720, duration: 1.7, ease: 'power1.in' }, t0 + 1.45);         // and walks away from the board
  m.querySelectorAll('.led').forEach((led, i) => tl.to(led, { opacity: 0.25, duration: 0.18, ease: 'steps(1)', repeat: 7, yoyo: true }, t0 + 0.2 + (i % 5) * 0.11));
});
D.endTitle(at('rules') + 1.3, { text: 'New York, 1997', sub: "The machine that didn't think" });
D.done();
