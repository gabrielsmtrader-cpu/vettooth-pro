/* ============================================================
   VetTooth Pro — Prontuário · plano & desfecho
   Odontologia · Diagnósticos · Exames · Prescrições ·
   Procedimentos · Orçamento · Anexos · Finalização
   ============================================================ */
const { useState: lUse, useRef: lRef, useEffect: lEff } = React;
const taStyle = { width: '100%', fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)', background: '#fff', border: '1px solid var(--line)', borderRadius: 9, padding: '8px 11px', minHeight: 48, resize: 'vertical', lineHeight: 1.5, marginTop: 6 };

/* ---------- Odontologia ---------- */
function PrOdonto({ at, patch, patient, chartOpen, setChartOpen }) {
  const editing = chartOpen; // string id | 'new' | false
  const flags = at.odonto.flags;
  const charts = at.odonto.charts || [];
  const toggle = (f) => patch({ odonto: { ...at.odonto, flags: { ...flags, [f]: !flags[f] } } });
  const setField = (k, v) => patch({ odonto: { ...at.odonto, [k]: v } });
  const active = Object.keys(flags).filter((f) => flags[f]);
  const saveNew = () => {
    const entry = { id: 'OG' + Date.now().toString(36), date: window.PR.todayBR(), vet: (at.vet || '').replace('M.V. ', ''), summary: at.motivo || 'Odontograma' };
    patch({ odonto: { ...at.odonto, charts: [entry, ...charts] } });
    setChartOpen(false);
    window.vtToast('Odontograma salvo no prontuário.', 'ok');
  };
  return (
    <div>
      <div className="pr-sec-head">
        <div><h2 className="pr-h">Odontograma</h2><p className="pr-h-sub">Odontogramas realizados neste paciente · abra um novo para registrar</p></div>
        <button className="pr-qbtn primary" onClick={() => setChartOpen('new')}><VtIcon name="tooth" size={16} /> Novo odontograma</button>
      </div>

      <div className="pr-block">
        <div className="pr-charts">
          <button className="pr-chart-new" onClick={() => setChartOpen('new')}>
            <span className="ic"><VtIcon name="plus" size={22} /></span>
            Abrir novo odontograma
          </button>
          {charts.map((c) => (
            <button key={c.id} className="pr-chart-card" onClick={() => setChartOpen(c.id)}>
              <span className="pr-chart-thumb"><VtIcon name="tooth" size={40} /></span>
              <span className="pr-chart-meta"><b>{c.summary}</b><i>{c.date} · {c.vet}</i></span>
            </button>
          ))}
        </div>
        {charts.length === 0 && <p className="pr-empty" style={{ paddingTop: 4 }}>Nenhum odontograma registrado ainda.</p>}
      </div>

      <div className="pr-block">
        <p className="pr-block-title"><VtIcon name="tooth" size={15} /> Achados clínicos {active.length ? `(${active.length})` : ''}</p>
        <div className="pr-checks">
          {window.PR.odontoFlags.map((f) => (
            <button key={f} className={`pr-check${flags[f] ? ' on' : ''}`} onClick={() => toggle(f)}>
              <span className="pr-check-box">{flags[f] ? '✓' : ''}</span>{f}
            </button>
          ))}
        </div>
      </div>

      <div className="pr-2col" style={{ alignItems: 'start' }}>
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">Observações odontológicas</h3>
          <textarea style={{ ...taStyle, marginTop: 0, minHeight: 120 }} value={at.odonto.obs} onChange={(e) => setField('obs', e.target.value)} placeholder="Descrição detalhada dos achados, dentes envolvidos, estágios..." />
        </div>
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">Plano odontológico · procedimentos indicados</h3>
          <textarea style={{ ...taStyle, marginTop: 0, minHeight: 120 }} value={at.odonto.plano} onChange={(e) => setField('plano', e.target.value)} placeholder="Ex.: Profilaxia, exodontia do elemento 108, controle em 6 meses..." />
        </div>
      </div>

      {editing && (
        <div className="fin-modal-bg" onClick={() => setChartOpen(false)} style={{ padding: 0 }}>
          <div className="fin-modal" style={{ width: '100vw', height: '100vh', maxWidth: 'none', borderRadius: 0, padding: 0, display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--line)', flex: 'none' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Odontograma · {patient.name} {editing === 'new' ? '· novo' : ''}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {editing === 'new' && <button className="vt-btn-primary" onClick={saveNew}>Salvar odontograma</button>}
                <button className="vt-btn-ghost" onClick={() => setChartOpen(false)}>Fechar ✕</button>
              </div>
            </div>
            <iframe src={`EquiChart.html?patient=${encodeURIComponent(patient.name || '')}&owner=${encodeURIComponent(patient.owner || '')}`} title="Odontograma" style={{ flex: 1, border: 'none', width: '100%' }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Diagnósticos ---------- */
const PROGNOSTICO_OPTS = [
  { v: 'Bom', color: '#16a34a' },
  { v: 'Favorável', color: '#0891b2' },
  { v: 'Reservado', color: '#d97706' },
  { v: 'Desfavorável', color: '#dc2626' },
];
function PrDiagnosticos({ at, set }) {
  const d = at.diag;
  const F = (window.vtDiagCfg ? window.vtDiagCfg() : (window.PR_DIAG_DEFAULT || [])).map((x) => [x.k, x.label, x.ph]);
  return (
    <div>
      <div className="pr-sec-head"><div><h2 className="pr-h">Diagnósticos</h2><p className="pr-h-sub">Conclusão clínica do atendimento</p></div></div>
      <div className="vt-card vt-sec" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {F.map(([k, label, ph]) => (
          <div key={k} className="pr-field">
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{label}{k === 'principal' ? <i style={{ color: 'var(--red)' }}> *</i> : null}</span>
            <VtRichText value={d[k] || ''} onChange={(html) => set(k, html)} placeholder={ph} minHeight={k === 'principal' ? 70 : 52} />
          </div>
        ))}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Prognóstico</p>
          <div className="pr-quickpick">
            {PROGNOSTICO_OPTS.map(({ v, color }) => {
              const sel = d.prognostico === v;
              return (
                <button key={v} className={sel ? 'on' : ''} onClick={() => set('prognostico', sel ? '' : v)}
                  style={sel ? { background: color, borderColor: color, color: '#fff' } : { borderColor: color, color: color }}>
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Exames solicitados ---------- */
function PrExames({ at, patch, patient }) {
  const [custom, setCustom] = lUse('');
  const sel = at.exames;
  const examObs = at.exameObs || {};       // { [nomeExame]: 'observação' }
  const motivos = at.exameMotivos || [''];  // array de strings
  const instrucoes = at.exameInstrucoes || '';

  const toggle = (n) => patch({ exames: sel.includes(n) ? sel.filter((x) => x !== n) : [...sel, n] });
  const setExameObs = (nome, val) => patch({ exameObs: { ...examObs, [nome]: val } });
  const setMotivo = (i, val) => { const m = [...motivos]; m[i] = val; patch({ exameMotivos: m }); };
  const addMotivo = () => patch({ exameMotivos: [...motivos, ''] });
  const delMotivo = (i) => patch({ exameMotivos: motivos.filter((_, j) => j !== i) });

  const addCustom = () => { if (custom.trim() && !sel.includes(custom.trim())) { patch({ exames: [...sel, custom.trim()] }); setCustom(''); } };
  const presets = window.vtExamPresets();
  const applyPreset = (p) => { patch({ exames: Array.from(new Set([...sel, ...p.itens])) }); window.vtToast(`Perfil "${p.nome}" adicionado.`, 'ok'); };
  const [editor, setEditor] = lUse(false);

  const examText = () => {
    const idade = patient.idade || (window.ageFrom ? window.ageFrom(patient.birth) : '') || '—';
    let s = `SOLICITAÇÃO DE EXAMES\n${'─'.repeat(38)}\n`;
    s += `Paciente: ${patient.name}   Espécie: ${patient.species}   Raça: ${patient.breed || '—'}\n`;
    s += `Sexo: ${patient.sex || '—'}   Peso: ${patient.weight || '—'}   Idade: ${idade}\n`;
    s += `Cor/pelagem: ${patient.color || '—'}   Microchip: ${patient.chip || '—'}\n`;
    s += `Tutor(a): ${patient.owner}${patient.cpf ? '   CPF: ' + patient.cpf : ''}\n${'─'.repeat(38)}\n\n`;
    const mots = motivos.filter(Boolean);
    if (mots.length) s += `Suspeita(s) clínica(s): ${mots.join(' · ')}\n\n`;
    else if (at.exameSuspeita) s += `Suspeita clínica: ${at.exameSuspeita}\n\n`;
    s += `Exames solicitados:\n`;
    (sel.length ? sel : ['___________']).forEach((e, i) => {
      s += `  ${i + 1}) ${e}\n`;
      const ob = examObs[e];
      if (ob) s += `      Obs: ${ob}\n`;
    });
    if (instrucoes) s += `\nInstruções / Observações gerais:\n${instrucoes}\n`;
    s += `\nData: ${window.PR.todayBR()}`;
    return s;
  };

  const inputStyle = { fontFamily: 'inherit', fontSize: 13, border: '1px solid var(--line)', borderRadius: 8, padding: '7px 11px', width: '100%', boxSizing: 'border-box', background: '#fff' };

  return (
    <div>
      <div className="pr-sec-head">
        <div><h2 className="pr-h">Exames solicitados</h2><p className="pr-h-sub">Selecione os exames para gerar a solicitação</p></div>
        <button className="pr-qbtn primary" disabled={!sel.length} style={!sel.length ? { opacity: .5 } : null} onClick={() => setEditor(true)}><VtIcon name="receipt" size={16} /> Pré-visualizar / PDF</button>
      </div>
      <div className="rx-split">
        <div className="rx-build">
          {/* Motivos / Suspeitas clínicas */}
          <div className="pr-block">
            <p className="pr-block-title">Motivos / Suspeitas clínicas</p>
            {motivos.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input style={{ ...inputStyle, flex: 1 }} value={m} onChange={(e) => setMotivo(i, e.target.value)} placeholder={`Suspeita ${i + 1} — Ex.: DRC a esclarecer`} />
                {motivos.length > 1 && <button className="pr-del-btn" onClick={() => delMotivo(i)}>✕</button>}
              </div>
            ))}
            <button className="pr-addrow" style={{ marginTop: 4 }} onClick={addMotivo}><VtIcon name="plus" size={14} /> Adicionar suspeita</button>
          </div>
          {/* Perfis rápidos */}
          <div className="pr-block">
            <p className="pr-block-title">Perfis de exames</p>
            <div className="vt-chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {presets.map((p) => <button key={p.id} className="pr-quickpick-btn" style={prChipStyle(false)} onClick={() => applyPreset(p)}>+ {p.nome}</button>)}
              <span className="vt-muted" style={{ fontSize: 12, alignSelf: 'center' }}>· personalize em Configurações › Exames</span>
            </div>
          </div>
          {/* Catálogo por categoria */}
          {(window.PR_EXAM_CAT || []).map((g) => (
            <div className="pr-block" key={g.grupo}>
              <p className="pr-block-title">{g.grupo}</p>
              <div className="pr-examgrid">
                {g.itens.map((n) => (
                  <button key={n} className={`pr-exam${sel.includes(n) ? ' on' : ''}`} onClick={() => toggle(n)}>
                    <span className="pr-check-box" style={sel.includes(n) ? { background: 'var(--navy)', borderColor: 'var(--navy)' } : null}>{sel.includes(n) ? '✓' : ''}</span>
                    {n}
                  </button>
                ))}
              </div>
              {/* Observações inline dos exames selecionados neste grupo */}
              {g.itens.filter((n) => sel.includes(n)).map((n) => (
                <div key={n + '-obs'} style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--teal-d)', minWidth: 6, fontWeight: 700 }}>↳</span>
                  <span style={{ fontSize: 12, color: 'var(--ink)', flex: '0 0 auto', maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}:</span>
                  <input style={{ ...inputStyle, fontSize: 12, padding: '4px 9px' }} value={examObs[n] || ''} onChange={(e) => setExameObs(n, e.target.value)} placeholder="Obs. opcional" />
                </div>
              ))}
            </div>
          ))}
          {/* Exame personalizado */}
          <div className="vt-card vt-sec">
            <h3 className="vt-sec-title">Exame personalizado {sel.length ? <span className="vt-count-badge">{sel.length} selecionado(s)</span> : null}</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <input style={{ ...taStyle, minHeight: 0, marginTop: 0, flex: 1 }} value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} placeholder="Nome do exame..." />
              <button className="vt-btn-ghost" onClick={addCustom}><VtIcon name="plus" size={15} /> Adicionar</button>
            </div>
            {sel.length > 0 && <div className="vt-chip-row" style={{ marginTop: 14 }}>{sel.map((s) => <span key={s} className="vt-tag teal" style={{ cursor: 'pointer' }} onClick={() => toggle(s)}>{s} ✕</span>)}</div>}
          </div>
          {/* Instruções / Observações gerais */}
          <div className="pr-block" style={{ marginTop: 12 }}>
            <p className="pr-block-title">Instruções / Observações gerais da solicitação <span className="vt-muted">(opcional)</span></p>
            <textarea className="rx-instrucoes" rows={3} value={instrucoes} onChange={(e) => patch({ exameInstrucoes: e.target.value })} placeholder="Ex.: Jejum de 8h. Entregar resultado no retorno em 15 dias..." />
          </div>
        </div>
        <div className="rx-preview-col">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="pr-block-title" style={{ margin: 0 }}>Prévia com design</span>
            <button className="vt-btn-primary" style={{ fontSize: 12, padding: '5px 14px' }} disabled={!sel.length} onClick={() => setEditor(true)}><VtIcon name="print" size={14} /> Emitir PDF</button>
          </div>
          {(() => { const c = window.vtClinic ? window.vtClinic() : {}; const vet = window.vtVetSignature ? window.vtVetSignature(at.vet) : {}; const DP = window.DocPage; return DP ? <DP tipo="Solicitação de exames" patient={patient} at={at} body="" accent={c.docColor||'#14a8a0'} layout={c.docLayout||'classico'} c={c} vet={vet} signed={false} onToggleSigned={null} /> : null; })()}
        </div>
      </div>
      {editor && <DocEditor tipo="Solicitação de exames" patient={patient} at={at} initialBody={examText()} onClose={() => setEditor(false)} onSave={() => setEditor(false)} />}
    </div>
  );
}

/* ---------- Prescrições ---------- */
function PrPrescricoes({ at, patch, patient }) {
  const rows = at.prescricoes;
  const tipo = at.prescricaoTipo || 'comum';
  const [editor, setEditor] = lUse(false);
  const [busca, setBusca] = lUse('');
  const kg = window.rxKg(patient);
  const isManip = tipo === 'manipulado';
  const setRows = (r) => patch({ prescricoes: r });
  const upd = (i, patchRow) => setRows(rows.map((r, j) => j === i ? { ...r, ...patchRow } : r));
  const del = (i) => setRows(rows.filter((_, j) => j !== i));
  const tipoInfo = window.PR_RX_TYPES.find((t) => t.id === tipo) || window.PR_RX_TYPES[0];
  const presets = window.vtRxPresets();
  const applyPreset = (p) => { patch({ prescricaoTipo: p.tipo, prescricoes: [...rows, ...p.itens.map((it) => ({ ...it, pos: {} }))] }); window.vtToast(`Modelo "${p.nome}" aplicado.`, 'ok'); };

  const addMed = (m) => {
    if (m && m.controlado && tipo === 'comum') patch({ prescricaoTipo: 'controlada' });
    setRows([...rows, m
      ? { nome: m.nome, ativo: m.ativo, dose: m.dose, apresentacao: '', conc: '', qtdProd: '1', pos: { viaFull: 'Oral' }, obs: '' }
      : { nome: '', dose: '', apresentacao: '', conc: '', qtdProd: '1', pos: { viaFull: 'Oral' }, obs: '' }]);
    setBusca('');
  };
  const addManip = () => setRows([...rows, { forma: 'Suspensão', qsp: '', farmacia: 'Veterinária', qtdProd: '1', componentes: [{ ativo: '', conc: '', unidade: 'mg' }], pos: { viaFull: 'Oral' }, posologia: '' }]);

  const bulario = busca.trim() ? window.PR_MEDS.filter((m) => (m.nome + ' ' + m.ativo).toLowerCase().includes(busca.toLowerCase())).slice(0, 8) : [];

  return (
    <div>
      <div className="pr-sec-head">
        <div><h2 className="pr-h">Prescrições</h2><p className="pr-h-sub">Dose calculada para o peso de {patient.name} ({patient.weight || '—'})</p></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {at.rxNumero && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', background: 'var(--surface-2)', padding: '3px 10px', borderRadius: 6, letterSpacing: '0.04em' }}>Nº {at.rxNumero}</span>}
          <button className="pr-qbtn primary" disabled={!rows.length} style={!rows.length ? { opacity: .5 } : null} onClick={() => { window.rxGetNumero(at, patch); setEditor(true); }}><VtIcon name="receipt" size={16} /> Pré-visualizar / PDF</button>
        </div>
      </div>

      <div className="pr-block">
        <p className="pr-block-title">Tipo de prescrição</p>
        <div className="vt-chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
          {window.PR_RX_TYPES.map((t) => <button key={t.id} onClick={() => patch({ prescricaoTipo: t.id })} style={prChipStyle(tipo === t.id)}>{t.label}</button>)}
        </div>
        <p className="vt-ai-note"><VtIcon name="spark" size={15} /> {tipoInfo.nota}</p>
        {tipo === 'controlada' && (
          <div style={{ marginTop: 10, padding: '10px 14px', background: '#fff3cd', borderRadius: 8, border: '1px solid #f5c842', fontSize: 13, color: '#7a5a00' }}>
            <b>⚠ Receituário de Controle Especial (Portaria 344/98)</b> — Válido por <b>30 dias</b>.
            Emita em <b>2 vias</b> (1ª via: farmácia · 2ª via: responsável). Identifique o paciente e o tutor com CPF e endereço completo.
          </div>
        )}
      </div>

      <div className="rx-split">
        <div className="rx-build">
          {!isManip && (
            <div className="pr-block">
              <p className="pr-block-title">Bulário · buscar medicamento</p>
              <div className="vt-search inline" style={{ marginBottom: 8 }}><VtIcon name="search" size={16} /><input placeholder="Princípio ativo ou nome comercial..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
              {bulario.length > 0 && (
                <div className="rx-bul-list">
                  {bulario.map((m) => (
                    <button key={m.nome} className="rx-bul-item" onClick={() => addMed(m)}>
                      <span><b>{m.nome}</b> {m.controlado && <span className="vt-tag red" style={{ fontSize: 9.5 }}>controlado</span>}<i>{m.ativo} · {m.dose} · {m.cat}</i></span>
                      <VtIcon name="plus" size={15} />
                    </button>
                  ))}
                </div>
              )}
              {!isManip && presets.length > 0 && (
                <div className="vt-chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
                  {presets.map((p) => <button key={p.id} className="pr-quickpick-btn" style={prChipStyle(false)} onClick={() => applyPreset(p)}>+ {p.nome}</button>)}
                </div>
              )}
            </div>
          )}

          {rows.length === 0 ? <p className="pr-empty">{isManip ? 'Adicione uma fórmula manipulada.' : 'Busque no bulário, use um modelo ou adicione manualmente.'}</p>
            : rows.map((r, i) => isManip
              ? <RxManipCard key={i} r={r} idx={i} onChange={(p) => upd(i, p)} onDel={() => del(i)} />
              : <RxMedCard key={i} r={r} idx={i} kg={kg} onChange={(p) => upd(i, p)} onDel={() => del(i)} />)}

          <button className="pr-addrow" onClick={() => isManip ? addManip() : addMed(null)}><VtIcon name="plus" size={14} /> {isManip ? 'Adicionar fórmula manipulada' : 'Adicionar medicamento manual'}</button>
        </div>

        <div className="rx-preview-col">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="pr-block-title" style={{ margin: 0 }}>Prévia com design</span>
            <button className="vt-btn-primary" style={{ fontSize: 12, padding: '5px 14px' }} disabled={!rows.length} onClick={() => { window.rxGetNumero(at, patch); setEditor(true); }}><VtIcon name="print" size={14} /> Emitir PDF</button>
          </div>
          {(() => { const c = window.vtClinic ? window.vtClinic() : {}; const vet = window.vtVetSignature ? window.vtVetSignature(at.vet) : {}; const DP = window.DocPage; return DP ? <DP tipo={`Receituário ${tipoInfo.label}`} patient={patient} at={at} body="" accent={c.docColor||'#14a8a0'} layout={c.docLayout||'classico'} c={c} vet={vet} signed={false} onToggleSigned={null} /> : null; })()}
        </div>
      </div>

      <div className="pr-block" style={{ marginTop: 12 }}>
        <p className="pr-block-title">Instruções gerais do tratamento <span className="vt-muted" style={{ fontWeight: 400, fontSize: 12 }}>(opcional)</span></p>
        <textarea
          className="rx-instrucoes"
          rows={3}
          value={at.prescricaoInstrucoes || ''}
          onChange={(e) => patch({ prescricaoInstrucoes: e.target.value })}
          placeholder="Ex: Alimentação pastosa por 7 dias. Uso de colar elizabetano. Retorno em 10 dias para retirada de pontos."
        />
      </div>

      <RxMedDatalist />
      {editor && <DocEditor tipo={`Receituário ${tipoInfo.label}`} patient={patient} at={at} initialBody={window.rxToText(at, patient)} onClose={() => setEditor(false)} onSave={() => setEditor(false)} />}
    </div>
  );
}

/* construtor de posologia estruturada reutilizável */
function RxPosBuilder({ pos, onChange }) {
  const p = pos || {};
  const set = (k) => (v) => onChange({ ...p, [k]: v });
  const auto = window.rxPosologiaAuto(p);
  const modoAuto = !p.modoLivre;
  const setModo = (livre) => onChange({ ...p, modoLivre: livre });
  return (
    <div className="rx-pos">
      <div className="rx-pos-toggle-bar">
        <span className="rx-pos-label">Posologia</span>
        <div className="rx-pos-toggle">
          <button className={`rx-pos-tab${modoAuto ? ' active' : ''}`} onClick={() => setModo(false)}>Automática</button>
          <button className={`rx-pos-tab${!modoAuto ? ' active' : ''}`} onClick={() => setModo(true)}>Texto livre</button>
        </div>
      </div>
      {modoAuto ? (
        <>
          <div className="rx-pos-grid">
            <label><span>Dosagem</span><select value={p.dosagem || ''} onChange={(e) => set('dosagem')(e.target.value)}><option value="">—</option>{window.PR_RX_DOSAGENS.map((d) => <option key={d}>{d}</option>)}</select></label>
            <label><span>Medida</span><select value={p.medida || ''} onChange={(e) => set('medida')(e.target.value)}><option value="">—</option>{window.PR_RX_MEDIDAS.map((m) => <option key={m}>{m}</option>)}</select></label>
            <label><span>A cada</span><input value={p.freqNum || ''} onChange={(e) => set('freqNum')(e.target.value)} placeholder="8" /></label>
            <label><span>Período</span><select value={p.freqUni || ''} onChange={(e) => set('freqUni')(e.target.value)}><option value="">—</option>{window.PR_RX_PERIODOS.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label><span>Durante</span><input value={p.durNum || ''} disabled={p.durCont} onChange={(e) => set('durNum')(e.target.value)} placeholder="7" /></label>
            <label><span>Período</span><select value={p.durUni || ''} disabled={p.durCont} onChange={(e) => set('durUni')(e.target.value)}><option value="">—</option>{window.PR_RX_PERIODOS.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label><span>Via</span><select value={p.viaFull || 'Oral'} onChange={(e) => set('viaFull')(e.target.value)}>{window.PR_RX_VIAS_FULL.map((v) => <option key={v}>{v}</option>)}</select></label>
            <label style={{ alignSelf: 'end' }}><span style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={!!p.durCont} onChange={(e) => set('durCont')(e.target.checked)} /> Contínuo</span></label>
          </div>
          <div className="rx-pos-auto">{auto || 'Preencha os campos acima para gerar a posologia automaticamente.'}</div>
        </>
      ) : (
        <textarea className="rx-pos-textarea" rows={3} value={p.livre || ''} onChange={(e) => set('livre')(e.target.value)} placeholder="Ex: Administrar 1 comprimido a cada 12 horas por 7 dias, após alimentação." />
      )}
    </div>
  );
}

function RxMedCard({ r, idx, kg, onChange, onDel }) {
  const calc = window.rxDoseCalc(r.dose, kg);
  const ctrl = window.rxIsControlled(r.nome);
  const setPos = (pos) => onChange({ pos, posologia: pos.livre || window.rxPosologiaAuto(pos) });
  return (
    <div className="rx-card">
      <div className="rx-card-head">
        <span className="rx-card-num">{idx + 1}</span>
        <input className="rx-card-name" value={r.nome} onChange={(e) => onChange({ nome: e.target.value })} list="rx-medlist" placeholder="Medicamento" />
        {ctrl && <span className="vt-tag red" style={{ fontSize: 10 }}>Controlado</span>}
        <button className="pr-del-btn" onClick={onDel}>✕</button>
      </div>
      <div className="rx-card-row">
        <label><span>Apresentação</span><input value={r.apresentacao || ''} onChange={(e) => onChange({ apresentacao: e.target.value })} placeholder="Comprimido, suspensão..." /></label>
        <label><span>Concentração</span><input value={r.conc || ''} onChange={(e) => onChange({ conc: e.target.value })} placeholder="50 mg" /></label>
        <label><span>Dose/kg</span><input value={r.dose || ''} onChange={(e) => onChange({ dose: e.target.value })} placeholder="mg/kg" /></label>
        <label><span>Dose p/ {kg || '?'} kg</span><div className="rx-calc">{calc ? `${calc.total} ${calc.unit}` : '—'}</div></label>
        <label><span>Qtd</span><select value={r.qtdProd || '1'} onChange={(e) => onChange({ qtdProd: e.target.value })}>{Array.from({ length: 60 }, (_, i) => i + 1).map((n) => <option key={n} value={String(n)}>{n} {n === 1 ? 'unidade' : 'unidades'}</option>)}</select></label>
        <label><span>Via</span><select value={(r.pos || {}).viaFull || 'Oral'} onChange={(e) => setPos({ ...(r.pos || {}), viaFull: e.target.value })}>{window.PR_RX_VIAS_FULL.map((v) => <option key={v}>{v}</option>)}</select></label>
        <label><span>Farmácia</span><select value={r.farmacia || 'Veterinária'} onChange={(e) => onChange({ farmacia: e.target.value })}>{window.PR_RX_FARMACIA.map((f) => <option key={f}>{f}</option>)}</select></label>
      </div>
      <RxPosBuilder pos={r.pos} onChange={setPos} />
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>Observação (opcional)</span>
        <input value={r.obs || ''} onChange={(e) => onChange({ obs: e.target.value })} placeholder="Ex.: administrar após alimentação, não partir o comprimido..." style={{ fontFamily: 'inherit', fontSize: 13, border: '1px solid var(--line)', borderRadius: 8, padding: '6px 10px' }} />
      </label>
    </div>
  );
}

function RxManipCard({ r, idx, onChange, onDel }) {
  const comps = r.componentes || [{ ativo: '', conc: '', unidade: 'mg' }];
  const setComp = (j, k, v) => onChange({ componentes: comps.map((c, m) => m === j ? { ...c, [k]: v } : c) });
  const addComp = () => onChange({ componentes: [...comps, { ativo: '', conc: '', unidade: 'mg' }] });
  const delComp = (j) => onChange({ componentes: comps.filter((_, m) => m !== j) });
  const setPos = (pos) => onChange({ pos, posologia: pos.livre || window.rxPosologiaAuto(pos) });
  return (
    <div className="rx-card">
      <div className="rx-card-head">
        <span className="rx-card-num">{idx + 1}</span>
        <b style={{ flex: 1, fontSize: 14 }}>Fórmula manipulada</b>
        <button className="pr-del-btn" onClick={onDel}>✕</button>
      </div>
      <p className="rx-sub">Composição</p>
      {comps.map((c, j) => (
        <div key={j} className="rx-comp-row">
          <input value={c.ativo} onChange={(e) => setComp(j, 'ativo', e.target.value)} placeholder="Componente / princípio ativo" style={{ flex: 2 }} />
          <input value={c.conc} onChange={(e) => setComp(j, 'conc', e.target.value)} placeholder="Dosagem" style={{ flex: 1 }} />
          <select value={c.unidade} onChange={(e) => setComp(j, 'unidade', e.target.value)}>{window.PR_RX_UNITS.map((u) => <option key={u}>{u}</option>)}</select>
          <button className="pr-del-btn" onClick={() => delComp(j)}>✕</button>
        </div>
      ))}
      <button className="pr-addrow" style={{ marginBottom: 10 }} onClick={addComp}><VtIcon name="plus" size={13} /> Adicionar componente</button>
      <div className="rx-card-row">
        <label><span>Forma farmacêutica</span><select value={r.forma || ''} onChange={(e) => onChange({ forma: e.target.value })}>{window.PR_RX_FORMAS.map((f) => <option key={f}>{f}</option>)}</select></label>
        <label><span>q.s.p.</span><input value={r.qsp || ''} onChange={(e) => onChange({ qsp: e.target.value })} placeholder="30 mL / 30 doses" /></label>
        <label><span>Farmácia</span><select value={r.farmacia || 'Veterinária'} onChange={(e) => onChange({ farmacia: e.target.value })}>{window.PR_RX_FARMACIA.map((f) => <option key={f}>{f}</option>)}</select></label>
        <label><span>Quantidade</span><select value={r.qtdProd || '1'} onChange={(e) => onChange({ qtdProd: e.target.value })}>{Array.from({ length: 240 }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></label>
      </div>
      <RxPosBuilder pos={r.pos} onChange={setPos} />
    </div>
  );
}
window.RxMedCard = RxMedCard; window.RxManipCard = RxManipCard; window.RxPosBuilder = RxPosBuilder;

/* ---------- Procedimentos ---------- */
function PrProcedimentos({ at, patch }) {
  const rows = at.procedimentos;
  const setRows = (r) => patch({ procedimentos: r });
  const add = (tpl) => setRows([...rows, tpl || { nome: '', valor: 0, custo: 0, tempo: '' }]);
  const upd = (i, k, v) => setRows(rows.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const del = (i) => setRows(rows.filter((_, j) => j !== i));
  const totalV = rows.reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const totalC = rows.reduce((s, r) => s + (Number(r.custo) || 0), 0);
  const [protoSearch, setProtoSearch] = lUse('');
  const protocols = window.vtProcProtocols ? window.vtProcProtocols() : [];
  const filteredProtos = protocols.filter((p) =>
    !protoSearch || p.name.toLowerCase().includes(protoSearch.toLowerCase()) || (p.categoria || '').toLowerCase().includes(protoSearch.toLowerCase())
  );

  const applyProtocol = (p) => {
    const vet = window.vtCurrentVet ? window.vtCurrentVet() : 'Equipe';
    const { custo } = window.vtBaixarInsumos ? window.vtBaixarInsumos(p.insumos || [], 'Procedimento: ' + p.name, vet) : { custo: 0 };
    const row = { nome: p.name, valor: Number(p.preco) || 0, custo: Math.round(custo), tempo: p.tempo || '', protocoloId: p.id };
    setRows([...rows, row]);
    if ((p.insumos || []).length) window.vtToast(`"${p.name}" aplicado — ${p.insumos.length} insumo(s) baixados do estoque.`, 'ok');
    else window.vtToast(`"${p.name}" adicionado.`, 'ok');
    setProtoSearch('');
  };

  const toOrc = () => {
    const items = rows.map((r) => ({ tipo: 'Procedimento', nome: r.nome, qtd: 1, valor: Number(r.valor) || 0, custo: Number(r.custo) || 0 }));
    patch({ procedimentos: rows, orcamento: { ...at.orcamento, items: [...at.orcamento.items, ...items] } });
    window.vtToast('Procedimentos adicionados ao orçamento.', 'ok');
  };
  return (
    <div>
      <div className="pr-sec-head">
        <div><h2 className="pr-h">Procedimentos</h2><p className="pr-h-sub">Realizados no atendimento · consomem estoque e lançam no financeiro</p></div>
        {rows.length > 0 && <button className="pr-qbtn" onClick={toOrc}><VtIcon name="dollar" size={14} /> Enviar ao orçamento</button>}
      </div>
      <div className="vt-card vt-sec">
        {rows.length === 0 ? <p className="pr-empty">Nenhum procedimento registrado. Selecione do catálogo ou adicione linha em branco.</p> : (
          <table className="pr-dtable">
            <thead><tr><th style={{ width: '40%' }}>Procedimento</th><th>Tempo</th><th className="num">Custo</th><th className="num">Valor</th><th className="num">Lucro</th><th></th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td><input value={r.nome} onChange={(e) => upd(i, 'nome', e.target.value)} placeholder="Procedimento" /></td>
                  <td><input value={r.tempo} onChange={(e) => upd(i, 'tempo', e.target.value)} placeholder="60 min" /></td>
                  <td><input className="num" value={r.custo} onChange={(e) => upd(i, 'custo', e.target.value.replace(/\D/g, ''))} placeholder="0" /></td>
                  <td><input className="num" value={r.valor} onChange={(e) => upd(i, 'valor', e.target.value.replace(/\D/g, ''))} placeholder="0" /></td>
                  <td className="num" style={{ fontWeight: 700, color: 'var(--green)' }}>{window.PR.money((Number(r.valor) || 0) - (Number(r.custo) || 0))}</td>
                  <td><button className="pr-del-btn" onClick={() => del(i)}>✕</button></td>
                </tr>
              ))}
              <tr><td colSpan="2" style={{ fontWeight: 700 }}>Total</td><td className="num" style={{ fontWeight: 700 }}>{window.PR.money(totalC)}</td><td className="num" style={{ fontWeight: 700 }}>{window.PR.money(totalV)}</td><td className="num" style={{ fontWeight: 800, color: 'var(--green)' }}>{window.PR.money(totalV - totalC)}</td><td></td></tr>
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {/* ── Catálogo de Serviços (Procedimentos + Curativos) ── */}
          {(() => {
            const svcItems = window.vtServiceCatalog ? [...window.vtServiceCatalog('Procedimento'), ...window.vtServiceCatalog('Curativo')] : [];
            if (svcItems.length > 0) return (
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block' }}>Catálogo de serviços:</span>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {svcItems.map((sv) => (
                    <button key={sv.id} className="pr-quickpick-btn" style={{ ...prChipStyle(false), borderColor: sv.tipo === 'Curativo' ? '#d97706' : undefined }} onClick={() => {
                      const vet = window.vtCurrentVet ? window.vtCurrentVet() : 'Equipe';
                      const custoCalc = window.vtServiceCusto ? window.vtServiceCusto(sv) : (sv.custo || 0);
                      if (sv.insumos && sv.insumos.length) window.vtBaixarInsumos && window.vtBaixarInsumos(sv.insumos.map((ins) => ({ itemId: ins.itemId, itemName: ins.nome, qty: ins.qty, unit: ins.unit })), sv.tipo + ': ' + sv.nome, vet);
                      add({ nome: sv.nome, valor: sv.preco || 0, custo: Math.round(custoCalc), tempo: '' });
                      window.vtToast(`"${sv.nome}" adicionado${sv.insumos && sv.insumos.length ? ' — estoque deduzido' : ''}.`, 'ok');
                    }} title={`Preço: R$ ${(sv.preco||0).toFixed(2)} · Custo: R$ ${(sv.custo||0).toFixed(2)}${sv.tipo === 'Curativo' ? ' · Curativo' : ''}`}>
                      + {sv.nome} <span style={{ opacity: .7, fontSize: 11 }}>({window.PR.money(sv.preco || 0)})</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          {/* ── Protocolos complexos ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Protocolos:</span>
            <input value={protoSearch} onChange={(e) => setProtoSearch(e.target.value)} placeholder="Buscar protocolo…" style={{ flex: 1, minWidth: 180, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
          </div>
          {protocols.length === 0 ? (
            <p className="vt-muted" style={{ fontSize: 12.5, margin: 0 }}>Nenhum protocolo cadastrado. Vá em <b>Configurações › Protocolos</b> para criar.</p>
          ) : (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {(protoSearch ? filteredProtos : protocols).slice(0, 12).map((p) => (
                <button key={p.id} className="pr-quickpick-btn" style={prChipStyle(false)} onClick={() => applyProtocol(p)} title={p.insumos && p.insumos.length ? 'Insumos: ' + p.insumos.map((i) => i.itemName + ' ' + i.qty + i.unit).join(', ') : 'Sem insumos configurados'}>
                  + {p.name}{p.insumos && p.insumos.length ? <span style={{ marginLeft: 4, opacity: .65, fontSize: 11 }}>({p.insumos.length} insumos)</span> : null}
                </button>
              ))}
              {protoSearch && filteredProtos.length === 0 && <span className="vt-muted" style={{ fontSize: 12 }}>Nenhum protocolo encontrado.</span>}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="pr-addrow" onClick={() => add()}><VtIcon name="plus" size={14} /> Linha em branco</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Orçamento ---------- */
const ORC_TIPOS = ['Procedimento', 'Exame', 'Medicamento', 'Material', 'Taxa'];
function PrOrcamento({ at, patch, patient }) {
  const o = at.orcamento;
  const setOrc = (patchO) => patch({ orcamento: { ...o, ...patchO } });
  const items = o.items;
  const add = () => setOrc({ items: [...items, { tipo: 'Procedimento', nome: '', qtd: 1, valor: 0, custo: 0 }] });
  const upd = (i, k, v) => setOrc({ items: items.map((r, j) => j === i ? { ...r, [k]: v } : r) });
  const del = (i) => setOrc({ items: items.filter((_, j) => j !== i) });
  const subtotal = items.reduce((s, r) => s + (Number(r.valor) || 0) * (Number(r.qtd) || 1), 0);
  const custo = items.reduce((s, r) => s + (Number(r.custo) || 0) * (Number(r.qtd) || 1), 0);
  const total = Math.max(0, subtotal + (Number(o.taxa) || 0) - (Number(o.desconto) || 0));
  const lucro = total - custo;
  const margem = total > 0 ? (lucro / total) * 100 : 0;
  const persistOrc = (status) => {
    if (!items.length) { window.vtToast('Adicione itens ao orçamento.', 'err'); return; }
    const d = window.VtStore.getData() || {};
    const list = (d.orcamentos || []).slice();
    const oid = o.savedId || 'OR' + Date.now().toString(36);
    const entry = { id: oid, atId: at.id, patientId: (patient && patient.id) || at.patientId, patientName: (patient && patient.name) || at.patientName, vet: at.vet, date: window.PR.todayBR(), items, total, custo, lucro, status: status || (o.aprovado ? 'aprovado' : 'pendente') };
    const idx = list.findIndex((x) => x.id === oid);
    if (idx >= 0) list[idx] = entry; else list.unshift(entry);
    window.VtStore.setData({ orcamentos: list });
    setOrc({ savedId: oid });
  };
  return (
    <div>
      <div className="pr-sec-head">
        <div><h2 className="pr-h">Orçamento</h2><p className="pr-h-sub">Montado sem sair do atendimento</p></div>
        {o.aprovado && <span className="pr-status-pill finalizado" style={{ alignSelf: 'center' }}>Aprovado</span>}
      </div>
      <div className="pr-2col" style={{ gridTemplateColumns: '1.7fr 1fr', alignItems: 'start' }}>
        <div className="vt-card vt-sec">
          {items.length === 0 ? <p className="pr-empty">Orçamento vazio. Adicione itens ou envie procedimentos da aba anterior.</p> : (
            <table className="pr-dtable">
              <thead><tr><th style={{ width: 130 }}>Tipo</th><th>Item</th><th style={{ width: 56 }}>Qtd</th><th className="num" style={{ width: 100 }}>Valor un.</th><th className="num" style={{ width: 110 }}>Subtotal</th><th></th></tr></thead>
              <tbody>
                {items.map((r, i) => (
                  <tr key={i}>
                    <td><select value={r.tipo} onChange={(e) => upd(i, 'tipo', e.target.value)}>{ORC_TIPOS.map((t) => <option key={t}>{t}</option>)}</select></td>
                    <td><input value={r.nome} onChange={(e) => upd(i, 'nome', e.target.value)} placeholder="Descrição" /></td>
                    <td><input className="num" value={r.qtd} onChange={(e) => upd(i, 'qtd', e.target.value.replace(/\D/g, ''))} /></td>
                    <td><input className="num" value={r.valor} onChange={(e) => upd(i, 'valor', e.target.value.replace(/\D/g, ''))} /></td>
                    <td className="num" style={{ fontWeight: 700 }}>{window.PR.money((Number(r.valor) || 0) * (Number(r.qtd) || 1))}</td>
                    <td><button className="pr-del-btn" onClick={() => del(i)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button className="pr-addrow" onClick={add}><VtIcon name="plus" size={14} /> Adicionar item</button>
        </div>
        <div className="vt-stack">
          <div className="vt-card vt-sec">
            <h3 className="vt-sec-title">Totais</h3>
            <div className="pr-totals">
              <div className="pr-total-row"><span>Subtotal</span><b>{window.PR.money(subtotal)}</b></div>
              <div className="pr-total-row"><span>Taxas</span><input className="pr-param-input" style={{ width: 110 }} value={o.taxa || ''} onChange={(e) => setOrc({ taxa: e.target.value.replace(/\D/g, '') })} placeholder="0" /></div>
              <div className="pr-total-row"><span>Desconto</span><input className="pr-param-input" style={{ width: 110 }} value={o.desconto || ''} onChange={(e) => setOrc({ desconto: e.target.value.replace(/\D/g, '') })} placeholder="0" /></div>
              <div className="pr-total-row grand"><span>Total</span><b>{window.PR.money(total)}</b></div>
              <div className="pr-total-row"><span>Custo estimado</span><b>{window.PR.money(custo)}</b></div>
              <div className="pr-total-row profit"><span>Lucro bruto · margem</span><b>{window.PR.money(lucro)} · {margem.toFixed(0)}%</b></div>
            </div>
          </div>
          <div className="vt-card vt-sec" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <button className="vt-btn-primary" onClick={() => { persistOrc(); window.vtToast('Orçamento salvo em Finanças › Orçamentos.', 'ok'); }}><VtIcon name="plus" size={15} /> Salvar orçamento</button>
            <button className={o.aprovado ? 'vt-btn-ghost' : 'vt-btn-primary'} style={{ background: o.aprovado ? '' : 'var(--green)' }} onClick={() => { const na = !o.aprovado; setOrc({ aprovado: na }); persistOrc(na ? 'aprovado' : 'pendente'); window.vtToast(na ? 'Orçamento aprovado.' : 'Aprovação removida.', 'ok'); }}>{o.aprovado ? 'Cancelar aprovação' : '✓ Aprovar'}</button>
            <button className="vt-btn-ghost" onClick={() => window.vtToast('Convertido em procedimento.', 'ok')}><VtIcon name="tooth" size={15} /> Converter em procedimento</button>
            <button className="vt-btn-ghost" onClick={() => window.vtToast('Orçamento enviado por WhatsApp.', 'ok')}>💬 Enviar por WhatsApp</button>
            <button className="vt-btn-ghost" onClick={() => window.vtToast('PDF do orçamento gerado.', 'ok')}><VtIcon name="receipt" size={15} /> Gerar PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Anexos ---------- */
const FILE_KINDS = { pdf: ['#e0533c', 'PDF'], img: ['#14a8a0', 'IMG'], doc: ['#2f6fed', 'DOC'], other: ['#67788c', 'FILE'] };
function PrAnexos({ at, patch }) {
  const [drag, setDrag] = lUse(false);
  const inp = lRef(null);
  const files = at.anexos;
  const kindOf = (name, type) => {
    if (/pdf/i.test(type) || /\.pdf$/i.test(name)) return 'pdf';
    if (/image/i.test(type)) return 'img';
    if (/\.(docx?|txt|rtf)$/i.test(name)) return 'doc';
    return 'other';
  };
  const addFiles = (fileList) => {
    const arr = Array.from(fileList || []);
    arr.forEach((file) => {
      const k = kindOf(file.name, file.type);
      const meta = { nome: file.name, kind: k, size: (file.size / 1024).toFixed(0) + ' KB', preview: '' };
      if (k === 'img') {
        const r = new FileReader();
        r.onload = () => patch({ anexos: [...(at.anexos || []), { ...meta, preview: r.result }] });
        r.readAsDataURL(file);
      } else {
        patch({ anexos: [...(at.anexos || []), meta] });
      }
    });
  };
  const del = (i) => patch({ anexos: files.filter((_, j) => j !== i) });
  return (
    <div>
      <div className="pr-sec-head"><div><h2 className="pr-h">Anexos</h2><p className="pr-h-sub">PDFs, fotos, radiografias, exames — vinculados permanentemente</p></div></div>
      <div className={`pr-drop${drag ? ' drag' : ''}`} onClick={() => inp.current && inp.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}>
        <div className="pr-drop-ic"><VtIcon name="plus" size={24} /></div>
        <b style={{ fontSize: 15, color: 'var(--ink)' }}>Arraste arquivos ou clique para enviar</b>
        <p style={{ margin: '4px 0 0', fontSize: 13 }}>PDF · Fotos · Vídeos · Radiografias · Tomografias · Exames laboratoriais</p>
        <input ref={inp} type="file" multiple style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} />
      </div>
      {files.length > 0 && (
        <div className="pr-files">
          {files.map((f, i) => (
            <div key={i} className="pr-file">
              {f.preview ? <img className="pr-file-img" src={f.preview} alt="" /> : <span className="pr-file-ic" style={{ background: FILE_KINDS[f.kind][0] }}>{FILE_KINDS[f.kind][1]}</span>}
              <div style={{ flex: 1, minWidth: 0 }}><b>{f.nome}</b><i>{f.size}</i></div>
              <button className="pr-del-btn" onClick={() => del(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Assinatura ---------- */
function SignaturePad({ value, onChange, label }) {
  const cv = lRef(null);
  const drawing = lRef(false);
  lEff(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext('2d');
    if (value) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height); img.src = value; }
  }, []);
  const pos = (e) => {
    const r = cv.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - r.left) * (cv.current.width / r.width), y: (t.clientY - r.top) * (cv.current.height / r.height) };
  };
  const start = (e) => { e.preventDefault(); drawing.current = true; const ctx = cv.current.getContext('2d'); const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e) => { if (!drawing.current) return; e.preventDefault(); const ctx = cv.current.getContext('2d'); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = '#15293d'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); };
  const end = () => { if (!drawing.current) return; drawing.current = false; onChange(cv.current.toDataURL()); };
  const clear = () => { const c = cv.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); onChange(''); };
  return (
    <div className="pr-sign">
      <canvas ref={cv} className="pr-sign-pad" width="440" height="150"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      <div className="pr-sign-foot"><span>{label}{value ? ' · assinado ✓' : ''}</span><button className="pr-sign-clear" onClick={clear}>Limpar</button></div>
    </div>
  );
}

/* ---------- Finalização ---------- */
function PrFinal({ at, patch, patient, onCommit }) {
  const f = at.final;
  const setF = (k, v) => patch({ final: { ...f, [k]: v } });
  const done = at.status === 'finalizado';
  const steps = [
    ['Salvar todos os dados', 'Anamnese, exame, diagnósticos e plano'],
    ['Atualizar linha do tempo', 'Histórico clínico do paciente'],
    ['Gerar PDF completo', 'Documento do atendimento'],
    ['Enviar resumo por WhatsApp', 'Para o tutor ' + patient.owner],
    ['Enviar PDF por e-mail', f.email || 'E-mail não informado'],
    ['Registrar auditoria', 'Usuário, data, hora, IP e alterações'],
  ];
  const finalize = () => {
    if (!at.diag.principal) { window.vtToast('Informe ao menos o diagnóstico principal.', 'err'); return; }
    const r = window.vtFaturarAtendimento ? window.vtFaturarAtendimento(at, patient) : { receita: 0, custo: 0, lucro: 0, nReceitas: 0, baixados: [] };
    const finalAt = { ...at, status: 'finalizado', faturado: true, final: { ...f, auditoria: true } };
    patch({ status: 'finalizado', faturado: true, final: { ...f, auditoria: true } });
    setTimeout(() => { onCommit(finalAt); }, 0);
    if (r.nReceitas || r.baixados.length) {
      window.vtToast(`Atendimento finalizado · ${window.PR.money(r.receita)} lançado no caixa (lucro ${window.PR.money(r.lucro)}).`, 'ok');
    } else {
      window.vtToast('Atendimento finalizado e arquivado com segurança.', 'ok');
    }
  };
  return (
    <div>
      <div className="pr-sec-head"><div><h2 className="pr-h">Finalização do atendimento</h2><p className="pr-h-sub">Revise, assine e finalize — o registro é mantido íntegro</p></div></div>
      <div className="pr-2col" style={{ alignItems: 'start' }}>
        <div className="vt-stack">
          <div className="vt-card vt-sec">
            <h3 className="vt-sec-title">Ao finalizar, o sistema irá</h3>
            {steps.map(([t, s], i) => (
              <div key={i} className="pr-final-check"><span className="ic">✓</span><div><b>{t}</b><p>{s}</p></div></div>
            ))}
          </div>
          <div className="vt-card vt-sec">
            <h3 className="vt-sec-title">Retorno & envio</h3>
            <div className="pr-fieldrow c2" style={{ marginBottom: 0 }}>
              <label className="pr-field"><span>Retorno automático</span><VtField value={f.retorno} onChange={(v) => setF('retorno', v)} mask="date" placeholder="DD/MM/AAAA" /></label>
              <label className="pr-field"><span>E-mail do tutor</span><input value={f.email} onChange={(e) => setF('email', e.target.value)} placeholder="tutor@email.com" /></label>
            </div>
          </div>
        </div>
        <div className="vt-stack">
          <div className="vt-card vt-sec">
            <h3 className="vt-sec-title">Assinatura do veterinário</h3>
            <SignaturePad value={f.vetSign} onChange={(v) => setF('vetSign', v)} label={at.vet} />
          </div>
          <div className="vt-card vt-sec">
            <h3 className="vt-sec-title">Assinatura do tutor</h3>
            <SignaturePad value={f.tutorSign} onChange={(v) => setF('tutorSign', v)} label={patient.owner} />
          </div>
        </div>
      </div>
      <div className="pr-final-bar">
        <div>
          {(() => {
            const totalProc = (at.procedimentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
            const totalVend = (at.vendas || []).reduce((s, v) => s + (Number(v.valor) || 0) * (Number(v.qtd) || 1), 0);
            const totalOrc = (!at.procedimentos || !at.procedimentos.length) ? ((at.orcamento && at.orcamento.items) || []).reduce((s, it) => s + (Number(it.valor) || 0) * (Number(it.qtd) || 1), 0) : 0;
            const total = totalProc + totalVend + totalOrc;
            return total > 0
              ? <span style={{ fontSize: 13.5 }}><b style={{ fontSize: 17, color: 'var(--teal-d)' }}>{window.PR.money(total)}</b> <span className="vt-muted">a cobrar — será lançado no caixa</span></span>
              : <span className="vt-muted" style={{ fontSize: 13 }}>Sem valores a cobrar — registre procedimentos, vendas ou orçamento.</span>;
          })()}
        </div>
        <div className="spacer" />
        <button className="vt-btn-ghost" onClick={() => window.print()}><VtIcon name="print" size={15} /> Imprimir</button>
        <button className={`pr-finalize${done ? ' done' : ''}`} onClick={finalize}>{done ? '✓ Finalizado · lançado no caixa' : 'Finalizar e lançar no caixa'}</button>
      </div>
    </div>
  );
}

Object.assign(window, { PrOdonto, PrDiagnosticos, PrExames, PrPrescricoes, PrProcedimentos, PrOrcamento, PrAnexos, PrFinal, SignaturePad });
