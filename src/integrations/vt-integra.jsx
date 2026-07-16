/* ============================================================
   VetTooth Pro — Integração entre módulos
   Atendimento → baixa de estoque (Insumos) + lançamento no
   Financeiro (receita / custo / lucro).
   ============================================================ */

/* baixa de estoque por nome do item; devolve custo total consumido */
window.vtConsumeStock = function (consumos) {
  const d = (window.VtStore && window.VtStore.getData()) || {};
  const inv = (d.inventory || []).map((i) => ({ ...i }));
  let custo = 0; const baixados = [];
  (consumos || []).forEach((c) => {
    const item = inv.find((i) => (i.name || '').toLowerCase() === (c.nome || '').toLowerCase());
    if (!item) return;
    const cont = Number(String(item.conteudo || '').replace(',', '.'));
    const unitCost = window.PR.parseMoney(item.cost);
    if (c.usoQtd && cont) {
      // consumo fracionado (ex.: 0,5 mL de um frasco) — baixa proporcional
      const frac = c.usoQtd / cont;
      item.qty = Math.max(0, +(Number(item.qty) - frac).toFixed(3));
      custo += unitCost * frac;
    } else {
      const q = c.qtd || 1;
      item.qty = Math.max(0, Number(item.qty) - q);
      custo += unitCost * q;
    }
    baixados.push(c.nome);
  });
  if (baixados.length && window.VtStore) window.VtStore.setData({ inventory: inv });
  return { custo: +custo.toFixed(2), baixados };
};

/* lança transações no financeiro */
window.vtPostFinance = function (txs) {
  const d = (window.VtStore && window.VtStore.getData()) || {};
  const fin = d.fin || { caixa: { open: false }, tx: [] };
  const today = new Date().toISOString().slice(0, 10);
  const novas = (txs || []).filter((t) => t.value > 0).map((t) => ({
    id: 'T' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
    kind: t.kind, desc: t.desc, cat: t.cat, value: t.value, date: today,
    status: t.kind === 'custo' ? 'pago' : 'pendente', method: null, paidAt: t.kind === 'custo' ? today : null,
  }));
  if (novas.length && window.VtStore) window.VtStore.setData({ fin: { ...fin, tx: [...novas, ...(fin.tx || [])] } });
  return novas;
};

/* fatura o atendimento: estoque + financeiro */
window.vtFaturarAtendimento = function (at, patient) {
  const nome = patient.name;
  const receitas = [], custos = [], consumos = [];
  let totalReceita = 0, totalCusto = 0;

  (at.procedimentos || []).forEach((p) => {
    const v = Number(p.valor) || 0, c = Number(p.custo) || 0;
    if (v) { receitas.push({ kind: 'receita', desc: `${p.nome} — ${nome}`, cat: 'Procedimento', value: v }); totalReceita += v; }
    if (c) { custos.push({ kind: 'custo', desc: `Materiais: ${p.nome} — ${nome}`, cat: 'Insumos', value: c }); totalCusto += c; }
  });
  // orçamento aprovado (quando não há procedimentos lançados) entra como receita
  const orc = at.orcamento || { items: [] };
  if ((!at.procedimentos || !at.procedimentos.length) && orc.items && orc.items.length) {
    orc.items.forEach((it) => {
      const v = (Number(it.valor) || 0) * (Number(it.qtd) || 1);
      const c = (Number(it.custo) || 0) * (Number(it.qtd) || 1);
      if (v) { receitas.push({ kind: 'receita', desc: `${it.nome || it.tipo} — ${nome}`, cat: it.tipo === 'Exame' ? 'Exame' : 'Procedimento', value: v }); totalReceita += v; }
      if (c) { custos.push({ kind: 'custo', desc: `Materiais: ${it.nome || it.tipo} — ${nome}`, cat: 'Insumos', value: c }); totalCusto += c; }
    });
  }
  (at.vendas || []).forEach((v) => {
    const val = (Number(v.valor) || 0) * (Number(v.qtd) || 1);
    if (val) { receitas.push({ kind: 'receita', desc: `${v.item} — ${nome}`, cat: 'Venda', value: val }); totalReceita += val; consumos.push({ nome: v.item, qtd: Number(v.qtd) || 1 }); }
  });
  (at.medicamentos || []).forEach((m) => {
    const usoQtd = parseFloat(String(m.qtd || '').replace(',', '.')) || 0;
    consumos.push({ nome: m.nome, usoQtd: /ml|mg/i.test(m.qtd || '') ? usoQtd : 0, qtd: usoQtd && !/ml|mg/i.test(m.qtd || '') ? usoQtd : 1 });
  });

  const stock = window.vtConsumeStock(consumos);
  if (stock.custo) { custos.push({ kind: 'custo', desc: `Insumos consumidos — ${nome}`, cat: 'Insumos', value: stock.custo }); totalCusto += stock.custo; }
  window.vtPostFinance([...receitas, ...custos]);

  return {
    receita: totalReceita, custo: +totalCusto.toFixed(2), lucro: +(totalReceita - totalCusto).toFixed(2),
    baixados: stock.baixados, nReceitas: receitas.length,
  };
};
