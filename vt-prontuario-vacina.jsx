/* ============================================================
   VetTooth Pro — Vacinação
   Registro de vacinas + controle de aplicadas e agendadas.
   Protocolos vacinais (cães, gatos, equinos, bovinos):
     - Filhotes: série inicial com reforços a cada 21–30 dias
     - Reforços anuais (rotina) e semestrais (algumas)
   Referências de prática clínica (WSAVA p/ pequenos animais;
   calendários de equinos/bovinos).
   ============================================================ */
const { useState: vUse, useRef: vRef } = React;

/* ---- mapeia espécie do paciente p/ grupo de protocolo ---- */
function vacSpeciesGroup(species) {
  const s = (species || '').toLowerCase();
  if (/gato|felin/.test(s)) return 'gato';
  if (/cavalo|equ|égua|egua|potr/.test(s)) return 'equino';
  if (/boi|vaca|bovin|bezerr|novilh/.test(s)) return 'bovino';
  return 'cao';
}

/* ---- intervalos de protocolo (em dias) ---- */
const VAC_INTERVALS = [
  { id: 'dose_unica', label: 'Dose única', days: 0 },
  { id: 'serie_30', label: 'Série filhote — reforço 21–30 dias', days: 28 },
  { id: 'semestral', label: 'Semestral (6 meses)', days: 182 },
  { id: 'anual', label: 'Anual (12 meses)', days: 365 },
];

/* ---- catálogo de vacinas por espécie ---- */
const VAC_CATALOG = {
  cao: [
    { nome: 'V10 / V8 (Polivalente)', proto: 'serie_30', doses: 'Cinomose, parvovirose, hepatite, parainfluenza, lepto', obs: 'Filhotes: 3–4 doses a partir de 6–8 sem, reforço a cada 21–30 dias até 16 sem. Adulto: anual.' },
    { nome: 'Antirrábica', proto: 'anual', doses: 'Raiva', obs: 'A partir de 12 sem. Reforço anual.' },
    { nome: 'Tosse dos canis (Bordetella)', proto: 'anual', doses: 'Bordetella / parainfluenza', obs: 'Anual; semestral em alto risco (creches, hotéis).' },
    { nome: 'Giárdia', proto: 'serie_30', doses: 'Giardia lamblia', obs: '2 doses com 21 dias; reforço anual.' },
    { nome: 'Leishmaniose', proto: 'serie_30', doses: 'Leishmania', obs: '3 doses com 21 dias; reforço anual. Teste prévio.' },
    { nome: 'Gripe canina (Influenza)', proto: 'serie_30', doses: 'Influenza H3N2/H3N8', obs: '2 doses com 21 dias; reforço anual.' },
  ],
  gato: [
    { nome: 'Quíntupla felina (V5)', proto: 'serie_30', doses: 'Rinotraqueíte, calicivirose, panleucopenia, clamidiose, FeLV', obs: 'A partir de 8 sem, reforço a cada 21–30 dias até 16 sem. Anual.' },
    { nome: 'Tríplice felina (V3)', proto: 'serie_30', doses: 'Rinotraqueíte, calicivirose, panleucopenia', obs: 'Série inicial filhote; reforço anual.' },
    { nome: 'Antirrábica', proto: 'anual', doses: 'Raiva', obs: 'A partir de 12 sem. Reforço anual.' },
    { nome: 'Leucemia felina (FeLV)', proto: 'serie_30', doses: 'FeLV', obs: '2 doses com 21 dias; teste FeLV prévio. Anual.' },
  ],
  equino: [
    { nome: 'Influenza equina', proto: 'semestral', doses: 'Influenza A/equi', obs: 'Série inicial 2 doses (21–30 dias); reforço semestral.' },
    { nome: 'Tétano', proto: 'anual', doses: 'Clostridium tetani', obs: 'Série inicial 2 doses; reforço anual.' },
    { nome: 'Encefalomielite (EEE/WEE)', proto: 'anual', doses: 'Encefalomielites', obs: 'Anual; semestral em região endêmica.' },
    { nome: 'Raiva', proto: 'anual', doses: 'Raiva', obs: 'Reforço anual.' },
    { nome: 'Rinopneumonite (EHV-1/4)', proto: 'semestral', doses: 'Herpesvírus equino', obs: 'Éguas gestantes: 5º, 7º e 9º mês. Demais: semestral.' },
  ],
  bovino: [
    { nome: 'Febre aftosa', proto: 'semestral', doses: 'Vírus da febre aftosa', obs: 'Conforme campanha oficial (semestral).' },
    { nome: 'Brucelose (B19/RB51)', proto: 'dose_unica', doses: 'Brucella abortus', obs: 'Fêmeas de 3 a 8 meses, dose única (obrigatória).' },
    { nome: 'Raiva', proto: 'anual', doses: 'Raiva', obs: 'Reforço anual; área de morcego hematófago.' },
    { nome: 'Clostridioses (Polivalente)', proto: 'serie_30', doses: 'Carbúnculo, gangrena, enterotoxemia', obs: '2 doses iniciais (30 dias); reforço anual.' },
    { nome: 'IBR / BVD', proto: 'serie_30', doses: 'Rinotraqueíte / diarreia viral bovina', obs: '2 doses (30 dias); reforço anual.' },
  ],
};

