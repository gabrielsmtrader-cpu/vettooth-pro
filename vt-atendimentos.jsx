/* ============================================================
   VetTooth Pro — Atendimentos (lista + prontuário eletrônico)
   ============================================================ */

/* Lista de histórico de atendimentos de um paciente */
function AtendimentoHistory({ list, onOpen }) {
  if (!list || list.length === 0) return <p className="vt-empty" style={{ padding: '8px 0' }}>Nenhum atendimento registrado ainda.</p>;
  return (
    <div className="vt-at-timeline">
      {list.map((a) => (
        <div key={a.id} className={`vt-at-item${onOpen ? ' clickable' : ''}`} onClick={onOpen ? () => onOpen(a) : undefined}>
          <span className="vt-at-line"><span className="vt-at-bullet" style={{ background: a.vetColor || '#14a8a0' }} /></span>
          <div className="vt-at-body">
            <div className="vt-at-top">
              <span className="vt-at-type">{a.type}</span>
              <span className="vt-at-date">{a.date}{onOpen ? <VtIcon name="chevron" size={14} /> : null}</span>
            </div>
            <div className="vt-at-proc">{a.procedure}</div>
            <div className="vt-at-meta">
              <span style={{ color: a.vetColor }}>● {a.vet}</span>
              {a.weight && a.weight !== '—' && <span>· {a.weight}</span>}
              <span className="vt-at-val">{a.value}</span>
            </div>
            {a.notes && <div className="vt-at-notes">{a.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Exemplo clínico pré-preenchido — faz um atendimento parecer "real" */
const PR_SAMPLES = {
  A2: {
    motivo: 'Avaliação odontológica e dor ao mastigar', queixa: 'Tutor relata halitose e dificuldade para se alimentar há cerca de uma semana.',
    anamnese: { inicio: 'Há 1 semana', evolucao: 'Progressivo', alimentacao: 'Ração seca', hidrica: 'Normal', urina: 'Normal', fezes: 'Normais', vacinacao: 'Em dia', vermifugacao: 'Em dia', ectoparasita: 'Em dia', odonto: 'Profilaxia há 14 meses. Acúmulo de cálculo recorrente.' },
    exame: { temp: { v: '38,6', s: 'normal' }, fc: { v: '160', s: 'normal' }, fr: { v: '28', s: 'normal' }, peso: { v: '4,8', s: 'normal' }, ecc: { v: '5', s: 'normal' }, mucosas: { v: 'Róseas', s: 'normal' }, tpc: { v: '< 2', s: 'normal' }, dor: { v: '4', s: 'alterado' } },
    exameObs: 'Animal dócil. Dor à palpação da arcada superior direita.',
    sistemas: { Oral: { s: 'alterado', desc: 'Gengivite moderada, cálculo em pré-molares e molares. Elemento 108 com fratura coronária e exposição pulpar.' }, Digestório: { s: 'normal', desc: '' } },
    odonto: { flags: { 'Cálculo': true, 'Gengivite': true, 'Periodontite': true, 'Fraturas': true }, obs: 'Fratura com exposição pulpar do dente 108. Periodontite grau II generalizada.', plano: 'Profilaxia completa + exodontia do elemento 108. Controle em 6 meses.' },
    diag: { principal: 'Doença periodontal grau II + fratura dentária com exposição pulpar (108)', diferencial: 'Reabsorção dentária', suspeitas: '', secundarios: 'Halitose', obs: '' },
    prescricoes: [{ nome: 'Meloxicam 0,2%', dose: '0,1 mg/kg', via: 'VO', freq: '1x ao dia', tempo: '4 dias', qtd: '1', obs: 'Após alimentação' }, { nome: 'Amoxicilina + Clav.', dose: '20 mg/kg', via: 'VO', freq: '12/12h', tempo: '7 dias', qtd: '1', obs: '' }],
    procedimentos: [{ nome: 'Profilaxia odontológica', valor: 350, custo: 95, tempo: '90 min' }, { nome: 'Exodontia cirúrgica', valor: 620, custo: 180, tempo: '120 min' }],
  },
};

/* ---------- helpers de mês (fechamento / histórico) ---------- */
const VT_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
function vtMesLabel(d) { return VT_MESES[d.getMonth()] + '/' + d.getFullYear(); }
function vtMesFromBR(br) { const m = (br || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? (VT_MESES[+m[2] - 1] + '/' + m[3]) : ''; }
const vtIsCancel = (s) => s === 'arquivado' || s === 'cancelado';
const vtIsAgendado = (s) => ['agendado', 'confirmado', 'aguardando', 'em_andamento'].includes(s);
const vtIsRealizado = (a) => !vtIsCancel(a.status) && !vtIsAgendado(a.status);

/* ============================================================
   BLOCO 4 — Finalizar Atendimento (fechamento clínico da consulta)
   ============================================================ */
const VT_PROC_SUGEST = ['Extração dentária', 'Limpeza dental', 'Radiografia', 'Profilaxia odontológica', 'Sutura', 'Aplicação de medicação', 'Curativo', 'Nivelamento odontológico'];
const VT_MED_SUGEST = ['Meloxicam 0,2%', 'Amoxicilina + Clavulanato', 'Dipirona', 'Gabapentina', 'Tramadol', 'Clorexidina 0,12%'];

function FinalizarConsultaModal({ at, patient, defaultWhats, onClose, onConfirm }) {
  const vets = window.vtVets();
  const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parseMoney = (s) => Number(String(s == null ? '' : s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
  const [data, setData] = vtUseState(at.date || (window.PR ? window.PR.todayBR() : ''));
  const [hora, setHora] = vtUseState(at.time || (window.PR && window.PR.nowHM ? window.PR.nowHM() : '09:00'));
  const [prof, setProf] = vtUseState((at.vet || '').replace('M.V. ', '') || (vets[0] ? vets[0].name : ''));
  const [consultaOn, setConsultaOn] = vtUseState(true);
  const [consultaValor, setConsultaValor] = vtUseState(() => { const v = parseMoney(at.value); return v ? money(v) : 'R$ 180,00'; });
  const [procs, setProcs] = vtUseState([]);
  const [meds, setMeds] = vtUseState([]);
  const [forma, setForma] = vtUseState('Pix');
  const [whats, setWhats] = vtUseState(true);
  const FORMAS = ['Pix', 'Cartão de débito', 'Cartão de crédito', 'Dinheiro', 'Convênio'];

  const addProc = () => setProcs((p) => [...p, { nome: '', valor: '' }]);
  const setProcAt = (i, k, v) => setProcs((p) => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const delProc = (i) => setProcs((p) => p.filter((_, j) => j !== i));
  const addMed = () => setMeds((m) => [...m, { nome: '', qtd: 1, unit: '' }]);
  const setMedAt = (i, k, v) => setMeds((m) => m.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const delMed = (i) => setMeds((m) => m.filter((_, j) => j !== i));

  const subConsulta = consultaOn ? parseMoney(consultaValor) : 0;
  const subProc = procs.reduce((s, p) => s + parseMoney(p.valor), 0);
  const subMed = meds.reduce((s, m) => s + (Number(m.qtd) || 0) * parseMoney(m.unit), 0);
  const total = subConsulta + subProc + subMed;
  const whatsNum = defaultWhats || '';

  const confirm = () => {
    if (total <= 0) { window.vtToast('Informe ao menos um valor para o atendimento.', 'err'); return; }
    onConfirm({
      data, hora, prof, forma, enviarWhats: whats, whatsNum,
      consulta: { on: consultaOn, valor: subConsulta },
      procedimentos: procs.filter((p) => (p.nome || '').trim()).map((p) => ({ nome: p.nome.trim(), valor: parseMoney(p.valor) })),
      medicamentos: meds.filter((m) => (m.nome || '').trim()).map((m) => ({ nome: m.nome.trim(), qtd: Number(m.qtd) || 0, unit: parseMoney(m.unit), total: (Number(m.qtd) || 0) * parseMoney(m.unit) })),
      subConsulta, subProc, subMed, total,
    });
  };

  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal vt-fz-modal" onClick={(e) => e.stopPropagation()}>
        <button className="fin-modal-x" onClick={onClose}>×</button>
        <h3>Finalizar atendimento</h3>
        <p>{at.type || 'Consulta'} · {at.patientName}</p>

        {/* SEÇÃO A — Confirmação */}
        <div className="vt-fz-sec">A · Confirmação</div>
        <div className="vt-fz-pat">
          <PetAvatar p={patient || { name: at.patientName }} />
          <span><b>{at.patientName}</b><i>{patient ? [patient.species, patient.owner].filter(Boolean).join(' · ') : ''}</i></span>
        </div>
        <div className="vt-form-row">
          <VtField label="Data de realização" value={data} onChange={(v) => setData(window.maskDate ? window.maskDate(v) : v)} placeholder="DD/MM/AAAA" width="30%" />
          <VtField label="Hora" value={hora} onChange={setHora} placeholder="09:00" width="22%" />
          <label className="vtf" style={{ width: '44%' }}><span className="vtf-label">Profissional responsável</span>
            <span className="vtf-inputwrap"><select className="vtf-input" value={prof} onChange={(e) => setProf(e.target.value)}>{vets.map((v) => <option key={v.id}>{v.name}</option>)}</select></span></label>
        </div>

        {/* SEÇÃO B — O que foi realizado */}
        <div className="vt-fz-sec">B · O que foi realizado</div>
        <div className="vt-fz-line">
          <label className="vt-check-inline" style={{ flex: 1 }}><input type="checkbox" checked={consultaOn} onChange={(e) => setConsultaOn(e.target.checked)} /> Consulta</label>
          <input className="vt-fz-val" value={consultaValor} disabled={!consultaOn} onChange={(e) => setConsultaValor(e.target.value)} placeholder="R$ 0,00" />
        </div>
        {procs.map((p, i) => (
          <div key={'p' + i} className="vt-fz-line">
            <input className="vt-fz-name" list="vt-proc-sugest" value={p.nome} onChange={(e) => setProcAt(i, 'nome', e.target.value)} placeholder="Procedimento" />
            <input className="vt-fz-val" value={p.valor} onChange={(e) => setProcAt(i, 'valor', e.target.value)} placeholder="R$ 0,00" />
            <button className="vt-fz-del" onClick={() => delProc(i)} title="Remover">×</button>
          </div>
        ))}
        <datalist id="vt-proc-sugest">{VT_PROC_SUGEST.map((s) => <option key={s} value={s} />)}</datalist>
        <button className="vt-fz-add" onClick={addProc}><VtIcon name="plus" size={14} /> Adicionar procedimento</button>

        {meds.map((m, i) => (
          <div key={'m' + i} className="vt-fz-medline">
            <input className="vt-fz-name" list="vt-med-sugest" value={m.nome} onChange={(e) => setMedAt(i, 'nome', e.target.value)} placeholder="Medicamento" />
            <input className="vt-fz-qtd" type="number" min="1" value={m.qtd} onChange={(e) => setMedAt(i, 'qtd', e.target.value)} placeholder="Qtd" />
            <input className="vt-fz-val" value={m.unit} onChange={(e) => setMedAt(i, 'unit', e.target.value)} placeholder="Unit." />
            <span className="vt-fz-medtot">{money((Number(m.qtd) || 0) * parseMoney(m.unit))}</span>
            <button className="vt-fz-del" onClick={() => delMed(i)} title="Remover">×</button>
          </div>
        ))}
        <datalist id="vt-med-sugest">{VT_MED_SUGEST.map((s) => <option key={s} value={s} />)}</datalist>
        <button className="vt-fz-add" onClick={addMed}><VtIcon name="plus" size={14} /> Adicionar medicamento</button>

        {/* SEÇÃO C — Resumo financeiro */}
        <div className="vt-fz-sec">C · Resumo financeiro</div>
        <div className="vt-fz-resumo">
          <div><span>Subtotal consulta</span><b>{money(subConsulta)}</b></div>
          <div><span>Subtotal procedimentos</span><b>{money(subProc)}</b></div>
          <div><span>Subtotal medicamentos</span><b>{money(subMed)}</b></div>
          <div className="vt-fz-total"><span>TOTAL</span><b>{money(total)}</b></div>
        </div>

        {/* SEÇÃO D — Envio para cobrança */}
        <div className="vt-fz-sec">D · Envio para cobrança</div>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '100%' }}><span className="vtf-label">Forma de pagamento</span>
            <span className="vtf-inputwrap"><select className="vtf-input" value={forma} onChange={(e) => setForma(e.target.value)}>{FORMAS.map((m) => <option key={m}>{m}</option>)}</select></span></label>
        </div>
        <label className="vt-check-inline" style={{ margin: '2px 0 4px' }}><input type="checkbox" checked={whats} onChange={(e) => setWhats(e.target.checked)} /> Enviar resumo por WhatsApp ao tutor {whatsNum ? <b style={{ marginLeft: 4 }}>({whatsNum})</b> : <i style={{ color: 'var(--muted)' }}>(sem número cadastrado)</i>}</label>
        <div className="fin-modal-actions" style={{ marginTop: 12 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" style={{ background: 'var(--green)' }} onClick={confirm}><VtIcon name="check" size={16} /> Finalizar e Enviar para Cobrança</button>
        </div>
      </div>
    </div>
  );
}

/* Modal de cancelamento com motivo */
function CancelarAtendimentoModal({ at, onClose, onConfirm }) {
  const [motivo, setMotivo] = vtUseState('');
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
        <button className="fin-modal-x" onClick={onClose}>×</button>
        <h3>Cancelar atendimento</h3>
        <p>{at.type || 'Atendimento'} · {at.patientName}</p>
        <label className="vtf" style={{ width: '100%' }}><span className="vtf-label">Motivo do cancelamento</span>
          <span className="vtf-inputwrap"><textarea className="vtf-input" style={{ minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: tutor remarcou, ausência, etc." /></span></label>
        <div className="fin-modal-actions" style={{ marginTop: 12 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Voltar</button>
          <button className="vt-btn-primary" style={{ background: 'var(--red)' }} onClick={() => onConfirm(motivo)}>Confirmar cancelamento</button>
        </div>
      </div>
    </div>
  );
}

/* Modal de criação rápida de atendimento (status Agendado) */
function NovoAtendimentoModal({ patients, initial, onClose, onSave }) {
  const consults = window.vtConsults();
  const vets = window.vtVets();
  const [pid, setPid] = vtUseState(initial ? initial.patientId : '');
  const [pq, setPq] = vtUseState('');
  const [type, setType] = vtUseState(initial ? initial.type : (consults[0] ? consults[0].label : ''));
  const [date, setDate] = vtUseState(initial ? initial.date : window.PR.todayBR());
  const [time, setTime] = vtUseState(initial ? (initial.time || '09:00') : (window.PR.nowHM ? window.PR.nowHM() : '09:00'));
  const [vet, setVet] = vtUseState(initial ? (initial.vet || '').replace('M.V. ', '') : (vets[0] ? vets[0].name : ''));
  const [value, setValue] = vtUseState(initial ? initial.value : (consults[0] ? consults[0].price : ''));
  const picked = patients.find((p) => p.id === pid);
  const onType = (label) => { setType(label); const c = consults.find((x) => x.label === label); if (c) setValue(c.price); };
  const list = patients.filter((p) => p.status !== 'Óbito' && (p.name.toLowerCase().includes(pq.toLowerCase()) || (p.owner || '').toLowerCase().includes(pq.toLowerCase())));
  const save = () => {
    if (!pid) { window.vtToast('Selecione o paciente.', 'err'); return; }
    onSave({ id: initial ? initial.id : undefined, patientId: pid, type, date, time, vet, value });
  };
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 540 }} onClick={(e) => e.stopPropagation()}>
        <button className="fin-modal-x" onClick={onClose}>×</button>
        <h3>{initial ? 'Editar atendimento' : 'Novo atendimento'}</h3>
        <p>{initial ? 'Atualize os dados do agendamento.' : <>Agende um atendimento — entra na lista como <b>Agendado</b>.</>}</p>
        {picked ? (
          <div className="pr-pick-row" style={{ cursor: 'default', background: 'var(--bg)', borderRadius: 10, padding: 10 }}>
            <PetAvatar p={picked} />
            <span style={{ flex: 1 }}><b>{picked.name}</b><i>{picked.species} · {picked.breed} · {picked.owner}</i></span>
            <button className="vt-link" onClick={() => setPid('')}>Trocar</button>
          </div>
        ) : (
          <>
            <div className="vt-search inline" style={{ margin: '4px 0 8px' }}><VtIcon name="search" size={16} /><input autoFocus placeholder="Buscar paciente..." value={pq} onChange={(e) => setPq(e.target.value)} /></div>
            <div className="pr-pick" style={{ maxHeight: 180 }}>
              {list.slice(0, 30).map((p) => (
                <button key={p.id} className="pr-pick-row" onClick={() => setPid(p.id)}>
                  <PetAvatar p={p} />
                  <span style={{ flex: 1 }}><b>{p.name}</b><i>{p.species} · {p.breed} · {p.owner}</i></span>
                  <VtIcon name="chevron" size={16} />
                </button>
              ))}
              {list.length === 0 && <p className="pr-empty">Nenhum paciente encontrado.</p>}
            </div>
          </>
        )}
        <div className="vt-form-row" style={{ marginTop: 10 }}>
          <label className="vtf" style={{ width: '100%' }}><span className="vtf-label">Tipo de atendimento</span>
            <span className="vtf-inputwrap"><select className="vtf-input" value={type} onChange={(e) => onType(e.target.value)}>{consults.map((c) => <option key={c.id}>{c.label}</option>)}</select></span></label>
        </div>
        <div className="vt-form-row">
          <VtField label="Data" value={date} onChange={(v) => setDate(window.maskDate ? window.maskDate(v) : v)} placeholder="DD/MM/AAAA" width="32%" />
          <VtField label="Hora" value={time} onChange={setTime} placeholder="09:00" width="22%" />
          <label className="vtf" style={{ width: '42%' }}><span className="vtf-label">Veterinário</span>
            <span className="vtf-inputwrap"><select className="vtf-input" value={vet} onChange={(e) => setVet(e.target.value)}>{vets.map((v) => <option key={v.id}>{v.name}</option>)}</select></span></label>
        </div>
        <div className="vt-form-row">
          <VtField label="Valor estimado" value={value} onChange={setValue} placeholder="R$ 0,00" width="40%" />
        </div>
        <div className="fin-modal-actions" style={{ marginTop: 12 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={save}><VtIcon name={initial ? 'check' : 'plus'} size={16} /> {initial ? 'Salvar alterações' : 'Agendar atendimento'}</button>
        </div>
      </div>
    </div>
  );
}

/* Modal de finalização: valor final, pagamento, observações → cria receita no Financeiro */
function FinalizarAtendimentoModal({ at, onClose, onConfirm }) {
  const [value, setValue] = vtUseState(at.value || '');
  const [method, setMethod] = vtUseState('Pix');
  const [pago, setPago] = vtUseState(true);
  const [obs, setObs] = vtUseState('');
  const METHODS = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Boleto', 'Convênio'];
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <button className="fin-modal-x" onClick={onClose}>×</button>
        <h3>Finalizar atendimento</h3>
        <p>{at.type} · {at.patientName}</p>
        <div className="vt-form-row">
          <VtField label="Valor final" value={value} onChange={setValue} placeholder="R$ 0,00" width="48%" />
          <label className="vtf" style={{ width: '48%' }}><span className="vtf-label">Forma de pagamento</span>
            <span className="vtf-inputwrap"><select className="vtf-input" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></span></label>
        </div>
        <label className="vt-check-inline" style={{ margin: '2px 0 4px' }}><input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} /> Pagamento já recebido (lança como Pago; senão, Pendente)</label>
        <label className="vtf" style={{ width: '100%' }}><span className="vtf-label">Observações</span>
          <span className="vtf-inputwrap"><textarea className="vtf-input" style={{ minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações do encerramento…" /></span></label>
        <div className="fin-modal-actions" style={{ marginTop: 12 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" style={{ background: 'var(--green)' }} onClick={() => onConfirm({ value, method, pago, obs })}><VtIcon name="check" size={16} /> Concluir e lançar</button>
        </div>
      </div>
    </div>
  );
}

/* Módulo global Atendimentos — lista + prontuário eletrônico completo */
function AtendimentosModule({ openPatient, openOdonto, focus, clearFocus }) {
  const store = window.VtStore;
  const [patients, setPatients] = vtUseState(() => { const d = store && store.getData(); return (d && d.patients) || []; });
  const [atend, setAtend] = vtUseState(() => { const d = store && store.getData(); return (d && d.atendimentos) || []; });
  const [agenda, setAgenda] = vtUseState(() => { const d = store && store.getData(); return (d && d.agendaAppts) || []; });
  const [weights, setWeights] = vtUseState(() => { const d = store && store.getData(); return (d && d.weights) || {}; });
  const [vaccines, setVaccines] = vtUseState(() => { const d = store && store.getData(); return (d && d.vaccines) || {}; });
  const [view, setView] = vtUseState({ mode: 'list' });
  const [pick, setPick] = vtUseState(false);
  const [novo, setNovo] = vtUseState(false);
  const [editAt, setEditAt] = vtUseState(null);
  const [finalizar, setFinalizar] = vtUseState(null);
  const [darBaixa, setDarBaixa] = vtUseState(null);
  const [cancelar, setCancelar] = vtUseState(null);
  const [fecharMesOpen, setFecharMesOpen] = vtUseState(false);
  const [tab, setTab] = vtUseState('agendados');
  const [histSearch, setHistSearch] = vtUseState('');
  const [expMes, setExpMes] = vtUseState(null);
  const [pq, setPq] = vtUseState('');
  const [q, setQ] = vtUseState('');
  const [filterType, setFilterType] = vtUseState('Todos');
  const [layout, setLayout] = vtUseState('cards');
  const [filterVet, setFilterVet] = vtUseState('Todos');
  const [heroQ, setHeroQ] = vtUseState('');

  const findPatient = (id) => patients.find((p) => p.id === id);
  const persistAgenda = (next) => { setAgenda(next); if (store) store.setData({ agendaAppts: next }); };
  // PACOTE A — helpers de conversão Agenda ↔ Atendimentos
  const fmtHL = (h) => { if (h == null || h === '') return ''; const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return String(hh).padStart(2, '0') + ':' + (mm ? String(mm).padStart(2, '0') : '00'); };
  const isoToBR = (iso) => { const m = (iso || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || ''); };
  const parseTimeMin = (t) => { const m = (t || '').match(/(\d{1,2}):(\d{2})/); return m ? (+m[1] * 60 + +m[2]) : 0; };
  const agVetColor = (ev) => { const n = (ev.vet || '').replace('M.V. ', ''); const v = window.vtVets().find((x) => x.name === n); return (v && v.color) || '#2f6fed'; };
  const agIsAgendado = (s) => !s || s === 'Pendente' || s === 'Confirmado';
  // materializa um card vindo da Agenda num registro real de atendimento (status agendado) e marca o evento espelhado
  const mirrorAgenda = (card) => {
    const p = card.patientId ? findPatient(card.patientId) : null;
    const base = {
      id: 'A' + Date.now().toString(36) + Math.floor(Math.random() * 900 + 100),
      patientId: card.patientId || null, patientName: card.patientName,
      type: card.type, date: card.date, time: card.time,
      vet: card.vet || '', vetColor: card.vetColor || '#2f6fed',
      value: card.value || '', status: 'agendado', _agId: card._agId,
    };
    const rec = p ? window.prEnsure(Object.assign(window.prBlank(p), base), p) : base;
    const nextAt = [rec, ...atend];
    const nextAgenda = agenda.map((x) => x.id === card._agId ? { ...x, _mirroredAtId: rec.id } : x);
    setAtend(nextAt); setAgenda(nextAgenda);
    if (store) store.setData({ atendimentos: nextAt, agendaAppts: nextAgenda });
    return rec;
  };
  const removeAgendaAppt = (agId) => {
    if (!window.vtIsAdmin || !window.vtIsAdmin()) { window.vtToast('Apenas administrador pode excluir.', 'err'); return; }
    if (!window.confirm('Excluir este agendamento? Esta ação não pode ser desfeita.')) return;
    persistAgenda(agenda.filter((x) => x.id !== agId));
    window.vtToast('Agendamento excluído.', 'ok');
  };
  const weightsFor = (id) => {
    const w = weights[id];
    if (w && w.length) return w;
    const p = findPatient(id);
    return p && p.weight ? [{ date: (p.lastVisit && p.lastVisit !== 'Novo') ? p.lastVisit : window.PR.todayBR(), weight: p.weight, score: 5, obs: 'Registro inicial' }] : [];
  };

  const openExisting = (at) => {
    const p = findPatient(at.patientId); if (!p) return;
    const merged = window.prEnsure(Object.assign({}, at, PR_SAMPLES[at.id] || {}), p);
    setView({ mode: 'pront', patient: p, at: merged });
  };
  const openNew = (p) => { setPick(false); setView({ mode: 'pront', patient: p, at: window.prEnsure(window.prBlank(p), p) }); };

  // foco vindo de outro módulo (ex.: perfil do paciente → novo/abrir atendimento)
  vtUseEffect(() => {
    if (!focus) return;
    if (focus.atendimentoId) {
      const at = atend.find((a) => a.id === focus.atendimentoId);
      if (at) openExisting(at);
    } else if (focus.fromAgenda) {
      const appt = focus.fromAgenda;
      const allPats = ((window.VtStore.getData() || {}).patients) || [];
      const p = allPats.find((pt) => pt.name === appt.patient) || (focus.patientId ? findPatient(focus.patientId) : null);
      if (p) {
        const base = {};
        if (appt.kind) base.type = appt.kind;
        if (appt.vet) base.vet = appt.vet;
        if (appt.date) { const parts = appt.date.split('-'); base.date = parts[2] + '/' + parts[1] + '/' + parts[0]; }
        const newAt = window.prBlank ? window.prBlank(p, base) : {};
        setView({ mode: 'pront', patient: p, at: window.prEnsure ? window.prEnsure(newAt, p) : newAt });
      } else {
        window.vtToast('Paciente "' + (appt.patient || '') + '" não encontrado no cadastro.', 'err');
      }
    } else if (focus.patientId) {
      const p = findPatient(focus.patientId);
      if (p) openNew(p);
    }
    if (clearFocus) clearFocus();
  }, [focus]);

  const removeAt = (id) => {
    if (!window.vtIsAdmin || !window.vtIsAdmin()) { window.vtToast('Apenas administrador pode excluir.', 'err'); return; }
    if (!window.confirm('Excluir este atendimento? Esta ação não pode ser desfeita.')) return;
    const nextAt = atend.filter((a) => a.id !== id);
    setAtend(nextAt);
    if (store) store.setData({ atendimentos: nextAt });
    window.vtToast('Atendimento excluído.', 'ok');
  };

  const commit = (at) => {
    const exists = atend.some((a) => a.id === at.id);
    const nextAt = exists ? atend.map((a) => a.id === at.id ? at : a) : [at, ...atend];
    setAtend(nextAt);
    const exPeso = (at.exame && at.exame.peso && at.exame.peso.v) ? at.exame.peso.v : null;
    const nextPatients = patients.map((p) => p.id === at.patientId ? { ...p, lastVisit: at.date, weight: at.weight || exPeso || p.weight } : p);
    setPatients(nextPatients);
    if (store) store.setData({ atendimentos: nextAt, patients: nextPatients });
    setView((v) => v.mode === 'pront' ? { ...v, at } : v);
  };
  const addWeight = (patient, w) => {
    const base = (weights[patient.id] || weightsFor(patient.id)).filter((x) => x.obs !== 'Registro inicial');
    const next = { ...weights, [patient.id]: [w, ...base] };
    setWeights(next);
    const nextPatients = patients.map((p) => p.id === patient.id ? { ...p, weight: w.weight, lastVisit: w.date } : p);
    setPatients(nextPatients);
    setView((v) => (v.mode === 'pront' && v.patient.id === patient.id) ? { ...v, patient: { ...v.patient, weight: w.weight } } : v);
    if (store) store.setData({ weights: next, patients: nextPatients });
    window.vtToast('Peso registrado.', 'ok');
  };
  const vaccinesFor = (id) => vaccines[id] || [];
  const saveVaccines = (patient, list) => {
    const next = { ...vaccines, [patient.id]: list };
    setVaccines(next);
    if (store) store.setData({ vaccines: next });
  };

  if (view.mode === 'pront') {
    return <Prontuario patient={view.patient} atendimento={view.at} weights={weightsFor(view.patient.id)} vaccines={vaccinesFor(view.patient.id)}
      onBack={() => setView({ mode: 'list' })} onCommit={commit}
      onAddWeight={(w) => addWeight(view.patient, w)} onSaveVaccines={(list) => saveVaccines(view.patient, list)}
      onFinalizar={(at, info) => {
        if (info) {
          // vem do PrFinalizar — salva financeiro (status pendente, sem forma/data ainda) e fecha
          commit(at);
          const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const d = (store && store.getData()) || {}; const fin = d.fin || { tx: [] };
          const today = new Date().toISOString().slice(0, 10);
          const catMap = { 'Consulta': 'Consulta', 'Procedimento': 'Procedimento', 'Medicamento': 'Procedimento', 'Cirurgia': 'Cirurgia', 'Internação': 'Procedimento', 'Exame': 'Exame', 'Vacina aplicada': 'Procedimento' };
          const newTx = (info.items || []).filter((it) => (Number(it.valor) || 0) > 0).map((it) => ({
            id: 'T' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
            kind: 'receita', desc: (it.nome || it.tipo) + ' — ' + at.patientName, patient: at.patientName,
            cat: catMap[it.tipo] || 'Procedimento', value: Number(it.valor) || 0, date: today,
            status: 'pendente', method: null, paidAt: null, atId: at.id,
          }));
          const nextAt = atend.map((x) => x.id === at.id ? { ...at } : x);
          setAtend(nextAt);
          if (store) store.setData({ atendimentos: nextAt, fin: { ...fin, tx: [...newTx, ...(fin.tx || [])] } });
          // orçamento aprovado → salva em orçamentos também
          if (at.orcamento && at.orcamento.aprovado && (at.orcamento.items || []).length) {
            const orcTotal = at.orcamento.items.reduce((s, i) => s + (Number(i.valor) || 0) * (Number(i.qtd) || 1), 0);
            const orcList = (d.orcamentos || []).slice();
            orcList.unshift({ id: 'OR' + Date.now().toString(36), atId: at.id, patientId: at.patientId, patientName: at.patientName, vet: at.vet, date: window.PR ? window.PR.todayBR() : today, items: at.orcamento.items, total: orcTotal, status: 'aprovado' });
            if (store) store.setData({ orcamentos: orcList });
          }
          setView({ mode: 'list' });
          setTab('realizados');
          window.vtToast('Atendimento finalizado! ' + money(info.total) + ' enviado para Finanças.', 'ok');
        } else {
          commit(at); setDarBaixa(at);
        }
      }}
      onOpenOdonto={() => { if (openOdonto) openOdonto(view.patient.id); }} />;
  }

  const types = ['Todos', ...window.vtConsults().map((t) => t.label)];
  const sorted = [...atend].sort((a, b) => parseBR(b.date) - parseBR(a.date));
  const list = sorted.filter((a) =>
    (filterType === 'Todos' || a.type === filterType) &&
    (filterVet === 'Todos' || (a.vet || '').replace('M.V. ', '') === filterVet) &&
    (a.patientName.toLowerCase().includes(q.toLowerCase()) || (a.procedure || '').toLowerCase().includes(q.toLowerCase())));
  const statusPill = (s) => s === 'agendado'
    ? <span className="pr-status-pill agendado">Agendado</span>
    : s === 'em_andamento' ? <span className="pr-status-pill andamento">Em andamento</span>
    : s === 'arquivado' ? <span className="pr-status-pill arquivado">Cancelado</span>
    : <span className="pr-status-pill finalizado">Concluído</span>;
  const statusCard = (s) => s === 'agendado'
    ? <span className="pr-status-pill agendado">Agendado</span>
    : s === 'confirmado' ? <span className="pr-status-pill confirmado">Confirmado</span>
    : s === 'aguardando' ? <span className="pr-status-pill aguardando">Aguardando</span>
    : s === 'em_andamento' ? <span className="pr-status-pill andamento">Em andamento</span>
    : s === 'arquivado' ? <span className="pr-status-pill cancelado">Cancelado</span>
    : <span className="pr-status-pill finalizado">Concluído</span>;
  const cobrarAt = (a) => {
    if (!window.VtStore) return;
    const d = window.VtStore.getData() || {}; const fin = d.fin || { tx: [] };
    const val = Number((a.value || '').toString().replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    if (!val) { window.vtToast('Atendimento sem valor para cobrar.', 'err'); return; }
    const tx = { id: 'T' + Date.now().toString(36), kind: 'receita', desc: (a.type || 'Atendimento') + ' — ' + a.patientName, patient: a.patientName, cat: 'Procedimento', value: val, date: new Date().toISOString().slice(0, 10), status: 'pendente', method: null, paidAt: null };
    window.VtStore.setData({ fin: { ...fin, tx: [tx, ...(fin.tx || [])] } });
    window.vtToast('Cobrança lançada em Financeiro › Receitas.', 'ok');
  };
  // criar novo atendimento (status Agendado) a partir do formulário rápido — ou editar um existente
  const createNovo = (data) => {
    const p = findPatient(data.patientId); if (!p) { window.vtToast('Selecione um paciente.', 'err'); return; }
    const vetObj = window.vtVets().find((v) => v.name === data.vet) || {};
    if (data.id && atend.some((a) => a.id === data.id)) {
      const nextAt = atend.map((x) => x.id === data.id ? { ...x, type: data.type, date: data.date, time: data.time, vet: data.vet ? 'M.V. ' + data.vet : '', vetColor: vetObj.color || x.vetColor, value: data.value } : x);
      setAtend(nextAt); if (store) store.setData({ atendimentos: nextAt });
      setEditAt(null); window.vtToast('Atendimento atualizado.', 'ok');
      return;
    }
    const at = window.prEnsure(Object.assign(window.prBlank(p), {
      id: 'A' + Date.now().toString(36),
      type: data.type, date: data.date, time: data.time,
      vet: data.vet ? 'M.V. ' + data.vet : '', vetColor: vetObj.color || '#2f6fed',
      value: data.value, status: 'agendado',
    }), p);
    commit(at);
    setNovo(false);
    window.vtToast('Atendimento agendado para ' + p.name + '.', 'ok');
  };
  // BLOCO 4 — finaliza um atendimento agendado (fechamento clínico completo)
  const finalizarConsulta = (info) => {
    const a = darBaixa; if (!a) return;
    const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const vetObj = window.vtVets().find((v) => v.name === info.prof) || {};
    const procList = [];
    if (info.consulta.on) procList.push({ nome: 'Consulta', valor: info.consulta.valor, custo: 0, tempo: '' });
    info.procedimentos.forEach((p) => procList.push({ nome: p.nome, valor: p.valor, custo: 0, tempo: '' }));
    const nextAt = atend.map((x) => x.id === a.id ? {
      ...x, status: 'finalizado', date: info.data, time: info.hora,
      vet: info.prof ? 'M.V. ' + info.prof : x.vet, vetColor: vetObj.color || x.vetColor,
      value: money(info.total), formaPagamento: info.forma,
      procedimentos: procList, medicamentos: info.medicamentos,
      fechamento: { subConsulta: info.subConsulta, subProc: info.subProc, subMed: info.subMed, total: info.total, forma: info.forma, em: new Date().toISOString() },
    } : x);
    setAtend(nextAt);
    const d = (store && store.getData()) || {}; const fin = d.fin || { tx: [] };
    const today = new Date().toISOString().slice(0, 10);
    const tx = { id: 'T' + Date.now().toString(36), kind: 'receita', desc: (a.type || 'Atendimento') + ' — ' + a.patientName, patient: a.patientName, cat: 'Procedimento', value: info.total, date: today, status: 'pendente', method: info.forma || null, paidAt: null };
    const nextPatients = patients.map((pp) => pp.id === a.patientId ? { ...pp, lastVisit: info.data } : pp);
    setPatients(nextPatients);
    if (store) store.setData({ atendimentos: nextAt, fin: { ...fin, tx: [tx, ...(fin.tx || [])] }, patients: nextPatients });
    // PACOTE A — se veio da Agenda, marca o evento original como Realizado
    if (a._agId) { const nextAg = agenda.map((x) => x.id === a._agId ? { ...x, status: 'Realizado' } : x); setAgenda(nextAg); if (store) store.setData({ agendaAppts: nextAg }); }
    // WhatsApp ao tutor com resumo pré-formatado (usa o modelo 3 de Configurações › Integrações)
    if (info.enviarWhats && info.whatsNum) {
      const vcfg = window.vtConfig ? window.vtConfig() : {};
      const clinica = (window.vtClinic && window.vtClinic().name) || 'nossa clínica';
      const header = vcfg.waTplPos
        ? window.vtFillTemplate(vcfg.waTplPos, { paciente: a.patientName, tutor: a.patientName && (findPatient(a.patientId) || {}).owner || '', data: info.data, hora: info.hora, clinica, total: money(info.total) })
        : ('*Resumo do atendimento — ' + a.patientName + '*');
      const lines = [header, '', (a.type || 'Consulta') + ' · ' + info.data + ' ' + info.hora, ''];
      if (info.consulta.on) lines.push('• Consulta: ' + money(info.consulta.valor));
      info.procedimentos.forEach((p) => lines.push('• ' + p.nome + ': ' + money(p.valor)));
      info.medicamentos.forEach((m) => lines.push('• ' + m.nome + ' (' + m.qtd + 'x): ' + money(m.total)));
      lines.push('', '*TOTAL: ' + money(info.total) + '*', 'Forma de pagamento: ' + info.forma);
      const link = window.vtWaLink(info.whatsNum, lines.join('\n'));
      if (link) window.open(link, '_blank', 'noopener');
    }
    setDarBaixa(null);
    setView({ mode: 'list' });
    setTab('realizados');
    window.vtToast('Atendimento finalizado! Valor: ' + money(info.total) + ' enviado para Finanças.', 'ok');
  };
  // PACOTE A — confirmar agendamento (atualiza status no atendimento e/ou no agendaAppts → 'Confirmado')
  const confirmarAt = (a) => {
    if (a._fromAgenda) {
      const nextAg = agenda.map((x) => x.id === a._agId ? { ...x, status: 'Confirmado' } : x);
      persistAgenda(nextAg);
      window.vtToast('Agendamento confirmado.', 'ok');
      return;
    }
    const nextAt = atend.map((x) => x.id === a.id ? { ...x, status: 'confirmado' } : x);
    setAtend(nextAt);
    let nextAg = agenda;
    if (a._agId) { nextAg = agenda.map((x) => x.id === a._agId ? { ...x, status: 'Confirmado' } : x); setAgenda(nextAg); }
    if (store) store.setData(a._agId ? { atendimentos: nextAt, agendaAppts: nextAg } : { atendimentos: nextAt });
    window.vtToast('Atendimento confirmado.', 'ok');
  };
  // BLOCO 3 — cancelar com motivo
  const cancelarComMotivo = (motivo) => {
    const a = cancelar; if (!a) return;
    const nextAt = atend.map((x) => x.id === a.id ? { ...x, status: 'arquivado', motivoCancelamento: motivo || '' } : x);
    setAtend(nextAt);
    let nextAg = agenda;
    if (a._agId) { nextAg = agenda.map((x) => x.id === a._agId ? { ...x, status: 'Cancelado', motivo: motivo || '' } : x); setAgenda(nextAg); }
    if (store) store.setData(a._agId ? { atendimentos: nextAt, agendaAppts: nextAg } : { atendimentos: nextAt });
    setCancelar(null); window.vtToast('Atendimento cancelado.', 'ok');
  };
  // BLOCO 3 — fechar o mês: arquiva os realizados do mês atual
  const mesAtualLabel = vtMesLabel(new Date());
  const realizadosDoMes = atend.filter((a) => vtIsRealizado(a) && vtMesFromBR(a.date) === mesAtualLabel && !a.arquivadoEm);
  const fecharMes = () => {
    const ids = new Set(realizadosDoMes.map((a) => a.id));
    if (!ids.size) { window.vtToast('Nenhum atendimento realizado em ' + mesAtualLabel + ' para arquivar.', 'err'); return; }
    const nextAt = atend.map((a) => ids.has(a.id) ? { ...a, arquivadoEm: mesAtualLabel } : a);
    setAtend(nextAt); if (store) store.setData({ atendimentos: nextAt });
    setFecharMesOpen(false); setTab('historico');
    window.vtToast(mesAtualLabel + ' arquivado com sucesso!', 'ok');
  };
  // iniciar: Agendado → Em andamento + abre Odontograma com paciente pré-selecionado
  const iniciarAt = (a) => {
    const nextAt = atend.map((x) => x.id === a.id ? { ...x, status: 'em_andamento' } : x);
    setAtend(nextAt); if (store) store.setData({ atendimentos: nextAt });
    window.vtToast('Atendimento iniciado. Abrindo odontograma…', 'ok');
    if (openOdonto) openOdonto(a.patientId);
  };
  // finalizar: Em andamento → Concluído + cria lançamento no Financeiro
  const finalizarAt = (a, info) => {
    const nextAt = atend.map((x) => x.id === a.id ? { ...x, status: 'finalizado', value: info.value, notes: info.obs ? ((x.notes ? x.notes + ' · ' : '') + info.obs) : x.notes, formaPagamento: info.method } : x);
    setAtend(nextAt);
    const val = Number((info.value || '').toString().replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    const d = (store && store.getData()) || {}; const fin = d.fin || { tx: [] };
    const today = new Date().toISOString().slice(0, 10);
    const paid = !!info.pago;
    const tx = { id: 'T' + Date.now().toString(36), kind: 'receita', desc: (a.type || 'Atendimento') + ' — ' + a.patientName, patient: a.patientName, cat: 'Procedimento', value: val, date: today, status: paid ? 'pago' : 'pendente', method: info.method || null, paidAt: paid ? today : null };
    const nextFin = val ? { ...fin, tx: [tx, ...(fin.tx || [])] } : fin;
    if (store) store.setData({ atendimentos: nextAt, fin: nextFin });
    setFinalizar(null);
    window.vtToast(val ? `Atendimento concluído. Receita ${paid ? 'paga' : 'pendente'} lançada no Financeiro.` : 'Atendimento concluído.', 'ok');
  };
  const cancelarAt = (a) => {
    if (!window.confirm('Cancelar este atendimento?')) return;
    const nextAt = atend.map((x) => x.id === a.id ? { ...x, status: 'arquivado' } : x);
    setAtend(nextAt); if (store) store.setData({ atendimentos: nextAt });
    window.vtToast('Atendimento cancelado.', 'ok');
  };
  const retornoAt = (a) => { window.vtToast('Abra a Agenda para marcar o retorno de ' + a.patientName + '.', 'ok'); };
  const pickList = patients.filter((p) => p.status !== 'Óbito' && p.name.toLowerCase().includes(pq.toLowerCase()));

  // ----- listas por aba (Bloco 3) -----
  const fSearch = (a) => (a.patientName || '').toLowerCase().includes(q.toLowerCase()) || (a.type || '').toLowerCase().includes(q.toLowerCase());
  const fFilters = (a) => (filterType === 'Todos' || a.type === filterType) && (filterVet === 'Todos' || (a.vet || '').replace('M.V. ', '') === filterVet);
  // PACOTE A — entradas vindas da Agenda (vtAgenda → store.agendaAppts) que ainda não viraram atendimento
  const atendKeys = new Set(atend.map((a) => (a.patientName || '').toLowerCase().trim() + '|' + (a.date || '') + '|' + (a.time || '')));
  const agendaExtra = agenda
    .filter((ev) => ev.patient && agIsAgendado(ev.status) && !ev._mirroredAtId)
    .map((ev) => {
      const p = patients.find((x) => x.name === ev.patient) || {};
      return {
        id: 'AG:' + ev.id, _fromAgenda: true, _agId: ev.id,
        patientName: ev.patient, patientId: p.id || null,
        type: ev.kind || 'Consulta', date: isoToBR(ev.date), time: fmtHL(ev.start),
        vet: ev.vet || '', vetColor: agVetColor(ev), value: ev.value || '',
        status: ev.status === 'Confirmado' ? 'confirmado' : 'agendado',
      };
    })
    .filter((c) => !atendKeys.has((c.patientName || '').toLowerCase().trim() + '|' + c.date + '|' + c.time));
  const agendados = [...atend.filter((a) => vtIsAgendado(a.status)), ...agendaExtra]
    .filter(fSearch).filter(fFilters)
    .sort((a, b) => (parseBR(a.date) - parseBR(b.date)) || (parseTimeMin(a.time) - parseTimeMin(b.time)));
  const realizadosMes = realizadosDoMes.filter(fSearch).filter(fFilters).sort((a, b) => parseBR(b.date) - parseBR(a.date));
  const arquivados = atend.filter((a) => a.arquivadoEm);
  const mesesMap = {}; arquivados.forEach((a) => { (mesesMap[a.arquivadoEm] = mesesMap[a.arquivadoEm] || []).push(a); });
  const mesesList = Object.keys(mesesMap).sort((x, y) => parseBR(mesesMap[y][0].date) - parseBR(mesesMap[x][0].date));
  const histMatch = (a) => { const t = histSearch.trim(); return !t || (a.date || '').includes(t); };
  const whatsFor = (a) => { const p = findPatient(a.patientId) || {}; const d = (store && store.getData()) || {}; const ow = ((d.owners) || []).find((o) => o.name === p.owner) || {}; return p.whats || ow.whats || (ow.phone && ow.phone !== '—' ? ow.phone : '') || p.phone || ''; };

  return (
    <div>
      <div className="vt-page-head vt-head-row">
        <div><h1>Atendimentos</h1><p>{atend.length} atendimentos · prontuário eletrônico</p></div>
        <button className="vt-btn-primary" onClick={() => setNovo(true)}><VtIcon name="plus" size={17} /> Novo atendimento</button>
      </div>

      {/* Central de Atendimento — busca grande para iniciar o atendimento */}
      <div className="vt-at-central">
        <div className="vt-at-central-search">
          <VtIcon name="search" size={22} />
          <input placeholder="Busque um paciente para iniciar o atendimento…" value={heroQ} onChange={(e) => setHeroQ(e.target.value)} />
          {heroQ && <button className="vt-at-central-x" onClick={() => setHeroQ('')}>×</button>}
        </div>
        <div className="vt-at-central-meta">
          <span className="vt-at-central-stat"><b>{agendados.length}</b> na fila</span>
          <span className="vt-at-central-dot" />
          <span className="vt-at-central-stat"><b>{realizadosMes.length}</b> finalizados ({mesAtualLabel})</span>
        </div>
        {heroQ.trim() && (
          <div className="vt-at-central-results">
            {patients.filter((p) => p.status !== 'Óbito' && (p.name.toLowerCase().includes(heroQ.toLowerCase()) || (p.owner || '').toLowerCase().includes(heroQ.toLowerCase()))).slice(0, 8).map((p) => (
              <button key={p.id} className="pr-pick-row" onClick={() => { setHeroQ(''); openNew(p); }}>
                <PetAvatar p={p} />
                <span style={{ flex: 1 }}><b>{p.name}</b><i>{[p.species, p.breed, p.owner].filter(Boolean).join(' · ')}</i></span>
                <span className="vt-at-central-go">Iniciar <VtIcon name="chevron" size={15} /></span>
              </button>
            ))}
            {patients.filter((p) => p.status !== 'Óbito' && (p.name.toLowerCase().includes(heroQ.toLowerCase()) || (p.owner || '').toLowerCase().includes(heroQ.toLowerCase()))).length === 0 && <p className="pr-empty" style={{ padding: '10px 4px' }}>Nenhum paciente encontrado para “{heroQ}”.</p>}
          </div>
        )}
      </div>
      <div className="pf-tabs" style={{ marginBottom: 18 }}>
        <button className={`pf-tab${tab === 'agendados' ? ' on' : ''}`} onClick={() => setTab('agendados')}>📅 Agendados <span className="vt-count-badge">{agendados.length}</span></button>
        <button className={`pf-tab${tab === 'realizados' ? ' on' : ''}`} onClick={() => setTab('realizados')}>✅ Realizados ({mesAtualLabel})</button>
        <button className={`pf-tab${tab === 'historico' ? ' on' : ''}`} onClick={() => setTab('historico')}>📁 Histórico {mesesList.length ? <span className="vt-count-badge">{mesesList.length}</span> : null}</button>
      </div>

      {tab !== 'historico' && (
        <div className="vt-toolbar-row">
          <div className="vt-search inline"><VtIcon name="search" size={17} /><input placeholder="Buscar por paciente ou procedimento..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <label className="vtf" style={{ flex: 'none', width: 190 }}>
            <span className="vtf-inputwrap"><select className="vtf-input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>{types.map((t) => <option key={t}>{t}</option>)}</select></span>
          </label>
          <label className="vtf" style={{ flex: 'none', width: 180 }}>
            <span className="vtf-inputwrap"><select className="vtf-input" value={filterVet} onChange={(e) => setFilterVet(e.target.value)}>{['Todos', ...window.vtVets().map((v) => v.name)].map((t) => <option key={t}>{t}</option>)}</select></span>
          </label>
          {tab === 'realizados' && <button className="vt-btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setFecharMesOpen(true)}>📁 Fechar Mês de {mesAtualLabel}</button>}
        </div>
      )}

      {/* ABA 1 — Agendados */}
      {tab === 'agendados' && (
        agendados.length === 0
          ? <div className="vt-card"><div className="vt-empty-row">Nenhum atendimento agendado.</div></div>
          : <div className="vt-at-cards">
              {agendados.map((a) => { const p = findPatient(a.patientId) || { name: a.patientName }; const owner = p.owner || ''; return (
                <div key={a.id} className="vt-at-card">
                  <div className="vt-at-card-top vt-at-clk" onClick={() => a.patientId ? openExisting(a._fromAgenda ? mirrorAgenda(a) : a) : window.vtToast('Paciente não cadastrado — cadastre-o para abrir o prontuário.', 'err')} title="Ver prontuário">
                    <PetAvatar p={p} />
                    <span className="vt-at-c-name"><b>{a.patientName}</b><i>{[p.species, owner].filter(Boolean).join(' · ') || '—'}</i></span>
                    {a._fromAgenda ? <span className="vt-at-origin" title="Criado na Agenda">📅 Agenda</span> : <span className="vt-at-origin sistema" title="Criado no Sistema">🏥 Sistema</span>}
                    {statusCard(a.status)}
                  </div>
                  <div className="vt-at-card-meta">
                    <div><span>Data</span><b>{a.date || '—'}</b></div>
                    <div><span>Hora</span><b>{a.time || '—'}</b></div>
                    <div><span>Procedimento</span><b>{a.type || '—'}</b></div>
                    <div><span>Profissional</span><b style={{ color: a.vetColor }}>{(a.vet || '—').replace('M.V. ', '')}</b></div>
                  </div>
                  <div className="vt-at-card-actions">
                    {a.status !== 'confirmado' && <button className="vt-at-cbtn confirm" onClick={() => confirmarAt(a)}><VtIcon name="check" size={13} /> Confirmar</button>}
                    <button className="vt-at-cbtn finish" onClick={() => setDarBaixa(a._fromAgenda ? mirrorAgenda(a) : a)}><VtIcon name="check" size={14} /> Dar baixa</button>
                    <button className="vt-at-cbtn" onClick={() => setEditAt(a._fromAgenda ? mirrorAgenda(a) : a)}><VtIcon name="pen" size={13} /> Editar</button>
                    <button className="vt-at-cbtn danger" onClick={() => setCancelar(a._fromAgenda ? mirrorAgenda(a) : a)}>✗ Cancelar</button>
                    <button className="vt-at-cbtn danger" onClick={() => a._fromAgenda ? removeAgendaAppt(a._agId) : removeAt(a.id)}>🗑 Excluir</button>
                  </div>
                </div>
              ); })}
            </div>
      )}

      {/* ABA 2 — Realizados (mês atual) */}
      {tab === 'realizados' && (
        realizadosMes.length === 0
          ? <div className="vt-card"><div className="vt-empty-row">Nenhum atendimento realizado em {mesAtualLabel}.</div></div>
          : <div className="vt-at-cards">
              {realizadosMes.map((a) => { const p = findPatient(a.patientId) || { name: a.patientName }; const owner = p.owner || ''; return (
                <div key={a.id} className="vt-at-card">
                  <div className="vt-at-card-top vt-at-clk" onClick={() => openExisting(a)} title="Ver prontuário">
                    <PetAvatar p={p} />
                    <span className="vt-at-c-name"><b>{a.patientName}</b><i>{[p.species, owner].filter(Boolean).join(' · ') || '—'}</i></span>
                    {statusCard(a.status)}
                  </div>
                  <div className="vt-at-card-meta">
                    <div><span>Data</span><b>{a.date || '—'}</b></div>
                    <div><span>Hora</span><b>{a.time || '—'}</b></div>
                    <div><span>Procedimento</span><b>{a.type || '—'}</b></div>
                    <div><span>Valor total</span><b style={{ color: 'var(--green)' }}>{a.value || '—'}</b></div>
                  </div>
                  <div className="vt-at-card-actions">
                    <button className="vt-at-cbtn primary" onClick={() => openExisting(a)}><VtIcon name="stethoscope" size={14} /> Ver prontuário</button>
                  </div>
                </div>
              ); })}
            </div>
      )}

      {/* ABA 3 — Histórico */}
      {tab === 'historico' && (
        <div>
          <div className="vt-toolbar-row">
            <div className="vt-search inline"><VtIcon name="search" size={17} /><input placeholder="Buscar por data (dia/mês/ano)…" value={histSearch} onChange={(e) => setHistSearch(e.target.value)} /></div>
          </div>
          {mesesList.length === 0
            ? <div className="vt-card"><div className="vt-empty-row">Nenhum mês arquivado ainda. Use “Fechar Mês” na aba Realizados para arquivar os atendimentos do mês.</div></div>
            : mesesList.map((mes) => {
                const items = mesesMap[mes].filter(histMatch).sort((a, b) => parseBR(b.date) - parseBR(a.date));
                const open = expMes === mes || (histSearch.trim() && items.length);
                return (
                  <div key={mes} className="vt-card vt-hist-mes">
                    <button className="vt-hist-head" onClick={() => setExpMes(expMes === mes ? null : mes)}>
                      <span><b>{mes}</b> — {mesesMap[mes].length} atendimento{mesesMap[mes].length > 1 ? 's' : ''}</span>
                      <span className={`vt-hist-chev${open ? ' open' : ''}`}><VtIcon name="chevron" size={16} /></span>
                    </button>
                    {open && (
                      <div className="vt-hist-body">
                        {items.length === 0
                          ? <p className="pr-empty" style={{ padding: '6px 2px' }}>Nenhum atendimento nesta data.</p>
                          : items.map((a) => (
                            <button key={a.id} className="vt-hist-row" onClick={() => openExisting(a)}>
                              <span className="vt-hist-date">{a.date}{a.time ? ' · ' + a.time : ''}</span>
                              <span className="vt-hist-pat"><b>{a.patientName}</b><i>{a.type}</i></span>
                              <span className="vt-hist-val">{a.value || '—'}</span>
                              <VtIcon name="chevron" size={15} />
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
        </div>
      )}

      {pick && (
        <div className="fin-modal-bg" onClick={() => setPick(false)}>
          <div className="fin-modal" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
            <h3>Novo atendimento</h3>
            <p>Selecione o paciente para abrir o prontuário eletrônico.</p>
            <div className="vt-search inline" style={{ margin: '4px 0 8px' }}><VtIcon name="search" size={16} /><input autoFocus placeholder="Buscar paciente..." value={pq} onChange={(e) => setPq(e.target.value)} /></div>
            <div className="pr-pick">
              {pickList.map((p) => (
                <button key={p.id} className="pr-pick-row" onClick={() => openNew(p)}>
                  <PetAvatar p={p} />
                  <span style={{ flex: 1 }}><b>{p.name}</b><i>{p.species} · {p.breed} · {p.owner}</i></span>
                  <VtIcon name="chevron" size={16} />
                </button>
              ))}
              {pickList.length === 0 && <p className="pr-empty">Nenhum paciente encontrado.</p>}
            </div>
            <div className="fin-modal-actions" style={{ marginTop: 10 }}><button className="vt-btn-ghost" onClick={() => setPick(false)}>Cancelar</button></div>
          </div>
        </div>
      )}

      {novo && <NovoAtendimentoModal patients={patients} onClose={() => setNovo(false)} onSave={createNovo} />}
      {editAt && <NovoAtendimentoModal patients={patients} initial={editAt} onClose={() => setEditAt(null)} onSave={createNovo} />}
      {finalizar && <FinalizarAtendimentoModal at={finalizar} onClose={() => setFinalizar(null)} onConfirm={(info) => finalizarAt(finalizar, info)} />}
      {darBaixa && <FinalizarConsultaModal at={darBaixa} patient={findPatient(darBaixa.patientId)} defaultWhats={whatsFor(darBaixa)} onClose={() => setDarBaixa(null)} onConfirm={finalizarConsulta} />}
      {cancelar && <CancelarAtendimentoModal at={cancelar} onClose={() => setCancelar(null)} onConfirm={cancelarComMotivo} />}
      {fecharMesOpen && (
        <div className="fin-modal-bg" onClick={() => setFecharMesOpen(false)}>
          <div className="fin-modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <button className="fin-modal-x" onClick={() => setFecharMesOpen(false)}>×</button>
            <h3>Fechar mês</h3>
            <p>Arquivar <b>{realizadosDoMes.length}</b> atendimento{realizadosDoMes.length !== 1 ? 's' : ''} de <b>{mesAtualLabel}</b>? Eles sairão da aba Realizados e irão para o Histórico.</p>
            <div className="fin-modal-actions" style={{ marginTop: 12 }}>
              <button className="vt-btn-ghost" onClick={() => setFecharMesOpen(false)}>Cancelar</button>
              <button className="vt-btn-primary" onClick={fecharMes}><VtIcon name="box" size={16} /> Arquivar mês</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function parseBR(d) { const m = (d || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : 0; }

Object.assign(window, { AtendimentoHistory, AtendimentosModule });
