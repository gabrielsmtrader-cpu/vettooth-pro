/* ============================================================
   VetTooth Pro — Prontuário · abas adicionais
   Agendamento · Retornos · Atestados e Termos · Medicamentos ·
   Cirurgias · Internações · Vendas
   ============================================================ */
const { useState: xUse } = React;

const xTA = { width: '100%', fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)', background: '#fff', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px', minHeight: 70, resize: 'vertical', lineHeight: 1.5 };

/* ---------- Agendamento ---------- */
function PrAgendamento({ at, patch }) {
  const CT = window.vtConsults();
  const D = window.VtData;
  const rows = at.agendamentos || [];
  const [f, setF] = xUse({ data: '', hora: '', tipo: CT[0].label, vet: 'M.V. ' + window.vtVets()[0].name, obs: '' });
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const add = () => {
    if (!f.data) { window.vtToast('Informe a data do agendamento.', 'err'); return; }
    patch({ agendamentos: [{ id: 'AG' + Date.now().toString(36), ...f }, ...rows] });
    setF({ data: '', hora: '', tipo: CT[0].label, vet: f.vet, obs: '' });
    window.vtToast('Compromisso agendado na agenda.', 'ok');
  };
  const del = (id) => patch({ agendamentos: rows.filter((r) => r.id !== id) });
  return (
    <div>
      <div className="pr-sec-head"><div><h2 className="pr-h">Agendamento</h2><p className="pr-h-sub">Marque o próximo compromisso do paciente</p></div></div>
      <div className="vt-card vt-sec pr-block">
        <div className="pr-fieldrow c3">
          <label className="pr-field"><span>Data</span><VtField value={f.data} onChange={s('data')} mask="date" placeholder="DD/MM/AAAA" /></label>
          <label className="pr-field"><span>Hora</span><input value={f.hora} onChange={(e) => s('hora')(e.target.value)} placeholder="14:00" /></label>
          <label className="pr-field"><span>Tipo</span><select value={f.tipo} onChange={(e) => s('tipo')(e.target.value)}>{CT.map((t) => <option key={t.id}>{t.label}</option>)}</select></label>
        </div>
        <div className="pr-fieldrow c2" style={{ marginBottom: 0 }}>
          <label className="pr-field"><span>Veterinário</span><select value={f.vet} onChange={(e) => s('vet')(e.target.value)}>{window.vtVets().map((v) => <option key={v.id}>{'M.V. ' + v.name}</option>)}</select></label>
          <label className="pr-field"><span>Observações</span><input value={f.obs} onChange={(e) => s('obs')(e.target.value)} placeholder="Opcional" /></label>
        </div>
        <button className="pr-qbtn primary" style={{ marginTop: 14 }} onClick={add}><VtIcon name="calendar" size={15} /> Agendar</button>
      </div>
      <p className="pr-block-title"><VtIcon name="calendar" size={15} /> Agendamentos</p>
      {rows.length === 0 ? <p className="pr-empty">Nenhum compromisso agendado.</p> : (
        <div className="vac-sched">
          {rows.map((r) => (
            <div key={r.id} className="vac-sched-row teal">
              <span className="vac-dot" />
              <div style={{ flex: 1 }}><b>{r.tipo}</b><i>{r.vet}{r.obs ? ' · ' + r.obs : ''}</i></div>
              <span className="vac-due">{r.data}{r.hora ? ' · ' + r.hora : ''}</span>
              <button className="pr-del-btn" onClick={() => del(r.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Retornos ---------- */
function PrRetornos({ at, patch }) {
  const rows = at.retornos || [];
  const [f, setF] = xUse({ data: '', motivo: '' });
  const add = () => {
    if (!f.data) { window.vtToast('Informe a data do retorno.', 'err'); return; }
    patch({ retornos: [{ id: 'RT' + Date.now().toString(36), ...f, status: 'previsto' }, ...rows] });
    setF({ data: '', motivo: '' });
    window.vtToast('Retorno agendado.', 'ok');
  };
  const toggle = (id) => patch({ retornos: rows.map((r) => r.id === id ? { ...r, status: r.status === 'realizado' ? 'previsto' : 'realizado' } : r) });
  const del = (id) => patch({ retornos: rows.filter((r) => r.id !== id) });
  return (
    <div>
      <div className="pr-sec-head"><div><h2 className="pr-h">Retornos</h2><p className="pr-h-sub">Reavaliações previstas e realizadas</p></div></div>
      <div className="vt-card vt-sec pr-block">
        <div className="pr-fieldrow c2" style={{ marginBottom: 0, gridTemplateColumns: '200px 1fr' }}>
          <label className="pr-field"><span>Data do retorno</span><VtField value={f.data} onChange={(v) => setF((p) => ({ ...p, data: v }))} mask="date" placeholder="DD/MM/AAAA" /></label>
          <label className="pr-field"><span>Motivo</span><input value={f.motivo} onChange={(e) => setF((p) => ({ ...p, motivo: e.target.value }))} placeholder="Ex.: Reavaliação pós-cirúrgica, controle de exames..." /></label>
        </div>
        <button className="pr-qbtn primary" style={{ marginTop: 14 }} onClick={add}><VtIcon name="plus" size={15} /> Agendar retorno</button>
      </div>
      <p className="pr-block-title"><VtIcon name="calendar" size={15} /> Retornos</p>
      {rows.length === 0 ? <p className="pr-empty">Nenhum retorno registrado.</p> : (
        <div className="vac-sched">
          {rows.map((r) => (
            <div key={r.id} className={`vac-sched-row ${r.status === 'realizado' ? 'teal' : 'amber'}`}>
              <span className="vac-dot" />
              <div style={{ flex: 1 }}><b>{r.motivo || 'Retorno'}</b><i>{r.status === 'realizado' ? 'Realizado' : 'Previsto'}</i></div>
              <span className="vac-due">{r.data}</span>
              <button className="pr-qbtn" style={{ padding: '5px 10px', fontSize: 11.5 }} onClick={() => toggle(r.id)}>{r.status === 'realizado' ? 'Reabrir' : '✓ Concluir'}</button>
              <button className="pr-del-btn" onClick={() => del(r.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Atestados e Termos ---------- */
const DOC_MODELS = [
  'Atestado de saúde', 'Atestado de sanidade', 'Atestado de repouso', 'Atestado de óbito',
  'Termo de consentimento', 'Termo de consentimento anestésico', 'Termo de internação', 'Termo de responsabilidade', 'Termo de eutanásia',
];
function PrAtestados({ at, patch, patient }) {
  const docs = at.documentos || [];
  const [editor, setEditor] = xUse(null);
  const gerar = (tipo) => setEditor({ tipo, body: null, id: null });
  const openDoc = (d) => setEditor({ tipo: d.tipo, body: d.body, id: d.id });
  const saveDoc = (body) => {
    if (editor.id) patch({ documentos: docs.map((d) => d.id === editor.id ? { ...d, body } : d) });
    else patch({ documentos: [{ id: 'DC' + Date.now().toString(36), tipo: editor.tipo, date: window.PR.todayBR(), body }, ...docs] });
    setEditor(null);
  };
  const del = (id) => patch({ documentos: docs.filter((d) => d.id !== id) });
  return (
    <div>
      <div className="pr-sec-head"><div><h2 className="pr-h">Atestados e Termos</h2><p className="pr-h-sub">Gere documentos a partir de modelos, edite, assine e envie ao tutor</p></div></div>
      <div className="pr-block">
        <p className="pr-block-title"><VtIcon name="receipt" size={15} /> Modelos disponíveis</p>
        <div className="pr-models">
          {DOC_MODELS.map((m) => (
            <button key={m} className="pr-model" onClick={() => gerar(m)}>
              <span className="pr-model-ic"><VtIcon name="receipt" size={18} /></span>
              <span><b>{m}</b><i>Abrir editor · {patient.name}</i></span>
            </button>
          ))}
        </div>
      </div>
      <p className="pr-block-title"><VtIcon name="receipt" size={15} /> Documentos emitidos</p>
      {docs.length === 0 ? <p className="pr-empty">Nenhum documento emitido.</p> : (
        <div className="pr-files">
          {docs.map((d) => (
            <div key={d.id} className="pr-file" style={{ cursor: 'pointer' }} onClick={() => openDoc(d)}>
              <span className="pr-file-ic" style={{ background: '#e0533c' }}>PDF</span>
              <div style={{ flex: 1, minWidth: 0 }}><b>{d.tipo}</b><i>{d.date} · abrir</i></div>
              <button className="pr-del-btn" onClick={(e) => { e.stopPropagation(); del(d.id); }}>✕</button>
            </div>
          ))}
        </div>
      )}
      {editor && <DocEditor tipo={editor.tipo} patient={patient} at={at} initialBody={editor.body} onClose={() => setEditor(null)} onSave={saveDoc} />}
    </div>
  );
}

/* ---------- Medicamentos (aplicação / dispensação) ---------- */
const MED_VIAS = ['VO', 'IM', 'IV', 'SC', 'Tópica', 'Oftálmica', 'Inalatória'];
function PrMedicamentos({ at, patch }) {
  const rows = at.medicamentos || [];
  const setRows = (r) => patch({ medicamentos: r });
  const [medSearch, setMedSearch] = xUse('');

  const invItems = (() => { const d = window.VtStore && window.VtStore.getData(); return ((d && d.inventory) || []).filter((i) => i.categoria === 'Medicamento' || i.categoria === 'Vacina'); })();
  const filteredMeds = invItems.filter((i) => !medSearch || i.name.toLowerCase().includes(medSearch.toLowerCase()));

  const svcMeds = window.vtServiceCatalog ? window.vtServiceCatalog('Medicamento') : [];
  const filtSvcMeds = medSearch ? svcMeds.filter((s) => s.nome.toLowerCase().includes(medSearch.toLowerCase())) : [];

  const add = (fromInv, fromSvc) => {
    let row;
    if (fromSvc) {
      row = { id: 'MD' + Date.now().toString(36), nome: fromSvc.nome, dose: fromSvc.descricao || '', via: 'VO', qtd: '1', lote: '', hora: window.PR.nowHM(), svcId: fromSvc.id, valor: fromSvc.preco || 0, custo: fromSvc.custo || 0, unit: fromSvc.unidade || 'dose' };
    } else if (fromInv) {
      const svcMatch = svcMeds.find((s) => s.nome.toLowerCase().includes(fromInv.name.toLowerCase()));
      row = { id: 'MD' + Date.now().toString(36), nome: fromInv.name, dose: '', via: 'VO', qtd: '1', lote: fromInv.lot || '', hora: window.PR.nowHM(), itemId: fromInv.id, unit: fromInv.unit, valor: svcMatch ? (svcMatch.preco || 0) : 0, custo: svcMatch ? (svcMatch.custo || 0) : 0 };
    } else {
      row = { id: 'MD' + Date.now().toString(36), nome: '', dose: '', via: 'VO', qtd: '', lote: '', hora: window.PR.nowHM(), valor: 0, custo: 0 };
    }
    setRows([...rows, row]);
    setMedSearch('');
  };
  const upd = (id, k, v) => setRows(rows.map((r) => r.id === id ? { ...r, [k]: v } : r));
  const del = (id) => setRows(rows.filter((r) => r.id !== id));

  const baixarEstoque = () => {
    if (!rows.length) { window.vtToast('Nenhum medicamento para baixar.', 'err'); return; }
    const vet = window.vtCurrentVet ? window.vtCurrentVet() : 'Equipe';
    let baixados = 0;
    rows.forEach((r) => {
      if (!r.itemId) return;
      const qty = Number(r.qtd) || 1;
      if (window.vtBaixarInsumos) {
        window.vtBaixarInsumos([{ itemId: r.itemId, itemName: r.nome, qty, unit: r.unit || 'un' }], 'Medicamento aplicado: ' + r.nome, vet);
        baixados++;
      }
    });
    if (baixados > 0) window.vtToast(`${baixados} medicamento(s) baixados do estoque.`, 'ok');
    else window.vtToast('Medicamentos sem vínculo com estoque. Selecione do inventário para baixa automática.', 'warn');
  };

  return (
    <div>
      <div className="pr-sec-head">
        <div><h2 className="pr-h">Medicamentos</h2><p className="pr-h-sub">Aplicação / dispensação no atendimento · consome estoque</p></div>
        <button className="pr-qbtn primary" disabled={!rows.length} style={!rows.length ? { opacity: .5 } : null} onClick={baixarEstoque}><VtIcon name="box" size={15} /> Baixar do estoque</button>
      </div>
      <div className="vt-card vt-sec">
        {rows.length === 0 ? <p className="pr-empty">Nenhum medicamento aplicado/dispensado.</p> : (
          <table className="pr-dtable">
            <thead><tr><th style={{ width: '22%' }}>Medicamento</th><th>Dose</th><th>Via</th><th style={{ width: 55 }}>Qtd</th><th>Lote</th><th style={{ width: 65 }}>Hora</th><th style={{ width: 90 }}>Valor (R$)</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><input value={r.nome} onChange={(e) => upd(r.id, 'nome', e.target.value)} placeholder="Nome" />{r.itemId && <span style={{ fontSize: 10.5, color: 'var(--teal)', display: 'block' }}>✓ estoque</span>}{r.svcId && <span style={{ fontSize: 10.5, color: 'var(--violet)', display: 'block' }}>✓ catálogo</span>}</td>
                  <td><input value={r.dose} onChange={(e) => upd(r.id, 'dose', e.target.value)} placeholder="mg/kg" /></td>
                  <td><select value={r.via} onChange={(e) => upd(r.id, 'via', e.target.value)}>{MED_VIAS.map((v) => <option key={v}>{v}</option>)}</select></td>
                  <td><input className="num" value={r.qtd} onChange={(e) => upd(r.id, 'qtd', e.target.value)} placeholder="1" /></td>
                  <td><input value={r.lote} onChange={(e) => upd(r.id, 'lote', e.target.value)} placeholder="Lote" /></td>
                  <td><input value={r.hora} onChange={(e) => upd(r.id, 'hora', e.target.value)} placeholder="00:00" /></td>
                  <td><input className="num" value={r.valor || ''} onChange={(e) => upd(r.id, 'valor', Number(e.target.value.replace(/\D/g, '')) || 0)} placeholder="0" /></td>
                  <td><button className="pr-del-btn" onClick={() => del(r.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          {/* Catálogo de serviços (medicamentos precificados) */}
          {svcMeds.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--muted)' }}>Catálogo de medicamentos:</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                {svcMeds.filter((s) => !medSearch || s.nome.toLowerCase().includes(medSearch.toLowerCase())).slice(0, 8).map((sv) => (
                  <button key={sv.id} className="pr-quickpick-btn" style={{ ...prChipStyle(false), borderColor: 'var(--violet)' }} onClick={() => add(null, sv)}>
                    + {sv.nome} <span style={{ opacity: .7, fontSize: 11 }}>({window.PR.money(sv.preco || 0)}/{sv.unidade || 'dose'})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="pr-addrow" onClick={() => add()}><VtIcon name="plus" size={14} /> Linha em branco</button>
            <input value={medSearch} onChange={(e) => setMedSearch(e.target.value)} placeholder="Buscar no estoque ou catálogo…" style={{ flex: 1, minWidth: 200, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
            {medSearch && filteredMeds.slice(0, 5).map((i) => (
              <button key={i.id} className="pr-quickpick-btn" style={prChipStyle(false)} onClick={() => add(i)}>+ {i.name} ({i.qty} {i.unit})</button>
            ))}
            {medSearch && filteredMeds.length === 0 && filtSvcMeds.length === 0 && <span className="vt-muted" style={{ fontSize: 12 }}>Nenhum resultado.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Cirurgias ---------- */
function PrCirurgias({ at, patch }) {
  const rows = at.cirurgias || [];
  const [f, setF] = xUse(null);
  const blank = { procedimento: '', data: window.PR.todayBR(), equipe: '', anestesia: '', duracao: '', descricao: '', posop: '', valor: 0, custo: 0 };
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.procedimento) { window.vtToast('Informe o procedimento cirúrgico.', 'err'); return; }
    if (f.id) patch({ cirurgias: rows.map((r) => r.id === f.id ? f : r) });
    else patch({ cirurgias: [{ id: 'CR' + Date.now().toString(36), ...f }, ...rows] });
    setF(null); window.vtToast('Cirurgia registrada.', 'ok');
  };
  const del = (id) => patch({ cirurgias: rows.filter((r) => r.id !== id) });
  return (
    <div>
      <div className="pr-sec-head">
        <div><h2 className="pr-h">Cirurgias</h2><p className="pr-h-sub">Registro do ato cirúrgico</p></div>
        <button className="pr-qbtn primary" onClick={() => setF(blank)}><VtIcon name="plus" size={15} /> Nova cirurgia</button>
      </div>
      {rows.length === 0 && !f ? <p className="pr-empty">Nenhuma cirurgia registrada.</p> : null}
      <div className="vt-stack">
        {rows.map((r) => (
          <div key={r.id} className="vt-card vt-sec">
            <div className="pr-sec-head" style={{ marginBottom: 8 }}>
              <div><h3 className="vt-sec-title" style={{ margin: 0 }}>{r.procedimento}</h3><p className="vt-muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>{r.data}{r.duracao ? ' · ' + r.duracao : ''}{r.anestesia ? ' · ' + r.anestesia : ''}</p></div>
              <div style={{ display: 'flex', gap: 6 }}><button className="vt-link" onClick={() => setF(r)}>Editar</button><button className="pr-del-btn" onClick={() => del(r.id)}>✕</button></div>
            </div>
            {r.equipe && <p style={{ margin: '0 0 4px', fontSize: 13 }}><b>Equipe:</b> {r.equipe}</p>}
            {r.descricao && <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--muted)' }}>{r.descricao}</p>}
            {r.posop && <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--muted)' }}><b>Pós-op:</b> {r.posop}</p>}
            {(r.valor > 0 || r.custo > 0) && <p style={{ margin: 0, fontSize: 12.5 }}><span style={{ color: 'var(--green)', fontWeight: 700 }}>{window.PR.money(r.valor || 0)}</span>{r.custo > 0 && <span style={{ color: 'var(--muted)', marginLeft: 8 }}>custo: {window.PR.money(r.custo)}</span>}</p>}
          </div>
        ))}
      </div>
      {f && (
        <div className="vt-card vt-sec" style={{ marginTop: 14 }}>
          <h3 className="vt-sec-title">{f.id ? 'Editar cirurgia' : 'Nova cirurgia'}</h3>
          <div className="pr-fieldrow c2">
            <label className="pr-field"><span>Procedimento</span><input value={f.procedimento} onChange={(e) => s('procedimento')(e.target.value)} placeholder="Ex.: Exodontia cirúrgica" /></label>
            <label className="pr-field"><span>Data</span><VtField value={f.data} onChange={s('data')} mask="date" /></label>
          </div>
          <div className="pr-fieldrow c3">
            <label className="pr-field"><span>Anestesia</span><input value={f.anestesia} onChange={(e) => s('anestesia')(e.target.value)} placeholder="Inalatória / TIVA" /></label>
            <label className="pr-field"><span>Duração</span><input value={f.duracao} onChange={(e) => s('duracao')(e.target.value)} placeholder="90 min" /></label>
            <label className="pr-field"><span>Equipe</span><input value={f.equipe} onChange={(e) => s('equipe')(e.target.value)} placeholder="Cirurgião · anestesista" /></label>
          </div>
          <div className="pr-fieldrow c2" style={{ marginBottom: 12 }}>
            <label className="pr-field"><span>Valor cobrado (R$)</span><input className="num" value={f.valor || ''} onChange={(e) => s('valor')(Number(e.target.value.replace(/\D/g, '')) / 100 || 0)} placeholder="0,00" /></label>
            <label className="pr-field"><span>Custo estimado (R$)</span><input className="num" value={f.custo || ''} onChange={(e) => s('custo')(Number(e.target.value.replace(/\D/g, '')) / 100 || 0)} placeholder="0,00" /></label>
          </div>
          <label className="pr-field" style={{ marginBottom: 12 }}><span>Descrição do ato cirúrgico</span><textarea style={xTA} value={f.descricao} onChange={(e) => s('descricao')(e.target.value)} placeholder="Técnica, achados, intercorrências..." /></label>
          <label className="pr-field"><span>Pós-operatório</span><textarea style={xTA} value={f.posop} onChange={(e) => s('posop')(e.target.value)} placeholder="Recomendações, medicação, retorno..." /></label>
          <div className="fin-modal-actions" style={{ marginTop: 14 }}><button className="vt-btn-ghost" onClick={() => setF(null)}>Cancelar</button><button className="vt-btn-primary" onClick={save}>Salvar cirurgia</button></div>
        </div>
      )}
    </div>
  );
}

/* ---------- Internações ---------- */
function PrInternacoes({ at, patch }) {
  const rows = at.internacoes || [];
  const [f, setF] = xUse(null);
  const blank = { motivo: '', entrada: window.PR.todayBR(), box: '', alta: '', evolucao: '', status: 'internado', diaria: 0, totalDias: 0, custo: 0 };
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.motivo) { window.vtToast('Informe o motivo da internação.', 'err'); return; }
    if (f.id) patch({ internacoes: rows.map((r) => r.id === f.id ? f : r) });
    else patch({ internacoes: [{ id: 'IN' + Date.now().toString(36), ...f }, ...rows] });
    setF(null); window.vtToast('Internação registrada.', 'ok');
  };
  const alta = (id) => patch({ internacoes: rows.map((r) => r.id === id ? { ...r, status: 'alta', alta: r.alta || window.PR.todayBR() } : r) });
  const del = (id) => patch({ internacoes: rows.filter((r) => r.id !== id) });
  return (
    <div>
      <div className="pr-sec-head">
        <div><h2 className="pr-h">Internações</h2><p className="pr-h-sub">Internamento, evolução e alta</p></div>
        <button className="pr-qbtn primary" onClick={() => setF(blank)}><VtIcon name="plus" size={15} /> Nova internação</button>
      </div>
      {rows.length === 0 && !f ? <p className="pr-empty">Nenhuma internação registrada.</p> : null}
      <div className="vt-stack">
        {rows.map((r) => (
          <div key={r.id} className="vt-card vt-sec">
            <div className="pr-sec-head" style={{ marginBottom: 8 }}>
              <div><h3 className="vt-sec-title" style={{ margin: 0 }}>{r.motivo}</h3><p className="vt-muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>Entrada {r.entrada}{r.box ? ' · Box ' + r.box : ''}{r.alta ? ' · Alta ' + r.alta : ''}</p></div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className={`pr-status-pill ${r.status === 'alta' ? 'finalizado' : 'andamento'}`}>{r.status === 'alta' ? 'Alta' : 'Internado'}</span>
                {r.status !== 'alta' && <button className="pr-qbtn" style={{ padding: '5px 10px', fontSize: 11.5 }} onClick={() => alta(r.id)}>Dar alta</button>}
                <button className="vt-link" onClick={() => setF(r)}>Editar</button>
                <button className="pr-del-btn" onClick={() => del(r.id)}>✕</button>
              </div>
            </div>
            {r.evolucao && <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{r.evolucao}</p>}
            {(r.valor > 0 || r.diaria > 0) && <p style={{ margin: 0, fontSize: 12.5 }}>{r.diaria > 0 && <span style={{ color: 'var(--muted)' }}>Diária: {window.PR.money(r.diaria)} × {r.totalDias || 1} dia(s) = </span>}<span style={{ color: 'var(--green)', fontWeight: 700 }}>{window.PR.money(r.valor || 0)}</span></p>}
          </div>
        ))}
      </div>
      {f && (
        <div className="vt-card vt-sec" style={{ marginTop: 14 }}>
          <h3 className="vt-sec-title">{f.id ? 'Editar internação' : 'Nova internação'}</h3>
          <div className="pr-fieldrow c3">
            <label className="pr-field"><span>Motivo</span><input value={f.motivo} onChange={(e) => s('motivo')(e.target.value)} placeholder="Ex.: Pós-cirúrgico" /></label>
            <label className="pr-field"><span>Entrada</span><VtField value={f.entrada} onChange={s('entrada')} mask="date" /></label>
            <label className="pr-field"><span>Box / leito</span><input value={f.box} onChange={(e) => s('box')(e.target.value)} placeholder="Ex.: 03" /></label>
          </div>
          <div className="pr-fieldrow c3">
            <label className="pr-field"><span>Diária (R$)</span><input className="num" value={f.diaria || ''} onChange={(e) => { const d = Number(e.target.value.replace(/\D/g, '')) / 100 || 0; const dias = Number(f.totalDias) || 1; setF((p) => ({ ...p, diaria: d, valor: d * dias })); }} placeholder="0,00" /></label>
            <label className="pr-field"><span>Dias internado</span><input className="num" value={f.totalDias || ''} onChange={(e) => { const dias = Number(e.target.value.replace(/\D/g, '')) || 0; const d = Number(f.diaria) || 0; setF((p) => ({ ...p, totalDias: dias, valor: d * dias })); }} placeholder="1" /></label>
            <label className="pr-field"><span>Total cobrado (R$)</span><input className="num" value={f.valor || ''} onChange={(e) => s('valor')(Number(e.target.value.replace(/\D/g, '')) / 100 || 0)} placeholder="0,00" style={{ fontWeight: 700 }} /></label>
          </div>
          <label className="pr-field"><span>Evolução / observações</span><textarea style={xTA} value={f.evolucao} onChange={(e) => s('evolucao')(e.target.value)} placeholder="Evolução diária, medicações, sinais vitais..." /></label>
          <div className="fin-modal-actions" style={{ marginTop: 14 }}><button className="vt-btn-ghost" onClick={() => setF(null)}>Cancelar</button><button className="vt-btn-primary" onClick={save}>Salvar internação</button></div>
        </div>
      )}
    </div>
  );
}

/* ---------- Vendas ---------- */
function PrVendas({ at, patch }) {
  const rows = at.vendas || [];
  const setRows = (r) => patch({ vendas: r });
  const add = () => setRows([...rows, { id: 'VD' + Date.now().toString(36), item: '', qtd: 1, valor: 0 }]);
  const upd = (id, k, v) => setRows(rows.map((r) => r.id === id ? { ...r, [k]: v } : r));
  const del = (id) => setRows(rows.filter((r) => r.id !== id));
  const total = rows.reduce((sm, r) => sm + (Number(r.valor) || 0) * (Number(r.qtd) || 1), 0);
  return (
    <div>
      <div className="pr-sec-head">
        <div><h2 className="pr-h">Vendas</h2><p className="pr-h-sub">Produtos e serviços · lança no financeiro</p></div>
        <button className="pr-qbtn primary" disabled={!rows.length} style={!rows.length ? { opacity: .5 } : null} onClick={() => {
          const totalVenda = rows.reduce((s, r) => s + (Number(r.valor) || 0) * (Number(r.qtd) || 1), 0);
          if (totalVenda <= 0) { window.vtToast('Informe valores antes de fechar a venda.', 'err'); return; }
          const d = window.VtStore && window.VtStore.getData() || {};
          const fin = d.fin || { tx: [] };
          const today = new Date().toISOString().slice(0, 10);
          const newTxs = rows.filter((r) => r.item && (Number(r.valor) || 0) > 0).map((r) => ({
            id: 'T' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
            kind: 'receita', desc: r.item + (at.patientName ? ' — ' + at.patientName : ''),
            cat: 'Produtos', value: (Number(r.valor) || 0) * (Number(r.qtd) || 1),
            date: today, status: 'pendente', method: null, paidAt: null,
          }));
          if (window.VtStore) window.VtStore.setData({ fin: { ...fin, tx: [...newTxs, ...(fin.tx || [])] } });
          window.vtToast('Venda lançada em Finanças › A Receber. Total: ' + window.PR.money(totalVenda), 'ok');
        }}><VtIcon name="dollar" size={15} /> Fechar venda</button>
      </div>
      <div className="vt-card vt-sec">
        {rows.length === 0 ? <p className="pr-empty">Nenhum item de venda.</p> : (
          <table className="pr-dtable">
            <thead><tr><th>Item</th><th style={{ width: 70 }}>Qtd</th><th className="num" style={{ width: 120 }}>Valor un.</th><th className="num" style={{ width: 130 }}>Subtotal</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><input value={r.item} onChange={(e) => upd(r.id, 'item', e.target.value)} placeholder="Produto ou serviço" /></td>
                  <td><input className="num" value={r.qtd} onChange={(e) => upd(r.id, 'qtd', e.target.value.replace(/\D/g, ''))} /></td>
                  <td><input className="num" value={r.valor} onChange={(e) => upd(r.id, 'valor', e.target.value.replace(/\D/g, ''))} placeholder="0" /></td>
                  <td className="num" style={{ fontWeight: 700 }}>{window.PR.money((Number(r.valor) || 0) * (Number(r.qtd) || 1))}</td>
                  <td><button className="pr-del-btn" onClick={() => del(r.id)}>✕</button></td>
                </tr>
              ))}
              <tr><td style={{ fontWeight: 700 }}>Total</td><td></td><td></td><td className="num" style={{ fontWeight: 800, color: 'var(--teal-d)', fontSize: 16 }}>{window.PR.money(total)}</td><td></td></tr>
            </tbody>
          </table>
        )}
        <button className="pr-addrow" onClick={add}><VtIcon name="plus" size={14} /> Adicionar item</button>
      </div>
    </div>
  );
}

Object.assign(window, { PrAgendamento, PrRetornos, PrAtestados, PrMedicamentos, PrCirurgias, PrInternacoes, PrVendas });
