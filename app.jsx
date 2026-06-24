/* ============================================================
   EquiChart / VetTooth — App do Odontograma (layout VetTooth Pro)
   ============================================================ */
const { useState, useEffect, useRef } = React;

const STORE_KEY = 'equichart:v2';

function buildToothMap() {
  const map = {};
  for (let q = 1; q <= 4; q++) for (let p = 1; p <= 11; p++) {
    const t = window.EquiData.makeTooth(q, p);
    map[t.id] = t;
  }
  return map;
}
const TOOTH_MAP = buildToothMap();

const STEPS = [
  { id: 'especie', label: 'Espécie' },
  { id: 'paciente', label: 'Paciente' },
  { id: 'anamnese', label: 'Anamnese' },
  { id: 'odontograma', label: 'Odontograma' },
  { id: 'achados', label: 'Achados' },
  { id: 'tratamento', label: 'Tratamento' },
  { id: 'finalizar', label: 'Finalizar' },
];

const EMPTY = {
  marks: {},        // { toothId: [findingId,...] }
  status: {},       // { toothId: statusId }
  notes: {},        // { toothId: 'texto' }
  severity: {},     // { toothId: 1..4 }
  strokes: [],
  drops: [],
  examDate: new Date().toISOString().slice(0, 10),
  odSpecies: '',     // Passo 1 — espécie escolhida (canino|felino|equino)
  arch: 'both',      // Passo 1 — arcada (upper|lower|both)
  anamnese: { mastigacao: '', halitose: '', disfagia: '', salivacao: '', peso: '', dor: '' },
  billing: [{ desc: 'Avaliação odontológica', price: 'R$ 250,00' }],
  preExam: { right: {}, left: {} },   // Passo 5 — examinação pré-atendimento
  postExam: { right: {}, left: {} },  // Passo 6 — examinação pós-atendimento
  findings5: {},     // { 'Grupo::Item': true }
  findingsOther: '', // campo livre de achados
  sedationLog: [],   // [{ hora, med, dose, obs }]
  clinicalNotes: '', // notas clínicas Passo 5
  photos: [],        // [{ id, name, url }]
  seeOverleaf: '',   // notas adicionais do relatório
  imposto: false,    // marcar como nota fiscal
  laudo: {},         // Passo 5 — campos de texto do laudo (anamnese, achadosOral, …)
};

function loadChart() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return { ...EMPTY, ...JSON.parse(raw) }; } catch (e) {}
  return EMPTY;
}

function AutoFit({ designWidth = 980, children }) {
  const wrapRef = useRef(null), innerRef = useRef(null);
  const [scale, setScale] = useState(1), [ih, setIh] = useState(0);
  useEffect(() => {
    const measure = () => {
      if (!wrapRef.current || !innerRef.current) return;
      setScale(Math.min(1, wrapRef.current.clientWidth / designWidth));
      setIh(innerRef.current.offsetHeight);
    };
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    measure();
    return () => ro.disconnect();
  }, [designWidth]);
  return (
    <div ref={wrapRef} className="eq-autofit">
      <div ref={innerRef} style={{ width: designWidth, transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: -(ih * (1 - scale)), marginLeft: -(designWidth * (1 - scale)) / 2, marginRight: -(designWidth * (1 - scale)) / 2 }}>
        {children}
      </div>
    </div>
  );
}

