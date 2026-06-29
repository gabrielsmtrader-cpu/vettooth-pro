/* ============================================================
   VetTooth Pro — Financeiro (parte 3)
   Abas: Assinaturas · Projeções · IA Financeira
   Reaproveita helpers globais de vt-financeiro.jsx
   (finBRL, finToday, finUID, finParseMoney, MES, fmtBR, FIN_METHODS).
   ============================================================ */

/* ---- helpers locais (nomes próprios p/ evitar colisão entre scripts) ---- */
const FIN3_FREQ = { Mensal: 1, Trimestral: 3, Semestral: 6, Anual: 12 };
const FIN3_MES_LONG = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
function fin3AddMonths(iso, n) {
  const d = new Date((iso || finToday()) + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}
function fin3LoadAss() { try { return JSON.parse(localStorage.getItem('vtAssinaturas') || '[]'); } catch (e) { return []; } }
function fin3SaveAss(list) { try { localStorage.setItem('vtAssinaturas', JSON.stringify(list)); } catch (e) {} }
/* status efetivo de uma assinatura (cancelada manual > vencida por data > ativa) */
function fin3AssStatus(a) {
  if (a.status === 'Cancelada') return 'Cancelada';
  if ((a.proxCobranca || '') && a.proxCobranca < finToday()) return 'Vencida';
  return 'Ativa';
}
function fin3AssBadge(st) {
  const map = { Ativa: ['var(--green)', 'var(--green-t)'], Vencida: ['var(--red)', 'var(--red-t)'], Cancelada: ['var(--muted)', '#eef1f5'] };
  const [c, bg] = map[st] || map.Ativa;
  return <span className="vt-pill" style={{ color: c, background: bg }}>{st}</span>;
}
/* nome "limpo" do procedimento a partir da descrição da receita ("Profilaxia — Luna" → "Profilaxia") */
function fin3ProcName(t) { return String(t.desc || t.cat || '—').split('—')[0].split(' - ')[0].trim() || (t.cat || '—'); }
/* lança uma receita no Financeiro central (vtFinanceiro = fin.tx) */
function fin3LancaReceita({ desc, patient, value, cat, status, method }) {
  if (!window.VtStore) return;
  const d = window.VtStore.getData() || {};
  const fin = d.fin || { tx: [] };
  const tx = {
    id: finUID(), kind: 'receita', desc, patient: patient || '', cat: cat || 'Procedimento',
    value: Number(value) || 0, date: finToday(),
    status: status || 'pendente', method: method || 'pix',
    paidAt: status === 'pago' ? finToday() : null,
  };
  window.VtStore.setData({ fin: { ...fin, tx: [tx, ...(fin.tx || [])] } });
}

/* ============================================================
   B1 — Assinaturas & Planos
   ============================================================ */
function AssinaturasTab() {
  const [list, setList] = vtUseState(fin3LoadAss);
  const [modal, setModal] = vtUseState(null);
  const persist = (l) => { setList(l); fin3SaveAss(l); };
  const ativas = list.filter((a) => fin3AssStatus(a) === 'Ativa');
  const mrr = ativas.reduce((s, a) => s + (Number(a.value) || 0) * (1 / FIN3_FREQ[a.freq || 'Mensal']), 0);
  const vencidas = list.filter((a) => fin3AssStatus(a) === 'Vencida').length;

  const renovar = (a) => {
    fin3LancaReceita({ desc: `Assinatura ${a.plano} — ${a.patient}`, patient: a.patient, value: a.value, cat: 'Procedimento', status: 'pago', method: 'pix' });
    const next = list.map((x) => x.id === a.id ? { ...x, status: 'Ativa', proxCobranca: fin3AddMonths(x.proxCobranca || finToday(), FIN3_FREQ[x.freq || 'Mensal']) } : x);
    persist(next);
    window.vtToast('Assinatura renovada — receita lançada no Financeiro.', 'ok');
  };
  const cancelar = (a) => {
    if (!window.confirm('Cancelar a assinatura "' + a.plano + '" de ' + a.patient + '?')) return;
    persist(list.map((x) => x.id === a.id ? { ...x, status: 'Cancelada' } : x));
    window.vtToast('Assinatura cancelada.', 'ok');
  };
  const del = (a) => { if (!window.confirm('Excluir definitivamente esta assinatura?')) return; persist(list.filter((x) => x.id !== a.id)); };
  const saveAss = (a) => {
    const exists = a.id && list.some((x) => x.id === a.id);
    persist(exists ? list.map((x) => x.id === a.id ? a : x) : [{ ...a, id: 'AS' + Date.now().toString(36) }, ...list]);
    setModal(null); window.vtToast('Assinatura salva.', 'ok');
  };
  const grid = '1.4fr 1.3fr 0.9fr 1fr 1fr 0.9fr 1.4fr';
  return (
    <div>
      <div className="fin-row3" style={{ marginBottom: 16 }}>
        <div className="fin-kpi"><div className="lbl">Assinaturas ativas</div><div className="val up">{ativas.length}</div></div>
        <div className="fin-kpi"><div className="lbl">Receita recorrente (MRR)</div><div className="val">{finBRL(mrr)}</div><div className="sub">equivalente mensal</div></div>
        <div className="fin-kpi"><div className="lbl">Vencidas</div><div className="val" style={{ color: vencidas ? 'var(--red)' : 'var(--ink)' }}>{vencidas}</div></div>
      </div>
      <div className="fin-toolbar">
        <span className="vt-muted" style={{ fontSize: 13 }}>{list.length} plano(s) cadastrado(s)</span>
        <button className="vt-btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setModal({ plano: '', patient: '', value: '', freq: 'Mensal', start: finToday() })}><VtIcon name="plus" size={16} /> Nova Assinatura</button>
      </div>
      <div className="vt-card vt-table-card">
        <div className="vt-table">
          <div className="vt-tr vt-th" style={{ gridTemplateColumns: grid }}><span>Plano</span><span>Paciente / Animal</span><span>Valor</span><span>Frequência</span><span>Próx. cobrança</span><span>Status</span><span></span></div>
          {list.map((a) => { const st = fin3AssStatus(a); return (
            <div key={a.id} className="vt-tr" style={{ gridTemplateColumns: grid, alignItems: 'center' }}>
              <span><b style={{ fontWeight: 700 }}>{a.plano}</b></span>
              <span>{a.patient || '—'}</span>
              <span style={{ fontWeight: 700 }}>{finBRL(Number(a.value) || 0)}</span>
              <span className="vt-muted">{a.freq}</span>
              <span className="vt-muted">{fmtBR(a.proxCobranca) || '—'}</span>
              <span>{fin3AssBadge(st)}</span>
              <span className="vt-row-actions" style={{ gap: 4 }}>
                {st !== 'Cancelada' && <button className="vt-link" onClick={() => renovar(a)} title="Renovar e lançar cobrança">Renovar</button>}
                {st !== 'Cancelada' && <button className="vt-link" style={{ color: 'var(--red)' }} onClick={() => cancelar(a)}>Cancelar</button>}
                <button className="vt-link" onClick={() => setModal(a)}>Editar</button>
                <button className="pr-del-btn" onClick={() => del(a)}>✕</button>
              </span>
            </div>
          ); })}
          {list.length === 0 && <div className="vt-empty-row">Nenhuma assinatura. Clique em "Nova Assinatura" para criar um plano recorrente.</div>}
        </div>
      </div>
      {modal && <AssinaturaModal data={modal} onClose={() => setModal(null)} onSave={saveAss} />}
    </div>
  );
}

function AssinaturaModal({ data, onClose, onSave }) {
  const patients = ((window.VtStore && window.VtStore.getData()) || {}).patients || [];
  const [f, setF] = vtUseState({ ...data, value: data.value != null && data.value !== '' ? (typeof data.value === 'number' ? window.maskMoney(data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : data.value) : '' });
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const submit = () => {
    if (!f.plano || !f.plano.trim()) { window.vtToast('Informe o nome do plano.', 'err'); return; }
    if (!f.patient || !f.patient.trim()) { window.vtToast('Selecione o paciente.', 'err'); return; }
    const value = finParseMoney(String(f.value));
    if (!value) { window.vtToast('Informe o valor.', 'err'); return; }
    const start = f.start || finToday();
    const prox = f.id ? (f.proxCobranca || fin3AddMonths(start, FIN3_FREQ[f.freq])) : fin3AddMonths(start, FIN3_FREQ[f.freq]);
    onSave({ id: f.id, plano: f.plano.trim(), patient: f.patient.trim(), value, freq: f.freq || 'Mensal', start, proxCobranca: prox, status: f.status || 'Ativa' });
  };
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
        <h3>{f.id ? 'Editar assinatura' : 'Nova assinatura'}</h3>
        <div className="vt-form-row">
          <VtField label="Nome do plano" value={f.plano} onChange={s('plano')} placeholder="Ex.: Plano Dental Premium" width="100%" />
        </div>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '100%' }}><span className="vtf-label">Paciente / Animal</span><span className="vtf-inputwrap"><input className="vtf-input" list="ass-pacientes" value={f.patient || ''} onChange={(e) => s('patient')(e.target.value)} placeholder="Buscar paciente..." /></span></label>
          <datalist id="ass-pacientes">{patients.map((p) => <option key={p.id} value={p.name}>{[p.species, p.owner].filter(Boolean).join(' · ')}</option>)}</datalist>
        </div>
        <div className="vt-form-row">
          <VtField label="Valor (R$)" value={f.value} onChange={(v) => s('value')(window.maskMoney(v))} placeholder="R$ 0,00" width="32%" />
          <label className="vtf" style={{ width: '32%' }}><span className="vtf-label">Frequência</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.freq} onChange={(e) => s('freq')(e.target.value)}>{Object.keys(FIN3_FREQ).map((k) => <option key={k}>{k}</option>)}</select></span></label>
          <label className="vtf" style={{ width: '32%' }}><span className="vtf-label">Data de início</span><span className="vtf-inputwrap"><input type="date" className="vtf-input" value={f.start || ''} onChange={(e) => s('start')(e.target.value)} /></span></label>
        </div>
        <p className="vt-muted" style={{ fontSize: 12.5, margin: '2px 2px 0' }}>Próxima cobrança: <b>{fmtBR(fin3AddMonths(f.start || finToday(), FIN3_FREQ[f.freq || 'Mensal']))}</b></p>
        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={submit}>Salvar assinatura</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   B2 — Projeções
   ============================================================ */
