/* ============================================================
   VetTooth Pro — Financeiro completo
   Caixa · A Receber · Receita · Custos · Relatórios
   Persistência por usuário via VtStore.
   ============================================================ */
const FIN_METHODS = [
  { id: 'dinheiro', label: 'Dinheiro', icon: '💵', bg: 'var(--green-t)' },
  { id: 'cartao', label: 'Cartão', icon: '💳', bg: '#e6edf4' },
  { id: 'pix', label: 'PIX', icon: '⚡', bg: 'var(--teal-t)' },
  { id: 'boleto', label: 'Boleto', icon: '🧾', bg: 'var(--amber-t)' },
];
const FIN_REV_CATS = ['Consulta', 'Procedimento', 'Exame', 'Odontograma', 'Venda', 'Cirurgia'];
const FIN_COST_CATS = ['Insumos', 'Folha de pagamento', 'Aluguel', 'Luz', 'Água', 'Imposto', 'Manutenção', 'Outros'];
const MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/* ---- formas de pagamento + taxas (maquininha) + split de terceirizados ---- */
window.VT_PAY_DEFAULT = {
  methods: [
    { id: 'dinheiro', label: 'Dinheiro', icon: '💵', fee: 0 },
    { id: 'pix', label: 'PIX', icon: '⚡', fee: 0 },
    { id: 'debito', label: 'Cartão de débito', icon: '💳', fee: 1.5 },
    { id: 'credito', label: 'Cartão de crédito', icon: '💳', fee: 3.2 },
    { id: 'credito_parc', label: 'Crédito parcelado', icon: '💳', fee: 5.5 },
    { id: 'boleto', label: 'Boleto', icon: '🧾', fee: 0 },
  ],
  splits: [],
};
window.vtPayCfg = function () { const d = window.VtStore && window.VtStore.getData(); const c = (d && d.payCfg) || {}; return { methods: c.methods || window.VT_PAY_DEFAULT.methods, splits: c.splits || window.VT_PAY_DEFAULT.splits }; };
window.vtSavePayCfg = function (c) { if (window.VtStore) window.VtStore.setData({ payCfg: c }); };
window.vtPayMethod = function (id) { return window.vtPayCfg().methods.find((m) => m.id === id); };

const finToday = () => new Date().toISOString().slice(0, 10);
const finBRL = (n) => window.vtMoney(n);
function finUID() { return 'T' + Date.now().toString(36) + Math.floor(Math.random() * 1000); }
function finDaysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function finParseMoney(v) { return Number((v || '').toString().replace(/[^\d,]/g, '').replace(',', '.')) || 0; }

function finSeed() {
  return {
    caixa: { open: false, openedAt: null, float: 0 },
    tx: [
      { id: finUID(), kind: 'receita', desc: 'Profilaxia — Luna', cat: 'Procedimento', value: 350, date: finToday(), status: 'pago', method: 'pix', paidAt: finToday() },
      { id: finUID(), kind: 'receita', desc: 'Consulta — Fred', cat: 'Consulta', value: 180, date: finToday(), status: 'pago', method: 'dinheiro', paidAt: finToday() },
      { id: finUID(), kind: 'receita', desc: 'Extração — Thor', cat: 'Cirurgia', value: 620, date: finToday(), status: 'pago', method: 'cartao', paidAt: finToday() },
      { id: finUID(), kind: 'receita', desc: 'Odontograma — Bella', cat: 'Odontograma', value: 250, date: finToday(), status: 'pendente', method: null, paidAt: null },
      { id: finUID(), kind: 'receita', desc: 'Cirurgia — Max', cat: 'Cirurgia', value: 800, date: finToday(), status: 'pendente', method: null, paidAt: null },
      { id: finUID(), kind: 'receita', desc: 'Venda ração dental', cat: 'Venda', value: 95, date: finDaysAgo(3), status: 'pago', method: 'dinheiro', paidAt: finDaysAgo(3) },
      { id: finUID(), kind: 'receita', desc: 'Exame radiográfico', cat: 'Exame', value: 220, date: finDaysAgo(5), status: 'pago', method: 'pix', paidAt: finDaysAgo(5) },
      { id: finUID(), kind: 'receita', desc: 'Procedimento — Rex', cat: 'Procedimento', value: 480, date: finDaysAgo(20), status: 'pago', method: 'cartao', paidAt: finDaysAgo(20) },
      { id: finUID(), kind: 'receita', desc: 'Consultas (mês anterior)', cat: 'Consulta', value: 3200, date: finDaysAgo(45), status: 'pago', method: 'cartao', paidAt: finDaysAgo(45) },
      { id: finUID(), kind: 'receita', desc: 'Procedimentos (trimestre)', cat: 'Procedimento', value: 5400, date: finDaysAgo(80), status: 'pago', method: 'pix', paidAt: finDaysAgo(80) },
      { id: finUID(), kind: 'custo', desc: 'Reposição de brocas', cat: 'Insumos', value: 280, date: finToday(), status: 'pago', method: 'pix', paidAt: finToday() },
      { id: finUID(), kind: 'custo', desc: 'Conta de luz', cat: 'Luz', value: 640, date: finDaysAgo(2), status: 'pago', method: 'boleto', paidAt: finDaysAgo(2) },
      { id: finUID(), kind: 'custo', desc: 'Água', cat: 'Água', value: 180, date: finDaysAgo(2), status: 'pago', method: 'boleto', paidAt: finDaysAgo(2) },
      { id: finUID(), kind: 'custo', desc: 'Aluguel da clínica', cat: 'Aluguel', value: 4200, date: finDaysAgo(7), status: 'pago', method: 'boleto', paidAt: finDaysAgo(7) },
      { id: finUID(), kind: 'custo', desc: 'Folha de pagamento', cat: 'Folha de pagamento', value: 9800, date: finDaysAgo(7), status: 'pago', method: 'cartao', paidAt: finDaysAgo(7) },
      { id: finUID(), kind: 'custo', desc: 'Anestésicos', cat: 'Insumos', value: 310, date: finDaysAgo(4), status: 'pago', method: 'pix', paidAt: finDaysAgo(4) },
      { id: finUID(), kind: 'custo', desc: 'Manutenção autoclave', cat: 'Manutenção', value: 450, date: finDaysAgo(30), status: 'pendente', method: null, paidAt: null },
      { id: finUID(), kind: 'custo', desc: 'Imposto (DAS)', cat: 'Imposto', value: 1200, date: finDaysAgo(50), status: 'pago', method: 'boleto', paidAt: finDaysAgo(50) },
    ],
  };
}

