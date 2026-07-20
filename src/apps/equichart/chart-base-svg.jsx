/* ============================================================
   VetTooth — Odontograma com arte-base SVG (vetorizada da
   referência) + zonas clicáveis editáveis por dente.
   Exposto em window.BaseSvgChart
   ============================================================ */
(function () {
  const makeTooth = (q, p) => window.EquiData.makeTooth(q, p);
  const mark = (id) => window.markMeta(id);
  const e = React.createElement;

  // coordenadas (viewBox 1390x511) alinhadas à arte anatômica exportada do Figma
  const Z = [];
  const add = (q, p, x, y) => Z.push({ tooth: makeTooth(q, p), x, y });

  // Q1 — superior direito (perfil) : 111..104
  [[11, 61, 189], [10, 109, 198], [9, 159, 203], [8, 208, 204], [7, 251, 203], [6, 303, 202], [5, 350, 218], [4, 417, 243]]
    .forEach(([p, x, y]) => add(1, p, x, y));
  // Q2 — superior esquerdo (perfil)
  [[4, 970, 243], [5, 1036, 218], [6, 1086, 202], [7, 1132, 202], [8, 1177, 203], [9, 1224, 203], [10, 1274, 198], [11, 1328, 189]]
    .forEach(([p, x, y]) => add(2, p, x, y));
  // Q4 — inferior direito : 411..404
  [[11, 58, 278], [10, 112, 302], [9, 164, 319], [8, 208, 327], [7, 253, 336], [6, 298, 352], [5, 355, 370], [4, 426, 382]]
    .forEach(([p, x, y]) => add(4, p, x, y));
  // Q3 — inferior esquerdo (perfil)
  [[4, 964, 382], [5, 1035, 370], [6, 1092, 352], [7, 1137, 336], [8, 1182, 327], [9, 1226, 319], [10, 1278, 302], [11, 1332, 278]]
    .forEach(([p, x, y]) => add(3, p, x, y));
  // incisivos superiores
  [[1, 1, 669, 330], [2, 1, 719, 330], [1, 2, 629, 330], [2, 2, 760, 330], [1, 3, 610, 335], [2, 3, 780, 335]]
    .forEach(([q, p, x, y]) => add(q, p, x, y));
  // incisivos inferiores
  [[4, 1, 668, 430], [3, 1, 719, 430], [4, 2, 628, 430], [3, 2, 762, 430], [4, 3, 611, 425], [3, 3, 780, 425]]
    .forEach(([q, p, x, y]) => add(q, p, x, y));

  // Os SVGs do Figma vieram achatados e sem IDs semânticos. Estes índices ligam
  // cada contorno original ao número Triadan correspondente, sem redesenhar a peça.
  const SHAPE_SOURCES = [
    {
      url: 'assets/odontograma-equino-esquerda.svg', dx: 0, dy: 5,
      teeth: {
        111: [22, 40], 110: [23, 50], 109: [24, 54], 108: [25, 57], 107: [26, 61], 106: [27, 65],
        104: 28, 103: 29, 102: 30,
        411: [2, 69], 410: [3, 71], 409: [4, 73], 408: [5, 75], 407: [6, 77], 406: [7, 79],
        404: 8, 403: 9, 402: 10,
      },
    },
    {
      url: 'assets/odontograma-equino-frontal.svg', dx: 505, dy: 0,
      teeth: {
        104: 33, 103: [32, 23], 102: [31, 21], 101: [30, 19],
        201: [42, 17], 202: [43, 15], 203: [44, 13], 204: 45,
        404: 29, 403: [28, 10], 402: [27, 8], 401: [26, 6],
        301: [38, 4], 302: [39, 2], 303: [40, 0], 304: 41,
      },
    },
    {
      url: 'assets/odontograma-equino-direita.svg', dx: 885, dy: 5,
      teeth: {
        211: [22, 40], 210: [23, 50], 209: [24, 54], 208: [25, 57], 207: [26, 61], 206: [27, 65],
        204: 28, 203: 29, 202: 30,
        311: [2, 69], 310: [3, 71], 309: [4, 73], 308: [5, 75], 307: [6, 77], 306: [7, 79],
        304: 8, 303: 9, 302: 10,
      },
    },
  ];

  function ToothFill({ z, color, selected, shapes }) {
    if (!color || !shapes || !shapes.length) return null;
    return e(React.Fragment, null, shapes.map((shape, index) => e('path', {
      key: `paint-${z.tooth.id}-${index}`,
      className: `anat-tooth-fill${selected ? ' is-selected' : ''}`,
      'data-filled-tooth': z.tooth.id,
      d: shape.d,
      transform: `translate(${shape.dx} ${shape.dy})`,
      fill: color,
      fillOpacity: selected ? .74 : .64,
      fillRule: 'evenodd',
      stroke: color,
      strokeWidth: selected ? 2.2 : 1.2,
      pointerEvents: 'none',
      style: { mixBlendMode: 'multiply' },
    })));
  }

  function ToothZone({ z, marks, status, selected, shapes, onClick }) {
    const findings = (marks || []).filter((m) => m !== 'normal');
    const tint = findings.length ? mark(findings[0]).color : null;
    const ausente = findings.includes('ausente');
    const extra = findings.length - 1;
    const activate = (ev) => { ev.stopPropagation(); onClick(z.tooth); };
    return e('g', { className: `anat-zone${selected ? ' is-selected' : ''}`, 'data-tooth': z.tooth.id, role: 'button', tabIndex: 0, 'aria-label': `Selecionar dente ${z.tooth.triadan}`, style: { cursor: 'pointer' }, onClick: activate, onKeyDown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') activate(ev); } },
      e('title', null, `${z.tooth.triadan} · ${z.tooth.name}`),
      shapes && shapes.length
        ? e(React.Fragment, null, shapes.map((shape, index) => e('path', { key: `hit-${z.tooth.id}-${index}`, className: 'anat-zone-hit', d: shape.d, transform: `translate(${shape.dx} ${shape.dy})`, fill: 'transparent', stroke: 'transparent', strokeWidth: 1.5, pointerEvents: 'all' })))
        : e('circle', { className: 'anat-zone-fallback', cx: z.x, cy: z.y, r: 13, fill: 'transparent', opacity: 0, pointerEvents: 'all' }),
      ausente && e('circle', { cx: z.x, cy: z.y, r: 9, fill: 'none', stroke: '#9aa6b2', strokeWidth: 2, strokeDasharray: '3 3' }),
      tint && !ausente && e('circle', { cx: z.x, cy: z.y, r: 8.5, fill: tint, stroke: '#fff', strokeWidth: 1.6 }),
      tint && !ausente && extra > 0 && e('text', { x: z.x, y: z.y + 3, textAnchor: 'middle', fontSize: 9, fontWeight: 800, fill: '#fff' }, '+' + extra),
    );
  }

  function BaseSvgChart({ marksByTooth, fillsByTooth, selectedId, onToothClick }) {
    const [toothShapes, setToothShapes] = React.useState({});
    React.useEffect(() => {
      let active = true;
      Promise.all(SHAPE_SOURCES.map(async (source) => {
        const text = await fetch(source.url).then((response) => response.text());
        const svg = new DOMParser().parseFromString(text, 'image/svg+xml');
        const paths = Array.from(svg.querySelectorAll('path'));
        return Object.entries(source.teeth).reduce((result, [toothId, pathIndexes]) => {
          const indexes = Array.isArray(pathIndexes) ? pathIndexes : [pathIndexes];
          result[toothId] = indexes.map((pathIndex) => paths[pathIndex] && paths[pathIndex].getAttribute('d')).filter(Boolean).map((d) => ({ d, dx: source.dx, dy: source.dy }));
          return result;
        }, {});
      })).then((groups) => {
        if (!active) return;
        const merged = {};
        groups.forEach((group) => Object.entries(group).forEach(([toothId, shapes]) => { merged[toothId] = [...(merged[toothId] || []), ...shapes]; }));
        setToothShapes(merged);
      }).catch(() => {});
      return () => { active = false; };
    }, []);
    return e('div', { className: 'anat-stage' },
      e('div', { className: 'anat-base', role: 'img', 'aria-label': 'Odontograma equino', style: { position: 'absolute', inset: 0 } },
        e('img', {
          src: 'assets/odontograma-equino-esquerda.svg', alt: '', draggable: false,
          style: { position: 'absolute', left: '0%', top: '0.98%', width: '35.68%', height: '98.04%', objectFit: 'contain' },
        }),
        e('img', {
          src: 'assets/odontograma-equino-frontal.svg', alt: '', draggable: false,
          style: { position: 'absolute', left: '36.33%', top: 0, width: '27.27%', height: '100%', objectFit: 'contain' },
        }),
        e('img', {
          src: 'assets/odontograma-equino-direita.svg', alt: '', draggable: false,
          style: { position: 'absolute', left: '63.67%', top: '0.98%', width: '36.33%', height: '98.04%', objectFit: 'contain' },
        }),
      ),
      e('svg', { className: 'anat-hit', viewBox: '0 0 1390 511', preserveAspectRatio: 'xMidYMid meet' },
        Z.map((z) => e(ToothFill, { key: `fill-${z.tooth.id}`, z, color: (fillsByTooth || {})[z.tooth.id], selected: selectedId === z.tooth.id, shapes: toothShapes[z.tooth.id] })),
        Z.map((z) => e(ToothZone, {
          key: z.tooth.id, z,
          marks: marksByTooth[z.tooth.id] || [],
          selected: selectedId === z.tooth.id,
          shapes: toothShapes[z.tooth.id],
          onClick: onToothClick,
        })),
      ),
    );
  }

  window.BaseSvgChart = BaseSvgChart;
})();
