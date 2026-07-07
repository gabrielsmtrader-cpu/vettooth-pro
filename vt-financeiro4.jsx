/* ============================================================
   VetTooth Pro — Financeiro v4
   Múltiplas contas · Conciliação de cartões · DRE por competência
   Fluxo de caixa previsto vs real · Contas a pagar melhorado
   ============================================================ */

/* ---------- helpers ---------- */
const f4Money = (n) => window.vtMoney(n);
const f4Today = () => new Date().toISOString().slice(0, 10);
const f4Fmt = (iso) => { if (!iso) return '—'; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; };
function f4UID() { return 'F4' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }
function f4ParseMoney(v) { return Number((v||'').toString().replace(/[^\d,]/g,'').replace(',','.')) || 0; }
const f4Months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/* ---- Contas bancárias helpers ---- */
window.vtContas4 = function() {
  const d = window.VtStore && window.VtStore.getData();
  if (d && d.contas4 && d.contas4.length) return d.contas4;
  return [
    { id: 'cx1', nome: 'Caixa da Clínica', tipo: 'Espécie', saldo: 0, ativo: true },
    { id: 'cx2', nome: 'Conta Corrente', tipo: 'Conta corrente', saldo: 0, ativo: true },
  ];
};
window.vtSaveContas4 = function(list) {
  if (window.VtStore) window.VtStore.setData({ contas4: list });
};

/* ============================================================
   Modal: Conta bancária
   ============================================================ */
