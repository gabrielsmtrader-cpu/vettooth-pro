/* ============================================================
   VetTooth Pro — Estoque v3
   Situação automática · Análise · Compras · Inventário
   Outras Saídas · Fornecedores · Markup / Preço de venda
   ============================================================ */

/* ---------- helpers ---------- */
const stqMoney = (n) => window.vtMoney(n);
const stqToday = () => new Date().toISOString().slice(0, 10);
const stqFmt = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
function stqUID() { return 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function stqDaysAgo(iso) {
  if (!iso) return 9999;
  const d = new Date(iso + 'T00:00:00'); const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((now - d) / 86400000);
}
function stqExpDaysLeft(exp) {
  if (!exp) return null;
  let iso = exp;
  const m = exp.match(/^(\d{2})\/(\d{4})$/);
  if (m) iso = `${m[2]}-${m[1]}-01`;
  const d = new Date(iso + 'T00:00:00'); const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((d - now) / 86400000);
}

/* Situação automática (estilo Simples Vet) */
function stqSituacao(item, moves) {
  const qty = Number(item.qty) || 0;
  const min = Number(item.min) || 0;
  const max = Number(item.max) || 0;
  // Verificar se é "novo" (cadastrado há menos de 30 dias)
  if (item.createdAt && stqDaysAgo(item.createdAt) < 30) return 'Novo';
  // Verificar última saída (parado = sem saídas em 90+ dias)
  const saidas = (moves || []).filter(m => m.itemId === item.id && m.tipo === 'Saída');
  const lastSaida = saidas.length ? saidas.reduce((a, b) => (a.isoDate || '') > (b.isoDate || '') ? a : b) : null;
  const diasSemSaida = lastSaida ? stqDaysAgo(lastSaida.isoDate) : (item.createdAt ? stqDaysAgo(item.createdAt) : 9999);
  if (qty <= min) return 'Repor';
  if (max > 0 && qty > max) return 'Excesso';
  if (diasSemSaida >= 90 && qty > 0) return 'Parado';
  return 'Adequado';
}

const STQ_SIT_STYLE = {
  Adequado: { color: 'var(--green)', bg: 'var(--green-t)' },
  Repor:    { color: 'var(--red)',   bg: 'var(--red-t)' },
  Excesso:  { color: 'var(--amber)', bg: 'var(--amber-t)' },
  Parado:   { color: 'var(--muted)', bg: '#eef1f5' },
  Novo:     { color: '#8b5cf6',      bg: '#ede9fe' },
};

/* ---------- Fornecedor helpers ---------- */
window.vtFornecedores = function() {
  const d = window.VtStore && window.VtStore.getData();
  return (d && d.fornecedores) || [];
};
window.vtSaveFornecedores = function(list) {
  if (window.VtStore) window.VtStore.setData({ fornecedores: list });
};

/* ---------- Compras helpers ---------- */
window.vtCompras = function() {
  const d = window.VtStore && window.VtStore.getData();
  return (d && d.compras) || [];
};
window.vtSaveCompras = function(list) {
  if (window.VtStore) window.VtStore.setData({ compras: list });
};

/* ============================================================
   Modal: Cadastro / Edição de Produto
   ============================================================ */
function EstoqueProdutoModal({ data, fornecedores, onClose, onSave }) {
  const blank = {
    categoria: 'Medicamento', name: '', barcode: '', grupo: '', marca: '',
    lot: '', exp: '', supplier: '', supplierName: '',
    qty: 0, min: 0, max: 0, unit: 'fr', conteudo: '', unidConteudo: 'mL',
    cost: '', markup: '', preco_venda: '', area: '',
    obs: '', createdAt: stqToday(),
  };
  const [f, setF] = vtUseState({ ...blank, ...data });
  const s = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  // Auto-calcular preço de venda quando custo ou markup mudar
  const recalcPreco = (cost, markup) => {
    const c = window.PR ? window.PR.parseMoney(cost) : Number(String(cost).replace(/[^\d,]/g,'').replace(',','.')) || 0;
    const m = Number(String(markup).replace(',','.')) || 0;
    if (c > 0 && m > 0) return stqMoney(c * (1 + m / 100));
    return '';
  };

  const setCost = (v) => {
    const masked = window.maskMoney ? window.maskMoney(v) : v;
    setF(p => ({ ...p, cost: masked, preco_venda: recalcPreco(masked, p.markup) }));
  };
  const setMarkup = (v) => {
    const clean = v.replace(/[^\d.,]/g,'');
    setF(p => ({ ...p, markup: clean, preco_venda: recalcPreco(p.cost, clean) }));
  };

  const CATS = ['Insumo', 'Medicamento', 'Vacina', 'Material Cirúrgico', 'Produto Odontológico', 'Ração / Dieta'];
  const UNITS = ['fr', 'cx', 'amp', 'un', 'kg', 'g', 'L', 'mL', 'dose', 'rolo', 'par', 'pc'];
  const AREAS = ['', 'Odontologia', 'Cirurgia', 'Diagnóstico', 'Internação', 'Vacinação', 'Geral'];

  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 580, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 18 }}>{data.id ? 'Editar produto' : 'Novo produto'}</h3>

        <div className="vt-form-sec">Identificação</div>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '36%' }}>
            <span className="vtf-label">Categoria</span>
            <span className="vtf-inputwrap">
              <select className="vtf-input" value={f.categoria} onChange={e => s('categoria')(e.target.value)}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </span>
          </label>
          <VtField label="Nome do produto *" value={f.name} onChange={s('name')} width="60%" />
        </div>
        <div className="vt-form-row">
          <VtField label="Código de barras / SKU" value={f.barcode} onChange={s('barcode')} width="32%" placeholder="EAN-13 / interno" />
          <VtField label="Grupo / Tipo" value={f.grupo} onChange={s('grupo')} width="32%" placeholder="Ex.: Anestésico" />
          <VtField label="Marca" value={f.marca} onChange={s('marca')} width="32%" placeholder="Ex.: Zoetis" />
        </div>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '36%' }}>
            <span className="vtf-label">Área de uso</span>
            <span className="vtf-inputwrap">
              <select className="vtf-input" value={f.area} onChange={e => s('area')(e.target.value)}>
                {AREAS.map(a => <option key={a} value={a}>{a || 'Todas'}</option>)}
              </select>
            </span>
          </label>
          <label className="vtf" style={{ width: '32%' }}>
            <span className="vtf-label">Fornecedor</span>
            <span className="vtf-inputwrap">
              <select className="vtf-input" value={f.supplier} onChange={e => s('supplier')(e.target.value)}>
                <option value="">Selecione...</option>
                {fornecedores.map(fo => <option key={fo.id} value={fo.id}>{fo.name}</option>)}
              </select>
            </span>
          </label>
          <VtField label="Validade (MM/AAAA)" value={f.exp} onChange={s('exp')} placeholder="Ex.: 12/2026" width="28%" />
        </div>

        <div className="vt-form-sec" style={{ marginTop: 10 }}>Custo e preço</div>
        <div className="vt-form-row">
          <VtField label="Custo de aquisição" value={f.cost} onChange={setCost} width="28%" placeholder="R$ 0,00" />
          <VtField label="Markup %" value={f.markup} onChange={setMarkup} width="22%" placeholder="Ex.: 150" />
          <div style={{ width: '28%' }}>
            <div className="vtf-label" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Preço de venda</div>
            <div style={{ background: 'var(--green-t)', color: 'var(--green)', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px', fontWeight: 800, fontSize: 14 }}>
              {f.preco_venda || '—'}
            </div>
          </div>
          <label className="vtf" style={{ width: '18%' }}>
            <span className="vtf-label">Unid.</span>
            <span className="vtf-inputwrap">
              <select className="vtf-input" value={f.unit} onChange={e => s('unit')(e.target.value)}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </span>
          </label>
        </div>

        <div className="vt-form-sec" style={{ marginTop: 10 }}>Estoque</div>
        <div className="vt-form-row">
          <VtField label="Lote" value={f.lot} onChange={s('lot')} width="28%" />
          <VtField label="Qtd. em estoque" value={String(f.qty)} onChange={v => s('qty')(window.onlyD ? window.onlyD(v) : v)} width="22%" />
          <VtField label="Estoque mínimo" value={String(f.min)} onChange={v => s('min')(window.onlyD ? window.onlyD(v) : v)} width="22%" />
          <VtField label="Estoque máximo" value={String(f.max || '')} onChange={v => s('max')(window.onlyD ? window.onlyD(v) : v)} placeholder="0 = sem limite" width="24%" />
        </div>

        <div className="fin-modal-actions" style={{ marginTop: 16 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={() => {
            if (!f.name || !f.name.trim()) { window.vtToast && window.vtToast('Informe o nome do produto.', 'err'); return; }
            onSave({ ...f, qty: Number(f.qty) || 0, min: Number(f.min) || 0, max: Number(f.max) || 0 });
          }}>Salvar produto</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Modal: Compra (entrada de NF)
   ============================================================ */
function CompraModal({ inv, fornecedores, onClose, onSave }) {
  const [f, setF] = vtUseState({
    data: stqToday(), fornecedor: '', nf: '', valorTotal: '',
    itens: [{ itemId: '', qty: '', custo: '' }],
  });
  const s = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  const addItem = () => setF(p => ({ ...p, itens: [...p.itens, { itemId: '', qty: '', custo: '' }] }));
  const setItem = (idx, k, v) => setF(p => { const itens = [...p.itens]; itens[idx] = { ...itens[idx], [k]: v }; return { ...p, itens }; });
  const removeItem = (idx) => setF(p => ({ ...p, itens: p.itens.filter((_, i) => i !== idx) }));

  const total = f.itens.reduce((s, it) => {
    const c = window.PR ? window.PR.parseMoney(it.custo) : Number(String(it.custo || '').replace(/[^\d,]/g,'').replace(',','.')) || 0;
    return s + (c * (Number(it.qty) || 0));
  }, 0);

  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 620, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3>Registrar compra</h3>
        <div className="vt-form-row">
          <VtField label="Data de entrada" value={f.data} onChange={s('data')} type="date" width="28%" />
          <label className="vtf" style={{ width: '38%' }}>
            <span className="vtf-label">Fornecedor</span>
            <span className="vtf-inputwrap">
              <select className="vtf-input" value={f.fornecedor} onChange={e => s('fornecedor')(e.target.value)}>
                <option value="">Selecione...</option>
                {fornecedores.map(fo => <option key={fo.id} value={fo.id}>{fo.name}</option>)}
              </select>
            </span>
          </label>
          <VtField label="N.º da NF" value={f.nf} onChange={s('nf')} width="30%" placeholder="Ex.: 10234" />
        </div>

        <div className="vt-form-sec" style={{ marginTop: 10 }}>Itens comprados</div>
        {f.itens.map((it, idx) => (
          <div key={idx} className="vt-form-row" style={{ alignItems: 'flex-end' }}>
            <label className="vtf" style={{ width: '44%' }}>
              <span className="vtf-label">Produto</span>
              <span className="vtf-inputwrap">
                <select className="vtf-input" value={it.itemId} onChange={e => setItem(idx, 'itemId', e.target.value)}>
                  <option value="">Selecione...</option>
                  {inv.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </span>
            </label>
            <VtField label="Qtd." value={it.qty} onChange={v => setItem(idx, 'qty', v)} width="18%" />
            <VtField label="Custo unit." value={it.custo} onChange={v => setItem(idx, 'custo', window.maskMoney ? window.maskMoney(v) : v)} width="24%" placeholder="R$ 0,00" />
            {f.itens.length > 1 && <button style={{ marginBottom: 2, color: 'var(--red)', fontSize: 18, padding: '0 4px' }} onClick={() => removeItem(idx)}>✕</button>}
          </div>
        ))}
        <button className="vt-btn-ghost" style={{ marginBottom: 12 }} onClick={addItem}>+ Adicionar item</button>

        <div style={{ background: 'var(--teal-t)', borderRadius: 10, padding: '10px 14px', fontWeight: 700, color: 'var(--teal-d)', marginBottom: 16 }}>
          Total calculado: {stqMoney(total)}
        </div>

        <div className="fin-modal-actions">
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={() => {
            const valid = f.itens.some(it => it.itemId && Number(it.qty) > 0);
            if (!valid) { window.vtToast && window.vtToast('Adicione pelo menos um item com quantidade.', 'err'); return; }
            onSave({ ...f, totalCalc: total });
          }}>Registrar compra</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Modal: Inventário (contagem física)
   ============================================================ */
function InventarioModal({ inv, onClose, onSave }) {
  const team = (window.vtTeam && window.vtTeam()) || [];
  const [resp, setResp] = vtUseState(window.vtCurrentVet ? window.vtCurrentVet() : ((team[0] || {}).name || ''));
  const [contagens, setContagens] = vtUseState(() => inv.map(i => ({ id: i.id, name: i.name, sist: Number(i.qty) || 0, fisico: '' })));

  const setFisico = (id, v) => setContagens(c => c.map(x => x.id === id ? { ...x, fisico: v } : x));
  const divergentes = contagens.filter(c => c.fisico !== '' && Number(c.fisico) !== c.sist);

  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 600, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3>Inventário físico</h3>
        <label className="vtf" style={{ marginBottom: 14, display: 'block' }}>
          <span className="vtf-label">Responsável pelo inventário</span>
          <span className="vtf-inputwrap">
            <select className="vtf-input" style={{ maxWidth: 260 }} value={resp} onChange={e => setResp(e.target.value)}>
              {team.map(m => <option key={m.id}>{m.name}</option>)}
              {(!team.some(m => m.name === resp) && resp) && <option>{resp}</option>}
            </select>
          </span>
        </label>

        <div style={{ background: 'var(--amber-t)', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: 'var(--amber)', marginBottom: 12 }}>
          Preencha a quantidade física encontrada. Deixe em branco para não alterar o item.
        </div>

        <div className="vt-table" style={{ marginBottom: 12 }}>
          <div className="vt-tr vt-th" style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 80px', gap: 8, padding: '8px 12px' }}>
            <span>Produto</span><span>Sistema</span><span>Físico</span><span>Dif.</span>
          </div>
          {contagens.map(c => {
            const dif = c.fisico !== '' ? Number(c.fisico) - c.sist : null;
            return (
              <div key={c.id} className="vt-tr" style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 80px', gap: 8, padding: '8px 12px', alignItems: 'center', borderBottom: '1px solid var(--line-2)', background: dif !== null && dif !== 0 ? (dif < 0 ? 'var(--red-t)' : 'var(--green-t)') : 'transparent' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>{c.sist}</span>
                <span>
                  <input style={{ width: 80, padding: '5px 8px', border: '1px solid var(--line)', borderRadius: 7, fontFamily: 'inherit', fontSize: 13 }}
                    placeholder="—" value={c.fisico} onChange={e => setFisico(c.id, e.target.value.replace(/[^\d]/g,''))} />
                </span>
                <span style={{ fontWeight: 700, color: dif === null ? 'var(--faint)' : dif > 0 ? 'var(--green)' : dif < 0 ? 'var(--red)' : 'var(--muted)', fontSize: 13 }}>
                  {dif === null ? '—' : dif > 0 ? `+${dif}` : String(dif)}
                </span>
              </div>
            );
          })}
        </div>

        {divergentes.length > 0 && (
          <div style={{ background: 'var(--amber-t)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--amber)', marginBottom: 12 }}>
            <b>{divergentes.length}</b> item(ns) com divergência · Sistema será ajustado automaticamente.
          </div>
        )}

        <div className="fin-modal-actions">
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={() => {
            const ajustes = contagens.filter(c => c.fisico !== '');
            if (!ajustes.length) { window.vtToast && window.vtToast('Nenhuma contagem inserida.', 'err'); return; }
            onSave({ resp, contagens: ajustes, data: stqToday() });
          }}>Confirmar inventário ({divergentes.length} dif.)</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Modal: Outra Saída
   ============================================================ */
function OutraSaidaModal({ inv, onClose, onSave }) {
  const [f, setF] = vtUseState({ itemId: '', qty: '', motivo: 'Uso interno', obs: '', data: stqToday() });
  const s = k => v => setF(p => ({ ...p, [k]: v }));
  const MOTIVOS = ['Uso interno', 'Perda / Avaria', 'Vencimento', 'Doação', 'Devolução', 'Outro'];
  const item = inv.find(i => i.id === f.itemId);

  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
        <h3>Outra saída de estoque</h3>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '55%' }}>
            <span className="vtf-label">Produto</span>
            <span className="vtf-inputwrap">
              <select className="vtf-input" value={f.itemId} onChange={e => s('itemId')(e.target.value)}>
                <option value="">Selecione...</option>
                {inv.map(i => <option key={i.id} value={i.id}>{i.name} ({Number(i.qty)||0})</option>)}
              </select>
            </span>
          </label>
          <VtField label="Quantidade" value={f.qty} onChange={v => s('qty')(v.replace(/[^\d]/g,''))} width="22%" />
          <VtField label="Data" value={f.data} onChange={s('data')} type="date" width="20%" />
        </div>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '48%' }}>
            <span className="vtf-label">Motivo</span>
            <span className="vtf-inputwrap">
              <select className="vtf-input" value={f.motivo} onChange={e => s('motivo')(e.target.value)}>
                {MOTIVOS.map(m => <option key={m}>{m}</option>)}
              </select>
            </span>
          </label>
          <VtField label="Observação" value={f.obs} onChange={s('obs')} width="48%" placeholder="Opcional" />
        </div>
        {item && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Estoque atual: <b>{Number(item.qty)||0} {item.unit}</b> → após saída: <b style={{ color: Number(f.qty) > (Number(item.qty)||0) ? 'var(--red)' : 'var(--green)' }}>{Math.max(0,(Number(item.qty)||0) - (Number(f.qty)||0))} {item.unit}</b></p>}
        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={() => {
            if (!f.itemId || !f.qty) { window.vtToast && window.vtToast('Informe o produto e a quantidade.', 'err'); return; }
            onSave(f);
          }}>Registrar saída</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Modal: Fornecedor
   ============================================================ */
function FornecedorModal({ data, onClose, onSave }) {
  const blank = { name: '', cnpj: '', contato: '', email: '', telefone: '', cidade: '', obs: '' };
  const [f, setF] = vtUseState({ ...blank, ...data });
  const s = k => v => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
        <h3>{data.id ? 'Editar fornecedor' : 'Novo fornecedor'}</h3>
        <div className="vt-form-row">
          <VtField label="Nome / Razão social *" value={f.name} onChange={s('name')} width="62%" />
          <VtField label="CNPJ" value={f.cnpj} onChange={s('cnpj')} width="34%" placeholder="00.000.000/0001-00" />
        </div>
        <div className="vt-form-row">
          <VtField label="Contato" value={f.contato} onChange={s('contato')} width="46%" placeholder="Nome do representante" />
          <VtField label="Telefone / WhatsApp" value={f.telefone} onChange={s('telefone')} width="50%" />
        </div>
        <div className="vt-form-row">
          <VtField label="E-mail" value={f.email} onChange={s('email')} width="58%" />
          <VtField label="Cidade / Estado" value={f.cidade} onChange={s('cidade')} width="38%" />
        </div>
        <label className="vtf"><span className="vtf-label">Observações</span><span className="vtf-inputwrap"><textarea className="vtf-input" style={{ minHeight: 52 }} value={f.obs} onChange={e => s('obs')(e.target.value)} /></span></label>
        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={() => {
            if (!f.name.trim()) { window.vtToast && window.vtToast('Informe o nome do fornecedor.', 'err'); return; }
            onSave({ ...f, name: f.name.trim() });
          }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Modal: Movimentação (entrada/saída/ajuste)
   ============================================================ */
function MovModalV3({ item, tipo, onClose, onSave }) {
  const team = (window.vtTeam && window.vtTeam()) || [];
  const [amount, setAmount] = vtUseState(tipo === 'Ajuste' ? String(item.qty || 0) : '');
  const [resp, setResp] = vtUseState(window.vtCurrentVet ? window.vtCurrentVet() : ((team[0] || {}).name || ''));
  const [obs, setObs] = vtUseState('');
  const cur = Number(item.qty) || 0;
  const amt = Number(String(amount).replace(',', '.')) || 0;
  const novo = tipo === 'Entrada' ? cur + amt : tipo === 'Saída' ? Math.max(0, cur - amt) : amt;
  const tone = tipo === 'Entrada' ? 'var(--green)' : tipo === 'Saída' ? 'var(--red)' : 'var(--navy)';
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ color: tone }}>{tipo} de estoque</h3>
        <p style={{ marginBottom: 14, fontSize: 13 }}>{item.name} · estoque atual <b>{cur} {item.unit}</b></p>
        <div className="vt-form-row">
          <VtField label={tipo === 'Ajuste' ? 'Nova quantidade' : 'Quantidade'} value={amount} onChange={v => setAmount(window.onlyD ? window.onlyD(v) : v)} placeholder="0" width="46%" />
          <label className="vtf" style={{ width: '50%' }}>
            <span className="vtf-label">Responsável</span>
            <span className="vtf-inputwrap">
              <select className="vtf-input" value={resp} onChange={e => setResp(e.target.value)}>
                {team.map(m => <option key={m.id}>{m.name}</option>)}
                {(!team.some(m => m.name === resp) && resp) && <option>{resp}</option>}
              </select>
            </span>
          </label>
        </div>
        <label className="vtf"><span className="vtf-label">Observação (opcional)</span><span className="vtf-inputwrap"><input className="vtf-input" value={obs} onChange={e => setObs(e.target.value)} placeholder={tipo === 'Saída' ? 'Ex.: uso em cirurgia' : 'Ex.: compra NF 1234'} /></span></label>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>Estoque após {tipo.toLowerCase()}: <b style={{ color: tone }}>{novo} {item.unit}</b></p>
        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={() => onSave(item, tipo, amount, resp, obs)}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   EstoqueModule3 — componente principal
   ============================================================ */
function EstoqueModule3() {
  const [inv, setInv] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.inventory) || [];
  });
  const [moves, setMoves] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.inventoryMoves) || [];
  });
  const [compras, setCompras] = vtUseState(() => window.vtCompras());
  const [fornecedores, setFornecedores] = vtUseState(() => window.vtFornecedores());
  const [inventarios, setInventarios] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.inventarios) || [];
  });
  const [outrasSaidas, setOutrasSaidas] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.outrasSaidas) || [];
  });

  const [tab, setTab] = vtUseState('produtos');
  const [filtroSit, setFiltroSit] = vtUseState('Todos');
  const [busca, setBusca] = vtUseState('');
  const [modal, setModal] = vtUseState(null);       // produto
  const [moveModal, setMoveModal] = vtUseState(null);
  const [compraModal, setCompraModal] = vtUseState(false);
  const [invModal, setInvModal] = vtUseState(false);
  const [saidaModal, setSaidaModal] = vtUseState(false);
  const [fornModal, setFornModal] = vtUseState(null);

  /* persistência */
  const saveInv = (next) => { setInv(next); if (window.VtStore) window.VtStore.setData({ inventory: next }); };
  const saveMoves = (next) => { setMoves(next); if (window.VtStore) window.VtStore.setData({ inventoryMoves: next }); };
  const saveCompras = (next) => { setCompras(next); window.vtSaveCompras(next); };
  const saveForn = (next) => { setFornecedores(next); window.vtSaveFornecedores(next); };
  const saveInventarios = (next) => { setInventarios(next); if (window.VtStore) window.VtStore.setData({ inventarios: next }); };
  const saveOutras = (next) => { setOutrasSaidas(next); if (window.VtStore) window.VtStore.setData({ outrasSaidas: next }); };

  /* situação de cada item */
  const sit = (item) => stqSituacao(item, moves);

  /* análise geral */
  const counts = { Todos: inv.length, Repor: 0, Excesso: 0, Parado: 0, Adequado: 0, Novo: 0 };
  inv.forEach(i => { const s = sit(i); if (counts[s] !== undefined) counts[s]++; });
  const totalValue = inv.reduce((s, i) => {
    const c = window.PR ? window.PR.parseMoney(i.cost) : 0;
    return s + c * (Number(i.qty) || 0);
  }, 0);

  /* filtros */
  const list = inv.filter(i => {
    if (filtroSit !== 'Todos' && sit(i) !== filtroSit) return false;
    if (busca && !i.name.toLowerCase().includes(busca.toLowerCase()) && !(i.barcode || '').includes(busca)) return false;
    return true;
  });

  /* expiração */
  const expAlert = inv.filter(i => { const d = stqExpDaysLeft(i.exp); return d !== null && d <= 60 && d >= 0; });
  const expVenc  = inv.filter(i => { const d = stqExpDaysLeft(i.exp); return d !== null && d < 0; });

  /* salvar produto */
  const saveProduto = (f) => {
    const item = { ...f, qty: Number(f.qty) || 0, min: Number(f.min) || 0, max: Number(f.max) || 0 };
    if (f.id) saveInv(inv.map(x => x.id === f.id ? item : x));
    else saveInv([{ ...item, id: stqUID(), createdAt: stqToday() }, ...inv]);
    setModal(null);
    window.vtToast && window.vtToast(`"${item.name}" salvo.`, 'ok');
  };

  /* movimentação */
  const applyMove = (item, tipo, amount, resp, obs) => {
    const amt = Number(String(amount).replace(',', '.')) || 0;
    if (amt <= 0) { window.vtToast && window.vtToast('Informe uma quantidade válida.', 'err'); return; }
    let q = Number(item.qty) || 0, delta = 0;
    if (tipo === 'Entrada') { delta = amt; q += amt; }
    else if (tipo === 'Saída') { delta = -Math.min(amt, q); q = Math.max(0, q - amt); }
    else { delta = amt - q; q = amt; }
    saveInv(inv.map(x => x.id === item.id ? { ...x, qty: q } : x));
    const now = new Date();
    const mv = {
      id: stqUID(), ts: now.getTime(), isoDate: stqToday(),
      date: now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      itemId: item.id, itemName: item.name, unit: item.unit,
      tipo, qty: amt, delta, responsavel: resp || 'Equipe', obs: obs || '',
    };
    saveMoves([mv, ...moves]);
    setMoveModal(null);
    window.vtToast && window.vtToast(`${tipo} registrada: ${item.name} (${delta > 0 ? '+' : ''}${delta} ${item.unit}).`, 'ok');
  };

  /* registrar compra */
  const registrarCompra = (f) => {
    const c = { ...f, id: stqUID(), criadoEm: stqToday() };
    saveCompras([c, ...compras]);
    // dar entrada em estoque para cada item
    const novoInv = [...inv];
    const novosMoves = [];
    f.itens.forEach(it => {
      if (!it.itemId || !Number(it.qty)) return;
      const idx = novoInv.findIndex(x => x.id === it.itemId);
      if (idx >= 0) {
        const novaQty = (Number(novoInv[idx].qty) || 0) + Number(it.qty);
        novoInv[idx] = { ...novoInv[idx], qty: novaQty };
        novosMoves.push({
          id: stqUID(), ts: Date.now(), isoDate: stqToday(),
          date: new Date().toLocaleDateString('pt-BR'),
          itemId: it.itemId, itemName: novoInv[idx].name, unit: novoInv[idx].unit,
          tipo: 'Entrada', qty: Number(it.qty), delta: Number(it.qty),
          responsavel: 'Compra NF ' + (f.nf || c.id), obs: 'Compra registrada',
        });
      }
    });
    saveInv(novoInv);
    saveMoves([...novosMoves, ...moves]);
    setCompraModal(false);
    window.vtToast && window.vtToast('Compra registrada e estoque atualizado.', 'ok');
  };

  /* inventário físico */
  const registrarInventario = ({ resp, contagens, data }) => {
    const novoInv = [...inv];
    const ajustes = [];
    const novosMoves = [];
    contagens.forEach(c => {
      const fisico = Number(c.fisico);
      const idx = novoInv.findIndex(x => x.id === c.id);
      if (idx < 0) return;
      const delta = fisico - (Number(novoInv[idx].qty) || 0);
      if (delta !== 0) {
        ajustes.push({ id: c.id, name: c.name, sist: novoInv[idx].qty, fisico, delta });
        novoInv[idx] = { ...novoInv[idx], qty: fisico };
        novosMoves.push({
          id: stqUID(), ts: Date.now(), isoDate: data, date: stqFmt(data),
          itemId: c.id, itemName: c.name, unit: novoInv[idx].unit,
          tipo: 'Ajuste', qty: fisico, delta,
          responsavel: resp, obs: 'Inventário físico',
        });
      }
    });
    saveInv(novoInv);
    saveMoves([...novosMoves, ...moves]);
    const inv2 = { id: stqUID(), data, resp, total: contagens.length, correto: contagens.length - ajustes.length, corrigido: ajustes.length, ajustes };
    saveInventarios([inv2, ...inventarios]);
    setInvModal(false);
    window.vtToast && window.vtToast(`Inventário concluído. ${ajustes.length} item(ns) corrigido(s).`, 'ok');
  };

  /* outra saída */
  const registrarOutraSaida = (f) => {
    const item = inv.find(i => i.id === f.itemId);
    if (!item) return;
    const qty = Number(f.qty) || 0;
    saveInv(inv.map(x => x.id === f.itemId ? { ...x, qty: Math.max(0, (Number(x.qty)||0) - qty) } : x));
    const mv = {
      id: stqUID(), ts: Date.now(), isoDate: f.data, date: stqFmt(f.data),
      itemId: f.itemId, itemName: item.name, unit: item.unit,
      tipo: 'Saída', qty, delta: -qty, responsavel: 'Sistema', obs: `${f.motivo}${f.obs ? ' — ' + f.obs : ''}`,
    };
    saveMoves([mv, ...moves]);
    const os = { ...f, id: stqUID(), itemName: item.name, unit: item.unit, criadoEm: stqToday() };
    saveOutras([os, ...outrasSaidas]);
    setSaidaModal(false);
    window.vtToast && window.vtToast(`Saída de ${qty} ${item.unit} de "${item.name}" registrada.`, 'ok');
  };

  /* fornecedor */
  const saveFornecedor = (f) => {
    if (f.id) saveForn(fornecedores.map(x => x.id === f.id ? f : x));
    else saveForn([{ ...f, id: stqUID() }, ...fornecedores]);
    setFornModal(null);
    window.vtToast && window.vtToast(`Fornecedor "${f.name}" salvo.`, 'ok');
  };
  const delFornecedor = (id) => { if (window.confirm('Excluir fornecedor?')) { saveForn(fornecedores.filter(x => x.id !== id)); } };

  /* TABS */
  const TABS = [
    { id: 'produtos', label: 'Produtos', count: inv.length },
    { id: 'analise', label: 'Análise' },
    { id: 'compras', label: 'Compras', count: compras.length },
    { id: 'inventario', label: 'Inventário', count: inventarios.length },
    { id: 'outras', label: 'Outras Saídas', count: outrasSaidas.length },
    { id: 'movimentacoes', label: 'Movimentações', count: moves.length },
    { id: 'fornecedores', label: 'Fornecedores', count: fornecedores.length },
  ];

  const SIT_FILTERS = ['Todos', 'Repor', 'Adequado', 'Excesso', 'Parado', 'Novo'];

  return (
    <div>
      <div className="vt-page-head vt-head-row">
        <div>
          <h1>Estoque</h1>
          <p>{inv.length} produtos · valor total {stqMoney(totalValue)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'compras' && <button className="vt-btn-primary" onClick={() => setCompraModal(true)}><VtIcon name="plus" size={16} /> Nova compra</button>}
          {tab === 'inventario' && <button className="vt-btn-primary" onClick={() => setInvModal(true)}><VtIcon name="check" size={16} /> Novo inventário</button>}
          {tab === 'outras' && <button className="vt-btn-primary" onClick={() => setSaidaModal(true)}><VtIcon name="minus" size={16} /> Registrar saída</button>}
          {tab === 'fornecedores' && <button className="vt-btn-primary" onClick={() => setFornModal({})}><VtIcon name="plus" size={16} /> Novo fornecedor</button>}
          {tab === 'produtos' && <button className="vt-btn-primary" onClick={() => setModal({ categoria: 'Medicamento', qty: 0, min: 0, max: 0, createdAt: stqToday() })}><VtIcon name="plus" size={16} /> Novo produto</button>}
        </div>
      </div>

      {/* Alertas de validade */}
      {(expAlert.length > 0 || expVenc.length > 0) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          {expVenc.length > 0 && (
            <div style={{ background: 'var(--red-t)', border: '1px solid var(--red)', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: 'var(--red)', flex: 1, minWidth: 200 }}>
              <b>⚠️ {expVenc.length} produto(s) vencido(s)</b> — {expVenc.slice(0,3).map(i=>i.name).join(', ')}{expVenc.length > 3 ? '...' : ''}
            </div>
          )}
          {expAlert.length > 0 && (
            <div style={{ background: 'var(--amber-t)', border: '1px solid var(--amber)', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: 'var(--amber)', flex: 1, minWidth: 200 }}>
              <b>📅 {expAlert.length} produto(s) vencendo em 60 dias</b> — {expAlert.slice(0,3).map(i=>i.name).join(', ')}{expAlert.length > 3 ? '...' : ''}
            </div>
          )}
        </div>
      )}

      {/* Cards de situação */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { sit: 'Todos',    icon: 'box',   label: 'Total',    extra: stqMoney(totalValue) },
          { sit: 'Repor',    icon: 'alert', label: 'Repor',    extra: counts.Repor + ' itens' },
          { sit: 'Excesso',  icon: 'box',   label: 'Excesso',  extra: counts.Excesso + ' itens' },
          { sit: 'Parado',   icon: 'clock', label: 'Parado',   extra: counts.Parado + ' itens' },
          { sit: 'Adequado', icon: 'check', label: 'Adequado', extra: counts.Adequado + ' itens' },
          { sit: 'Novo',     icon: 'spark', label: 'Novos',    extra: counts.Novo + ' itens' },
        ].map(c => {
          const ss = c.sit === 'Todos' ? { color: 'var(--teal-d)', bg: 'var(--teal-t)' } : STQ_SIT_STYLE[c.sit];
          const ativo = filtroSit === c.sit && tab === 'produtos';
          return (
            <button key={c.sit} onClick={() => { setTab('produtos'); setFiltroSit(c.sit); }}
              style={{ background: ativo ? ss.bg : 'var(--card)', border: ativo ? `2px solid ${ss.color}` : '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', textAlign: 'left', cursor: 'pointer', boxShadow: 'var(--shadow)', transition: 'all .14s' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: ss.color }}>{c.sit === 'Todos' ? inv.length : counts[c.sit]}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: ss.color, marginTop: 2 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{c.extra}</div>
            </button>
          );
        })}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 16, overflowX: 'auto', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 16px', fontWeight: 700, fontSize: 13.5, border: 'none', background: 'none', cursor: 'pointer', color: tab === t.id ? 'var(--teal-d)' : 'var(--muted)', borderBottom: tab === t.id ? '2px solid var(--teal)' : '2px solid transparent', whiteSpace: 'nowrap' }}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* ---- TAB: Produtos ---- */}
      {tab === 'produtos' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 340 }}>
              <input placeholder="Buscar por nome ou código de barras..." value={busca} onChange={e => setBusca(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid var(--line)', borderRadius: 10, fontFamily: 'inherit', fontSize: 13.5 }} />
              <VtIcon name="search" size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SIT_FILTERS.map(s => (
                <button key={s} onClick={() => setFiltroSit(s)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--line)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', background: filtroSit === s ? (STQ_SIT_STYLE[s] || { bg: 'var(--teal-t)' }).bg : 'var(--card)', color: filtroSit === s ? (STQ_SIT_STYLE[s] || { color: 'var(--teal-d)' }).color : 'var(--muted)' }}>
                  {s} {s !== 'Todos' ? `(${counts[s]})` : `(${inv.length})`}
                </button>
              ))}
            </div>
          </div>

          <div className="vt-card vt-table-card">
            <div className="vt-table">
              <div className="vt-tr vt-th" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 90px 80px 90px 90px 100px 120px', gap: 8, padding: '10px 16px', fontSize: 11 }}>
                <span>Produto</span><span>Grupo / Marca</span><span>Situação</span><span>Qtd</span><span>Custo</span><span>Preço venda</span><span>Validade</span><span style={{ textAlign: 'right' }}>Ações</span>
              </div>
              {list.length === 0 && <div className="vt-empty-row">Nenhum produto encontrado.</div>}
              {list.map(i => {
                const s = sit(i);
                const ss = STQ_SIT_STYLE[s] || {};
                const dias = stqExpDaysLeft(i.exp);
                const expColor = dias === null ? 'var(--muted)' : dias < 0 ? 'var(--red)' : dias < 60 ? 'var(--amber)' : 'var(--muted)';
                const custo = window.PR ? window.PR.parseMoney(i.cost) : 0;
                return (
                  <div key={i.id} className="vt-tr" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 90px 80px 90px 90px 100px 120px', gap: 8, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid var(--line-2)' }}>
                    <span>
                      <b style={{ fontSize: 13.5, display: 'block' }}>{i.name}</b>
                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        {i.barcode ? `🔢 ${i.barcode} · ` : ''}{i.categoria || 'Insumo'}{i.area ? ` · ${i.area}` : ''}
                      </span>
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{[i.grupo, i.marca].filter(Boolean).join(' / ') || '—'}</span>
                    <span><span style={{ fontSize: 12, fontWeight: 700, color: ss.color, background: ss.bg, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{s}</span></span>
                    <span style={{ fontWeight: 700, color: Number(i.qty) <= Number(i.min || 0) ? 'var(--red)' : 'var(--ink)' }}>{Number(i.qty) || 0} {i.unit}</span>
                    <span style={{ fontSize: 13 }}>{custo > 0 ? stqMoney(custo) : '—'}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{i.preco_venda || '—'}</span>
                    <span style={{ fontSize: 12, color: expColor }}>{i.exp || '—'}{dias !== null && dias < 60 ? ` (${dias < 0 ? 'Vencido' : dias + 'd'})` : ''}</span>
                    <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button style={{ fontSize: 11.5, padding: '3px 7px', borderRadius: 6, border: '1px solid var(--green)', color: 'var(--green)', background: 'var(--green-t)', cursor: 'pointer', fontWeight: 700 }} onClick={() => setMoveModal({ item: i, tipo: 'Entrada' })}>+</button>
                      <button style={{ fontSize: 11.5, padding: '3px 7px', borderRadius: 6, border: '1px solid var(--red)', color: 'var(--red)', background: 'var(--red-t)', cursor: 'pointer', fontWeight: 700 }} onClick={() => setMoveModal({ item: i, tipo: 'Saída' })}>−</button>
                      <button style={{ fontSize: 11.5, padding: '3px 7px', borderRadius: 6, border: '1px solid var(--line)', color: 'var(--muted)', background: 'var(--card)', cursor: 'pointer' }} onClick={() => setModal(i)}>✏️</button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---- TAB: Análise ---- */}
      {tab === 'analise' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Valor total em estoque', value: stqMoney(totalValue), color: 'var(--teal-d)', bg: 'var(--teal-t)', icon: 'box' },
              { label: 'Itens para repor', value: counts.Repor, color: 'var(--red)', bg: 'var(--red-t)', icon: 'alert' },
              { label: 'Itens em excesso', value: counts.Excesso, color: 'var(--amber)', bg: 'var(--amber-t)', icon: 'box' },
              { label: 'Itens parados (+90 dias)', value: counts.Parado, color: 'var(--muted)', bg: '#eef1f5', icon: 'clock' },
              { label: 'Itens adequados', value: counts.Adequado, color: 'var(--green)', bg: 'var(--green-t)', icon: 'check' },
              { label: 'Vencendo em 60 dias', value: expAlert.length, color: '#c97b10', bg: 'var(--amber-t)', icon: 'alert' },
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.color}30`, borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ fontSize: 13, color: c.color, fontWeight: 600 }}>{c.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: c.color, marginTop: 6 }}>{c.value}</div>
              </div>
            ))}
          </div>

          <div className="vt-card vt-table-card">
            <div className="vt-sec-title" style={{ padding: '16px 18px 0', fontSize: 15 }}>Itens que precisam de atenção</div>
            <div className="vt-table">
              <div className="vt-tr vt-th" style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 80px 80px', gap: 8, padding: '10px 16px' }}>
                <span>Produto</span><span>Situação</span><span>Qtd atual</span><span>Mínimo</span><span>Máximo</span>
              </div>
              {inv.filter(i => ['Repor','Excesso','Parado'].includes(sit(i))).map(i => {
                const s = sit(i); const ss = STQ_SIT_STYLE[s] || {};
                return (
                  <div key={i.id} className="vt-tr" style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 80px 80px', gap: 8, padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid var(--line-2)' }}>
                    <span><b style={{ fontSize: 13.5 }}>{i.name}</b><span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)' }}>{i.categoria}</span></span>
                    <span><span style={{ fontSize: 12, fontWeight: 700, color: ss.color, background: ss.bg, padding: '3px 8px', borderRadius: 20 }}>{s}</span></span>
                    <span style={{ fontWeight: 700 }}>{Number(i.qty) || 0} {i.unit}</span>
                    <span style={{ color: 'var(--muted)' }}>{Number(i.min) || 0}</span>
                    <span style={{ color: 'var(--muted)' }}>{Number(i.max) || '—'}</span>
                  </div>
                );
              })}
              {inv.filter(i => ['Repor','Excesso','Parado'].includes(sit(i))).length === 0 && (
                <div className="vt-empty-row" style={{ color: 'var(--green)' }}>✓ Todos os itens estão em situação adequada.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- TAB: Compras ---- */}
      {tab === 'compras' && (
        <div className="vt-card vt-table-card">
          {compras.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              <VtIcon name="box" size={36} />
              <p style={{ marginTop: 12 }}>Nenhuma compra registrada. Clique em "Nova compra" para registrar uma entrada de NF.</p>
            </div>
          ) : (
            <div className="vt-table">
              <div className="vt-tr vt-th" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 100px 100px 100px', gap: 8, padding: '10px 16px' }}>
                <span>Data</span><span>Fornecedor</span><span>N.º NF</span><span>Itens</span><span>Total</span>
              </div>
              {compras.map(c => {
                const fo = fornecedores.find(f => f.id === c.fornecedor);
                return (
                  <div key={c.id} className="vt-tr" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 100px 100px 100px', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line-2)' }}>
                    <span style={{ color: 'var(--muted)', fontSize: 13 }}>{stqFmt(c.data)}</span>
                    <span><b style={{ fontSize: 13.5 }}>{fo ? fo.name : c.fornecedor || '—'}</b></span>
                    <span style={{ fontSize: 13 }}>{c.nf || '—'}</span>
                    <span style={{ fontSize: 13 }}>{(c.itens || []).length} produto(s)</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{stqMoney(c.totalCalc || 0)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---- TAB: Inventário ---- */}
      {tab === 'inventario' && (
        <div className="vt-card vt-table-card">
          {inventarios.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              <VtIcon name="check" size={36} />
              <p style={{ marginTop: 12 }}>Nenhum inventário realizado. Clique em "Novo inventário" para iniciar uma contagem física.</p>
            </div>
          ) : (
            <div className="vt-table">
              <div className="vt-tr vt-th" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px 90px 90px', gap: 8, padding: '10px 16px' }}>
                <span>Data</span><span>Responsável</span><span>Total</span><span>Correto</span><span>Corrigido</span>
              </div>
              {inventarios.map(inv2 => (
                <div key={inv2.id} className="vt-tr" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px 90px 90px', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line-2)' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>{stqFmt(inv2.data)}</span>
                  <span><b style={{ fontSize: 13.5 }}>{inv2.resp}</b></span>
                  <span style={{ fontSize: 13 }}>{inv2.total}</span>
                  <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>{inv2.correto}</span>
                  <span style={{ fontSize: 13, color: inv2.corrigido > 0 ? 'var(--amber)' : 'var(--muted)', fontWeight: 700 }}>{inv2.corrigido}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- TAB: Outras Saídas ---- */}
      {tab === 'outras' && (
        <div className="vt-card vt-table-card">
          {outrasSaidas.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              <p>Nenhuma outra saída registrada.</p>
            </div>
          ) : (
            <div className="vt-table">
              <div className="vt-tr vt-th" style={{ display: 'grid', gridTemplateColumns: '110px 2fr 90px 100px 1fr', gap: 8, padding: '10px 16px' }}>
                <span>Data</span><span>Produto</span><span>Qtd</span><span>Motivo</span><span>Obs.</span>
              </div>
              {outrasSaidas.map(os => (
                <div key={os.id} className="vt-tr" style={{ display: 'grid', gridTemplateColumns: '110px 2fr 90px 100px 1fr', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line-2)' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>{stqFmt(os.data)}</span>
                  <span><b style={{ fontSize: 13.5 }}>{os.itemName}</b></span>
                  <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 700 }}>-{os.qty} {os.unit}</span>
                  <span><span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: 'var(--amber-t)', color: 'var(--amber)', fontWeight: 600 }}>{os.motivo}</span></span>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{os.obs || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- TAB: Movimentações ---- */}
      {tab === 'movimentacoes' && (
        <div className="vt-card vt-table-card">
          <div className="vt-table">
            <div className="vt-tr vt-th" style={{ display: 'grid', gridTemplateColumns: '130px 2fr 90px 80px 1fr', gap: 8, padding: '10px 16px' }}>
              <span>Data / hora</span><span>Produto</span><span>Tipo</span><span>Qtd</span><span>Responsável</span>
            </div>
            {moves.length === 0 && <div className="vt-empty-row">Nenhuma movimentação registrada.</div>}
            {moves.map(m => (
              <div key={m.id} className="vt-tr" style={{ display: 'grid', gridTemplateColumns: '130px 2fr 90px 80px 1fr', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line-2)', alignItems: 'center' }}>
                <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>{m.date}</span>
                <span><b style={{ fontSize: 13.5 }}>{m.itemName}</b>{m.obs ? <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)' }}>{m.obs}</span> : null}</span>
                <span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: m.tipo === 'Entrada' ? 'var(--green-t)' : m.tipo === 'Saída' ? 'var(--red-t)' : '#e6edf4', color: m.tipo === 'Entrada' ? 'var(--green)' : m.tipo === 'Saída' ? 'var(--red)' : 'var(--navy)' }}>
                    {m.tipo}
                  </span>
                </span>
                <span style={{ fontWeight: 700, color: (m.delta || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {(m.delta || 0) > 0 ? '+' : ''}{m.delta || 0} {m.unit}
                </span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{m.responsavel}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- TAB: Fornecedores ---- */}
      {tab === 'fornecedores' && (
        <div className="vt-card vt-table-card">
          {fornecedores.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              <VtIcon name="users" size={36} />
              <p style={{ marginTop: 12 }}>Nenhum fornecedor cadastrado. Clique em "Novo fornecedor" para começar.</p>
            </div>
          ) : (
            <div className="vt-table">
              <div className="vt-tr vt-th" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px 80px', gap: 8, padding: '10px 16px' }}>
                <span>Nome / Razão social</span><span>CNPJ</span><span>Contato</span><span>Telefone</span><span style={{ textAlign: 'right' }}>Ações</span>
              </div>
              {fornecedores.map(fo => (
                <div key={fo.id} className="vt-tr" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px 80px', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line-2)', alignItems: 'center' }}>
                  <span><b style={{ fontSize: 13.5 }}>{fo.name}</b>{fo.cidade ? <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{fo.cidade}</span> : null}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{fo.cnpj || '—'}</span>
                  <span style={{ fontSize: 13 }}>{fo.contato || '—'}</span>
                  <span style={{ fontSize: 13 }}>{fo.telefone || '—'}</span>
                  <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--card)', cursor: 'pointer' }} onClick={() => setFornModal(fo)}>✏️</button>
                    <button style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--red)', color: 'var(--red)', background: 'var(--red-t)', cursor: 'pointer' }} onClick={() => delFornecedor(fo.id)}>✕</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      {modal && <EstoqueProdutoModal data={modal} fornecedores={fornecedores} onClose={() => setModal(null)} onSave={saveProduto} />}
      {moveModal && <MovModalV3 item={moveModal.item} tipo={moveModal.tipo} onClose={() => setMoveModal(null)} onSave={applyMove} />}
      {compraModal && <CompraModal inv={inv} fornecedores={fornecedores} onClose={() => setCompraModal(false)} onSave={registrarCompra} />}
      {invModal && <InventarioModal inv={inv} onClose={() => setInvModal(false)} onSave={registrarInventario} />}
      {saidaModal && <OutraSaidaModal inv={inv} onClose={() => setSaidaModal(false)} onSave={registrarOutraSaida} />}
      {fornModal && <FornecedorModal data={fornModal} onClose={() => setFornModal(null)} onSave={saveFornecedor} />}
    </div>
  );
}
