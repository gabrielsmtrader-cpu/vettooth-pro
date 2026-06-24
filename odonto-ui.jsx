/* ============================================================
   VetTooth — Odontograma (layout VetTooth Pro)
   Stepper, painel do dente, toolbar, achados, camadas, legenda
   ============================================================ */
const { useState: oUseState } = React;

/* ---- ícones de achados ---- */
function FindingIcon({ id }) {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const tooth = 'M8 3C6 3 4.6 4.6 4.6 7c0 1.7.6 2.8 1 4.8.4 2.2.3 5.4 1.6 5.4 1.2 0 1.2-2.4 1.8-4.3.3-.9.6-1.4 1-1.4s.7.5 1 1.4c.6 1.9.6 4.3 1.8 4.3 1.3 0 1.2-3.2 1.6-5.4.4-2 1-3.1 1-4.8C16.4 4.6 15 3 13 3c-1.3 0-1.8.7-2.5.7S9.3 3 8 3Z';
  const map = {
    carie: <g {...common}><path d={tooth} /><circle cx="12" cy="9" r="1.6" fill="currentColor" /></g>,
    fratura: <g {...common}><path d="M13 2 L8 11 L12 13 L7 22" /></g>,
    gengivite: <g {...common}><path d={tooth} /><path d="M5 16 Q12 13 19 16" /></g>,
    restauracao: <g {...common}><path d={tooth} /><path d="M9.5 8 h5 v4 h-5 z" fill="currentColor" stroke="none" /></g>,
    extraido: <g {...common}><path d={tooth} /><path d="M5 5 L19 19" /></g>,
    ausente: <g {...common}><path d={tooth} strokeDasharray="2.5 2.5" /></g>,
    bolsa: <g {...common}><path d={tooth} /><path d="M12 13 v5" /><circle cx="12" cy="19.5" r="1.4" fill="currentColor" stroke="none" /></g>,
    outros: <g {...common}><circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" /></g>,
  };
  return <svg {...common}>{map[id] ? map[id].props.children : map.outros.props.children}</svg>;
}

