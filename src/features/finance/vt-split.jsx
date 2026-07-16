/* ============================================================
   VetTooth Pro — Split de Pagamento
   Cadastro de prestadores · regras (percentual / valor fixo /
   saldo) · simulação · taxa de gateway · relatório de repasses.
   ============================================================ */
const { useState: spUse } = React;

window.vtPrestadores = function () { const d = window.VtStore && window.VtStore.getData(); return (d && d.prestadores) || []; };
window.vtSavePrestadores = function (l) { if (window.VtStore) window.VtStore.setData({ prestadores: l }); };
window.vtSplitCfg = function () { const d = window.VtStore && window.VtStore.getData(); return Object.assign({ taxa: 2.5 }, (d && d.splitCfg) || {}); };
window.vtSaveSplitCfg = function (c) { if (window.VtStore) window.VtStore.setData({ splitCfg: c }); };

window.SPLIT_TIPOS = ['Anestesista', 'Cirurgião', 'Auxiliar', 'Hospital', 'Centro cirúrgico', 'Laboratório', 'Veterinário volante', 'Outro'];

/* calcula o rateio: participantes [{nome, modo:'percentual'|'fixo'|'saldo', valor}] */
window.vtCalcSplit = function (total, participantes, taxaPct) {
  total = Number(total) || 0;
  const taxa = Number(taxaPct) || 0;
  const rows = [];
  let usado = 0;
  // primeiro fixos e percentuais
  (participantes || []).forEach((p) => {
    if (p.modo === 'fixo') { const v = Number(p.valor) || 0; rows.push({ ...p, bruto: v }); usado += v; }
    else if (p.modo === 'percentual') { const v = +(total * (Number(p.valor) || 0) / 100).toFixed(2); rows.push({ ...p, bruto: v }); usado += v; }
  });
  // saldo restante
  const saldo = +(total - usado).toFixed(2);
  (participantes || []).forEach((p) => {
    if (p.modo === 'saldo') rows.push({ ...p, bruto: Math.max(0, saldo) });
  });
  // ordena na ordem original
  const ordered = (participantes || []).map((p) => rows.find((r) => r === p || (r.nome === p.nome && r.modo === p.modo && r.valor === p.valor)) || rows.shift());
  // aplica taxa: a operadora cobra da CLÍNICA (participante "saldo"), não de cada prestador.
  // cada prestador recebe o valor cheio; a soma das taxas é abatida do líquido do saldo.
  let totalTaxaPrest = 0;
  (participantes || []).forEach((p, idx) => {
    if (p.modo !== 'saldo') { const r = rows.find((x) => x.__id === p.__id) || rows[idx]; const bruto = r ? r.bruto : 0; totalTaxaPrest += +(bruto * taxa / 100).toFixed(2); }
  });
  totalTaxaPrest = +totalTaxaPrest.toFixed(2);
  const final = (participantes || []).map((p, idx) => {
    const r = rows.find((x) => x.__id === p.__id) || rows[idx];
    const bruto = r ? r.bruto : 0;
    // taxa do gateway sobre o repasse do saldo também é da clínica
    const taxaSaldo = p.modo === 'saldo' ? +(bruto * taxa / 100).toFixed(2) : 0;
    const taxaClinica = p.modo === 'saldo' ? +(totalTaxaPrest + taxaSaldo).toFixed(2) : 0;
    const liquido = p.modo === 'saldo' ? +(bruto - taxaClinica).toFixed(2) : bruto;
    return { nome: p.nome, tipo: p.tipo, modo: p.modo, valor: p.valor, bruto: bruto, taxa: taxaClinica, liquido: liquido };
  });
  const totalBruto = final.reduce((s, r) => s + r.bruto, 0);
  const totalTaxa = final.reduce((s, r) => s + r.taxa, 0);
  return { rows: final, totalBruto: +totalBruto.toFixed(2), totalTaxa: +totalTaxa.toFixed(2), saldoSobra: +(total - totalBruto).toFixed(2) };
};