function ProjecoesTab({ fin, save }) {
  const now = new Date();
  const store = (window.VtStore && window.VtStore.getData()) || {};
  const atend = store.atendimentos || [];
  const agenda = store.agendaAppts || [];
  const receitas = (fin.tx || []).filter((t) => t.kind === 'receita' && t.status !== 'cancelado');
  const pagas = receitas.filter((t) => t.status === 'pago');
  const inMonth = (iso, dt) => { if (!iso) return false; const d = new Date(iso + 'T00:00:00'); return d.getMonth() === dt.getMonth() && d.getFullYear() === dt.getFullYear(); };

  // --- KPIs ---
  const recMes = pagas.filter((t) => inMonth(t.paidAt || t.date, now));
  const ticketMedio = recMes.length ? recMes.reduce((s, t) => s + t.value, 0) / recMes.length : 0;
  const procMap = {};
  pagas.forEach((t) => { const n = fin3ProcName(t); procMap[n] = (procMap[n] || 0) + t.value; });
  const topProc = Object.entries(procMap).sort((a, b) => b[1] - a[1])[0];
  const isCancel = (s) => s === 'arquivado' || s === 'cancelado';
  const isAgend = (s) => ['agendado', 'confirmado', 'aguardando', 'em_andamento'].includes(s);
  const realizadosCount = atend.filter((a) => !isCancel(a.status) && !isAgend(a.status)).length;
  const agPend = agenda.filter((a) => a.status !== 'Cancelado' && a.status !== 'Realizado').length + atend.filter((a) => isAgend(a.status)).length;
  const totalAg = realizadosCount + agPend;
  const conversao = totalAg ? (realizadosCount / totalAg) * 100 : 0;

  // --- Projeção 30/60/90 dias (agendamentos futuros × ticket médio) ---
  const todayISO = finToday();
  const aheadCount = (dias) => {
    const limit = new Date(); limit.setDate(limit.getDate() + dias);
    const limISO = limit.toISOString().slice(0, 10);
    return agenda.filter((a) => a.status !== 'Cancelado' && (a.date || '') >= todayISO && (a.date || '') <= limISO).length;
  };
  const tk = ticketMedio || 250;
  const projs = [[30, aheadCount(30)], [60, aheadCount(60)], [90, aheadCount(90)]];

  // --- Meta mensal ---
  const meta = fin.metaMes || 20000;
  const realizadoMes = recMes.reduce((s, t) => s + t.value, 0);
  const metaPct = Math.min(100, meta ? (realizadoMes / meta) * 100 : 0);
  const editMeta = () => { const v = window.prompt('Meta de receita do mês (R$):', String(meta)); if (v == null) return; const n = finParseMoney(v) || Number(String(v).replace(/[^\d]/g, '')) || 0; if (n > 0 && save) save({ ...fin, metaMes: n }); };

  // --- Gráfico: 6 meses realizados + 1 projetado ---
  const months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ d, label: MES[d.getMonth()], value: pagas.filter((t) => inMonth(t.paidAt || t.date, d)).reduce((s, t) => s + t.value, 0), proj: false }); }
  const projNextMonth = aheadCount(30) * tk;
  const nd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  months.push({ d: nd, label: MES[nd.getMonth()], value: projNextMonth, proj: true });
  const maxV = Math.max(1, ...months.map((m) => m.value));

  // dimensões SVG
  const W = 720, H = 240, padL = 48, padB = 30, padT = 14;
  const innerW = W - padL - 12, innerH = H - padB - padT;
  const bw = innerW / months.length;

  return (
    <div>
      <div className="fin-row3" style={{ marginBottom: 16 }}>
        <div className="fin-kpi"><div className="lbl">Ticket médio (mês)</div><div className="val">{finBRL(ticketMedio)}</div><div className="sub">{recMes.length} receita(s)</div></div>
        <div className="fin-kpi"><div className="lbl">Procedimento mais rentável</div><div className="val" style={{ fontSize: 19 }}>{topProc ? topProc[0] : '—'}</div><div className="sub">{topProc ? finBRL(topProc[1]) : 'sem dados'}</div></div>
        <div className="fin-kpi"><div className="lbl">Taxa de conversão</div><div className="val up">{conversao.toFixed(0)}%</div><div className="sub">{realizadosCount} de {totalAg} agendados</div></div>
      </div>

      <div className="vt-card vt-sec fin-prem" style={{ marginBottom: 16 }}>
        <h3 className="vt-sec-title">Projeção de receita</h3>
        <p className="vt-muted" style={{ fontSize: 12.5, margin: '0 0 12px' }}>Baseada nos agendamentos futuros × ticket médio ({finBRL(tk)}).</p>
        <div className="fin-row3">
          {projs.map(([dias, n]) => (
            <div key={dias} className="fin-ov-card neutral">
              <span className="fin-ov-ic" style={{ background: 'var(--teal-t)', color: 'var(--teal-d)' }}><VtIcon name="chart" size={20} /></span>
              <div className="fin-ov-l">Próximos {dias} dias</div>
              <div className="fin-ov-v up">{finBRL(n * tk)}</div>
              <div className="vt-muted" style={{ fontSize: 12, marginTop: 2 }}>{n} agendamento(s)</div>
            </div>
          ))}
        </div>
      </div>

      <div className="vt-card vt-sec fin-prem" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h3 className="vt-sec-title" style={{ marginBottom: 4 }}>Receita — últimos 6 meses + projeção</h3>
          <span style={{ display: 'inline-flex', gap: 14, fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--teal)', display: 'inline-block' }} /> Realizado</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, border: '2px dashed #2f6fed', display: 'inline-block' }} /> Projetado</span>
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', marginTop: 8 }} preserveAspectRatio="xMidYMid meet">
          {[0, 0.5, 1].map((g) => { const y = padT + innerH - innerH * g; return (
            <g key={g}>
              <line x1={padL} y1={y} x2={W - 12} y2={y} stroke="var(--line)" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--faint)">{Math.round((maxV * g) / 100) / 10}k</text>
            </g>
          ); })}
          {months.map((m, i) => {
            const h = (m.value / maxV) * innerH;
            const x = padL + i * bw + bw * 0.18;
            const w = bw * 0.64;
            const y = padT + innerH - h;
            return (
              <g key={i}>
                {m.proj
                  ? <rect x={x} y={y} width={w} height={h} rx="4" fill="#2f6fed" fillOpacity="0.12" stroke="#2f6fed" strokeWidth="2" strokeDasharray="5 3" />
                  : <rect x={x} y={y} width={w} height={h} rx="4" fill="var(--teal)" />}
                <text x={x + w / 2} y={H - padB + 18} textAnchor="middle" fontSize="11" fontWeight="700" fill={m.proj ? '#2f6fed' : 'var(--muted)'}>{m.label}</text>
                {m.value > 0 && <text x={x + w / 2} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill={m.proj ? '#2f6fed' : 'var(--teal-d)'}>{(m.value / 1000).toFixed(1)}k</text>}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="vt-card fin-prem fin-meta">
        <div className="fin-meta-head">
          <div className="fin-meta-title">Meta do mês · {FIN3_MES_LONG[now.getMonth()]}</div>
          <button className="fin-meta-edit" onClick={editMeta}><VtIcon name="pen" size={14} /> Editar meta</button>
        </div>
        <div className="fin-meta-bar"><div className="fin-meta-fill" style={{ width: metaPct + '%' }} /></div>
        <div className="fin-meta-foot">
          <span className="vt-muted">{finBRL(realizadoMes)} de {finBRL(meta)}</span>
          <b style={{ color: metaPct >= 100 ? 'var(--green)' : 'var(--teal-d)' }}>{metaPct.toFixed(0)}%{metaPct >= 100 ? ' · meta batida 🎉' : ''}</b>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   B3 — IA Financeira
   ============================================================ */
function IAFinanceiraTab({ fin }) {
  const [insights, setInsights] = vtUseState(null);
  const [analisadoEm, setAnalisadoEm] = vtUseState('');

  const analisar = () => {
    const now = new Date();
    const store = (window.VtStore && window.VtStore.getData()) || {};
    const agenda = store.agendaAppts || [];
    const receitas = (fin.tx || []).filter((t) => t.kind === 'receita' && t.status !== 'cancelado');
    const pagas = receitas.filter((t) => t.status === 'pago');
    const monthOf = (iso) => { const d = new Date((iso || finToday()) + 'T00:00:00'); return d.getMonth() + '-' + d.getFullYear(); };
    const curKey = now.getMonth() + '-' + now.getFullYear();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = prev.getMonth() + '-' + prev.getFullYear();
    const recCur = pagas.filter((t) => monthOf(t.paidAt || t.date) === curKey);
    const recPrev = pagas.filter((t) => monthOf(t.paidAt || t.date) === prevKey);
    const totCur = recCur.reduce((s, t) => s + t.value, 0);
    const totPrev = recPrev.reduce((s, t) => s + t.value, 0);
    const variacao = totPrev ? ((totCur - totPrev) / totPrev) * 100 : (totCur ? 100 : 0);

    // top procedimento por receita (mês atual)
    const pm = {};
    recCur.forEach((t) => { const n = fin3ProcName(t); pm[n] = (pm[n] || 0) + t.value; });
    const top = Object.entries(pm).sort((a, b) => b[1] - a[1])[0];

    // horário mais produtivo (agendamentos do mês, por hora)
    const inMonth = (iso) => monthOf(iso) === curKey;
    const horas = {};
    agenda.filter((a) => inMonth(a.date) && a.status !== 'Cancelado').forEach((a) => { const h = Math.floor(Number(a.start) || 0); horas[h] = (horas[h] || 0) + 1; });
    const topHora = Object.entries(horas).sort((a, b) => b[1] - a[1])[0];

    // taxa de cancelamento (mês)
    const apMes = agenda.filter((a) => inMonth(a.date));
    const cancelMes = apMes.filter((a) => a.status === 'Cancelado').length;
    const taxaCancel = apMes.length ? (cancelMes / apMes.length) * 100 : 0;

    // ticket médio + sugestão de ticket ideal (p/ atingir a meta com o volume atual)
    const ticket = recCur.length ? totCur / recCur.length : 0;
    const meta = fin.metaMes || 20000;
    const idealTicket = recCur.length ? meta / recCur.length : ticket * 1.2;

    const fmtPct = (n) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
    const cards = [
      { icon: variacao >= 0 ? '📈' : '📉', tone: variacao >= 0 ? 'up' : 'down', title: 'Receita vs. mês anterior', value: fmtPct(variacao), desc: `${finBRL(totCur)} este mês · ${finBRL(totPrev)} no mês anterior.` },
      { icon: '🏆', tone: 'neutral', title: 'Top procedimento por receita', value: top ? top[0] : '—', desc: top ? `Gerou ${finBRL(top[1])} no mês.` : 'Sem receitas registradas no mês.' },
      { icon: '⏰', tone: 'neutral', title: 'Horário mais produtivo', value: topHora ? `${String(topHora[0]).padStart(2, '0')}:00` : '—', desc: topHora ? `${topHora[1]} atendimento(s) concentrados neste horário.` : 'Sem agendamentos no mês.' },
      { icon: taxaCancel > 20 ? '🚨' : '✅', tone: taxaCancel > 20 ? 'down' : 'up', title: 'Taxa de cancelamento', value: taxaCancel.toFixed(0) + '%', desc: taxaCancel > 20 ? `Acima do recomendado (20%). Reforce confirmações com os tutores.` : `Dentro do esperado (${cancelMes} de ${apMes.length} agendamentos).` },
      { icon: '💡', tone: 'neutral', title: 'Ticket médio ideal', value: finBRL(idealTicket), desc: `Atual ${finBRL(ticket)}. Para alcançar a meta de ${finBRL(meta)} com o volume atual.` },
    ];
    setInsights(cards);
    setAnalisadoEm(now.toLocaleString('pt-BR'));
    window.vtToast('Análise concluída.', 'ok');
  };

  /* auto-análise na primeira renderização — analisar definido acima */
  vtUseEffect(() => { analisar(); }, []);

  const exportar = () => {
    if (!insights) return;
    const linhas = ['===== RELATÓRIO IA FINANCEIRA — VetTooth Pro =====', 'Gerado em: ' + analisadoEm, ''];
    insights.forEach((c) => { linhas.push(c.title + ': ' + c.value, '  ' + c.desc, ''); });
    const txt = linhas.join('\n');
    const done = () => window.vtToast('Relatório copiado para a área de transferência.', 'ok');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(() => { window.prompt('Copie o relatório:', txt); });
    else window.prompt('Copie o relatório:', txt);
  };

  const toneColor = { up: ['var(--green)', 'var(--green-t)'], down: ['var(--red)', 'var(--red-t)'], neutral: ['var(--teal-d)', 'var(--teal-t)'] };

  return (
    <div>
      <div className="fin-toolbar">
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>IA Financeira</h3>
          <p className="vt-muted" style={{ margin: '2px 0 0', fontSize: 13 }}>Análise automática do desempenho financeiro do mês corrente.{analisadoEm ? ' · Última análise: ' + analisadoEm : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {insights && <button className="vt-btn-ghost" onClick={exportar}>📋 Exportar Relatório</button>}
          <button className="vt-btn-primary" onClick={analisar}>🤖 Analisar Mês Atual</button>
        </div>
      </div>

      {!insights ? (
        <div className="vt-card fin-prem fin-placeholder">
          <div className="vt-placeholder-ic" style={{ margin: '0 auto 16px' }}><VtIcon name="chart" size={28} /></div>
          <h2 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px' }}>Insights inteligentes do mês</h2>
          <p className="vt-muted" style={{ maxWidth: 460, margin: '0 auto', fontSize: 14, lineHeight: 1.55 }}>Clique em <b>🤖 Analisar Mês Atual</b> para gerar insights de receita, procedimentos, horários de pico, cancelamentos e ticket médio ideal.</p>
        </div>
      ) : (
        <div className="fin-ia-grid">
          {insights.map((c, i) => { const [cc, bg] = toneColor[c.tone] || toneColor.neutral; return (
            <div key={i} className="vt-card fin-prem fin-ia-card">
              <span className="fin-ia-ic" style={{ background: bg }}>{c.icon}</span>
              <div className="fin-ia-body">
                <div className="fin-ia-title">{c.title}</div>
                <div className="fin-ia-value" style={{ color: cc }}>{c.value}</div>
                <div className="fin-ia-desc">{c.desc}</div>
              </div>
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { AssinaturasTab, AssinaturaModal, ProjecoesTab, IAFinanceiraTab });