/* ---- painel lateral do dente ---- */
function ToothPanel({ tooth, marks, status, note, severity, onClose, onStatus, onToggleFinding, onNote, onSeverity }) {
  if (!tooth) {
    return (
      <div className="od-panel">
        <div className="od-panel-empty">
          <div className="od-panel-empty-ic"><FindingIcon id="outros" /></div>
          <b>Nenhum dente selecionado</b>
          <p>Toque em um dente no diagrama para ver o status, adicionar achados e anotações.</p>
        </div>
      </div>
    );
  }
  const D = window.EquiData;
  const sev = severity || 0;
  const cur = status || 'normal';
  return (
    <div className="od-panel">
      <div className="od-panel-head">
        <div className="od-panel-tooth">
          <span className="od-tnum" style={{ background: (D.ALL_MARKS[cur] || D.STATUSES[0]).color }}>{tooth.triadan}</span>
          <div><b>Dente {tooth.triadan}</b><i>{tooth.name} · {tooth.jaw === 'upper' ? 'Maxila' : 'Mandíbula'} {tooth.side === 'right' ? 'dir.' : 'esq.'}</i></div>
        </div>
        <button className="od-panel-x" onClick={onClose}>×</button>
      </div>

      <div className="od-field-label">Condição</div>
      <div className="od-cond-grid">
        {D.STATUSES.map((s) => (
          <button key={s.id} className={`od-cond${cur === s.id ? ' on' : ''}`} style={cur === s.id ? { '--cc': s.color } : undefined} onClick={() => onStatus(s.id)}>
            <span className="od-cond-dot" style={{ background: s.color }} />{s.label}
          </button>
        ))}
      </div>

      <div className="od-field-label">Severidade</div>
      <div className="od-sev">
        {[1, 2, 3, 4].map((n) => (
          <button key={n} className={`od-star${sev >= n ? ' on' : ''}`} onClick={() => onSeverity && onSeverity(sev === n ? 0 : n)} title={`${n} de 4`}>★</button>
        ))}
        <span className="od-sev-label">{['Sem grau', 'Leve', 'Moderada', 'Acentuada', 'Severa'][sev]}</span>
      </div>

      <div className="od-field-label">Adicionar achado</div>
      <div className="od-finding-grid">
        {D.FINDINGS.map((f) => {
          const on = marks.includes(f.id);
          return (
            <button key={f.id} className={`od-finding${on ? ' on' : ''}`} style={on ? { '--fc': f.color } : undefined} onClick={() => onToggleFinding(f.id)}>
              <span className="od-finding-ic" style={{ color: f.color }}><FindingIcon id={f.icon} /></span>
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      <div className="od-field-label">Anotações</div>
      <textarea className="od-note" maxLength={500} placeholder="Digite uma observação..." value={note || ''} onChange={(e) => onNote(e.target.value)} />
      <div className="od-note-count">{(note || '').length}/500</div>

      <div className="od-field-label">Histórico deste dente</div>
      <div className="od-history">{marks.length === 0 && !note && !sev ? 'Nenhum registro encontrado.' : `${marks.length} achado(s)${sev ? ' · severidade ' + sev + '/4' : ''} nesta avaliação.`}</div>
    </div>
  );
}

/* ---- barra de ferramentas horizontal (3 grupos — igual referência) ---- */
const OD_DRAW = [
  { id: 'pen', label: 'Lápis', icon: 'M4 20 L8 19 L19 8 L16 5 L5 16 Z M14 7 L17 10' },
  { id: 'erase-art', label: 'Borracha', icon: 'M7 17 L17 17 M5 14 L10 19 L20 9 L15 4 Z' },
  { id: 'fill', label: 'Preencher', icon: 'M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4 Z', half: true },
  { id: 'circle', label: 'Círculo', icon: 'M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4' },
  { id: 'line', label: 'Linha', icon: 'M4 20 L20 4' },
  { id: 'arrow', label: 'Seta', icon: 'M5 19 L19 5 M19 5 L12 5 M19 5 L19 12' },
];
/* formas/achados clínicos em teal (stamps) */
const OD_SHAPES = [
  { id: 'sh-atr', label: 'ATR/ETR', icon: 'M3 9 H6 V15 H8 V11 H16 V15 H18 V9 H21', fill: true },
  { id: 'sh-ramp', label: 'Ramps', icon: 'M4 18 L12 6 L20 18 Z', fill: true },
  { id: 'sh-prot', label: 'Protuberant', icon: 'M5 18 L20 18 L20 7 Z', fill: true },
  { id: 'sh-sharp', label: 'Sharp Edges', icon: 'M4 7 L4 18 L19 18 Z', fill: true },
  { id: 'sh-hook', label: 'Hooks', icon: 'M5 16 H19 M12 13 V6 M9 9 L12 6 L15 9', fill: false },
  { id: 'sh-inc', label: 'Incisors', icon: 'M4 11 q4 -4 8 0 t8 0 M4 16 q4 -4 8 0 t8 0', fill: false },
  { id: 'sh-wave', label: 'Waves', icon: 'M4 6 q4 6 8 0 t8 0 M4 18 q4 -6 8 0 t8 0', fill: false },
  { id: 'sh-move', label: 'Move', icon: 'M12 3 L12 21 M3 12 L21 12 M12 3 L9 6 M12 3 L15 6 M12 21 L9 18 M12 21 L15 18 M3 12 L6 9 M3 12 L6 15 M21 12 L18 9 M21 12 L18 15', fill: false },
  { id: 'sh-frac', label: 'Fracture', icon: 'M13 3 L5 13 L11 13 L9 21 L19 9 L13 9 Z', fill: true },
];
/* símbolos clínicos (botões escuros redondos) */
const OD_SYMS = [
  { id: 'sym-diast', label: 'Diastema', node: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M8 4 V20 M14 4 V20 M14 7 H19 M14 12 H19" /></svg> },
  { id: 'sym-wolf', label: 'Wolf tooth', node: <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#fff" strokeWidth="1.8" /><path d="M12 3 A9 9 0 0 1 12 21 Z" fill="#fff" /></svg> },
  { id: 'sym-caps', label: 'Caps', letter: 'C' },
  { id: 'sym-ulcer', label: 'Ulceration', letter: 'U' },
  { id: 'sym-tartar', label: 'Tartar', letter: 'T' },
];

function OdToolbar({ tool, setTool }) {
  return (
    <div className="od-toolbar3">
      <div className="od-tgroup">
        {OD_DRAW.map((t) => (
          <button key={t.id} className={`od-tbtn${tool === t.id ? ' active' : ''}`} title={t.label} onClick={() => setTool(t.id)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={t.half ? 'none' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} />{t.half ? <path d="M12 4 A8 8 0 0 1 12 20 Z" fill="currentColor" stroke="none" /> : null}</svg>
          </button>
        ))}
      </div>
      <div className="od-tgroup">
        {OD_SHAPES.map((s) => (
          <button key={s.id} className={`od-tbtn teal${tool === s.id ? ' active' : ''}`} title={s.label} onClick={() => setTool(s.id)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={s.fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon} /></svg>
          </button>
        ))}
      </div>
      <div className="od-tgroup">
        {OD_SYMS.map((s) => (
          <button key={s.id} className={`od-sym${tool === s.id ? ' active' : ''}`} title={s.label} onClick={() => setTool(s.id)}>
            {s.letter ? <span>{s.letter}</span> : s.node}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---- painéis inferiores ---- */
function FindingsSummary({ marksByTooth, notes }) {
  const rows = [];
  Object.entries(marksByTooth).forEach(([id, arr]) => arr.forEach((m) => { if (m !== 'normal') rows.push({ id, m }); }));
  rows.sort((a, b) => Number(a.id) - Number(b.id));
  return (
    <div className="od-bottom-card grow">
      <h4>Achados e tratamentos</h4>
      {rows.length === 0
        ? <p className="od-bottom-empty">Nenhum achado registrado. Selecione um dente e adicione um achado.</p>
        : <div className="od-summary-list">
            {rows.map((r, i) => {
              const meta = window.markMeta(r.m);
              return <div key={i} className="od-summary-row"><span className="od-sum-tooth">{r.id}</span><span className="od-dot" style={{ background: meta.color }} /><span>{meta.label}</span><span className="od-sum-auto">"{r.id} — {autoText(meta.label)}"</span></div>;
            })}
          </div>}
    </div>
  );
}
function autoText(label) {
  const m = { 'Cárie': 'presença de cárie', 'Fratura': 'dente fraturado', 'Gengivite': 'gengivite localizada', 'Restauração': 'restauração presente', 'Extraído': 'dente extraído', 'Ausente': 'dente ausente', 'Bolsa': 'bolsa periodontal', 'Outros': 'achado registrado' };
  return m[label] || 'achado registrado';
}

function LayersCard({ layers, setLayers }) {
  const items = [['anatomia', 'Anatomia'], ['achados', 'Achados'], ['tratamentos', 'Tratamentos'], ['anotacoes', 'Anotações']];
  return (
    <div className="od-bottom-card">
      <h4>Camadas</h4>
      <div className="od-layers">
        {items.map(([id, label]) => (
          <label key={id} className="od-layer">
            <input type="checkbox" checked={!!layers[id]} onChange={() => setLayers((l) => ({ ...l, [id]: !l[id] }))} />
            <span className="od-check" />{label}
          </label>
        ))}
      </div>
    </div>
  );
}

function LegendCard() {
  const D = window.EquiData;
  return (
    <div className="od-bottom-card">
      <h4>Legenda</h4>
      <div className="od-legend-grid">
        {D.STATUSES.map((s) => (
          <div key={s.id} className="od-legend-item">
            {s.id === 'ausente'
              ? <span className="od-dot ring" />
              : <span className="od-dot" style={{ background: s.color }} />}
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ToothPanel, OdToolbar, FindingsSummary, LayersCard, LegendCard, FindingIcon, OD_DRAW, OD_SHAPES });

/* ---- Header com stepper de 6 passos ---- */
const OD_STEPS = [
  { id: 'especie', label: 'Passo 1', sub: 'Espécie' },
  { id: 'paciente', label: 'Passo 2', sub: 'Paciente' },
  { id: 'anamnese', label: 'Passo 3', sub: 'Anamnese' },
  { id: 'odontograma', label: 'Passo 4', sub: 'Odontograma' },
  { id: 'achados', label: 'Passo 5', sub: 'Achados' },
  { id: 'tratamento', label: 'Passo 6', sub: 'Tratamento' },
  { id: 'finalizar', label: 'Passo 7', sub: 'Cobrança' },
];

function OdHeader({ step, setStep, onUndo, onRedo, canUndo, canRedo, onSave, saved, chart, examDate, onExamDate, onExport, onLoadPrevious }) {
  const idx = OD_STEPS.findIndex((s) => s.id === step);
  const nm = (chart && chart.patientName) || '';
  const prevCount = (() => { try { const d = (window.VtStore && window.VtStore.getData()) || {}; return ((d.odontoHistory || {})[nm] || []).length; } catch (e) { return 0; } })();
  const pData = (() => { const d = (window.VtStore && window.VtStore.getData()) || {}; return (d.patients || []).find((p) => p.name === nm) || {}; })();
  const ageStr = pData.birth && window.ageFrom ? window.ageFrom(pData.birth) : (pData.idade || '');
  const initial = nm ? nm[0].toUpperCase() : '—';
  const line1 = nm ? `${nm}${pData.breed && pData.breed !== '—' ? ' (' + pData.breed + ')' : ''}${ageStr ? ' · ' + ageStr : ''}` : 'Nenhum paciente selecionado';
  const line2 = nm ? [pData.species, pData.owner].filter(Boolean).join(' · ') : 'Selecione no Passo 2';
  const sp = (pData.species || '').toLowerCase();
  const spEmoji = /gato|felin/.test(sp) ? '🐱' : /cavalo|equ|égua|potr/.test(sp) ? '🐴' : /boi|vaca|bovin/.test(sp) ? '🐮' : /ave|p[aá]ssaro|calop|periqu|papag/.test(sp) ? '🐦' : /coelho/.test(sp) ? '🐰' : (pData.species ? '🐶' : '');
  const pct = OD_STEPS.length > 1 ? (idx / (OD_STEPS.length - 1)) * 100 : 0;
  return (
    <header className="od-header">
      <div className="od-header-top">
        <div className="od-patient-sel">
          <span className="od-pet-ava">{initial}</span>
          <div>
            <div className="od-patient-name">{line1}</div>
            <div className="od-patient-meta">{line2}</div>
          </div>
        </div>
        <div className="od-header-meta">
          <span className="od-meta-pill"><span className="od-meta-emoji">{spEmoji || '🦷'}</span>{pData.species || 'Espécie'}</span>
          <label className="od-meta-date"><span>Data do exame</span><input type="date" value={examDate || ''} onChange={(e) => onExamDate && onExamDate(e.target.value)} /></label>
        </div>
        <div className="od-header-actions">
          <button className="od-ic-btn od-prev-btn" onClick={() => onLoadPrevious && onLoadPrevious()} disabled={!nm} title="Gráficos anteriores deste paciente">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v6h6M3 13a9 9 0 1 0 3-7L3 9" /></svg>
            {prevCount > 0 && <span className="od-prev-badge">{prevCount}</span>}
          </button>
          <button className="od-btn-prev" onClick={() => onLoadPrevious && onLoadPrevious()} disabled={!nm} title="Carregar dados do último exame">Load Previous</button>
          <button className="od-ic-btn" disabled={!canUndo} onClick={onUndo} title="Desfazer"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 7 L4 12 L9 17 M4 12 H14 a5 5 0 0 1 0 10 H11" /></svg></button>
          <button className="od-ic-btn" disabled={!canRedo} onClick={onRedo} title="Refazer"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 7 L20 12 L15 17 M20 12 H10 a5 5 0 0 0 0 10 H13" /></svg></button>
          <button className="od-pdf" onClick={onExport} title="Exportar PDF"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12 M8 11l4 4 4-4 M5 21h14" /></svg> Exportar PDF</button>
          <button className="od-save" onClick={onSave}>{saved ? 'Salvo ✓' : 'Salvar rascunho'}</button>
        </div>
      </div>
      <div className="od-stepper">
        {OD_STEPS.map((s, i) => (
          <button key={s.id} className={`od-step${step === s.id ? ' active' : ''}${i < idx ? ' done' : ''}`} onClick={() => setStep(s.id)}>
            <span className="od-step-num">{i < idx ? '✓' : i + 1}</span>
            <span className="od-step-label">{s.label}<i className="od-step-sub">{s.sub}</i></span>
          </button>
        ))}
      </div>
      <div className="od-progress"><span className="od-progress-fill" style={{ width: pct + '%' }} /></div>
    </header>
  );
}

/* ---- demais passos ---- */
function StepField({ label, value, onChange, placeholder, area }) {
  return (
    <label className="od-sfield">
      <span>{label}</span>
      {area
        ? <textarea value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

/* ---- catálogo de tratamentos & anormalidades (configurável) ---- */
window.OD_FIND_DEFAULT = {
  'Incisores': ['SOBREMORDIDA', 'SOBRESALIÊNCIA', 'FRATURA', 'CAUDA DE ANDORINHA', 'TÁRTARO', 'CÁRIE', 'DIASTEMA', 'EOTRH', 'EXTRAÇÃO', 'EXPOSIÇÃO CANAL PULPAR', 'RETRAÇÃO GENGIVAL'],
  'Caninos': ['ARREDONDAMENTO', 'FRATURA', 'PONTEAGUDO', 'TÁRTARO', 'AUSENTE', 'CÁLCULO', 'NÃO ERUPCIONADO', 'EXPOSIÇÃO CANAL PULPAR'],
  'Dente de Lobo': ['PRESENTE', 'AUSENTE', 'FRATURADO', 'EXTRAÇÃO', 'NÃO ERUPCIONADO'],
  'Premolares e Molares': ['RAMPA', 'GANCHO', 'PONTA EXCESSIVA', 'ONDA', 'DEGRAU', 'TÁRTARO', 'CÁRIE', 'DIASTEMA', 'FRATURA', 'EOTRH', 'EXTRAÇÃO', 'EXPOSIÇÃO CANAL PULPAR'],
  'Other': ['HALITOSE', 'GENGIVITE', 'PERIODONTITE', 'MOBILIDADE', 'OUTRO'],
};
window.odFindCats = function () { return ['Incisores', 'Caninos', 'Dente de Lobo', 'Premolares e Molares', 'Other']; };
window.odFindCatalog = function () {
  const d = (window.VtStore && window.VtStore.getData()) || {};
  return (d.odontoFindings) || window.OD_FIND_DEFAULT;
};
window.odSaveFindCatalog = function (cat) { if (window.VtStore) window.VtStore.setData({ odontoFindings: cat }); };

function OdAchados({ chart, setChart, go }) {
  const cats = window.odFindCats();
  const catalog = window.odFindCatalog();
  const [cat, setCat] = oUseState(cats[0]);
  const sel = chart.achados || {};   // { "Categoria::ITEM": { on:true, price:"0.00" } }
  const setSel = (next) => setChart((c) => ({ ...c, achados: next }));
  const key = (item) => cat + '::' + item;
  const toggle = (item) => { const k = key(item); const cur = sel[k] || {}; setSel({ ...sel, [k]: { ...cur, on: !cur.on } }); };
  const setPrice = (item, v) => { const k = key(item); setSel({ ...sel, [k]: { ...(sel[k] || {}), price: v } }); };
  const addToPlan = (item) => {
    const k = key(item); const cur = sel[k] || {};
    setSel({ ...sel, [k]: { ...cur, on: true } });
    setChart((c) => ({ ...c, billing: [...(c.billing || []), { id: 'B' + Date.now().toString(36), proc: item, price: 'R$ ' + (cur.price || '0,00') }] }));
    window.vtToast && window.vtToast(`"${item}" adicionado ao tratamento.`, 'ok');
  };
  const items = catalog[cat] || [];
  return (
    <div className="od-step-pane od-ach2">
      <div className="od-p1-head"><h2>Tratamentos e Anormalidades</h2><button className="od-link" onClick={() => { if (window.parent !== window) { /* open config */ } window.vtToast && window.vtToast('Configure os itens em Configurações › Odontograma.', 'ok'); }}>⚙ Configurar itens</button></div>
      <div className="od-ach2-grid">
        <div className="od-card od-ach2-side">
          {cats.map((c) => <button key={c} className={`od-ach2-cat${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
        </div>
        <div className="od-card od-ach2-list">
          {items.map((item) => {
            const st = sel[key(item)] || {};
            return (
              <div key={item} className="od-ach2-row">
                <button className={`od-ach2-check${st.on ? ' on' : ''}`} onClick={() => toggle(item)}>{st.on ? '✓' : ''}</button>
                <span className="od-ach2-name">{item}</span>
                <span className="od-ach2-price"><i>R$</i><input value={st.price || ''} onChange={(e) => setPrice(item, e.target.value)} placeholder="0,00" /></span>
                <button className="od-ach2-add" onClick={() => addToPlan(item)}>+</button>
              </div>
            );
          })}
          {items.length === 0 && <p className="od-bottom-empty">Nenhum item nesta categoria. Configure em Configurações › Odontograma.</p>}
        </div>
      </div>
      <div className="od-step-actions"><button className="od-back-btn" onClick={() => go('odontograma')}>← Anterior</button><button className="od-next" onClick={() => go('tratamento')}>Próximo →</button></div>
    </div>
  );
}
Object.assign(window, { OdAchados });

function StepPane({ step, chart, setChart, commit, go, onSave }) {
  const A = chart.anamnese || {};
  const sA = (k) => (v) => setChart((c) => ({ ...c, anamnese: { ...c.anamnese, [k]: v } }));

  if (step === 'paciente') {
    return <OdPacienteStep chart={chart} setChart={setChart} go={go} />;
  }
  if (step === 'anamnese') {
    if (window.OdCondicoesStep) return <window.OdCondicoesStep chart={chart} setChart={setChart} go={go} />;
    const COND = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'n/a'];
    const TRAT = ['1 sem', '1 mês', '3 meses', '6 meses', '9 meses', '12 meses', 'Nunca', 'Desconhecido', 'n/a'];
    const condIdx = A.condIdx == null ? COND.length - 1 : A.condIdx;
    const tratIdx = A.tratIdx == null ? TRAT.length - 1 : A.tratIdx;
    return (
      <div className="od-step-pane">
        <h2>Condição & Sedação</h2>
        <p>Escore de condição corporal, último tratamento e histórico clínico.</p>
        <div className="od-card">
          <div className="od-slider-block">
            <h4 className="od-slider-title">Escore de Condição</h4>
            <div className="od-slider-scale">{COND.map((v, i) => <span key={i} className={i === condIdx ? 'on' : ''}>{v}</span>)}</div>
            <input type="range" className="od-range" min="0" max={COND.length - 1} value={condIdx} onChange={(e) => sA('condIdx')(Number(e.target.value))} />
          </div>
          <div className="od-slider-block" style={{ marginTop: 22 }}>
            <h4 className="od-slider-title">Último Tratamento</h4>
            <div className="od-slider-scale">{TRAT.map((v, i) => <span key={i} className={i === tratIdx ? 'on' : ''}>{v}</span>)}</div>
            <input type="range" className="od-range" min="0" max={TRAT.length - 1} value={tratIdx} onChange={(e) => sA('tratIdx')(Number(e.target.value))} />
          </div>
        </div>
        <div className="od-card" style={{ marginTop: 14 }}>
          <h4 className="od-slider-title">Notas de Histórico Clínico</h4>
          <textarea className="od-notes" value={A.notas || ''} onChange={(e) => sA('notas')(e.target.value)} placeholder="Histórico clínico, observações relevantes, tratamentos anteriores..." />
        </div>
        <button className={`od-sedation${A.sedacao ? ' on' : ''}`} onClick={() => sA('sedacao')(!A.sedacao)}>
          <span>Sedação</span>
          <span className="od-sed-switch"><i /></span>
        </button>
        <div className="od-step-actions"><button className="od-back-btn" onClick={() => go('paciente')}>← Anterior</button><button className="od-next" onClick={() => go('odontograma')}>Próximo →</button></div>
      </div>
    );
  }
  if (step === 'achados') {
    return <OdAchados chart={chart} setChart={setChart} go={go} />;
  }
  if (step === 'tratamento') {
    const OdTratamentoStep = window.OdTratamentoStep;
    if (OdTratamentoStep) return <OdTratamentoStep chart={chart} setChart={setChart} commit={commit} go={go} />;
  }
  if (step === 'finalizar') {
    const OdFinalizarStep = window.OdFinalizarStep;
    if (OdFinalizarStep) return <OdFinalizarStep chart={chart} setChart={setChart} go={go} onSave={onSave} />;
  }
  // fallback finalizar (caso o módulo de passos não carregue)
  const findCount = Object.values(chart.marks).reduce((s, a) => s + a.filter((m) => m !== 'normal').length, 0);
  return (
    <div className="od-step-pane">
      <h2>Finalizar</h2>
      <p>Revise e gere o relatório do atendimento.</p>
      <div className="od-card od-final">
        <div className="od-final-row"><span>Paciente</span><b>{chart.patientName || '—'}</b></div>
        <div className="od-final-row"><span>Achados registrados</span><b>{findCount}</b></div>
        <div className="od-final-row"><span>Itens de tratamento</span><b>{(chart.billing || []).length}</b></div>
        <div className="od-final-actions">
          <button className="od-next" onClick={() => window.print()}>🖨 Gerar relatório (PDF)</button>
          <button className="od-back-btn" onClick={() => go('odontograma')}>Voltar ao odontograma</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OdHeader, StepPane });

/* ---- Passo 1: seleção de Responsável & Paciente (2 colunas) ---- */
function OdPacienteStep({ chart, setChart, go }) {
  const d = (window.VtStore && window.VtStore.getData()) || {};
  const patients = d.patients || [];
  // tutores = owners cadastrados + donos derivados dos pacientes
  const tutores = (() => {
    const list = (d.owners || []).map((o) => ({ id: o.id, name: o.name }));
    patients.forEach((p) => { if (p.owner && !list.some((o) => o.name === p.owner)) list.push({ id: 'C-' + p.id, name: p.owner }); });
    return list;
  })();
  // propriedades = cadastradas + derivadas dos pacientes
  const props = (() => {
    const list = (d.propriedades || []).map((pr) => ({ id: pr.id, name: pr.name }));
    patients.forEach((p) => { const n = p.property && p.property.name; if (n && !list.some((x) => x.name === n)) list.push({ id: 'PR-' + p.id, name: n }); });
    return list;
  })();
  const [mode, setMode] = oUseState('tutor'); // tutor | propriedade
  const [qL, setQL] = oUseState('');
  const [qP, setQP] = oUseState('');
  const selKey = chart.filterKey || '';   // nome do tutor/propriedade selecionado
  const selPatient = chart.patientName || '';
  const leftList = (mode === 'tutor' ? tutores : props).filter((o) => o.name.toLowerCase().includes(qL.toLowerCase()));
  const horses = patients.filter((p) => {
    if (selKey) { if (mode === 'tutor' && p.owner !== selKey) return false; if (mode === 'propriedade' && !(p.property && p.property.name === selKey)) return false; }
    return p.name.toLowerCase().includes(qP.toLowerCase());
  });
  const pickL = (o) => setChart((c) => ({ ...c, filterKey: c.filterKey === o.name ? '' : o.name, filterMode: mode }));
  const pickP = (p) => setChart((c) => ({ ...c, clientName: p.owner || c.clientName, patientName: p.name, patientId: p.id, patientSpecies: p.species }));
  const switchMode = (m) => { setMode(m); setQL(''); setChart((c) => ({ ...c, filterKey: '' })); };
  return (
    <div className="od-step-pane">
      <div className="od-p1-head"><h2>Selecionar Paciente</h2><span className="od-p1-hint">Busque por paciente, tutor ou propriedade</span></div>
      <div className="od-p1-grid">
        <div className="od-card od-p1-col">
          <div className="od-p1-tabs">
            <button className={mode === 'tutor' ? 'on' : ''} onClick={() => switchMode('tutor')}>Tutores ({tutores.length})</button>
            <button className={mode === 'propriedade' ? 'on' : ''} onClick={() => switchMode('propriedade')}>Propriedades ({props.length})</button>
          </div>
          <div className="od-p1-search"><span className="od-p1-mag">⌕</span><input value={qL} onChange={(e) => setQL(e.target.value)} placeholder={mode === 'tutor' ? 'Buscar tutor...' : 'Buscar propriedade...'} /></div>
          {leftList.map((o) => <button key={o.id} className={`od-p1-row${selKey === o.name ? ' on' : ''}`} onClick={() => pickL(o)}><span>{o.name}<i className="od-p1-sp"> · {patients.filter((p) => mode === 'tutor' ? p.owner === o.name : (p.property && p.property.name === o.name)).length} paciente(s)</i></span><span className="od-p1-chev">›</span></button>)}
          {leftList.length === 0 && <p className="od-p1-empty">{mode === 'tutor' ? 'Nenhum tutor encontrado.' : 'Nenhuma propriedade encontrada.'}</p>}
        </div>
        <div className="od-card od-p1-col">
          <div className="od-p1-colhead"><b>Pacientes {selKey ? `· ${selKey}` : ''}</b>{selKey ? <button className="od-link" onClick={() => setChart((c) => ({ ...c, filterKey: '' }))}>Limpar filtro</button> : null}</div>
          <div className="od-p1-search"><span className="od-p1-mag">⌕</span><input value={qP} onChange={(e) => setQP(e.target.value)} placeholder="Buscar paciente..." /></div>
          {horses.map((p) => <button key={p.id} className={`od-p1-row${selPatient === p.name ? ' on' : ''}`} onClick={() => pickP(p)}><span>{p.name} <i className="od-p1-sp">{p.species}{p.owner ? ' · ' + p.owner : ''}</i></span><span className="od-p1-chev">›</span></button>)}
          {horses.length === 0 && <p className="od-p1-empty">Nenhum paciente encontrado.</p>}
        </div>
      </div>
      <div className="od-step-actions">
        {selPatient ? <span className="od-p1-selected">Selecionado: <b>{selPatient}</b></span> : null}
        <button className="od-next" disabled={!selPatient} style={!selPatient ? { opacity: .5, pointerEvents: 'none' } : null} onClick={() => go('anamnese')}>Próximo →</button>
      </div>
    </div>
  );
}
Object.assign(window, { OdPacienteStep });
