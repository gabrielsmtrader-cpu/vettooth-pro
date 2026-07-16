/* ============================================================
   VetTooth Pro — Contas a Pagar (planejamento mensal)
   Contas recorrentes (mensal/anual/única) com dia de vencimento,
   alertas de vencimento, e baixa → lança custo no financeiro.
   ============================================================ */
const { useState: cpUse } = React;

window.CP_CATS = ['Aluguel', 'Folha de pagamento', 'Marketing', 'Contador', 'Luz', 'Água', 'Internet/Telefone', 'Software/Sistemas', 'Impostos', 'Fornecedores', 'Manutenção', 'Empréstimo', 'Outro'];

window.vtContas = function () { const d = window.VtStore && window.VtStore.getData(); return (d && d.contasPagar) || []; };
window.vtSaveContas = function (l) { if (window.VtStore) window.VtStore.setData({ contasPagar: l }); };

function cpMonthKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function cpDueDate(conta, ano, mes) { // mes 0-11
  const dia = Math.min(conta.dia || 1, new Date(ano, mes + 1, 0).getDate());
  return new Date(ano, mes, dia);
}
function cpFmt(d) { return d.toLocaleDateString('pt-BR'); }
/* ocorrências do mês de referência */
function cpOccurrences(contas, ref) {
  const ano = ref.getFullYear(), mes = ref.getMonth();
  const mk = cpMonthKey(ref);
  return (contas || []).filter((c) => {
    if (c.ativo === false) return false;
    if (c.recorrencia === 'mensal') return true;
    if (c.recorrencia === 'anual') return (c.mesAnual != null ? c.mesAnual : mes) === mes;
    if (c.recorrencia === 'unica') return (c.mesUnica || '') === mk;
    return true;
  }).map((c) => {
    const due = cpDueDate(c, ano, mes);
    const pago = (c.pagamentos || {})[mk];
    return { conta: c, due, mk, pago: !!pago, pagoInfo: pago };
  }).sort((a, b) => a.due - b.due);
}
function cpStatus(occ) {
  if (occ.pago) return { cls: 'pago', label: 'Paga', txt: occ.pagoInfo && occ.pagoInfo.date ? 'em ' + occ.pagoInfo.date : '' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((occ.due - today) / 864e5);
  if (diff < 0) return { cls: 'red', label: 'Vencida', txt: `há ${Math.abs(diff)} dia(s)` };
  if (diff === 0) return { cls: 'amber', label: 'Vence hoje', txt: '' };
  if (diff <= 7) return { cls: 'amber', label: 'A vencer', txt: `em ${diff} dia(s)` };
  return { cls: 'teal', label: 'Programada', txt: cpFmt(occ.due) };
}

/* contas que precisam de atenção (alerta global) — vencidas ou vencendo em 7 dias */
window.vtContasAlerta = function () {
  const occ = cpOccurrences(window.vtContas(), new Date());
  return occ.filter((o) => { const st = cpStatus(o); return !o.pago && (st.cls === 'red' || st.cls === 'amber'); });
};

function ContasPagarTab() {
  const [contas, setContas] = cpUse(() => window.vtContas());
  const [ref, setRef] = cpUse(() => new Date());
  const [modal, setModal] = cpUse(null);
  const persist = (l) => { setContas(l); window.vtSaveContas(l); };
  const occ = cpOccurrences(contas, ref);
  const mk = cpMonthKey(ref);
  const MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const stepMonth = (n) => { const d = new Date(ref); d.setMonth(d.getMonth() + n); setRef(d); };

  const totalMes = occ.reduce((s, o) => s + (Number(o.conta.valor) || 0), 0);
  const pagoMes = occ.filter((o) => o.pago).reduce((s, o) => s + (Number(o.conta.valor) || 0), 0);
  const abertoMes = totalMes - pagoMes;
  const vencidas = occ.filter((o) => !o.pago && cpStatus(o).cls === 'red').length;

  const blank = { nome: '', categoria: 'Marketing', valor: '', dia: 10, recorrencia: 'mensal', fornecedor: '', ativo: true, mesAnual: ref.getMonth(), mesUnica: mk };
  const saveConta = (f) => {
    if (!f.nome || !f.nome.trim()) { window.vtToast('Informe a descrição da conta.', 'err'); return; }
    const clean = { ...f, valor: window.PR.parseMoney(String(f.valor)) || Number(f.valor) || 0, dia: Number(f.dia) || 1 };
    if (f.id) persist(contas.map((c) => c.id === f.id ? { ...c, ...clean } : c));
    else persist([{ ...clean, id: 'CP' + Date.now().toString(36), pagamentos: {} }, ...contas]);
    setModal(null); window.vtToast('Conta salva no planejamento.', 'ok');
  };
  const delConta = (id) => persist(contas.filter((c) => c.id !== id));

  const pagar = (conta, due) => {
    // lança custo no financeiro
    const d = window.VtStore.getData();
    const fin = d.fin || { tx: [] };
    const tx = { id: 'T' + Date.now().toString(36), kind: 'custo', desc: conta.nome + (conta.fornecedor ? ' — ' + conta.fornecedor : ''), cat: conta.categoria, value: Number(conta.valor) || 0, date: new Date().toISOString().slice(0, 10), status: 'pago', method: 'boleto', paidAt: new Date().toISOString().slice(0, 10) };
    window.VtStore.setData({ fin: { ...fin, tx: [tx, ...(fin.tx || [])] } });
    // marca como paga no mês
    const next = contas.map((c) => c.id === conta.id ? { ...c, pagamentos: { ...(c.pagamentos || {}), [mk]: { date: window.PR.todayBR(), txId: tx.id } } } : c);
    persist(next);
    window.vtToast(`${conta.nome} paga · lançada como custo (${window.PR.money(conta.valor)}).`, 'ok');
  };
  const desfazer = (conta) => {
    const d = window.VtStore.getData();
    const pg = (conta.pagamentos || {})[mk];
    if (pg && pg.txId && d.fin) window.VtStore.setData({ fin: { ...d.fin, tx: d.fin.tx.filter((t) => t.id !== pg.txId) } });
    const next = contas.map((c) => { if (c.id !== conta.id) return c; const p = { ...(c.pagamentos || {}) }; delete p[mk]; return { ...c, pagamentos: p }; });
    persist(next); window.vtToast('Pagamento desfeito.', 'ok');
  };

  return (
    <div>
      <div className="vt-head-row" style={{ marginBottom: 14 }}>
        <div className="ag-nav">
          <button className="ag-navbtn" onClick={() => stepMonth(-1)}>‹</button>
          <span className="ag-title">{MES[ref.getMonth()]} {ref.getFullYear()}</span>
          <button className="ag-navbtn" onClick={() => stepMonth(1)}>›</button>
          <button className="ag-today" onClick={() => setRef(new Date())}>Mês atual</button>
        </div>
        <button className="vt-btn-primary" onClick={() => setModal(blank)}><VtIcon name="plus" size={15} /> Nova conta</button>
      </div>

      <div className="fin-row3" style={{ marginBottom: 16 }}>
        <div className="fin-kpi"><div className="lbl">Total do mês</div><div className="val">{window.PR.money(totalMes)}</div></div>
        <div className="fin-kpi"><div className="lbl">Em aberto</div><div className="val" style={{ color: abertoMes > 0 ? 'var(--amber)' : 'var(--green)' }}>{window.PR.money(abertoMes)}</div></div>
        <div className="fin-kpi"><div className="lbl">Vencidas</div><div className="val" style={{ color: vencidas ? 'var(--red)' : 'var(--ink)' }}>{vencidas}</div></div>
      </div>

      <div className="vt-card vt-sec">
        {occ.length === 0 ? <p className="pr-empty">Nenhuma conta programada para este mês. Cadastre suas contas recorrentes (aluguel, marketing, contador...).</p> : (
          <div className="vac-sched">
            {occ.map((o) => {
              const st = cpStatus(o);
              return (
                <div key={o.conta.id} className={`vac-sched-row ${st.cls === 'pago' ? 'teal' : st.cls}`} style={o.pago ? { opacity: .7 } : null}>
                  <span className="vac-dot" />
                  <div style={{ flex: 1 }}><b>{o.conta.nome}</b><i>{o.conta.categoria}{o.conta.fornecedor ? ' · ' + o.conta.fornecedor : ''} · vence dia {o.conta.dia}</i></div>
                  <span className="vac-due">{window.PR.money(o.conta.valor)}</span>
                  <span className={`vt-tag ${st.cls === 'red' ? 'red' : st.cls === 'amber' ? 'amber' : 'teal'}`}>{st.label}{st.txt ? ' · ' + st.txt : ''}</span>
                  {o.pago
                    ? <button className="pr-qbtn" style={{ padding: '5px 10px', fontSize: 11.5 }} onClick={() => desfazer(o.conta)}>Desfazer</button>
                    : <button className="pr-qbtn primary" style={{ padding: '5px 12px', fontSize: 11.5 }} onClick={() => pagar(o.conta, o.due)}>Pagar</button>}
                  <button className="vt-link" onClick={() => setModal({ ...o.conta })}>Editar</button>
                  <button className="pr-del-btn" onClick={() => delConta(o.conta.id)}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && <ContaModal data={modal} onClose={() => setModal(null)} onSave={saveConta} />}
    </div>
  );
}

function ContaModal({ data, onClose, onSave }) {
  const [f, setF] = cpUse({ ...data });
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3>{data.id ? 'Editar conta' : 'Nova conta a pagar'}</h3>
        <div className="vt-form-row">
          <VtField label="Descrição" value={f.nome} onChange={s('nome')} placeholder="Ex.: Marketing / Agência" width="58%" />
          <label className="vtf" style={{ width: '38%' }}><span className="vtf-label">Categoria</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.categoria} onChange={(e) => s('categoria')(e.target.value)}>{window.CP_CATS.map((c) => <option key={c}>{c}</option>)}</select></span></label>
        </div>
        <div className="vt-form-row">
          <VtField label="Valor" value={f.valor} onChange={(v) => s('valor')(window.maskMoney ? window.maskMoney(v) : v)} placeholder="R$ 0,00" width="40%" />
          <label className="vtf" style={{ width: '26%' }}><span className="vtf-label">Dia venc.</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.dia} onChange={(e) => s('dia')(Number(e.target.value))}>{Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}</select></span></label>
          <label className="vtf" style={{ width: '30%' }}><span className="vtf-label">Recorrência</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.recorrencia} onChange={(e) => s('recorrencia')(e.target.value)}><option value="mensal">Mensal</option><option value="anual">Anual</option><option value="unica">Única</option></select></span></label>
        </div>
        {f.recorrencia === 'anual' && (
          <div className="vt-form-row"><label className="vtf" style={{ width: '100%' }}><span className="vtf-label">Mês de cobrança (anual)</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.mesAnual} onChange={(e) => s('mesAnual')(Number(e.target.value))}>{MES.map((m, i) => <option key={i} value={i}>{m}</option>)}</select></span></label></div>
        )}
        <div className="vt-form-row"><VtField label="Fornecedor / favorecido" value={f.fornecedor} onChange={s('fornecedor')} placeholder="Opcional" width="100%" /></div>
        <label className="docs-check" style={{ marginTop: 4 }}><input type="checkbox" checked={f.ativo !== false} onChange={(e) => s('ativo')(e.target.checked)} /><span>Conta ativa</span></label>
        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={() => onSave(f)}>Salvar conta</button>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { ContasPagarTab, ContaModal });

/* ---------- Orçamentos (todos os realizados pelos usuários) ---------- */
function OrcamentosTab() {
  const [list, setList] = cpUse(() => ((window.VtStore.getData() || {}).orcamentos) || []);
  const [filtro, setFiltro] = cpUse('Todos');
  const persist = (l) => { setList(l); window.VtStore.setData({ orcamentos: l }); };
  const setStatus = (id, status) => persist(list.map((o) => o.id === id ? { ...o, status } : o));
  const del = (id) => persist(list.filter((o) => o.id !== id));
  const fl = filtro === 'Todos' ? list : list.filter((o) => o.status === filtro.toLowerCase());
  const totalAprov = list.filter((o) => o.status === 'aprovado').reduce((s, o) => s + (o.total || 0), 0);
  const totalPend = list.filter((o) => o.status !== 'aprovado' && o.status !== 'recusado').reduce((s, o) => s + (o.total || 0), 0);
  const pill = (st) => st === 'aprovado' ? <span className="vt-tag teal">Aprovado</span> : st === 'recusado' ? <span className="vt-tag red">Recusado</span> : <span className="vt-tag amber">Pendente</span>;
  return (
    <div>
      <div className="fin-row3" style={{ marginBottom: 16 }}>
        <div className="fin-kpi"><div className="lbl">Orçamentos</div><div className="val">{list.length}</div></div>
        <div className="fin-kpi"><div className="lbl">Aprovados</div><div className="val" style={{ color: 'var(--green)' }}>{window.PR.money(totalAprov)}</div></div>
        <div className="fin-kpi"><div className="lbl">Pendentes</div><div className="val" style={{ color: 'var(--amber)' }}>{window.PR.money(totalPend)}</div></div>
      </div>
      <div className="vt-chip-row" style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
        {['Todos', 'Pendente', 'Aprovado', 'Recusado'].map((c) => <button key={c} onClick={() => setFiltro(c)} style={prChipStyle(filtro === c)}>{c}</button>)}
      </div>
      <div className="vt-card vt-table-card">
        <div className="vt-table" style={{ '--cols': 1 }}>
          <div className="vt-tr vt-th" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 0.9fr 1fr 0.9fr' }}><span>Paciente</span><span>Data</span><span>Veterinário</span><span className="num">Total</span><span>Status</span><span></span></div>
          {fl.map((o) => (
            <div key={o.id} className="vt-tr" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 0.9fr 1fr 0.9fr', alignItems: 'center' }}>
              <span><b style={{ fontWeight: 700 }}>{o.patientName}</b><br /><span className="vt-muted" style={{ fontSize: 11.5 }}>{(o.items || []).length} item(ns)</span></span>
              <span className="vt-muted">{o.date}</span>
              <span className="vt-muted">{(o.vet || '').replace('M.V. ', '')}</span>
              <span className="num" style={{ fontWeight: 700 }}>{window.PR.money(o.total)}</span>
              <span>{pill(o.status)}</span>
              <span className="vt-row-actions" style={{ display: 'flex', gap: 4 }}>
                {o.status !== 'aprovado' && <button className="vt-link" onClick={() => setStatus(o.id, 'aprovado')}>Aprovar</button>}
                {o.status !== 'recusado' && <button className="vt-link" style={{ color: 'var(--muted)' }} onClick={() => setStatus(o.id, 'recusado')}>Recusar</button>}
                <button className="pr-del-btn" onClick={() => del(o.id)}>✕</button>
              </span>
            </div>
          ))}
          {fl.length === 0 && <div className="vt-empty-row">Nenhum orçamento {filtro !== 'Todos' ? filtro.toLowerCase() : ''}. Os orçamentos salvos nos atendimentos aparecem aqui.</div>}
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { OrcamentosTab });
