/* ============================================================
   VetTooth Pro — Odontograma · Passo 5 (Tratamento) e Passo 6 (Finalizar)
   Gauges interativos, painel de achados, sedação, relatório, ações
   ============================================================ */
const { useRef: ogUseRef, useState: ogUseState } = React;

/* ---- info da clínica (lê override de Configurações › Clínica, com fallback) ---- */
window.vtClinicInfo = function () {
  const d = (window.VtStore && window.VtStore.getData()) || {};
  const c = d.clinic || {};
  return {
    name: c.name || 'VetTooth Pro',
    vet: c.vet || c.responsavel || 'Dr. Gabriel Martinez',
    crmv: c.crmv || 'CRMV 62214',
    address: c.address || c.endereco || 'Rua Serra Morena, 418, Mairporã-SP',
    phone: c.phone || c.telefone || '(11) 94772-13335',
    email: c.email || 'vet.martinez@equinedentalr.com',
    instagram: c.instagram || '@martinez.vetodonto',
  };
};
const ogToast = (m, t) => { try { window.vtToast && window.vtToast(m, t || 'ok'); } catch (e) {} };
const ogMoney = (v) => Number((v || '').toString().replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
const ogBRL = (n) => window.vtMoney(n);
const ogPatient = (chart) => { const d = (window.VtStore && window.VtStore.getData()) || {}; return (d.patients || []).find((p) => p.name === chart.patientName) || {}; };
const ogOwnerData = (name) => { const d = (window.VtStore && window.VtStore.getData()) || {}; return (d.owners || []).find((o) => o.name === name) || {}; };

/* ============================================================
   Gauge circular interativo (arco 270°)
   ============================================================ */
function OdGauge({ value = 0, onChange, label, unit = '%', segments, size = 104, readOnly = false, color = '#14a8a0', small = false }) {
  const ref = ogUseRef(null);
  const sz = small ? 78 : size;
  const r = (sz / 2) - (small ? 9 : 12);
  const cx = sz / 2, cy = sz / 2;
  const A0 = 135, SPAN = 270;
  const polar = (ang) => { const a = ang * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const arcPath = (t) => {
    const end = A0 + SPAN * t;
    const [x0, y0] = polar(A0), [x1, y1] = polar(end);
    const large = (SPAN * t) > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };
  const t = Math.max(0, Math.min(1, (value || 0) / 100));
  const setFromEvent = (e) => {
    if (readOnly || !onChange || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cxp = (e.clientX != null ? e.clientX : (e.touches && e.touches[0].clientX)) - rect.left;
    const cyp = (e.clientY != null ? e.clientY : (e.touches && e.touches[0].clientY)) - rect.top;
    const sx = cxp * (sz / rect.width), sy = cyp * (sz / rect.height);
    let ang = Math.atan2(sy - cy, sx - cx) * 180 / Math.PI;
    if (ang < A0 - 1) ang += 360;
    let nt = (ang - A0) / SPAN;
    nt = Math.max(0, Math.min(1, nt));
    onChange(Math.round(nt * 100));
  };
  const onDown = (e) => {
    if (readOnly) return;
    e.preventDefault(); setFromEvent(e);
    const mv = (ev) => setFromEvent(ev);
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  };
  const [hx, hy] = polar(A0 + SPAN * t);
  const segIdx = segments ? Math.min(segments.length - 1, Math.max(0, Math.floor(t * segments.length - 1e-9))) : 0;
  return (
    <div className={`og-gauge${small ? ' sm' : ''}`}>
      <svg ref={ref} className="og-gauge-svg" width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} onPointerDown={onDown} style={{ cursor: readOnly ? 'default' : 'pointer', touchAction: 'none' }}>
        <path d={arcPath(1)} stroke="#e7ebf0" strokeWidth={small ? 7 : 9} fill="none" strokeLinecap="round" />
        <path d={arcPath(t || 0.0001)} stroke={color} strokeWidth={small ? 7 : 9} fill="none" strokeLinecap="round" />
        {!readOnly && <circle cx={hx} cy={hy} r={small ? 5 : 7} fill="#fff" stroke={color} strokeWidth="3" />}
        {segments
          ? <text x={cx} y={cy + 4} textAnchor="middle" className="og-gauge-seg" style={small ? { fontSize: 10 } : null}>{segments[segIdx]}</text>
          : <text x={cx} y={cy + (small ? 5 : 6)} textAnchor="middle" className="og-gauge-num" style={small ? { fontSize: 18 } : null}>{Math.round(value || 0)}<tspan className="og-gauge-unit">{unit}</tspan></text>}
      </svg>
      <div className="og-gauge-label">{label}</div>
    </div>
  );
}

const OG_GAUGES = [
  { key: 'oclusao', label: '% Oclusão', unit: '%', def: 80 },
  { key: 'molar', label: 'Ângulo Molares', segments: ['Steep', 'Normal', 'Un-Restr.'], def: 50 },
  { key: 'excursao', label: 'Excursão Lateral', segments: ['Reduzida', 'Normal', 'Ampla'], def: 50 },
  { key: 'rostral', label: 'Mov. Rostral/Caudal', segments: ['Reduzido', 'Normal', 'Amplo'], def: 50 },
  { key: 'incisor', label: 'Ângulo Incisivos', segments: ['Steep', 'Normal', 'Un-Restr.'], def: 50 },
];

function OdExamSide({ title, data, onChange, readOnly }) {
  const dd = data || {};
  return (
    <div className="og-side-card">
      <div className="og-side-title">{title}</div>
      <div className="og-gauges">
        {OG_GAUGES.map((g) => (
          <OdGauge key={g.key} label={g.label} unit={g.unit || ''} segments={g.segments}
            value={dd[g.key] != null ? dd[g.key] : g.def} readOnly={readOnly}
            onChange={readOnly ? undefined : (v) => onChange(g.key, v)} />
        ))}
      </div>
    </div>
  );
}

function OdExamGauges({ exam, onChange, readOnly }) {
  const ex = exam || {};
  return (
    <div className="og-exam-grid">
      <OdExamSide title="Lado Direito" data={ex.right || {}} onChange={(k, v) => onChange('right', k, v)} readOnly={readOnly} />
      <OdExamSide title="Lado Esquerdo" data={ex.left || {}} onChange={(k, v) => onChange('left', k, v)} readOnly={readOnly} />
    </div>
  );
}

/* grupos de achados (checkboxes) */
const OG_FIND = {
  'Incisivos': ['Tártaro', 'Diastema', 'Gancho', 'Ausente', 'Desgaste', 'Fratura'],
  'Caninos': ['Ausente', 'Gancho', 'PEED', 'CARs'],
  'Dente de Lobo': ['Presente Sup. Dir.', 'Presente Sup. Esq.', 'Presente Inf. Dir.', 'Presente Inf. Esq.'],
  'Pré-molares e Molares': ['PEED', 'Gancho', 'CARs', 'Arcada Desequilibrada', 'Ulceração Vestibular', 'Rampas', 'Ondulações'],
};

Object.assign(window, { OdGauge, OdExamGauges, OG_GAUGES, OG_FIND });

/* ============================================================
   PASSO 5 — TRATAMENTO
   ============================================================ */
const P5_FIELDS = [
  { key: 'anamnese', label: 'Anamnese', ph: 'Histórico, queixa principal, evolução…' },
  { key: 'achadosOral', label: 'Achados do Exame Oral', ph: 'O que foi observado no exame clínico oral…' },
  { key: 'tratamento', label: 'Tratamento Realizado', ph: 'Procedimentos executados na sessão…' },
  { key: 'medicacoes', label: 'Medicações / Sedação', ph: 'Fármacos, doses e protocolo de sedação…' },
  { key: 'recomendacoes', label: 'Recomendações Pós-Atendimento', ph: 'Cuidados, dieta, retorno…' },
  { key: 'observacoes', label: 'Observações Gerais', ph: 'Outras observações relevantes…' },
];

function OdTratamentoStep({ chart, setChart, commit, go }) {
  const [openMeasures, setOpenMeasures] = ogUseState(false);
  const set = (k, v) => setChart((c) => ({ ...c, [k]: v }));
  const laudo = chart.laudo || {};
  const setLaudo = (k, v) => setChart((c) => ({ ...c, laudo: { ...(c.laudo || {}), [k]: v } }));
  const setExam = (side, k, v) => setChart((c) => { const ex = { ...(c.preExam || { right: {}, left: {} }) }; ex[side] = { ...(ex[side] || {}), [k]: v }; return { ...c, preExam: ex }; });
  const f5 = chart.findings5 || {};
  const toggleF = (grp, item) => { const key = grp + '::' + item; setChart((c) => { const n = { ...(c.findings5 || {}) }; if (n[key]) delete n[key]; else n[key] = true; return { ...c, findings5: n }; }); };
  const sed = chart.sedationLog || [];
  const setSed = (i, k, v) => setChart((c) => ({ ...c, sedationLog: (c.sedationLog || []).map((r, j) => j === i ? { ...r, [k]: v } : r) }));
  const addSed = () => setChart((c) => ({ ...c, sedationLog: [...(c.sedationLog || []), { hora: '', med: '', dose: '', obs: '' }] }));
  const delSed = (i) => setChart((c) => ({ ...c, sedationLog: (c.sedationLog || []).filter((_, j) => j !== i) }));
  const fileRef = ogUseRef(null);
  const onFiles = (e) => {
    const files = [...e.target.files];
    files.forEach((file) => { const rd = new FileReader(); rd.onload = () => setChart((c) => ({ ...c, photos: [...(c.photos || []), { id: 'PH' + Date.now() + Math.random().toString(36).slice(2, 6), name: file.name, url: rd.result }] })); rd.readAsDataURL(file); });
    e.target.value = '';
  };
  const removePhoto = (id) => setChart((c) => ({ ...c, photos: (c.photos || []).filter((p) => p.id !== id) }));
  const items = chart.billing || [];
  const total = items.reduce((s, it) => s + ogMoney(it.price), 0);

  // dados para a prévia do laudo
  const clinic = window.vtClinicInfo();
  const pData = ogPatient(chart);
  const owner = pData.owner || chart.clientName || '—';
  const dateBR = (chart.examDate || '').split('-').reverse().join('/') || new Date().toLocaleDateString('pt-BR');
  const doPrint = () => { ogToast('Gerando PDF do laudo…'); setTimeout(() => window.print(), 300); };

  return (
    <div className="od-step-pane p5-pane">
      <h2>Tratamento <span className="od-badge">Passo 5</span></h2>
      <p>Achados clínicos à esquerda — a prévia do laudo PDF à direita atualiza em tempo real.</p>

      <div className="p5-grid">
        {/* ---------------- PAINEL ESQUERDO ---------------- */}
        <div className="p5-left">
          {/* Medidas Clínicas (colapsável) — preserva gauges, achados, sedação, cobrança */}
          <div className="od-card p5-collapse">
            <button className={`p5-collapse-head${openMeasures ? ' open' : ''}`} onClick={() => setOpenMeasures((v) => !v)}>
              <span><b>Medidas Clínicas</b><i>Gauges, achados por grupo, sedação e cobrança</i></span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {openMeasures && (
              <div className="p5-collapse-body">
                <div className="og-block">
                  <div className="og-block-head"><h3>Examinação Pré-Atendimento</h3><span className="og-hint">Arraste para ajustar</span></div>
                  <OdExamGauges exam={chart.preExam} onChange={setExam} />
                </div>
                <div className="og-block">
                  <div className="og-block-head"><h3>Achados por Grupo</h3></div>
                  <div className="og-find-groups">
                    {Object.entries(OG_FIND).map(([grp, list]) => (
                      <div key={grp} className="og-find-group">
                        <div className="og-find-title">{grp}</div>
                        <div className="og-find-chips">
                          {list.map((item) => { const on = !!f5[grp + '::' + item]; return (
                            <button key={item} className={`og-find-chip${on ? ' on' : ''}`} onClick={() => toggleF(grp, item)}>
                              <span className="og-find-box">{on ? '✓' : ''}</span>{item}
                            </button>
                          ); })}
                        </div>
                      </div>
                    ))}
                    <div className="og-find-group">
                      <div className="og-find-title">Outros</div>
                      <textarea className="od-note" style={{ minHeight: 60 }} placeholder="Outros achados (campo livre)..." value={chart.findingsOther || ''} onChange={(e) => set('findingsOther', e.target.value)} />
                      <div className="og-photos">
                        {(chart.photos || []).map((p) => (
                          <div key={p.id} className="og-photo"><img src={p.url} alt={p.name} /><button className="og-photo-x" onClick={() => removePhoto(p.id)}>×</button></div>
                        ))}
                        <button className="og-photo-add" onClick={() => fileRef.current && fileRef.current.click()}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                          <span>Adicionar Foto</span>
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onFiles} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="og-block">
                  <div className="og-block-head"><h3>Notas de Sedação</h3><button className="od-add-item" onClick={addSed}>+ Adicionar linha</button></div>
                  <div className="og-sed">
                    <div className="og-sed-row og-sed-head"><span>Hora</span><span>Medicamento</span><span>Dose</span><span>Observação</span><span></span></div>
                    {sed.map((r, i) => (
                      <div key={i} className="og-sed-row">
                        <input value={r.hora} placeholder="00:00" onChange={(e) => setSed(i, 'hora', e.target.value)} />
                        <input value={r.med} placeholder="Ex.: Detomidina" onChange={(e) => setSed(i, 'med', e.target.value)} />
                        <input value={r.dose} placeholder="mg / mL" onChange={(e) => setSed(i, 'dose', e.target.value)} />
                        <input value={r.obs} placeholder="Observação" onChange={(e) => setSed(i, 'obs', e.target.value)} />
                        <button className="og-sed-x" onClick={() => delSed(i)}>×</button>
                      </div>
                    ))}
                    {sed.length === 0 && <p className="od-bottom-empty" style={{ padding: '10px 2px' }}>Nenhum medicamento registrado.</p>}
                  </div>
                </div>
                <div className="og-block">
                  <div className="og-block-head"><h3>Tratamento &amp; Cobrança</h3></div>
                  {items.map((it, i) => (
                    <div key={i} className="od-bill-row">
                      <input value={it.desc} placeholder="Procedimento" onChange={(e) => commit((c) => ({ ...c, billing: c.billing.map((x, k) => k === i ? { ...x, desc: e.target.value } : x) }))} />
                      <input className="od-bill-price" value={it.price} placeholder="R$ 0,00" onChange={(e) => commit((c) => ({ ...c, billing: c.billing.map((x, k) => k === i ? { ...x, price: window.maskMoney ? window.maskMoney(e.target.value) : e.target.value } : x) }))} />
                    </div>
                  ))}
                  <button className="od-add-item" onClick={() => commit((c) => ({ ...c, billing: [...(c.billing || []), { desc: '', price: '' }] }))}>+ Adicionar item</button>
                  <div className="od-bill-total"><span>Total</span><strong>{ogBRL(total)}</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* Achados Clínicos (campos de texto do laudo) */}
          <div className="od-card">
            <div className="og-block-head"><h3>Achados Clínicos</h3></div>
            <div className="p5-fields">
              {P5_FIELDS.map((f) => (
                <label key={f.key} className="p5-field">
                  <span>{f.label}</span>
                  <textarea value={laudo[f.key] || ''} placeholder={f.ph} onChange={(e) => setLaudo(f.key, e.target.value)} />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ---------------- PAINEL DIREITO — PRÉVIA DO LAUDO ---------------- */}
        <div className="p5-right">
          <div className="p5-right-head laudo-noprint">
            <span>Prévia do Laudo PDF</span>
            <button className="og-act pdf" onClick={doPrint}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M8 11l4 4 4-4M5 21h14" /></svg> Exportar PDF</button>
          </div>
          <div className="p5-paper-scroll">
            <div className="laudo-paper" id="laudo-paper">
              <div className="laudo-head">
                <div className="laudo-logo">🦷 <span>Dentalis Vet</span></div>
                <div className="laudo-vet">{clinic.vet} · CRMV-SP 62214</div>
                <div className="laudo-addr">Rua Serra Morena 418, Mairiporã-SP · (11) 94772-13335</div>
              </div>
              <div className="laudo-pdata">
                <div><span>Paciente</span><b>{chart.patientName || '—'}</b></div>
                <div><span>Espécie</span><b>{pData.species || '—'}</b></div>
                <div><span>Tutor</span><b>{owner}</b></div>
                <div><span>Data</span><b>{dateBR}</b></div>
              </div>
              <div className="laudo-title">Laudo Odontológico</div>
              {P5_FIELDS.map((f) => (
                <div key={f.key} className="laudo-sec">
                  <div className="laudo-sec-t">{f.label}</div>
                  <div className={`laudo-sec-b${laudo[f.key] ? '' : ' empty'}`}>{laudo[f.key] || '—'}</div>
                </div>
              ))}
              <div className="laudo-foot">
                <div className="laudo-date">{dateBR}</div>
                <div className="laudo-sign">
                  <div className="laudo-sign-line"></div>
                  <div className="laudo-sign-name">{clinic.vet}</div>
                  <div className="laudo-sign-crmv">CRMV-SP 62214</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="od-step-actions laudo-noprint"><button className="od-back-btn" onClick={() => go('achados')}>← Anterior</button><button className="od-next" onClick={() => go('finalizar')}>Próximo →</button></div>
    </div>
  );
}

/* ============================================================
   PASSO 6 — COBRANÇA E NOTIFICAÇÕES DE LIGAR DE VOLTA
   (layout Pimbury Dental · cards de cobrança + ações laterais)
   ============================================================ */
const OG_IMPOSTO = 0.06; // 6% adicionado ao total quando "Imposto (NF)" está marcado
const OG_RETURN = ['Nenhum', '1 Semana', '2 Meses', '3 Meses', '6 Meses', '9 Meses', '1 Ano', '18 Meses', '24 Meses'];
const OG_RETURN_DAYS = [0, 7, 60, 90, 180, 270, 365, 547, 730];

function OdFinalizarStep({ chart, setChart, go, onSave }) {
  const [waOpen, setWaOpen] = ogUseState(false);
  const [previewOpen, setPreviewOpen] = ogUseState(false);
  const [apptOpen, setApptOpen] = ogUseState(false);
  const set = (k, v) => setChart((c) => ({ ...c, [k]: v }));
  const setExam = (side, k, v) => setChart((c) => { const ex = { ...(c.postExam || { right: {}, left: {} }) }; ex[side] = { ...(ex[side] || {}), [k]: v }; return { ...c, postExam: ex }; });
  const clinic = window.vtClinicInfo();
  const pData = ogPatient(chart);
  const owner = pData.owner || chart.clientName || '—';
  const ownerData = ogOwnerData(owner);
  const phone = ownerData.phone || '';
  const items = chart.billing || [];
  const total = items.reduce((s, it) => s + ogMoney(it.price), 0);
  const sed = (chart.sedationLog || []).filter((r) => r.med || r.dose || r.hora);
  const f5 = chart.findings5 || {};
  const findByGroup = {};
  Object.keys(f5).forEach((k) => { const [g, item] = k.split('::'); (findByGroup[g] = findByGroup[g] || []).push(item); });
  // achados do odontograma (dentes marcados)
  const toothFindings = [];
  Object.entries(chart.marks || {}).forEach(([id, arr]) => arr.forEach((m) => { if (m !== 'normal') toothFindings.push({ id, label: (window.markMeta ? window.markMeta(m).label : m) }); }));
  const dateBR = (chart.examDate || '').split('-').reverse().join('/');

  const doExport = () => { ogToast('Gerando PDF do relatório…'); setTimeout(() => window.print(), 300); };
  const fileRef = ogUseRef(null);
  const onFiles = (e) => { const files = [...e.target.files]; files.forEach((file) => { const rd = new FileReader(); rd.onload = () => setChart((c) => ({ ...c, photos: [...(c.photos || []), { id: 'PH' + Date.now() + Math.random().toString(36).slice(2, 6), name: file.name, url: rd.result }] })); rd.readAsDataURL(file); }); e.target.value = ''; };
  const removePhoto = (id) => setChart((c) => ({ ...c, photos: (c.photos || []).filter((p) => p.id !== id) }));

  const cobranca = () => {
    if (!total) { ogToast('Adicione itens de cobrança no Passo 5.', 'err'); return; }
    if (!window.VtStore) { ogToast('Financeiro indisponível.', 'err'); return; }
    const d = window.VtStore.getData() || {}; const fin = d.fin || { tx: [] };
    const tx = { id: 'T' + Date.now().toString(36), kind: 'receita', desc: 'Odontograma — ' + (chart.patientName || 'paciente'), patient: chart.patientName || '', cat: 'Odontograma', value: total, date: chart.examDate || new Date().toISOString().slice(0, 10), status: 'pendente', method: null, paidAt: null, nf: !!chart.imposto };
    window.VtStore.setData({ fin: { ...fin, tx: [tx, ...(fin.tx || [])] } });
    ogToast('Cobrança lançada em Financeiro › Receitas.');
  };
  const waText = `Olá, ${owner}! Aqui é da ${clinic.name} (${clinic.vet}). Segue a cobrança do atendimento odontológico de ${chart.patientName || 'seu animal'}${dateBR ? ' realizado em ' + dateBR : ''}: total de ${ogBRL(total)}. Qualquer dúvida estou à disposição. Obrigado!`;
  const openWa = () => { const digits = (phone || '').replace(/\D/g, ''); const url = 'https://wa.me/' + (digits ? '55' + digits : '') + '?text=' + encodeURIComponent(waText); window.open(url, '_blank'); };

  const metricLabel = (g) => { const seg = g.segments; return (val) => seg ? seg[Math.min(seg.length - 1, Math.max(0, Math.floor((val / 100) * seg.length - 1e-9)))] : Math.round(val) + (g.unit || ''); };

  /* ---- cobranças ---- */
  const charge = chart.charge || {};
  const setCharge = (k, v) => setChart((c) => ({ ...c, charge: { ...(c.charge || {}), [k]: v } }));
  const findingsCount = Object.keys(f5).length + toothFindings.length;
  const autoCallback = findingsCount * 70; // valor sugerido a partir dos achados do Passo 5
  const treatVal = charge.treatment != null ? charge.treatment : total;
  const callVal = charge.callback != null ? charge.callback : autoCallback;
  const taxVal = chart.imposto ? (treatVal + callVal) * OG_IMPOSTO : 0;
  const grand = treatVal + callVal + taxVal;
  const refreshTreat = () => { setCharge('treatment', total); ogToast('Cobrança de tratamento recalculada.'); };
  const refreshCall = () => { setCharge('callback', autoCallback); ogToast('Chamar cobrança recalculada dos achados.'); };

  const togglePaid = (on) => {
    setCharge('paid', on);
    if (on && grand && window.VtStore) {
      const d = window.VtStore.getData() || {}; const fin = d.fin || { tx: [] };
      const tx = { id: 'T' + Date.now().toString(36), kind: 'receita', desc: 'Odontograma — ' + (chart.patientName || 'paciente'), patient: chart.patientName || '', cat: 'Odontograma', value: grand, date: chart.examDate || new Date().toISOString().slice(0, 10), status: 'pago', method: charge.paidCode ? 'Ref. ' + charge.paidCode : 'À vista', paidAt: new Date().toISOString().slice(0, 10), nf: !!chart.imposto };
      window.VtStore.setData({ fin: { ...fin, tx: [tx, ...(fin.tx || [])] } });
      ogToast('Pagamento de ' + ogBRL(grand) + ' registrado em Financeiro.');
    }
  };

  const setReturn = (idx) => {
    setCharge('returnIdx', idx);
    if (window.VtStore && chart.patientName) {
      const d = window.VtStore.getData() || {}; const prefs = { ...(d.callbackPrefs || {}) };
      const days = OG_RETURN_DAYS[idx];
      prefs[chart.patientName] = idx > 0 ? { label: OG_RETURN[idx], due: new Date(Date.now() + days * 864e5).toISOString().slice(0, 10) } : null;
      window.VtStore.setData({ callbackPrefs: prefs });
    }
  };

  const saveDraft = () => { if (onSave) onSave(); ogToast('Rascunho salvo.'); };
  const saveChart = () => { if (onSave) onSave(); ogToast('Gráfico salvo no histórico do paciente.'); };

  const sendMsg = () => {
    const idx = charge.returnIdx || 0;
    const ret = idx > 0 ? ` Recomendamos retorno em ${OG_RETURN[idx]}.` : '';
    const pago = charge.paid ? ' Pagamento confirmado, obrigado!' : '';
    const msg = `Olá ${owner}, o atendimento de ${chart.patientName || 'seu animal'} foi concluído. Total: ${ogBRL(grand)}.${ret}${pago} — ${clinic.name}`;
    const digits = (phone || '').replace(/\D/g, '');
    window.open('https://wa.me/' + (digits ? '55' + digits : '') + '?text=' + encodeURIComponent(msg), '_blank');
    if (!charge.paid) cobranca();
  };

  return (
    <div className="od-step-pane p6-pane">
      <h2>Cobrança e Notificações de Ligar de Volta <span className="od-badge">Passo 6</span></h2>
      <p>Defina as cobranças, registre o pagamento e agende o retorno do paciente.</p>

      <div className="p6-grid">
        <div className="p6-main">
          {/* 1. Cobranças de Tratamento */}
          <div className="od-card p6-card">
            <div className="p6-card-label">Cobranças de Tratamento</div>
            <div className="p6-card-sub">Cobrança total dos tratamentos no gráfico. Digite o valor a descontar.</div>
            <div className="p6-money">
              <span className="p6-cur">R$</span>
              <input type="number" step="0.01" min="0" value={Number.isFinite(treatVal) ? treatVal : 0} onChange={(e) => setCharge('treatment', parseFloat(e.target.value) || 0)} />
              <button className="p6-refresh" onClick={refreshTreat} title="Recalcular do gráfico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" /></svg></button>
            </div>
          </div>

          {/* 2. Chamar Cobrança */}
          <div className="od-card p6-card">
            <div className="p6-card-label">Chamar Cobrança</div>
            <div className="p6-card-sub">Se taxa normal é definida, este será exibido. Digite o valor a descontar.</div>
            <div className="p6-money">
              <span className="p6-cur">R$</span>
              <input type="number" step="0.01" min="0" value={Number.isFinite(callVal) ? callVal : 0} onChange={(e) => setCharge('callback', parseFloat(e.target.value) || 0)} />
              <button className="p6-refresh" onClick={refreshCall} title="Recalcular dos achados"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" /></svg></button>
            </div>
          </div>

          {/* 3. Total */}
          <div className="od-card p6-card p6-total-card">
            <div className="p6-card-label strong">Total</div>
            <div className="p6-card-sub">Total cobrado ao cliente. Imposto será adicionado automaticamente se selecionado.</div>
            <div className="p6-total-val">{ogBRL(grand)}{taxVal ? <span className="p6-tax">inclui {ogBRL(taxVal)} de imposto</span> : null}</div>
            <div className="p6-paid-row">
              <span className={`p6-paid-check${charge.paid ? ' on' : ''}`}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></span>
              <span className="p6-paid-label">Pago?</span>
              <input className="p6-paid-code" placeholder="Nº / código" value={charge.paidCode || ''} onChange={(e) => setCharge('paidCode', e.target.value)} />
              <button className={`p6-toggle${charge.paid ? ' on' : ''}`} role="switch" aria-checked={!!charge.paid} onClick={() => togglePaid(!charge.paid)}><span className="p6-toggle-dot" /></button>
            </div>
          </div>

          {/* 4. Notificação de ligar de volta */}
          <div className="od-card p6-card">
            <div className="p6-card-label">Notificação de ligar de volta</div>
            <div className="p6-card-sub">Quando avisar o tutor para retornar ao consultório.</div>
            <input className="p6-slider" type="range" min="0" max={OG_RETURN.length - 1} step="1" value={charge.returnIdx || 0} style={{ '--fill': ((charge.returnIdx || 0) / (OG_RETURN.length - 1) * 100) + '%' }} onChange={(e) => setReturn(parseInt(e.target.value, 10))} />
            <div className="p6-slider-ticks">
              {OG_RETURN.map((r, i) => <span key={r} className={(charge.returnIdx || 0) === i ? 'on' : ''}>{r}</span>)}
            </div>
          </div>
        </div>

        {/* ---------------- PAINEL LATERAL DIREITO ---------------- */}
        <div className="p6-side">
          <button className="p6-sbtn outline" onClick={() => setPreviewOpen(true)}>Visualização do Gráfico</button>
          <button className="p6-sbtn outline" onClick={() => setApptOpen(true)}>Marcar Consulta</button>
          <button className="p6-sbtn navy" onClick={saveDraft}>Save Draft</button>
          <button className="p6-sbtn navy" onClick={saveChart}>Gráfico Salvar</button>
          <button className="p6-sbtn send" onClick={sendMsg}><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2zm-2.7 6c.2 0 .4 0 .5.4l.7 1.7c0 .2 0 .3 0 .5-.1.2-.1.3-.2.5l-.4.5c-.1.2-.3.3-.1.6.7.9 1.4 1.2 2.1 1.5.2.1.4.1.5-.1l.6-.8c.2-.2.4-.2.6-.1l1.6.8c.3.1.5.2.5.3.1.1.1.6-.1 1.2-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .2-3.2-.6-2.7-1-4.4-3.7-4.5-3.9-.1-.1-1-1.3-1-2.6 0-1.2.7-1.7.9-2.1.2-.4.5-.4.7-.4z" /></svg> Enviar</button>
        </div>
      </div>

      {/* ===== Modal "Visualização do Gráfico": pós-atendimento + relatório completo (preservados) ===== */}
      {previewOpen && (
      <div className="og-modal-bg og-noprint" onClick={() => setPreviewOpen(false)}>
      <div className="p6-preview" onClick={(e) => e.stopPropagation()}>
      <div className="og-modal-head"><h3>Visualização do Gráfico</h3><button className="od-panel-x" onClick={() => setPreviewOpen(false)}>×</button></div>

      {/* Pós-atendimento */}
      <div className="od-card og-block">
        <div className="og-block-head"><h3>Examinação Pós-Atendimento</h3><span className="og-hint">Após o procedimento — para comparação antes × depois</span></div>
        <OdExamGauges exam={chart.postExam} onChange={setExam} />
      </div>

      {/* RELATÓRIO */}
      <div className="od-card og-report" id="og-report">
        <div className="og-rep-header">
          <div className="og-rep-brand">
            <div className="og-rep-logo">🦷</div>
            <div>
              <div className="og-rep-name">{clinic.name}</div>
              <div className="og-rep-vet">{clinic.vet} · {clinic.crmv}</div>
            </div>
          </div>
          <div className="og-rep-contact">
            <div>{clinic.address}</div>
            <div>Tel {clinic.phone} · {clinic.email}</div>
            <div>{clinic.instagram}</div>
          </div>
        </div>

        <div className="og-rep-title">Relatório Odontológico</div>

        {/* Dados cliente/paciente */}
        <div className="og-rep-sec">Dados do Cliente e Paciente</div>
        <div className="og-rep-grid">
          <div><span>Paciente</span><b>{chart.patientName || '—'}</b></div>
          <div><span>Espécie / Raça</span><b>{[pData.species, pData.breed].filter((x) => x && x !== '—').join(' · ') || '—'}</b></div>
          <div><span>Tutor / Cliente</span><b>{owner}</b></div>
          <div><span>Telefone</span><b>{phone || '—'}</b></div>
          <div><span>Data do exame</span><b>{dateBR || '—'}</b></div>
          <div><span>Veterinário</span><b>{clinic.vet}</b></div>
        </div>

        {/* Sedação */}
        <div className="og-rep-sec">Sedação</div>
        {sed.length ? (
          <table className="og-rep-table">
            <thead><tr><th>Hora</th><th>Medicamento</th><th>Dose</th><th>Observação</th></tr></thead>
            <tbody>{sed.map((r, i) => <tr key={i}><td>{r.hora || '—'}</td><td>{r.med || '—'}</td><td>{r.dose || '—'}</td><td>{r.obs || '—'}</td></tr>)}</tbody>
          </table>
        ) : <p className="og-rep-empty">Sem registro de sedação.</p>}

        {/* Resumo de achados */}
        <div className="og-rep-sec">Resumo de Achados</div>
        {Object.keys(findByGroup).length === 0 && toothFindings.length === 0
          ? <p className="og-rep-empty">Nenhum achado registrado.</p>
          : <div className="og-rep-findings">
              {Object.entries(findByGroup).map(([g, list]) => (
                <div key={g} className="og-rep-fgroup"><b>{g}:</b> {list.join(', ')}</div>
              ))}
              {toothFindings.length > 0 && (
                <div className="og-rep-fgroup"><b>Odontograma:</b> {toothFindings.map((t, i) => <span key={i} className="og-rep-tooth">{t.id} {t.label}</span>)}</div>
              )}
            </div>}

        {/* Comparativo pré × pós */}
        <div className="og-rep-sec">Comparativo Pré × Pós-Atendimento</div>
        <div className="og-compare">
          {['right', 'left'].map((side) => (
            <div key={side} className="og-compare-side">
              <div className="og-compare-title">Lado {side === 'right' ? 'Direito' : 'Esquerdo'}</div>
              <table className="og-rep-table compact">
                <thead><tr><th>Medida</th><th>Pré</th><th>Pós</th></tr></thead>
                <tbody>
                  {OG_GAUGES.map((g) => { const lab = metricLabel(g); const pre = (chart.preExam && chart.preExam[side] && chart.preExam[side][g.key] != null) ? chart.preExam[side][g.key] : g.def; const pos = (chart.postExam && chart.postExam[side] && chart.postExam[side][g.key] != null) ? chart.postExam[side][g.key] : g.def; return (
                    <tr key={g.key}><td>{g.label}</td><td>{lab(pre)}</td><td className="og-pos">{lab(pos)}</td></tr>
                  ); })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* See overleaf */}
        <div className="og-rep-sec">Notas Adicionais (See overleaf)</div>
        <textarea className="od-note" style={{ minHeight: 70 }} placeholder="Anotações adicionais para o verso do relatório..." value={chart.seeOverleaf || ''} onChange={(e) => set('seeOverleaf', e.target.value)} />

        {/* Attachments */}
        <div className="og-rep-sec">Attachments — Fotos do Procedimento</div>
        <div className="og-photos">
          {(chart.photos || []).map((p) => <div key={p.id} className="og-photo"><img src={p.url} alt={p.name} /><button className="og-photo-x og-noprint" onClick={() => removePhoto(p.id)}>×</button></div>)}
          {(chart.photos || []).length === 0 && <p className="og-rep-empty">Nenhuma foto anexada.</p>}
        </div>

        <div className="og-rep-total"><span>Total do atendimento</span><strong>{ogBRL(grand)}</strong></div>
      </div>

      {/* ações dentro da visualização */}
      <div className="og-actions og-noprint">
        <button className="og-act pdf" onClick={doExport}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M8 11l4 4 4-4M5 21h14" /></svg> Exportar PDF</button>
        <button className="og-act anexo" onClick={() => fileRef.current && fileRef.current.click()}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8" /></svg> Anexo</button>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onFiles} />
        <label className="og-act imposto"><input type="checkbox" checked={!!chart.imposto} onChange={(e) => set('imposto', e.target.checked)} /><span className="og-imp-box">{chart.imposto ? '✓' : ''}</span> Imposto (NF)</label>
      </div>
      </div>{/* /p6-preview */}
      </div>
      )}

      {/* ===== Modal "Marcar Consulta" ===== */}
      {apptOpen && (
        <div className="og-modal-bg og-noprint" onClick={() => setApptOpen(false)}>
          <div className="og-modal" onClick={(e) => e.stopPropagation()}>
            <div className="og-modal-head"><h3>Marcar Consulta</h3><button className="od-panel-x" onClick={() => setApptOpen(false)}>×</button></div>
            <p className="og-modal-sub">Agendar retorno de <b>{chart.patientName || 'paciente'}</b> com {clinic.vet}.</p>
            <div className="p6-appt-row">
              <label className="p6-appt-f"><span>Data</span><input type="date" value={(chart.nextAppt || {}).date || ''} onChange={(e) => set('nextAppt', { ...(chart.nextAppt || {}), date: e.target.value })} /></label>
              <label className="p6-appt-f"><span>Hora</span><input type="time" value={(chart.nextAppt || {}).time || ''} onChange={(e) => set('nextAppt', { ...(chart.nextAppt || {}), time: e.target.value })} /></label>
            </div>
            <div className="og-modal-actions">
              <button className="od-back-btn" onClick={() => setApptOpen(false)}>Cancelar</button>
              <button className="og-act cobranca" onClick={() => { setApptOpen(false); ogToast('Consulta de retorno agendada para ' + (((chart.nextAppt || {}).date || '').split('-').reverse().join('/') || 'data definida') + '.'); }}>Agendar</button>
            </div>
          </div>
        </div>
      )}

      <div className="od-step-actions laudo-noprint"><button className="od-back-btn" onClick={() => go('tratamento')}>← Anterior</button><button className="od-back-btn" onClick={() => go('odontograma')}>Voltar ao odontograma</button></div>

      {waOpen && (
        <div className="og-modal-bg og-noprint" onClick={() => setWaOpen(false)}>
          <div className="og-modal" onClick={(e) => e.stopPropagation()}>
            <div className="og-modal-head"><h3>Chamar cobrança via WhatsApp</h3><button className="od-panel-x" onClick={() => setWaOpen(false)}>×</button></div>
            <p className="og-modal-sub">Para: <b>{owner}</b>{phone ? ' · ' + phone : ' · (sem telefone cadastrado)'}</p>
            <textarea className="od-note" style={{ minHeight: 130 }} defaultValue={waText} id="og-wa-text" />
            <div className="og-modal-actions">
              <button className="od-back-btn" onClick={() => setWaOpen(false)}>Cancelar</button>
              <button className="og-act whats" onClick={openWa}>Abrir WhatsApp</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PASSO 2 — CONDIÇÃO & SEDAÇÃO  (OdCondicoesStep)
   Slider Condição Geral 1–10 + N/A · Histórico Clínico (270) ·
   Sedação card (#4a6080) com Veterinário Presente + tabela de medicações
   ============================================================ */
const OC_SED_MEDS = ['DETOMIDINA', 'BUTORFANOL', 'ROMIFIDINA', 'ACEPROMAZINA', 'XILAZINA', 'MIDAZOLAM', 'KETAMINA', 'PROPOFOL'];
const OC_LOCAIS = ['Consultório', 'Clínica', 'Campo'];
const OC_TRAT = ['1 sem', '1 mês', '3 meses', '6 meses', '9 meses', '12 meses', 'Nunca', 'Desconhecido', 'n/a'];
const ocCgColor = (v) => (v === 'na' || v == null) ? '#97a4b3' : (v <= 3 ? '#ef4444' : v <= 6 ? '#f59e0b' : '#1f8a5b');

function OdCondicoesStep({ chart, setChart, go }) {
  const A = chart.anamnese || {};
  const sA = (k) => (v) => setChart((c) => ({ ...c, anamnese: { ...(c.anamnese || {}), [k]: v } }));
  const cg = A.cgeral == null ? 'na' : A.cgeral;
  const cgNum = typeof cg === 'number' ? cg : 5;
  const tratIdx = A.tratIdx == null ? OC_TRAT.length - 1 : A.tratIdx;

  const notas = A.notas || '';
  const overCount = notas.length > 250;
  const carregarAnterior = () => {
    try {
      const d = (window.VtStore && window.VtStore.getData()) || {};
      const h = (d.odontoHistory || {})[chart.patientName] || [];
      const prev = h[0] && h[0].data;
      const txt = prev && (prev.clinicalNotes || (prev.anamnese && prev.anamnese.notas) || prev.notas);
      if (txt) { sA('notas')(String(txt).slice(0, 270)); ogToast('Histórico do último atendimento carregado.', 'ok'); }
      else ogToast('Nenhum histórico anterior para este paciente.', 'err');
    } catch (e) { ogToast('Nenhum histórico anterior para este paciente.', 'err'); }
  };

  /* ---- sedação ---- */
  const sed = !!A.sedacao;
  const vet = A.sedVet || { local: 'Consultório', nome: '' };
  const setVet = (k, v) => setChart((c) => ({ ...c, anamnese: { ...(c.anamnese || {}), sedVet: { ...(c.anamnese && c.anamnese.sedVet || { local: 'Consultório', nome: '' }), [k]: v } } }));
  const rows = A.sedRows || [];
  const setRow = (i, k, v) => setChart((c) => ({ ...c, anamnese: { ...(c.anamnese || {}), sedRows: (c.anamnese && c.anamnese.sedRows || []).map((r, j) => j === i ? { ...r, [k]: v } : r) } }));
  const addRow = () => setChart((c) => ({ ...c, anamnese: { ...(c.anamnese || {}), sedRows: [...(c.anamnese && c.anamnese.sedRows || []), { tempo: '', med: OC_SED_MEDS[0], qtd: '' }] } }));
  const delRow = (i) => setChart((c) => ({ ...c, anamnese: { ...(c.anamnese || {}), sedRows: (c.anamnese && c.anamnese.sedRows || []).filter((_, j) => j !== i) } }));

  const VITALS = [
    { k: 'temp', label: 'Temperatura', unit: '°C', ph: '37.5' },
    { k: 'fc', label: 'FC (freq. cardíaca)', unit: 'bpm', ph: '40' },
    { k: 'fr', label: 'FR (freq. respiratória)', unit: 'mpm', ph: '16' },
    { k: 'peso', label: 'Peso', unit: 'kg', ph: '450' },
  ];

  return (
    <div className="od-step-pane">
      <h2>Condição &amp; Sedação <span className="od-badge">Passo 2</span></h2>
      <p>Escore de condição geral, histórico clínico, sinais vitais e protocolo de sedação.</p>

      {/* Condição Geral */}
      <div className="od-card">
        <div className="oc-cg-row">
          <span className="oc-cg-badge" style={{ background: ocCgColor(cg) }}>{cg === 'na' ? 'N/A' : cg}</span>
          <div style={{ flex: 1 }}>
            <div className="oc-cg-label">Condição Geral</div>
            <div className="oc-cg-track">
              <input className="oc-cg-range" type="range" min="1" max="10" step="1" value={cgNum} disabled={cg === 'na'}
                style={{ opacity: cg === 'na' ? 0.45 : 1 }}
                onChange={(e) => sA('cgeral')(Number(e.target.value))} />
              <button className={`oc-cg-na${cg === 'na' ? ' on' : ''}`} onClick={() => sA('cgeral')(cg === 'na' ? 5 : 'na')}>N/A</button>
            </div>
            <div className="oc-cg-scale"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span></div>
          </div>
        </div>
        <div className="oc-trat-block">
          <h4 className="od-slider-title">Último Tratamento</h4>
          <div className="od-slider-scale">{OC_TRAT.map((v, i) => <span key={i} className={i === tratIdx ? 'on' : ''}>{v}</span>)}</div>
          <input type="range" className="od-range" min="0" max={OC_TRAT.length - 1} value={tratIdx} onChange={(e) => sA('tratIdx')(Number(e.target.value))} />
        </div>
      </div>

      {/* Sinais Vitais */}
      <div className="od-card" style={{ marginTop: 14 }}>
        <h4 className="od-slider-title">Sinais Vitais</h4>
        <div className="oc-vitals">
          {VITALS.map((v) => (
            <label key={v.k} className="oc-vital">
              <span>{v.label}</span>
              <div className="oc-vital-in"><input value={A[v.k] || ''} placeholder={v.ph} onChange={(e) => sA(v.k)(e.target.value)} /><i>{v.unit}</i></div>
            </label>
          ))}
        </div>
      </div>

      {/* Histórico Clínico */}
      <div className="od-card" style={{ marginTop: 14 }}>
        <div className="oc-hist-head">
          <span className="oc-hist-title">Histórico Clínico</span>
          <button className="oc-load-prev" onClick={carregarAnterior}>+ CARREGAR ANTERIOR</button>
        </div>
        <textarea className="oc-hist-ta" rows="4" maxLength={270} value={notas}
          onChange={(e) => sA('notas')(e.target.value)}
          placeholder="Histórico clínico, observações relevantes, tratamentos anteriores..." />
        <div className={`oc-hist-count${overCount ? ' warn' : ''}`}>{notas.length}/270</div>
      </div>

      {/* Sedação */}
      <div className="oc-sed-card">
        <div className="oc-sed-top">
          <h4>Sedação</h4>
          <button className={`oc-sed-toggle${sed ? ' on' : ''}`} role="switch" aria-checked={sed} onClick={() => sA('sedacao')(!sed)}><i /></button>
        </div>
        {sed && (
          <div className="oc-sed-body">
            <div>
              <div className="oc-vet-presente">Veterinário Presente</div>
              <div className="oc-vet-row">
                <label className="oc-vet-f"><span>Local</span>
                  <select value={vet.local} onChange={(e) => setVet('local', e.target.value)}>{OC_LOCAIS.map((l) => <option key={l} value={l}>{l}</option>)}</select>
                </label>
                <label className="oc-vet-f"><span>Nome</span>
                  <input value={vet.nome} placeholder="Nome do veterinário responsável" onChange={(e) => setVet('nome', e.target.value)} />
                </label>
              </div>
            </div>
            <div className="oc-sed-table">
              <div className="oc-sed-thead"><span>Tempo</span><span>Medicamento</span><span>Quantidade</span><span></span></div>
              {rows.map((r, i) => (
                <div key={i} className="oc-sed-trow">
                  <input value={r.tempo} placeholder="00:00" onChange={(e) => setRow(i, 'tempo', e.target.value)} />
                  <select value={r.med} onChange={(e) => setRow(i, 'med', e.target.value)}>{OC_SED_MEDS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
                  <input value={r.qtd} placeholder="mg / mL" onChange={(e) => setRow(i, 'qtd', e.target.value)} />
                  <button className="oc-sed-x" onClick={() => delRow(i)}>×</button>
                </div>
              ))}
              {rows.length === 0 && <div className="oc-sed-empty">Nenhuma medicação registrada.</div>}
              <button className="oc-sed-add" onClick={addRow}>+ Adicionar medicação</button>
            </div>
          </div>
        )}
      </div>

      <div className="od-step-actions"><button className="od-back-btn" onClick={() => go('paciente')}>← Anterior</button><button className="od-next" onClick={() => go('odontograma')}>Próximo →</button></div>
    </div>
  );
}

/* ============================================================
   PASSO 3 — GRÁFICO VISUAL  (OdGraficoStep)
   SpeciesArch (cão/gato) ou BaseSvgChart (equino) como fundo +
   camada <canvas> para desenho livre, formas, marcadores e símbolos.
   ============================================================ */
const GX_TOOLS = [
  { id: 'pencil', g: '✏️', label: 'Pencil · Lápis' },
  { id: 'eraser', g: '◇', label: 'Eraser · Borracha' },
  { id: 'tooth-fill', g: '🪣', label: 'Balde · Pintar dente inteiro' },
  { id: 'fcircle', g: '●', label: 'Fill · Preenchido' },
  { id: 'circle', g: '○', label: 'Circle · Círculo' },
  { id: 'line', g: '╱', label: 'Line · Linha' },
  { id: 'arrow', g: '↗', label: 'Arrow · Seta' },
];
const GX_MARKERS = [
  { id: 'mk-atr', g: '◣', label: 'ATR / ETR' },
  { id: 'mk-sharp', g: '∠', label: 'Sharp Edges' },
  { id: 'mk-ramp', g: '▲', label: 'Ramps' },
  { id: 'mk-hook', g: '◥', label: 'Hooks' },
  { id: 'mk-protub', g: '≡', label: 'Protuberant' },
  { id: 'mk-wave', g: '≈', label: 'Waves' },
  { id: 'mk-incis', g: '⊕', label: 'Incisors' },
  { id: 'mk-move', g: '✛', label: 'Move' },
  { id: 'mk-frac', g: '⚡', label: 'Fracture' },
];
const GX_STATUS = [
  { id: 'st-diastema', g: '‖', label: 'Diastema' },
  { id: 'st-wolf', g: '⊙', label: 'Wolf tooth' },
  { id: 'st-caps', g: '©', label: 'Caps' },
  { id: 'st-ulcer', g: 'U', label: 'Ulceration' },
  { id: 'st-tartar', g: 'T', label: 'Tartar' },
];
const GX_GLYPH = {};
[...GX_MARKERS, ...GX_STATUS].forEach((s) => { GX_GLYPH[s.id] = s.g; });
const GX_COLORS = ['#111111', '#ef4444', '#2a6fdb', '#1f8a5b', '#e8852b'];
const gxIsStamp = (t) => t && (t.startsWith('mk-') || t.startsWith('st-'));

function gxLoadStore(name) {
  try { const d = (window.VtStore && window.VtStore.getData()) || {}; return ((d.odontoGraficos || {})[name]) || { current: null, list: [] }; } catch (e) { return { current: null, list: [] }; }
}
function gxSaveStore(name, url) {
  try {
    if (!window.VtStore || !name) return;
    const d = window.VtStore.getData() || {};
    const all = { ...(d.odontoGraficos || {}) };
    const prev = all[name] || { current: null, list: [] };
    const entry = { date: new Date().toLocaleDateString('pt-BR'), url };
    all[name] = { current: url, list: [entry, ...(prev.list || [])].slice(0, 12) };
    window.VtStore.setData({ odontoGraficos: all });
  } catch (e) {}
}

function OdGraficoStep({ chart, setChart, species, useSpeciesArch, isEquine, BaseSvgChart, selectedId, onToothClick, selectedTooth, setStatus, toggleFinding, setNote, setSeverity, onClosePanel, layers, setLayers, go }) {
  const CW = useSpeciesArch ? 880 : 1390;
  const CH = useSpeciesArch ? 560 : 511;
  const canvasRef = React.useRef(null);
  const ctxRef = React.useRef(null);
  const undoRef = React.useRef([]);
  const actionsRef = React.useRef([]);
  const draftRef = React.useRef(null);
  const pendingRef = React.useRef(null);
  const [tool, setTool] = React.useState('select');
  const [color, setColor] = React.useState('#ef4444');
  const [size, setSize] = React.useState(3);
  const [canUndo, setCanUndo] = React.useState(false);
  const [showIncisor, setShowIncisor] = React.useState(false);
  const [showAttach, setShowAttach] = React.useState(false);
  const [prevOpen, setPrevOpen] = React.useState(false);
  const name = chart.patientName || '';
  const dateBR = (chart.examDate || '').split('-').reverse().join('/') || new Date().toLocaleDateString('pt-BR');

  React.useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    c.width = CW; c.height = CH;
    ctxRef.current = c.getContext('2d');
    undoRef.current = []; setCanUndo(false);
  }, [CW, CH]);

  const getPos = (e) => {
    const c = canvasRef.current; const rect = c.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (c.width / rect.width), y: (e.clientY - rect.top) * (c.height / rect.height) };
  };
  const snapshot = () => ctxRef.current.getImageData(0, 0, CW, CH);
  const restore = (img) => ctxRef.current.putImageData(img, 0, 0);
  const pushUndo = () => { try { undoRef.current.push(snapshot()); if (undoRef.current.length > 20) undoRef.current.shift(); setCanUndo(true); } catch (e) {} };
  const pushDraw = () => { pushUndo(); actionsRef.current.push({ t: 'draw' }); };
  const doUndo = () => {
    const a = actionsRef.current.pop();
    if (!a) { const s = undoRef.current.pop(); if (s) restore(s); setCanUndo(false); return; }
    if (a.t === 'mark') { removeMark(a.id); }
    else if (a.t === 'fill') { restoreToothFill(a.toothId, a.previous); }
    else if (a.t === 'clear') {
      const s = undoRef.current.pop(); if (s) restore(s);
      setChart((c) => ({ ...c, gmarks: a.gmarks, toothFills: a.toothFills }));
    }
    else { const s = undoRef.current.pop(); if (s) restore(s); }
    setCanUndo(actionsRef.current.length > 0);
  };
  const drawDataURL = (url, undo) => { const img = new Image(); img.onload = () => { const ctx = ctxRef.current; if (undo) pushDraw(); ctx.clearRect(0, 0, CW, CH); ctx.drawImage(img, 0, 0, CW, CH); }; img.src = url; };

  /* ---- marcações por dente (camada SVG removível) ---- */
  const addMark = (m) => { actionsRef.current.push({ t: 'mark', id: m.id }); setCanUndo(true); setChart((c) => ({ ...c, gmarks: [...(c.gmarks || []), m] })); };
  const removeMark = (id) => { actionsRef.current = actionsRef.current.filter((a) => a.id !== id); setChart((c) => ({ ...c, gmarks: (c.gmarks || []).filter((m) => m.id !== id) })); };
  const toothAtPoint = (clientX, clientY) => {
    try {
      const els = document.elementsFromPoint(clientX, clientY);
      for (const el of els) {
        const g = el.closest && el.closest('[data-tooth]');
        if (g) { const r = g.getBoundingClientRect(); return { toothId: g.getAttribute('data-tooth'), cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }
      }
    } catch (e) {}
    return null;
  };
  const restoreToothFill = (toothId, value) => setChart((c) => {
    const toothFills = { ...(c.toothFills || {}) };
    if (value) toothFills[toothId] = value; else delete toothFills[toothId];
    return { ...c, toothFills };
  });
  const paintTooth = (toothId) => {
    const previous = (chart.toothFills || {})[toothId] || null;
    const next = previous === color ? null : color;
    actionsRef.current.push({ t: 'fill', toothId, previous });
    setCanUndo(true);
    restoreToothFill(toothId, next);
    const numericId = Number(toothId);
    const tooth = (window.SpeciesTeeth && window.SpeciesTeeth[toothId]) || window.EquiData.makeTooth(Math.floor(numericId / 100), numericId % 100);
    onToothClick(tooth);
  };

  const stamp = (ctx, t, x, y) => {
    ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(20, size * 8)}px 'Hanken Grotesk', sans-serif`;
    ctx.fillText(GX_GLYPH[t] || '?', x, y); ctx.restore();
  };
  const drawLine = (ctx, x0, y0, x1, y1, arrow) => {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    if (arrow) { const a = Math.atan2(y1 - y0, x1 - x0); const h = Math.max(11, ctx.lineWidth * 3.2);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - h * Math.cos(a - 0.42), y1 - h * Math.sin(a - 0.42));
      ctx.moveTo(x1, y1); ctx.lineTo(x1 - h * Math.cos(a + 0.42), y1 - h * Math.sin(a + 0.42)); ctx.stroke(); }
  };

  const onDown = (e) => {
    if (tool === 'select') return;
    e.preventDefault();
    const { x, y } = getPos(e); const ctx = ctxRef.current;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = size; ctx.globalCompositeOperation = 'source-over';
    if (tool === 'tooth-fill') {
      const hit = toothAtPoint(e.clientX, e.clientY);
      if (hit) paintTooth(hit.toothId); else ogToast('Clique diretamente sobre um dente para pintá-lo.', 'err');
      return;
    }
    if (gxIsStamp(tool)) {
      const hit = toothAtPoint(e.clientX, e.clientY);
      const cr = canvasRef.current.getBoundingClientRect();
      let mx, my, toothId = null;
      if (hit) { toothId = hit.toothId; mx = (hit.cx - cr.left) * (CW / cr.width); my = (hit.cy - cr.top) * (CH / cr.height); }
      else { const p = getPos(e); mx = p.x; my = p.y; }
      addMark({ id: 'GM' + Date.now() + Math.random().toString(36).slice(2, 5), toothId, x: mx, y: my, glyph: GX_GLYPH[tool] || '?', color, fs: 18 + size * 2, kind: tool.slice(0, 2) === 'st' ? 'status' : 'marker' });
      return;
    }
    if (tool === 'pencil' || tool === 'eraser') {
      pushDraw();
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.lineWidth = tool === 'eraser' ? size * 6 : size;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.01, y + 0.01); ctx.stroke();
      draftRef.current = { mode: 'free' };
      try { canvasRef.current.setPointerCapture(e.pointerId); } catch (er) {}
      return;
    }
    if (tool === 'circle' || tool === 'fcircle') {
      pushDraw();
      draftRef.current = { mode: 'shape', snap: snapshot(), sx: x, sy: y };
      try { canvasRef.current.setPointerCapture(e.pointerId); } catch (er) {}
      return;
    }
    if (tool === 'line' || tool === 'arrow') {
      if (!pendingRef.current) { pendingRef.current = { sx: x, sy: y, snap: snapshot() }; }
      else { const p = pendingRef.current; restore(p.snap); pushDraw(); drawLine(ctx, p.sx, p.sy, x, y, tool === 'arrow'); pendingRef.current = null; }
    }
  };
  const onMove = (e) => {
    const ctx = ctxRef.current; if (!ctx) return; const d = draftRef.current;
    if (d && d.mode === 'free') { const { x, y } = getPos(e); ctx.lineTo(x, y); ctx.stroke(); return; }
    if (d && d.mode === 'shape') { const { x, y } = getPos(e); restore(d.snap); const r = Math.hypot(x - d.sx, y - d.sy); ctx.beginPath(); ctx.arc(d.sx, d.sy, r, 0, Math.PI * 2); if (tool === 'fcircle') ctx.fill(); else ctx.stroke(); return; }
    if (pendingRef.current) { const { x, y } = getPos(e); const p = pendingRef.current; restore(p.snap); drawLine(ctx, p.sx, p.sy, x, y, tool === 'arrow'); }
  };
  const onUp = () => { const ctx = ctxRef.current; if (ctx) ctx.globalCompositeOperation = 'source-over'; draftRef.current = null; };

  const clearAll = () => { if (window.confirm('Limpar todo o gráfico? Esta ação pode ser desfeita com Desfazer.')) { pushUndo(); actionsRef.current.push({ t: 'clear', gmarks: [...(chart.gmarks || [])], toothFills: { ...(chart.toothFills || {}) } }); ctxRef.current.clearRect(0, 0, CW, CH); setChart((c) => ({ ...c, gmarks: [], toothFills: {} })); setCanUndo(true); ogToast('Gráfico limpo.'); } };
  const saveChart = () => {
    const base = canvasRef.current;
    const off = document.createElement('canvas'); off.width = CW; off.height = CH;
    const o = off.getContext('2d'); o.drawImage(base, 0, 0);
    (chart.gmarks || []).forEach((m) => { o.save(); o.fillStyle = m.color; o.textAlign = 'center'; o.textBaseline = 'middle'; o.font = `${m.fs || 22}px 'Hanken Grotesk', sans-serif`; o.fillText(m.glyph, m.x, m.y); o.restore(); });
    const url = off.toDataURL('image/png'); gxSaveStore(name, url); setShowAttach(true); ogToast('Gráfico salvo no histórico do paciente.');
  };
  const loadPrevious = () => { const s = gxLoadStore(name); if (s.current) { drawDataURL(s.current, true); ogToast('Gráfico anterior carregado.'); } else ogToast('Nenhum gráfico salvo para este paciente.', 'err'); };

  /* anexos */
  const fileRef = React.useRef(null);
  const onFiles = (e) => { const files = [...e.target.files]; files.forEach((file) => { const rd = new FileReader(); rd.onload = () => setChart((c) => ({ ...c, photos: [...(c.photos || []), { id: 'PH' + Date.now() + Math.random().toString(36).slice(2, 6), name: file.name, url: rd.result }] })); rd.readAsDataURL(file); }); e.target.value = ''; };
  const removePhoto = (id) => setChart((c) => ({ ...c, photos: (c.photos || []).filter((p) => p.id !== id) }));

  const store = gxLoadStore(name);
  const D = window.EquiData;

  return (
    <div className="gx-pane">
      <div className="gx-editor">
        {/* header navy */}
        <div className="gx-head">
          <div className="gx-head-title">Gráfico Visual <span className="gx-help" title="Desenhe sobre o arco dentário: ferramentas livres, marcadores e símbolos clínicos.">?</span></div>
          <div className="gx-head-step">3</div>
          <div className="gx-head-btns">
            <button className="gx-hbtn danger" onClick={clearAll}><span>✕</span> Limpar Gráfico</button>
            <button className="gx-hbtn" onClick={doUndo} disabled={!canUndo} style={!canUndo ? { opacity: .5 } : null}><span>↩</span> Desfazer</button>
            <span className="gx-hbtn" style={{ cursor: 'default' }}><span>📅</span> {dateBR}</span>
            <button className="gx-hbtn" onClick={() => setPrevOpen(true)}><span>📋</span> Gráficos Anteriores</button>
            <button className="gx-hbtn" onClick={saveChart}><span>📸</span> Adicionar/Salvar</button>
            <button className="gx-hbtn" onClick={() => go('anamnese')}><span>✕</span> Fechar</button>
          </div>
        </div>

        {/* sub-header */}
        {isEquine && (
          <div className="gx-sub">
            <button className="gx-pill teal" onClick={() => setShowIncisor((v) => !v)}>+ INCISOR VIEW</button>
          </div>
        )}

        {/* área do gráfico (flex 1) */}
        <div className="gx-chart">
          <div className="gx-stage" style={{ aspectRatio: `${CW} / ${CH}` }}>
            {useSpeciesArch
              ? <window.SpeciesArch species={species} marksByTooth={(layers && layers.achados) ? chart.marks : {}} selectedId={selectedId} onToothClick={onToothClick} />
              : (BaseSvgChart ? <BaseSvgChart marksByTooth={(layers && layers.achados) ? chart.marks : {}} fillsByTooth={chart.toothFills || {}} selectedId={selectedId} onToothClick={onToothClick} /> : null)}
            <canvas ref={canvasRef} className="gx-canvas" style={{ pointerEvents: tool === 'select' ? 'none' : 'auto', cursor: tool === 'select' ? 'default' : 'crosshair' }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} />
            <svg className="gx-marks" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
              {(chart.gmarks || []).map((m) => (
                <g key={m.id} className="gx-mark" style={{ pointerEvents: tool === 'select' ? 'auto' : 'none', cursor: 'pointer' }} onClick={() => removeMark(m.id)}>
                  <title>{tool === 'select' ? 'Clique para remover' : (m.toothId ? 'Dente ' + m.toothId : 'Marcação')}</title>
                  <text x={m.x} y={m.y} textAnchor="middle" dominantBaseline="central" fontSize={m.fs || 22} fontWeight="800" fill={m.color} stroke="#fff" strokeWidth="0.7" style={{ paintOrder: 'stroke' }}>{m.glyph}</text>
                </g>
              ))}
            </svg>
          </div>
          {selectedTooth && window.ToothPanel && (
            <div className="gx-toothpanel">
              <window.ToothPanel
                tooth={selectedTooth}
                marks={chart.marks[selectedTooth.id] || []}
                status={(chart.status && chart.status[selectedTooth.id]) || 'normal'}
                note={(chart.notes && chart.notes[selectedTooth.id]) || ''}
                severity={(chart.severity || {})[selectedTooth.id] || 0}
                onClose={onClosePanel}
                onStatus={(s) => setStatus(selectedTooth.id, s)}
                onToggleFinding={(f) => toggleFinding(selectedTooth.id, f)}
                onNote={(t) => setNote(selectedTooth.id, t)}
                onSeverity={(n) => setSeverity(selectedTooth.id, n)}
              />
            </div>
          )}
        </div>

        {/* toolbar — 3 módulos escuros */}
        <div className="gx-toolbar">
          <div className="gx-mod">
            <span className="gx-mod-badge">1</span>
            {GX_TOOLS.map((t) => <button key={t.id} className={`gx-tbtn${tool === t.id ? ' on' : ''}`} title={t.label} aria-label={t.label} onClick={() => setTool(t.id)}>{t.g}</button>)}
          </div>
          <div className="gx-mod">
            <span className="gx-mod-badge">2</span>
            {GX_MARKERS.map((t) => <button key={t.id} className={`gx-tbtn${tool === t.id ? ' on' : ''}`} title={t.label} onClick={() => setTool(t.id)}>{t.g}</button>)}
          </div>
          <div className="gx-mod">
            <span className="gx-mod-badge">3</span>
            {GX_STATUS.map((t) => <button key={t.id} className={`gx-tbtn${tool === t.id ? ' on' : ''}`} title={t.label} onClick={() => setTool(t.id)}>{t.g}</button>)}
          </div>
        </div>

        {/* cor + espessura + selecionar dente */}
        <div className="gx-controls">
          <button className={`gx-cursor${tool === 'select' ? ' on' : ''}`} onClick={() => setTool('select')}><span>↖</span> Selecionar Dente</button>
          <button className="gx-pill blue" onClick={loadPrevious}>+ LOAD PREVIOUS</button>
          <div className="gx-colors">
            {GX_COLORS.map((c) => <button key={c} className={`gx-color${color === c ? ' on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />)}
          </div>
          <div className="gx-espessura"><span>Espessura · {size}px</span><input type="range" min="1" max="8" step="1" value={size} onChange={(e) => setSize(Number(e.target.value))} /></div>
          <span className="gx-tip"><b>🪣 Pintar dente:</b> escolha uma cor e clique na peça · ela será pintada e selecionada para as demais ferramentas</span>
        </div>
      </div>

      {/* INCISOR VIEW + anexos (abaixo do editor) */}
      {isEquine && showIncisor && (
        <div className="gx-incisor">
          <div className="gx-incisor-head"><b>Vista Oclusal — Incisivos</b><button className="od-link" onClick={() => setShowIncisor(false)}>Fechar</button></div>
          <svg viewBox="0 0 520 230" className="gx-incisor-svg">
            <text x="260" y="18" textAnchor="middle" className="gx-inc-cap">SUPERIOR (Maxila)</text>
            {[['103', 70], ['102', 150], ['101', 230], ['201', 290], ['202', 370], ['203', 450]].map(([id, x], i) => (
              <g key={id}><rect x={x} y={30} width={i === 2 || i === 3 ? 64 : 56} height={62} rx={10} fill="#f4f6f9" stroke="#b9c2cd" strokeWidth="1.6" /><text x={x + (i === 2 || i === 3 ? 32 : 28)} y={66} textAnchor="middle" className="gx-inc-num">{id}</text></g>
            ))}
            <line x1="20" y1="115" x2="500" y2="115" stroke="#e2e7ee" strokeWidth="1.5" strokeDasharray="4 5" />
            <text x="260" y="135" textAnchor="middle" className="gx-inc-cap">INFERIOR (Mandíbula)</text>
            {[['403', 70], ['402', 150], ['401', 230], ['301', 290], ['302', 370], ['303', 450]].map(([id, x], i) => (
              <g key={id}><rect x={x} y={148} width={i === 2 || i === 3 ? 64 : 56} height={62} rx={10} fill="#f4f6f9" stroke="#b9c2cd" strokeWidth="1.6" /><text x={x + (i === 2 || i === 3 ? 32 : 28)} y={184} textAnchor="middle" className="gx-inc-num">{id}</text></g>
            ))}
          </svg>
        </div>
      )}

      {showAttach && (
        <div className="gx-attach">
          <div className="gx-incisor-head"><b>Anexos — Fotos do Procedimento</b><button className="od-link" onClick={() => setShowAttach(false)}>Ocultar</button></div>
          <div className="og-photos">
            {(chart.photos || []).map((p) => <div key={p.id} className="og-photo"><img src={p.url} alt={p.name} /><button className="og-photo-x" onClick={() => removePhoto(p.id)}>×</button></div>)}
            <button className="og-photo-add" onClick={() => fileRef.current && fileRef.current.click()}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              <span>Adicionar Foto</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onFiles} />
          </div>
        </div>
      )}

      {/* painéis inferiores preservados */}
      <div className="gx-bottom">
        {window.FindingsSummary && <window.FindingsSummary marksByTooth={chart.marks} notes={chart.notes} />}
        <div className="gx-bottom-col">
          {window.LayersCard && <window.LayersCard layers={layers} setLayers={setLayers} />}
          {window.LegendCard && <window.LegendCard />}
        </div>
      </div>

      {/* modal gráficos anteriores */}
      {prevOpen && (
        <div className="og-modal-bg og-noprint" onClick={() => setPrevOpen(false)}>
          <div className="og-modal" onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: '94vw' }}>
            <div className="og-modal-head"><h3>Gráficos Anteriores {name ? `· ${name}` : ''}</h3><button className="od-panel-x" onClick={() => setPrevOpen(false)}>×</button></div>
            {store.list.length === 0
              ? <p className="og-modal-sub">Nenhum gráfico salvo ainda. Use <b>Adicionar/Salvar</b> para arquivar o gráfico atual.</p>
              : <div className="gx-prev-list">
                  {store.list.map((it, i) => (
                    <button key={i} className="gx-prev-item" onClick={() => { drawDataURL(it.url, true); setPrevOpen(false); ogToast('Gráfico de ' + it.date + ' carregado.'); }}>
                      <img src={it.url} alt={'Gráfico ' + it.date} />
                      <span>{it.date}</span>
                    </button>
                  ))}
                </div>}
          </div>
        </div>
      )}

      <div className="od-step-actions"><button className="od-back-btn" onClick={() => go('anamnese')}>← Anterior</button><button className="od-next" onClick={() => go('achados')}>Próximo →</button></div>
    </div>
  );
}

Object.assign(window, { OdTratamentoStep, OdFinalizarStep, OdCondicoesStep, OdGraficoStep });
