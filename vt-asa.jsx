/* ============================================================
   VetTooth Pro — Classificação ASA (risco anestésico)
   Motor de sugestão (apoio à decisão) + override manual +
   justificativa + histórico/auditoria. Integra no atendimento.
   ============================================================ */
const { useState: asaUse } = React;

window.ASA_CLASSES = [
  { id: 'I', label: 'ASA I', desc: 'Paciente saudável, sem doença sistêmica.', color: '#1fa971' },
  { id: 'II', label: 'ASA II', desc: 'Doença sistêmica leve, sem limitação funcional importante.', color: '#7bbf3f' },
  { id: 'III', label: 'ASA III', desc: 'Doença sistêmica moderada/grave, com comprometimento funcional.', color: '#e2912a' },
  { id: 'IV', label: 'ASA IV', desc: 'Doença sistêmica grave, ameaça constante à vida.', color: '#e0533c' },
  { id: 'V', label: 'ASA V', desc: 'Paciente moribundo, baixa probabilidade de sobreviver sem intervenção.', color: '#c0392b' },
  { id: 'VI', label: 'ASA VI', desc: 'Morte encefálica, doação de órgãos (uso raro).', color: '#67788c' },
];

window.ASA_CARDIO = ['Normal', 'Sopro discreto', 'Cardiopatia compensada', 'Cardiopatia descompensada', 'Insuficiência cardíaca'];
window.ASA_RESP = ['Normal', 'Doença leve', 'Doença moderada', 'Insuficiência respiratória'];
window.ASA_HIDRAT = ['Normal', 'Desidratação leve', 'Moderada', 'Grave'];
window.ASA_TEMP = ['Normal', 'Hipotermia', 'Hipertermia'];
window.ASA_INFEC = ['Sem infecção', 'Infecção localizada', 'Infecção sistêmica', 'Sepse'];
window.ASA_TRAUMA = ['Não', 'Leve', 'Moderado', 'Grave'];
window.ASA_COND = ['Excelente', 'Boa', 'Regular', 'Ruim', 'Crítica'];
window.ASA_ECC = ['Muito magro', 'Magro', 'Ideal', 'Sobrepeso', 'Obeso'];

/* motor de sugestão — devolve { asa, conf, motivos } */
window.asaSuggest = function (patient, ev) {
  ev = ev || {};
  let level = 1; const motivos = []; let hits = 0, signals = 0;
  const bump = (to, motivo) => { if (to > level) level = to; if (motivo) { motivos.push(motivo); hits++; } signals++; };

  // doenças cadastradas (do paciente)
  const doencas = (patient.diseases || []);
  doencas.forEach((d) => {
    const t = (d || '').toLowerCase();
    if (/insufici[êe]ncia card|icc|sepse|choque|falência/.test(t)) bump(4, `${d} (grave)`);
    else if (/card|renal|hepat|diabet|neoplas|respir|cushing|addison|epileps|hipertens/.test(t)) bump(3, `${d}`);
    else bump(2, `${d}`);
  });
  // medicação contínua
  if ((patient.meds || []).length) bump(2, 'Uso contínuo de medicação');
  // ECC / estado corporal
  if (ev.ecc === 'Obeso') bump(2, 'Obesidade');
  else if (ev.ecc === 'Muito magro') bump(3, 'Caquexia / muito magro');
  // cardiovascular
  const c = ev.cardio;
  if (c === 'Insuficiência cardíaca') bump(4, 'Insuficiência cardíaca');
  else if (c === 'Cardiopatia descompensada') bump(4, 'Cardiopatia descompensada');
  else if (c === 'Cardiopatia compensada') bump(3, 'Cardiopatia compensada');
  else if (c === 'Sopro discreto') bump(2, 'Sopro cardíaco discreto');
  // respiratório
  const r = ev.resp;
  if (r === 'Insuficiência respiratória') bump(4, 'Insuficiência respiratória');
  else if (r === 'Doença moderada') bump(3, 'Doença respiratória moderada');
  else if (r === 'Doença leve') bump(2, 'Doença respiratória leve');
  // hidratação
  if (ev.hidrat === 'Grave') bump(4, 'Desidratação grave');
  else if (ev.hidrat === 'Moderada') bump(3, 'Desidratação moderada');
  else if (ev.hidrat === 'Desidratação leve') bump(2, 'Desidratação leve');
  // infecção
  if (ev.infec === 'Sepse') bump(5, 'Sepse');
  else if (ev.infec === 'Infecção sistêmica') bump(4, 'Infecção sistêmica');
  else if (ev.infec === 'Infecção localizada') bump(2, 'Infecção localizada');
  // trauma
  if (ev.trauma === 'Grave') bump(4, 'Trauma grave');
  else if (ev.trauma === 'Moderado') bump(3, 'Trauma moderado');
  else if (ev.trauma === 'Leve') bump(2, 'Trauma leve');
  // condição geral
  if (ev.cond === 'Crítica') bump(5, 'Condição geral crítica');
  else if (ev.cond === 'Ruim') bump(4, 'Condição geral ruim');
  else if (ev.cond === 'Regular') bump(3, 'Condição geral regular');
  // exames alterados (lista de strings)
  (ev.examesAlt || []).forEach((x) => bump(3, `Alteração: ${x}`));
  // temperatura
  if (ev.temp && ev.temp !== 'Normal') bump(2, ev.temp);

  const asa = ['', 'I', 'II', 'III', 'IV', 'V'][level] || 'I';
  // confiança: mais sinais convergentes → maior
  const conf = Math.min(96, 60 + hits * 9 + (signals > 0 ? 6 : 0));
  return { asa, conf: hits ? conf : 70, motivos };
};