function ContaBancariaModal({ data, onClose, onSave }) {
  const blank = { nome: '', tipo: 'Espécie', banco: '', agencia: '', conta: '', saldo: '', ativo: true };
  const [f, setF] = vtUseState({ ...blank, ...data });
  const s = k => v => setF(p => ({ ...p, [k]: v }));
  const TIPOS = ['Espécie', 'Conta corrente', 'Conta poupança', 'Investimento', 'Recebimentos (Maquininha)', 'PIX'];
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <h3>{data.id ? 'Editar conta' : 'Nova conta'}</h3>
        <div className="vt-form-row">
          <VtField label="Nome da conta *" value={f.nome} onChange={s('nome')} width="56%" placeholder="Ex.: Caixa principal" />
          <label className="vtf" style={{ width: '40%' }}>
            <span className="vtf-label">Tipo</span>
            <span className="vtf-inputwrap">
              <select className="vtf-input" value={f.tipo} onChange={e => s('tipo')(e.target.value)}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </span>
          </label>
        </div>
        <div className="vt-form-row">
          <VtField label="Banco" value={f.banco} onChange={s('banco')} width="44%" placeholder="Ex.: Itaú, Nubank" />
          <VtField label="Agência" value={f.agencia} onChange={s('agencia')} width="24%" />
          <VtField label="Conta" value={f.conta} onChange={s('conta')} width="28%" />
        </div>
        <VtField label="Saldo inicial" value={String(f.saldo || '')} onChange={v => s('saldo')(window.maskMoney ? window.maskMoney(v) : v)} placeholder="R$ 0,00" width="50%" />
        <div className="fin-modal-actions" style={{ marginTop: 16 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={() => {
            if (!f.nome.trim()) { window.vtToast && window.vtToast('Informe o nome da conta.', 'err'); return; }
            onSave({ ...f });
          }}>Salvar conta</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Aba: Contas e Cartões
   ============================================================ */
function ContasCartoes({ fin }) {
  const [contas, setContas] = vtUseState(() => window.vtContas4());
  const [modal, setModal] = vtUseState(null);

  const saveContas = (next) => { setContas(next); window.vtSaveContas4(next); };

  const saldoConta = (conta) => {
    const tx = (fin && fin.tx) || [];
    const movimento = tx.filter(t => t.conta === conta.id && t.status === 'pago').reduce((s, t) => {
      const v = Number(t.value || t.val || 0);
      return s + ((t.kind === 'receita' || t.type === 'entrada') ? v : -v);
    }, 0);
    return (f4ParseMoney(conta.saldo) || 0) + movimento;
  };

  const saveConta = (f) => {
    if (f.id) saveContas(contas.map(c => c.id === f.id ? f : c));
    else saveContas([{ ...f, id: f4UID() }, ...contas]);
    setModal(null);
    window.vtToast && window.vtToast('Conta salva.', 'ok');
  };

  const TYPE_ICON = { 'Espécie': '💵', 'Conta corrente': '🏦', 'Conta poupança': '🏦', 'Investimento': '📈', 'Recebimentos (Maquininha)': '💳', 'PIX': '⚡' };

  const total = contas.filter(c => c.ativo !== false && c.tipo !== 'Recebimentos (Maquininha)').reduce((s, c) => s + saldoConta(c), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>Saldo consolidado (caixas + contas)</span>
          <div style={{ fontSize: 28, fontWeight: 800, color: total >= 0 ? 'var(--green)' : 'var(--red)' }}>{f4Money(total)}</div>
        </div>
        <button className="vt-btn-primary" onClick={() => setModal({})}><VtIcon name="plus" size={16} /> Nova conta</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 20 }}>
        {contas.map(c => {
          const saldo = saldoConta(c);
          return (
            <div key={c.id} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 22 }}>{TYPE_ICON[c.tipo] || '🏦'}</div>
                <button style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--muted)' }} onClick={() => setModal(c)}>✏️</button>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>{c.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{c.tipo}{c.banco ? ` · ${c.banco}` : ''}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: saldo >= 0 ? 'var(--green)' : 'var(--red)' }}>{f4Money(saldo)}</div>
              {c.ativo === false && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Inativa</div>}
            </div>
          );
        })}
      </div>

      <div className="vt-card vt-table-card">
        <div className="vt-table">
          <div className="vt-tr vt-th" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px 80px', gap: 8, padding: '10px 16px' }}>
            <span>Conta</span><span>Tipo</span><span>Banco</span><span>Saldo atual</span><span>Status</span>
          </div>
          {contas.map(c => {
            const saldo = saldoConta(c);
            return (
              <div key={c.id} className="vt-tr" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px 80px', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line-2)', alignItems: 'center' }}>
                <span><b style={{ fontSize: 13.5 }}>{c.nome}</b></span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{c.tipo}</span>
                <span style={{ fontSize: 13 }}>{c.banco || '—'}</span>
                <span style={{ fontWeight: 800, color: saldo >= 0 ? 'var(--green)' : 'var(--red)' }}>{f4Money(saldo)}</span>
                <span>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: c.ativo !== false ? 'var(--green-t)' : '#eef1f5', color: c.ativo !== false ? 'var(--green)' : 'var(--muted)', fontWeight: 700 }}>
                    {c.ativo !== false ? 'Ativa' : 'Inativa'}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {modal !== null && <ContaBancariaModal data={modal} onClose={() => setModal(null)} onSave={saveConta} />}
    </div>
  );
}

/* ============================================================
   Aba: Conciliação de Cartões
   ============================================================ */
