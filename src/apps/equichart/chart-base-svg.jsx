/* ============================================================
   VetTooth — Odontograma com arte-base SVG (vetorizada da
   referência) + zonas clicáveis editáveis por dente.
   Exposto em window.BaseSvgChart
   ============================================================ */
(function () {
  const makeTooth = (q, p) => window.EquiData.makeTooth(q, p);
  const mark = (id) => window.markMeta(id);
  const e = React.createElement;

  // coordenadas (viewBox 976x393) do centro de cada dente numerado
  const Z = [];
  const add = (q, p, x, y) => Z.push({ tooth: makeTooth(q, p), x, y });

  // Q1 — superior direito (perfil) : 111..104
  [[11, 62, 150], [10, 100, 158], [9, 135, 160], [8, 172, 160], [7, 207, 158], [6, 242, 156], [5, 280, 165], [4, 318, 168]]
    .forEach(([p, x, y]) => add(1, p, x, y));
  // Q2 — superior esquerdo : espelho
  [[4, 658, 168], [5, 696, 165], [6, 734, 156], [7, 769, 158], [8, 804, 160], [9, 841, 160], [10, 876, 158], [11, 914, 150]]
    .forEach(([p, x, y]) => add(2, p, x, y));
  // Q4 — inferior direito : 411..404
  [[11, 50, 228], [10, 88, 240], [9, 118, 248], [8, 148, 252], [7, 178, 258], [6, 208, 262], [5, 245, 272], [4, 300, 285]]
    .forEach(([p, x, y]) => add(4, p, x, y));
  // Q3 — inferior esquerdo : espelho
  [[4, 676, 285], [5, 731, 272], [6, 768, 262], [7, 798, 258], [8, 828, 252], [9, 858, 248], [10, 888, 240], [11, 926, 228]]
    .forEach(([p, x, y]) => add(3, p, x, y));
  // incisivos superiores
  [[1, 1, 476, 196], [2, 1, 500, 196], [1, 2, 452, 210], [2, 2, 524, 210], [1, 3, 435, 230], [2, 3, 541, 230]]
    .forEach(([q, p, x, y]) => add(q, p, x, y));
  // incisivos inferiores
  [[4, 1, 476, 286], [3, 1, 500, 286], [4, 2, 452, 272], [3, 2, 524, 272], [4, 3, 435, 252], [3, 3, 541, 252]]
    .forEach(([q, p, x, y]) => add(q, p, x, y));

  function ToothZone({ z, marks, status, selected, onClick }) {
    const findings = (marks || []).filter((m) => m !== 'normal');
    const tint = findings.length ? mark(findings[0]).color : null;
    const ausente = findings.includes('ausente');
    const extra = findings.length - 1;
    return e('g', { className: 'anat-zone', style: { cursor: 'pointer' }, onClick: (ev) => { ev.stopPropagation(); onClick(z.tooth); } },
      e('title', null, `${z.tooth.triadan} · ${z.tooth.name}`),
      e('circle', { className: 'anat-zone-hover', cx: z.x, cy: z.y, r: 15, fill: 'transparent' }),
      selected && e('circle', { cx: z.x, cy: z.y, r: 16, fill: 'rgba(20,168,160,.14)', stroke: '#0f8f88', strokeWidth: 2 }),
      ausente && e('circle', { cx: z.x, cy: z.y, r: 9, fill: 'none', stroke: '#9aa6b2', strokeWidth: 2, strokeDasharray: '3 3' }),
      tint && !ausente && e('circle', { cx: z.x, cy: z.y, r: 8.5, fill: tint, stroke: '#fff', strokeWidth: 1.6 }),
      tint && !ausente && extra > 0 && e('text', { x: z.x, y: z.y + 3, textAnchor: 'middle', fontSize: 9, fontWeight: 800, fill: '#fff' }, '+' + extra),
    );
  }

  function BaseSvgChart({ marksByTooth, selectedId, onToothClick }) {
    return e('div', { className: 'anat-stage' },
      e('img', { className: 'anat-base', src: 'assets/odontograma-base.svg', alt: 'Odontograma equino', draggable: false }),
      e('svg', { className: 'anat-hit', viewBox: '0 0 976 393', preserveAspectRatio: 'xMidYMid meet' },
        Z.map((z) => e(ToothZone, {
          key: z.tooth.id, z,
          marks: marksByTooth[z.tooth.id] || [],
          selected: selectedId === z.tooth.id,
          onClick: onToothClick,
        })),
      ),
    );
  }

  window.BaseSvgChart = BaseSvgChart;
})();
