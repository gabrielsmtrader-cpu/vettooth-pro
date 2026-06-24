/* ============================================================
   EquiChart — painéis: dente selecionado, legenda, detalhes,
   notas, cobrança
   ============================================================ */

function Field({ label, value, onChange, type = 'text', placeholder, width }) {
  return (
    <label className="eq-field" style={width ? { width } : undefined}>
      <span className="eq-field-label">{label}</span>
      <input className="eq-input" type={type} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/* Painel do dente selecionado */
function SelectedToothPanel({ tooth, marks, onRemoveMark, onClearTooth, onAddMark }) {
  if (!tooth) {
    return (
      <div className="eq-side-card">
        <div className="eq-side-title">Dente</div>
        <p className="eq-empty">Toque em um dente para ver e editar as marcações, ou escolha uma ferramenta e toque para anotar.</p>
      </div>
    );
  }
  const D = window.EquiData;
  const scope = tooth.type === 'incisivo' ? 'incisor' : (tooth.type === 'premolar' || tooth.type === 'molar') ? 'cheek' : 'any';
  const quick = [...D.ABNORMALITIES, ...D.TREATMENTS].filter((m) => m.scope === 'any' || m.scope === scope).slice(0, 8);
  return (
    <div className="eq-side-card">
      <div className="eq-side-title">
        <span className="eq-tooth-badge">{tooth.triadan}</span>
        {tooth.name}
      </div>
      <div className="eq-side-sub">{tooth.jaw === 'upper' ? 'Maxila' : 'Mandíbula'} · {tooth.side === 'right' ? 'direita' : 'esquerda'}</div>

      <div className="eq-mark-list">
        {marks.length === 0 && <p className="eq-empty">Sem marcações.</p>}
        {marks.map((id) => {
          const m = window.markMeta(id);
          return (
            <div key={id} className="eq-mark-row">
              <span className="eq-dot" style={{ background: m.color }} />
              <span className="eq-mark-name">{m.label}</span>
              <button className="eq-x" onClick={() => onRemoveMark(tooth.id, id)} title="Remover">×</button>
            </div>
          );
        })}
      </div>

      <div className="eq-side-title sm">Adicionar rápido</div>
      <div className="eq-quickadd">
        {quick.map((m) => (
          <button key={m.id} className="eq-quickbtn" onClick={() => onAddMark(tooth.id, m.id)} title={m.label}>
            <span className="eq-dot" style={{ background: m.color }} />{m.short}
          </button>
        ))}
      </div>

      {marks.length > 0 && (
        <button className="eq-btn ghost block" onClick={() => onClearTooth(tooth.id)}>Limpar este dente</button>
      )}
    </div>
  );
}

function Legend() {
  const D = window.EquiData;
  return (
    <div className="eq-side-card">
      <div className="eq-side-title sm">Legenda</div>
      <div className="eq-legend">
        {[...D.ABNORMALITIES, ...D.TREATMENTS].map((m) => (
          <div key={m.id} className="eq-legend-row">
            <span className="eq-chip" style={{ background: m.color }}>{m.short}</span>
            <span>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------- Passo: Detalhes ----------------------- */
function DetailsStep({ chart, updateHorse }) {
  const h = chart.horse;
  const S = (k) => (v) => updateHorse(k, v);
  return (
    <div className="eq-step-pane">
      <div className="eq-pane-head">
        <h2>Detalhes do paciente</h2>
        <p>Dados do cavalo, do tutor e do atendimento. Tudo editável.</p>
      </div>
      <div className="eq-form-card">
        <div className="eq-form-section">Cavalo</div>
        <div className="eq-form-row">
          <Field label="Nome do cavalo" value={h.name} onChange={S('name')} placeholder="Ex.: Relâmpago" width="48%" />
          <Field label="Raça" value={h.breed} onChange={S('breed')} placeholder="Ex.: Crioulo" width="24%" />
          <Field label="Idade (anos)" value={h.age} onChange={S('age')} type="number" placeholder="0" width="24%" />
        </div>
        <div className="eq-form-row">
          <Field label="Sexo" value={h.sex} onChange={S('sex')} placeholder="Macho / Fêmea / Castrado" width="32%" />
          <Field label="Pelagem" value={h.color} onChange={S('color')} placeholder="Ex.: Tordilho" width="32%" />
          <Field label="Microchip / Passaporte" value={h.chip} onChange={S('chip')} placeholder="Nº" width="32%" />
        </div>
        <div className="eq-form-section">Tutor & atendimento</div>
        <div className="eq-form-row">
          <Field label="Tutor / Cliente" value={h.owner} onChange={S('owner')} placeholder="Nome do tutor" width="40%" />
          <Field label="Telefone" value={h.phone} onChange={S('phone')} placeholder="(00) 00000-0000" width="28%" />
          <Field label="Data do atendimento" value={h.date} onChange={S('date')} type="date" width="28%" />
        </div>
        <div className="eq-form-row">
          <Field label="Propriedade / Haras" value={h.farm} onChange={S('farm')} placeholder="Local" width="100%" />
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Passo: Tratamentos & Notas ----------------------- */
function NotesStep({ chart, updateMeta, marksByTooth }) {
  // Resumo automático das marcações
  const summary = [];
  Object.entries(marksByTooth).forEach(([toothId, ids]) => {
    ids.forEach((id) => summary.push({ toothId, m: window.markMeta(id) }));
  });
  summary.sort((a, b) => Number(a.toothId) - Number(b.toothId));
  return (
    <div className="eq-step-pane">
      <div className="eq-pane-head">
        <h2>Tratamentos & Notas</h2>
        <p>Resumo das marcações da carta, sedação e observações clínicas.</p>
      </div>
      <div className="eq-two-col">
        <div className="eq-form-card">
          <div className="eq-form-section">Sedação</div>
          <div className="eq-form-row">
            <Field label="Fármaco" value={chart.meta.sedDrug} onChange={(v) => updateMeta('sedDrug', v)} placeholder="Ex.: Detomidina" width="56%" />
            <Field label="Dose" value={chart.meta.sedDose} onChange={(v) => updateMeta('sedDose', v)} placeholder="mg" width="40%" />
          </div>
          <label className="eq-field">
            <span className="eq-field-label">Observações clínicas</span>
            <textarea className="eq-textarea" rows="7" value={chart.meta.notes || ''}
              onChange={(e) => updateMeta('notes', e.target.value)} placeholder="Anotações livres sobre o atendimento, recomendações, próximo retorno…" />
          </label>
          <Field label="Retorno recomendado" value={chart.meta.recall} onChange={(v) => updateMeta('recall', v)} placeholder="Ex.: 6 meses" />
        </div>
        <div className="eq-form-card">
          <div className="eq-form-section">Achados na carta ({summary.length})</div>
          {summary.length === 0 && <p className="eq-empty">Nenhuma marcação ainda. Volte à carta dentária para anotar.</p>}
          <div className="eq-summary">
            {summary.map((s, i) => (
              <div key={i} className="eq-summary-row">
                <span className="eq-tooth-badge sm">{s.toothId}</span>
                <span className="eq-chip" style={{ background: s.m.color }}>{s.m.short}</span>
                <span>{s.m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Passo: Cobrança ----------------------- */
function BillingStep({ chart, setItems }) {
  const items = chart.billing;
  const setItem = (i, k, v) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it));
    setItems(next);
  };
  const add = () => setItems([...items, { desc: '', qty: 1, price: '' }]);
  const remove = (i) => setItems(items.filter((_, idx) => idx !== i));
  const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  return (
    <div className="eq-step-pane">
      <div className="eq-pane-head">
        <h2>Cobrança</h2>
        <p>Itens do atendimento. O total é calculado automaticamente.</p>
      </div>
      <div className="eq-form-card">
        <div className="eq-bill-head">
          <span>Descrição</span><span>Qtd.</span><span>Valor (R$)</span><span>Subtotal</span><span></span>
        </div>
        {items.map((it, i) => (
          <div key={i} className="eq-bill-row">
            <input className="eq-input" value={it.desc} placeholder="Ex.: Nivelamento odontológico" onChange={(e) => setItem(i, 'desc', e.target.value)} />
            <input className="eq-input" type="number" value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} />
            <input className="eq-input" type="number" value={it.price} placeholder="0,00" onChange={(e) => setItem(i, 'price', e.target.value)} />
            <span className="eq-subtotal">R$ {((Number(it.qty) || 0) * (Number(it.price) || 0)).toFixed(2)}</span>
            <button className="eq-x" onClick={() => remove(i)}>×</button>
          </div>
        ))}
        <button className="eq-btn ghost" onClick={add}><Icon name="plus" /> Adicionar item</button>
        <div className="eq-bill-total"><span>Total</span><strong>R$ {total.toFixed(2)}</strong></div>
      </div>
    </div>
  );
}

Object.assign(window, { Field, SelectedToothPanel, Legend, DetailsStep, NotesStep, BillingStep });
