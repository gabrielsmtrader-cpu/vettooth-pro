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

/* ── Tela de seleção de especialidade em cards ── */
function SpecialtyPicker({ models, onSelect }) {
  const [hover, setHover] = eUse(null);
  return (
    <div style={{ padding: '32px 28px 40px', background: 'var(--card)', borderRadius: 14, border: '1px solid var(--line)', boxShadow: '0 2px 14px rgba(0,0,0,0.07)' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>Selecione a especialidade</h2>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>Escolha o tipo de consulta para abrir o formulário completo</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {models.map((m) => {
          const c = CONSULT_COLORS[m.id] || '#14a8a0';
          const isHover = hover === m.id;
          return (
            <button key={m.id} onClick={() => onSelect(m)}
              onMouseEnter={() => setHover(m.id)} onMouseLeave={() => setHover(null)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
                padding: '22px 20px', borderRadius: 14,
                border: `2px solid ${isHover ? c : 'var(--line)'}`,
                background: isHover ? `${c}0c` : 'var(--bg)', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.18s', boxShadow: isHover ? `0 4px 20px ${c}22` : '0 1px 4px rgba(0,0,0,0.04)',
                transform: isHover ? 'translateY(-2px)' : 'none',
              }}>
              <span style={{ width: 48, height: 48, borderRadius: 12, background: isHover ? `${c}22` : `${c}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s' }}>
                <VtIcon name={m.icon} size={22} style={{ color: c }} />
              </span>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: isHover ? c : 'var(--ink)', transition: 'color 0.15s' }}>{m.label}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{m.desc}</p>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: c, letterSpacing: 0.3 }}>Abrir formulário</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   COMPONENTE PRINCIPAL — PrConsulta
   Tela 1: seleção de especialidade em cards
   Tela 2: formulário completo da especialidade selecionada
   ============================================================ */
function PrConsulta({ at, patch, go, integrated, setAnamnese, setExame, setSistemas, setDiag, patient }) {
  const models  = (window.vtConsultModels ? window.vtConsultModels() : window.PR.consultModels);
  const [view, setView] = eUse('pick');
  const activeId = at.consultModel || 'geral';
  const activeM  = models.find((m) => m.id === activeId) || models[0];
  const activeC  = CONSULT_COLORS[activeId] || 'var(--teal)';
  const PR_VETS  = window.vtVets();
  const selVet   = PR_VETS.find((v) => at.vet.includes(v.name)) || PR_VETS[0];

  const useModel = (m) => {
    patch({ type: m.label, motivo: at.motivo || m.label, consultModel: m.id });
    setView('form');
    window.vtToast(`Especialidade "${m.label}" selecionada.`, 'ok');
  };

  /* tela de seleção */
  if (view === 'pick') return <SpecialtyPicker models={models} onSelect={useModel} />;

  /* ── MODELO LIVRE ── */
  if (activeId === 'livre') {
    const dData = at.diag || {};
    const setD = (k, v) => setDiag && setDiag(k, v);
    const livreC = '#64748b';
    return (
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', boxShadow: '0 2px 14px rgba(0,0,0,0.07)', background: 'var(--card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '17px 24px 15px', borderBottom: '1px solid var(--line)', background: `${livreC}08` }}>
          <span style={{ width: 44, height: 44, borderRadius: 11, background: `${livreC}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <VtIcon name="pen" size={21} style={{ color: livreC }} />
          </span>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>Modelo Livre</h2>
            <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--muted)' }}>Consulta personalizada sem estrutura pré-definida</p>
          </div>
          <button onClick={() => setView('pick')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${livreC}40`, background: `${livreC}10`, color: livreC, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}>
            <VtIcon name="chevron" size={12} style={{ transform: 'rotate(180deg)' }} /> Trocar especialidade
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{at.date} · {at.time}</span>
        </div>
        <div style={{ padding: '4px 24px 40px' }}>
          <SLabel color={livreC} first>Dados da Consulta</SLabel>
          <div className="pr-fieldrow c3" style={{ marginBottom: 12 }}>
            <label className="pr-field"><span>Data</span>
              <VtField value={at.date} onChange={(v) => patch({ date: v })} mask="date" />
            </label>
            <label className="pr-field"><span>Hora</span>
              <input value={at.time} onChange={(e) => patch({ time: e.target.value })} placeholder="00:00" />
            </label>
            <label className="pr-field"><span>Veterinário responsável</span>
              <select value={(PR_VETS.find((v) => at.vet.includes(v.name)) || PR_VETS[0] || {}).name || ''} onChange={(e) => { const v = PR_VETS.find((x) => x.name === e.target.value); patch({ vet: 'M.V. ' + e.target.value, vetColor: v ? v.color : at.vetColor }); }}>
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
              <input value={at.motivo} onChange={(e) => patch({ motivo: e.target.value })} placeholder="Ex.: Avaliação de rotina" />
            </label>
          </div>
          <SLabel color={livreC}>Queixa Principal</SLabel>
          <label className="pr-field"><span>Queixa principal (relato do tutor)</span>
            <textarea value={at.queixa || ''} onChange={(e) => patch({ queixa: e.target.value })} placeholder="Relato livre do tutor ou observações do atendimento..." style={{ ...taStyle, minHeight: 90 }} />
          </label>
          <SLabel color={livreC}>Evolução &amp; Observações</SLabel>
          <VtRichText value={at.exameObs || ''} onChange={(html) => patch({ exameObs: html })} placeholder="Evolução do quadro, achados clínicos relevantes, observações gerais..." minHeight={120} />
          <SLabel color={livreC}>Diagnóstico</SLabel>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Diagnóstico<i style={{ color: 'var(--red)' }}> *</i></p>
              <VtRichText value={dData.principal || ''} onChange={(html) => setD('principal', html)} placeholder="Diagnóstico definitivo ou mais provável" minHeight={70} />
            </div>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Prognóstico</p>
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
    );
  }

  /* ── ODONTOLOGIA ── formulário clínico completo ── */
  if (activeId === 'odonto') {
    const odC = '#2563eb';
    const CHECKLIST_TRIAGEM = ['Acesso à rua', 'Contato com outros animais', 'Mudança recente de dieta', 'Viagens recentes', 'Episódios anteriores', 'Contactantes doentes'];
    const EXAMES_COMP       = ['Hemograma', 'Bioquímico', 'Urinálise', 'US abdominal', 'Radiografia', 'ECG', 'PIF/sorologia'];
    const ck  = at.checklistTriagem || [];
    const exC = at.examesComp || [];
    const toggleCk = (item) => patch({ checklistTriagem: ck.includes(item) ? ck.filter((x) => x !== item) : [...ck, item] });
    const toggleEx = (item) => patch({ examesComp: exC.includes(item) ? exC.filter((x) => x !== item) : [...exC, item] });

    return (
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', boxShadow: '0 2px 14px rgba(0,0,0,0.07)', background: 'var(--card)' }}>
        {/* ══ CABEÇALHO ══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '17px 24px 15px', borderBottom: '1px solid var(--line)', background: `${odC}08` }}>
          <span style={{ width: 44, height: 44, borderRadius: 11, background: `${odC}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <VtIcon name="tooth" size={21} style={{ color: odC }} />
          </span>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>Odontologia</h2>
            <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--muted)' }}>Avaliação periodontal, odontograma e protocolo dental</p>
          </div>
          <button onClick={() => setView('pick')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${odC}40`, background: `${odC}10`, color: odC, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}>
            <VtIcon name="chevron" size={12} style={{ transform: 'rotate(180deg)' }} /> Trocar especialidade
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{at.date} · {at.time}</span>
        </div>

        {/* ══ FORMULÁRIO ══ */}
        <div style={{ padding: '4px 24px 48px' }}>

          {/* ─── 1. QUEIXA PRINCIPAL & HISTÓRICO ─── */}
          <SLabel color={odC} first>Queixa principal &amp; histórico</SLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="pr-field"><span>Queixa principal</span>
              <textarea value={at.queixa || ''} onChange={(e) => patch({ queixa: e.target.value })} placeholder="Motivo da consulta relatado pelo tutor…" style={{ ...taStyle, minHeight: 72 }} />
            </label>
            <label className="pr-field"><span>Duração / evolução</span>
              <input value={at.duracao || ''} onChange={(e) => patch({ duracao: e.target.value })} placeholder="Ex.: há 5 dias, progressivo" style={{ fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px', width: '100%', boxSizing: 'border-box' }} />
            </label>
            <div>
              <p style={{ margin: '0 0 9px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Comorbidades existentes</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {COMORBIDADES.map((c) => {
                  const sel = (at.comorbidades || []).includes(c);
                  return (
                    <button key={c} onClick={() => { const cur = at.comorbidades || []; patch({ comorbidades: sel ? cur.filter((x) => x !== c) : [...cur, c] }); }}
                      style={{ padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${sel ? odC : 'var(--line)'}`, background: sel ? `${odC}18` : 'var(--bg)', color: sel ? odC : 'var(--ink)', fontWeight: sel ? 700 : 400, fontSize: 12.5, cursor: 'pointer', transition: 'all 0.15s' }}>{c}</button>
                  );
                })}
              </div>
            </div>
            <label className="pr-field"><span>Medicações em uso</span>
              <textarea value={at.medicacoesUso || ''} onChange={(e) => patch({ medicacoesUso: e.target.value })} placeholder="Fármaco, dose e frequência…" style={{ ...taStyle, minHeight: 52 }} />
            </label>
            <label className="pr-field"><span>Vacinação / vermifugação</span>
              <input value={at.vacinaStatus || ''} onChange={(e) => patch({ vacinaStatus: e.target.value })} placeholder="Status e datas" style={{ fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px', width: '100%', boxSizing: 'border-box' }} />
            </label>
          </div>

          {/* ─── 2. ANAMNESE GERAL ─── */}
          <SLabel color={odC}>Anamnese geral</SLabel>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <label className="pr-field"><span>Anamnese</span>
              <textarea value={at.anamneseGeral || ''} onChange={(e) => patch({ anamneseGeral: e.target.value })} placeholder="Histórico, ambiente, alimentação, evolução…" style={{ ...taStyle, minHeight: 72, background: '#fff' }} />
            </label>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Apetite</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Normal', 'Aumentado', 'Diminuído', 'Anorexia'].map((o) => (
                  <QBtn key={o} active={at.apetite === o} color={odC} onClick={() => patch({ apetite: at.apetite === o ? '' : o })}>{o}</QBtn>
                ))}
              </div>
            </div>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Ingestão hídrica</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Normal', 'Polidipsia', 'Oligodipsia'].map((o) => (
                  <QBtn key={o} active={at.hidrica === o} color={odC} onClick={() => patch({ hidrica: at.hidrica === o ? '' : o })}>{o}</QBtn>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <label className="pr-field"><span>Micção</span>
                <input value={at.miccao || ''} onChange={(e) => patch({ miccao: e.target.value })} placeholder="—" style={{ fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px', background: '#fff', width: '100%', boxSizing: 'border-box' }} />
              </label>
              <label className="pr-field"><span>Evacuação</span>
                <input value={at.evacuacao || ''} onChange={(e) => patch({ evacuacao: e.target.value })} placeholder="—" style={{ fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px', background: '#fff', width: '100%', boxSizing: 'border-box' }} />
              </label>
              <label className="pr-field"><span>Êmese / regurgitação</span>
                <input value={at.emese || ''} onChange={(e) => patch({ emese: e.target.value })} placeholder="Frequência e aspecto" style={{ fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px', background: '#fff', width: '100%', boxSizing: 'border-box' }} />
              </label>
            </div>
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Perguntas dirigidas — Checklist de triagem</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {CHECKLIST_TRIAGEM.map((item) => {
                  const sel = ck.includes(item);
                  return (
                    <button key={item} onClick={() => toggleCk(item)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${sel ? odC : 'var(--line)'}`, background: sel ? `${odC}12` : 'var(--bg)', color: sel ? odC : 'var(--ink)', fontWeight: sel ? 700 : 400, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${sel ? odC : 'var(--muted)'}`, background: sel ? odC : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0 }}>{sel ? '✓' : ''}</span>
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── 3. EXAME FÍSICO GERAL ─── */}
          <SLabel color={odC}>Exame físico geral</SLabel>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {[['Temperatura', 'tempC', '°C', '38,5'], ['Freq. cardíaca', 'fc', 'bpm', '120'], ['Freq. respiratória', 'fr', 'mpm', '24']].map(([label, key, unit, ph]) => (
                <div key={key}>
                  <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{label} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11 }}>{unit}</span></p>
                  <input type="number" step={key === 'tempC' ? '0.1' : '1'} value={at[key] || ''} onChange={(e) => patch({ [key]: e.target.value })} placeholder={ph}
                    style={{ width: '100%', fontFamily: 'inherit', fontSize: 14, border: '1px solid var(--line)', borderRadius: 8, padding: '9px 12px', background: '#fff', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            {[
              { label: 'TPC',        key: 'tpc',        opts: ['< 2s', '2s', '> 2s'] },
              { label: 'Mucosas',    key: 'mucosas',    opts: ['Normocoradas', 'Pálidas', 'Ictéricas', 'Cianóticas', 'Hiperêmicas'] },
              { label: 'Hidratação', key: 'hidratacao', opts: ['Normal', '5–6%', '7–8%', '> 10%'] },
            ].map(({ label, key, opts }) => (
              <div key={key}>
                <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{label}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {opts.map((o) => <QBtn key={o} active={at[key] === o} color={odC} onClick={() => patch({ [key]: at[key] === o ? '' : o })}>{o}</QBtn>)}
                </div>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Linfonodos', 'linfonodos', 'Tamanho / consistência'], ['Auscultação cardiopulmonar', 'ausculta', 'Auscultação cardiopulmonar'], ['Palpação abdominal', 'palpacao', 'Palpação abdominal']].map(([label, key, ph]) => (
                <label key={key} className="pr-field"><span>{label}</span>
                  <input value={at[key] || ''} onChange={(e) => patch({ [key]: e.target.value })} placeholder={ph}
                    style={{ fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px', background: '#fff', width: '100%', boxSizing: 'border-box' }} />
                </label>
              ))}
            </div>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Escore de condição corporal (1–9)</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[1,2,3,4,5,6,7,8,9].map((n) => {
                  const sel = at.ecc === n;
                  const c = n <= 3 ? '#f59e0b' : n <= 6 ? '#16a34a' : '#dc2626';
                  return (
                    <button key={n} onClick={() => patch({ ecc: sel ? null : n })}
                      style={{ width: 40, height: 40, borderRadius: 8, border: `2px solid ${sel ? c : 'var(--line)'}`, background: sel ? c : 'var(--bg)', color: sel ? '#fff' : 'var(--ink)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.12s' }}>{n}</button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── 4. DIAGNÓSTICO & CONDUTA ─── */}
          <SLabel color={odC}>Diagnóstico &amp; conduta</SLabel>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <label className="pr-field"><span>Diagnósticos diferenciais</span>
              <textarea value={at.diagDiferenciais || ''} onChange={(e) => patch({ diagDiferenciais: e.target.value })} placeholder="Diagnósticos diferenciais" style={{ ...taStyle, minHeight: 60, background: '#fff' }} />
            </label>
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Exames complementares</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {EXAMES_COMP.map((item) => {
                  const sel = exC.includes(item);
                  return (
                    <button key={item} onClick={() => toggleEx(item)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${sel ? odC : 'var(--line)'}`, background: sel ? `${odC}12` : 'var(--bg)', color: sel ? odC : 'var(--ink)', fontWeight: sel ? 700 : 400, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${sel ? odC : 'var(--muted)'}`, background: sel ? odC : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0 }}>{sel ? '✓' : ''}</span>
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="pr-field"><span>Diagnóstico presuntivo</span>
              <textarea value={at.diagPresuntivo || ''} onChange={(e) => patch({ diagPresuntivo: e.target.value })} placeholder="Diagnóstico presuntivo" style={{ ...taStyle, minHeight: 60, background: '#fff' }} />
            </label>
            <label className="pr-field"><span>Conduta / tratamento</span>
              <textarea value={at.conduta || ''} onChange={(e) => patch({ conduta: e.target.value })} placeholder="Conduta / tratamento" style={{ ...taStyle, minHeight: 60, background: '#fff' }} />
            </label>
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Prognóstico</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PROGNOSTICO_OPTS.map(({ v, color }) => {
                  const sel = at.prognostico === v;
                  return (
                    <button key={v} onClick={() => patch({ prognostico: sel ? '' : v })}
                      style={{ padding: '8px 22px', borderRadius: 9, border: `2px solid ${color}`, background: sel ? color : '#fff', color: sel ? '#fff' : color, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', transition: 'all 0.15s', boxShadow: sel ? `0 2px 8px ${color}44` : 'none' }}>{v}</button>
                  );
                })}
              </div>
            </div>
            <label className="pr-field"><span>Retorno / reavaliação</span>
              <input value={at.retorno || ''} onChange={(e) => patch({ retorno: e.target.value })} placeholder="Data ou prazo estimado" style={{ fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px', background: '#fff', width: '100%', boxSizing: 'border-box' }} />
            </label>
          </div>

        </div>
      </div>
    );
  }

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
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', boxShadow: '0 2px 14px rgba(0,0,0,0.07)', background: 'var(--card)' }}>

      {/* ══ CABEÇALHO DA ESPECIALIDADE ══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '17px 24px 15px', borderBottom: '1px solid var(--line)', background: `${activeC}08` }}>
        <span style={{ width: 44, height: 44, borderRadius: 11, background: `${activeC}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <VtIcon name={activeM.icon} size={21} style={{ color: activeC }} />
        </span>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>{activeM.label}</h2>
          <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--muted)' }}>{activeM.desc}</p>
        </div>
        <button onClick={() => setView('pick')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${activeC}40`, background: `${activeC}10`, color: activeC, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}>
          <VtIcon name="chevron" size={12} style={{ transform: 'rotate(180deg)' }} /> Trocar especialidade
        </button>
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
  );
}

/* Stubs mantidos para compatibilidade */
function PrRoteiro() { return null; }
function PrAnamnese() { return null; }
function PrExame()    { return null; }
function PrSistemas() { return null; }

Object.assign(window, { PrConsulta, PrAnamnese, PrExame, PrSistemas, PrRoteiro });
