/* ============================================================
   VetTooth — Odontograma anatômico equino (SVG vetorial)
   Fiel à carta Triadan: superfícies oclusais com dobras de
   esmalte, cunhas em perfil, arcos de caninos e incisivos.
   Cada dente é um objeto clicável independente.
   Exposto em window.AnatomicalChart
   ============================================================ */
(function () {
  const makeTooth = (q, p) => window.EquiData.makeTooth(q, p);
  const mark = (id) => window.markMeta(id);
  const STRUCT = window.EQ_STRUCTURAL || ['missing', 'fracture', 'extract', 'wolf_ext'];

  // -------- utilidades geométricas --------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function scallopPts(cx, cy, rx, ry, bumps, depth, jitter, rng) {
    const pts = []; const steps = bumps * 2;
    for (let i = 0; i < steps; i++) {
      const ang = (i / steps) * Math.PI * 2 - Math.PI / 2;
      const rr = (i % 2 === 0) ? 1 : 1 - depth;
      const j = 1 + (rng() * 2 - 1) * jitter;
      pts.push([cx + Math.cos(ang) * rx * rr * j, cy + Math.sin(ang) * ry * rr * j]);
    }
    return pts;
  }
  function smoothClosed(pts) {
    const n = pts.length;
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} `;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += `C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} `;
    }
    return d + 'Z';
  }
  const _occCache = {};
  function occShape(seed, jaw) {
    const key = seed + jaw;
    if (_occCache[key]) return _occCache[key];
    const rng = mulberry32((seed * 2654435761) >>> 0);
    const outer = smoothClosed(scallopPts(0, 0, 21, 24, 8, 0.10, 0.07, rng));
    const inner = smoothClosed(scallopPts(0, 0, 15.5, 18, 8, 0.12, 0.07, rng));
    let inf;
    if (jaw === 'upper') {
      inf = [
        smoothClosed(scallopPts(-7, -2, 4, 6.5, 5, 0.22, 0.10, rng)),
        smoothClosed(scallopPts(7, 1, 4, 6.5, 5, 0.22, 0.10, rng)),
      ];
    } else {
      inf = [smoothClosed(scallopPts(0, 0, 7.5, 4, 6, 0.25, 0.12, rng))];
    }
    const res = { outer, inner, inf };
    _occCache[key] = res;
    return res;
  }
  function bez(P0, P1, P2, t) {
    const u = 1 - t;
    return [u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0], u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1]];
  }
  function bezAng(P0, P1, P2, t) {
    const u = 1 - t;
    const dx = 2 * u * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
    const dy = 2 * u * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  const e = React.createElement;
  const STROKE = '#1f1f1f';
  const GRAY = '#e4e0d8';

  function tintOf(marks) {
    return marks && marks.length ? mark(marks[0]).color : null;
  }

  // -------- dente oclusal (superfície de trituração) --------
  function OccTooth({ tooth, marks, selected, onClick, x, y, scale, jaw }) {
    const tint = tintOf(marks);
    const fill = tint ? `color-mix(in srgb, ${tint} 30%, #fbf9f3)` : '#fbf9f3';
    const sh = occShape(tooth.triadan, jaw);
    const missing = marks && marks.includes('missing');
    return e('g', {
      transform: `translate(${x} ${y}) scale(${scale})`, style: { cursor: 'pointer' },
      onClick: (ev) => { ev.stopPropagation(); onClick(tooth); },
    },
      e('title', null, `${tooth.triadan} · ${tooth.name}`),
      e('path', { d: sh.outer, fill, stroke: selected ? '#0f8f88' : STROKE, strokeWidth: selected ? 2.6 : 1.4, strokeLinejoin: 'round' }),
      e('path', { d: sh.inner, fill: 'none', stroke: '#444', strokeWidth: 0.9 }),
      sh.inf.map((d, i) => e('path', { key: i, d, fill: '#efeadf', stroke: '#444', strokeWidth: 0.8 })),
      missing && e('g', { stroke: mark('missing').color, strokeWidth: 2.4, strokeLinecap: 'round' },
        e('line', { x1: -12, y1: -12, x2: 12, y2: 12 }), e('line', { x1: 12, y1: -12, x2: -12, y2: 12 })),
      tint && !missing && e('circle', { cx: 13, cy: -15, r: 4, fill: tint, stroke: '#fff', strokeWidth: 1 }),
    );
  }

  // -------- dente em perfil (cunha) --------
  function ProfileTooth({ tooth, kind, x, y, ang, numAbove, marks, selected, onClick }) {
    const tint = tintOf(marks);
    const fill = tint ? `color-mix(in srgb, ${tint} 32%, #fff)` : '#fff';
    const stroke = selected ? '#0f8f88' : STROKE;
    const sw = selected ? 2.6 : 1.4;
    const missing = marks && marks.includes('missing');
    let shape;
    if (kind === 'canine') {
      shape = e('path', { d: 'M0 -15 C6 -9 6 7 2 15 C1 18 -1 18 -2 15 C-6 7 -6 -9 0 -15 Z', fill, stroke, strokeWidth: sw, strokeLinejoin: 'round' });
    } else if (kind === 'wolf') {
      shape = e('circle', { r: 5.5, fill, stroke, strokeWidth: sw });
    } else {
      shape = e('rect', { x: -11, y: -13, width: 22, height: 26, rx: 4, fill, stroke, strokeWidth: sw });
    }
    const ny = numAbove ? -21 : 22;
    return e('g', { transform: `translate(${x} ${y})`, style: { cursor: 'pointer' }, onClick: (ev) => { ev.stopPropagation(); onClick(tooth); } },
      e('title', null, `${tooth.triadan} · ${tooth.name}`),
      e('g', { transform: `rotate(${ang || 0})` }, shape,
        missing && e('g', { stroke: mark('missing').color, strokeWidth: 2.2, strokeLinecap: 'round' },
          e('line', { x1: -9, y1: -9, x2: 9, y2: 9 }), e('line', { x1: 9, y1: -9, x2: -9, y2: 9 }))),
      e('text', { className: 'anat-num', x: 0, y: ny, textAnchor: 'middle' }, tooth.triadan),
      tint && !missing && e('circle', { cx: 0, cy: 0, r: 3.4, fill: tint, stroke: '#fff', strokeWidth: 0.9 }),
    );
  }

  // -------- incisivo frontal (leque) --------
  function IncisorTooth({ tooth, x, y, rot, marks, selected, onClick, numAt, num }) {
    const tint = tintOf(marks);
    const fill = tint ? `color-mix(in srgb, ${tint} 30%, #fff)` : '#fff';
    const missing = marks && marks.includes('missing');
    return e('g', { style: { cursor: 'pointer' }, onClick: (ev) => { ev.stopPropagation(); onClick(tooth); } },
      e('title', null, `${tooth.triadan} · ${tooth.name}`),
      e('g', { transform: `translate(${x} ${y}) rotate(${rot})` },
        e('path', { d: 'M -9 -20 Q -11 0 -7 17 Q 0 23 7 17 Q 11 0 9 -20 Q 0 -25 -9 -20 Z', fill, stroke: selected ? '#0f8f88' : STROKE, strokeWidth: selected ? 2.6 : 1.4, strokeLinejoin: 'round' }),
        missing && e('g', { stroke: mark('missing').color, strokeWidth: 2.2, strokeLinecap: 'round' },
          e('line', { x1: -7, y1: -12, x2: 7, y2: 12 }), e('line', { x1: 7, y1: -12, x2: -7, y2: 12 })),
        tint && !missing && e('circle', { cx: 0, cy: -2, r: 3.4, fill: tint, stroke: '#fff', strokeWidth: 0.9 })),
      e('text', { className: 'anat-num', x: numAt[0], y: numAt[1], textAnchor: 'middle' }, num),
    );
  }

  // -------- configurações dos quadrantes superiores --------
  const QUP = [
    {
      q: 1, label: '1', labelAt: [165, 99],
      front: [248, 150], ctrl: [150, 134], back: [56, 142],
      wolf: [286, 156], canine: [320, 166],
    },
    {
      q: 2, label: '2', labelAt: [815, 99],
      front: [732, 150], ctrl: [830, 134], back: [924, 142],
      wolf: [694, 156], canine: [660, 166],
    },
  ];

  function Quadrant({ cfg, lower, marksByTooth, selectedId, onToothClick }) {
    const my = (p) => lower ? [p[0], 392 - p[1]] : p;
    const front = my(cfg.front), ctrl = my(cfg.ctrl), back = my(cfg.back);
    const wolf = my(cfg.wolf), canine = my(cfg.canine);
    const label = my(cfg.labelAt);
    const q = lower ? (cfg.q === 1 ? 4 : 3) : cfg.q;
    const numAbove = !lower;
    const cheekPos = [6, 7, 8, 9, 10, 11];
    const teeth = cheekPos.map((p, i) => {
      const t = i / 5;
      const [x, y] = bez(front, ctrl, back, t);
      const ang = bezAng(front, ctrl, back, t) + (numAbove ? 0 : 0);
      return { tooth: makeTooth(q, p), x, y, ang: 0 };
    });
    const ch = (m) => marksByTooth[m.id] || [];
    return e('g', null,
      e('text', { className: 'anat-qlabel', x: label[0], y: label[1], textAnchor: 'middle' }, String(q)),
      teeth.map((tt) => e(ProfileTooth, {
        key: tt.tooth.id, tooth: tt.tooth, kind: 'cheek', x: tt.x, y: tt.y, ang: tt.ang, numAbove,
        marks: ch(tt.tooth), selected: selectedId === tt.tooth.id, onClick: onToothClick,
      })),
      e(ProfileTooth, { tooth: makeTooth(q, 5), kind: 'wolf', x: wolf[0], y: wolf[1], numAbove, marks: marksByTooth[`${q}05`] || [], selected: selectedId === `${q}05`, onClick: onToothClick }),
      e(ProfileTooth, { tooth: makeTooth(q, 4), kind: 'canine', x: canine[0], y: canine[1], numAbove, marks: marksByTooth[`${q}04`] || [], selected: selectedId === `${q}04`, onClick: onToothClick }),
    );
  }

  // -------- linha de superfícies oclusais --------
  function OccRow({ startX, y, jaw, q, order, marksByTooth, selectedId, onToothClick }) {
    return e('g', null, order.map((p, i) => {
      const tooth = makeTooth(q, p);
      const scale = 0.82 + (jaw === 'upper' ? (p - 6) : (p - 6)) * 0.035;
      const x = startX + i * 52;
      return e(OccTooth, {
        key: tooth.id, tooth, x, y, scale, jaw,
        marks: marksByTooth[tooth.id] || [], selected: selectedId === tooth.id, onClick: onToothClick,
      });
    }));
  }

  // -------- arcos de caninos (decorativo, topo-centro) --------
  function CanineArcs() {
    const block = (ox) => e('g', { transform: `translate(${ox} 0)`, fill: GRAY, stroke: '#c9c4b8', strokeWidth: 1 },
      e('path', { d: 'M -44 -16 Q 0 -34 44 -14 L 40 12 Q 0 -2 -40 10 Z' }),
      e('path', { d: 'M -38 20 Q 0 40 38 22 L 34 42 Q 0 54 -34 42 Z' }),
      e('path', { d: 'M 30 -8 L 40 14 L 24 10 Z', fill: '#fff', stroke: STROKE, strokeWidth: 1.2 }),
      e('path', { d: 'M -30 -8 L -40 14 L -24 10 Z', fill: '#fff', stroke: STROKE, strokeWidth: 1.2 }),
    );
    return e('g', { transform: 'translate(0 58)' },
      block(417),
      e('g', { transform: 'translate(980 0) scale(-1 1)' }, block(417)),
    );
  }

  // -------- incisivos frontais (centro) --------
  function IncisorArch({ upper, marksByTooth, selectedId, onToothClick }) {
    const cx = 490;
    const yTop = upper ? 178 : 318;
    const drop = upper ? 34 : -34;
    const order = upper ? [[1, 3], [1, 2], [1, 1], [2, 1], [2, 2], [2, 3]] : [[4, 3], [4, 2], [4, 1], [3, 1], [3, 2], [3, 3]];
    const angs = [-60, -36, -12, 12, 36, 60];
    const els = order.map((qp, i) => {
      const a = angs[i] * Math.PI / 180;
      const x = cx + Math.sin(a) * 82;
      const y = yTop + (1 - Math.cos(a)) * drop;
      const rot = upper ? angs[i] : 180 - angs[i];
      const tooth = makeTooth(qp[0], qp[1]);
      const nr = 116;
      const nx = Math.sin(a) * nr;
      const ny = upper ? (1 - Math.cos(a)) * 30 - 30 : (1 - Math.cos(a)) * -30 + 30;
      return e(IncisorTooth, {
        key: tooth.id, tooth, x, y, rot,
        marks: marksByTooth[tooth.id] || [], selected: selectedId === tooth.id, onClick: onToothClick,
        numAt: [x + (nx - Math.sin(a) * 82) * 0 + nx * 0 + 0, 0], num: tooth.triadan,
      });
    });
    // números posicionados separadamente p/ clareza
    const nums = order.map((qp, i) => {
      const a = angs[i] * Math.PI / 180;
      const x = cx + Math.sin(a) * 104;
      const y = upper ? (178 + (1 - Math.cos(a)) * 34) - 30 : (318 - (1 - Math.cos(a)) * 34) + 34;
      const tooth = makeTooth(qp[0], qp[1]);
      return e('text', { key: 'n' + tooth.id, className: 'anat-num', x, y, textAnchor: 'middle' }, tooth.triadan);
    });
    const ry = 46;
    return e('g', null,
      e('ellipse', { cx, cy: upper ? 214 : 282, rx: 92, ry, fill: 'none', stroke: '#cfcabd', strokeWidth: 1.2 }),
      els.map((el) => e('g', { key: el.key }, el)),
      nums,
    );
  }

  // -------- componente raiz --------
  function AnatomicalChart({ marksByTooth, selectedId, onToothClick }) {
    const cfgProps = { marksByTooth, selectedId, onToothClick };
    return e('svg', { className: 'anat-svg', viewBox: '0 0 980 392', width: '100%', preserveAspectRatio: 'xMidYMid meet' },
      // cunhas cinza
      e('path', { d: 'M 30 196 L 344 118 Q 350 120 350 126 L 350 266 Q 350 272 344 274 Z', fill: GRAY, stroke: '#d4cfc3', strokeWidth: 1 }),
      e('path', { d: 'M 950 196 L 636 118 Q 630 120 630 126 L 630 266 Q 630 272 636 274 Z', fill: GRAY, stroke: '#d4cfc3', strokeWidth: 1 }),
      // oclusais superiores
      e(OccRow, { startX: 34, y: 40, jaw: 'upper', q: 1, order: [11, 10, 9, 8, 7, 6], ...cfgProps }),
      e(OccRow, { startX: 648, y: 40, jaw: 'upper', q: 2, order: [6, 7, 8, 9, 10, 11], ...cfgProps }),
      // oclusais inferiores
      e(OccRow, { startX: 34, y: 352, jaw: 'lower', q: 4, order: [11, 10, 9, 8, 7, 6], ...cfgProps }),
      e(OccRow, { startX: 648, y: 352, jaw: 'lower', q: 3, order: [6, 7, 8, 9, 10, 11], ...cfgProps }),
      // perfis (quadrantes)
      e(Quadrant, { cfg: QUP[0], lower: false, ...cfgProps }),
      e(Quadrant, { cfg: QUP[1], lower: false, ...cfgProps }),
      e(Quadrant, { cfg: QUP[0], lower: true, ...cfgProps }),
      e(Quadrant, { cfg: QUP[1], lower: true, ...cfgProps }),
      // caninos centrais (decorativo)
      CanineArcs(),
      // incisivos frontais
      e(IncisorArch, { upper: true, ...cfgProps }),
      e(IncisorArch, { upper: false, ...cfgProps }),
    );
  }

  window.AnatomicalChart = AnatomicalChart;
})();
