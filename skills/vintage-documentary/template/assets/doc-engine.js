/* Vintage Documentary engine (HyperFrames + GSAP). Seek-safe: every visual change is a tween on ONE paused timeline.
   The whole documentary lives on one big "evidence board" (#world). The camera flies between items that stay on the board.
   API (see SKILL.md):  const D = DOC.init({ duration })
     D.at('phrase', n?)            -> seconds where the nth occurrence of phrase starts in the narration (window.WORDS)
     D.end('phrase', n?)           -> seconds where it ends
     D.photo(id,{src,x,y,w,rot,at,tone})   D.note(id,{x,y,w,rot,head,lines,at})   D.wire(id,{x,y,w,rot,kicker,title,body,at})
     D.map(id,{src,x,y,w,at})      D.card(id,{x,y,w,h,rot,html,at})  (any custom paper)
     D.label(id,{on,side,text,at,dx,dy,x,y,pin})   D.circle(id,{on,cx,cy,rx,ry,at})   D.line(id,{from,to,at,dash,dot})
     D.strike(id,{on,y,x0,x1,at})  D.stamp(id,{on,text,at,x,y,rot})   D.arrow(id,{from,to,at})
     D.cam(at,target,{dur,pad,drift,ease})  target = id | [ids] | {x,y,w,h} | 'all'
     D.title(at,{kicker,text,dot,hold})    D.endTitle(at,{text,sub})   D.flash(at)   D.dim(at,to,dur)
     D.film(at,dur,(K,tl,t0)=>{...})       vintage 2D animation scene (flat sepia SVG kit, iris in/out, film grain)
     D.done()  -> registers window.__timelines.main
*/
(function () {
  const SZ = window.DOC_SIZE || { w: 1920, h: 1080 }, W = SZ.w, H = SZ.h, FPS = 30, CW = 19.2; // DOC_SIZE comes from index.html (landscape 1920x1080 or portrait 1080x1920). // CW = label char width (Courier Prime 700, 30px)
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, cls, parent, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) Object.assign(e.style, css); (parent || document.body).appendChild(e); return e; };
  const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const norm = s => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9%$.]+/g, ' ').replace(/\.(?!\d)/g, ' ').trim();
  // deterministic pseudo-random
  const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  const DOC = {};
  let tl, root, stage, cam, world, inkSvg, over, words = [], toks = [], items = {}, stops = [], warn = [], duration = 60, worldW = 7000, worldH = 4000;
  const camNow = { cx: W / 2, cy: H / 2, s: 1 };

  DOC.init = function (o = {}) {
    duration = o.duration || (window.WORDS && window.WORDS.length ? window.WORDS[window.WORDS.length - 1].end + 2 : 60);
    worldW = o.worldW || 7000; worldH = o.worldH || 4000;
    words = window.WORDS || [];
    toks = words.map(w => norm(w.text));
    tl = gsap.timeline({ paused: true });
    tl.set({}, {}, duration);
    root = document.getElementById('doc');
    stage = el('div', 'stage', root);
    cam = el('div', 'cam', stage);
    world = el('div', 'world', cam, { width: worldW + 'px', height: worldH + 'px' });
    inkSvg = sv('svg', { class: 'ink', width: worldW, height: worldH, viewBox: `0 0 ${worldW} ${worldH}` }, world);
    sv('defs', {}, inkSvg).innerHTML = `<filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>`;
    over = el('div', 'over', root);
    el('div', 'vign', over); DOC._dim = el('div', 'dimmer', over); DOC._flash = el('div', 'flash', over);
    const grain = el('div', 'grain', over);
    // grain + gentle exposure flicker, driven by one long tween (seek-safe)
    const g = { f: 0 };
    tl.to(g, { f: duration * FPS, duration, ease: 'none', onUpdate() { const f = Math.floor(g.f); grain.style.backgroundPosition = `${Math.floor(rnd(f) * 256)}px ${Math.floor(rnd(f + 9) * 256)}px`; stage.style.filter = `brightness(${(0.985 + rnd(f * 3) * 0.03).toFixed(3)})`; } }, 0);
    applyCam();
    return DOC;
  };
  DOC.tl = () => tl;
  DOC.warnings = () => warn;

  // ---------- narration cues ----------
  function find(phrase, n = 1) {
    const p = norm(phrase).split(' ').filter(Boolean); let hit = 0;
    for (let i = 0; i <= toks.length - p.length; i++) {
      let ok = true;
      for (let j = 0; j < p.length; j++) { const t = toks[i + j], sq = s => s.replace(/(.)\1+/g, '$1'); if (!(t === p[j] || sq(t) === sq(p[j]) || (j === p.length - 1 && t.startsWith(p[j])))) { ok = false; break; } } // sq: "Garry" matches "Gary"
      if (ok && ++hit === n) return [i, i + p.length - 1];
    }
    warn.push(`cue not found: "${phrase}"${n > 1 ? ' #' + n : ''}`); return null;
  }
  DOC.at = (phrase, n = 1) => { const r = find(phrase, n); return r ? words[r[0]].start : NaN; };
  DOC.end = (phrase, n = 1) => { const r = find(phrase, n); return r ? words[r[1]].end : NaN; };
  const T = (t, what) => { if (typeof t === 'string') t = DOC.at(t); if (!isFinite(t)) { warn.push('bad time for ' + what); t = 0; } return t; };

  // ---------- board items ----------
  function reg(id, e, x, y, w, h, rot) { items[id] = { el: e, x, y, w, h, rot: rot || 0 }; e.id = id; return items[id]; }
  function place(e, x, y, w, h, rot) { Object.assign(e.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h ? h + 'px' : 'auto', transform: `rotate(${rot || 0}deg)` }); }
  function develop(e, at, rot) { tl.fromTo(e, { opacity: 0.25, scale: 1.04, rotation: (rot || 0) + 1.2 }, { opacity: 1, scale: 1, rotation: rot || 0, duration: 0.45, ease: 'power2.out', immediateRender: true }, at); tl.set(e, { visibility: 'visible' }, at); gsap.set(e, { visibility: 'hidden' }); }
  const imgDim = src => { const k = src.split('/').pop(); const d = (window.IMAGES || {})[k]; return d ? d.h / d.w : 0.75; };

  DOC.photo = function (id, o) {
    const pad = o.border ?? 22, iw = o.w - pad * 2, ih = Math.round(iw * (o.ratio || imgDim(o.src))), h = ih + pad * 2;
    const e = el('div', 'photo' + (o.tone ? ' tone-' + o.tone : ''), world);
    place(e, o.x, o.y, o.w, h, o.rot); e.style.padding = pad + 'px';
    const im = el('img', '', e); im.src = o.src; im.style.height = ih + 'px';
    if (o.focus) im.style.objectPosition = o.focus;
    if (o.caption) el('div', 'pcap', e).textContent = o.caption;
    reg(id, e, o.x, o.y, o.w, h, o.rot); develop(e, T(o.at ?? 0, id), o.rot); return DOC;
  };
  DOC.map = function (id, o) {
    const h = Math.round(o.w * (o.ratio || imgDim(o.src)));
    const e = el('div', 'mapplate', world); place(e, o.x, o.y, o.w, h, 0);
    const im = el('img', '', e); im.src = o.src;
    reg(id, e, o.x, o.y, o.w, h, 0); tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'none', immediateRender: true }, T(o.at ?? 0, id)); return DOC;
  };
  DOC.note = function (id, o) {
    const e = el('div', 'note', world); place(e, o.x, o.y, o.w || 640, o.h, o.rot ?? -1.5);
    if (o.head) el('div', 'nhead', e).textContent = o.head;
    (o.lines || []).forEach(l => { const d = el('div', 'nline' + (l.startsWith('>') ? ' nbul' : l ? ' nsub' : ' ngap'), e); d.textContent = l.replace(/^>\s*/, ''); });
    const h = o.h || e.offsetHeight || 120 + (o.lines || []).length * 44; // measured, so the camera frames it exactly
    reg(id, e, o.x, o.y, o.w || 640, h, o.rot ?? -1.5); develop(e, T(o.at ?? 0, id), o.rot ?? -1.5); return DOC;
  };
  DOC.wire = function (id, o) { // re-typeset report card (telegram / wire style) — never imitates a real newspaper masthead
    const e = el('div', 'wire', world); place(e, o.x, o.y, o.w || 900, o.h, o.rot ?? -1);
    el('div', 'wkick', e).textContent = o.kicker || 'REPORT';
    el('div', 'wtitle', e).textContent = o.title || '';
    if (o.body) el('div', 'wbody', e).textContent = o.body;
    const h = o.h || e.offsetHeight || 200 + Math.ceil((o.title || '').length / 22) * 70 + (o.body ? Math.ceil(o.body.length / 48) * 40 : 0);
    reg(id, e, o.x, o.y, o.w || 900, h, o.rot ?? -1); develop(e, T(o.at ?? 0, id), o.rot ?? -1); return DOC;
  };
  DOC.quote = function (id, o) { // short, real, attributed quote on a paper card (never invent quotes)
    const e = el('div', 'quote', world); place(e, o.x, o.y, o.w || 900, o.h, o.rot ?? 1.5);
    el('div', 'qtext', e).textContent = '“' + (o.text || '') + '”';
    if (o.who) el('div', 'qwho', e).textContent = '— ' + o.who;
    reg(id, e, o.x, o.y, o.w || 900, o.h || e.offsetHeight || 320, o.rot ?? 1.5); develop(e, T(o.at ?? 0, id), o.rot ?? 1.5); return DOC;
  };
  DOC.card = function (id, o) {
    const e = el('div', 'card ' + (o.cls || ''), world); place(e, o.x, o.y, o.w, o.h, o.rot); e.innerHTML = o.html || '';
    reg(id, e, o.x, o.y, o.w, o.h, o.rot); develop(e, T(o.at ?? 0, id), o.rot); return DOC;
  };

  // anchor point on an item: fx,fy in 0..1 of its box (ignores small tilt)
  const pt = (on, fx, fy) => { const it = items[on]; if (!it) { warn.push('unknown item ' + on); return [0, 0]; } return [it.x + it.w * fx, it.y + it.h * fy]; };

  // ---------- typewriter label strip ----------
  DOC.label = function (id, o) {
    const at = T(o.at, id), text = (o.text || '').toUpperCase();
    let x = o.x, y = o.y;
    if (o.on) {
      const it = items[o.on], side = o.side || 'tr';
      const [ax, ay] = side === 'tr' ? [it.x + it.w + 40, it.y + 60] : side === 'br' ? [it.x + it.w + 40, it.y + it.h - 160] : side === 'tl' ? [it.x - 40, it.y + 60] : side === 'bl' ? [it.x - 40, it.y + it.h - 160] : side === 'top' ? [it.x + 20, it.y - 120] : [it.x + 20, it.y + it.h + 40];
      x = ax + (o.dx || 0); y = ay + (o.dy || 0);
      if (side === 'tl' || side === 'bl') x -= text.length * CW + 40; // right-align to the left of the photo
      if (o.pin !== false) {
        const [px, py] = o.pinAt ? pt(o.on, o.pinAt[0], o.pinAt[1]) : side.endsWith('l') ? [it.x + 60, it.y + 70] : side === 'top' || side === 'bottom' ? [it.x + it.w * 0.3, side === 'top' ? it.y + 40 : it.y + it.h - 40] : [it.x + it.w - 60, it.y + 70];
        const lx = side.endsWith("l") ? x + text.length * CW + 30 : x, ly = y + 25;
        const ln = sv('line', { x1: px, y1: py, x2: lx, y2: ly, class: 'leader' }, inkSvg);
        const dot = sv('circle', { cx: px, cy: py, r: 7, class: 'pin' }, inkSvg);
        const len = Math.hypot(lx - px, ly - py);
        gsap.set(ln, { attr: { 'stroke-dasharray': len, 'stroke-dashoffset': len } }); gsap.set(dot, { opacity: 0 });
        tl.to(dot, { opacity: 1, duration: 0.05 }, at - 0.25);
        tl.to(ln, { attr: { 'stroke-dashoffset': 0 }, duration: 0.25, ease: 'power1.out' }, at - 0.25);
      }
    }
    const e = el('div', 'strip', world); e.style.left = x + 'px'; e.style.top = y + 'px';
    e.style.width = (text.length + 1) * CW + 30 + 'px';
    const span = el('span', '', e); gsap.set(e, { opacity: 0 });
    reg(id, e, x, y, (text.length + 1) * CW + 30, 50, 0);
    const v = { n: 0 }, cps = o.cps || 21, dur = text.length / cps;
    const put = () => { const n = Math.floor(v.n); span.textContent = text.slice(0, n) + (n < text.length || v.c ? '_' : ''); };
    v.c = 1; put();
    tl.set(e, { opacity: 1 }, at);
    tl.to(v, { n: text.length, duration: dur, ease: 'none', onUpdate: put }, at);
    const blink = { c: 1 };
    tl.to(blink, { c: 0, duration: 1.0, ease: 'none', onUpdate() { v.c = Math.floor(blink.c * 4) % 2 ? 1 : 0; if (blink.c === 0) v.c = 0; put(); } }, at + dur);
    return DOC;
  };

  // ---------- red marker ink ----------
  function drawPath(p, at, dur) { const len = p.getTotalLength(); gsap.set(p, { attr: { 'stroke-dasharray': len + ' ' + len, 'stroke-dashoffset': len } }); tl.to(p, { attr: { 'stroke-dashoffset': 0 }, duration: dur, ease: 'power1.inOut' }, at); }
  DOC.circle = function (id, o) {
    const [cx, cy] = o.on ? pt(o.on, o.cx ?? 0.5, o.cy ?? 0.5) : [o.cx, o.cy], rx = o.rx || 200, ry = o.ry || 140, N = 10;
    const P = []; for (let i = 0; i <= N + 1; i++) { const a = -2.4 + (i / N) * Math.PI * 2 * 1.06, j = 1 + (rnd(i + id.length) - 0.5) * 0.09; P.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]); }
    let d = `M${P[0][0]},${P[0][1]}`; for (let i = 1; i < P.length - 1; i++) { const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1]; d += ` Q${p1[0]},${p1[1]} ${(p1[0] + p2[0]) / 2},${(p1[1] + p2[1]) / 2}`; }
    const p = sv('path', { d, class: 'redink' }, inkSvg); drawPath(p, T(o.at, id), o.dur || 0.6); return DOC;
  };
  DOC.line = function (id, o) {
    const a = Array.isArray(o.from) ? o.from : pt(o.from.on, o.from.fx ?? .5, o.from.fy ?? .5), b = Array.isArray(o.to) ? o.to : pt(o.to.on, o.to.fx ?? .5, o.to.fy ?? .5);
    const mx = (a[0] + b[0]) / 2 + (o.bend || 0), my = (a[1] + b[1]) / 2 - Math.abs(o.bend || 0) * 0.3;
    const d = `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`, at = T(o.at, id), dur = o.dur || 0.9;
    if (o.dash || o.dot) { // visible dashed path revealed by a solid mask path
      const mid = 'm' + id, m = sv('mask', { id: mid, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: worldW, height: worldH }, inkSvg);
      const mp = sv('path', { d, stroke: '#fff', 'stroke-width': 16, fill: 'none' }, m);
      sv('path', { d, class: 'redink route', 'stroke-dasharray': o.dot ? '2 14' : '16 11', 'stroke-linecap': 'round', mask: `url(#${mid})` }, inkSvg);
      drawPath(mp, at, dur);
      if (o.endDot !== false) { const c = sv('circle', { cx: b[0], cy: b[1], r: 9, class: 'pin' }, inkSvg); gsap.set(c, { opacity: 0 }); tl.to(c, { opacity: 1, duration: .1 }, at + dur); }
    } else { const p = sv('path', { d, class: 'redink thin' }, inkSvg); drawPath(p, at, dur); }
    return DOC;
  };
  DOC.arrow = function (id, o) { DOC.line(id, o); const b = Array.isArray(o.to) ? o.to : pt(o.to.on, o.to.fx ?? .5, o.to.fy ?? .5); const a = Array.isArray(o.from) ? o.from : pt(o.from.on, o.from.fx ?? .5, o.from.fy ?? .5); const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); const h = sv('path', { d: `M${b[0] - 26 * Math.cos(ang - .45)},${b[1] - 26 * Math.sin(ang - .45)} L${b[0]},${b[1]} L${b[0] - 26 * Math.cos(ang + .45)},${b[1] - 26 * Math.sin(ang + .45)}`, class: 'redink thin' }, inkSvg); gsap.set(h, { opacity: 0 }); tl.to(h, { opacity: 1, duration: .1 }, T(o.at, id) + (o.dur || .9)); return DOC; };
  DOC.strike = function (id, o) {
    const it = items[o.on], y = it.y + it.h * (o.y ?? 0.5), x0 = it.x + it.w * (o.x0 ?? 0.08), x1 = it.x + it.w * (o.x1 ?? 0.92);
    const p = sv('path', { d: `M${x0},${y + 3} L${x1},${y - 4}`, class: 'redink strike' }, inkSvg); drawPath(p, T(o.at, id), o.dur || 0.4); return DOC;
  };
  DOC.stamp = function (id, o) {
    const it = items[o.on], at = T(o.at, id);
    const e = el('div', 'stamp', world); e.textContent = (o.text || 'CONFIRMED').toUpperCase();
    const [x, y] = pt(o.on, o.x ?? 0.5, o.y ?? 0.55); e.style.left = x + 'px'; e.style.top = y + 'px';
    gsap.set(e, { xPercent: -50, yPercent: -50, rotation: o.rot ?? -12, opacity: 0 });
    tl.set(e, { opacity: 0.9 }, at);
    [5, -4, 3, -2, 0].forEach((dx, k) => tl.set([e, it.el], { x: dx, filter: k < 4 ? `drop-shadow(${dx * 2}px 0 0 rgba(255,0,60,.55)) drop-shadow(${-dx * 2}px 0 0 rgba(0,200,255,.45))` : 'none' }, at + k / FPS));
    tl.set(e, { xPercent: -50, yPercent: -50 }, at);
    return DOC;
  };

  // ---------- camera ----------
  function fit(target, pad, maxS = 1.25) {
    let bb;
    if (target === 'all') { const xs = Object.values(items); bb = xs.reduce((b, i) => ({ x0: Math.min(b.x0, i.x), y0: Math.min(b.y0, i.y), x1: Math.max(b.x1, i.x + i.w), y1: Math.max(b.y1, i.y + i.h) }), { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 }); }
    else if (typeof target === 'string' || Array.isArray(target)) { const ids = [].concat(target); bb = ids.reduce((b, id) => { const i = items[id]; if (!i) { warn.push('camera: unknown item ' + id); return b; } return { x0: Math.min(b.x0, i.x), y0: Math.min(b.y0, i.y), x1: Math.max(b.x1, i.x + i.w), y1: Math.max(b.y1, i.y + i.h) }; }, { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 }); }
    else bb = { x0: target.x, y0: target.y, x1: target.x + target.w, y1: target.y + target.h };
    const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, s = Math.min((W * pad) / w, (H * pad) / h);
    return { cx: (bb.x0 + bb.x1) / 2, cy: (bb.y0 + bb.y1) / 2, s: Math.min(s, maxS) };
  }
  DOC.cam = function (at, target, o = {}) { stops.push({ at: T(at, 'cam'), ...fit(target, o.pad || 0.78, o.max || 1.25), dur: o.dur ?? 0.55, drift: o.drift ?? 0.035, ease: o.ease || 'power3.inOut', cut: !!o.cut, dx: o.dx ?? 30 }); return DOC; };
  function applyCam() { cam.style.transform = `translate(${W / 2 - camNow.cx * camNow.s}px, ${H / 2 - camNow.cy * camNow.s}px) scale(${camNow.s})`; }
  function buildCamera() {
    stops.sort((a, b) => a.at - b.at);
    if (!stops.length) return;
    let cur = { cx: stops[0].cx, cy: stops[0].cy, s: stops[0].s };
    Object.assign(camNow, cur); applyCam();
    stops.forEach((st, i) => {
      const target = { cx: st.cx, cy: st.cy, s: st.s };
      const holdEnd = i + 1 < stops.length ? stops[i + 1].at : duration;
      const moveDur = i === 0 || st.cut ? 0.001 : Math.min(st.dur, Math.max(0.05, holdEnd - st.at - 0.05));
      tl.fromTo(camNow, { ...cur }, { ...target, duration: moveDur, ease: st.ease, onUpdate: applyCam, immediateRender: false }, st.at);
      const dir = i % 2 ? -1 : 1, drifted = { cx: target.cx + st.dx * dir / target.s, cy: target.cy - 12 / target.s, s: target.s * (1 + st.drift * Math.min(1, (holdEnd - st.at) / 6)) };
      const hd = Math.max(0.05, holdEnd - st.at - moveDur);
      tl.fromTo(camNow, { ...target }, { ...drifted, duration: hd, ease: 'sine.inOut', onUpdate: applyCam, immediateRender: false }, st.at + moveDur);
      cur = drifted;
    });
  }

  // ---------- overlays ----------
  DOC.flash = function (at) { at = T(at, 'flash'); tl.fromTo(DOC._flash, { opacity: 0 }, { opacity: 0.62, duration: 0.04, ease: 'none', immediateRender: false }, at); tl.to(DOC._flash, { opacity: 0, duration: 0.5, ease: 'expo.out' }, at + 0.04); return DOC; };
  DOC.dim = function (at, to = 0.75, dur = 0.3) { tl.to(DOC._dim, { opacity: to, duration: dur, ease: 'power1.inOut' }, T(at, 'dim')); return DOC; };
  DOC.title = function (at, o) {
    at = T(at, 'title'); const hold = o.hold || 3;
    const e = el('div', 'tcard', over), k = o.kicker ? el('div', 'tkick', e) : null, t = el('div', 'ttext', e);
    if (k) { k.textContent = o.kicker; if (o.strikeKicker) k.classList.add('struck'); }
    gsap.set(e, { opacity: 0 });
    tl.set(e, { opacity: 1 }, at); tl.to(DOC._dim, { opacity: 0.85, duration: 0.01 }, at);
    const txt = o.text.toUpperCase(), dot = o.dot ?? '.', v = { n: 0 };
    const put = () => { const n = Math.floor(v.n); t.innerHTML = txt.slice(0, n) + (n >= txt.length && dot ? `<span class="tdot">${dot}</span>` : ''); };
    put(); tl.to(v, { n: txt.length, duration: txt.length * 0.08, ease: 'none', onUpdate: put }, at + 0.3);
    tl.to(e, { opacity: 0, duration: 0.35 }, at + hold); tl.to(DOC._dim, { opacity: 0, duration: 0.35, ease: 'power1.inOut' }, at + hold);
    return DOC;
  };
  DOC.endTitle = function (at, o) {
    at = T(at, 'endTitle'); const e = el('div', 'endt', over); const main = el('div', 'etext', e); main.textContent = o.text.toUpperCase();
    if (o.sub) el('div', 'esub', e).textContent = o.sub.toUpperCase();
    gsap.set(e, { opacity: 0 }); DOC.dim(at, 0.78, 0.3);
    tl.set(e, { opacity: 1 }, at);
    [[-22, 'inset(0 0 70% 0)'], [18, 'inset(30% 0 40% 0)'], [-12, 'inset(60% 0 0 0)'], [8, 'inset(0 0 0 0)'], [0, 'none']].forEach(([dx, cp], k) => tl.set(main, { x: dx, clipPath: cp, textShadow: k < 4 ? `${dx / 3}px 0 #00d0ff, ${-dx / 3}px 0 #ff2050` : 'none' }, at + k * 0.08));
    if (o.out) tl.to(e, { opacity: 0, duration: 0.4 }, T(o.out, 'endTitle.out'));
    return DOC;
  };

  // rolling end credits (image attribution). lines: ['Garry Kasparov, 1985 — Owen Williams, CC BY-SA 3.0', ...]
  DOC.credits = function (at, o = {}) {
    at = T(at, 'credits'); const dur = o.dur || 8;
    const e = el('div', 'credits', over); el('div', 'chead', e).textContent = (o.title || 'Image credits').toUpperCase();
    (o.lines || []).forEach(l => (el('div', 'cline', e).textContent = l));
    gsap.set(e, { opacity: 0, y: H * 0.55 }); DOC.dim(at, 0.88, 0.4);
    over.querySelectorAll('.endt, .tcard').forEach(t => tl.to(t, { opacity: 0, duration: 0.4 }, at));
    tl.set(e, { opacity: 1 }, at); tl.fromTo(e, { y: H * 0.55 }, { y: -Math.max(400, (o.lines || []).length * 52), duration: dur, ease: 'none', immediateRender: false }, at);
    return DOC;
  };

  // ---------- vintage 2D film scenes ----------
  // K = drawing kit for flat sepia silhouettes inside a 1920x1080 SVG. Everything you create can be animated with tl.
  DOC.film = function (at, dur, draw, o = {}) {
    at = T(at, 'film');
    const wrap = el('div', 'film2d', over); gsap.set(wrap, { opacity: 0 });
    const s = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, wrap);
    const clipId = 'iris' + Math.floor(at * 1000), cp = sv('clipPath', { id: clipId }, sv('defs', {}, s)), iris = sv('circle', { cx: W / 2, cy: H / 2, r: 0 }, cp);
    const g = sv('g', { 'clip-path': `url(#${clipId})` }, s);
    sv('rect', { x: 0, y: 0, width: W, height: H, fill: o.bg || '#cdb998' }, g);
    const scr = el('div', 'scratches', wrap); el('div', 'fvign', wrap); const fgrain = el('div', 'grain fgrain', wrap);
    const K = kit(g);
    draw(K, tl, at);
    tl.set(wrap, { opacity: 1 }, at);
    tl.fromTo(iris, { attr: { r: 0 } }, { attr: { r: 1150 }, duration: 0.45, ease: 'power2.in', immediateRender: false }, at);
    tl.to(iris, { attr: { r: 0 }, duration: 0.3, ease: 'power2.in' }, at + dur - 0.3);
    tl.set(wrap, { opacity: 0 }, at + dur);
    const f = { f: 0 };
    tl.to(f, { f: dur * FPS, duration: dur, ease: 'none', onUpdate() { const n = Math.floor(f.f); fgrain.style.backgroundPosition = `${Math.floor(rnd(n + 3) * 256)}px ${Math.floor(rnd(n + 7) * 256)}px`; scr.style.backgroundPosition = `${Math.floor(rnd(n * 5) * 1920)}px 0, ${Math.floor(rnd(n * 11) * 1920)}px 0`; scr.style.opacity = rnd(n * 2) > 0.6 ? 0.5 : 0; g.style.filter = `brightness(${(0.97 + rnd(n) * 0.06).toFixed(3)})`; } }, at);
    return DOC;
  };
  function kit(g) {
    const C = { ink: '#2a1d12', mid: '#5b4630', soft: '#8a7152', paper: '#cdb998', light: '#e2d3b4', red: '#8e2f22' };
    const K = { C, g };
    K.rect = (x, y, w, h, fill = C.mid, p = g) => sv('rect', { x, y, width: w, height: h, fill }, p);
    K.ellipse = (cx, cy, rx, ry, fill = C.mid, p = g) => sv('ellipse', { cx, cy, rx, ry, fill }, p);
    K.path = (d, fill = C.ink, p = g) => sv('path', { d, fill }, p);
    K.text = (x, y, str, size = 34, fill = C.ink, p = g, anchor = 'middle') => { const t = sv('text', { x, y, 'font-family': 'Courier Prime, monospace', 'font-weight': 700, 'font-size': size, fill, 'text-anchor': anchor, 'letter-spacing': '.12em' }, p); t.textContent = str; return t; };
    K.group = (p = g) => sv('g', {}, p);
    K.floor = (y = 820, fill = C.soft) => K.rect(0, y, W, H - y, fill);
    K.spot = (cx, w = 700) => { const gid = 'sp' + Math.floor(cx); const d = g.ownerSVGElement.querySelector('defs'); const rg = sv('radialGradient', { id: gid }, d); sv('stop', { offset: '0', 'stop-color': '#fff6dc', 'stop-opacity': .55 }, rg); sv('stop', { offset: '1', 'stop-color': '#fff6dc', 'stop-opacity': 0 }, rg); return sv('ellipse', { cx, cy: 540, rx: w, ry: 620, fill: `url(#${gid})` }, g); };
    // a person in profile/front, flat silhouette. Returns {g, armL, armR, head} — rotate arms with tl.to(K.figure().armR, {rotation:-80, svgOrigin:'x y'})
    K.figure = (x, base, h = 380, o = {}) => {
      // outer <g> is free for GSAP (x/y/rotation); placement lives on the inner groups so tweens never overwrite it
      const s = h / 380, f = sv('g', {}, o.parent || g), fill = o.fill || C.ink;
      const body = sv('g', { transform: `translate(${x},${base}) scale(${s})` }, f);
      sv('rect', { x: -34, y: -230, width: 68, height: 150, rx: 22, fill }, body); // torso
      sv('rect', { x: -30, y: -96, width: 26, height: 96, rx: 8, fill }, body); sv('rect', { x: 4, y: -96, width: 26, height: 96, rx: 8, fill }, body); // legs
      const head = sv('circle', { cx: 0, cy: -270, r: 34, fill }, body);
      if (o.hat) sv('rect', { x: -40, y: -312, width: 80, height: 14, rx: 4, fill }, body), sv('rect', { x: -28, y: -350, width: 56, height: 42, rx: 6, fill }, body);
      if (o.hair) sv('path', { d: 'M-36,-276 Q-30,-318 6,-312 Q38,-306 36,-270 Q22,-296 -4,-292 Q-24,-290 -36,-276Z', fill: o.hairFill || fill }, body);
      const armL = sv('rect', { x: -52, y: -226, width: 20, height: 120, rx: 9, fill }, body);
      const armR = sv('rect', { x: 32, y: -226, width: 20, height: 120, rx: 9, fill }, body);
      return { g: f, body, head, armL, armR, s, shoulderR: [x + 42 * s, base - 220 * s], shoulderL: [x - 42 * s, base - 220 * s] };
    };
    K.crowd = (y, n = 14, h = 230, fill = C.mid) => { const out = []; for (let i = 0; i < n; i++) out.push(K.figure(120 + i * (1680 / (n - 1)) + (rnd(i) - .5) * 40, y, h * (0.9 + rnd(i + 4) * 0.2), { fill, hat: rnd(i + 2) > .55 })); return out; };
    K.building = (x, y, w, h, o = {}) => { const b = K.group(); K.rect(x, y, w, h, o.fill || C.soft, b); const cols = o.cols || Math.floor(w / 110), rows = o.rows || Math.floor(h / 150); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) K.rect(x + 30 + c * ((w - 40) / cols), y + 40 + r * ((h - 60) / rows), (w - 40) / cols - 34, (h - 60) / rows - 60, o.win || C.mid, b); if (o.sign) { K.rect(x + w / 2 - 260, y + h - 160, 520, 60, C.ink, b); K.text(x + w / 2, y + h - 118, o.sign, 34, C.light, b); } return b; };
    K.table = (x, y, w = 520, fill = C.ink) => { const t = K.group(); K.rect(x - w / 2, y, w, 22, fill, t); K.rect(x - w / 2 + 30, y + 22, 20, 170, fill, t); K.rect(x + w / 2 - 50, y + 22, 20, 170, fill, t); return t; };
    K.chessboard = (x, y, size = 200, o = {}) => { const b = K.group(); const q = size / 8; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) K.rect(x + c * q, y + r * q, q, q, (r + c) % 2 ? (o.dark || C.mid) : (o.light || C.light), b); return b; };
    K.piece = (x, y, h = 60, fill = C.ink) => { const p = K.group(); K.path(`M${x - h * .32},${y} L${x + h * .32},${y} L${x + h * .2},${y - h * .25} L${x + h * .12},${y - h * .62} Q${x + h * .28},${y - h * .8} ${x},${y - h} Q${x - h * .28},${y - h * .8} ${x - h * .12},${y - h * .62} L${x - h * .2},${y - h * .25}Z`, fill, p); return p; };
    K.machine = (x, y, w = 260, h = 520, o = {}) => { const m = K.group(); K.rect(x, y, w, h, o.fill || C.ink, m); for (let i = 0; i < (o.leds || 12); i++) { const led = K.rect(x + 30 + (i % 4) * ((w - 60) / 4), y + 40 + Math.floor(i / 4) * 34, 18, 12, C.light, m); led.classList.add('led'); } K.rect(x + 20, y + h * .45, w - 40, 8, C.mid, m); K.rect(x + 20, y + h * .6, w - 40, 8, C.mid, m); return m; };
    K.monitor = (x, y, w = 300, h = 220, fill = C.ink) => { const m = K.group(); K.rect(x, y, w, h, fill, m); const scr = K.rect(x + 18, y + 18, w - 36, h - 50, C.soft, m); K.rect(x + w / 2 - 20, y + h, 40, 40, fill, m); K.rect(x + w / 2 - 90, y + h + 40, 180, 16, fill, m); return { g: m, screen: scr }; };
    K.smoke = (cx, cy, r = 60) => K.ellipse(cx, cy, r, r * .8, '#efe6d2');
    return K;
  }

  DOC.done = function () {
    buildCamera();
    window.__timelines = window.__timelines || {};
    window.__timelines['main'] = tl;
    window.__docWarn = warn;
    if (warn.length) console.error('[doc] ' + warn.join(' | [doc] ')); // surfaces in `hyperframes check` → Runtime
    return tl;
  };
  window.DOC = DOC;
})();