/* ---- datas (DD/MM/AAAA) ---- */
function vParse(d) { const m = (d || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
function vFmt(date) { return date.toLocaleDateString('pt-BR'); }
function vAddDays(d, days) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
function vToday() { return new Date(new Date().toDateString()); }
function vStatus(prox) {
  const d = vParse(prox); if (!d) return null;
  const diff = Math.round((d - vToday()) / 864e5);
  if (diff < 0) return { cls: 'red', label: 'Atrasada', txt: `há ${Math.abs(diff)} dia(s)` };
  if (diff <= 30) return { cls: 'amber', label: 'Próxima', txt: `em ${diff} dia(s)` };
  return { cls: 'teal', label: 'Agendada', txt: vFmt(d) };
}
function vReminder(prox) { const d = vParse(prox); return d ? vFmt(vAddDays(d, -3)) : ''; }
/* registra a próxima dose na agenda da clínica/MV (mock de integração) */
window.vtScheduleVaccine = function (patient, vac) {
  if (!vac || !vac.proxima || !window.VtStore) return;
  const d = window.VtStore.getData() || {};
  const list = Array.isArray(d.vacAgenda) ? d.vacAgenda : [];
  window.VtStore.setData({ vacAgenda: [...list, { id: 'VA' + Date.now().toString(36), patientId: patient.id, patientName: patient.name, tipo: vac.tipo, date: vac.proxima, vet: vac.vet || '', reminder: vReminder(vac.proxima), confirmado: false }] });
};

/* ---------- Aba Vacinação ---------- */
function VacinaTab({ p, vaccines, onSave, vet }) {
  const [modal, setModal] = vUse(false);
  const list = [...vaccines].sort((a, b) => (vParse(b.aplicacao) || 0) - (vParse(a.aplicacao) || 0));
  const agendadas = vaccines.filter((v) => v.proxima).map((v) => ({ ...v, st: vStatus(v.proxima) }))
    .filter((v) => v.st).sort((a, b) => (vParse(a.proxima) || 0) - (vParse(b.proxima) || 0));
  const atrasadas = agendadas.filter((v) => v.st.cls === 'red').length;
  const proximas = agendadas.filter((v) => v.st.cls === 'amber').length;

  const save = (entry) => {
    const isNew = !entry.id;
    const saved = isNew ? { ...entry, id: 'VC' + Date.now().toString(36) } : entry;
    if (entry.id) onSave(vaccines.map((v) => v.id === entry.id ? saved : v));
    else onSave([saved, ...vaccines]);
    setModal(false);
    if (saved.proxima) {
      window.vtScheduleVaccine(p, saved);
      window.vtToast(`Vacina registrada. Próxima dose agendada (${saved.proxima}) · lembrete ao tutor em ${vReminder(saved.proxima)}.`, 'ok');
    } else {
      window.vtToast('Vacina registrada.', 'ok');
    }
  };
  const remove = (id) => onSave(vaccines.filter((v) => v.id !== id));

  return (
    <div>
      <div className="pr-sec-head">
        <div><h2 className="pr-h">Vacinação</h2><p className="pr-h-sub">Carteira de vacinas, protocolos e próximas doses de {p.name}</p></div>
        <button className="pr-qbtn primary" onClick={() => setModal({})}><VtIcon name="plus" size={16} /> Registrar vacina</button>
      </div>

      <div className="pr-4col pr-block">
        <div className="vt-card pr-tile"><span className="pr-tile-l">Aplicadas</span><span className="pr-tile-v">{vaccines.length}</span></div>
        <div className="vt-card pr-tile"><span className="pr-tile-l">Próximas (30 dias)</span><span className="pr-tile-v" style={{ color: proximas ? 'var(--amber)' : 'var(--ink)' }}>{proximas}</span></div>
        <div className="vt-card pr-tile"><span className="pr-tile-l">Atrasadas</span><span className="pr-tile-v" style={{ color: atrasadas ? 'var(--red)' : 'var(--ink)' }}>{atrasadas}</span></div>
        <div className="vt-card pr-tile"><span className="pr-tile-l">Próxima dose</span><span className="pr-tile-v" style={{ fontSize: 15 }}>{agendadas[0] ? agendadas[0].proxima : '—'}</span></div>
      </div>

      <div className="pr-block">
        <p className="pr-block-title"><VtIcon name="calendar" size={15} /> Próximas doses & agendadas</p>
        {agendadas.length === 0 ? <p className="pr-empty">Nenhuma dose agendada. Ao registrar uma vacina, a próxima dose é calculada pelo protocolo.</p> : (
          <div className="vac-sched">
            {agendadas.map((v) => (
              <div key={v.id} className={`vac-sched-row ${v.st.cls}`}>
                <span className="vac-dot" />
                <div style={{ flex: 1 }}><b>{v.tipo}</b><i>{(VAC_INTERVALS.find((x) => x.id === v.protocolo) || {}).label || v.protocolo} · 📅 na agenda · lembrete ao tutor em {vReminder(v.proxima)}</i></div>
                <span className="vac-due">{v.proxima}</span>
                <span className={`vt-tag ${v.st.cls === 'red' ? 'red' : v.st.cls === 'amber' ? 'amber' : 'teal'}`}>{v.st.label} · {v.st.txt}</span>
                <button className="pr-qbtn" style={{ padding: '5px 10px', fontSize: 11.5 }} onClick={() => window.vtToast(`Confirmação de vacinação enviada ao tutor ${p.owner} via WhatsApp.`, 'ok')}>💬 Confirmar</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pr-block">
        <p className="pr-block-title"><VtIcon name="receipt" size={15} /> Vacinas aplicadas</p>
        <div className="vt-card vt-sec" style={{ padding: 0, overflow: 'hidden' }}>
          {list.length === 0 ? <p className="pr-empty">Nenhuma vacina registrada.</p> : (
            <table className="pr-dtable vac-table">
              <thead><tr><th>Vacina</th><th>Aplicação</th><th>Marca · Lote</th><th>Validade</th><th>Próxima</th><th>Etiqueta</th><th></th></tr></thead>
              <tbody>
                {list.map((v) => (
                  <tr key={v.id} className="vac-applied">
                    <td><b style={{ fontWeight: 700 }}>{v.tipo}</b></td>
                    <td className="vt-muted">{v.aplicacao}<br /><span style={{ fontSize: 11.5 }}>{v.vet}</span></td>
                    <td>{v.marca || '—'}<br /><span className="vt-muted" style={{ fontSize: 11.5 }}>Lote {v.lote || '—'}</span></td>
                    <td className="vt-muted">{v.vencimento || '—'}</td>
                    <td>{v.proxima ? <span className="vt-tag teal">{v.proxima}</span> : '—'}</td>
                    <td>{v.foto ? <img src={v.foto} alt="etiqueta" className="vac-thumb" onClick={() => window.open(v.foto, '_blank')} /> : <span className="vt-muted" style={{ fontSize: 11.5 }}>—</span>}</td>
                    <td><button className="pr-del-btn" onClick={() => remove(v.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && <VacinaModal p={p} vet={vet} entry={modal.id ? modal : null} onClose={() => setModal(false)} onSave={save} />}
    </div>
  );
}

/* ---------- Modal de registro de vacina ---------- */
function VacinaModal({ p, vet, entry, onClose, onSave }) {
  const group = vacSpeciesGroup(p.species);
  const catalog = VAC_CATALOG[group] || VAC_CATALOG.cao;
  const [f, setF] = vUse(() => {
    if (entry) return entry;
    const proto = catalog[0].proto;
    const interval = VAC_INTERVALS.find((x) => x.id === proto);
    const today = window.PR.todayBR();
    const base = vParse(today);
    const proxima = (interval && interval.days > 0 && base) ? vFmt(vAddDays(base, interval.days)) : '';
    return {
      tipo: catalog[0].nome, protocolo: proto, marca: '', lote: '',
      fabricacao: '', vencimento: '', aplicacao: today, vet: vet || '',
      proxima, foto: '', obs: '',
    };
  });
  const s = (k) => (val) => setF((p2) => ({ ...p2, [k]: val }));
  const inp = vRef(null);
  const cat = catalog.find((c) => c.nome === f.tipo);

  // ao mudar tipo/protocolo/aplicação → recalcula próxima dose
  const recalc = (next) => {
    const interval = VAC_INTERVALS.find((x) => x.id === next.protocolo);
    const base = vParse(next.aplicacao);
    if (interval && interval.days > 0 && base) next.proxima = vFmt(vAddDays(base, interval.days));
    else next.proxima = '';
    return next;
  };
  const setTipo = (nome) => { const c = catalog.find((x) => x.nome === nome); setF((p2) => recalc({ ...p2, tipo: nome, protocolo: c ? c.proto : p2.protocolo })); };
  const setProto = (id) => setF((p2) => recalc({ ...p2, protocolo: id }));
  const setAplic = (d) => setF((p2) => recalc({ ...p2, aplicacao: d }));

  const onFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader(); r.onload = () => s('foto')(r.result); r.readAsDataURL(file);
  };
  const submit = () => {
    if (!f.tipo) { window.vtToast('Selecione o tipo de vacina.', 'err'); return; }
    onSave(f);
  };

  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 620, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h3>{entry ? 'Editar vacina' : 'Registrar vacina'} · {p.name}</h3>
        <p>Espécie identificada: <b>{p.species}</b> — protocolos sugeridos automaticamente.</p>

        <div className="pr-fieldrow c2">
          <label className="pr-field"><span>Tipo de vacina</span>
            <select value={f.tipo} onChange={(e) => setTipo(e.target.value)}>
              {catalog.map((c) => <option key={c.nome}>{c.nome}</option>)}
              <option>Outra</option>
            </select>
          </label>
          <label className="pr-field"><span>Protocolo vacinal</span>
            <select value={f.protocolo} onChange={(e) => setProto(e.target.value)}>
              {VAC_INTERVALS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
          </label>
        </div>
        {f.tipo === 'Outra' && <label className="pr-field" style={{ marginBottom: 14 }}><span>Nome da vacina</span><input value={f.tipoCustom || ''} onChange={(e) => setF((p2) => ({ ...p2, tipoCustom: e.target.value, tipo: e.target.value || 'Outra' }))} placeholder="Nome da vacina" /></label>}
        {cat && cat.obs && <p className="vt-ai-note" style={{ marginBottom: 14 }}><VtIcon name="spark" size={15} /> {cat.doses}. {cat.obs}</p>}

        <div className="pr-fieldrow c2">
          <label className="pr-field"><span>Marca / fabricante</span><input value={f.marca} onChange={(e) => s('marca')(e.target.value)} placeholder="Ex.: Zoetis, MSD, Ceva" /></label>
          <label className="pr-field"><span>Lote</span><input value={f.lote} onChange={(e) => s('lote')(e.target.value)} placeholder="Ex.: ABC1234" /></label>
        </div>
        <div className="pr-fieldrow c3">
          <label className="pr-field"><span>Fabricação</span><VtField value={f.fabricacao} onChange={s('fabricacao')} mask="date" placeholder="DD/MM/AAAA" /></label>
          <label className="pr-field"><span>Vencimento</span><VtField value={f.vencimento} onChange={s('vencimento')} mask="date" placeholder="DD/MM/AAAA" /></label>
          <label className="pr-field"><span>Data de aplicação</span><VtField value={f.aplicacao} onChange={setAplic} mask="date" placeholder="DD/MM/AAAA" /></label>
        </div>
        <div className="pr-fieldrow c2">
          <label className="pr-field"><span>Veterinário</span><input value={f.vet} onChange={(e) => s('vet')(e.target.value)} placeholder="Responsável pela aplicação" /></label>
          <label className="pr-field"><span>Próxima dose <i style={{ color: 'var(--teal-d)', fontStyle: 'normal' }}>(auto)</i></span><VtField value={f.proxima} onChange={s('proxima')} mask="date" placeholder="—" /></label>
        </div>

        <label className="pr-field" style={{ marginBottom: 14 }}><span>Foto da etiqueta da vacina</span>
          <div className="vac-photo" onClick={() => inp.current && inp.current.click()}>
            {f.foto ? <img src={f.foto} alt="etiqueta" /> : <span><VtIcon name="plus" size={20} /> Enviar foto da etiqueta</span>}
            <input ref={inp} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
          </div>
        </label>

        <label className="pr-field" style={{ marginBottom: 4 }}><span>Observações</span><textarea value={f.obs} onChange={(e) => s('obs')(e.target.value)} placeholder="Reações, local de aplicação, observações..." /></label>

        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={submit}>Salvar vacina</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { VacinaTab, VacinaModal, vacSpeciesGroup, VAC_CATALOG, VAC_INTERVALS });