/* ---------- Cartão de avaliação ASA ---------- */
function AsaCard({ patient, value, onChange }) {
  const data = value || {};
  const ev = data.ev || {};
  const [manualOpen, setManualOpen] = asaUse(false);
  const setEv = (k, v) => onChange({ ...data, ev: { ...ev, [k]: v } });
  const sug = window.asaSuggest(patient, ev);
  const sugClass = window.ASA_CLASSES.find((c) => c.id === sug.asa) || window.ASA_CLASSES[0];
  const chosen = data.asa || sug.asa;
  const chosenClass = window.ASA_CLASSES.find((c) => c.id === chosen) || sugClass;
  const finalLabel = `ASA ${chosen}${data.emergencia ? 'E' : ''}`;

  const accept = () => {
    const entry = { asa: sug.asa, mode: 'auto', conf: sug.conf, by: window.vtCurrentVet ? window.vtCurrentVet() : 'Veterinário', when: new Date().toLocaleString('pt-BR'), just: '' };
    onChange({ ...data, asa: sug.asa, mode: 'auto', conf: sug.conf, motivos: sug.motivos, hist: [entry, ...(data.hist || [])] });
    window.vtToast(`Sugestão aceita: ASA ${sug.asa}.`, 'ok');
  };
  const setManual = (id) => {
    setManualOpen(false);
    const entry = { asa: id, mode: 'manual', sug: sug.asa, by: window.vtCurrentVet ? window.vtCurrentVet() : 'Veterinário', when: new Date().toLocaleString('pt-BR'), just: data.justDraft || '' };
    onChange({ ...data, asa: id, mode: 'manual', just: data.justDraft || '', hist: [entry, ...(data.hist || [])] });
    window.vtToast(`Classificação definida manualmente: ASA ${id}.`, 'ok');
  };

  const SEL = (label, key, opts) => (
    <label className="asa-sel"><span>{label}</span><select value={ev[key] || opts[0]} onChange={(e) => setEv(key, e.target.value)}>{opts.map((o) => <option key={o}>{o}</option>)}</select></label>
  );

  return (
    <div className="pr-block">
      <p className="pr-block-title"><VtIcon name="alert" size={15} /> Classificação ASA · risco anestésico</p>

      {/* cartão de sugestão */}
      <div className="asa-suggest" style={{ borderColor: sugClass.color }}>
        <div className="asa-suggest-main">
          <span className="asa-badge" style={{ background: sugClass.color }}>{finalLabel}</span>
          <div>
            <b>Classificação {data.mode === 'manual' ? 'definida manualmente' : 'sugerida pelo sistema'}</b>
            <i>{chosenClass.desc}</i>
            {data.mode !== 'manual' && <span className="asa-conf">Confiança da sugestão: {sug.conf}%</span>}
            {data.mode === 'manual' && data.just && <span className="asa-conf">Justificativa: {data.just}</span>}
          </div>
        </div>
        {sug.motivos.length > 0 && (
          <ul className="asa-motivos">
            {sug.motivos.slice(0, 6).map((m, i) => <li key={i}>✓ {m}</li>)}
          </ul>
        )}
        <div className="asa-actions">
          <button className="vt-btn-primary" onClick={accept}>Aceitar sugestão (ASA {sug.asa})</button>
          <button className="vt-btn-ghost" onClick={() => setManualOpen(!manualOpen)}>Alterar classificação manualmente</button>
          <label className="asa-emerg"><input type="checkbox" checked={!!data.emergencia} onChange={(e) => onChange({ ...data, emergencia: e.target.checked })} /> Procedimento de emergência <b>(sufixo E)</b></label>
        </div>
        {manualOpen && (
          <div className="asa-manual">
            <div className="asa-manual-grid">
              {window.ASA_CLASSES.map((c) => (
                <button key={c.id} className={`asa-opt${chosen === c.id ? ' on' : ''}`} style={chosen === c.id ? { borderColor: c.color, background: c.color + '14' } : null} onClick={() => setManual(c.id)}>
                  <b style={{ color: c.color }}>{c.label}</b><i>{c.desc}</i>
                </button>
              ))}
            </div>
            <label className="asa-just"><span>Justificativa clínica da alteração (opcional)</span>
              <textarea value={data.justDraft || ''} onChange={(e) => onChange({ ...data, justDraft: e.target.value })} placeholder="Ex.: Cardiopatia estável com excelente controle clínico..." /></label>
          </div>
        )}
      </div>

      {/* parâmetros que alimentam a sugestão */}
      <details className="asa-params">
        <summary>Parâmetros de avaliação anestésica ({sug.motivos.length} achado(s))</summary>
        <div className="asa-grid">
          {SEL('Estado corporal (ECC)', 'ecc', window.ASA_ECC)}
          {SEL('Cardiovascular', 'cardio', window.ASA_CARDIO)}
          {SEL('Respiratório', 'resp', window.ASA_RESP)}
          {SEL('Hidratação', 'hidrat', window.ASA_HIDRAT)}
          {SEL('Temperatura', 'temp', window.ASA_TEMP)}
          {SEL('Estado infeccioso', 'infec', window.ASA_INFEC)}
          {SEL('Trauma', 'trauma', window.ASA_TRAUMA)}
          {SEL('Condição geral', 'cond', window.ASA_COND)}
        </div>
        <label className="asa-sel" style={{ marginTop: 10 }}><span>Exames alterados (separados por vírgula)</span>
          <input value={(ev.examesAlt || []).join(', ')} onChange={(e) => setEv('examesAlt', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} placeholder="Ex.: Creatinina elevada, Anemia" /></label>
      </details>

      {/* histórico / auditoria */}
      {(data.hist || []).length > 0 && (
        <details className="asa-params" style={{ marginTop: 8 }}>
          <summary>Histórico de classificação ({data.hist.length})</summary>
          <div className="asa-hist">
            {data.hist.map((h, i) => (
              <div key={i} className="asa-hist-row">
                <span className={`vt-tag ${h.mode === 'manual' ? 'amber' : 'teal'}`}>ASA {h.asa}{h.mode === 'manual' ? ' · manual' : ' · auto'}</span>
                <span className="vt-muted" style={{ fontSize: 12 }}>{h.when} · {h.by}{h.mode === 'manual' && h.sug ? ` · sugerido: ASA ${h.sug}` : ''}{h.just ? ` · "${h.just}"` : ''}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
window.AsaCard = AsaCard;
