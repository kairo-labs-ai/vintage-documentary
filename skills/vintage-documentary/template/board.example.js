// board.js — Claude writes this file for each documentary (see SKILL.md).
// PLAN: one beat per sentence; items laid out left→right in story order; pull-back at the turning point.
const D = DOC.init();
const at = D.at, img = n => 'assets/img/' + n;
const first = Object.keys(window.IMAGES || {})[0];

if (first) {
  D.photo('p1', { src: img(first), x: 600, y: 600, w: 900, rot: -3, at: 0.4 });
  D.label('p1a', { on: 'p1', side: 'tr', text: first.replace(/\.[a-z]+$/, '').replace(/_/g, ' ').slice(0, 26), at: 1.2 });
  D.cam(0, 'p1');
}
D.title(0.1, { text: 'Your title', hold: 2.5 });
D.done();
