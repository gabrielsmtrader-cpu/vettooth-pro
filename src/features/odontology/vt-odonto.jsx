/* ============================================================
   VetTooth Pro — Odontograma multiespécie (estilo dental chart)
   Equino (44 · Triadan) · Cães (42) · Gatos (30)
   SVG anatômico clicável + painel do dente + histórico + ferramentas
   Exposto como window.OdontogramaModule
   ============================================================ */

/* ---------------- Condições ---------------- */
window.OD_CONDS = [
  { id: 'normal',       label: 'Normal',       short: '',   color: '#14a8a0' },
  { id: 'ausente',      label: 'Ausente',      short: 'AU', color: '#9ca3af' },
  { id: 'fratura',      label: 'Fratura',      short: 'FX', color: '#ef4444' },
  { id: 'reabsorcao',   label: 'Reabsorção',   short: 'TR', color: '#8b5cf6' },
  { id: 'carie',        label: 'Cárie',        short: 'CC', color: '#f97316' },
  { id: 'abrasao',      label: 'Abrasão',      short: 'AB', color: '#eab308' },
  { id: 'atricao',      label: 'Atrição',      short: 'AT', color: '#d97706' },
  { id: 'gengivite',    label: 'Gengivite',    short: 'GE', color: '#ec4899' },
  { id: 'periodontite', label: 'Periodontite', short: 'PD', color: '#b91c1c' },
  { id: 'massa',        label: 'Massa',        short: 'MA', color: '#7c3aed' },
];
window.OD_COND_MAP = window.OD_CONDS.reduce((m, c) => { m[c.id] = c; return m; }, {});

/* legenda exigida no rodapé (subconjunto com cores fixas) */
window.OD_LEGEND = ['normal', 'ausente', 'fratura', 'carie', 'reabsorcao', 'abrasao'];

/* ---------------- Espécies (Triadan) ---------------- */
window.OD_SPECIES = {
  equino: { key: 'equino', label: 'Equino', emoji: '🐴', total: 44, match: /cavalo|equ|égua|egua|potr|muar|asin/i,
    up: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], low: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  caes: { key: 'caes', label: 'Cães', emoji: '🐶', total: 42, match: /c[ãa]o|cachorr|canin/i,
    up: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], low: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  gatos: { key: 'gatos', label: 'Gatos', emoji: '🐱', total: 30, match: /gato|felin/i,
    up: [1, 2, 3, 4, 6, 7, 8, 9], low: [1, 2, 3, 4, 7, 8, 9] },
};

function odToothName(species, pos) {
  if (species === 'equino') {
    return ({ 1: 'Pinça (I1)', 2: 'Médio (I2)', 3: 'Canto (I3)', 4: 'Canino', 5: 'Dente de lobo (PM1)',
      6: '2º pré-molar (06)', 7: '3º pré-molar (07)', 8: '4º pré-molar (08)', 9: '1º molar (09)', 10: '2º molar (10)', 11: '3º molar (11)' })[pos] || ('Dente ' + pos);
  }
  return ({ 1: 'Incisivo 1', 2: 'Incisivo 2', 3: 'Incisivo 3', 4: 'Canino', 5: 'Pré-molar 1',
    6: 'Pré-molar 2', 7: 'Pré-molar 3', 8: 'Pré-molar 4', 9: 'Molar 1', 10: 'Molar 2', 11: 'Molar 3' })[pos] || ('Dente ' + pos);
}

/* layout em arco dentário (linear em X + elevação cosseno) */
function odLayout(species) {
  const cfg = window.OD_SPECIES[species];
  const TW = 27, STEP = 33, GAP = 32, VBW = 780, LIFT = 64;
  const upperEndsY = 122, lowerEndsY = 178;
  const mk = (quad, pos, jaw) => ({ num: quad * 100 + pos, quad, pos, jaw, name: odToothName(species, pos) });
  const q1 = cfg.up.map((p) => mk(1, p, 'upper'));
  const q2 = cfg.up.map((p) => mk(2, p, 'upper'));
  const q4 = cfg.low.map((p) => mk(4, p, 'lower'));
  const q3 = cfg.low.map((p) => mk(3, p, 'lower'));
  const upper = [...q1.slice().reverse(), ...q2];
  const lower = [...q4.slice().reverse(), ...q3];
  const place = (row, splitIdx, endsY, dir) => {
    const rowW = row.length * STEP + GAP;
    const offX = (VBW - rowW) / 2;
    const half = rowW / 2;
    let x = offX;
    row.forEach((t, i) => {
      if (i === splitIdx) x += GAP;
      const cx = x + TW / 2; x += STEP;
      const param = Math.max(-1, Math.min(1, (cx - VBW / 2) / half));
      const lift = LIFT * Math.cos(param * Math.PI / 2);
      t.cx = cx; t.cy = dir > 0 ? endsY - lift : endsY + lift;
    });
  };
  place(upper, q1.length, upperEndsY, 1);
  place(lower, q4.length, lowerEndsY, -1);
  return { teeth: [...upper, ...lower], upper, lower, VBW, VBH: 300, TW, TH: 33 };
}