/* ---------- Aba Split (no Financeiro) ---------- */
function SplitTab() {
  const [prest, setPrest] = spUse(() => window.vtPrestadores());
  const [cfg, setCfg] = spUse(() => window.vtSplitCfg());
  const [modal, setModal] = spUse(null);
  const [sim, setSim] = spUse({ total: '', parts: [] });
  const persist = (l) => { setPrest(l); window.vtSavePrestadores(l); };
  const saveCfg = (c) => { setCfg(c); window.vtSaveSplitCfg(c); };
  const blank = { nome: '', doc: '', tipo: 'Anestesista', banco: '', agencia: '', conta: '', pix: '', gateway: '', pctPadrao: '', fixoPadrao: '', ativo: true };
  const savePrest = (f) => {
    if (!f.nome || !f.nome.trim()) { window.vtToast('Informe o nome do prestador.', 'err'); return; }
    if (f.id) persist(prest.map((p) => p.id === f.id ? f : p));
    else persist([{ ...f, id: 'PS' + Date.now().toString(36) }, ...prest]);
    setModal(null); window.vtToast('Prestador salvo.', 'ok');
  };
  const delPrest = (id) => persist(prest.filter((p) => p.id !== id));

  const addSimPart = (p) => setSim((s) => ({ ...s, parts: [...s.parts, { __id: 'r' + Date.now().toString(36) + s.parts.length, nome: p ? p.nome : '', tipo: p ? p.tipo : 'Outro', modo: p && p.pctPadrao ? 'percentual' : (p && p.fixoPadrao ? 'fixo' : 'saldo'), valor: p ? (p.pctPadrao || p.fixoPadrao || '') : '' }] }));
  const updPart = (i, k, v) => setSim((s) => ({ ...s, parts: s.parts.map((p, j) => j === i ? { ...p, [k]: v } : p) }));
  const delPart = (i) => setSim((s) => ({ ...s, parts: s.parts.filter((_, j) => j !== i) }));
  const calc = window.vtCalcSplit(window.PR.parseMoney(sim.total) || Number(sim.total) || 0, sim.parts, cfg.taxa);

  return (
    <div>
      <div className="vt-card vt-sec" style={{ marginBottom: 16 }}>
        <div className="vt-head-row" style={{ marginBottom: 8 }}>
          <div><h3 className="vt-sec-title" style={{ margin: 0 }}>Prestadores de serviço</h3><p className="vt-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Cadastro para split de pagamento (rateio automático do recebimento).</p></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>Taxa de split: <input value={cfg.taxa} onChange={(e) => saveCfg({ ...cfg, taxa: e.target.value })} style={{ width: 56, border: '1px solid var(--line)', borderRadius: 7, padding: '5px 7px', textAlign: 'right' }} />%</label>
            <button className="vt-btn-primary" onClick={() => setModal(blank)}><VtIcon name="plus" size={15} /> Novo prestador</button>
          </div>
        </div>
        {prest.length === 0 ? <p className="pr-empty">Nenhum prestador cadastrado.</p> : (
          <table className="pr-dtable">
            <thead><tr><th>Prestador</th><th>Tipo</th><th>Banco / PIX</th><th>Padrão</th><th></th></tr></thead>
            <tbody>
              {prest.map((p) => (
                <tr key={p.id}>
                  <td><b style={{ fontWeight: 700 }}>{p.nome}</b><br /><span className="vt-muted" style={{ fontSize: 11.5 }}>{p.doc || '—'}</span></td>
                  <td><span className="vt-tag">{p.tipo}</span></td>
                  <td>{p.pix ? 'PIX: ' + p.pix : [p.banco, p.agencia, p.conta].filter(Boolean).join(' · ') || '—'}</td>
                  <td>{p.pctPadrao ? p.pctPadrao + '%' : (p.fixoPadrao ? window.PR.money(p.fixoPadrao) : '—')}</td>
                  <td className="vt-row-actions"><button className="vt-link" onClick={() => setModal(p)}>Editar</button><button className="pr-del-btn" onClick={() => delPrest(p.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="vt-card vt-sec">
        <h3 className="vt-sec-title">Simulação de rateio</h3>
        <div className="vt-form-row" style={{ alignItems: 'flex-end' }}>
          <label className="vtf" style={{ width: '40%' }}><span className="vtf-label">Valor total do procedimento</span><span className="vtf-inputwrap"><input className="vtf-input" value={sim.total} onChange={(e) => setSim({ ...sim, total: window.maskMoney ? window.maskMoney(e.target.value) : e.target.value })} placeholder="R$ 0,00" /></span></label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', paddingBottom: 2 }}>
            <button className="vt-btn-ghost" onClick={() => addSimPart(null)}><VtIcon name="plus" size={14} /> Participante</button>
            {prest.filter((p) => p.ativo !== false).map((p) => <button key={p.id} className="pr-quickpick-btn" style={prChipStyle(false)} onClick={() => addSimPart(p)}>+ {p.nome}</button>)}
          </div>
        </div>
        {sim.parts.length > 0 && (
          <table className="pr-dtable" style={{ marginTop: 10 }}>
            <thead><tr><th>Participante</th><th>Tipo</th><th style={{ width: 130 }}>Forma</th><th style={{ width: 110 }}>Valor / %</th><th className="num">Repasse</th><th className="num">Taxa (clínica)</th><th className="num">Líquido</th><th></th></tr></thead>
            <tbody>
              {sim.parts.map((p, i) => {
                const r = calc.rows[i] || {};
                return (
                  <tr key={p.__id}>
                    <td><input value={p.nome} onChange={(e) => updPart(i, 'nome', e.target.value)} placeholder="Nome" /></td>
                    <td><select value={p.tipo} onChange={(e) => updPart(i, 'tipo', e.target.value)}>{window.SPLIT_TIPOS.map((t) => <option key={t}>{t}</option>)}</select></td>
                    <td><select value={p.modo} onChange={(e) => updPart(i, 'modo', e.target.value)}><option value="percentual">Percentual</option><option value="fixo">Valor fixo</option><option value="saldo">Saldo restante</option></select></td>
                    <td>{p.modo === 'saldo' ? <span className="vt-muted" style={{ fontSize: 12 }}>automático</span> : <input className="num" value={p.valor} onChange={(e) => updPart(i, 'valor', e.target.value.replace(/[^\d,.]/g, ''))} placeholder={p.modo === 'percentual' ? '%' : 'R$'} />}</td>
                    <td className="num">{window.PR.money(r.bruto || 0)}</td>
                    <td className="num" style={{ color: 'var(--red)' }}>{r.taxa ? '-' + window.PR.money(r.taxa) : '—'}</td>
                    <td className="num" style={{ fontWeight: 700, color: 'var(--green)' }}>{window.PR.money(r.liquido || 0)}</td>
                    <td><button className="pr-del-btn" onClick={() => delPart(i)}>✕</button></td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan="4" style={{ fontWeight: 700 }}>Totais</td>
                <td className="num" style={{ fontWeight: 700 }}>{window.PR.money(calc.totalBruto)}</td>
                <td className="num" style={{ fontWeight: 700, color: 'var(--red)' }}>-{window.PR.money(calc.totalTaxa)}</td>
                <td className="num" style={{ fontWeight: 800, color: 'var(--teal-d)' }}>{window.PR.money(calc.totalBruto - calc.totalTaxa)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
        {sim.parts.length > 0 && !sim.parts.some((p) => p.modo === 'saldo') && (
          <p className="vt-ai-note" style={{ marginTop: 10 }}><VtIcon name="spark" size={15} /> Adicione um participante <b>"Saldo restante"</b> (você/a clínica) — é dele que sai a taxa da operadora.</p>
        )}
        {sim.parts.length > 0 && Math.abs(calc.saldoSobra) > 0.01 && (
          <p className="vt-ai-note" style={{ marginTop: 10 }}><VtIcon name="spark" size={15} /> {calc.saldoSobra > 0 ? `Sobra de ${window.PR.money(calc.saldoSobra)} não distribuída — adicione um participante "Saldo restante".` : `Distribuição excede o total em ${window.PR.money(-calc.saldoSobra)} — revise os valores fixos.`}</p>
        )}
        {sim.parts.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="vt-btn-primary" onClick={() => { const d = window.VtStore.getData(); const reps = (d.splitReps || []); const novo = { id: 'SR' + Date.now().toString(36), date: window.PR.todayBR(), total: window.PR.parseMoney(sim.total) || Number(sim.total) || 0, rows: calc.rows, totalTaxa: calc.totalTaxa, status: 'pendente' }; window.VtStore.setData({ splitReps: [novo, ...reps] }); window.vtToast('Rateio registrado em repasses pendentes.', 'ok'); }}>Registrar repasse</button>
            <button className="vt-btn-ghost" onClick={() => setSim({ total: '', parts: [] })}>Limpar</button>
          </div>
        )}
      </div>

      <SplitRepasses />
      {modal && <PrestadorModal data={modal} onClose={() => setModal(null)} onSave={savePrest} />}
    </div>
  );
}

function SplitRepasses() {
  const [reps, setReps] = spUse(() => ((window.VtStore.getData() || {}).splitReps) || []);
  const setStatus = (id, status) => { const next = reps.map((r) => r.id === id ? { ...r, status } : r); setReps(next); window.VtStore.setData({ splitReps: next }); };
  const del = (id) => { const next = reps.filter((r) => r.id !== id); setReps(next); window.VtStore.setData({ splitReps: next }); };
  if (!reps.length) return null;
  return (
    <div className="vt-card vt-sec" style={{ marginTop: 16 }}>
      <h3 className="vt-sec-title">Repasses {reps.filter((r) => r.status === 'pendente').length ? <span className="vt-tag amber">{reps.filter((r) => r.status === 'pendente').length} pendente(s)</span> : null}</h3>
      <div className="vt-stack">
        {reps.map((r) => (
          <div key={r.id} className="vt-card vt-sec" style={{ padding: 12 }}>
            <div className="vt-head-row" style={{ marginBottom: 6 }}>
              <div><b>{r.date} · {window.PR.money(r.total)}</b> <span className="vt-muted" style={{ fontSize: 12 }}>· taxa {window.PR.money(r.totalTaxa)}</span></div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className={`pr-status-pill ${r.status === 'pago' ? 'finalizado' : 'andamento'}`}>{r.status === 'pago' ? 'Repassado' : 'Pendente'}</span>
                {r.status !== 'pago' && <button className="pr-qbtn" style={{ padding: '5px 10px', fontSize: 11.5 }} onClick={() => setStatus(r.id, 'pago')}>Marcar repassado</button>}
                <button className="pr-del-btn" onClick={() => del(r.id)}>✕</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {r.rows.map((row, i) => <span key={i} className="vt-tag" style={{ fontSize: 12 }}>{row.nome || row.tipo}: {window.PR.money(row.liquido)}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrestadorModal({ data, onClose, onSave }) {
  const [f, setF] = spUse({ ...data });
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h3>{data.id ? 'Editar prestador' : 'Novo prestador'}</h3>
        <div className="vt-form-row">
          <VtField label="Nome" value={f.nome} onChange={s('nome')} width="58%" />
          <label className="vtf" style={{ width: '38%' }}><span className="vtf-label">Tipo</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.tipo} onChange={(e) => s('tipo')(e.target.value)}>{window.SPLIT_TIPOS.map((t) => <option key={t}>{t}</option>)}</select></span></label>
        </div>
        <div className="vt-form-row"><VtField label="CPF / CNPJ" value={f.doc} onChange={(v) => s('doc')(window.onlyD(v).length > 11 ? window.maskCNPJ(v) : window.maskCPF(v))} width="100%" /></div>
        <div className="vt-form-sec" style={{ marginTop: 6 }}>Dados bancários</div>
        <div className="vt-form-row">
          <VtField label="Banco" value={f.banco} onChange={s('banco')} width="40%" />
          <VtField label="Agência" value={f.agencia} onChange={s('agencia')} width="26%" />
          <VtField label="Conta" value={f.conta} onChange={s('conta')} width="30%" />
        </div>
        <div className="vt-form-row">
          <VtField label="Chave PIX" value={f.pix} onChange={s('pix')} width="58%" />
          <VtField label="Conta no gateway" value={f.gateway} onChange={s('gateway')} placeholder="ID recebedor" width="38%" />
        </div>
        <div className="vt-form-sec" style={{ marginTop: 6 }}>Padrão de rateio (opcional)</div>
        <div className="vt-form-row">
          <VtField label="Percentual padrão (%)" value={f.pctPadrao} onChange={s('pctPadrao')} width="48%" />
          <VtField label="Valor fixo padrão (R$)" value={f.fixoPadrao} onChange={s('fixoPadrao')} width="48%" />
        </div>
        <label className="docs-check" style={{ marginTop: 6 }}><input type="checkbox" checked={f.ativo !== false} onChange={(e) => s('ativo')(e.target.checked)} /><span>Prestador ativo</span></label>
        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={() => onSave(f)}>Salvar prestador</button>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { SplitTab, PrestadorModal, SplitRepasses });
