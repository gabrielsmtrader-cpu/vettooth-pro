/* ============================================================
   VetTooth Pro — Arcos dentários por espécie (Cão / Gato)
   SVG representativo, dentes clicáveis integrados ao sistema de marcações.
   Equino continua usando o BaseSvgChart existente.
   Expõe window.SpeciesArch e window.SpeciesTeeth (lookup id→dente)
   ============================================================ */
(function () {
  const e = React.createElement;
  const mark = (id) => (window.markMeta ? window.markMeta(id) : { color: '#888' });

  // ---- definição de dentes (Triadan modificado, comum a cão e gato) ----
  const posName = (pos) => pos <= 3 ? 'Incisivo ' + pos
    : pos === 4 ? 'Canino'
    : pos <= 8 ? 'Pré-molar ' + (pos - 4)
    : 'Molar ' + (pos - 8);
  const posType = (pos) => pos <= 3 ? 'incisor' : pos === 4 ? 'canine' : pos <= 8 ? 'premolar' : 'molar';
  function makeTooth(triadan) {
    const q = Math.floor(triadan / 100), pos = triadan % 100;
    return {
      id: String(triadan), triadan,
      name: posName(pos), type: posType(pos),
      jaw: (q === 1 || q === 2) ? 'upper' : 'lower',
      side: (q === 1 || q === 4) ? 'right' : 'left',
    };
  }

  // sequências por arcada (da direita do paciente → linha média → esquerda)
  const DOG = {
    upper: [110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210],
    lower: [411, 410, 409, 408, 407, 406, 405, 404, 403, 402, 401, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311],
  };
  const CAT = {
    upper: [109, 108, 107, 106, 104, 103, 102, 101, 201, 202, 203, 204, 206, 207, 208, 209],
    lower: [409, 408, 407, 404, 403, 402, 401, 301, 302, 303, 304, 307, 308, 309],
  };

  // registra todos os dentes no lookup global (para o ToothPanel)
  window.SpeciesTeeth = window.SpeciesTeeth || {};
  [DOG, CAT].forEach((set) => ['upper', 'lower'].forEach((j) => set[j].forEach((t) => { window.SpeciesTeeth[String(t)] = makeTooth(t); })));

  // ---- forma de cada dente (desenhado com a coroa para baixo, raiz em cima) ----
  function toothPath(type) {
    if (type === 'incisor') return { w: 19, body: 'M -7 -16 Q -8 8 -5 15 Q 0 18 5 15 Q 8 8 7 -16 Z', cusps: 'M -5 14 L 0 17 L 5 14' };
    if (type === 'canine') return { w: 22, body: 'M -7 -20 Q -9 6 -6 12 L 0 22 L 6 12 Q 9 6 7 -20 Z', cusps: '' };
    if (type === 'premolar') return { w: 28, body: 'M -11 -16 Q -12 10 -9 16 L 9 16 Q 12 10 11 -16 Z', cusps: 'M -9 15 L -4 9 L 0 15 L 4 9 L 9 15' };
    return { w: 38, body: 'M -16 -15 Q -17 10 -14 16 L 14 16 Q 17 10 16 -15 Z', cusps: 'M -14 15 L -9 8 L -4 15 L 0 8 L 4 15 L 9 8 L 14 15' };
  }

  function Tooth({ tooth, marks, selected, onClick, tx, ty, rot, jaw, anat, sc }) {
    const findings = (marks || []).filter((m) => m !== 'normal');
    const tint = findings.length ? mark(findings[0]).color : null;
    const ausente = findings.includes('ausente') || findings.includes('missing');
    const sp = toothPath(tooth.type);
    const baseFill = anat ? '#d2d6db' : '#ffffff';
    const fill = ausente ? '#f3f5f8' : (tint ? `color-mix(in srgb, ${tint} 35%, ${baseFill})` : baseFill);
    const baseStroke = anat ? '#1b1f24' : '#b9c2cd';
    const stroke = selected ? 'var(--od-teal-d, #0f8f88)' : (tint ? tint : baseStroke);
    const sw = (anat ? 2.2 : 1.5) * (selected ? 1.5 : 1);
    // jaw upper: coroa para baixo (desenho padrão). lower: espelha verticalmente.
    const flip = jaw === 'lower' ? ' scale(1,-1)' : '';
    const inner = `${sc ? `scale(${sc})` : ''}${flip}`;
    const labelY = jaw === 'upper' ? -26 : 26;
    return e('g', {
      className: 'sp-tooth', 'data-tooth': tooth.triadan, transform: `translate(${tx} ${ty}) rotate(${rot})`,
      style: { cursor: 'pointer' }, onClick: (ev) => { ev.stopPropagation(); onClick(tooth); },
    },
      e('title', null, `${tooth.triadan} · ${tooth.name}`),
      e('g', { transform: inner },
        e('path', { d: sp.body, fill, stroke, strokeWidth: sw, strokeLinejoin: 'round' }),
        sp.cusps ? e('path', { d: sp.cusps, fill: 'none', stroke: tint || (anat ? '#7d858f' : '#cfd6df'), strokeWidth: 1.1, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: .75 }) : null,
        ausente ? e('g', { stroke: '#d8443c', strokeWidth: 2, strokeLinecap: 'round' }, e('line', { x1: -7, y1: -8, x2: 7, y2: 12 }), e('line', { x1: 7, y1: -8, x2: -7, y2: 12 })) : null,
      ),
      selected ? e('circle', { cx: 0, cy: 0, r: (sp.w * (sc || 1)) / 2 + 9, fill: 'none', stroke: 'var(--od-teal, #00c9a7)', strokeWidth: 1.5, strokeDasharray: '3 3', opacity: .8 }) : null,
      e('text', { className: 'sp-tnum', x: 0, y: labelY, textAnchor: 'middle' }, String(tooth.triadan)),
      findings.length > 1 ? e('circle', { cx: sp.w / 2 + 2, cy: jaw === 'upper' ? 8 : -8, r: 6.5, fill: 'var(--od-teal-d,#0f8f88)' }) : null,
      findings.length > 1 ? e('text', { x: sp.w / 2 + 2, y: (jaw === 'upper' ? 8 : -8) + 3, textAnchor: 'middle', fontSize: 8, fontWeight: 800, fill: '#fff' }, '+' + (findings.length - 1)) : null,
    );
  }

  // dente em vista lateral (perfil) — para os painéis laterais felinos
  function ProfileTooth({ tooth, marks, selected, onClick, x, y, w, h }) {
    const findings = (marks || []).filter((m) => m !== 'normal');
    const tint = findings.length ? mark(findings[0]).color : null;
    const fill = tint ? `color-mix(in srgb, ${tint} 35%, #d2d6db)` : '#d2d6db';
    const stroke = selected ? 'var(--od-teal-d,#0f8f88)' : (tint ? tint : '#1b1f24');
    const rootH = h * 0.55;
    const d = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} Q ${x + w / 2} ${y + h + rootH} ${x} ${y + h} Z`;
    return e('g', {
      className: 'sp-tooth', 'data-tooth': tooth.triadan, style: { cursor: 'pointer' },
      onClick: (ev) => { ev.stopPropagation(); onClick(tooth); },
    },
      e('title', null, `${tooth.triadan} · ${tooth.name}`),
      e('path', { d, fill, stroke, strokeWidth: selected ? 3 : 2, strokeLinejoin: 'round' }),
      e('line', { x1: x + 3, y1: y + h - 3, x2: x + w - 3, y2: y + h - 3, stroke: '#7d858f', strokeWidth: 1, opacity: .6 }),
      e('text', { className: 'sp-tnum', x: x + w / 2, y: y - 6, textAnchor: 'middle' }, String(tooth.triadan)),
    );
  }

  function archPositions(n, y0, amp, jaw, W, padX) {
    W = W || 880; padX = padX || 64;
    const gap = n > 1 ? (W - 2 * padX) / (n - 1) : 0;
    return Array.from({ length: n }, (_, i) => {
      const tx = padX + i * gap;
      const u = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;
      const curve = amp * (1 - u * u);
      const ty = jaw === 'upper' ? y0 + curve : y0 - curve;
      const rot = u * (jaw === 'upper' ? 24 : -24);
      return { tx, ty, rot };
    });
  }

  /* =========================================================
     Arcada Canino (cão) — layout existente
     ========================================================= */
  function DogArch({ marksByTooth, selectedId, onToothClick }) {
    const up = DOG.upper.map(makeTooth), lo = DOG.lower.map(makeTooth);
    const upPos = archPositions(up.length, 118, 74, 'upper');
    const loPos = archPositions(lo.length, 442, 74, 'lower');
    const renderRow = (teeth, pos, jaw) => teeth.map((t, i) => e(Tooth, {
      key: t.id, tooth: t, marks: marksByTooth[t.id] || [], selected: selectedId === t.id,
      onClick: onToothClick, tx: pos[i].tx, ty: pos[i].ty, rot: pos[i].rot, jaw,
    }));
    return e('svg', { className: 'sp-arch-svg', viewBox: '0 0 880 560', width: '100%', preserveAspectRatio: 'xMidYMid meet' },
      e('line', { x1: 440, y1: 40, x2: 440, y2: 520, stroke: '#e2e7ee', strokeWidth: 1.5, strokeDasharray: '4 5' }),
      e('text', { className: 'sp-arch-side', x: 150, y: 30, textAnchor: 'middle' }, 'DIREITA'),
      e('text', { className: 'sp-arch-side', x: 730, y: 30, textAnchor: 'middle' }, 'ESQUERDA'),
      e('text', { className: 'sp-arch-jaw', x: 24, y: 150, textAnchor: 'middle', transform: 'rotate(-90 24 150)' }, 'MAXILA'),
      e('text', { className: 'sp-arch-jaw', x: 24, y: 440, textAnchor: 'middle', transform: 'rotate(-90 24 440)' }, 'MANDÍBULA'),
      e('text', { className: 'sp-arch-badge', x: 440, y: 295, textAnchor: 'middle' }, 'Arcada Canino'),
      e('g', null, renderRow(up, upPos, 'upper')),
      e('g', null, renderRow(lo, loPos, 'lower')),
    );
  }

  /* =========================================================
     Odontograma Felino (gato) — vista oclusal central +
     painéis laterais (perfil) esquerdo/direito.
     Estilo anatômico: contorno preto espesso, preenchimento cinza.
     ========================================================= */
  function FelineArch({ marksByTooth, selectedId, onToothClick }) {
    const M = (id) => marksByTooth[id] || [];
    // ---- oclusal central: arcos estreitos no centro (x 250–630) ----
    const up = CAT.upper.map(makeTooth), lo = CAT.lower.map(makeTooth);
    const upPos = archPositions(up.length, 132, 60, 'upper', 880, 270);
    const loPos = archPositions(lo.length, 430, 60, 'lower', 880, 270);
    const occ = (teeth, pos, jaw) => teeth.map((t, i) => e(Tooth, {
      key: t.id, tooth: t, marks: M(t.id), selected: selectedId === t.id,
      onClick: onToothClick, tx: pos[i].tx, ty: pos[i].ty, rot: pos[i].rot, jaw, anat: true, sc: 0.82,
    }));

    // ---- painel lateral: lista de dentes em perfil ----
    const lateral = (x0, title, upTeeth, loTeeth) => {
      const colW = 30, h = 30, gap = 4;
      const rowY1 = 264, rowY2 = 346;
      const upEls = upTeeth.map((id, i) => e(ProfileTooth, {
        key: 'u' + id, tooth: makeTooth(id), marks: M(String(id)), selected: selectedId === String(id),
        onClick: onToothClick, x: x0 + i * (colW + gap), y: rowY1, w: colW, h,
      }));
      const loEls = loTeeth.map((id, i) => e(ProfileTooth, {
        key: 'l' + id, tooth: makeTooth(id), marks: M(String(id)), selected: selectedId === String(id),
        onClick: onToothClick, x: x0 + i * (colW + gap), y: rowY2, w: colW, h,
      }));
      const boxW = Math.max(upTeeth.length, loTeeth.length) * (colW + gap) + 12;
      const cx = x0 - 8 + boxW / 2;
      return e('g', null,
        e('rect', { x: x0 - 8, y: 226, width: boxW, height: 188, rx: 12, fill: '#f7f9fb', stroke: '#dde3ea', strokeWidth: 1.4 }),
        e('text', { className: 'sp-arch-side', x: cx, y: 244, textAnchor: 'middle' }, title),
        e('text', { className: 'sp-lat-cap', x: cx, y: 328, textAnchor: 'middle' }, 'maxila ▲ · mandíbula ▼'),
        e('g', null, upEls), e('g', null, loEls),
      );
    };

    return e('svg', { className: 'sp-arch-svg', viewBox: '0 0 880 560', width: '100%', preserveAspectRatio: 'xMidYMid meet' },
      // linha média + rótulos
      e('line', { x1: 440, y1: 36, x2: 440, y2: 200, stroke: '#e2e7ee', strokeWidth: 1.5, strokeDasharray: '4 5' }),
      e('line', { x1: 440, y1: 360, x2: 440, y2: 524, stroke: '#e2e7ee', strokeWidth: 1.5, strokeDasharray: '4 5' }),
      e('text', { className: 'sp-arch-side', x: 330, y: 28, textAnchor: 'middle' }, 'DIREITA'),
      e('text', { className: 'sp-arch-side', x: 550, y: 28, textAnchor: 'middle' }, 'ESQUERDA'),
      e('text', { className: 'sp-arch-jaw', x: 440, y: 70, textAnchor: 'middle' }, 'MAXILA · oclusal'),
      e('text', { className: 'sp-arch-jaw', x: 440, y: 500, textAnchor: 'middle' }, 'MANDÍBULA · oclusal'),
      e('text', { className: 'sp-arch-badge', x: 440, y: 285, textAnchor: 'middle' }, 'Odontograma Felino · 30 dentes'),
      // oclusal
      e('g', null, occ(up, upPos, 'upper')),
      e('g', null, occ(lo, loPos, 'lower')),
      // laterais
      lateral(34, 'LATERAL DIREITA', [104, 106, 107, 108, 109], [404, 407, 408, 409]),
      lateral(690, 'LATERAL ESQUERDA', [204, 206, 207, 208, 209], [304, 307, 308, 309]),
    );
  }

  function SpeciesArch({ species, marksByTooth, selectedId, onToothClick }) {
    const s = (species || '').toLowerCase();
    marksByTooth = marksByTooth || {};
    if (/gato|felin|cat/.test(s)) return e(FelineArch, { marksByTooth, selectedId, onToothClick });
    return e(DogArch, { marksByTooth, selectedId, onToothClick });
  }

  window.SpeciesArch = SpeciesArch;
})();