function ConciliacaoCartoes({ fin }) {
  const [mes, setMes] = vtUseState(f4Today().slice(0, 7));
  const tx = (fin && fin.tx) || [];

  const recebCartao = tx.filter(t => {
    const iso = (t.paidAt || t.date || '').slice(0, 10);
    return iso.slice(0, 7) === mes && (t.status === 'pago' || t.status === 'recebido') && ['cartao','debito','credito','credito_parc'].includes(t.method);
  });

  const [conciliados, setConciliados] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.conciliados) || [];
  });

  const toggleConciliar = (id) => {
    const next = conciliados.includes(id) ? conciliados.filter(x => x !== id) : [...conciliados, id];
    setConciliados(next);
    if (window.VtStore) window.VtStore.setData({ conciliados: next });
  };

  const totalReceb = recebCartao.reduce((s, t) => s + Number(t.value || t.val || 0), 0);
  const totalConc = recebCartao.filter(t => conciliados.includes(t.id)).reduce((s, t) => s + Number(t.value || t.val || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Mês de referência:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid var(--line)', borderRadius: 9, fontFamily: 'inherit', fontSize: 14 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total no mês', value: f4Money(totalReceb), color: 'var(--teal-d)', bg: 'var(--teal-t)' },
          { label: 'Conciliados', value: f4Money(totalConc), color: 'var(--green)', bg: 'var(--green-t)' },
          { label: 'Pendentes', value: f4Money(totalReceb - totalConc), color: totalReceb - totalConc > 0 ? 'var(--amber)' : 'var(--muted)', bg: totalReceb - totalConc > 0 ? 'var(--amber-t)' : '#eef1f5' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.color}30`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 12.5, color: c.color, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="vt-card vt-table-card">
        <div className="vt-table">
          <div className="vt-tr vt-th" style={{ display: 'grid', gridTemplateColumns: '100px 2fr 1fr 100px 90px', gap: 8, padding: '10px 16px' }}>
            <span>Data</span><span>Descrição</span><span>Forma de pagamento</span><span>Valor</span><span>Status</span>
          </div>
          {recebCartao.length === 0 && (
            <div className="vt-empty-row">Nenhuma transação por cartão neste mês.</div>
          )}
          {recebCartao.map(t => {
            const conc = conciliados.includes(t.id);
            const labels = { cartao: 'Cartão', debito: 'Débito', credito: 'Crédito', credito_parc: 'Crédito Parc.' };
            return (
              <div key={t.id} className="vt-tr" style={{ display: 'grid', gridTemplateColumns: '100px 2fr 1fr 100px 90px', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line-2)', alignItems: 'center', background: conc ? 'var(--green-t)' : 'transparent' }}>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>{f4Fmt((t.paidAt || t.date || '').slice(0,10))}</span>
                <span><b style={{ fontSize: 13.5 }}>{t.desc || '—'}</b>{t.patient ? <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)' }}>{t.patient}</span> : null}</span>
                <span style={{ fontSize: 13 }}>{labels[t.method] || t.method || '—'}</span>
                <span style={{ fontWeight: 800, color: 'var(--green)' }}>{f4Money(t.value || t.val || 0)}</span>
                <span>
                  <button onClick={() => toggleConciliar(t.id)}
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: `1px solid ${conc ? 'var(--green)' : 'var(--line)'}`, background: conc ? 'var(--green)' : 'var(--card)', color: conc ? '#fff' : 'var(--muted)', cursor: 'pointer', fontWeight: 700 }}>
                    {conc ? '✓ OK' : 'Conferir'}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Aba: Contas a Pagar (melhorada)
   ============================================================ */
function ContasPagarV4() {
  const [contas, setContas] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.contasPagar) || [];
  });
  const [modal, setModal] = vtUseState(null);
  const [filtro, setFiltro] = vtUseState('todos');
  const today = f4Today();

  const saveContas = (next) => { setContas(next); if (window.VtStore) window.VtStore.setData({ contasPagar: next }); };

  const statusConta = (c) => {
    if (c.pago) return 'pago';
    if (c.vencimento && c.vencimento < today) return 'vencido';
    if (c.vencimento) {
      const dias = Math.round((new Date(c.vencimento+'T00:00:00') - new Date()) / 86400000);
      if (dias <= 7) return 'avencer';
    }
    return 'aberto';
  };

  const ST_STYLE = {
    pago:    { label: 'Pago',     color: 'var(--green)', bg: 'var(--green-t)' },
    vencido: { label: 'Vencido',  color: 'var(--red)',   bg: 'var(--red-t)' },
    avencer: { label: 'A vencer', color: 'var(--amber)', bg: 'var(--amber-t)' },
    aberto:  { label: 'Aberto',   color: 'var(--muted)', bg: '#eef1f5' },
  };

  const filtered = contas.filter(c => {
    if (filtro === 'todos') return true;
    if (filtro === 'nao_pago') return !c.pago;
    return statusConta(c) === filtro;
  });

  const vals = {
    total: contas.reduce((s, c) => s + f4ParseMoney(c.valor), 0),
    pago: contas.filter(c => c.pago).reduce((s, c) => s + f4ParseMoney(c.valor), 0),
    vencido: contas.filter(c => statusConta(c) === 'vencido').reduce((s, c) => s + f4ParseMoney(c.valor), 0),
    avencer: contas.filter(c => ['avencer','aberto'].includes(statusConta(c)) && !c.pago).reduce((s, c) => s + f4ParseMoney(c.valor), 0),
  };

  const baixar = (id) => {
    saveContas(contas.map(c => c.id === id ? { ...c, pago: true, pgtoData: today } : c));
    window.vtToast && window.vtToast('Conta baixada como paga.', 'ok');
  };

  const CATS = ['Aluguel', 'Folha de pagamento', 'Insumos', 'Fornecedores', 'Luz', 'Água', 'Internet', 'Imposto', 'Manutenção', 'Software', 'Contador', 'Marketing', 'Empréstimo', 'Outro'];

  const saveConta = (f) => {
    if (f.id) saveContas(contas.map(c => c.id === f.id ? f : c));
    else saveContas([{ ...f, id: f4UID() }, ...contas]);
    setModal(null);
    window.vtToast && window.vtToast('Conta salva.', 'ok');
  };

  return (
    <div>
      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Total', value: vals.total, color: 'var(--navy)', bg: '#e6edf4', filtro: 'todos' },
          { label: 'Vencidos', value: vals.vencido, color: 'var(--red)', bg: 'var(--red-t)', filtro: 'vencido' },
          { label: 'A vencer', value: vals.avencer, color: 'var(--amber)', bg: 'var(--amber-t)', filtro: 'avencer' },
          { label: 'Pagos', value: vals.pago, color: 'var(--green)', bg: 'var(--green-t)', filtro: 'pago' },
        ].map(c => (
          <button key={c.label} onClick={() => setFiltro(c.filtro)}
            style={{ background: filtro === c.filtro ? c.bg : 'var(--card)', border: filtro === c.filtro ? `2px solid ${c.color}` : '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', textAlign: 'left', cursor: 'pointer', boxShadow: 'var(--shadow)', transition: 'all .14s' }}>
            <div style={{ fontSize: 13, color: c.color, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.color, marginTop: 4 }}>{f4Money(c.value)}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['todos','Todos'],['nao_pago','Não pagos'],['vencido','Vencidos'],['avencer','A vencer'],['pago','Pagos']].map(([id, label]) => (
            <button key={id} onClick={() => setFiltro(id)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--line)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', background: filtro === id ? 'var(--navy)' : 'var(--card)', color: filtro === id ? '#fff' : 'var(--muted)' }}>
              {label}
            </button>
          ))}
        </div>
        <button className="vt-btn-primary" onClick={() => setModal({ recorrencia: 'mensal', categoria: 'Outro' })}>
          <VtIcon name="plus" size={16} /> Nova conta
        </button>
      </div>

      <div className="vt-card vt-table-card">
        <div className="vt-table">
          <div className="vt-tr vt-th" style={{ display: 'grid', gridTemplateColumns: '100px 2fr 1fr 1fr 100px 100px 80px', gap: 8, padding: '10px 16px' }}>
            <span>Vencimento</span><span>Descrição</span><span>Categoria</span><span>Fornecedor</span><span>Valor</span><span>Status</span><span></span>
          </div>
          {filtered.length === 0 && <div className="vt-empty-row">Nenhuma conta encontrada.</div>}
          {filtered.map(c => {
            const st = statusConta(c);
            const ss = ST_STYLE[st] || {};
            const fornecedores = window.vtFornecedores ? window.vtFornecedores() : [];
            const fo = fornecedores.find(f => f.id === c.fornecedor);
            return (
              <div key={c.id} className="vt-tr" style={{ display: 'grid', gridTemplateColumns: '100px 2fr 1fr 1fr 100px 100px 80px', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line-2)', alignItems: 'center' }}>
                <span style={{ color: st === 'vencido' ? 'var(--red)' : 'var(--muted)', fontSize: 13, fontWeight: st === 'vencido' ? 700 : 400 }}>{f4Fmt(c.vencimento)}</span>
                <span><b style={{ fontSize: 13.5 }}>{c.descricao || '—'}</b>{c.recorrencia && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{c.recorrencia}</span>}</span>
                <span style={{ fontSize: 13 }}>{c.categoria || '—'}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{fo ? fo.name : c.fornecedorNome || '—'}</span>
                <span style={{ fontWeight: 800 }}>{f4Money(f4ParseMoney(c.valor))}</span>
                <span><span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: ss.bg, color: ss.color }}>{ss.label}</span></span>
                <span style={{ display: 'flex', gap: 4 }}>
                  {!c.pago && <button style={{ fontSize: 11, padding: '3px 7px', borderRadius: 6, border: '1px solid var(--green)', color: 'var(--green)', background: 'var(--green-t)', cursor: 'pointer', fontWeight: 700 }} onClick={() => baixar(c.id)}>Pagar</button>}
                  <button style={{ fontSize: 11, padding: '3px 7px', borderRadius: 6, border: '1px solid var(--line)', color: 'var(--muted)', background: 'var(--card)', cursor: 'pointer' }} onClick={() => setModal(c)}>✏️</button>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <div className="fin-modal-bg" onClick={() => setModal(null)}>
          <div className="fin-modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <h3>{modal.id ? 'Editar conta' : 'Nova conta a pagar'}</h3>
            <ContasPagarForm data={modal} cats={CATS} onClose={() => setModal(null)} onSave={saveConta} />
          </div>
        </div>
      )}
    </div>
  );
}

function ContasPagarForm({ data, cats, onClose, onSave }) {
  const [f, setF] = vtUseState({ ...data });
  const s = k => v => setF(p => ({ ...p, [k]: v }));
  const fornecedores = window.vtFornecedores ? window.vtFornecedores() : [];
  const RECS = ['Única', 'Mensal', 'Trimestral', 'Semestral', 'Anual'];
  return (
    <>
      <div className="vt-form-row">
        <VtField label="Descrição *" value={f.descricao || ''} onChange={s('descricao')} width="62%" />
        <VtField label="Valor" value={f.valor || ''} onChange={v => s('valor')(window.maskMoney ? window.maskMoney(v) : v)} width="34%" placeholder="R$ 0,00" />
      </div>
      <div className="vt-form-row">
        <VtField label="Vencimento" value={f.vencimento || ''} onChange={s('vencimento')} type="date" width="32%" />
        <label className="vtf" style={{ width: '32%' }}>
          <span className="vtf-label">Categoria</span>
          <span className="vtf-inputwrap">
            <select className="vtf-input" value={f.categoria || ''} onChange={e => s('categoria')(e.target.value)}>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </span>
        </label>
        <label className="vtf" style={{ width: '32%' }}>
          <span className="vtf-label">Recorrência</span>
          <span className="vtf-inputwrap">
            <select className="vtf-input" value={f.recorrencia || 'Única'} onChange={e => s('recorrencia')(e.target.value)}>
              {RECS.map(r => <option key={r}>{r}</option>)}
            </select>
          </span>
        </label>
      </div>
      <label className="vtf">
        <span className="vtf-label">Fornecedor (opcional)</span>
        <span className="vtf-inputwrap">
          <select className="vtf-input" value={f.fornecedor || ''} onChange={e => s('fornecedor')(e.target.value)}>
            <option value="">Selecione...</option>
            {fornecedores.map(fo => <option key={fo.id} value={fo.id}>{fo.name}</option>)}
          </select>
        </span>
      </label>
      <label className="vtf"><span className="vtf-label">Observação</span><span className="vtf-inputwrap"><input className="vtf-input" value={f.obs || ''} onChange={e => s('obs')(e.target.value)} /></span></label>
      <div className="fin-modal-actions" style={{ marginTop: 16 }}>
        <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="vt-btn-primary" onClick={() => {
          if (!f.descricao) { window.vtToast && window.vtToast('Informe a descrição.', 'err'); return; }
          onSave({ ...f });
        }}>Salvar</button>
      </div>
    </>
  );
}

/* ============================================================
   Aba: DRE por Competência
   ============================================================ */
function DRECompetencia({ fin }) {
  const [regime, setRegime] = vtUseState('caixa');
  const [ano, setAno] = vtUseState(new Date().getFullYear());
  const tx = (fin && fin.tx) || [];

  const txByMonth = (kind, m) => {
    return tx.filter(t => {
      const iso = regime === 'caixa'
        ? (t.paidAt || t.date || '').slice(0, 10)
        : (t.date || t.paidAt || '').slice(0, 10);
      if (iso.slice(0, 4) !== String(ano)) return false;
      if (parseInt(iso.slice(5, 7), 10) - 1 !== m) return false;
      if (regime === 'caixa' && t.status !== 'pago' && t.status !== 'recebido') return false;
      return kind === 'receita' ? (t.kind === 'receita' || t.type === 'entrada') : (t.kind === 'custo' || t.type === 'saida');
    }).reduce((s, t) => s + Number(t.value || t.val || 0), 0);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['caixa','Regime de Caixa'],['competencia','Regime de Competência']].map(([id, label]) => (
            <button key={id} onClick={() => setRegime(id)}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--line)', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: regime === id ? 'var(--navy)' : 'var(--card)', color: regime === id ? '#fff' : 'var(--muted)' }}>
              {label}
            </button>
          ))}
        </div>
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          style={{ padding: '7px 12px', border: '1px solid var(--line)', borderRadius: 9, fontFamily: 'inherit', fontSize: 14 }}>
          {[new Date().getFullYear()-1, new Date().getFullYear(), new Date().getFullYear()+1].map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--navy)', color: '#fff' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, position: 'sticky', left: 0, background: 'var(--navy)' }}>Indicador</th>
              {f4Months.map((m, i) => <th key={m} style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, minWidth: 80 }}>{m}/{String(ano).slice(2)}</th>)}
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Receita bruta', kind: 'receita', isTotal: false, color: 'var(--green)' },
              { label: 'Despesas', kind: 'custo', isTotal: false, color: 'var(--red)', negate: true },
              { label: 'Resultado líquido', isTotal: true, color: 'var(--navy)' },
            ].map((row, ri) => {
              const vals = f4Months.map((_, m) => {
                if (row.isTotal) {
                  return txByMonth('receita', m) - txByMonth('custo', m);
                }
                const v = txByMonth(row.kind, m);
                return row.negate ? -v : v;
              });
              const total = vals.reduce((s, v) => s + v, 0);
              return (
                <tr key={row.label} style={{ background: row.isTotal ? 'var(--teal-t)' : (ri % 2 === 0 ? 'var(--card)' : 'var(--bg)'), borderBottom: '1px solid var(--line-2)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: row.isTotal ? 800 : 600, color: row.isTotal ? 'var(--teal-d)' : 'var(--ink)', position: 'sticky', left: 0, background: row.isTotal ? 'var(--teal-t)' : (ri % 2 === 0 ? 'var(--card)' : 'var(--bg)') }}>
                    {row.label}
                  </td>
                  {vals.map((v, i) => (
                    <td key={i} style={{ padding: '10px 10px', textAlign: 'right', color: v < 0 ? 'var(--red)' : v > 0 ? row.color || 'var(--ink)' : 'var(--faint)', fontWeight: row.isTotal ? 800 : 400 }}>
                      {v !== 0 ? f4Money(Math.abs(v)) : '—'}
                    </td>
                  ))}
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: total < 0 ? 'var(--red)' : 'var(--green)' }}>
                    {f4Money(Math.abs(total))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
        {regime === 'caixa' ? '💡 Regime de caixa: considera apenas transações efetivamente recebidas/pagas.' : '💡 Regime de competência: considera todas as transações pela data de competência, independente do pagamento.'}
      </p>
    </div>
  );
}

/* ============================================================
   Aba: Fluxo de Caixa (previsto vs real)
   ============================================================ */
function FluxoCaixaPrevistoReal({ fin }) {
  const [period, setP] = vtUseState('mes');
  const today = f4Today();
  const mStart = today.slice(0, 7) + '-01';
  const mEnd = today.slice(0, 7) + '-31';
  const tx = (fin && fin.tx) || [];
  const appts = ((window.VtStore && window.VtStore.getData()) || {}).agendaAppts || [];

  // Receitas reais (pagas)
  const reais = tx.filter(t => (t.kind === 'receita' || t.type === 'entrada') && t.status === 'pago' && (t.paidAt || t.date || '').slice(0, 7) === today.slice(0, 7));

  // Receitas previstas (pendentes + agendamentos futuros estimados)
  const previstas = tx.filter(t => (t.kind === 'receita' || t.type === 'entrada') && t.status === 'pendente' && (t.date || '').slice(0, 7) === today.slice(0, 7));

  // Despesas reais
  const despReais = tx.filter(t => (t.kind === 'custo' || t.type === 'saida') && t.status === 'pago' && (t.paidAt || t.date || '').slice(0, 7) === today.slice(0, 7));

  // Contas a pagar previstas
  const contasPagar = ((window.VtStore && window.VtStore.getData()) || {}).contasPagar || [];
  const despPrev = contasPagar.filter(c => !c.pago && (c.vencimento || '').slice(0, 7) === today.slice(0, 7));

  const totalRecReal = reais.reduce((s, t) => s + Number(t.value || t.val || 0), 0);
  const totalRecPrev = previstas.reduce((s, t) => s + Number(t.value || t.val || 0), 0);
  const totalDespReal = despReais.reduce((s, t) => s + Number(t.value || t.val || 0), 0);
  const totalDespPrev = despPrev.reduce((s, c) => s + f4ParseMoney(c.valor), 0);

  const saldoReal = totalRecReal - totalDespReal;
  const saldoPrevisto = (totalRecReal + totalRecPrev) - (totalDespReal + totalDespPrev);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Receitas recebidas', value: totalRecReal, color: 'var(--green)', bg: 'var(--green-t)' },
          { label: 'Receitas previstas', value: totalRecPrev, color: '#059669', bg: '#d1fae5' },
          { label: 'Despesas pagas', value: totalDespReal, color: 'var(--red)', bg: 'var(--red-t)' },
          { label: 'Despesas previstas', value: totalDespPrev, color: '#dc2626', bg: '#fee2e2' },
          { label: 'Saldo real', value: saldoReal, color: saldoReal >= 0 ? 'var(--green)' : 'var(--red)', bg: saldoReal >= 0 ? 'var(--green-t)' : 'var(--red-t)' },
          { label: 'Saldo previsto', value: saldoPrevisto, color: saldoPrevisto >= 0 ? 'var(--teal-d)' : 'var(--red)', bg: saldoPrevisto >= 0 ? 'var(--teal-t)' : 'var(--red-t)' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.color}30`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 12.5, color: c.color, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color, marginTop: 4 }}>{f4Money(c.value)}</div>
          </div>
        ))}
      </div>

      <div className="vt-card vt-sec" style={{ marginBottom: 16 }}>
        <h3 className="vt-sec-title" style={{ marginBottom: 12 }}>Receitas pendentes (a receber este mês)</h3>
        {previstas.length === 0 ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Sem receitas pendentes.</p> : previstas.map(t => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line-2)' }}>
            <div>
              <b style={{ fontSize: 13.5 }}>{t.desc || '—'}</b>
              <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{t.patient || ''}</span>
            </div>
            <span style={{ fontWeight: 800, color: 'var(--green)' }}>{f4Money(t.value || t.val || 0)}</span>
          </div>
        ))}
      </div>

      <div className="vt-card vt-sec">
        <h3 className="vt-sec-title" style={{ marginBottom: 12 }}>Despesas previstas (a vencer este mês)</h3>
        {despPrev.length === 0 ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Sem despesas pendentes para este mês.</p> : despPrev.map(c => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line-2)' }}>
            <div>
              <b style={{ fontSize: 13.5 }}>{c.descricao || '—'}</b>
              <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{c.categoria} · vence {f4Fmt(c.vencimento)}</span>
            </div>
            <span style={{ fontWeight: 800, color: 'var(--red)' }}>{f4Money(f4ParseMoney(c.valor))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   FinancasModuleV4 — wrapper que extende o módulo existente
   ============================================================ */
function FinancasModuleV4() {
  const [tab, setTab] = vtUseState('visao');
  const [fin, setFin] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.fin) || { tx: [] };
  });

  const TABS = [
    { id: 'visao',        label: 'Visão Geral' },
    { id: 'fluxo',        label: 'Fluxo de Caixa' },
    { id: 'fluxo_prev',   label: 'Fluxo Previsto' },
    { id: 'receitas',     label: 'Receitas' },
    { id: 'despesas',     label: 'Despesas' },
    { id: 'contas_pagar', label: 'Contas a Pagar' },
    { id: 'contas_banco', label: 'Contas e Cartões' },
    { id: 'conciliacao',  label: 'Conciliação' },
    { id: 'dre',          label: 'DRE' },
    { id: 'orcamentos',   label: 'Orçamentos' },
    { id: 'precificacao', label: 'Precificação' },
    { id: 'comissoes',    label: 'Comissões' },
    { id: 'assinaturas',  label: 'Assinaturas' },
    { id: 'pagamentos',   label: 'Pagamentos' },
    { id: 'projecoes',    label: 'Projeções' },
    { id: 'ia',           label: 'IA Financeira' },
  ];

  // Abas cujo conteúdo vive no FinancasModule original
  const OLD_TABS = ['visao','fluxo','receitas','despesas','orcamentos','precificacao','comissoes','assinaturas','pagamentos','projecoes','ia'];

  return (
    <div>
      <div className="vt-page-head">
        <h1>Financeiro</h1>
        <p>Gestão financeira completa da clínica</p>
      </div>

      {/* Único tab bar unificado */}
      <div className="fin-tabs">
        {TABS.map(t => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das abas originais — hideTabs suprime o header/tabs interno */}
      {OLD_TABS.includes(tab) && <FinancasModule key={tab} hideTabs={true} initialTab={tab} />}

      {/* Conteúdo das abas novas v4 */}
      {tab === 'fluxo_prev'   && <FluxoCaixaPrevistoReal fin={fin} />}
      {tab === 'contas_pagar' && <ContasPagarV4 />}
      {tab === 'contas_banco' && <ContasCartoes fin={fin} />}
      {tab === 'conciliacao'  && <ConciliacaoCartoes fin={fin} />}
      {tab === 'dre'          && <DRECompetencia fin={fin} />}
    </div>
  );
}
