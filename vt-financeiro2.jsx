/* ============================================================
   VetTooth Pro — Financeiro (parte 2)
   Abas: Fluxo de Caixa · Receitas · Despesas · Orçamentos · Precificação
   Usa os helpers globais de vt-financeiro.jsx (finBRL, finToday, MES,
   FIN_METHODS, finParseMoney, finUID, fmtBR...).
   ============================================================ */

/* ---- utilidades ---- */
function finDownloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map((c) => { const s = String(c == null ? '' : c); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const FIN_WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const FIN_FIXO_CATS = ['Aluguel', 'Funcionários', 'Folha de pagamento', 'Marketing', 'Luz', 'Água', 'Impostos', 'Imposto', 'Internet/Telefone', 'Software/Sistemas', 'Contador'];
const DESP_CATS = ['Aluguel', 'Funcionários', 'Insumos', 'Marketing', 'Luz', 'Água', 'Impostos', 'Manutenção', 'Outros'];
function finDespesaTipo(t) { return t.tipo || (FIN_FIXO_CATS.includes(t.cat) ? 'fixo' : 'variavel'); }
function finDespesaRecorr(t) { return t.recorrencia || (finDespesaTipo(t) === 'fixo' ? 'mensal' : 'pontual'); }
function finStatusBadge(st) {
  const map = { pago: ['Pago', 'var(--green)', 'var(--green-t)'], pendente: ['Pendente', 'var(--amber)', 'var(--amber-t)'], cancelado: ['Cancelado', 'var(--red)', 'var(--red-t)'] };
  const [l, c, bg] = map[st] || map.pendente;
  return <span className="vt-pill" style={{ color: c, background: bg }}>{l}</span>;
}
function f2num(v) { return Number(String(v == null ? '' : v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')) || 0; }

/* ============ Fluxo de Caixa ============ */
function FluxoCaixaTab({ fin }) {
  const [period, setPeriod] = vtUseState('mes');
  const [from, setFrom] = vtUseState(finDaysAgo(30));
  const [to, setTo] = vtUseState(finToday());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayOf = (t) => t.paidAt || t.date;
  const inRange = (iso) => {
    if (!iso) return false;
    if (period === 'mes') { const d = new Date(iso + 'T00:00:00'); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); }
    if (period === '30d') { const d = new Date(iso + 'T00:00:00'); const diff = (today - d) / 864e5; return diff >= -1 && diff < 30; }
    return iso >= from && iso <= to;
  };
  const paid = fin.tx.filter((t) => t.status === 'pago');
  const map = {};
  paid.forEach((t) => { const d = dayOf(t); if (!inRange(d)) return; (map[d] = map[d] || { in: 0, out: 0 }); if (t.kind === 'receita') map[d].in += t.value; else map[d].out += t.value; });
  const days = Object.keys(map).sort();
  const allByDay = {};
  paid.forEach((t) => { const d = dayOf(t); (allByDay[d] = allByDay[d] || 0); allByDay[d] += t.kind === 'receita' ? t.value : -t.value; });
  const allDays = Object.keys(allByDay).sort();
  const accUpTo = (day) => allDays.filter((d) => d <= day).reduce((s, d) => s + allByDay[d], 0);
  const totalIn = days.reduce((s, d) => s + map[d].in, 0);
  const totalOut = days.reduce((s, d) => s + map[d].out, 0);
  const saldoPeriodo = totalIn - totalOut;
  const saldoAcum = accUpTo(period === 'custom' ? to : finToday());
  const exportCSV = () => {
    const rows = [['Data', 'Entradas', 'Saidas', 'Saldo do dia', 'Saldo acumulado']];
    days.forEach((d) => { rows.push([fmtBR(d), map[d].in.toFixed(2).replace('.', ','), map[d].out.toFixed(2).replace('.', ','), (map[d].in - map[d].out).toFixed(2).replace('.', ','), accUpTo(d).toFixed(2).replace('.', ',')]); });
    finDownloadCSV('fluxo-caixa.csv', rows); window.vtToast('CSV exportado.', 'ok');
  };
  return (
    <div>
      <div className="fin-row4" style={{ marginBottom: 16 }}>
        <div className="fin-kpi"><div className="lbl">Entradas (período)</div><div className="val up">{finBRL(totalIn)}</div></div>
        <div className="fin-kpi"><div className="lbl">Saídas (período)</div><div className="val down">{finBRL(totalOut)}</div></div>
        <div className="fin-kpi"><div className="lbl">Saldo do período</div><div className={`val ${saldoPeriodo >= 0 ? 'up' : 'down'}`}>{finBRL(saldoPeriodo)}</div></div>
        <div className="fin-kpi"><div className="lbl">Saldo acumulado</div><div className="val">{finBRL(saldoAcum)}</div><div className="sub">até {fmtBR(period === 'custom' ? to : finToday())}</div></div>
      </div>
      <div className="fin-toolbar">
        <div className="fin-period">
          {[['mes', 'Este mês'], ['30d', 'Últimos 30d'], ['custom', 'Personalizado']].map(([id, l]) => (<button key={id} className={period === id ? 'active' : ''} onClick={() => setPeriod(id)}>{l}</button>))}
        </div>
        {period === 'custom' && <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><input type="date" className="vtf-input" style={{ width: 150 }} value={from} onChange={(e) => setFrom(e.target.value)} /><span className="vt-muted">até</span><input type="date" className="vtf-input" style={{ width: 150 }} value={to} onChange={(e) => setTo(e.target.value)} /></span>}
        <button className="vt-btn-ghost" style={{ marginLeft: 'auto' }} onClick={exportCSV}><VtIcon name="receipt" size={15} /> Exportar CSV</button>
      </div>
      <div className="vt-card vt-sec">
        {days.length === 0 ? <p className="vt-empty" style={{ padding: '14px 0' }}>Sem movimentações no período.</p> : (
          <div className="fin-flow">
            <div className="fin-flow-row" style={{ borderBottom: '2px solid var(--line)', color: 'var(--faint)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <span>Dia</span><span>Entradas</span><span>Saídas</span><span>Saldo do dia</span><span style={{ textAlign: 'right' }}>Acumulado</span>
            </div>
            {[...days].reverse().map((d) => { const o = map[d]; const saldo = o.in - o.out; const dt = new Date(d + 'T00:00:00'); return (
              <div key={d} className="fin-flow-row">
                <span className="fin-flow-day"><b>{fmtBR(d)}</b><i>{FIN_WD[dt.getDay()]}</i></span>
                <span className="fin-flow-amt up">{o.in ? '+' + finBRL(o.in) : '—'}</span>
                <span className="fin-flow-amt down">{o.out ? '−' + finBRL(o.out) : '—'}</span>
                <span className={`fin-flow-saldo ${saldo >= 0 ? 'up' : 'down'}`}>{finBRL(saldo)}</span>
                <span className="fin-flow-acc">{finBRL(accUpTo(d))}</span>
              </div>
            ); })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ Receitas ============ */
function ReceitasTab({ fin, save }) {
  const [period, setPeriod] = vtUseState('mes');
  const [fMethod, setFMethod] = vtUseState('todas');
  const [fStatus, setFStatus] = vtUseState('todos');
  const [modal, setModal] = vtUseState(null);
  const list = fin.tx.filter((t) => t.kind === 'receita')
    .filter((t) => inPeriod(t.paidAt || t.date, period))
    .filter((t) => fMethod === 'todas' || t.method === fMethod)
    .filter((t) => fStatus === 'todos' || (t.status || 'pendente') === fStatus)
    .sort((a, b) => (b.paidAt || b.date || '').localeCompare(a.paidAt || a.date || ''));
  const total = list.filter((t) => t.status !== 'cancelado').reduce((s, t) => s + t.value, 0);
  const saveTx = (tx) => {
    const exists = tx.id && fin.tx.some((t) => t.id === tx.id);
    save({ ...fin, tx: exists ? fin.tx.map((t) => t.id === tx.id ? tx : t) : [tx, ...fin.tx] });
    setModal(null); window.vtToast('Receita salva.', 'ok');
  };
  const del = (id) => save({ ...fin, tx: fin.tx.filter((t) => t.id !== id) });
  const grid = '1fr 1.3fr 1.6fr 1fr 1fr 1fr 0.6fr';
  return (
    <div>
      <div className="fin-toolbar">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="fin-period">{[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano'], ['tudo', 'Tudo']].map(([id, l]) => <button key={id} className={period === id ? 'active' : ''} onClick={() => setPeriod(id)}>{l}</button>)}</div>
          <select className="vtf-input" style={{ width: 150 }} value={fMethod} onChange={(e) => setFMethod(e.target.value)}><option value="todas">Todas as formas</option>{FIN_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
          <select className="vtf-input" style={{ width: 140 }} value={fStatus} onChange={(e) => setFStatus(e.target.value)}><option value="todos">Todos os status</option><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="cancelado">Cancelado</option></select>
        </div>
        <button className="vt-btn-primary" onClick={() => setModal({ date: finToday(), cat: FIN_REV_CATS[0], method: 'pix', status: 'pago' })}><VtIcon name="plus" size={16} /> Nova Receita</button>
      </div>
      <div className="vt-card vt-table-card">
        <div className="vt-table">
          <div className="vt-tr vt-th" style={{ gridTemplateColumns: grid }}><span>Data</span><span>Paciente / Cliente</span><span>Serviço / Produto</span><span>Forma</span><span>Valor</span><span>Status</span><span></span></div>
          {list.map((t) => { const m = FIN_METHODS.find((x) => x.id === t.method); return (
            <div key={t.id} className="vt-tr" style={{ gridTemplateColumns: grid, alignItems: 'center' }}>
              <span className="vt-muted">{fmtBR(t.paidAt || t.date)}</span>
              <span><b style={{ fontWeight: 700 }}>{t.patient || '—'}</b></span>
              <span>{t.desc}<span className="vt-id" style={{ display: 'block' }}>{t.cat}</span></span>
              <span><span className={`fin-tagm ${t.method || 'dinheiro'}`}>{m ? m.label : '—'}</span></span>
              <span style={{ fontWeight: 700 }}>{finBRL(t.value)}</span>
              <span>{finStatusBadge(t.status || 'pendente')}</span>
              <span className="vt-row-actions"><button className="vt-link" onClick={() => setModal(t)}>Editar</button><button className="pr-del-btn" onClick={() => del(t.id)}>✕</button></span>
            </div>
          ); })}
          {list.length === 0 && <div className="vt-empty-row">Nenhuma receita no filtro. Clique em "Nova Receita".</div>}
          {list.length > 0 && <div className="fin-foot"><span className="vt-muted">{list.length} lançamento(s) no período</span><b>Total: {finBRL(total)}</b></div>}
        </div>
      </div>
      {modal && <ReceitaModal data={modal} onClose={() => setModal(null)} onSave={saveTx} />}
    </div>
  );
}
function ReceitaModal({ data, onClose, onSave }) {
  const owners = ((window.VtStore && window.VtStore.getData()) || {}).owners || [];
  const patients = ((window.VtStore && window.VtStore.getData()) || {}).patients || [];
  const nomes = Array.from(new Set([...patients.map((p) => p.name), ...owners.map((o) => o.name)])).filter(Boolean);
  const [f, setF] = vtUseState({ ...data, value: data.value != null ? (typeof data.value === 'number' ? window.maskMoney(data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : data.value) : '' });
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const submit = () => {
    if (!f.desc || !f.desc.trim()) { window.vtToast('Informe o serviço/produto.', 'err'); return; }
    const value = finParseMoney(String(f.value));
    if (!value) { window.vtToast('Informe o valor.', 'err'); return; }
    const status = f.status || 'pendente';
    onSave({ id: f.id || finUID(), kind: 'receita', desc: f.desc.trim(), patient: f.patient || '', cat: f.cat || FIN_REV_CATS[0], value, date: f.date || finToday(), method: f.method || 'pix', status, paidAt: status === 'pago' ? (f.paidAt || f.date || finToday()) : null });
  };
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3>{f.id ? 'Editar receita' : 'Nova receita'}</h3>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '34%' }}><span className="vtf-label">Data</span><span className="vtf-inputwrap"><input type="date" className="vtf-input" value={f.date || ''} onChange={(e) => s('date')(e.target.value)} /></span></label>
          <label className="vtf" style={{ width: '62%' }}><span className="vtf-label">Paciente / Cliente</span><span className="vtf-inputwrap"><input className="vtf-input" list="fin-nomes" value={f.patient || ''} onChange={(e) => s('patient')(e.target.value)} placeholder="Nome do paciente ou tutor" /></span></label>
          <datalist id="fin-nomes">{nomes.map((n) => <option key={n} value={n} />)}</datalist>
        </div>
        <div className="vt-form-row">
          <VtField label="Serviço / Produto" value={f.desc} onChange={s('desc')} placeholder="Ex.: Profilaxia dentária" width="62%" />
          <label className="vtf" style={{ width: '34%' }}><span className="vtf-label">Categoria</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.cat} onChange={(e) => s('cat')(e.target.value)}>{FIN_REV_CATS.map((c) => <option key={c}>{c}</option>)}</select></span></label>
        </div>
        <div className="vt-form-row">
          <VtField label="Valor" value={f.value} onChange={(v) => s('value')(window.maskMoney(v))} placeholder="R$ 0,00" width="32%" />
          <label className="vtf" style={{ width: '32%' }}><span className="vtf-label">Forma de pagamento</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.method} onChange={(e) => s('method')(e.target.value)}>{(window.vtActiveFINMethods ? window.vtActiveFINMethods() : FIN_METHODS).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></span></label>
          <label className="vtf" style={{ width: '30%' }}><span className="vtf-label">Status</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.status} onChange={(e) => s('status')(e.target.value)}><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="cancelado">Cancelado</option></select></span></label>
        </div>
        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={submit}>Salvar receita</button>
        </div>
      </div>
    </div>
  );
}

/* ============ Despesas ============ */
function DespesasTab({ fin, save }) {
  const [fTipo, setFTipo] = vtUseState('Todos');
  const [modal, setModal] = vtUseState(null);
  const now = new Date();
  const custos = fin.tx.filter((t) => t.kind === 'custo');
  const mesCustos = custos.filter((t) => { const d = new Date((t.paidAt || t.date) + 'T00:00:00'); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const totalFixo = mesCustos.filter((t) => finDespesaTipo(t) === 'fixo').reduce((s, t) => s + t.value, 0);
  const totalVar = mesCustos.filter((t) => finDespesaTipo(t) === 'variavel').reduce((s, t) => s + t.value, 0);
  const totalGeral = totalFixo + totalVar;
  const list = custos.filter((t) => fTipo === 'Todos' || finDespesaTipo(t) === (fTipo === 'Fixo' ? 'fixo' : 'variavel')).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const saveTx = (tx) => { const exists = tx.id && fin.tx.some((t) => t.id === tx.id); save({ ...fin, tx: exists ? fin.tx.map((t) => t.id === tx.id ? tx : t) : [tx, ...fin.tx] }); setModal(null); window.vtToast('Despesa salva.', 'ok'); };
  const del = (id) => save({ ...fin, tx: fin.tx.filter((t) => t.id !== id) });
  const grid = '1fr 1.8fr 1.1fr 0.8fr 0.9fr 1fr 0.5fr';
  return (
    <div>
      <div className="fin-row3" style={{ marginBottom: 16 }}>
        <div className="fin-ov-card neutral"><span className="fin-ov-ic" style={{ background: 'var(--teal-t)', color: 'var(--teal-d)' }}><VtIcon name="box" size={20} /></span><div className="fin-ov-l">Total fixo (mês)</div><div className="fin-ov-v">{finBRL(totalFixo)}</div></div>
        <div className="fin-ov-card down"><span className="fin-ov-ic" style={{ background: 'var(--amber-t)', color: 'var(--amber)' }}><VtIcon name="chart" size={20} /></span><div className="fin-ov-l">Total variável (mês)</div><div className="fin-ov-v">{finBRL(totalVar)}</div></div>
        <div className="fin-ov-card"><span className="fin-ov-ic" style={{ background: 'var(--red-t)', color: 'var(--red)' }}><VtIcon name="receipt" size={20} /></span><div className="fin-ov-l">Total geral (mês)</div><div className="fin-ov-v down">{finBRL(totalGeral)}</div></div>
      </div>
      <div className="fin-toolbar">
        <div className="vt-segmented">{['Todos', 'Fixo', 'Variável'].map((c) => <button key={c} className={fTipo === c ? 'active' : ''} onClick={() => setFTipo(c)}>{c}</button>)}</div>
        <button className="vt-btn-primary" onClick={() => setModal({ date: finToday(), cat: DESP_CATS[0], tipo: 'fixo', recorrencia: 'mensal' })}><VtIcon name="plus" size={16} /> Nova Despesa</button>
      </div>
      <div className="vt-card vt-table-card">
        <div className="vt-table">
          <div className="vt-tr vt-th" style={{ gridTemplateColumns: grid }}><span>Data</span><span>Descrição</span><span>Categoria</span><span>Tipo</span><span>Recorrência</span><span>Valor</span><span></span></div>
          {list.map((t) => { const tipo = finDespesaTipo(t); return (
            <div key={t.id} className="vt-tr" style={{ gridTemplateColumns: grid, alignItems: 'center' }}>
              <span className="vt-muted">{fmtBR(t.date)}</span>
              <span><b style={{ fontWeight: 700 }}>{t.desc}</b></span>
              <span className="vt-muted">{t.cat}</span>
              <span><span className="vt-pill" style={tipo === 'fixo' ? { color: 'var(--navy)', background: '#e6edf4' } : { color: 'var(--amber)', background: 'var(--amber-t)' }}>{tipo === 'fixo' ? 'Fixo' : 'Variável'}</span></span>
              <span className="vt-muted">{finDespesaRecorr(t) === 'mensal' ? 'Mensal' : 'Pontual'}</span>
              <span style={{ fontWeight: 700, color: 'var(--red)' }}>{finBRL(t.value)}</span>
              <span className="vt-row-actions"><button className="vt-link" onClick={() => setModal(t)}>Editar</button><button className="pr-del-btn" onClick={() => del(t.id)}>✕</button></span>
            </div>
          ); })}
          {list.length === 0 && <div className="vt-empty-row">Nenhuma despesa {fTipo !== 'Todos' ? fTipo.toLowerCase() : ''}. Clique em "Nova Despesa".</div>}
        </div>
      </div>
      {modal && <DespesaModal data={modal} onClose={() => setModal(null)} onSave={saveTx} />}
    </div>
  );
}
function DespesaModal({ data, onClose, onSave }) {
  const [f, setF] = vtUseState({ ...data, value: data.value != null && typeof data.value === 'number' ? window.maskMoney(data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : (data.value || '') });
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const submit = () => {
    if (!f.desc || !f.desc.trim()) { window.vtToast('Informe a descrição.', 'err'); return; }
    const value = finParseMoney(String(f.value));
    if (!value) { window.vtToast('Informe o valor.', 'err'); return; }
    onSave({ id: f.id || finUID(), kind: 'custo', desc: f.desc.trim(), cat: f.cat || DESP_CATS[0], tipo: f.tipo || 'fixo', recorrencia: f.recorrencia || 'mensal', value, date: f.date || finToday(), status: 'pago', method: f.method || 'boleto', paidAt: f.date || finToday() });
  };
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3>{f.id ? 'Editar despesa' : 'Nova despesa'}</h3>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '34%' }}><span className="vtf-label">Data</span><span className="vtf-inputwrap"><input type="date" className="vtf-input" value={f.date || ''} onChange={(e) => s('date')(e.target.value)} /></span></label>
          <VtField label="Descrição" value={f.desc} onChange={s('desc')} placeholder="Ex.: Aluguel da clínica" width="62%" />
        </div>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '38%' }}><span className="vtf-label">Categoria</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.cat} onChange={(e) => s('cat')(e.target.value)}>{DESP_CATS.map((c) => <option key={c}>{c}</option>)}</select></span></label>
          <label className="vtf" style={{ width: '28%' }}><span className="vtf-label">Tipo</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.tipo} onChange={(e) => s('tipo')(e.target.value)}><option value="fixo">Fixo</option><option value="variavel">Variável</option></select></span></label>
          <label className="vtf" style={{ width: '28%' }}><span className="vtf-label">Recorrência</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.recorrencia} onChange={(e) => s('recorrencia')(e.target.value)}><option value="mensal">Mensal</option><option value="pontual">Pontual</option></select></span></label>
        </div>
        <div className="vt-form-row">
          <VtField label="Valor" value={f.value} onChange={(v) => s('value')(window.maskMoney(v))} placeholder="R$ 0,00" width="40%" />
        </div>
        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={submit}>Salvar despesa</button>
        </div>
      </div>
    </div>
  );
}

/* ============ Orçamentos ============ */
const ORC_STATUS = { rascunho: ['Rascunho', 'var(--muted)', '#eef1f5'], enviado: ['Enviado', 'var(--blue, #2563eb)', '#e6eeff'], aprovado: ['Aprovado', 'var(--green)', 'var(--green-t)'], recusado: ['Recusado', 'var(--red)', 'var(--red-t)'] };
function orcBadge(st) { const [l, c, bg] = ORC_STATUS[st] || ORC_STATUS.rascunho; return <span className="vt-pill" style={{ color: c, background: bg }}>{l}</span>; }
function OrcamentosFinTab() {
  const [list, setList] = vtUseState(() => ((window.VtStore.getData() || {}).orcamentos) || []);
  const [filtro, setFiltro] = vtUseState('Todos');
  const [modal, setModal] = vtUseState(null);
  const persist = (l) => { setList(l); window.VtStore.setData({ orcamentos: l }); };
  const norm = (o) => ({ status: o.status === 'pendente' ? 'enviado' : (o.status || 'rascunho'), cliente: o.cliente || o.patientName || '—', numero: o.numero || ('ORC-' + (o.id || '').toString().slice(-4)), date: o.date || '', validade: o.validade || '', total: o.total || 0, ...o, status0: o.status });
  const rows = list.map(norm);
  const fl = filtro === 'Todos' ? rows : rows.filter((o) => o.status === filtro.toLowerCase());
  const nextNum = () => 'ORC-' + String(list.reduce((m, o) => Math.max(m, parseInt(String(o.numero || '').replace(/\D/g, '')) || 0), 0) + 1).padStart(4, '0');
  const setStatus = (id, status) => persist(list.map((o) => o.id === id ? { ...o, status } : o));
  const del = (id) => persist(list.filter((o) => o.id !== id));
  const saveOrc = (o) => { const exists = o.id && list.some((x) => x.id === o.id); persist(exists ? list.map((x) => x.id === o.id ? o : x) : [{ ...o, id: o.id || ('ORC' + Date.now().toString(36)) }, ...list]); setModal(null); window.vtToast('Orçamento salvo.', 'ok'); };
  const converter = (o) => {
    const d = window.VtStore.getData(); const fin = d.fin || { tx: [] };
    const tx = { id: finUID(), kind: 'receita', desc: `Orçamento ${o.numero} — ${o.cliente}`, patient: o.cliente, cat: 'Procedimento', value: o.total || 0, date: finToday(), status: 'pendente', method: 'pix', paidAt: null };
    window.VtStore.setData({ fin: { ...fin, tx: [tx, ...(fin.tx || [])] } });
    setStatus(o.id, 'aprovado');
    window.vtToast('Convertido em cobrança (lançado em Receitas como pendente).', 'ok');
  };
  const totApr = rows.filter((o) => o.status === 'aprovado').reduce((s, o) => s + (o.total || 0), 0);
  const totPend = rows.filter((o) => o.status === 'enviado' || o.status === 'rascunho').reduce((s, o) => s + (o.total || 0), 0);
  const grid = '0.9fr 1.4fr 1fr 1fr 1fr 1fr 1.4fr';
  return (
    <div>
      <div className="fin-row3" style={{ marginBottom: 16 }}>
        <div className="fin-kpi"><div className="lbl">Orçamentos</div><div className="val">{list.length}</div></div>
        <div className="fin-kpi"><div className="lbl">Aprovados</div><div className="val up">{finBRL(totApr)}</div></div>
        <div className="fin-kpi"><div className="lbl">Em aberto</div><div className="val" style={{ color: 'var(--amber)' }}>{finBRL(totPend)}</div></div>
      </div>
      <div className="fin-toolbar">
        <div className="vt-chip-row" style={{ display: 'flex', gap: 7 }}>{['Todos', 'Rascunho', 'Enviado', 'Aprovado', 'Recusado'].map((c) => <button key={c} onClick={() => setFiltro(c)} style={prChipStyle(filtro === c)}>{c}</button>)}</div>
        <button className="vt-btn-primary" onClick={() => setModal({ numero: nextNum(), cliente: '', date: finToday(), validade: finToday(), items: [], desconto: '', status: 'rascunho' })}><VtIcon name="plus" size={16} /> Novo Orçamento</button>
      </div>
      <div className="vt-card vt-table-card">
        <div className="vt-table">
          <div className="vt-tr vt-th" style={{ gridTemplateColumns: grid }}><span>Número</span><span>Cliente</span><span>Data</span><span>Validade</span><span>Total</span><span>Status</span><span></span></div>
          {fl.map((o) => (
            <div key={o.id} className="vt-tr" style={{ gridTemplateColumns: grid, alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>{o.numero}</span>
              <span><b style={{ fontWeight: 700 }}>{o.cliente}</b><span className="vt-id" style={{ display: 'block' }}>{(o.items || []).length} item(ns)</span></span>
              <span className="vt-muted">{fmtBR(o.date) || '—'}</span>
              <span className="vt-muted">{fmtBR(o.validade) || '—'}</span>
              <span style={{ fontWeight: 700 }}>{finBRL(o.total)}</span>
              <span>{orcBadge(o.status)}</span>
              <span className="vt-row-actions" style={{ gap: 4 }}>
                {o.status !== 'aprovado' && <button className="vt-link" onClick={() => converter(o)} title="Converter em cobrança">Cobrar</button>}
                <button className="vt-link" onClick={() => setModal(o)}>Editar</button>
                <button className="pr-del-btn" onClick={() => del(o.id)}>✕</button>
              </span>
            </div>
          ))}
          {fl.length === 0 && <div className="vt-empty-row">Nenhum orçamento {filtro !== 'Todos' ? filtro.toLowerCase() : ''}. Clique em "Novo Orçamento".</div>}
        </div>
      </div>
      {modal && <OrcamentoModal data={modal} onClose={() => setModal(null)} onSave={saveOrc} onConverter={converter} />}
    </div>
  );
}
function OrcamentoModal({ data, onClose, onSave, onConverter }) {
  const d = (window.VtStore && window.VtStore.getData()) || {};
  const owners = d.owners || [];
  const inventory = d.inventory || [];
  const consults = window.vtConsults ? window.vtConsults() : [];
  const [f, setF] = vtUseState({ ...data, items: (data.items || []).map((it) => ({ ...it })) });
  const [pick, setPick] = vtUseState('');
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const setItem = (i, k, v) => setF((p) => ({ ...p, items: p.items.map((it, j) => j === i ? { ...it, [k]: v } : it) }));
  const addItem = (it) => setF((p) => ({ ...p, items: [...p.items, it || { desc: '', qty: 1, price: '' }] }));
  const delItem = (i) => setF((p) => ({ ...p, items: p.items.filter((_, j) => j !== i) }));
  const onPick = (v) => {
    if (!v) return;
    if (v.indexOf('proc:') === 0) { const c = consults.find((x) => x.id === v.slice(5)); if (c) addItem({ desc: c.label, qty: 1, price: window.PR.parseMoney(String(c.price)) || 0 }); }
    else if (v.indexOf('prod:') === 0) { const it = inventory.find((x) => x.id === v.slice(5)); if (it) addItem({ desc: it.name, qty: 1, price: window.PR.parseMoney(String(it.cost)) || 0 }); }
    setPick('');
  };
  const subtotal = f.items.reduce((s2, it) => s2 + (f2num(it.qty) * f2num(it.price)), 0);
  const desconto = finParseMoney(String(f.desconto || ''));
  const total = Math.max(0, subtotal - desconto);
  const submit = (convert) => {
    if (!f.cliente || !f.cliente.trim()) { window.vtToast('Informe o cliente.', 'err'); return; }
    const o = { ...f, cliente: f.cliente.trim(), items: f.items.map((it) => ({ desc: it.desc, qty: f2num(it.qty), price: f2num(it.price) })), desconto, total };
    onSave(o);
    if (convert) setTimeout(() => onConverter({ ...o, id: o.id || 'tmp' }), 50);
  };
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 620, maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h3>{data.id ? 'Editar orçamento' : 'Novo orçamento'} · {f.numero}</h3>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '44%' }}><span className="vtf-label">Cliente</span><span className="vtf-inputwrap"><input className="vtf-input" list="orc-owners" value={f.cliente || ''} onChange={(e) => s('cliente')(e.target.value)} placeholder="Nome do cliente / tutor" /></span></label>
          <datalist id="orc-owners">{owners.map((o) => <option key={o.id} value={o.name} />)}</datalist>
          <label className="vtf" style={{ width: '26%' }}><span className="vtf-label">Data</span><span className="vtf-inputwrap"><input type="date" className="vtf-input" value={f.date || ''} onChange={(e) => s('date')(e.target.value)} /></span></label>
          <label className="vtf" style={{ width: '26%' }}><span className="vtf-label">Validade</span><span className="vtf-inputwrap"><input type="date" className="vtf-input" value={f.validade || ''} onChange={(e) => s('validade')(e.target.value)} /></span></label>
        </div>
        <div className="vt-form-sec" style={{ marginTop: 4 }}>Itens (procedimentos & produtos)</div>
        <table className="orc-items">
          <thead><tr><th>Descrição</th><th style={{ width: 70 }}>Qtd</th><th style={{ width: 110 }}>Preço un.</th><th style={{ width: 100 }}>Subtotal</th><th style={{ width: 30 }}></th></tr></thead>
          <tbody>
            {f.items.map((it, i) => (
              <tr key={i}>
                <td><input value={it.desc} onChange={(e) => setItem(i, 'desc', e.target.value)} placeholder="Item" /></td>
                <td><input className="num" value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value.replace(/[^\d]/g, ''))} /></td>
                <td><input className="num" value={it.price} onChange={(e) => setItem(i, 'price', e.target.value)} placeholder="0,00" /></td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{finBRL(f2num(it.qty) * f2num(it.price))}</td>
                <td><button className="pr-del-btn" onClick={() => delItem(i)}>✕</button></td>
              </tr>
            ))}
            {f.items.length === 0 && <tr><td colSpan={5} className="vt-muted" style={{ fontSize: 13, padding: 8 }}>Nenhum item. Adicione abaixo.</td></tr>}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0' }}>
          <select className="vtf-input" style={{ flex: 1 }} value={pick} onChange={(e) => onPick(e.target.value)}>
            <option value="">+ Adicionar do catálogo…</option>
            <optgroup label="Procedimentos">{consults.map((c) => <option key={c.id} value={'proc:' + c.id}>{c.label}</option>)}</optgroup>
            <optgroup label="Produtos / estoque">{inventory.map((it) => <option key={it.id} value={'prod:' + it.id}>{it.name}</option>)}</optgroup>
          </select>
          <button className="vt-btn-ghost" onClick={() => addItem()}><VtIcon name="plus" size={14} /> Item em branco</button>
        </div>
        <div style={{ maxWidth: 300, marginLeft: 'auto', marginTop: 8 }}>
          <div className="orc-total-row"><span className="vt-muted">Subtotal</span><b>{finBRL(subtotal)}</b></div>
          <div className="orc-total-row"><span className="vt-muted">Desconto (R$)</span><input className="vtf-input" style={{ width: 120, textAlign: 'right' }} value={f.desconto || ''} onChange={(e) => s('desconto')(window.maskMoney(e.target.value))} placeholder="R$ 0,00" /></div>
          <div className="orc-total-row grand"><span>Total</span><span style={{ color: 'var(--teal-d)' }}>{finBRL(total)}</span></div>
        </div>
        <div className="vt-form-row" style={{ marginTop: 8 }}>
          <label className="vtf" style={{ width: '40%' }}><span className="vtf-label">Status</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.status} onChange={(e) => s('status')(e.target.value)}><option value="rascunho">Rascunho</option><option value="enviado">Enviado</option><option value="aprovado">Aprovado</option><option value="recusado">Recusado</option></select></span></label>
        </div>
        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-ghost" style={{ color: 'var(--teal-d)' }} onClick={() => submit(true)}>Salvar & Converter em cobrança</button>
          <button className="vt-btn-primary" onClick={() => submit(false)}>Salvar orçamento</button>
        </div>
      </div>
    </div>
  );
}

/* ============ Precificação ============ */
function PrecificacaoTab() {
  const [cat, setCat] = vtUseState('consultas');
  const [calc, setCalc] = vtUseState({ custo: '', markup: '' });
  const calcPreco = f2num(calc.custo) * (1 + f2num(calc.markup) / 100);

  /* ── Consultas (editam vtConsults) ── */
  const [consultas, setConsultas] = vtUseState(() => (window.vtConsults ? window.vtConsults() : []).map((c) => ({ ...c })));
  const updC = (i, k, v) => setConsultas((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const salvarConsultas = () => { if (window.vtSaveConsults) { window.vtSaveConsults(consultas); window.vtToast('Preços de consulta salvos.', 'ok'); } };

  /* ── Catálogo de serviços (Procedimento / Vacina / Medicamento / Curativo) ── */
  const [svcItems, setSvcItems] = vtUseState(() => window.vtServiceCatalog ? window.vtServiceCatalog() : []);
  const reloadSvc = () => setSvcItems(window.vtServiceCatalog ? window.vtServiceCatalog() : []);
  const svcTipoItems = svcItems.filter((s) => {
    if (cat === 'procedimentos') return s.tipo === 'Procedimento';
    if (cat === 'vacinas') return s.tipo === 'Vacina';
    if (cat === 'medicamentos') return s.tipo === 'Medicamento';
    if (cat === 'curativos') return s.tipo === 'Curativo';
    return false;
  });
  const updSvc = (id, k, v) => {
    const item = svcItems.find((s) => s.id === id);
    if (!item) return;
    const updated = { ...item, [k]: parseFloat(String(v).replace(',', '.')) || 0 };
    window.vtSaveServiceItem && window.vtSaveServiceItem(updated);
    reloadSvc();
  };

  const TABS = [['consultas', 'Consultas'], ['procedimentos', 'Procedimentos'], ['vacinas', 'Vacinas'], ['medicamentos', 'Medicamentos'], ['curativos', 'Curativos']];

  return (
    <div>
      {/* Calculadora de markup */}
      <div className="fin-calc">
        <label className="vtf"><span className="vtf-label">Custo (R$)</span><span className="vtf-inputwrap"><input className="vtf-input" value={calc.custo} onChange={(e) => setCalc((c) => ({ ...c, custo: e.target.value }))} placeholder="0,00" /></span></label>
        <span className="fin-calc-eq">×</span>
        <label className="vtf"><span className="vtf-label">Markup (%)</span><span className="vtf-inputwrap"><input className="vtf-input" value={calc.markup} onChange={(e) => setCalc((c) => ({ ...c, markup: e.target.value }))} placeholder="100" /></span></label>
        <span className="fin-calc-eq">=</span>
        <div className="fin-calc-res"><span>Preço sugerido</span><b>{finBRL(calcPreco)}</b></div>
        <div style={{ alignSelf: 'center', fontSize: 12.5, color: 'var(--muted)', maxWidth: 200 }}>Margem bruta: <b style={{ color: 'var(--teal-d)' }}>{calcPreco > 0 ? (((calcPreco - f2num(calc.custo)) / calcPreco) * 100).toFixed(1) : '0'}%</b></div>
      </div>

      <div className="fin-toolbar">
        <div className="vt-segmented" style={{ flexWrap: 'wrap' }}>{TABS.map(([id, l]) => <button key={id} className={cat === id ? 'active' : ''} onClick={() => setCat(id)}>{l}</button>)}</div>
        {cat === 'consultas' && <button className="vt-btn-primary" onClick={salvarConsultas}><VtIcon name="check" size={15} /> Salvar</button>}
        {cat !== 'consultas' && <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>Edite em <b>Configurações › Catálogo de Serviços</b> para cadastrar novos itens</span>}
      </div>

      {/* ── Consultas ── */}
      {cat === 'consultas' && (
        <div className="vt-card vt-sec">
          <p className="vt-muted" style={{ fontSize: 13, marginBottom: 12 }}>O preço entra automaticamente ao selecionar o tipo de consulta no atendimento.</p>
          <table className="pr-dtable">
            <thead><tr><th>Tipo de consulta</th><th style={{ width: 130 }}>Duração (min)</th><th style={{ width: 160 }}>Preço (R$)</th></tr></thead>
            <tbody>
              {consultas.map((r, i) => (
                <tr key={r.id || i}>
                  <td><b>{r.label}</b></td>
                  <td><input className="num" value={r.dur} onChange={(e) => updC(i, 'dur', e.target.value.replace(/\D/g, ''))} /></td>
                  <td><input value={r.price} onChange={(e) => updC(i, 'price', window.maskMoney ? window.maskMoney(e.target.value) : e.target.value)} placeholder="R$ 0,00" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Catálogo de serviços ── */}
      {cat !== 'consultas' && (
        <div className="vt-card vt-sec">
          {svcTipoItems.length === 0 ? (
            <p className="pr-empty">Nenhum item cadastrado nesta categoria. Vá em <b>Configurações › Catálogo de Serviços</b> para cadastrar.</p>
          ) : (
            <table className="pr-dtable">
              <thead><tr><th>Nome</th><th>Unidade</th><th style={{ width: 130 }}>Custo (R$)</th><th style={{ width: 160 }}>Preço (R$)</th><th style={{ width: 110 }}>Margem</th></tr></thead>
              <tbody>
                {svcTipoItems.map((it) => {
                  const preco = it.preco || 0;
                  const custo = it.custo || 0;
                  const margem = preco > 0 ? ((preco - custo) / preco * 100).toFixed(1) : '—';
                  return (
                    <tr key={it.id}>
                      <td><b>{it.nome}</b>{it.descricao && <i style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{it.descricao}</i>}</td>
                      <td>{it.unidade}</td>
                      <td><input className="num" value={custo || ''} onChange={(e) => updSvc(it.id, 'custo', e.target.value)} placeholder="0,00" /></td>
                      <td><input className="num" value={preco || ''} onChange={(e) => updSvc(it.id, 'preco', e.target.value)} placeholder="0,00" style={{ fontWeight: 700 }} /></td>
                      <td style={{ color: (preco - custo) >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{margem}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/* seed de preços */
window.VT_PRECOS_SEED = {
  procedimentos: [
    { id: 'pp1', nome: 'Consulta clínica', custo: 30, markup: 400 },
    { id: 'pp2', nome: 'Profilaxia dentária', custo: 120, markup: 150 },
    { id: 'pp3', nome: 'Tartarectomia c/ ultrassom', custo: 180, markup: 178 },
    { id: 'pp4', nome: 'Extração dentária simples', custo: 90, markup: 167 },
    { id: 'pp5', nome: 'Radiografia odontológica', custo: 60, markup: 150 },
    { id: 'pp6', nome: 'Aplicação de vacina', custo: 25, markup: 120 },
  ],
  medicamentos: [
    { id: 'pm1', nome: 'Anestésico injetável (frasco)', custo: 45, markup: 80 },
    { id: 'pm2', nome: 'Antibiótico (caixa)', custo: 18, markup: 120 },
    { id: 'pm3', nome: 'Anti-inflamatório (caixa)', custo: 22, markup: 100 },
    { id: 'pm4', nome: 'Vacina V10 (dose)', custo: 35, markup: 90 },
  ],
  produtos: [
    { id: 'pr1', nome: 'Ração dental (saco)', custo: 48, markup: 95 },
    { id: 'pr2', nome: 'Escova dental pet', custo: 8, markup: 150 },
    { id: 'pr3', nome: 'Creme dental enzimático', custo: 15, markup: 130 },
  ],
};
window.vtPrecos = function () { const d = window.VtStore && window.VtStore.getData(); return (d && d.precos) || window.VT_PRECOS_SEED; };
window.vtSavePrecos = function (p) { if (window.VtStore) window.VtStore.setData({ precos: p }); };

Object.assign(window, { FluxoCaixaTab, ReceitasTab, DespesasTab, OrcamentosFinTab, PrecificacaoTab });
