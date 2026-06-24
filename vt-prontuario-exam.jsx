/* ============================================================
   VetTooth Pro — Prontuário · abas clínicas
   Consulta · Anamnese · Exame físico · Avaliação por sistemas
   ============================================================ */
const { useState: eUse } = React;

const PR_LOCAIS = ['Clínica própria', 'Clínica parceira', 'Hospital parceiro', 'Atendimento domiciliar', 'Propriedade rural'];

/* ---------- Roteiro de avaliação por modelo (config-driven) ---------- */
function PrRoteiro({ at, patch }) {
  const model = at.consultModel || 'geral';
  const roteiros = (window.vtConsultRoteiros && window.vtConsultRoteiros()) || {};
  const r = roteiros[model] || roteiros.geral || { label: 'Clínica geral', items: [] };
  const resp = at.roteiro || {};
  const set = (item, prop, val) => {
    const key = model + '::' + item;
    patch({ roteiro: { ...resp, [key]: { ...(resp[key] || {}), [prop]: val } } });
  };
  if (!r.items.length) return null;
  const alt = r.items.filter((it) => (resp[model + '::' + it] || {}).s === 'alterado').length;
  return (
    <div className="pr-block">
      <p className="pr-block-title"><VtIcon name="stethoscope" size={15} /> Roteiro de avaliação · {r.label}{alt ? ` — ${alt} alterado(s)` : ''}</p>
      <div className="vt-card vt-sec" style={{ padding: '6px 16px' }}>
        {r.items.map((item) => {
          const cur = resp[model + '::' + item] || {};
          return (
            <div key={item} className="pr-param" style={{ gridTemplateColumns: '1fr auto', flexWrap: 'wrap' }}>
              <span className="pr-param-l">{item}</span>
              <span className="pr-seg">
                {[['normal', 'Normal'], ['alterado', 'Alterado'], ['na', 'N/A']].map(([s, l]) => (
                  <button key={s} className={`${s}${cur.s === s ? ' on' : ''}`} onClick={() => set(item, 's', cur.s === s ? '' : s)}>{l}</button>
                ))}
              </span>
              {cur.s === 'alterado' && (
                <input value={cur.obs || ''} onChange={(e) => set(item, 'obs', e.target.value)} placeholder="Descreva o achado..." style={{ flexBasis: '100%', marginTop: 8, fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Consulta ---------- */
function PrConsulta({ at, patch, go, integrated }) {
  const useModel = (m) => {
    patch({ type: m.label === 'Retorno' ? 'Retorno' : 'Consulta', motivo: at.motivo || m.label, consultModel: m.id });
    window.vtToast(`Modelo "${m.label}" aplicado.`, 'ok');
  };
  const PR_VETS = window.vtVets();
  const selVet = PR_VETS.find((v) => at.vet.includes(v.name)) || PR_VETS[0];
  return (
    <div>
      <div className="pr-sec-head"><div><h2 className="pr-h">Consulta</h2><p className="pr-h-sub">Dados gerais do atendimento e modelos pré-cadastrados</p></div></div>

      <div className="pr-block">
        <p className="pr-block-title"><VtIcon name="grid" size={15} /> Iniciar a partir de um modelo</p>
        <div className="pr-models">
          {window.PR.consultModels.map((m) => (
            <button key={m.id} className="pr-model" onClick={() => useModel(m)} style={at.consultModel === m.id ? { borderColor: 'var(--teal)', background: 'var(--teal-t)' } : null}>
              <span className="pr-model-ic"><VtIcon name={m.icon} size={18} /></span>
              <span><b>{m.label}</b><i>{m.desc}</i></span>
            </button>
          ))}
        </div>
      </div>

      <div className="vt-card vt-sec pr-block">
        <p className="pr-block-title">Dados da consulta</p>
        <div className="pr-fieldrow c3">
          <label className="pr-field"><span>Data</span><VtField value={at.date} onChange={(v) => patch({ date: v })} mask="date" /></label>
          <label className="pr-field"><span>Hora</span><input value={at.time} onChange={(e) => patch({ time: e.target.value })} placeholder="00:00" /></label>
          <label className="pr-field"><span>Veterinário responsável</span>
            <select value={selVet ? selVet.name : ''} onChange={(e) => { const v = PR_VETS.find((x) => x.name === e.target.value); patch({ vet: 'M.V. ' + e.target.value, vetColor: v ? v.color : at.vetColor }); }}>
              {PR_VETS.map((v) => <option key={v.id}>{v.name}</option>)}
            </select>
          </label>
        </div>
        <div className="pr-fieldrow c2">
          <label className="pr-field"><span>Local do atendimento</span>
            <select value={at.local} onChange={(e) => patch({ local: e.target.value })}>
              {PR_LOCAIS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <label className="pr-field"><span>Motivo da consulta</span><input value={at.motivo} onChange={(e) => patch({ motivo: e.target.value })} placeholder="Ex.: Avaliação odontológica de rotina" /></label>
        </div>
        <label className="pr-field"><span>Queixa principal</span><textarea value={at.queixa} onChange={(e) => patch({ queixa: e.target.value })} placeholder="Relato do tutor sobre o motivo do atendimento..." /></label>
      </div>

      {!integrated && (
        <div className="vt-card vt-sec" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <p className="vt-ai-note" style={{ flex: 1 }}><VtIcon name="spark" size={15} /> Preencha a <b>anamnese</b> e o <b>exame físico</b> nas próximas abas. Os campos têm autosave.</p>
          <button className="vt-btn-primary" onClick={() => go('anamnese')}>Ir para anamnese <VtIcon name="chevron" size={15} /></button>
        </div>
      )}
    </div>
  );
}

/* ---------- Anamnese ---------- */
function PrAnamnese({ at, set }) {
  const a = at.anamnese;
  const model = at.consultModel || 'geral';
  const setQuick = (k, opt) => set(k, a[k] === opt ? '' : opt);
  return (
    <div>
      <div className="pr-sec-head"><div><h2 className="pr-h">Anamnese</h2><p className="pr-h-sub">Questionário estruturado — respostas rápidas ou texto livre</p></div></div>
      <div className="pr-2col" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        {[0, 1].map((col) => (
          <div key={col} className="vt-card vt-sec" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {window.vtAnamneseFor(model).filter((_, i) => i % 2 === col).map((item) => (
              <div key={item.k}>
                <span className="pr-field" style={{ marginBottom: 4 }}><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{item.q}</span></span>
                {item.type === 'quick' ? (
                  <div className="pr-quickpick">
                    {item.opts.map((o) => <button key={o} className={a[item.k] === o ? 'on' : ''} onClick={() => setQuick(item.k, o)}>{o}</button>)}
                  </div>
                ) : (
                  <textarea className="pr-field-ta" style={taStyle} value={a[item.k] || ''} onChange={(e) => set(item.k, e.target.value)} placeholder="Anotações..." />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
const taStyle = { width: '100%', fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)', background: '#fff', border: '1px solid var(--line)', borderRadius: 9, padding: '8px 11px', minHeight: 48, resize: 'vertical', lineHeight: 1.5, marginTop: 6 };

/* ---------- Exame físico ---------- */
const EX_STATES = [['normal', 'Normal'], ['alterado', 'Alterado'], ['na', 'N/A']];
function PrExame({ at, set, patch }) {
  const ex = at.exame;
  const upd = (k, prop, val) => set(k, { ...(ex[k] || {}), [prop]: val });
  const filled = window.vtExamCfg().filter((p) => ex[p.k] && (ex[p.k].v || ex[p.k].s)).length;
  return (
    <div>
      <div className="pr-sec-head">
        <div><h2 className="pr-h">Exame físico</h2><p className="pr-h-sub">Parâmetros vitais e avaliação geral</p></div>
        <span className="vt-count-badge">{filled}/{window.vtExamCfg().length}</span>
      </div>
      <div className="pr-2col" style={{ alignItems: 'start' }}>
        <div className="vt-card vt-sec">
          {window.vtExamCfg().map((p) => (
            <div key={p.k} className="pr-param">
              <span className="pr-param-l">{p.l}{p.u ? <i>{p.u}</i> : null}</span>
              <input className="pr-param-input" value={(ex[p.k] || {}).v || ''} onChange={(e) => upd(p.k, 'v', e.target.value)} placeholder={p.ph} />
              <span className="pr-seg">
                {EX_STATES.map(([s, l]) => (
                  <button key={s} className={`${s}${(ex[p.k] || {}).s === s ? ' on' : ''}`} onClick={() => upd(p.k, 's', (ex[p.k] || {}).s === s ? '' : s)}>{l}</button>
                ))}
              </span>
            </div>
          ))}
        </div>
        <div className="vt-stack">
          <div className="vt-card vt-sec">
            <h3 className="vt-sec-title">Observações do exame</h3>
            <VtRichText value={at.exameObs || ''} onChange={(html) => patch({ exameObs: html })} placeholder="Achados gerais, comportamento, observações relevantes..." minHeight={130} />
          </div>
          <div className="vt-card vt-sec">
            <h3 className="vt-sec-title">Resumo</h3>
            <div className="vt-clin-rows">
              <div className="vt-clin-row"><span>Parâmetros normais</span><b style={{ color: 'var(--green)' }}>{window.vtExamCfg().filter((p) => (ex[p.k] || {}).s === 'normal').length}</b></div>
              <div className="vt-clin-row"><span>Alterados</span><b style={{ color: 'var(--amber)' }}>{window.vtExamCfg().filter((p) => (ex[p.k] || {}).s === 'alterado').length}</b></div>
              <div className="vt-clin-row"><span>Não avaliados</span><b className="vt-muted">{window.vtExamCfg().filter((p) => (ex[p.k] || {}).s === 'na').length}</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Avaliação por sistemas ---------- */
function PrSistemas({ at, set }) {
  const [open, setOpen] = eUse(null);
  const sys = at.sistemas;
  const setState = (name, s) => set(name, { ...(sys[name] || {}), s: (sys[name] || {}).s === s ? '' : s });
  const setDesc = (name, desc) => set(name, { ...(sys[name] || {}), desc });
  const alterados = window.vtSistemasCfg().filter((s) => (sys[s] || {}).s === 'alterado').length;
  return (
    <div>
      <div className="pr-sec-head">
        <div><h2 className="pr-h">Avaliação por sistemas</h2><p className="pr-h-sub">Marque cada sistema e descreva os achados alterados</p></div>
        {alterados > 0 && <span className="pr-alert amber" style={{ alignSelf: 'center' }}>{alterados} sistema(s) alterado(s)</span>}
      </div>
      <div>
        {window.vtSistemasCfg().map((name) => {
          const st = sys[name] || {};
          const isOpen = open === name || st.s === 'alterado';
          return (
            <div key={name} className="pr-sys">
              <div className="pr-sys-head" onClick={() => setOpen(open === name ? null : name)}>
                <span className="pr-sys-name">Sistema {name.toLowerCase()}</span>
                <span className="pr-sys-state" onClick={(e) => e.stopPropagation()}>
                  <button className={`normal${st.s === 'normal' ? ' on' : ''}`} onClick={() => setState(name, 'normal')}>Normal</button>
                  <button className={`alterado${st.s === 'alterado' ? ' on' : ''}`} onClick={() => setState(name, 'alterado')}>Alterado</button>
                </span>
                <VtIcon name="chevron" size={16} />
              </div>
              {isOpen && (
                <div className="pr-sys-desc">
                  <textarea style={{ ...taStyle, marginTop: 0 }} value={st.desc || ''} onChange={(e) => setDesc(name, e.target.value)} placeholder={`Descrição detalhada do sistema ${name.toLowerCase()}...`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { PrConsulta, PrAnamnese, PrExame, PrSistemas });
