/* ============================================================
   VetTooth Pro — Prontuário · Em Atendimento
   Formulário VetFicha completo por especialidade — visual VetTooth
   ============================================================ */
const { useState: eUse } = React;

const PR_LOCAIS = ['Clínica própria', 'Clínica parceira', 'Hospital parceiro', 'Atendimento domiciliar', 'Propriedade rural'];
const CONSULT_COLORS = { geral: '#14a8a0', odonto: '#2563eb', derma: '#d97706', neuro: '#7c3aed', nutri: '#16a34a', orto: '#dc2626', anest: '#0f172a' };

const COMORBIDADES = ['Cardiopatia', 'DRC', 'Diabetes', 'Obesidade', 'Hepatopatia', 'Hipotireoidismo', 'Hipertireoidismo', 'Alergia', 'FeLV/FIV', 'Epilepsia', 'Neoplasia'];
const PROGNOSTICO_OPTS = [
  { v: 'Bom', color: '#16a34a' },
  { v: 'Favorável', color: '#0891b2' },
  { v: 'Reservado', color: '#d97706' },
  { v: 'Desfavorável', color: '#dc2626' },
];

/* ── Separador de seção estilo VetFicha ── */
function SLabel({ color, children, first }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: first ? 16 : 28, paddingBottom: 12, borderBottom: `2px solid ${color}30`, marginBottom: 18 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', color: 'var(--muted)' }}>{children}</span>
    </div>
  );
}

const taStyle = { width: '100%', fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' };

/* ── Botão quick-pick com cor da especialidade ── */
function QBtn({ active, color, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 13px', borderRadius: 8, border: `1.5px solid ${active ? color : 'var(--line)'}`,
      background: active ? `${color}18` : 'var(--bg)', color: active ? color : 'var(--ink)',
      fontWeight: active ? 700 : 400, fontSize: 12.5, cursor: 'pointer', transition: 'all 0.15s',
    }}>{children}</button>
  );
}

/* ============================================================
   COMPONENTE PRINCIPAL — PrConsulta
   Renderiza TODAS as seções numa única página dentro do layout
   com sidebar de especialidades (estilo VetFicha + visual VetTooth)
   ============================================================ */