function App() {
  const params = new URLSearchParams(location.search);
  const entryPatient = params.get('patient') || '';
  const entryOwner = params.get('owner') || '';
  const entrySpecies = params.get('species') || '';
  const [chart, setChart] = useState(() => {
    let c = loadChart();
    // trocou de paciente em relação ao gráfico salvo → começa um exame novo (evita misturar marcações)
    if (entryPatient && c.patientName && c.patientName !== entryPatient) c = { ...EMPTY };
    if (entryPatient) {
      c.patientName = entryPatient;
      if (entryOwner) c.clientName = entryOwner;
      if (entrySpecies) c.patientSpecies = entrySpecies;
    }
    return c;
  });
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  // entrou pelo atendimento (paciente já definido) ou direto pelo odontograma:
  // em ambos os casos começa no Passo 1 (espécie & arcada), que já vem pré-selecionado
  const [step, setStep] = useState('especie');
  const [tool, setTool] = useState('select');
  const [penColor] = useState('#e0533c');
  const [selectedId, setSelectedId] = useState(null);
  const [layers, setLayers] = useState({ anatomia: true, achados: true, tratamentos: true, anotacoes: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(chart)); } catch (e) {} }, [chart]);

  const commit = (updater) => {
    setChart((prev) => { setPast((p) => [...p.slice(-80), prev]); setFuture([]); return typeof updater === 'function' ? updater(prev) : updater; });
  };
  const undo = () => setPast((p) => { if (!p.length) return p; setChart((c) => { setFuture((f) => [c, ...f]); return p[p.length - 1]; }); return p.slice(0, -1); });
  const redo = () => setFuture((f) => { if (!f.length) return f; setChart((c) => { setPast((p) => [...p, c]); return f[0]; }); return f.slice(1); });

  const toggleFinding = (id, fid) => commit((c) => {
    const cur = c.marks[id] || [];
    const next = cur.includes(fid) ? cur.filter((m) => m !== fid) : [...cur, fid];
    const marks = { ...c.marks }; if (next.length) marks[id] = next; else delete marks[id];
    return { ...c, marks };
  });
  const setStatus = (id, st) => commit((c) => ({ ...c, status: { ...c.status, [id]: st } }));
  const setNote = (id, txt) => setChart((c) => ({ ...c, notes: { ...c.notes, [id]: txt } }));
  const setSeverity = (id, n) => commit((c) => { const sev = { ...(c.severity || {}) }; if (n) sev[id] = n; else delete sev[id]; return { ...c, severity: sev }; });

  const addStroke = (s) => commit((c) => ({ ...c, strokes: [...c.strokes, s] }));
  const removeStroke = (i) => commit((c) => ({ ...c, strokes: c.strokes.filter((_, idx) => idx !== i) }));
  const addDrop = (d) => commit((c) => ({ ...c, drops: [...c.drops, d] }));
  const removeDrop = (i) => commit((c) => ({ ...c, drops: c.drops.filter((_, idx) => idx !== i) }));

  const onSave = () => {
    setSaved(true); setTimeout(() => setSaved(false), 1600);
    // snapshot do exame no histórico do paciente (para "Gráficos Anteriores")
    try {
      if (window.VtStore && chart.patientName) {
        const d = window.VtStore.getData() || {};
        const hist = { ...(d.odontoHistory || {}) };
        const snap = { date: chart.examDate || new Date().toISOString().slice(0, 10), savedAt: new Date().toISOString(), data: { marks: chart.marks, status: chart.status, severity: chart.severity, notes: chart.notes, preExam: chart.preExam, postExam: chart.postExam, findings5: chart.findings5, findingsOther: chart.findingsOther, sedationLog: chart.sedationLog, clinicalNotes: chart.clinicalNotes, achados: chart.achados, billing: chart.billing } };
        hist[chart.patientName] = [snap, ...(hist[chart.patientName] || [])].slice(0, 10);
        window.VtStore.setData({ odontoHistory: hist });
      }
    } catch (e) {}
  };
  const onLoadPrevious = () => {
    try {
      const d = (window.VtStore && window.VtStore.getData()) || {};
      const h = (d.odontoHistory || {})[chart.patientName] || [];
      if (!h.length) { window.vtToast && window.vtToast('Nenhum gráfico anterior para este paciente.', 'err'); return; }
      const prev = h[0];
      commit((c) => ({ ...c, ...prev.data }));
      window.vtToast && window.vtToast('Dados do último exame carregados.', 'ok');
    } catch (e) {}
  };
  const onExport = () => { try { window.vtToast && window.vtToast('Gerando PDF do odontograma…', 'ok'); } catch (e) {} setTimeout(() => window.print(), 300); };

  const onToothClick = (tooth) => {
    setSelectedId(tooth.id);
    if (tool.startsWith('mark:')) toggleFinding(tooth.id, tool.split(':')[1]);
  };

  const selectedTooth = selectedId ? (TOOTH_MAP[selectedId] || (window.SpeciesTeeth && window.SpeciesTeeth[selectedId]) || null) : null;
  const DRAW = ['pen', 'line', 'arrow', 'circle', 'rect', 'text', 'erase-art'];
  const drawMode = DRAW.includes(tool) ? tool : null;
  // espécie do paciente → escolhe o arco dentário (cão/gato = SpeciesArch; equino = chart equino)
  const patSpecies = (() => {
    if (chart.patientSpecies) return chart.patientSpecies;
    try { const d = (window.VtStore && window.VtStore.getData()) || {}; const p = (d.patients || []).find((x) => x.name === chart.patientName); return p ? p.species : ''; } catch (e) { return ''; }
  })();
  const isEquine = /cavalo|equ|égua|potr|mula|asin|jumento/i.test(patSpecies || '');
  const useSpeciesArch = !!patSpecies && !isEquine && !!window.SpeciesArch;

  const gotoStep = (s) => {
    if (s !== 'paciente' && s !== 'especie' && !(chart.patientName)) { window.alert && window.alert('Selecione um paciente no passo Paciente para continuar.'); return; }
    setStep(s);
  };
  return (
    <div className="od-app">
      <OdHeader step={step} setStep={gotoStep} onUndo={undo} onRedo={redo} canUndo={past.length > 0} canRedo={future.length > 0} onSave={onSave} saved={saved} chart={chart} examDate={chart.examDate} onExamDate={(v) => setChart((c) => ({ ...c, examDate: v }))} onExport={onExport} onLoadPrevious={onLoadPrevious} />

      {step === 'especie' && window.OdEspecieStep && (
        <window.OdEspecieStep chart={chart} setChart={setChart} go={gotoStep} entryPatient={!!entryPatient} />
      )}

      {step === 'odontograma' && (window.OdGraficoStep ? (
        <window.OdGraficoStep
          chart={chart} setChart={setChart}
          species={patSpecies} useSpeciesArch={useSpeciesArch} isEquine={isEquine}
          BaseSvgChart={BaseSvgChart}
          selectedId={selectedId} onToothClick={onToothClick} selectedTooth={selectedTooth}
          setStatus={setStatus} toggleFinding={toggleFinding} setNote={setNote} setSeverity={setSeverity}
          onClosePanel={() => setSelectedId(null)}
          layers={layers} setLayers={setLayers} go={gotoStep}
        />
      ) : (
        <div className="od-main">
          <div className="od-center">
            <div className="od-chart-card">
              <AutoFit designWidth={980}>
                <div className="od-design" onClick={() => { if (tool === 'select') setSelectedId(null); }}>
                  <div className={`od-chart-inner${!layers.anatomia ? ' hide-anat' : ''}`}>
                    {useSpeciesArch
                      ? <window.SpeciesArch species={patSpecies} marksByTooth={layers.achados ? chart.marks : {}} selectedId={selectedId} onToothClick={onToothClick} />
                      : <BaseSvgChart marksByTooth={layers.achados ? chart.marks : {}} selectedId={selectedId} onToothClick={onToothClick} />}
                    <div style={{ opacity: layers.tratamentos ? 1 : 0 }}>
                      <DrawingLayer mode={drawMode} penColor={penColor} strokes={chart.strokes} onStroke={addStroke} onRemoveStroke={removeStroke} drops={chart.drops} onDrop={addDrop} onRemoveDrop={removeDrop} />
                    </div>
                  </div>
                </div>
              </AutoFit>
              <div className="od-legend-strip">
                {window.EquiData.STATUSES.map((s) => (
                  <span key={s.id} className="od-legend-pill">{s.id === 'ausente' ? <span className="od-dot ring" /> : <span className="od-dot" style={{ background: s.color }} />}{s.label}</span>
                ))}
              </div>
            </div>

            <OdToolbar tool={tool} setTool={setTool} onUndo={undo} onRedo={redo} canUndo={past.length > 0} canRedo={future.length > 0} />

            <div className="od-bottom">
              <FindingsSummary marksByTooth={chart.marks} notes={chart.notes} />
              <LayersCard layers={layers} setLayers={setLayers} />
              <LegendCard />
            </div>
          </div>

          <ToothPanel
            tooth={selectedTooth}
            marks={selectedTooth ? (chart.marks[selectedTooth.id] || []) : []}
            status={selectedTooth ? (chart.status[selectedTooth.id] || 'normal') : 'normal'}
            note={selectedTooth ? (chart.notes[selectedTooth.id] || '') : ''}
            severity={selectedTooth ? ((chart.severity || {})[selectedTooth.id] || 0) : 0}
            onClose={() => setSelectedId(null)}
            onStatus={(s) => setStatus(selectedTooth.id, s)}
            onToggleFinding={(f) => toggleFinding(selectedTooth.id, f)}
            onNote={(t) => setNote(selectedTooth.id, t)}
            onSeverity={(n) => setSeverity(selectedTooth.id, n)}
          />
        </div>
      ))}

      {step !== 'odontograma' && step !== 'especie' && <StepPane step={step} chart={chart} setChart={setChart} commit={commit} go={gotoStep} onSave={onSave} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
