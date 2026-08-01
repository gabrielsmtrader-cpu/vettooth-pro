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
     Dentição canina anatômica — SVG oficial do Figma.
     Os posteriores usam os vetores exatos do arquivo; os dentes que fazem
     parte do contorno da mandíbula recebem zonas clínicas vinculadas.
     ========================================================= */
  const DOG_FIGMA_GROUPS = {
    'Vector 42': '110', 'Vector 43': '109', 'Vector 44': '108', 'Vector 45': '107', 'Vector 46': '106', 'Vector 47': '105',
    'Vector 48': '109', 'Vector 49': '108',
    'Vector 63': '210', 'Vector 63_2': '209', 'Vector 64_2': '208', 'Vector 65_2': '207', 'Vector 66_2': '206', 'Vector 67_2': '205',
    'Vector 68_2': '209', 'Vector 69_2': '208',
    'Vector 57': '411', 'Vector 58': '410', 'Vector 59': '409', 'Vector 60': '408', 'Vector 61': '407', 'Vector 62': '406',
    'Vector 64': '311', 'Vector 65': '310', 'Vector 66': '309', 'Vector 67': '308', 'Vector 68': '307', 'Vector 69': '306',
  };
  const DOG_FRONT_ZONES = [
    ['104', 'M67 145 C88 142 105 163 101 190 C96 214 77 211 69 187 Z'],
    ['103', 'M100 92 C115 82 137 92 143 117 C145 137 132 151 115 143 C104 132 98 112 100 92 Z'],
    ['102', 'M142 61 C155 48 177 57 182 83 C184 104 173 120 158 115 C146 105 140 82 142 61 Z'],
    ['101', 'M184 43 C197 32 214 39 218 63 L218 108 C208 122 193 119 187 104 Z'],
    ['201', 'M239 43 C226 32 220 39 220 63 L220 108 C230 122 245 119 251 104 Z'],
    ['202', 'M275 61 C262 48 252 57 251 83 C250 104 261 120 276 115 C288 105 290 82 275 61 Z'],
    ['203', 'M316 92 C301 82 284 92 282 117 C280 137 293 151 310 143 C321 132 323 112 316 92 Z'],
    ['204', 'M353 145 C332 142 319 163 322 190 C327 214 346 211 355 187 Z'],
    ['404', 'M50 984 C61 960 84 951 100 972 C104 996 88 1020 65 1035 L45 1020 Z'],
    ['405', 'M106 910 C119 902 136 914 138 934 C138 951 128 963 116 956 C108 946 104 928 106 910 Z'],
    ['403', 'M105 1023 C119 1016 137 1023 144 1044 C142 1060 129 1070 116 1062 C107 1052 103 1038 105 1023 Z'],
    ['402', 'M145 1042 C158 1033 177 1038 184 1058 C183 1076 171 1087 158 1081 C149 1072 145 1057 145 1042 Z'],
    ['401', 'M186 1053 C199 1042 218 1048 224 1067 C223 1087 212 1098 199 1091 C190 1082 186 1068 186 1053 Z'],
    ['301', 'M232 1053 C245 1042 264 1048 269 1067 C269 1087 258 1098 245 1091 C236 1082 232 1068 232 1053 Z'],
    ['302', 'M272 1042 C285 1033 304 1038 310 1058 C310 1076 298 1087 285 1081 C276 1072 272 1057 272 1042 Z'],
    ['303', 'M313 1023 C327 1016 345 1023 351 1044 C350 1060 337 1070 324 1062 C315 1052 311 1038 313 1023 Z'],
    ['305', 'M315 910 C328 902 345 914 347 934 C347 951 337 963 325 956 C317 946 313 928 315 910 Z'],
    ['304', 'M355 984 C366 960 389 951 405 972 C409 996 393 1020 370 1035 L350 1020 Z'],
  ];

  function dogPaintFor(id, fillsByTooth, marksByTooth) {
    if (fillsByTooth && fillsByTooth[id]) return fillsByTooth[id];
    const findings = ((marksByTooth && marksByTooth[id]) || []).filter((m) => m !== 'normal');
    return findings.length ? mark(findings[0]).color : '';
  }

  function DogArch({ marksByTooth, fillsByTooth, selectedId, onToothClick }) {
    const hostRef = React.useRef(null);
    const [svgText, setSvgText] = React.useState('');
    React.useEffect(() => {
      let active = true;
      fetch('assets/odontograma-canino.svg?v=20260801a').then((r) => {
        if (!r.ok) throw new Error('SVG canino indisponível');
        return r.text();
      }).then((txt) => { if (active) setSvgText(txt); }).catch(() => { if (active) setSvgText(''); });
      return () => { active = false; };
    }, []);
    React.useEffect(() => {
      const host = hostRef.current; if (!host || !svgText) return;
      const arch = host.querySelector('[id="Arcada aberta"]');
      if (!arch) return;
      Object.entries(DOG_FIGMA_GROUPS).forEach(([figmaId, toothId]) => {
        const node = arch.querySelector(`[id="${figmaId}"]`);
        if (!node) return;
        node.setAttribute('data-tooth', toothId);
        node.classList.add('dog-tooth-vector');
        const paintableParts = [
          ...(node.hasAttribute('fill') ? [node] : []),
          ...node.querySelectorAll('[fill]'),
        ];
        paintableParts.forEach((part) => {
          const original = part.getAttribute('fill');
          if (original && original !== 'none' && original.toLowerCase() !== 'black' && original !== '#000000') {
            if (!part.dataset.baseFill) part.dataset.baseFill = original;
            const paint = dogPaintFor(toothId, fillsByTooth, marksByTooth);
            part.style.fill = paint || part.dataset.baseFill;
          }
        });
        node.classList.toggle('is-selected', selectedId === toothId);
      });
    }, [svgText, fillsByTooth, marksByTooth, selectedId]);

    const click = (ev) => {
      const zone = ev.target.closest && ev.target.closest('[data-tooth]');
      if (!zone || !hostRef.current || !hostRef.current.contains(zone)) return;
      ev.stopPropagation();
      const tooth = window.SpeciesTeeth[zone.getAttribute('data-tooth')];
      if (tooth) onToothClick(tooth);
    };
    const zones = DOG_FRONT_ZONES.map(([id, d]) => {
      const paint = dogPaintFor(id, fillsByTooth, marksByTooth);
      return e('path', {
        key: id, d, 'data-tooth': id, className: `dog-tooth-zone${selectedId === id ? ' is-selected' : ''}`,
        fill: paint || 'transparent', fillOpacity: paint ? .72 : .001,
        stroke: selectedId === id ? 'var(--od-teal-d,#0f8f88)' : 'transparent', strokeWidth: selectedId === id ? 4 : 0,
      });
    });
    return e('div', { ref: hostRef, className: 'sp-arch-figma', onClick: click },
      svgText
        ? e('div', { className: 'sp-arch-figma-art', dangerouslySetInnerHTML: { __html: svgText } })
        : e('div', { className: 'sp-arch-loading' }, 'Carregando dentição canina…'),
      e('svg', { className: 'sp-arch-hotspots', viewBox: '0 0 1812 1138', preserveAspectRatio: 'xMidYMid meet', 'aria-label': 'Dentição canina interativa' }, zones),
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

  function SpeciesArch({ species, marksByTooth, fillsByTooth, selectedId, onToothClick }) {
    const s = (species || '').toLowerCase();
    marksByTooth = marksByTooth || {};
    if (/gato|felin|cat/.test(s)) return e(FelineArch, { marksByTooth, selectedId, onToothClick });
    return e(DogArch, { marksByTooth, fillsByTooth: fillsByTooth || {}, selectedId, onToothClick });
  }

  window.SpeciesArchSize = function (species) {
    return /gato|felin|cat/i.test(species || '') ? { width: 880, height: 560 } : { width: 1812, height: 1138 };
  };
  window.SpeciesArch = SpeciesArch;
})();