function PrConsulta({ at, patch, go, integrated, setAnamnese, setExame, setSistemas, setDiag, patient }) {
  const models  = window.PR.consultModels;
  const activeId = at.consultModel || 'geral';
  const activeM  = models.find((m) => m.id === activeId) || models[0];
  const activeC  = CONSULT_COLORS[activeId] || 'var(--teal)';
  const PR_VETS  = window.vtVets();
  const selVet   = PR_VETS.find((v) => at.vet.includes(v.name)) || PR_VETS[0];

  const useModel = (m) => {
    patch({ type: m.label, motivo: at.motivo || m.label, consultModel: m.id });
    window.vtToast(`Especialidade "${m.label}" selecionada.`, 'ok');
  };

  /* helpers de dados */
  const aData = at.anamnese || {};
  const exData = at.exame   || {};
  const dData  = at.diag    || {};

  const setA  = (k, v) => setAnamnese && setAnamnese(k, v);
  const updEx = (k, prop, val) => setExame && setExame(k, { ...(exData[k] || {}), [prop]: val });
  const setD  = (k, v) => setDiag && setDiag(k, v);

  /* roteiro da especialidade */
  const roteiros   = (window.vtConsultRoteiros && window.vtConsultRoteiros()) || {};
  const roteiroData = roteiros[activeId] || roteiros.geral || { label: 'Clínica geral', items: [] };
  const roteiroResp = at.roteiro || {};
  const setR = (item, prop, val) => {
    const key = activeId + '::' + item;
    patch({ roteiro: { ...roteiroResp, [key]: { ...(roteiroResp[key] || {}), [prop]: val } } });
  };
  const rAlt = roteiroData.items.filter((it) => (roteiroResp[activeId + '::' + it] || {}).s === 'alterado').length;

  /* anamnese por especialidade */
  const anamneseItems = window.vtAnamneseFor ? window.vtAnamneseFor(activeId) : [];

  /* parâmetros de exame físico */
  const examParams = window.vtExamCfg ? window.vtExamCfg() : [];

  /* campos de diagnóstico */
  const diagFields = window.vtDiagCfg ? window.vtDiagCfg() : [];

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', boxShadow: '0 2px 14px rgba(0,0,0,0.07)' }}>

      {/* ══ SIDEBAR ══ */}
      <div style={{ width: 190, flexShrink: 0, background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignSelf: 'stretch' }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.42)', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>VetFicha</p>
          <p style={{ margin: '3px 0 0', color: '#fff', fontSize: 13.5, fontWeight: 700 }}>Prontuário Clínico</p>
        </div>
        <div style={{ padding: '10px 8px 12px' }}>
          <p style={{ margin: '6px 8px 8px', color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Especialidades</p>
          {models.map((m) => {
            const active = activeId === m.id;
            const mc = CONSULT_COLORS[m.id] || '#14a8a0';
            return (
              <button key={m.id} onClick={() => useModel(m)} style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px',
                borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 2,
                background: active ? `${mc}22` : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.52)',
                fontWeight: active ? 700 : 500, fontSize: 13, transition: 'all 0.15s',
                borderLeft: active ? `3px solid ${mc}` : '3px solid transparent',
              }}>
                <VtIcon name={m.icon} size={15} style={{ flexShrink: 0 }} />
                {m.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 6px', color: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Legenda</p>
          {[['#16a34a', 'Normal'], ['#f59e0b', 'Alterado'], ['rgba(255,255,255,0.25)', 'N/A']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ ÁREA DE CONTEÚDO ══ */}
      <div style={{ flex: 1, minWidth: 0, background: 'var(--card)' }}>

        {/* Cabeçalho da especialidade ativa */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '17px 24px 15px', borderBottom: '1px solid var(--line)', background: `${activeC}08` }}>
          <span style={{ width: 44, height: 44, borderRadius: 11, background: `${activeC}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <VtIcon name={activeM.icon} size={21} style={{ color: activeC }} />
          </span>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>{activeM.label}</h2>
            <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--muted)' }}>{activeM.desc}</p>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{at.date} · {at.time}</span>
        </div>

        {/* ══ FORMULÁRIO ══ */}
        <div style={{ padding: '4px 24px 40px' }}>

          {/* ─── 1. DADOS DA CONSULTA ─── */}
          <SLabel color={activeC} first>Dados da Consulta</SLabel>
          <div className="pr-fieldrow c3" style={{ marginBottom: 12 }}>
            <label className="pr-field"><span>Data</span>
              <VtField value={at.date} onChange={(v) => patch({ date: v })} mask="date" />
            </label>
            <label className="pr-field"><span>Hora</span>
              <input value={at.time} onChange={(e) => patch({ time: e.target.value })} placeholder="00:00" />
            </label>
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
            <label className="pr-field"><span>Motivo da consulta</span>
              <input value={at.motivo} onChange={(e) => patch({ motivo: e.target.value })} placeholder="Ex.: Avaliação odontológica de rotina" />
            </label>
          </div>

          {/* ─── 2. QUEIXA PRINCIPAL & HISTÓRICO ─── */}
          <SLabel color={activeC}>Queixa Principal & Histórico</SLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="pr-field"><span>Queixa principal (relato do tutor)</span>
              <textarea value={at.queixa || ''} onChange={(e) => patch({ queixa: e.target.value })} placeholder="Relato do tutor sobre o motivo do atendimento..." style={{ ...taStyle, minHeight: 68 }} />
            </label>
            <label className="pr-field"><span>Duração / evolução do problema</span>
              <input value={at.duracao || ''} onChange={(e) => patch({ duracao: e.target.value })} placeholder="Ex.: 3 dias, progressivo, piora à noite..." />
            </label>

            {/* Comorbidades */}
            <div>
              <p style={{ margin: '0 0 9px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Comorbidades existentes</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {COMORBIDADES.map((c) => {
                  const sel = (at.comorbidades || []).includes(c);
                  return (
                    <button key={c} onClick={() => { const cur = at.comorbidades || []; patch({ comorbidades: sel ? cur.filter((x) => x !== c) : [...cur, c] }); }}
                      style={{ padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${sel ? activeC : 'var(--line)'}`, background: sel ? `${activeC}18` : 'var(--bg)', color: sel ? activeC : 'var(--ink)', fontWeight: sel ? 700 : 400, fontSize: 12.5, cursor: 'pointer', transition: 'all 0.15s' }}>{c}</button>
                  );
                })}
              </div>
            </div>

            <label className="pr-field"><span>Medicações em uso</span>
              <textarea value={at.medicacoesUso || ''} onChange={(e) => patch({ medicacoesUso: e.target.value })} placeholder="Fármaco, dose e frequência..." style={{ ...taStyle, minHeight: 52 }} />
            </label>

            {/* Vacinação & Vermifugação */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Vacinação / Reforços</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Em dia', 'Atrasada', 'Nunca vacinado', 'Não sabe'].map((o) => (
                    <QBtn key={o} active={at.vacinacao === o} color={activeC} onClick={() => patch({ vacinacao: at.vacinacao === o ? '' : o })}>{o}</QBtn>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Vermifugação</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Em dia (< 3 meses)', 'Atrasada', 'Nunca'].map((o) => (
                    <QBtn key={o} active={at.vermifugacao === o} color={activeC} onClick={() => patch({ vermifugacao: at.vermifugacao === o ? '' : o })}>{o}</QBtn>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── 3. ANAMNESE POR ESPECIALIDADE ─── */}
          {anamneseItems.length > 0 && (
            <>
              <SLabel color={activeC}>Anamnese — {activeM.label}</SLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                {[0, 1].map((col) => (
                  <div key={col} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {anamneseItems.filter((_, i) => i % 2 === col).map((item) => (
                      <div key={item.k}>
                        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{item.q}</p>
                        {item.type === 'quick' ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {item.opts.map((o) => (
                              <QBtn key={o} active={aData[item.k] === o} color={activeC} onClick={() => setA(item.k, aData[item.k] === o ? '' : o)}>{o}</QBtn>
                            ))}
                          </div>
                        ) : (
                          <textarea style={{ ...taStyle, minHeight: 52, background: '#fff' }} value={aData[item.k] || ''} onChange={(e) => setA(item.k, e.target.value)} placeholder="Anotações..." />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ─── 4. EXAME CLÍNICO POR ESPECIALIDADE ─── */}
          {roteiroData.items.length > 0 && (
            <>
              <SLabel color={activeC}>Exame Clínico — {activeM.label}{rAlt ? ` · ${rAlt} alterado(s)` : ''}</SLabel>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
                {roteiroData.items.map((item, idx) => {
                  const key = activeId + '::' + item;
                  const cur = roteiroResp[key] || {};
                  return (
                    <div key={item} style={{ padding: '11px 18px', borderBottom: idx < roteiroData.items.length - 1 ? '1px solid var(--line)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ flex: 1, minWidth: 150, fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{item}</span>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {[['normal', 'Normal', '#16a34a', '#dcfce7'], ['alterado', 'Alterado', '#f59e0b', '#fef3c7'], ['na', 'N/A', 'var(--muted)', 'var(--bg)']].map(([s, l, c, bg]) => {
                            const sel = cur.s === s;
                            return (
                              <button key={s} onClick={() => setR(item, 's', sel ? '' : s)} style={{ padding: '5px 13px', borderRadius: 7, border: `1.5px solid ${sel ? c : 'var(--line)'}`, background: sel ? bg : '#fff', color: sel ? c : 'var(--muted)', fontWeight: sel ? 700 : 400, fontSize: 12.5, cursor: 'pointer', transition: 'all 0.12s' }}>{l}</button>
                            );
                          })}
                        </div>
                      </div>
                      {cur.s === 'alterado' && (
                        <input value={cur.obs || ''} onChange={(e) => setR(item, 'obs', e.target.value)} placeholder="Descreva o achado alterado..." style={{ width: '100%', marginTop: 8, fontFamily: 'inherit', fontSize: 13, border: '1px solid var(--line)', borderRadius: 8, padding: '7px 11px', background: '#fff', boxSizing: 'border-box' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ─── 5. EXAME FÍSICO GERAL ─── */}
          <SLabel color={activeC}>Exame Físico Geral</SLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
              {examParams.map((p, idx) => {
                const val = exData[p.k] || {};
                return (
                  <div key={p.k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: idx < examParams.length - 1 ? '1px solid var(--line)' : 'none', flexWrap: 'wrap' }}>
                    <span style={{ flex: 1, minWidth: 100, fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                      {p.l}{p.u ? <i style={{ color: 'var(--muted)', fontStyle: 'normal', marginLeft: 4, fontSize: 11 }}>{p.u}</i> : null}
                    </span>
                    <input value={val.v || ''} onChange={(e) => updEx(p.k, 'v', e.target.value)} placeholder={p.ph}
                      style={{ width: 68, fontFamily: 'inherit', fontSize: 13, border: '1px solid var(--line)', borderRadius: 7, padding: '5px 8px', textAlign: 'center', background: '#fff' }} />
                    <div style={{ display: 'flex', gap: 5 }}>
                      {[['normal', 'Normal', '#16a34a', '#dcfce7'], ['alterado', 'Alterado', '#f59e0b', '#fef3c7'], ['na', 'N/A', 'var(--muted)', 'var(--bg)']].map(([s, l, c, bg]) => {
                        const sel = val.s === s;
                        return (
                          <button key={s} onClick={() => updEx(p.k, 's', sel ? '' : s)} style={{ padding: '4px 9px', borderRadius: 6, border: `1.5px solid ${sel ? c : 'var(--line)'}`, background: sel ? bg : '#fff', color: sel ? c : 'var(--muted)', fontWeight: sel ? 700 : 400, fontSize: 11, cursor: 'pointer', transition: 'all 0.12s' }}>{l}</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 18px' }}>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Resumo</p>
                {[['Normais', '#16a34a', 'normal'], ['Alterados', '#f59e0b', 'alterado'], ['N/A', 'var(--muted)', 'na']].map(([l, c, s]) => (
                  <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: s !== 'na' ? '1px solid var(--line)' : 'none' }}>
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{l}</span>
                    <b style={{ color: c, fontSize: 15 }}>{examParams.filter((p) => (exData[p.k] || {}).s === s).length}</b>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 18px' }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Observações</p>
                <VtRichText value={at.exameObs || ''} onChange={(html) => patch({ exameObs: html })} placeholder="Achados gerais, comportamento, observações relevantes..." minHeight={100} />
              </div>
            </div>
          </div>

          {/* ─── 6. DIAGNÓSTICO & PROGNÓSTICO ─── */}
          <SLabel color={activeC}>Diagnóstico & Prognóstico</SLabel>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {diagFields.map(({ k, label, ph }) => (
              <div key={k}>
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{label}{k === 'principal' ? <i style={{ color: 'var(--red)' }}> *</i> : null}</p>
                <VtRichText value={dData[k] || ''} onChange={(html) => setD(k, html)} placeholder={ph} minHeight={k === 'principal' ? 70 : 52} />
              </div>
            ))}
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Prognóstico</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PROGNOSTICO_OPTS.map(({ v, color }) => {
                  const sel = dData.prognostico === v;
                  return (
                    <button key={v} onClick={() => setD('prognostico', sel ? '' : v)}
                      style={{ padding: '8px 22px', borderRadius: 9, border: `2px solid ${color}`, background: sel ? color : '#fff', color: sel ? '#fff' : color, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', transition: 'all 0.15s', boxShadow: sel ? `0 2px 8px ${color}44` : 'none' }}>{v}</button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* Stubs mantidos para compatibilidade */
function PrRoteiro() { return null; }
function PrAnamnese() { return null; }
function PrExame()    { return null; }
function PrSistemas() { return null; }

Object.assign(window, { PrConsulta, PrAnamnese, PrExame, PrSistemas, PrRoteiro });
