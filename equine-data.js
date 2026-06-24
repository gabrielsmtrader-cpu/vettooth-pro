/* ============================================================
   EquiChart — dados clínicos (odontologia equina)
   Sistema Triadan modificado. Exposto em window.EquiData
   ============================================================ */
(function () {
  // Quadrantes permanentes (Triadan): 1 sup. dir, 2 sup. esq, 3 inf. esq, 4 inf. dir
  const QUADRANTS = {
    1: { jaw: 'upper', side: 'right' },
    2: { jaw: 'upper', side: 'left' },
    3: { jaw: 'lower', side: 'left' },
    4: { jaw: 'lower', side: 'right' },
  };

  // Tipo do dente pela posição (01..11)
  function toothType(pos) {
    if (pos <= 3) return 'incisivo';
    if (pos === 4) return 'canino';
    if (pos === 5) return 'lobo';        // dente de lobo (1º pré-molar vestigial)
    if (pos <= 8) return 'premolar';     // 06,07,08
    return 'molar';                      // 09,10,11
  }

  const POS_NAME = {
    1: 'Incisivo central', 2: 'Incisivo médio', 3: 'Incisivo de canto',
    4: 'Canino', 5: 'Dente de lobo',
    6: '2º pré-molar', 7: '3º pré-molar', 8: '4º pré-molar',
    9: '1º molar', 10: '2º molar', 11: '3º molar',
  };

  function makeTooth(q, pos) {
    const triadan = q * 100 + pos;
    return {
      id: String(triadan),
      triadan,
      quadrant: q,
      pos,
      jaw: QUADRANTS[q].jaw,
      side: QUADRANTS[q].side,
      type: toothType(pos),
      name: POS_NAME[pos],
    };
  }

  // Conjuntos de dentes
  const CHEEK_POS = [6, 7, 8, 9, 10, 11]; // dentes de bochecha (arcadas)
  const INCISOR_POS = [1, 2, 3];

  // Carta oclusal — linhas planas em ordem anatômica (vista de cima).
  // Direita do paciente à esquerda da tela.
  function buildOcclusal() {
    const t = (q, p) => makeTooth(q, p);
    const seq = (pairs) => pairs.map(([q, p]) => t(q, p));
    // grupo de fronteira marca onde começam incisivos (para um respiro visual)
    const upperRow = seq([
      [1, 11], [1, 10], [1, 9], [1, 8], [1, 7], [1, 6], [1, 5], [1, 4], // bochecha+lobo+canino dir
      [1, 3], [1, 2], [1, 1], [2, 1], [2, 2], [2, 3],                     // incisivos
      [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9], [2, 10], [2, 11],  // canino+lobo+bochecha esq
    ]);
    const lowerRow = seq([
      [4, 11], [4, 10], [4, 9], [4, 8], [4, 7], [4, 6], [4, 4],
      [4, 3], [4, 2], [4, 1], [3, 1], [3, 2], [3, 3],
      [3, 4], [3, 6], [3, 7], [3, 8], [3, 9], [3, 10], [3, 11],
    ]);
    const isIncisor = (tt) => tt.type === 'incisivo';
    return { upperRow, lowerRow, isIncisor };
  }

  // Vista lateral (perfil) — fileiras de bochecha em oclusão, lado esquerdo e direito
  function buildLateral() {
    const row = (q, reverse) => {
      const teeth = CHEEK_POS.map((p) => makeTooth(q, p));
      return reverse ? teeth.slice().reverse() : teeth;
    };
    return {
      right: { upper: row(1, false), lower: row(4, false) }, // 106..111
      left: { upper: row(2, false), lower: row(3, false) },
    };
  }

  /* ---------------- Anormalidades (ícones de toque rápido) ----------------
     scope: 'cheek' | 'incisor' | 'any'
     render: glyph desenhado no SVG do dente
     color: cor padrão da marca (vermelho = patologia) */
  const ABNORMALITIES = [
    { id: 'sep',      label: 'Pontas de esmalte',     short: 'PE',  color: '#d8443c', scope: 'cheek' },
    { id: 'hook',     label: 'Gancho',                short: 'GAN', color: '#d8443c', scope: 'cheek' },
    { id: 'ramp',     label: 'Rampa',                 short: 'RMP', color: '#d8443c', scope: 'cheek' },
    { id: 'wave',     label: 'Onda',                  short: 'OND', color: '#d8443c', scope: 'cheek' },
    { id: 'step',     label: 'Degrau',                short: 'DEG', color: '#d8443c', scope: 'cheek' },
    { id: 'etr',      label: 'Cristas exageradas',    short: 'CTE', color: '#e08a1e', scope: 'cheek' },
    { id: 'diastema', label: 'Diastema',              short: 'DIA', color: '#e08a1e', scope: 'cheek' },
    { id: 'perio',    label: 'Bolsa periodontal',     short: 'PER', color: '#b4341d', scope: 'cheek' },
    { id: 'caries',   label: 'Cárie de infundíbulo',  short: 'CÁR', color: '#d8443c', scope: 'cheek' },
    { id: 'fracture', label: 'Dente fraturado',       short: 'FRA', color: '#b4341d', scope: 'any' },
    { id: 'missing',  label: 'Dente ausente',         short: 'AUS', color: '#8a8f93', scope: 'any' },
    { id: 'displaced',label: 'Dente deslocado',       short: 'DES', color: '#e08a1e', scope: 'cheek' },
    { id: 'eotrh',    label: 'EOTRH',                 short: 'EOT', color: '#b4341d', scope: 'incisor' },
    { id: 'smooth',   label: 'Desgaste/alisado',      short: 'ALI', color: '#e08a1e', scope: 'cheek' },
  ];

  /* ---------------- Tratamentos realizados ---------------- */
  const TREATMENTS = [
    { id: 'float',     label: 'Nivelamento (lima)',     short: 'NIV', color: '#2f6fed', scope: 'cheek' },
    { id: 'reduce',    label: 'Redução gancho/rampa',   short: 'RED', color: '#2f6fed', scope: 'cheek' },
    { id: 'extract',   label: 'Extração realizada',     short: 'EXT', color: '#2f6fed', scope: 'any' },
    { id: 'wolf_ext',  label: 'Extração dente de lobo', short: 'LOB', color: '#2f6fed', scope: 'any' },
    { id: 'diastema_tx', label: 'Tratamento de diastema', short: 'TDA', color: '#2f6fed', scope: 'cheek' },
  ];

  /* ---------------- Ícones soltos (livre posicionamento) ---------------- */
  const DROP_ICONS = [
    { id: 'pin_red',   label: 'Marca vermelha', color: '#d8443c' },
    { id: 'pin_amber', label: 'Marca âmbar',    color: '#e08a1e' },
    { id: 'pin_blue',  label: 'Marca azul',     color: '#2f6fed' },
    { id: 'star',      label: 'Atenção',        color: '#b4341d' },
  ];

  /* ---------------- Cores das ferramentas de desenho ---------------- */
  const PEN_COLORS = ['#1d2a2a', '#d8443c', '#2f6fed', '#0d7d6e', '#e08a1e'];

  const ALL_MARKS = {};
  [...ABNORMALITIES, ...TREATMENTS].forEach((m) => { ALL_MARKS[m.id] = m; });

  /* ---- Achados do odontograma (modelo VetTooth Pro) ---- */
  const STATUSES = [
    { id: 'normal', label: 'Normal', color: '#2bb673' },
    { id: 'carie', label: 'Cárie', color: '#e0533c' },
    { id: 'fratura', label: 'Fratura', color: '#e2912a' },
    { id: 'gengivite', label: 'Gengivite', color: '#8b5cf6' },
    { id: 'reabsorcao', label: 'Reabsorção', color: '#7c3aed' },
    { id: 'abrasao', label: 'Abrasão', color: '#eab308' },
    { id: 'extraido', label: 'Extraído', color: '#5f6b78' },
    { id: 'ausente', label: 'Ausente', color: '#9aa6b2' },
    { id: 'restauracao', label: 'Restauração', color: '#2f6fed' },
    { id: 'outros', label: 'Outros', color: '#14a8a0' },
  ];
  const FINDINGS = [
    { id: 'carie', label: 'Cárie', color: '#e0533c', icon: 'carie' },
    { id: 'fratura', label: 'Fratura', color: '#e2912a', icon: 'fratura' },
    { id: 'gengivite', label: 'Gengivite', color: '#8b5cf6', icon: 'gengivite' },
    { id: 'restauracao', label: 'Restauração', color: '#2f6fed', icon: 'restauracao' },
    { id: 'extraido', label: 'Extraído', color: '#5f6b78', icon: 'extraido' },
    { id: 'ausente', label: 'Ausente', color: '#9aa6b2', icon: 'ausente' },
    { id: 'bolsa', label: 'Bolsa', color: '#0ea5a0', icon: 'bolsa' },
    { id: 'outros', label: 'Outros', color: '#14a8a0', icon: 'outros' },
  ];
  STATUSES.forEach((s) => { ALL_MARKS[s.id] = s; });
  FINDINGS.forEach((s) => { if (!ALL_MARKS[s.id]) ALL_MARKS[s.id] = s; });

  window.EquiData = {
    QUADRANTS,
    CHEEK_POS,
    INCISOR_POS,
    occlusal: buildOcclusal(),
    lateral: buildLateral(),
    ABNORMALITIES,
    TREATMENTS,
    DROP_ICONS,
    PEN_COLORS,
    STATUSES,
    FINDINGS,
    ALL_MARKS,
    makeTooth,
    toothType,
    POS_NAME,
  };
})();