function useFin() {
  const [fin, setFin] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.fin) || finSeed();
  });
  const save = (next) => { setFin(next); if (window.VtStore) window.VtStore.setData({ fin: next }); };
  return [fin, save];
}

/* períodos */
function inPeriod(dateStr, period) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (period === 'dia') return dateStr === finToday();
  if (period === 'semana') { const diff = (now - d) / 864e5; return diff >= 0 && diff < 7; }
  if (period === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (period === 'ano') return d.getFullYear() === now.getFullYear();
  return true;
}

function PeriodPicker({ value, onChange }) {
  return (
    <div className="fin-period">
      {[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano']].map(([id, l]) => (
        <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{l}</button>
      ))}
    </div>
  );
}

/* ---------------- Caixa ---------------- */
function CaixaTab({ fin, save }) {
  const todayPaid = fin.tx.filter((t) => t.kind === 'receita' && t.status === 'pago' && t.paidAt === finToday());
  const byMethod = (m) => todayPaid.filter((t) => t.method === m).reduce((s, t) => s + t.value, 0);
  const total = todayPaid.reduce((s, t) => s + t.value, 0);
  const toggleCaixa = () => {
    if (fin.caixa.open) save({ ...fin, caixa: { ...fin.caixa, open: false, closedAt: finToday() } });
    else save({ ...fin, caixa: { open: true, openedAt: finToday(), float: fin.caixa.float || 0 } });
  };
  return (
    <div>
      <div className="fin-caixa-head">
        <span className="fin-caixa-status">
          <span className={`pulse ${fin.caixa.open ? 'on' : 'off'}`} />
          Caixa {fin.caixa.open ? 'aberto' : 'fechado'}
          {fin.caixa.open && fin.caixa.openedAt === finToday() && <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 13 }}>· hoje</span>}
        </span>
        <button className={fin.caixa.open ? 'vt-btn-ghost' : 'vt-btn-primary'} onClick={toggleCaixa}>
          {fin.caixa.open ? 'Fechar caixa' : 'Abrir caixa'}
        </button>
      </div>
      <div className="fin-method-grid">
        {FIN_METHODS.slice(0, 3).map((m) => (
          <div key={m.id} className="fin-method">
            <span className="fin-method-ic" style={{ background: m.bg }}>{m.icon}</span>
            <div><div className="m-lbl">{m.label} hoje</div><div className="m-val">{finBRL(byMethod(m.id))}</div></div>
          </div>
        ))}
      </div>
      <div className="vt-card vt-sec">
        <div className="fin-toolbar">
          <h3 className="vt-sec-title" style={{ margin: 0 }}>Recebido hoje · {finBRL(total)}</h3>
          <span className="vt-muted" style={{ fontSize: 13 }}>{todayPaid.length} lançamento(s) · zera automaticamente à meia-noite</span>
        </div>
        <div className="fin-list">
          {todayPaid.length === 0 && <p className="vt-empty" style={{ padding: '14px 0' }}>Nenhum recebimento hoje ainda.</p>}
          {todayPaid.map((t) => {
            const m = FIN_METHODS.find((x) => x.id === t.method);
            return (
              <div key={t.id} className="fin-item">
                <span className="desc"><b>{t.desc}</b><i>{t.cat}</i></span>
                <span />
                <span className={`fin-tagm ${t.method}`}>{m ? m.label : '—'}</span>
                <span className="fin-amt up">{finBRL(t.value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- A Receber ---------------- */
function ReceberTab({ fin, save }) {
  const [modal, setModal] = vtUseState(null);
  const [paidDate, setPaidDate] = vtUseState(finToday());
  const pend = fin.tx.filter((t) => t.kind === 'receita' && t.status === 'pendente');
  const total = pend.reduce((s, t) => s + t.value, 0);
  const openModal = (t) => { setPaidDate(finToday()); setModal(t); };
  const darBaixa = (id, method) => {
    const tx = fin.tx.find((t) => t.id === id);
    const dataPg = paidDate || finToday();
    const m = window.vtPayMethod(method);
    const feeN = m ? (parseFloat(String(m.fee).replace(',', '.')) || 0) : 0;
    const extra = [];
    if (tx && feeN > 0) {
      const taxa = +(tx.value * feeN / 100).toFixed(2);
      extra.push({ id: finUID(), kind: 'custo', desc: `Taxa ${m.label} (${feeN}%) — ${tx.desc}`, cat: 'Taxas de cartão', value: taxa, date: dataPg, status: 'pago', method, paidAt: dataPg });
    }
    (window.vtPayCfg().splits || []).forEach((sp) => {
      const pctN = parseFloat(String(sp.pct).replace(',', '.')) || 0;
      if (tx && pctN > 0) {
        const val = +(tx.value * pctN / 100).toFixed(2);
        extra.push({ id: finUID(), kind: 'custo', desc: `Split ${sp.nome} (${pctN}%) — ${tx.desc}`, cat: 'Split terceirizados', value: val, date: dataPg, status: 'pago', method, paidAt: dataPg });
      }
    });
    save({ ...fin, tx: [...extra, ...fin.tx.map((t) => t.id === id ? { ...t, status: 'pago', method, paidAt: dataPg } : t)] });
    setModal(null);
    if (extra.length) window.vtToast('Baixa registrada · taxas lançadas como custo.', 'ok');
    else window.vtToast('Baixa registrada.', 'ok');
  };
  return (
    <div>
      <div className="fin-row3">
        <div className="fin-kpi"><div className="lbl">Total a receber</div><div className="val down">{finBRL(total)}</div><div className="sub">{pend.length} pendência(s)</div></div>
        <div className="fin-kpi"><div className="lbl">Recebido hoje</div><div className="val up">{finBRL(fin.tx.filter((t) => t.status === 'pago' && t.paidAt === finToday() && t.kind === 'receita').reduce((s, t) => s + t.value, 0))}</div></div>
        <div className="fin-kpi"><div className="lbl">Caixa</div><div className="val">{fin.caixa.open ? 'Aberto' : 'Fechado'}</div></div>
      </div>
      <div className="vt-card vt-sec">
        <h3 className="vt-sec-title">Contas a receber</h3>
        <div className="fin-list">
          {pend.length === 0 && <p className="vt-empty" style={{ padding: '14px 0' }}>Nenhuma conta pendente. 🎉</p>}
          {pend.map((t) => (
            <div key={t.id} className="fin-item">
              <span className="desc"><b>{t.desc}</b><i>{t.cat} · lançado {fmtBR(t.date)}</i></span>
              <span className="fin-tagm pend">Pendente</span>
              <span className="fin-amt down">{finBRL(t.value)}</span>
              <button className="fin-baixa" onClick={() => openModal(t)}>Dar baixa</button>
            </div>
          ))}
        </div>
      </div>
      {modal && (
        <div className="fin-modal-bg" onClick={() => setModal(null)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Dar baixa · {finBRL(modal.value)}</h3>
            <p>{modal.desc}</p>
            <label className="vtf" style={{ width: '100%', marginBottom: 14 }}>
              <span className="vtf-label">Data do pagamento</span>
              <span className="vtf-inputwrap"><input className="vtf-input" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} /></span>
            </label>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>Escolha a forma de pagamento recebida:</p>
            <div className="fin-method-pick">
              {window.vtPayCfg().methods.map((m) => (
                <button key={m.id} className="fin-method-opt" onClick={() => darBaixa(modal.id, m.id)}>
                  <span style={{ fontSize: 20 }}>{m.icon}</span> {m.label}{m.fee > 0 ? <i style={{ fontStyle: 'normal', color: 'var(--faint)', fontSize: 11, display: 'block' }}>taxa {m.fee}%</i> : null}
                </button>
              ))}
            </div>
            <div className="fin-modal-actions"><button className="vt-btn-ghost" onClick={() => setModal(null)}>Cancelar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
function fmtBR(iso) { if (!iso) return ''; if (window.vtFormatDate) return window.vtFormatDate(iso); const m = (iso || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; }

/* ---------------- Receita ---------------- */
function ReceitaTab({ fin, save }) {
  const [period, setPeriod] = vtUseState('mes');
  const [form, setForm] = vtUseState({ cat: FIN_REV_CATS[0] });
  const list = fin.tx.filter((t) => t.kind === 'receita' && t.status === 'pago' && inPeriod(t.paidAt || t.date, period));
  const total = list.reduce((s, t) => s + t.value, 0);
  const add = () => {
    if (!form.desc || !form.value) return;
    const tx = { id: finUID(), kind: 'receita', desc: form.desc, cat: form.cat, value: finParseMoney(form.value), date: finToday(), status: 'pago', method: form.method || 'dinheiro', paidAt: finToday() };
    save({ ...fin, tx: [tx, ...fin.tx] }); setForm({ cat: FIN_REV_CATS[0] });
  };
  const del = (id) => save({ ...fin, tx: fin.tx.filter((t) => t.id !== id) });
  return (
    <div>
      <div className="fin-toolbar"><h3 className="vt-sec-title" style={{ margin: 0 }}>Receita · {finBRL(total)} <span style={{ fontWeight: 500, color: 'var(--muted)', fontSize: 14 }}>({list.length} no período)</span></h3><PeriodPicker value={period} onChange={setPeriod} /></div>
      <div className="fin-addbar">
        <label className="vtf"><span className="vtf-label">Descrição</span><input className="vtf-input" value={form.desc || ''} placeholder="Ex.: Consulta — Luna" onChange={(e) => setForm({ ...form, desc: e.target.value })} /></label>
        <label className="vtf"><span className="vtf-label">Categoria</span><select className="vtf-input" value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>{FIN_REV_CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="vtf"><span className="vtf-label">Forma</span><select className="vtf-input" value={form.method || 'dinheiro'} onChange={(e) => setForm({ ...form, method: e.target.value })}>{FIN_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
        <label className="vtf"><span className="vtf-label">Valor</span><input className="vtf-input" value={form.value || ''} placeholder="R$ 0,00" onChange={(e) => setForm({ ...form, value: window.maskMoney(e.target.value) })} /></label>
        <button className="fin-add-btn" onClick={add}>+ Entrada</button>
      </div>
      <div className="vt-card vt-sec">
        <div className="fin-list">
          {list.length === 0 && <p className="vt-empty" style={{ padding: '14px 0' }}>Sem receitas neste período.</p>}
          {list.map((t) => {
            const m = FIN_METHODS.find((x) => x.id === t.method);
            return (
              <div key={t.id} className="fin-item">
                <span className="desc"><b>{t.desc}</b><i>{t.cat} · {fmtBR(t.paidAt || t.date)}</i></span>
                <span className={`fin-tagm ${t.method}`}>{m ? m.label : '—'}</span>
                <span className="fin-amt up">{finBRL(t.value)}</span>
                <button className="fin-del" onClick={() => del(t.id)} title="Excluir">×</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Custos ---------------- */
function CustosTab({ fin, save }) {
  const [period, setPeriod] = vtUseState('mes');
  const [form, setForm] = vtUseState({ cat: FIN_COST_CATS[0] });
  const list = fin.tx.filter((t) => t.kind === 'custo' && inPeriod(t.date, period));
  const total = list.reduce((s, t) => s + t.value, 0);
  const periodDays = { dia: 1, semana: 7, mes: 30, ano: 365 }[period];
  const media = total / periodDays;
  const add = () => {
    if (!form.desc || !form.value) return;
    const tx = { id: finUID(), kind: 'custo', desc: form.desc, cat: form.cat, value: finParseMoney(form.value), date: finToday(), status: 'pago', method: form.method || 'boleto', paidAt: finToday() };
    save({ ...fin, tx: [tx, ...fin.tx] }); setForm({ cat: FIN_COST_CATS[0] });
  };
  const del = (id) => save({ ...fin, tx: fin.tx.filter((t) => t.id !== id) });
  return (
    <div>
      <div className="fin-toolbar"><h3 className="vt-sec-title" style={{ margin: 0 }}>Custos · {finBRL(total)} <span style={{ fontWeight: 500, color: 'var(--muted)', fontSize: 14 }}>· média {finBRL(media)}/dia</span></h3><PeriodPicker value={period} onChange={setPeriod} /></div>
      <div className="fin-addbar">
        <label className="vtf"><span className="vtf-label">Descrição</span><input className="vtf-input" value={form.desc || ''} placeholder="Ex.: Conta de luz" onChange={(e) => setForm({ ...form, desc: e.target.value })} /></label>
        <label className="vtf"><span className="vtf-label">Categoria</span><select className="vtf-input" value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>{FIN_COST_CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="vtf"><span className="vtf-label">Forma</span><select className="vtf-input" value={form.method || 'boleto'} onChange={(e) => setForm({ ...form, method: e.target.value })}>{FIN_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
        <label className="vtf"><span className="vtf-label">Valor</span><input className="vtf-input" value={form.value || ''} placeholder="R$ 0,00" onChange={(e) => setForm({ ...form, value: window.maskMoney(e.target.value) })} /></label>
        <button className="fin-add-btn" onClick={add}>+ Custo</button>
      </div>
      <div className="vt-card vt-sec">
        <div className="fin-list">
          {list.length === 0 && <p className="vt-empty" style={{ padding: '14px 0' }}>Sem custos neste período.</p>}
          {list.map((t) => (
            <div key={t.id} className="fin-item">
              <span className="desc"><b>{t.desc}</b><i>{t.cat} · {fmtBR(t.date)}{t.status === 'pendente' ? ' · a pagar' : ''}</i></span>
              <span className={`fin-tagm ${t.status === 'pendente' ? 'pend' : t.method}`}>{t.status === 'pendente' ? 'A pagar' : (FIN_METHODS.find((m) => m.id === t.method) || {}).label}</span>
              <span className="fin-amt down">{finBRL(t.value)}</span>
              <button className="fin-del" onClick={() => del(t.id)} title="Excluir">×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Relatórios ---------------- */
function RelatoriosFin({ fin }) {
  // receita x custo por mês (ano corrente)
  const year = new Date().getFullYear();
  const rev = Array(12).fill(0), cost = Array(12).fill(0);
  fin.tx.forEach((t) => {
    const d = new Date((t.paidAt || t.date) + 'T00:00:00');
    if (d.getFullYear() !== year || t.status !== 'pago') return;
    if (t.kind === 'receita') rev[d.getMonth()] += t.value; else cost[d.getMonth()] += t.value;
  });
  const max = Math.max(1, ...rev, ...cost);
  const totRev = rev.reduce((a, b) => a + b, 0), totCost = cost.reduce((a, b) => a + b, 0);
  const lucro = totRev - totCost;
  const bestMonth = rev.indexOf(Math.max(...rev));
  // custos por categoria
  const catTotals = {};
  fin.tx.filter((t) => t.kind === 'custo' && t.status === 'pago').forEach((t) => { catTotals[t.cat] = (catTotals[t.cat] || 0) + t.value; });
  const cats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const catMax = Math.max(1, ...cats.map((c) => c[1]));
  // melhores categorias de receita
  const revCat = {};
  fin.tx.filter((t) => t.kind === 'receita' && t.status === 'pago').forEach((t) => { revCat[t.cat] = (revCat[t.cat] || 0) + t.value; });
  const revCats = Object.entries(revCat).sort((a, b) => b[1] - a[1]);
  const revMax = Math.max(1, ...revCats.map((c) => c[1]));
  return (
    <div>
      <div className="fin-row4">
        <div className="fin-kpi"><div className="lbl">Receita ({year})</div><div className="val up">{finBRL(totRev)}</div></div>
        <div className="fin-kpi"><div className="lbl">Custos ({year})</div><div className="val down">{finBRL(totCost)}</div></div>
        <div className="fin-kpi"><div className="lbl">Lucro</div><div className={`val ${lucro >= 0 ? 'up' : 'down'}`}>{finBRL(lucro)}</div><div className="sub">{lucro >= 0 ? 'resultado positivo' : 'prejuízo'}</div></div>
        <div className="fin-kpi"><div className="lbl">Melhor mês</div><div className="val">{MES[bestMonth]}</div><div className="sub">{finBRL(rev[bestMonth])}</div></div>
      </div>
      <div className="vt-grid" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'start', marginBottom: 16 }}>
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">Receita × Custos por mês</h3>
          <div className="fin-bars2">
            {MES.map((m, i) => (
              <div key={m} className="fin-bg2">
                <div className="fin-bpair">
                  <div className="fin-bar2 r" style={{ height: `${(rev[i] / max) * 100}%` }} title={`Receita ${finBRL(rev[i])}`} />
                  <div className="fin-bar2 c" style={{ height: `${(cost[i] / max) * 100}%` }} title={`Custo ${finBRL(cost[i])}`} />
                </div>
                <span className="fin-blbl">{m}</span>
              </div>
            ))}
          </div>
          <div className="vt-chart-legend" style={{ marginTop: 10 }}><span><i style={{ background: 'var(--teal)' }} /> Receita</span><span><i style={{ background: '#cdd6df' }} /> Custos</span></div>
        </div>
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">Melhores receitas</h3>
          <div className="fin-cat-list">
            {revCats.map(([c, v]) => (
              <div key={c} className="fin-cat-row"><span style={{ width: 92 }}>{c}</span><span className="fin-cat-bar"><span className="fin-cat-fill" style={{ width: `${(v / revMax) * 100}%`, background: 'var(--teal)' }} /></span><span className="fin-cat-val">{finBRL(v)}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="vt-card vt-sec">
        <h3 className="vt-sec-title">Custos por categoria</h3>
        <div className="fin-cat-list">
          {cats.map(([c, v]) => (
            <div key={c} className="fin-cat-row"><span style={{ width: 130 }}>{c}</span><span className="fin-cat-bar"><span className="fin-cat-fill" style={{ width: `${(v / catMax) * 100}%`, background: 'var(--amber)' }} /></span><span className="fin-cat-val">{finBRL(v)}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Pagamentos: formas, taxas e split ---------------- */
function PagamentosTab() {
  const [cfg, setCfg] = vtUseState(() => window.vtPayCfg());
  const persist = (c) => { setCfg(c); window.vtSavePayCfg(c); };
  const updM = (i, k, v) => persist({ ...cfg, methods: cfg.methods.map((m, j) => j === i ? { ...m, [k]: v } : m) });
  const delM = (i) => persist({ ...cfg, methods: cfg.methods.filter((_, j) => j !== i) });
  const addM = () => persist({ ...cfg, methods: [...cfg.methods, { id: 'm' + Date.now().toString(36), label: 'Nova forma', icon: '💳', fee: 0 }] });
  const updS = (i, k, v) => persist({ ...cfg, splits: cfg.splits.map((s, j) => j === i ? { ...s, [k]: v } : s) });
  const delS = (i) => persist({ ...cfg, splits: cfg.splits.filter((_, j) => j !== i) });
  const addS = () => persist({ ...cfg, splits: [...(cfg.splits || []), { id: 's' + Date.now().toString(36), nome: '', pct: 0 }] });
  return (
    <div>
      <div className="vt-card vt-sec" style={{ marginBottom: 16 }}>
        <div className="vt-head-row" style={{ marginBottom: 8 }}>
          <div><h3 className="vt-sec-title" style={{ margin: 0 }}>Formas de pagamento & taxas de maquininha</h3><p className="vt-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>A taxa (%) é lançada como custo automaticamente ao dar baixa, refletindo nos relatórios e no fluxo de caixa.</p></div>
          <button className="vt-btn-primary" onClick={addM}><VtIcon name="plus" size={15} /> Nova forma</button>
        </div>
        <table className="pr-dtable">
          <thead><tr><th style={{ width: 60 }}>Ícone</th><th>Forma de pagamento</th><th style={{ width: 150 }}>Taxa (%)</th><th style={{ width: 44 }}></th></tr></thead>
          <tbody>
            {cfg.methods.map((m, i) => (
              <tr key={m.id}>
                <td><input value={m.icon} onChange={(e) => updM(i, 'icon', e.target.value)} style={{ width: 44, textAlign: 'center' }} /></td>
                <td><input value={m.label} onChange={(e) => updM(i, 'label', e.target.value)} /></td>
                <td><input className="num" value={m.fee} onChange={(e) => updM(i, 'fee', e.target.value)} placeholder="0" /></td>
                <td><button className="pr-del-btn" onClick={() => delM(i)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="vt-card vt-sec">
        <div className="vt-head-row" style={{ marginBottom: 8 }}>
          <div><h3 className="vt-sec-title" style={{ margin: 0 }}>Split / repasse a terceirizados</h3><p className="vt-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Percentual repassado a parceiros (ex.: veterinário volante, laboratório). Lançado como custo ao receber.</p></div>
          <button className="vt-btn-primary" onClick={addS}><VtIcon name="plus" size={15} /> Novo split</button>
        </div>
        {(!cfg.splits || cfg.splits.length === 0) ? <p className="pr-empty">Nenhum split configurado.</p> : (
          <table className="pr-dtable">
            <thead><tr><th>Parceiro / terceirizado</th><th style={{ width: 150 }}>Repasse (%)</th><th style={{ width: 44 }}></th></tr></thead>
            <tbody>
              {cfg.splits.map((s, i) => (
                <tr key={s.id}>
                  <td><input value={s.nome} onChange={(e) => updS(i, 'nome', e.target.value)} placeholder="Ex.: Dr. Volante / Laboratório X" /></td>
                  <td><input className="num" value={s.pct} onChange={(e) => updS(i, 'pct', e.target.value)} placeholder="0" /></td>
                  <td><button className="pr-del-btn" onClick={() => delS(i)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ---------------- Visão Geral (dashboard financeiro) ---------------- */
function VisaoGeralTab({ fin, save }) {
  const now = new Date();
  const year = now.getFullYear();
  const sameMonth = (s) => { const d = new Date((s) + 'T00:00:00'); return d.getMonth() === now.getMonth() && d.getFullYear() === year; };
  const paidMonth = fin.tx.filter((t) => t.status === 'pago' && sameMonth(t.paidAt || t.date));
  const receitaMes = paidMonth.filter((t) => t.kind === 'receita').reduce((s, t) => s + t.value, 0);
  const despesaMes = paidMonth.filter((t) => t.kind === 'custo').reduce((s, t) => s + t.value, 0);
  const lucro = receitaMes - despesaMes;
  const atend = paidMonth.filter((t) => t.kind === 'receita' && t.cat !== 'Venda').length;
  const ticket = atend ? receitaMes / atend : 0;
  const margem = receitaMes ? (lucro / receitaMes) * 100 : 0;

  // receita × despesa por mês (ano corrente)
  const rev = Array(12).fill(0), cost = Array(12).fill(0);
  fin.tx.forEach((t) => { if (t.status !== 'pago') return; const d = new Date((t.paidAt || t.date) + 'T00:00:00'); if (d.getFullYear() !== year) return; if (t.kind === 'receita') rev[d.getMonth()] += t.value; else cost[d.getMonth()] += t.value; });
  const max = Math.max(1, ...rev, ...cost);

  // top 5 procedimentos (receita paga, exceto vendas) agrupados por categoria
  const procMap = {};
  fin.tx.filter((t) => t.kind === 'receita' && t.status === 'pago' && t.cat !== 'Venda').forEach((t) => { const k = t.cat || 'Outros'; (procMap[k] = procMap[k] || { v: 0, n: 0 }); procMap[k].v += t.value; procMap[k].n++; });
  const topProc = Object.entries(procMap).sort((a, b) => b[1].v - a[1].v).slice(0, 5);
  const procMax = Math.max(1, ...topProc.map((x) => x[1].v));

  // top 5 produtos (saídas de estoque); fallback p/ vendas registradas como receita
  const moves = ((window.VtStore && window.VtStore.getData()) || {}).inventoryMoves || [];
  const prodMap = {};
  moves.filter((m) => m.tipo === 'Saída').forEach((m) => { prodMap[m.itemName] = (prodMap[m.itemName] || 0) + Math.abs(m.delta || m.qty || 0); });
  const prodIsMoney = Object.keys(prodMap).length === 0;
  let topProd;
  if (prodIsMoney) {
    const vmap = {};
    fin.tx.filter((t) => t.kind === 'receita' && t.cat === 'Venda' && t.status === 'pago').forEach((t) => { vmap[t.desc] = (vmap[t.desc] || 0) + t.value; });
    topProd = Object.entries(vmap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  } else {
    topProd = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }
  const prodMax = Math.max(1, ...topProd.map((x) => x[1]));

  // mês anterior (comparativo)
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevM = prevDate.getMonth(); const prevY = prevDate.getFullYear();
  const isPrevMonth = (s) => { const d = new Date((s) + 'T00:00:00'); return d.getMonth() === prevM && d.getFullYear() === prevY; };
  const prevPaid = fin.tx.filter((t) => t.status === 'pago' && isPrevMonth(t.paidAt || t.date));
  const receitaPrev = prevPaid.filter((t) => t.kind === 'receita').reduce((s, t) => s + t.value, 0);
  const despesaPrev = prevPaid.filter((t) => t.kind === 'custo').reduce((s, t) => s + t.value, 0);
  const lucroPrev = receitaPrev - despesaPrev;
  const pctChange = (cur, prev) => prev === 0 ? null : Math.round(((cur - prev) / prev) * 100);

  // receita por veterinário (mês atual)
  const vetRevMap = {};
  paidMonth.filter((t) => t.kind === 'receita').forEach((t) => { const k = t.vet || 'Sem veterinário'; vetRevMap[k] = (vetRevMap[k] || 0) + t.value; });
  const vetRevList = Object.entries(vetRevMap).sort((a, b) => b[1] - a[1]);
  const vetRevMax = Math.max(1, ...vetRevList.map((x) => x[1]));

  // meta do mês
  const meta = fin.metaMes || 20000;
  const metaPct = Math.min(100, meta ? (receitaMes / meta) * 100 : 0);
  const editMeta = () => { const v = prompt('Meta de receita do mês (R$):', String(meta)); if (v == null) return; const n = finParseMoney(v) || Number(String(v).replace(/[^\d]/g, '')) || 0; if (n > 0) { save({ ...fin, metaMes: n }); window.vtToast('Meta atualizada.', 'ok'); } };

  const toneIc = { up: ['var(--green-t)', 'var(--green)'], down: ['var(--red-t)', 'var(--red)'], neutral: ['var(--teal-t)', 'var(--teal-d)'] };
  const fmtPct = (p) => p == null ? '' : (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p) + '% vs mês ant.';
  const kpis = [
    { l: 'Receita do mês', v: finBRL(receitaMes), ic: 'dollar', tone: 'up', sub: fmtPct(pctChange(receitaMes, receitaPrev)) || (MES[now.getMonth()] + '/' + year) },
    { l: 'Despesas do mês', v: finBRL(despesaMes), ic: 'receipt', tone: 'down', sub: fmtPct(pctChange(despesaMes, despesaPrev)) || (MES[now.getMonth()] + '/' + year) },
    { l: 'Lucro líquido', v: finBRL(lucro), ic: 'chart', tone: lucro >= 0 ? 'up' : 'down', sub: fmtPct(pctChange(lucro, lucroPrev)) || (lucro >= 0 ? 'resultado positivo' : 'prejuízo') },
    { l: 'Ticket médio', v: finBRL(ticket), ic: 'spark', tone: 'neutral', sub: atend + ' atendimento(s)' },
    { l: 'Margem de lucro', v: margem.toFixed(1) + '%', ic: 'check', tone: margem >= 0 ? 'up' : 'down', sub: 'sobre a receita' },
  ];

  return (
    <div>
      <div className="fin-ov-kpis">
        {kpis.map((k, i) => { const [bg, c] = toneIc[k.tone]; return (
          <div key={i} className={`fin-ov-card ${k.tone}`}>
            <span className="fin-ov-ic" style={{ background: bg, color: c }}><VtIcon name={k.ic} size={20} /></span>
            <div className="fin-ov-l">{k.l}</div>
            <div className={`fin-ov-v ${k.tone === 'neutral' ? '' : k.tone}`}>{k.v}</div>
            <div className="fin-ov-sub">{k.sub}</div>
          </div>
        ); })}
      </div>

      <div className="vt-card vt-sec fin-prem" style={{ marginBottom: 16 }}>
        <div className="fin-toolbar"><h3 className="vt-sec-title" style={{ margin: 0 }}>Receita × Despesa por mês · {year}</h3><div className="vt-chart-legend" style={{ margin: 0 }}><span><i style={{ background: 'var(--teal)' }} /> Receita</span><span><i style={{ background: '#cdd6df' }} /> Despesa</span></div></div>
        <div className="fin-bars2" style={{ marginTop: 12 }}>
          {MES.map((m, i) => (
            <div key={m} className={`fin-bg2${i === now.getMonth() ? ' on' : ''}`}>
              <div className="fin-bpair">
                <div className="fin-bar2 r" style={{ height: `${(rev[i] / max) * 100}%` }} title={`Receita ${finBRL(rev[i])}`} />
                <div className="fin-bar2 c" style={{ height: `${(cost[i] / max) * 100}%` }} title={`Despesa ${finBRL(cost[i])}`} />
              </div>
              <span className="fin-blbl">{m}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fin-ov-grid2">
        <div className="vt-card vt-sec fin-prem">
          <h3 className="vt-sec-title">Top 5 procedimentos</h3>
          <div className="fin-top">
            {topProc.length === 0 && <p className="vt-empty" style={{ padding: '10px 0' }}>Sem receitas de procedimentos ainda.</p>}
            {topProc.map(([name, o], i) => (
              <div key={name} className="fin-top-row">
                <span className="fin-top-rank">{i + 1}</span>
                <div className="fin-top-body">
                  <div className="fin-top-name"><span>{name} <i style={{ color: 'var(--faint)', fontWeight: 600, fontStyle: 'normal' }}>· {o.n}x</i></span><span>{finBRL(o.v)}</span></div>
                  <div className="fin-top-bar"><span className="fin-top-fill" style={{ width: `${(o.v / procMax) * 100}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="vt-card vt-sec fin-prem">
          <h3 className="vt-sec-title">Top 5 produtos {prodIsMoney ? '' : '(saídas)'}</h3>
          <div className="fin-top">
            {topProd.length === 0 && <p className="vt-empty" style={{ padding: '10px 0' }}>Registre saídas no Estoque ou vendas para ver os produtos.</p>}
            {topProd.map(([name, v], i) => (
              <div key={name} className="fin-top-row">
                <span className="fin-top-rank">{i + 1}</span>
                <div className="fin-top-body">
                  <div className="fin-top-name"><span>{name}</span><span>{prodIsMoney ? finBRL(v) : v + ' un'}</span></div>
                  <div className="fin-top-bar"><span className="fin-top-fill" style={{ width: `${(v / prodMax) * 100}%`, background: 'var(--navy)' }} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {vetRevList.length > 0 && (
        <div className="vt-card vt-sec fin-prem" style={{ marginBottom: 16 }}>
          <h3 className="vt-sec-title">Receita por veterinário · {MES[now.getMonth()]}/{year}</h3>
          <div className="fin-top">
            {vetRevList.map(([vet, v], i) => (
              <div key={vet} className="fin-top-row">
                <span className="fin-top-rank">{i + 1}</span>
                <div className="fin-top-body">
                  <div className="fin-top-name"><span>{vet.replace('M.V. ', '')}</span><span>{finBRL(v)} <i style={{ color: 'var(--faint)', fontWeight: 600, fontStyle: 'normal' }}>· {receitaMes ? Math.round(v / receitaMes * 100) : 0}%</i></span></div>
                  <div className="fin-top-bar"><span className="fin-top-fill" style={{ width: `${(v / vetRevMax) * 100}%`, background: 'var(--teal)' }} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="vt-card fin-prem fin-meta">
        <div className="fin-meta-head">
          <div className="fin-meta-title">Meta do mês · {MES[now.getMonth()]}</div>
          <button className="fin-meta-edit" onClick={editMeta}><VtIcon name="pen" size={14} /> Editar meta</button>
        </div>
        <div className="fin-meta-bar"><div className="fin-meta-fill" style={{ width: metaPct + '%' }} /></div>
        <div className="fin-meta-foot">
          <span className="vt-muted">{finBRL(receitaMes)} de {finBRL(meta)}</span>
          <b style={{ color: metaPct >= 100 ? 'var(--green)' : 'var(--teal-d)' }}>{metaPct.toFixed(0)}%{metaPct >= 100 ? ' · meta batida 🎉' : ''}</b>
        </div>
      </div>
    </div>
  );
}

function FinEmBreve({ title, desc }) {
  return (
    <div className="vt-card fin-prem fin-placeholder">
      <div className="vt-placeholder-ic" style={{ margin: '0 auto 16px' }}><VtIcon name="gear" size={28} /></div>
      <h2 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px' }}>{title}</h2>
      <p className="vt-muted" style={{ maxWidth: 460, margin: '0 auto', fontSize: 14, lineHeight: 1.55 }}>{desc}</p>
      <span className="vt-badge-soon">Próxima etapa</span>
    </div>
  );
}

/* ---------------- Módulo ---------------- */
function FinancasModule({ hideTabs, initialTab } = {}) {
  const [fin, save] = useFin();
  const [tab, setTab] = vtUseState(initialTab || 'visao');
  const FluxoCaixaTab = window.FluxoCaixaTab, ReceitasTab = window.ReceitasTab, DespesasTab = window.DespesasTab, OrcamentosFinTab = window.OrcamentosFinTab, PrecificacaoTab = window.PrecificacaoTab;
  const AssinaturasTab = window.AssinaturasTab, ProjecoesTab = window.ProjecoesTab, IAFinanceiraTab = window.IAFinanceiraTab;
  const tabs = [
    ['visao', 'Visão Geral'], ['fluxo', 'Fluxo de Caixa'], ['receitas', 'Receitas'], ['despesas', 'Despesas'],
    ['orcamentos', 'Orçamentos'], ['precificacao', 'Precificação'], ['comissoes', 'Comissões'],
    ['assinaturas', 'Assinaturas'], ['pagamentos', 'Pagamentos'], ['projecoes', 'Projeções'], ['ia', 'IA Financeira'],
  ];
  return (
    <div>
      {!hideTabs && <div className="vt-page-head"><h1>Financeiro</h1><p>Visão geral, fluxo de caixa, receitas, despesas, precificação e projeções</p></div>}
      {!hideTabs && <div className="fin-tabs">{tabs.map(([id, l]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{l}</button>)}</div>}
      {tab === 'visao' && <VisaoGeralTab fin={fin} save={save} />}
      {tab === 'fluxo' && <FluxoCaixaTab fin={fin} save={save} />}
      {tab === 'receitas' && <ReceitasTab fin={fin} save={save} />}
      {tab === 'despesas' && <DespesasTab fin={fin} save={save} />}
      {tab === 'orcamentos' && <OrcamentosFinTab />}
      {tab === 'precificacao' && <PrecificacaoTab />}
      {tab === 'comissoes' && <SplitTab />}
      {tab === 'assinaturas' && (AssinaturasTab ? <AssinaturasTab /> : <FinEmBreve title="Assinaturas & Planos" desc="Planos recorrentes (mensal/trimestral/anual) com serviços incluídos, clientes assinantes e status de pagamento recorrente. Próxima etapa." />)}
      {tab === 'pagamentos' && <PagamentosTab />}
      {tab === 'projecoes' && (ProjecoesTab ? <ProjecoesTab fin={fin} save={save} /> : <FinEmBreve title="Projeções" desc="Projeção de receita para os próximos meses e meta mensal. Próxima etapa." />)}
      {tab === 'ia' && (IAFinanceiraTab ? <IAFinanceiraTab fin={fin} /> : <FinEmBreve title="IA Financeira" desc="Alertas inteligentes e análise financeira automática. Próxima etapa." />)}
    </div>
  );
}

Object.assign(window, { FinancasModule });