function odToothVisual(entry) {
  if (!entry || !entry.cond) return { fill: '#ffffff', stroke: '#d7dde3', text: '#94a2b0' };
  if (entry.cond === 'normal') return { fill: '#d3ece8', stroke: '#86cdc5', text: '#0c7d76' };
  if (entry.cond === 'ausente') return { fill: '#eceff2', stroke: '#c2cad2', text: '#9098a2', missing: true };
  const c = window.OD_COND_MAP[entry.cond];
  return { fill: c.color, stroke: 'rgba(15,30,45,.22)', text: '#ffffff' };
}

/* ---------------- persistência (localStorage) ---------------- */
function odKey(patientId, species, suf) { return `vt-odonto:${patientId || '_avulso'}:${species}${suf || ''}`; }
function odLoad(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function odStore(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

/* ============================================================
   Camada de desenho (lápis / seta / círculo · 4 cores)
   ============================================================ */
function OdDrawLayer({ tool, color, shapes, setShapes, vbw, vbh }) {
  const ref = React.useRef(null);
  const [draft, setDraft] = React.useState(null);
  const toPt = (e) => {
    const svg = ref.current; if (!svg) return { x: 0, y: 0 };
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
    const r = p.matrixTransform(m.inverse()); return { x: r.x, y: r.y };
  };
  const down = (e) => {
    if (tool === 'select') return;
    e.preventDefault(); const { x, y } = toPt(e);
    if (tool === 'pencil') setDraft({ tool, color, pts: [[x, y]] });
    else setDraft({ tool, color, x0: x, y0: y, x1: x, y1: y });
    try { ref.current.setPointerCapture(e.pointerId); } catch (er) {}
  };
  const move = (e) => {
    if (!draft) return; const { x, y } = toPt(e);
    if (draft.tool === 'pencil') setDraft((d) => ({ ...d, pts: [...d.pts, [x, y]] }));
    else setDraft((d) => ({ ...d, x1: x, y1: y }));
  };
  const up = () => { if (draft) { setShapes([...shapes, draft]); setDraft(null); } };
  const renderShape = (s, i) => {
    if (s.tool === 'pencil') return <polyline key={i} points={s.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />;
    if (s.tool === 'arrow') return <line key={i} x1={s.x0} y1={s.y0} x2={s.x1} y2={s.y1} stroke={s.color} strokeWidth="2.6" strokeLinecap="round" markerEnd={`url(#odarrow-${s.color.replace('#', '')})`} />;
    if (s.tool === 'circle') { const cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2; return <ellipse key={i} cx={cx} cy={cy} rx={Math.abs(s.x1 - s.x0) / 2} ry={Math.abs(s.y1 - s.y0) / 2} fill="none" stroke={s.color} strokeWidth="2.4" />; }
    return null;
  };
  const colors = ['#14a8a0', '#ef4444', '#16395f', '#e2912a'];
  return (
    <svg ref={ref} className="odm-draw" viewBox={`0 0 ${vbw} ${vbh}`} preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: tool === 'select' ? 'none' : 'all', cursor: tool === 'select' ? 'default' : 'crosshair' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
      <defs>
        {colors.map((c) => (
          <marker key={c} id={`odarrow-${c.replace('#', '')}`} markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L7,3 L0,6 z" fill={c} />
          </marker>
        ))}
      </defs>
      {shapes.map(renderShape)}
      {draft && renderShape(draft, 'draft')}
    </svg>
  );
}

/* ============================================================
   Painel do dente
   ============================================================ */
function OdToothPanel({ tooth, entry, onChange, onClose, species }) {
  if (!tooth) {
    return (
      <div className="odm-panel">
        <div className="odm-panel-empty">
          <span className="odm-panel-empty-ic"><VtIcon name="tooth" size={26} /></span>
          <b>Nenhum dente selecionado</b>
          <p>Clique em um dente no diagrama para registrar a condição, severidade e tratamento.</p>
        </div>
      </div>
    );
  }
  const e = entry || {};
  const set = (patch) => onChange(tooth.num, { ...e, ...patch });
  const condColor = e.cond ? window.OD_COND_MAP[e.cond].color : '#94a2b0';
  return (
    <div className="odm-panel">
      <div className="odm-panel-head">
        <div className="odm-panel-tooth"><span className="odm-tnum" style={{ background: condColor }}>{tooth.num}</span>
          <div><b>{tooth.name}</b><i>{({ 1: 'Superior direito', 2: 'Superior esquerdo', 3: 'Inferior esquerdo', 4: 'Inferior direito' })[tooth.quad]}</i></div>
        </div>
        <button className="odm-panel-x" onClick={onClose}>×</button>
      </div>

      <div className="odm-field-label">Condição clínica</div>
      <div className="odm-cond-grid">
        {window.OD_CONDS.map((c) => (
          <button key={c.id} className={`odm-cond${e.cond === c.id ? ' on' : ''}`} style={e.cond === c.id ? { '--cc': c.color } : null} onClick={() => set({ cond: c.id })}>
            <span className="odm-cond-dot" style={{ background: c.color }} />
            <span className="odm-cond-l">{c.label}</span>
            {c.short && <span className="odm-cond-badge" style={{ background: c.color }}>{c.short}</span>}
          </button>
        ))}
      </div>

      <div className="odm-field-label">Severidade</div>
      <div className="odm-sev">
        {[1, 2, 3, 4].map((n) => (
          <button key={n} className={`odm-star${(e.sev || 0) >= n ? ' on' : ''}`} onClick={() => set({ sev: e.sev === n ? 0 : n })} title={`${n} de 4`}>★</button>
        ))}
        <span className="odm-sev-l">{['—', 'Leve', 'Moderada', 'Acentuada', 'Severa'][e.sev || 0]}</span>
      </div>

      <div className="odm-field-label">Nota clínica</div>
      <textarea className="odm-note" value={e.note || ''} onChange={(ev) => set({ note: ev.target.value })} placeholder="Observações sobre o dente, conduta indicada…" />

      <button className={`odm-treated${e.treated ? ' on' : ''}`} onClick={() => set({ treated: !e.treated })}>
        <span className="odm-treated-l"><VtIcon name="check" size={16} /> Tratamento realizado</span>
        <span className="odm-switch"><i /></span>
      </button>

      {e.cond && (
        <button className="odm-clear-tooth" onClick={() => { onChange(tooth.num, null); }}>Limpar registro deste dente</button>
      )}
    </div>
  );
}

/* ============================================================
   Módulo principal
   ============================================================ */
function OdontogramaModule({ initialPatientId, slim, moduleRef }) {
  const allPatients = (() => { const d = window.VtStore && window.VtStore.getData(); return (d && d.patients) || []; })();
  const owners = (() => { const d = window.VtStore && window.VtStore.getData(); return (d && d.owners) || []; })();

  const [patientId, setPatientId] = React.useState(initialPatientId || (allPatients[0] && allPatients[0].id) || '');
  const patient = allPatients.find((p) => p.id === patientId) || null;

  const speciesFromPatient = (p) => {
    if (!p) return 'caes';
    const k = Object.keys(window.OD_SPECIES).find((key) => window.OD_SPECIES[key].match.test(p.species || ''));
    return k || 'caes';
  };
  const [species, setSpecies] = React.useState(speciesFromPatient(patient));
  React.useEffect(() => { if (patient) setSpecies(speciesFromPatient(patient)); }, [patientId]);

  const layout = React.useMemo(() => odLayout(species), [species]);

  /* estado do exame atual */
  const mkKey = odKey(patientId, species);
  const [marks, setMarks] = React.useState(() => odLoad(mkKey, {}));
  const [shapes, setShapes] = React.useState(() => odLoad(mkKey + ':draw', []));
  React.useEffect(() => { setMarks(odLoad(mkKey, {})); setShapes(odLoad(mkKey + ':draw', [])); setSelected(null); }, [mkKey]);
  React.useEffect(() => { odStore(mkKey, marks); }, [marks, mkKey]);
  React.useEffect(() => { odStore(mkKey + ':draw', shapes); }, [shapes, mkKey]);

  const [selected, setSelected] = React.useState(null);
  const [tool, setTool] = React.useState('select');
  const [drawColor, setDrawColor] = React.useState('#ef4444');
  const [histOpen, setHistOpen] = React.useState(false);

  const [history, setHistory] = React.useState(() => odLoad(`vt-odonto-hist:${patientId || '_avulso'}`, []));
  React.useEffect(() => { setHistory(odLoad(`vt-odonto-hist:${patientId || '_avulso'}`, [])); }, [patientId]);

  const updateTooth = (num, entry) => {
    setMarks((m) => { const next = { ...m }; if (entry === null) delete next[num]; else next[num] = entry; return next; });
  };

  /* resumo */
  const entries = Object.values(marks);
  const total = entries.length;
  const anorm = entries.filter((e) => e.cond && e.cond !== 'normal').length;
  const tratados = entries.filter((e) => e.treated).length;

  const novoExame = () => {
    if (total === 0) { window.vtToast('Nada para arquivar — registre dentes primeiro.', 'err'); return; }
    const id = 'EX-' + String(Date.now()).slice(-6);
    const condCount = {};
    entries.forEach((e) => { if (e.cond && e.cond !== 'normal') condCount[e.cond] = (condCount[e.cond] || 0) + 1; });
    const summary = Object.keys(condCount).length
      ? Object.keys(condCount).map((c) => `${condCount[c]}× ${window.OD_COND_MAP[c].label}`).join(' · ')
      : 'Sem anormalidades';
    const entry = { id, date: new Date().toLocaleDateString('pt-BR'), vet: (window.vtCurrentVet ? window.vtCurrentVet() : 'Equipe'),
      species, speciesLabel: window.OD_SPECIES[species].label, total, anorm, tratados, summary,
      marks: JSON.parse(JSON.stringify(marks)), shapes: JSON.parse(JSON.stringify(shapes)) };
    const next = [entry, ...history];
    setHistory(next); odStore(`vt-odonto-hist:${patientId || '_avulso'}`, next);
    setMarks({}); setShapes([]); setSelected(null);
    window.vtToast('Exame arquivado no histórico. Novo exame iniciado.', 'ok');
  };
  const loadExam = (ex) => {
    setSpecies(ex.species);
    setTimeout(() => { setMarks(ex.marks || {}); setShapes(ex.shapes || []); setSelected(null); setHistOpen(false); window.vtToast('Exame carregado.', 'ok'); }, 30);
  };
  const exportPdf = () => { window.vtToast('Gerando PDF do odontograma…', 'ok'); setTimeout(() => window.print(), 350); };

  const tools = [
    { id: 'select', icon: '↖', label: 'Selecionar' },
    { id: 'pencil', icon: '✎', label: 'Lápis' },
    { id: 'arrow', icon: '↗', label: 'Seta' },
    { id: 'circle', icon: '◯', label: 'Círculo' },
  ];
  const drawColors = ['#14a8a0', '#ef4444', '#16395f', '#e2912a'];

  /* expõe controles para o wizard via moduleRef */
  React.useEffect(() => {
    if (!moduleRef) return;
    moduleRef.current = {
      setTool,
      setDrawColor,
      clearShapes: () => setShapes([]),
      undoShape: () => setShapes((s) => s.slice(0, -1)),
      clearAll: () => { setMarks({}); setShapes([]); setSelected(null); },
      applyCondToSelected: (condId) => {
        if (!selected) { window.vtToast && window.vtToast('Clique em um dente primeiro.', 'err'); return; }
        updateTooth(selected, condId === null ? null : { cond: condId });
      },
      markTreated: () => {
        if (!selected) { window.vtToast && window.vtToast('Clique em um dente primeiro.', 'err'); return; }
        const cur = marks[selected] || {};
        updateTooth(selected, { ...cur, treated: !cur.treated });
      },
      getHistory: () => history,
      loadExam,
      novoExame,
      getTool: () => tool,
      getSelected: () => selected,
    };
  });

  const selTooth = selected ? layout.teeth.find((t) => t.num === selected) : null;

  return (
    <div className="odm">
      {/* ---- cabeçalho: paciente + espécie ---- */}
      <div className="odm-top" style={slim ? { display: 'none' } : undefined}>
        <div className="odm-patient">
          <label className="vtf" style={{ minWidth: 230 }}>
            <span className="vtf-label">Paciente</span>
            <span className="vtf-inputwrap"><select className="vtf-input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Avulso (sem paciente)</option>
              {allPatients.map((p, i) => <option key={p.id || ('p' + i)} value={p.id}>{p.name} · {p.species} · {p.owner}</option>)}
            </select></span>
          </label>
          {patient && (
            <div className="odm-patient-meta">
              <span className="odm-pet-ava">{window.OD_SPECIES[speciesFromPatient(patient)].emoji}</span>
              <div><b>{patient.name}</b><i>{patient.breed || '—'} · Tutor: {patient.owner}</i></div>
            </div>
          )}
        </div>
        <div className="odm-species">
          {Object.values(window.OD_SPECIES).map((s) => (
            <button key={s.key} className={`odm-sp${species === s.key ? ' on' : ''}`} onClick={() => { setSpecies(s.key); setSelected(null); }}>
              <span className="odm-sp-emoji">{s.emoji}</span>
              <span className="odm-sp-l">{s.label}</span>
              <span className="odm-sp-n">{s.total} dentes</span>
            </button>
          ))}
        </div>
      </div>

      {/* ---- resumo ---- */}
      <div className="odm-summary" style={slim ? { display: 'none' } : undefined}>
        <div className="odm-sum">
          <span className="odm-sum-ic teal"><VtIcon name="tooth" size={20} /></span>
          <div><span className="odm-sum-l">Dentes avaliados</span><span className="odm-sum-v">{total}<i>/ {window.OD_SPECIES[species].total}</i></span></div>
        </div>
        <div className="odm-sum">
          <span className="odm-sum-ic red"><VtIcon name="alert" size={20} /></span>
          <div><span className="odm-sum-l">Anormalidades</span><span className="odm-sum-v">{anorm}</span></div>
        </div>
        <div className="odm-sum">
          <span className="odm-sum-ic green"><VtIcon name="check" size={20} /></span>
          <div><span className="odm-sum-l">Tratados</span><span className="odm-sum-v">{tratados}</span></div>
        </div>
      </div>

      {/* ---- toolbar ---- */}
      <div className="odm-toolbar" style={slim ? { display: 'none' } : undefined}>
        <div className="odm-tb-left">
          <button className="odm-tb-btn primary" onClick={novoExame}><VtIcon name="plus" size={16} /> Novo exame</button>
          <button className="odm-tb-btn" onClick={() => setHistOpen(true)}><VtIcon name="receipt" size={16} /> Histórico <span className="odm-tb-count">{history.length}</span></button>
          <button className="odm-tb-btn" onClick={exportPdf}><VtIcon name="chart" size={16} /> Exportar PDF</button>
        </div>
        <div className="odm-tb-right">
          <div className="odm-tools">
            {tools.map((t) => (
              <button key={t.id} className={`odm-tool${tool === t.id ? ' on' : ''}`} onClick={() => setTool(t.id)} title={t.label}><span className="odm-tool-ic">{t.icon}</span></button>
            ))}
          </div>
          <div className="odm-swatches">
            {drawColors.map((c) => (
              <button key={c} className={`odm-swatch${drawColor === c ? ' on' : ''}`} style={{ background: c }} onClick={() => { setDrawColor(c); if (tool === 'select') setTool('pencil'); }} title={c} />
            ))}
          </div>
          {shapes.length > 0 && <button className="odm-tb-btn ghost" onClick={() => setShapes([])}>Limpar desenho</button>}
        </div>
      </div>

      {/* ---- corpo: diagrama + painel ---- */}
      <div className="odm-body">
        <div className="odm-chart-card">
          <div className="odm-chart-labels">
            <span>Superior</span>
            <span>Maxila / Mandíbula</span>
            <span>Inferior</span>
          </div>
          <div className="odm-chart-stage" style={{ aspectRatio: `${layout.VBW} / ${layout.VBH}` }}>
            <svg className="odm-svg" viewBox={`0 0 ${layout.VBW} ${layout.VBH}`} preserveAspectRatio="xMidYMid meet">
              {/* divisória maxila/mandíbula */}
              <line x1="40" y1="150" x2={layout.VBW - 40} y2="150" stroke="#e7ebf0" strokeWidth="1.5" strokeDasharray="4 5" />
              {/* rótulos de quadrante */}
              <text className="odm-quad" x="46" y="34">Superior Direito · 1</text>
              <text className="odm-quad" x={layout.VBW - 46} y="34" textAnchor="end">Superior Esquerdo · 2</text>
              <text className="odm-quad" x="46" y={layout.VBH - 8}>Inferior Direito · 4</text>
              <text className="odm-quad" x={layout.VBW - 46} y={layout.VBH - 8} textAnchor="end">Inferior Esquerdo · 3</text>
              {layout.teeth.map((t) => {
                const entry = marks[t.num];
                const v = odToothVisual(entry);
                const isSel = selected === t.num;
                const x = t.cx - layout.TW / 2, y = t.cy - layout.TH / 2;
                return (
                  <g key={t.num} className="odm-tooth" onClick={() => { if (tool === 'select') setSelected(t.num); }} style={{ cursor: tool === 'select' ? 'pointer' : 'inherit' }}>
                    <title>{t.num} · {t.name}{entry && entry.cond ? ' · ' + window.OD_COND_MAP[entry.cond].label : ''}</title>
                    {isSel && <rect x={x - 3.5} y={y - 3.5} width={layout.TW + 7} height={layout.TH + 7} rx="10" fill="none" stroke="#16395f" strokeWidth="2" />}
                    <rect x={x} y={y} width={layout.TW} height={layout.TH} rx="7" fill={v.fill} stroke={v.stroke} strokeWidth={isSel ? 2 : 1.4} />
                    {v.missing && <g stroke="#9098a2" strokeWidth="1.8" strokeLinecap="round"><line x1={x + 6} y1={y + 6} x2={x + layout.TW - 6} y2={y + layout.TH - 6} /><line x1={x + layout.TW - 6} y1={y + 6} x2={x + 6} y2={y + layout.TH - 6} /></g>}
                    <text x={t.cx} y={t.cy + 4} textAnchor="middle" className="odm-tnum-svg" fill={v.text}>{t.num}</text>
                    {entry && entry.cond && entry.cond !== 'normal' && entry.cond !== 'ausente' && window.OD_COND_MAP[entry.cond].short && (
                      <text x={t.cx} y={t.jaw === 'upper' ? y - 5 : y + layout.TH + 13} textAnchor="middle" className="odm-tcode" fill={window.OD_COND_MAP[entry.cond].color}>{window.OD_COND_MAP[entry.cond].short}</text>
                    )}
                    {entry && entry.treated && <circle cx={x + layout.TW - 2} cy={y + 2} r="5.5" fill="#1fa971" stroke="#fff" strokeWidth="1.4" />}
                    {entry && entry.treated && <text x={x + layout.TW - 2} y={y + 4.5} textAnchor="middle" className="odm-tcheck">✓</text>}
                  </g>
                );
              })}
            </svg>
            <OdDrawLayer tool={tool} color={drawColor} shapes={shapes} setShapes={setShapes} vbw={layout.VBW} vbh={layout.VBH} />
          </div>

          {/* legenda */}
          <div className="odm-legend">
            {window.OD_LEGEND.map((id) => { const c = window.OD_COND_MAP[id]; return (
              <span key={id} className="odm-legend-item"><span className="odm-legend-dot" style={{ background: c.color }} />{c.label}</span>
            ); })}
            <span className="odm-legend-item"><span className="odm-legend-dot ring" />Não avaliado</span>
          </div>
        </div>

        <OdToothPanel tooth={selTooth} entry={selTooth ? marks[selTooth.num] : null} onChange={updateTooth} onClose={() => setSelected(null)} species={species} />
      </div>

      {/* ---- histórico (modal) ---- */}
      {histOpen && (
        <div className="fin-modal-bg" onClick={() => setHistOpen(false)}>
          <div className="fin-modal odm-hist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="odm-hist-head"><h3>Histórico de exames {patient ? `· ${patient.name}` : ''}</h3><button className="odm-panel-x" onClick={() => setHistOpen(false)}>×</button></div>
            {history.length === 0 ? (
              <p className="odm-hist-empty">Nenhum exame arquivado ainda. Use <b>Novo exame</b> para arquivar o exame atual e iniciar outro.</p>
            ) : (
              <div className="odm-hist-list">
                {history.map((ex) => (
                  <div key={ex.id} className="odm-hist-row">
                    <div className="odm-hist-main">
                      <div className="odm-hist-top"><b>{ex.date}</b><span className="odm-hist-sp">{ex.speciesLabel}</span><i>{ex.vet}</i></div>
                      <div className="odm-hist-sum">{ex.summary}</div>
                    </div>
                    <div className="odm-hist-stats">
                      <span><b>{ex.total}</b> aval.</span><span className="red"><b>{ex.anorm}</b> anorm.</span><span className="green"><b>{ex.tratados}</b> trat.</span>
                    </div>
                    <button className="odm-hist-load" onClick={() => loadExam(ex)}>Carregar</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

window.OdontogramaModule = OdontogramaModule;
