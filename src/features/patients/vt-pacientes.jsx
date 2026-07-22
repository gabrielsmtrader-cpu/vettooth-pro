/* ============================================================
   VetTooth Pro — Pacientes (lista + perfil + cadastro)
   ============================================================ */
function speciesIcon(sp) {
  if (sp === 'Cavalo') return 'M4 14c1-4 4-6 8-6s7 2 8 6c-2 1-3 3-3 5h-3v-3l-2 1-2-1v3H5c0-2-1-4-1-5z';
  return 'paw';
}
function StatusPill({ status }) {
  const map = { 'Ativo': ['var(--green)', 'var(--green-t)'], 'Inativo': ['var(--amber)', 'var(--amber-t)'], 'Óbito': ['var(--muted)', '#eef1f5'] };
  const [c, bg] = map[status] || map['Ativo'];
  return <span className="vt-pill" style={{ color: c, background: bg }}>{status}</span>;
}
function SpeciesTag({ sp }) {
  return <span className="vt-sp-tag">{sp}</span>;
}
function speciesGlyph(sp) {
  const s = (sp || '').toLowerCase();
  if (/gato|felin/.test(s)) return '🐱';
  if (/cavalo|equ|égua|potr/.test(s)) return '🐴';
  if (/boi|vaca|bovin|bezerr|novilh/.test(s)) return '🐮';
  if (/ave|p[aá]ssaro|calop|periqu|papag|cana|arara|galinha/.test(s)) return '🐦';
  if (/coelho/.test(s)) return '🐰';
  if (/roedor|hamster|porqu|chinch|gerbil|rato/.test(s)) return '🐹';
  if (/r[eé]ptil|jabuti|tartar|iguana|gecko|jiboia/.test(s)) return '🦎';
  return '🐶';
}
function speciesColor(sp) {
  const s = (sp || '').toLowerCase();
  if (/gato|felin/.test(s)) return '#e6f0fb';
  if (/cavalo|equ/.test(s)) return '#f0e8df';
  if (/bovin|boi|vaca/.test(s)) return '#eaf6ed';
  if (/ave/.test(s)) return '#fef3e2';
  if (/coelho/.test(s)) return '#fbe9f1';
  return '#e2f4f3';
}
function PetAvatar({ p, lg }) {
  const cls = `vt-pet-avatar${lg ? ' lg' : ''}`;
  if (p.photo && typeof p.photo === 'string' && p.photo.startsWith('data:')) {
    return <span className={cls} style={{ backgroundImage: `url(${p.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />;
  }
  // sem foto cadastrada → ilustração da espécie/raça
  return <span className={cls} style={{ background: speciesColor(p.species), fontSize: lg ? 30 : 17 }}>{speciesGlyph(p.species)}</span>;
}

function PatientsList({ patients, onOpen, onNew }) {
  const [q, setQ] = vtUseState('');
  const [sp, setSp] = vtUseState('Todos');
  const [vet, setVet] = vtUseState('Todos');
  const [st, setSt] = vtUseState('Todos');
  const [layout, setLayout] = vtUseState('grid');
  const [exp, setExp] = vtUseState(null);
  const d = (window.VtStore && window.VtStore.getData()) || {};
  const ats = d.atendimentos || [];
  const vets = (window.vtVets ? window.vtVets() : []).map((v) => v.name);
  const vetOf = (p) => { const a = ats.filter((x) => x.patientId === p.id).slice(-1)[0]; return a ? (a.vet || '').replace('M.V. ', '') : ''; };
  const list = patients.filter((p) => {
    const hay = [p.name, p.species, p.breed, p.id, (window.vtPacienteCode ? window.vtPacienteCode(p) : ''), p.owner, p.chip].filter(Boolean).join(' ').toLowerCase();
    return (sp === 'Todos' || p.species === sp) &&
    (vet === 'Todos' || vetOf(p) === vet) &&
    (st === 'Todos' || (st === 'Ativo' ? p.status !== 'Inativo' && p.status !== 'Óbito' && p.status !== 'Arquivado' : p.status === st)) &&
    (!q.trim() || hay.includes(q.trim().toLowerCase()));
  }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  const emoji = (s) => { s = (s || '').toLowerCase(); if (/gato|felin/.test(s)) return '🐈'; if (/cavalo|equ|égua|potr/.test(s)) return '🐴'; if (/boi|vaca|bovin/.test(s)) return '🐄'; if (/ave|p[aá]ssaro|calop|periqu|papag|arara/.test(s)) return '🐦'; if (/coelho/.test(s)) return '🐰'; if (/r[eé]ptil|jabuti|tartar|iguana/.test(s)) return '🦎'; return '🐕'; };
  const ageOf = (p) => { if (p.birth && window.vtBirthToAge) { const a = window.vtBirthToAge(p.birth); if (a) return `${a.anos}a ${a.meses}m`; } return p.idade || '—'; };
  const histOf = (p) => ats.filter((a) => a.patientId === p.id).sort((a, b) => (b.id || '').localeCompare(a.id || '')).slice(0, 3);
  const ag = d.agendaAppts || [];
  const fmtNext = (iso) => window.vtDate ? window.vtDate(iso) : (iso ? (() => { const dd = new Date(iso + 'T00:00:00'); return `${dd.getDate()}/${String(dd.getMonth() + 1).padStart(2, '0')}/${dd.getFullYear()}`; })() : '');
  const fmtDate = (d) => window.vtDate ? window.vtDate(d) : (d || '');
  const nextOf = (p) => { const today = new Date().toISOString().slice(0, 10); return (ag.filter((a) => a.patient === p.name && a.status !== 'Cancelado' && (a.date || '') >= today).sort((a, b) => (a.date || '').localeCompare(b.date || '')))[0]; };
  return (
    <div>
      <div className="vt-page-head vt-head-row">
        <div><h1>Pacientes</h1><p>{patients.length} animais cadastrados · {list.length} no filtro</p></div>
        <button className="vt-btn-primary" onClick={onNew}><VtIcon name="plus" size={17} /> Novo paciente</button>
      </div>
      <div className="vt-toolbar-row" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="vt-search inline">
          <VtIcon name="search" size={17} />
          <input placeholder="Buscar por nome, espécie, raça, tutor ou ID..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="vtf" style={{ flex: 'none', width: 150 }}><span className="vtf-inputwrap"><select className="vtf-input" value={sp} onChange={(e) => setSp(e.target.value)}>{['Todos', 'Cão', 'Gato', 'Cavalo', 'Bovino', 'Ave', 'Coelho', 'Roedor', 'Réptil'].map((s) => <option key={s}>{s}</option>)}</select></span></label>
        <label className="vtf" style={{ flex: 'none', width: 170 }}><span className="vtf-inputwrap"><select className="vtf-input" value={vet} onChange={(e) => setVet(e.target.value)}><option>Todos</option>{vets.map((v) => <option key={v}>{v}</option>)}</select></span></label>
        <label className="vtf" style={{ flex: 'none', width: 140 }}><span className="vtf-inputwrap"><select className="vtf-input" value={st} onChange={(e) => setSt(e.target.value)}>{['Todos', 'Ativo', 'Inativo', 'Arquivado', 'Óbito'].map((s) => <option key={s}>{s}</option>)}</select></span></label>
        <div className="vt-viewtoggle">
          <button className={layout === 'grid' ? 'on' : ''} onClick={() => setLayout('grid')} title="Grade"><VtIcon name="grid" size={16} /></button>
          <button className={layout === 'list' ? 'on' : ''} onClick={() => setLayout('list')} title="Lista"><VtIcon name="receipt" size={16} /></button>
        </div>
      </div>

      {layout === 'grid' ? (
        <div className="vt-pat-grid">
          {list.map((p, idx) => {
            const hist = histOf(p);
            const nx = nextOf(p);
            const hasPhoto = p.photo && typeof p.photo === 'string' && p.photo.startsWith('data:');
            return (
              <div key={p.id + '-' + idx} className="vt-card vt-pat-card">
                <button className="vt-pat-card-main" onClick={() => onOpen(p)}>
                  <span className="vt-pat-emoji" style={hasPhoto ? { backgroundImage: `url(${p.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: speciesColor(p.species) }}>
                    {hasPhoto ? '' : (p.name[0] || '?').toUpperCase()}
                    <span className="vt-pat-emoji-badge">{emoji(p.species)}</span>
                  </span>
                  <span className="vt-pat-info">
                    <b>{p.name} <StatusPill status={p.status} /></b>
                    <i>{p.species} · {p.breed || '—'}</i>
                    <span className="vt-pat-sub"><b className="vt-pac-code">{window.vtPacienteCode ? window.vtPacienteCode(p) : p.id}</b> · {ageOf(p)} · Tutor: {p.owner || '—'}</span>
                    <span className={`vt-pat-next${nx ? '' : ' none'}`}><VtIcon name="calendar" size={13} /> {nx ? `Próximo: ${fmtNext(nx.date)}` : 'Sem agendamento'}</span>
                  </span>
                </button>
                <div className="vt-pat-foot">
                  <button className="vt-pat-exp" onClick={() => setExp(exp === p.id ? null : p.id)}>{exp === p.id ? 'Ocultar histórico' : 'Histórico resumido'} <VtIcon name="chevron" size={13} /></button>
                  <span className="vt-muted" style={{ fontSize: 11.5 }}>Últ. visita {fmtDate(p.lastVisit) || '—'}</span>
                </div>
                {exp === p.id && (
                  <div className="vt-pat-hist">
                    {hist.length === 0 ? <p className="vt-muted" style={{ fontSize: 12.5, margin: 0 }}>Sem atendimentos registrados.</p> : hist.map((a, i) => (
                      <div key={i} className="vt-pat-hist-row"><span className="dot" style={{ background: a.vetColor || 'var(--teal)' }} /><div><b>{a.type || 'Atendimento'}</b><i>{a.date || ''}{a.procedure ? ' · ' + a.procedure : ''}</i></div></div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {list.length === 0 && <div className="vt-empty-row">Nenhum paciente encontrado.</div>}
        </div>
      ) : (
        <div className="vt-card vt-table-card">
          <div className="vt-table">
            <div className="vt-tr vt-th">
              <span>Paciente</span><span>Espécie</span><span>Raça</span><span>Idade</span><span>Tutor</span><span>Status</span>
            </div>
            {list.map((p, idx) => (
              <button key={p.id + '-' + idx} className="vt-tr vt-row-btn" onClick={() => onOpen(p)}>
                <span className="vt-cell-name">
                  <PetAvatar p={p} />
                  <span><b>{p.name}</b><i className="vt-id">{window.vtPacienteCode ? window.vtPacienteCode(p) : p.id}</i></span>
                </span>
                <span><SpeciesTag sp={p.species} /></span>
                <span className="vt-muted">{p.breed}</span>
                <span className="vt-muted">{ageOf(p)}</span>
                <span>{p.owner}</span>
                <span><StatusPill status={p.status} /></span>
              </button>
            ))}
            {list.length === 0 && <div className="vt-empty-row">Nenhum paciente encontrado.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoTile({ label, value }) {
  return <div className="vt-info-tile"><span className="vt-info-label">{label}</span><span className="vt-info-value">{value || '—'}</span></div>;
}
function Chips({ items, empty, tone }) {
  if (!items || !items.length) return <span className="vt-muted">{empty}</span>;
  return <span className="vt-chip-row">{items.map((i, k) => <span key={k} className={`vt-tag ${tone || ''}`}>{i}</span>)}</span>;
}

function TransferModal({ patient, onClose, onTransfer }) {
  const d = (window.VtStore && window.VtStore.getData()) || {};
  // todos os responsáveis: cadastrados + derivados dos pacientes
  const ownersAll = (() => {
    const out = (d.owners || []).slice();
    (d.patients || []).forEach((p) => { if (p.owner && !out.some((o) => o.name === p.owner)) out.push({ id: 'C-auto-' + p.id, name: p.owner, phone: p.phone || p.whats || '', _fromPatient: true }); });
    return out.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  })();
  // propriedades: cadastradas + derivadas de pacientes equinos
  const propsAll = (() => {
    const set = new Set();
    (d.propriedades || []).forEach((p) => p && p.nome && set.add(p.nome));
    (d.patients || []).forEach((p) => { if (p.property && p.property.name) set.add(p.property.name); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  })();
  const isHorse = patient.species === 'Cavalo';

  const [q, setQ] = vtUseState('');
  const [tutor, setTutor] = vtUseState(patient.owner || '');
  const [creating, setCreating] = vtUseState(false);
  const [newName, setNewName] = vtUseState('');
  const [newPhone, setNewPhone] = vtUseState('');
  const [propQ, setPropQ] = vtUseState('');
  const [prop, setProp] = vtUseState((patient.property && patient.property.name) || '');

  const filtered = ownersAll.filter((o) => o.name.toLowerCase().includes(q.toLowerCase().trim()));
  const propFiltered = propsAll.filter((p) => p.toLowerCase().includes(propQ.toLowerCase().trim()));

  const confirm = () => {
    let tutorName = tutor;
    let newOwnerObj = null;
    if (creating) {
      if (!newName.trim()) { window.vtToast('Informe o nome do novo responsável.', 'err'); return; }
      tutorName = newName.trim();
      newOwnerObj = { name: tutorName, phone: newPhone || '' };
    }
    if (!tutorName) { window.vtToast('Selecione ou cadastre um responsável.', 'err'); return; }
    onTransfer(tutorName, isHorse ? (prop || propQ || null) : null, newOwnerObj);
  };

  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal vt-xfer-modal" onClick={(e) => e.stopPropagation()}>
        <button className="fin-modal-x" onClick={onClose}>×</button>
        <h3>Transferir {patient.name}</h3>
        <p>Vincule o paciente a outro responsável{isHorse ? ' e/ou propriedade' : ''}. O responsável atual permanece cadastrado mesmo sem animais.</p>

        <div className="vt-xfer-sec">Responsável</div>
        {tutor && !creating && (
          <div className="vt-xfer-chip"><span><b>{tutor}</b>{tutor === patient.owner ? <i> (atual)</i> : null}</span><button className="vt-link" onClick={() => setTutor('')}>Trocar</button></div>
        )}
        {!tutor && !creating && (
          <>
            <div className="vt-search inline" style={{ margin: '2px 0 8px' }}><VtIcon name="search" size={16} /><input autoFocus placeholder="Buscar responsável cadastrado…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="vt-xfer-list">
              {filtered.map((o) => (
                <button key={o.id} className="vt-xfer-item" onClick={() => { setTutor(o.name); setCreating(false); }}>
                  <span className="vt-xfer-av">{(o.name[0] || '?').toUpperCase()}</span>
                  <span style={{ flex: 1, minWidth: 0 }}><b>{o.name}</b>{o.phone ? <i>{o.phone}</i> : null}</span>
                  <VtIcon name="chevron" size={15} />
                </button>
              ))}
              {filtered.length === 0 && <p className="pr-empty">Nenhum responsável encontrado.</p>}
              <button className="vt-xfer-new" onClick={() => { setCreating(true); setNewName(q); }}><VtIcon name="plus" size={14} /> Cadastrar novo responsável</button>
            </div>
          </>
        )}
        {creating && (
          <div className="vt-xfer-create">
            <div className="vt-form-row" style={{ margin: 0 }}>
              <VtField label="Nome do responsável" value={newName} onChange={setNewName} placeholder="Nome completo" width="56%" required />
              <VtField label="Telefone / WhatsApp" value={newPhone} onChange={(v) => setNewPhone(window.maskPhone ? window.maskPhone(v) : v)} placeholder="(00) 00000-0000" width="40%" />
            </div>
            <button className="vt-link" style={{ marginTop: 8 }} onClick={() => { setCreating(false); setNewName(''); setNewPhone(''); }}>← Escolher um já cadastrado</button>
          </div>
        )}

        {isHorse && (
          <>
            <div className="vt-xfer-sec">Propriedade</div>
            {prop ? (
              <div className="vt-xfer-chip"><span><b>{prop}</b>{prop === (patient.property && patient.property.name) ? <i> (propriedade atual)</i> : null}</span><button className="vt-link" onClick={() => { setProp(''); setPropQ(''); }}>Trocar</button></div>
            ) : (
              <>
                <div className="vt-search inline" style={{ margin: '2px 0 8px' }}><VtIcon name="search" size={16} /><input placeholder="Buscar ou digitar nova propriedade…" value={propQ} onChange={(e) => setPropQ(e.target.value)} /></div>
                <div className="vt-xfer-list">
                  {propFiltered.map((p) => (
                    <button key={p} className="vt-xfer-item" onClick={() => setProp(p)}>
                      <span className="vt-xfer-av" style={{ background: '#92633b' }}>🐴</span>
                      <span style={{ flex: 1, minWidth: 0 }}><b>{p}</b></span>
                      <VtIcon name="chevron" size={15} />
                    </button>
                  ))}
                  {propQ.trim() && !propsAll.some((p) => p.toLowerCase() === propQ.toLowerCase().trim()) && (
                    <button className="vt-xfer-new" onClick={() => setProp(propQ.trim())}><VtIcon name="plus" size={14} /> Usar nova propriedade “{propQ.trim()}”</button>
                  )}
                  {propFiltered.length === 0 && !propQ.trim() && <p className="pr-empty">Nenhuma propriedade cadastrada.</p>}
                </div>
              </>
            )}
          </>
        )}

        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={confirm}><VtIcon name="paw" size={15} /> Transferir</button>
        </div>
      </div>
    </div>
  );
}

/* ---- Gerador de PDF da ficha do paciente ---- */
async function vtGerarFichaPDF(p, ownerData, history, includeInternal) {
  const clinica = (window.VtStore && window.VtStore.getClinica && window.VtStore.getClinica()) || {};
  const nomeCli = clinica.nome || 'VetTooth Pro';
  const last = history[0] || {};
  const addrOwner = ownerData.address ? [ownerData.address.street, ownerData.address.num, ownerData.address.district, ownerData.address.city, ownerData.address.state].filter(Boolean).join(', ') : '';
  const tag = (label, val) => val ? `<tr><td style="color:#555;width:140px;padding:3px 8px 3px 0">${label}</td><td style="padding:3px 0"><b>${val}</b></td></tr>` : '';
  const propBlock = (p.species === 'Cavalo' && p.property && p.property.name) ? `
    <div style="background:#f5f0e8;border-radius:8px;padding:12px 16px;margin:16px 0">
      <b style="color:#92633b">🐴 Propriedade: ${p.property.name}</b>
      <table style="margin-top:6px;font-size:13px;border-collapse:collapse">
        ${tag('Responsável', p.property.owner)}
        ${tag('Telefone', p.property.phone)}
        ${tag('Cidade', [p.property.city, p.property.state].filter(Boolean).join(' – '))}
        ${tag('Endereço', [p.property.street, p.property.num].filter(Boolean).join(', '))}
      </table>
    </div>` : '';
  const histRows = history.slice(0, 10).map((h) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:5px 8px">${h.date || '—'}</td>
      <td style="padding:5px 8px">${h.type || 'Atendimento'}</td>
      <td style="padding:5px 8px">${(h.vet || '').replace('M.V. ', '')}</td>
      <td style="padding:5px 8px">${h.status === 'finalizado' ? '✅ Concluído' : '⏳ Andamento'}</td>
    </tr>`).join('');
  const internalBlock = includeInternal && p.obsInterna ? `
    <div style="background:#fff3f3;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;margin:16px 0">
      <b style="color:#dc2626">🔒 Notas Internas (uso clínico)</b>
      <p style="margin:8px 0 0;font-size:13px">${p.obsInterna}</p>
    </div>` : '';
  const html = `
  <div style="font-family:Arial,sans-serif;color:#1a1a2e;padding:32px;max-width:760px;margin:0 auto">
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:24px;border-bottom:2px solid #14a8a0;padding-bottom:16px">
      <div style="width:56px;height:56px;border-radius:50%;background:#14a8a0;color:#fff;font-size:24px;display:flex;align-items:center;justify-content:center">${p.name[0]}</div>
      <div><h1 style="margin:0;font-size:22px">${p.name} <span style="font-size:14px;color:#777">${window.vtPacienteCode ? window.vtPacienteCode(p) : p.id}</span></h1>
        <p style="margin:4px 0 0;font-size:14px;color:#555">${p.species} · ${p.breed} · ${p.sex}${p.neutered ? ' (castrado)' : ''} · ${p.weight || '—'} · Tutor: ${p.owner}</p>
      </div>
      <div style="margin-left:auto;text-align:right;font-size:12px;color:#777"><b>${nomeCli}</b><br>Emitido em ${new Date().toLocaleDateString('pt-BR')}</div>
    </div>
    ${(p.allergies || []).length ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:10px 14px;margin-bottom:16px;border-radius:0 6px 6px 0"><b style="color:#dc2626">⚠ Alergias:</b> ${p.allergies.join(', ')}</div>` : ''}
    ${p.asa && p.asa !== 'ASA I' ? `<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:10px 14px;margin-bottom:16px;border-radius:0 6px 6px 0"><b style="color:#d97706">⚠ Risco Anestésico: ${p.asa}</b></div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div style="background:#f8fffe;border-radius:8px;padding:14px 16px">
        <b style="font-size:13px;text-transform:uppercase;color:#14a8a0">Dados do Paciente</b>
        <table style="margin-top:8px;font-size:13px;border-collapse:collapse;width:100%">
          ${tag('Nascimento', p.birth)} ${tag('Porte', p.size)} ${tag('Pelagem', p.color)}
          ${tag('Microchip', p.chip)} ${tag('RGA', p.rga)} ${tag('ASA', p.asa)}
          ${tag('Convênio', p.plan && p.plan !== '—' ? p.plan : '')}
          ${(p.diseases || []).length ? tag('Doenças crônicas', p.diseases.join(', ')) : ''}
          ${(p.meds || []).length ? tag('Uso contínuo', p.meds.join(', ')) : ''}
        </table>
      </div>
      <div style="background:#f8f8ff;border-radius:8px;padding:14px 16px">
        <b style="font-size:13px;text-transform:uppercase;color:#16395f">Dados do Responsável</b>
        <table style="margin-top:8px;font-size:13px;border-collapse:collapse;width:100%">
          ${tag('CPF', ownerData.cpf)} ${tag('WhatsApp', ownerData.whats)} ${tag('Telefone', ownerData.phone)}
          ${tag('E-mail', ownerData.email)} ${tag('Nascimento', ownerData.birth)}
          ${addrOwner ? tag('Endereço', addrOwner) : tag('Cidade', ownerData.city)}
        </table>
      </div>
    </div>
    ${propBlock}
    ${p.obs ? `<div style="background:#f8fffe;border-radius:8px;padding:12px 16px;margin-bottom:16px"><b>Observações:</b><p style="margin:6px 0 0;font-size:13px">${p.obs}</p></div>` : ''}
    ${internalBlock}
    ${histRows ? `<div style="margin-top:20px"><b style="font-size:13px;text-transform:uppercase;color:#14a8a0">Histórico de Atendimentos</b>
      <table style="width:100%;margin-top:10px;border-collapse:collapse;font-size:13px">
        <tr style="background:#14a8a0;color:#fff"><th style="padding:7px 8px;text-align:left">Data</th><th style="padding:7px 8px;text-align:left">Tipo</th><th style="padding:7px 8px;text-align:left">Veterinário</th><th style="padding:7px 8px;text-align:left">Status</th></tr>
        ${histRows}
      </table></div>` : ''}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center">${nomeCli} · Documento gerado em ${new Date().toLocaleString('pt-BR')}${includeInternal ? ' · CÓPIA CLÍNICA' : ' · CÓPIA PARA O TUTOR'}</div>
  </div>`;
  // Usa window.vtGerarPDF (exposto por vt-ia.jsx), senão fallback para janela de impressão
  if (typeof window.vtGerarPDF === 'function') {
    await window.vtGerarPDF(html, `Ficha_${p.name.replace(/\s+/g,'_')}`, {});
  } else {
    const win = window.open('', '_blank');
    if (!win) { window.vtToast('Permita pop-ups para gerar o PDF.', 'err'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Ficha – ${p.name}</title><meta charset="utf-8"></head><body style="margin:0">${html}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }
}

function OdoHistModal({ patient, onClose, onNewOdonto }) {
  const hist = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem('vt-odonto-hist:' + patient.id) || '[]'); } catch(e) { return []; }
  }, [patient.id]);
  const printEntry = (entry) => {
    // Exames salvos pelo wizard: abre no Step 5 e imprime o PDF fiel ao preview
    if (entry.source === 'wizard' && window._vtOpenOdontoEdit) {
      onClose();
      window._vtOpenOdontoEdit(patient.id, entry.id, entry);
      setTimeout(() => { window.vtPrintOdontoPDF && window.vtPrintOdontoPDF(); }, 800);
      return;
    }
    // Legado: gera HTML simples para odontogramas antigos
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = (entry.marks || []).map((m) => `<tr><td>${m.tooth || '—'}</td><td>${m.label || '—'}</td><td>${m.obs || ''}</td></tr>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Odontograma – ${patient.name} – ${entry.date || ''}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#1a1a2e}h2{margin:0 0 4px}p{margin:2px 0 8px;color:#555}table{border-collapse:collapse;width:100%;margin-top:12px}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#f0f4f8}.footer{margin-top:24px;font-size:11px;color:#999}</style>
</head><body>
<h2>Odontograma — ${patient.name}</h2>
<p><b>Data:</b> ${entry.date || '—'} &nbsp;|&nbsp; <b>Médico(a):</b> ${entry.vet || '—'} &nbsp;|&nbsp; <b>Espécie:</b> ${entry.speciesLabel || entry.species || '—'}</p>
${entry.anorm !== undefined ? `<p><b>Alterações detectadas:</b> ${entry.anorm} &nbsp;|&nbsp; <b>Tratamentos:</b> ${entry.tratados || 0}</p>` : ''}
${entry.summary ? `<p><b>Observações:</b> ${entry.summary}</p>` : ''}
${rows ? `<table><thead><tr><th>Dente</th><th>Diagnóstico</th><th>Observação</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
<div class="footer">Dentalis Vet · VetTooth Pro · Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
</body></html>`);
    w.document.close(); w.print();
  };
  return (
    <div className="vt-modal-overlay" onClick={onClose}>
      <div className="vt-modal" style={{ maxWidth: 680, maxHeight: '82vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="vt-modal-hd">
          <b>Odontogramas — {patient.name}</b>
          <button className="vt-modal-x" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <button className="vt-btn" style={{ background: 'var(--teal)', color: '#fff', marginBottom: 16, marginTop: 12 }} onClick={() => { onClose(); onNewOdonto(patient.id); }}>
            + Novo Odontograma
          </button>
          {hist.length === 0 ? <p className="pf-empty">Nenhum odontograma registrado para este paciente.</p> : hist.map((entry, i) => (
            <div key={entry.id || i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{entry.date || '—'} {entry.vet && <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 13 }}>· {entry.vet}</span>}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {entry.speciesLabel || entry.species || ''}
                  {entry.anorm !== undefined && ` · ${entry.anorm} alterações`}
                  {entry.tratados ? ` · ${entry.tratados} tratamentos` : ''}
                  {entry.summary ? ` · ${entry.summary}` : ''}
                </div>
              </div>
              <button className="vt-btn-ghost" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => printEntry(entry)}>🖨 PDF</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PatientProfile({ patient, onBack, onOpenOdonto, goAgenda, atendimentos, openAtendimento, onEdit, onStatus, onAfterTransfer }) {
  const p = patient;
  const dead = p.status === 'Óbito';
  const fmtDate = (d) => window.vtDate ? window.vtDate(d) : (d || '');
  const ownerData = (() => {
    const d = window.VtStore && window.VtStore.getData();
    const ow = ((d && d.owners) || []).find((o) => o.name === p.owner) || {};
    return {
      name: p.owner || '—',
      cpf: (ow.cpf && ow.cpf !== '—') ? ow.cpf : (p.cpf || ''),
      whats: ow.whats || p.whats || ((ow.phone && ow.phone !== '—') ? ow.phone : '') || '',
      phone: (ow.phone2 && ow.phone2 !== '—') ? ow.phone2 : (p.phone || ''),
      email: (ow.email && ow.email !== '—') ? ow.email : (p.email || ''),
      birth: ow.birth || p.ownerBirth || '',
      address: ow.address || p.address || null,
      city: ow.city || (p.address && p.address.city) || '',
    };
  })();
  const [xfer, setXfer] = vtUseState(false);
  const history = (atendimentos || []).filter((a) => a.patientId === p.id).sort((a, b) => parseBR(b.date) - parseBR(a.date));
  const isAdmin = window.vtIsAdmin ? window.vtIsAdmin() : true;
  const canTransfer = window.vtIsSecretaria ? window.vtIsSecretaria() : true;
  const doTransfer = (novoTutor, novaProp, newOwnerObj) => {
    const d = (window.VtStore && window.VtStore.getData()) || {};
    const list = d.patients || [];
    let owners = (d.owners || []).slice();
    const oldOwnerName = p.owner;
    // BUG 5A — materializa o tutor antigo no cadastro se ele só existia derivado de paciente,
    // garantindo que NÃO seja excluído ao perder o último animal vinculado.
    if (oldOwnerName && oldOwnerName !== novoTutor && !owners.some((o) => o.name === oldOwnerName)) {
      owners = [{ id: 'C-' + String(Date.now()).slice(-3), code: window.vtNextClienteCode ? window.vtNextClienteCode() : '', name: oldOwnerName, cpf: p.cpf || '—', phone: (p.phone && p.phone !== '—') ? p.phone : (p.whats || '—'), phone2: p.phone2 || '', whats: p.whats || '', email: p.email || '—', city: (p.address && p.address.city) || '—', address: p.address || null, type: 'PF' }, ...owners];
    }
    // novo responsável criado inline no modal
    let novoId = null;
    if (newOwnerObj && newOwnerObj.name) {
      const ex = owners.find((o) => o.name === newOwnerObj.name);
      if (ex) novoId = ex.id;
      else { const o = { id: 'C-' + String(Date.now()).slice(-3) + Math.floor(Math.random() * 90 + 10), code: window.vtNextClienteCode ? window.vtNextClienteCode() : '', name: newOwnerObj.name.trim(), cpf: '—', phone: newOwnerObj.phone || '—', phone2: '', whats: newOwnerObj.phone || '', email: '—', city: '—', address: null, type: 'PF' }; owners = [o, ...owners]; novoId = o.id; }
    } else {
      const t = owners.find((o) => o.name === novoTutor); novoId = t ? t.id : null;
    }
    // BUG 5B — atualiza tutorId + owner do paciente e propaga p/ o estado do módulo + perfil
    const isHorse = p.species === 'Cavalo';
    const newProp = novaProp != null ? (novaProp ? { ...(p.property || {}), name: novaProp } : p.property) : p.property;
    const updated = { ...p, owner: novoTutor || p.owner, tutorId: novoId, property: newProp };
    const next = list.map((x) => x.id === p.id ? updated : x);
    // cascata em propriedades[] para cavalos
    let propriedades = (d.propriedades || []).slice();
    if (isHorse && novaProp && novaProp !== (p.property && p.property.name)) {
      if (!propriedades.some((pr) => pr.name === novaProp)) {
        propriedades = [{ id: 'PR-' + Date.now().toString(36), name: novaProp, owner: novoTutor || p.owner, phone: '' }, ...propriedades];
      } else {
        // atualiza owner da propriedade se o responsável mudou
        propriedades = propriedades.map((pr) => pr.name === novaProp ? { ...pr, owner: novoTutor || pr.owner } : pr);
      }
    }
    if (window.VtStore) window.VtStore.setData({ patients: next, owners, propriedades });
    setXfer(false); window.vtToast('Paciente transferido para ' + (novoTutor || '—') + '.', 'ok');
    if (onAfterTransfer) onAfterTransfer(updated, next);
    else if (onBack) onBack();
  };
  const doDelete = () => {
    if (!isAdmin) { window.vtToast('Apenas administrador pode excluir.', 'err'); return; }
    if (!window.confirm(`Excluir o paciente ${p.name}? Esta ação não pode ser desfeita.`)) return;
    const d = window.VtStore && window.VtStore.getData();
    const list = (d && d.patients) || [];
    if (window.VtStore) window.VtStore.setData({ patients: list.filter((x) => x.id !== p.id) });
    window.vtToast('Paciente excluído.', 'ok'); if (onBack) onBack();
  };
  const last = history[0] || {};
  const ex = (last.exame) || {};
  const exV = (k) => (ex[k] && ex[k].v) ? ex[k].v : null;
  const anим = last.anamnese || {};
  const proximaConsulta = (() => {
    const d = window.VtStore && window.VtStore.getData();
    const ag = ((d && d.agendaAppts) || []).filter((a) => a.patient === p.name && a.status !== 'Cancelado').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const fut = ag.find((a) => (a.date || '') >= new Date().toISOString().slice(0, 10));
    if (!fut) return null;
    const dt = new Date(fut.date + 'T00:00:00');
    return `${dt.getDate()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()} - ${fmtH ? fmtH(fut.start) : fut.start}`;
  })();
  const [tab, setTab] = vtUseState('geral');
  const [odoHistOpen, setOdoHistOpen] = vtUseState(false);
  const TABS = [['geral', 'Visão Geral'], ['odonto', 'Odontograma'], ['tratamentos', 'Tratamentos'], ['exames', 'Exames'], ['fotos', 'Fotos'], ['arquivos', 'Arquivos'], ['notas', 'Notas']];
  const anexos = (last.anexos || []);
  return (
    <div>
      {odoHistOpen && <OdoHistModal patient={p} onClose={() => setOdoHistOpen(false)} onNewOdonto={onOpenOdonto} />}
      <div className="pf-crumb"><button onClick={onBack}>Pacientes</button> <span>›</span> {p.name}</div>

      <div className="pf-grid">
        <div className="pf-main">
          {/* cabeçalho */}
          <div className="vt-card pf-head">
            <PetAvatar p={p} lg />
            <div className="pf-head-id">
              <div className="pf-name">{p.name} <span className="vt-pac-code" style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', verticalAlign: 'middle' }}>{window.vtPacienteCode ? window.vtPacienteCode(p) : p.id}</span></div>
              <div className="pf-sub"><span><VtIcon name="paw" size={15} /> {p.species}</span><span><VtIcon name="users" size={15} /> Tutor: {p.owner}</span></div>
              <div className="pf-pills">
                {(p.allergies || []).length > 0 && <span className="pf-pill red">Alergias: {p.allergies.join(', ')}</span>}
                {p.asa && <span className="pf-pill amber">Risco Anestésico: {p.asa}</span>}
                {(p.diseases || []).length > 0 && <span className="pf-pill amber">{p.diseases.join(', ')}</span>}
              </div>
            </div>
            <div className="pf-next">{proximaConsulta ? <span><VtIcon name="calendar" size={15} /> Próxima Consulta: {proximaConsulta}</span> : <button className="vt-btn-ghost" onClick={() => openAtendimento(p.id)}><VtIcon name="plus" size={15} /> Novo atendimento</button>}</div>
          </div>

          {xfer && <TransferModal patient={p} onClose={() => setXfer(false)} onTransfer={doTransfer} />}
          {dead && <div className="vt-obito-banner"><b>Óbito registrado.</b> Agenda e novos procedimentos bloqueados. Histórico mantido para consulta.</div>}

          {/* ---- Banner de alerta clínico ---- */}
          {((p.allergies && p.allergies.length > 0) || (p.meds && p.meds.length > 0)) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {p.allergies && p.allergies.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1.5px solid var(--red)', borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <div>
                    <b style={{ color: 'var(--red)', fontSize: 14 }}>ALERGIAS / REAÇÕES ADVERSAS</b>
                    <div style={{ color: 'var(--red)', fontSize: 13.5, marginTop: 2, fontWeight: 600 }}>{p.allergies.join(' · ')}</div>
                  </div>
                </div>
              )}
              {p.meds && p.meds.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1.5px solid var(--amber)', borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>💊</span>
                  <div>
                    <b style={{ color: 'var(--amber)', fontSize: 14 }}>MEDICAMENTOS CONTÍNUOS</b>
                    <div style={{ color: '#92610a', fontSize: 13.5, marginTop: 2, fontWeight: 600 }}>{p.meds.join(' · ')}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* abas */}
          <div className="pf-tabs">
            {TABS.map(([id, l]) => <button key={id} className={`pf-tab${tab === id ? ' on' : ''}`} onClick={() => { if (id === 'odonto') setOdoHistOpen(true); else setTab(id); }}>{l}</button>)}
          </div>

          {tab === 'geral' && (
            <div className="pf-overview">
              <div className="vt-card pf-ocard">
                <div className="pf-ocard-hd teal"><VtIcon name="spark" size={18} /> <div><b>Sinais Vitais</b><i>Última medição: {last.date || '—'}</i></div></div>
                <div className="pf-vitals">
                  <div><span>Freq. Cardíaca:</span><b>{exV('fc') || '—'} {exV('fc') ? 'bpm' : ''}</b></div>
                  <div><span>Freq. Respiratória:</span><b>{exV('fr') || '—'} {exV('fr') ? 'rpm' : ''}</b></div>
                  <div><span>Temperatura:</span><b>{exV('temp') || '—'} {exV('temp') ? '°C' : ''}</b></div>
                  <div><span>Peso:</span><b>{p.weight || exV('peso') || '—'}</b></div>
                </div>
              </div>
              {/* Histórico de peso com sparkline */}
              {(() => {
                const allAts = (((window.VtStore && window.VtStore.getData()) || {}).atendimentos || [])
                  .filter(a => a.patientId === p.id && a.exame && a.exame.peso && a.exame.peso.v)
                  .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
                // peso atual do cadastro
                const pesoAtual = p.weight ? { date: 'Atual', v: parseFloat((p.weight || '').replace(',', '.')) } : null;
                const pts = allAts.map(a => ({ date: a.date || '', v: parseFloat((a.exame.peso.v || '').replace(',', '.')) })).filter(x => !isNaN(x.v));
                if (pesoAtual && !isNaN(pesoAtual.v)) pts.push(pesoAtual);
                if (pts.length === 0) return null;
                const minV = Math.min(...pts.map(x => x.v));
                const maxV = Math.max(...pts.map(x => x.v));
                const range = maxV - minV || 1;
                const W = 180, H = 50;
                const toX = (i) => pts.length === 1 ? W/2 : (i / (pts.length - 1)) * W;
                const toY = (v) => H - ((v - minV) / range) * (H - 8) - 4;
                const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.v).toFixed(1)}`).join(' ');
                const last2 = pts[pts.length - 1];
                const first = pts[0];
                const diff = last2.v - first.v;
                return (
                  <div className="vt-card pf-ocard" style={{ gridColumn: 'span 1' }}>
                    <div className="pf-ocard-hd teal"><VtIcon name="chart" size={18} /> <div><b>Histórico de Peso</b><i>{pts.length} medição(ões)</i></div></div>
                    <div style={{ padding: '12px 16px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--teal-d)', lineHeight: 1 }}>{last2.v.toFixed(1)} kg</div>
                          <div style={{ fontSize: 12, color: diff > 0 ? 'var(--amber)' : diff < 0 ? 'var(--green)' : 'var(--muted)', marginTop: 3, fontWeight: 600 }}>
                            {diff > 0 ? '▲' : diff < 0 ? '▼' : '—'} {Math.abs(diff).toFixed(1)} kg vs primeira medição
                          </div>
                        </div>
                        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
                          <path d={pathD} fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                          {pts.map((pt, i) => (
                            <circle key={i} cx={toX(i)} cy={toY(pt.v)} r="4" fill="var(--teal)" stroke="#fff" strokeWidth="2" />
                          ))}
                        </svg>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {pts.slice(-4).map((pt, i) => (
                          <div key={i} style={{ background: 'var(--bg)', borderRadius: 8, padding: '5px 10px', fontSize: 12 }}>
                            <div style={{ color: 'var(--muted)' }}>{pt.date === 'Atual' ? 'Cadastro' : pt.date}</div>
                            <div style={{ fontWeight: 700 }}>{pt.v.toFixed(1)} kg</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="vt-card pf-ocard">
                <div className="pf-ocard-hd teal"><VtIcon name="stethoscope" size={18} /> <b>Anamnese</b></div>
                <div className="pf-text">
                  {anим.queixa || last.queixa ? <p><b>Queixa Principal:</b> {anим.queixa || last.queixa}</p> : null}
                  {anим.evolucao ? <p><b>Evolução:</b> {anим.evolucao}</p> : null}
                  {anим.alimentacao ? <p><b>Alimentação:</b> {anим.alimentacao}</p> : null}
                  {!anим.queixa && !last.queixa && !anим.evolucao && <p className="pf-empty">Sem anamnese registrada.</p>}
                </div>
              </div>
              {(() => {
                const d = window.VtStore && window.VtStore.getData();
                const txAll = (d && d.fin && d.fin.tx) || [];
                const txPac = txAll.filter((t) => t.patient === p.name || t.patientId === p.id).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
                const totalPago = txPac.filter((t) => t.status === 'pago' || t.status === 'Pago').reduce((s, t) => s + (parseFloat(t.valor) || 0), 0);
                const pendente = txPac.filter((t) => t.status !== 'pago' && t.status !== 'Pago').reduce((s, t) => s + (parseFloat(t.valor) || 0), 0);
                return (
                  <div className="vt-card pf-ocard">
                    <div className="pf-ocard-hd"><VtIcon name="receipt" size={18} /> <div><b>Financeiro</b>{txPac.length > 0 && <i>Pago: R$ {totalPago.toFixed(2).replace('.', ',')} {pendente > 0 ? `· Pendente: R$ ${pendente.toFixed(2).replace('.', ',')}` : ''}</i>}</div></div>
                    {txPac.length === 0 ? <p className="pf-empty">Nenhuma transação registrada.</p> : (
                      <div className="pf-proc">
                        {txPac.map((t, i) => (
                          <div key={t.id || i} className="pf-proc-row">
                            <span className="pf-proc-date">{fmtDate(t.date) || '—'}</span>
                            <b>{t.descricao || t.tipo || '—'}</b>
                            <span style={{ fontWeight: 700 }}>R$ {parseFloat(t.valor || 0).toFixed(2).replace('.', ',')}</span>
                            {(t.status === 'pago' || t.status === 'Pago') ? <span className="pf-proc-ok">Pago</span> : <span className="pf-proc-pend">Pendente</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              {(() => {
                const d = window.VtStore && window.VtStore.getData();
                const agAll = (d && d.agendaAppts) || [];
                const agPac = agAll.filter((a) => a.patient === p.name && a.status !== 'Cancelado').sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(0, 3);
                if (!agPac.length) return null;
                return (
                  <div className="vt-card pf-ocard">
                    <div className="pf-ocard-hd teal"><VtIcon name="calendar" size={18} /> <b>Próximos Agendamentos</b></div>
                    <div className="pf-proc">
                      {agPac.map((a, i) => (
                        <div key={a.id || i} className="pf-proc-row">
                          <span className="pf-proc-date">{fmtDate(a.date) || '—'}</span>
                          <b>{a.type || a.title || '—'}</b>
                          {a.start && <span style={{ color: 'var(--muted)' }}>{a.start}</span>}
                          <span className="pf-proc-ok">{a.status || 'Agendado'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="vt-card pf-ocard">
                <div className="pf-ocard-hd"><b>Procedimentos Recentes</b></div>
                <div className="pf-proc">
                  {history.slice(0, 3).map((h) => (
                    <div key={h.id} className="pf-proc-row" onClick={() => openAtendimento(p.id, h.id)}>
                      <span className="pf-proc-date">{fmtDate(h.date)}</span>
                      <b>{h.type}</b>
                      {h.status === 'finalizado' ? <span className="pf-proc-ok">Concluído</span> : <span className="pf-proc-pend">Em andamento</span>}
                      {h.vet && <i style={{ color: 'var(--muted)' }}>{(h.vet).replace('M.V. ', '').trim()}</i>}
                    </div>
                  ))}
                  {history.length === 0 && <p className="pf-empty">Nenhum procedimento.</p>}
                  {history.length > 0 && <button className="pf-vertodos" onClick={() => openAtendimento(p.id, history[0].id)}>Ver todos</button>}
                </div>
              </div>
              <div className="vt-card pf-ocard">
                <div className="pf-ocard-hd"><b>Pré-visualização de Anexos</b></div>
                {anexos.length === 0 ? <p className="pf-empty">Nenhum anexo.</p> : (
                  <div className="pf-anexos">
                    {anexos.slice(0, 4).map((a, i) => (
                      <div key={i} className="pf-anexo">
                        {a.preview ? <img src={a.preview} alt="" /> : <div className="pf-anexo-ph">{(a.kind || 'FILE').toUpperCase().slice(0, 3)}</div>}
                        <span>{a.nome}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="vt-card pf-ocard">
                <div className="pf-ocard-hd"><VtIcon name="receipt" size={18} /> <b>Diagnóstico</b></div>
                <div className="pf-text">{(last.diag && (last.diag.principal || last.diag.obs)) ? <p dangerouslySetInnerHTML={{ __html: last.diag.principal || last.diag.obs }} /> : <p className="pf-empty">Sem diagnóstico registrado.</p>}</div>
              </div>
              <div className="vt-card pf-ocard">
                <div className="pf-ocard-hd teal"><VtIcon name="receipt" size={18} /> <b>Plano Terapêutico</b></div>
                <div className="pf-text">{(last.odonto && last.odonto.plano) ? <p>{last.odonto.plano}</p> : <p className="pf-empty">Sem plano terapêutico registrado.</p>}</div>
              </div>
            </div>
          )}

          {tab !== 'geral' && tab !== 'odonto' && (
            <div className="vt-card vt-sec">
              {tab === 'tratamentos' && <div><h3 className="vt-sec-title">Histórico de atendimentos <span className="vt-count-badge">{history.length}</span></h3><AtendimentoHistory list={history} onOpen={(a) => openAtendimento(p.id, a.id)} /></div>}
              {tab === 'exames' && <div><h3 className="vt-sec-title">Exames</h3>{history.flatMap((h) => (h.exames || []).map((e, i) => <div key={h.id + i} className="vt-clin-row"><span>{e}</span><span className="vt-muted">{h.date}</span></div>))}{history.every((h) => !(h.exames || []).length) && <p className="pf-empty">Nenhum exame solicitado.</p>}</div>}
              {tab === 'fotos' && <div><h3 className="vt-sec-title">Fotos</h3><div className="pf-anexos">{history.flatMap((h) => (h.anexos || []).filter((a) => a.preview)).map((a, i) => <div key={i} className="pf-anexo"><img src={a.preview} alt="" /><span>{a.nome}</span></div>)}</div>{history.every((h) => !(h.anexos || []).some((a) => a.preview)) && <p className="pf-empty">Nenhuma foto.</p>}</div>}
              {tab === 'arquivos' && <div><h3 className="vt-sec-title">Arquivos</h3>{history.flatMap((h) => (h.anexos || [])).map((a, i) => <div key={i} className="vt-clin-row"><span>{a.nome}</span><span className="vt-muted">{a.size || ''}</span></div>)}{history.every((h) => !(h.anexos || []).length) && <p className="pf-empty">Nenhum arquivo.</p>}</div>}
              {tab === 'notas' && (
                <div>
                  <h3 className="vt-sec-title">Observações do prontuário <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--teal-d)' }}>✅ Visível ao tutor</span></h3>
                  <p className="pf-text" style={{ marginBottom: 20 }}>{p.obs || <span className="pf-empty">Sem observações.</span>}</p>
                  <h3 className="vt-sec-title">Notas internas <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>🔒 USO CLÍNICO — NÃO enviado ao tutor</span></h3>
                  <p className="pf-text">{p.obsInterna || <span className="pf-empty">Sem notas internas.</span>}</p>
                </div>
              )}
            </div>
          )}

          <div className="vt-card vt-sec" style={{ marginTop: 16 }}>
            <h3 className="vt-sec-title">Identificação & dados clínicos</h3>
            <div className="vt-info-grid">
              <InfoTile label="Espécie / Raça" value={`${p.species} · ${p.breed}`} />
              <InfoTile label="Sexo" value={p.sex + (p.neutered ? ' (castrado)' : '')} />
              <InfoTile label="Porte" value={p.size} />
              <InfoTile label="Pelagem / cor" value={p.color} />
              <InfoTile label="Nascimento" value={p.birth} />
              <InfoTile label="Idade" value={ageFrom(p.birth)} />
              <InfoTile label="Peso" value={p.weight} />
              <InfoTile label="Microchip" value={p.chip} />
              <InfoTile label="RGA" value={p.rga} />
              <InfoTile label="Convênio" value={p.plan} />
              <InfoTile label="Como nos conheceu" value={p.origemLead} />
            </div>
            <div className="pf-edit-row">
              <button className="vt-btn-ghost" onClick={onEdit}><VtIcon name="pen" size={15} /> Editar cadastro</button>
              {canTransfer && <button className="vt-btn-ghost" onClick={() => setXfer(true)}><VtIcon name="paw" size={15} /> Transferir</button>}
              <label className="vtf" style={{ width: 150 }}><span className="vtf-inputwrap"><select className="vtf-input" value={p.status} onChange={(e) => onStatus(p, e.target.value)}><option>Ativo</option><option>Inativo</option><option>Arquivado</option><option>Óbito</option></select></span></label>
              {isAdmin && <button className="vt-btn-ghost" style={{ color: 'var(--red)', marginLeft: 'auto' }} onClick={doDelete}>Excluir</button>}
            </div>
          </div>
        </div>

        {/* coluna direita */}
        <div className="pf-aside">
          <div className="vt-card pf-owner">
            <h3 className="pf-aside-title"><VtIcon name="users" size={17} /> Responsável</h3>
            <div className="pf-owner-name">{ownerData.name}</div>
            <div className="pf-owner-rows">
              {ownerData.cpf && <div className="pf-owner-row"><span>CPF</span><b>{ownerData.cpf}</b></div>}
              <div className="pf-owner-row"><span>WhatsApp</span><b>{ownerData.whats || '—'}</b></div>
              <div className="pf-owner-row"><span>Outro telefone</span><b>{ownerData.phone || '—'}</b></div>
              <div className="pf-owner-row"><span>E-mail</span><b>{ownerData.email || '—'}</b></div>
              {ownerData.birth && <div className="pf-owner-row"><span>Nascimento</span><b>{ownerData.birth}</b></div>}
              {ownerData.address && (ownerData.address.street || ownerData.address.cep) && <div className="pf-owner-row"><span>Endereço</span><b>{[ownerData.address.street, ownerData.address.num, ownerData.address.district, ownerData.address.city, ownerData.address.state].filter(Boolean).join(', ')}{ownerData.address.cep ? ' · CEP ' + ownerData.address.cep : ''}</b></div>}
              {(!ownerData.address || (!ownerData.address.street && !ownerData.address.cep)) && ownerData.city && <div className="pf-owner-row"><span>Cidade</span><b>{ownerData.city}</b></div>}
            </div>
          </div>
          <div className="vt-card pf-actions">
            <h3 className="pf-aside-title">Ações Rápidas</h3>
            <button className="pf-act teal" onClick={() => setOdoHistOpen(true)}><VtIcon name="tooth" size={16} /> Odontogramas</button>
            <button className="pf-act navy" onClick={() => openAtendimento(p.id)}><VtIcon name="plus" size={16} /> Novo Procedimento</button>
            <button className="pf-act" style={{ background: 'linear-gradient(135deg,#6d28d9,#4f46e5)', color: '#fff' }} onClick={() => window.vtOpenIA && window.vtOpenIA(`Resumo completo e sugestão de conduta clínica para o paciente ${p.name} (${p.species}, ${p.breed}, ${p.sex}, ${p.weight||'?'}kg, tutor: ${p.owner}).`, p.id)}><VtIcon name="spark" size={16} /> Consultar VetIA</button>
            <button className="pf-act navy" onClick={() => vtGerarFichaPDF(p, ownerData, history, true)}><VtIcon name="receipt" size={16} /> Gerar PDF do Prontuário</button>
            <button className="pf-act navy" onClick={() => vtGerarFichaPDF(p, ownerData, history, false)}>✉ PDF para Tutor (sem notas internas)</button>
          </div>
          <div className="vt-card pf-alerts">
            <h3 className="pf-aside-title alert"><VtIcon name="alert" size={17} /> Alertas</h3>
            {(() => {
              const al = [];
              if (proximaConsulta) al.push(['Próxima consulta', `Agendada para ${proximaConsulta}.`]);
              (p.allergies || []).forEach((a) => al.push(['Alergia', a]));
              if (p.asa && p.asa !== 'ASA I') al.push(['Risco anestésico', `${p.asa} · risco ${(p.risk || '').toLowerCase()}`]);
              (p.meds || []).forEach((m) => al.push(['Uso contínuo', m]));
              if (!al.length) al.push(['Sem alertas', 'Nenhum alerta clínico no momento.']);
              return al.map(([k, v], i) => <div key={i} className="pf-alert-row"><b>{k}</b><span>{v}</span></div>);
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

function ageFrom(br) {
  const m = (br || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return '—';
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  const years = (Date.now() - d.getTime()) / (365.25 * 864e5);
  return years >= 1 ? `${Math.floor(years)} anos` : `${Math.floor(years * 12)} meses`;
}

/* autocomplete de responsável já cadastrado — preenche todos os dados ao selecionar */
function OwnerAutocomplete({ value, onChange, onPick, owners, error }) {
  const [open, setOpen] = vtUseState(false);
  const q = (value || '').toLowerCase().trim();
  const matches = (q.length >= 1
    ? owners.filter((o) => o.name.toLowerCase().includes(q) || (o.cpf || '').includes(value))
    : owners).slice(0, 6);
  return (
    <label className="vtf" style={{ width: '100%' }}>
      <span className="vtf-label">Responsável / Tutor<i className="vtf-req">*</i></span>
      <span className="vtf-inputwrap">
        <input className={`vtf-input${error ? ' invalid' : ''}`} value={value || ''}
          placeholder="Buscar responsável cadastrado ou digitar um novo nome…"
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 170)} />
        {open && matches.length > 0 && (
          <span className="vtf-suggest">
            {matches.map((o) => (
              <button key={o.id} type="button" className="vtf-suggest-item owner-item" onMouseDown={(e) => { e.preventDefault(); onPick(o); setOpen(false); }}>
                <b>{o.name}</b>
                <i>{[o.cpf && o.cpf !== '—' ? o.cpf : null, (o.whats || o.phone) && o.phone !== '—' ? (o.whats || o.phone) : null, o.city && o.city !== '—' ? o.city : null].filter(Boolean).join(' · ') || 'Sem dados adicionais'}</i>
              </button>
            ))}
          </span>
        )}
      </span>
      {error && <span className="vtf-err">{error}</span>}
      {!error && <span className="vtf-hint">Selecione um responsável para preencher CPF, telefones, e-mail e endereço automaticamente.</span>}
    </label>
  );
}

function NewPatientForm({ onBack, onSave, initial }) {
  const [f, setF] = vtUseState(() => initial ? {
    ...initial,
    diseases: Array.isArray(initial.diseases) ? initial.diseases.join(', ') : (initial.diseases || ''),
    meds: Array.isArray(initial.meds) ? initial.meds.join(', ') : (initial.meds || ''),
    allergies: Array.isArray(initial.allergies) ? initial.allergies.join(', ') : (initial.allergies || ''),
    cep: (initial.address || {}).cep || '', street: (initial.address || {}).street || '', district: (initial.address || {}).district || '',
    num: (initial.address || {}).num || '', complement: (initial.address || {}).complement || '', city: (initial.address || {}).city || '', state: (initial.address || {}).state || '',
  } : { status: 'Ativo', species: 'Cão', sex: 'Macho' });
  const [errs, setErrs] = vtUseState({});
  const [cepMsg, setCepMsg] = vtUseState('');
  const [propCepMsg, setPropCepMsg] = vtUseState('');
  const fileRef = vtUseRef(null);
  const s = (k) => (v) => { setF((p) => ({ ...p, [k]: v })); if (errs[k]) setErrs((e) => ({ ...e, [k]: null })); };
  const isHorse = f.species === 'Cavalo';

  // responsáveis já cadastrados (owners + tutores derivados de pacientes)
  const ownersList = (() => {
    const d = window.VtStore && window.VtStore.getData();
    const ow = (d && d.owners) || [];
    const pats = (d && d.patients) || [];
    const out = ow.slice();
    pats.forEach((p) => {
      if (p.owner && !out.some((o) => o.name === p.owner)) {
        out.push({ id: 'auto-' + p.id, name: p.owner, cpf: p.cpf || '', phone: p.phone || '', phone2: p.phone2 || '', whats: p.whats || '', email: p.email || '', city: (p.address && p.address.city) || '', birth: p.ownerBirth || '', address: p.address || null });
      }
    });
    return out;
  })();
  const pickOwner = (o) => {
    const ad = o.address || {};
    setF((p) => ({
      ...p,
      owner: o.name,
      cpf: (o.cpf && o.cpf !== '—') ? o.cpf : (p.cpf || ''),
      email: (o.email && o.email !== '—') ? o.email : (p.email || ''),
      whats: o.whats || (o.phone && o.phone !== '—' ? o.phone : '') || (p.whats || ''),
      phone: (o.phone2 && o.phone2 !== '—') ? o.phone2 : (p.phone || ''),
      ownerBirth: o.birth || (p.ownerBirth || ''),
      cep: ad.cep || p.cep || '', street: ad.street || p.street || '', district: ad.district || p.district || '',
      num: ad.num || p.num || '', complement: ad.complement || p.complement || '',
      city: ad.city || (o.city && o.city !== '—' ? String(o.city).split(',')[0].trim() : '') || p.city || '',
      state: ad.state || p.state || '',
    }));
    if (errs.owner) setErrs((e) => ({ ...e, owner: null }));
    window.vtToast(`Dados de ${o.name} preenchidos automaticamente.`, 'ok');
  };

  // Busca real de endereço via ViaCEP
  const lookupCep = async (raw, prefix, setMsg) => {
    const d = window.onlyD(raw);
    if (d.length !== 8) { setMsg(''); return; }
    setMsg('Buscando endereço...');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await res.json();
      if (j.erro) { setMsg('CEP não encontrado.'); return; }
      setF((p) => ({
        ...p,
        [prefix + 'street']: j.logradouro || p[prefix + 'street'] || '',
        [prefix + 'district']: j.bairro || '',
        [prefix + 'city']: j.localidade || '',
        [prefix + 'state']: j.uf || '',
      }));
      setMsg('Endereço preenchido ✓');
    } catch (e) {
      setMsg('Não foi possível consultar o CEP (offline?).');
    }
  };
  const onCep = (v) => { setF((p) => ({ ...p, cep: v })); lookupCep(v, '', setCepMsg); };
  const onPropCep = (v) => { setF((p) => ({ ...p, propCep: v })); lookupCep(v, 'prop', setPropCepMsg); };

  const onPhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setF((p) => ({ ...p, photo: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = () => {
    const e2 = {};
    if (!f.name || !f.name.trim()) e2.name = 'Informe o nome do animal.';
    if (!f.owner || !f.owner.trim()) e2.owner = 'Informe o nome do tutor.';
    if (f.cpf && !window.validCPF(f.cpf)) e2.cpf = 'CPF inválido.';
    if (isHorse && (!f.propName || !f.propName.trim())) e2.propName = 'Informe a propriedade (equino).';
    // origemLead is optional — marketing field should not block clinical workflow
    if (Object.keys(e2).length) {
      setErrs(e2);
      window.vtToast('Verifique os campos destacados.', 'err');
      return;
    }
    const id = initial ? initial.id : 'P-' + String(Date.now()).slice(-4);
    const splitList = (v) => (v || '').split(',').map((x) => x.trim()).filter(Boolean);
    const birth = f.birth || (f.idade ? window.vtIdadeToBirth(f.idade) : '');
    const patient = {
      id, name: f.name.trim(), species: f.species, breed: f.breed || '—', sex: f.sex,
      neutered: f.neutered || false, birth: birth, idade: f.idade || '', weight: f.weight || '',
      color: f.color || '', chip: f.chip || '', size: f.size || '—', rga: f.rga || '',
      obs: f.obs || '', obsInterna: f.obsInterna || '',
      asa: f.asa || 'ASA I', risk: f.risk || 'Baixo', status: f.status, photo: f.photo || '#14a8a0',
      owner: f.owner.trim(), ownerBirth: f.ownerBirth || '',
      origemLead: f.origemLead || '',
      allergies: splitList(f.allergies), diseases: splitList(f.diseases), meds: splitList(f.meds),
      lastVisit: 'Novo', plan: f.plan || '—', planNum: f.planNum || '', planExp: f.planExp || '', card: '',
      cpf: f.cpf || '', phone: f.phone || '', phone2: f.phone2 || '', email: f.email || '', whats: f.whats || '',
      address: { cep: f.cep, street: f.street, district: f.district, num: f.num, complement: f.complement, city: f.city, state: f.state },
      odontograma: isHorse,
      property: isHorse ? { name: f.propName, owner: f.propOwner, phone: f.propPhone, cep: f.propCep, street: f.propstreet, num: f.propNum, complement: f.propComplement, district: f.propdistrict, city: f.propcity, state: f.propstate } : null,
    };
    window.vtToast(`Paciente ${patient.name} salvo com sucesso.`, 'ok');
    onSave(patient);
  };

  return (
    <div>
      <button className="vt-back" onClick={onBack}><VtIcon name="chevron" size={16} /> Pacientes</button>
      <div className="vt-page-head"><h1>{initial ? 'Editar paciente' : 'Novo paciente'} {initial && <span className="vt-pac-code" style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)' }}>{window.vtPacienteCode ? window.vtPacienteCode(initial) : initial.id}</span>}</h1><p>{initial ? 'Campos com máscara e validação automática' : 'Um código PAC será gerado automaticamente ao salvar · Campos com máscara e validação'}</p></div>
      <div className="vt-card vt-sec vt-form">
        <div className="vt-form-sec">Foto & identificação</div>
        <div className="vt-form-row" style={{ alignItems: 'center' }}>
          <div className="vt-photo-up" onClick={() => fileRef.current && fileRef.current.click()}>
            {f.photo
              ? <img src={f.photo} alt="foto" className="vt-photo-img" />
              : <span className="vt-photo-ph"><VtIcon name="paw" size={26} /><i>Adicionar foto</i></span>}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhoto} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="vt-form-row" style={{ margin: 0 }}>
              <VtField label="Nome" value={f.name} onChange={s('name')} placeholder="Nome do animal" width="48%" required error={errs.name} />
              <label className="vtf" style={{ width: '24%' }}>
                <span className="vtf-label">Espécie<i className="vtf-req">*</i></span>
                <span className="vtf-inputwrap"><select className="vtf-input" value={f.species} onChange={(e) => { if (e.target.value === '__nova') { const n = prompt('Nova espécie:'); if (n && n.trim()) { window.vtAddEspecie(n.trim()); setF((p) => ({ ...p, species: n.trim(), breed: '', color: '' })); } return; } setF((p) => ({ ...p, species: e.target.value, breed: '', color: '' })); }}>
                  {window.vtEspecies().map((e) => <option key={e}>{e}</option>)}
                  <option value="__nova">+ Cadastrar espécie…</option></select></span>
              </label>
              <label className="vtf" style={{ width: '24%' }}>
                <span className="vtf-label">Raça</span>
                <span className="vtf-inputwrap"><select className="vtf-input" value={f.breed || ''} onChange={(e) => { const val = e.target.value; if (val === '__nova') { const n = prompt('Nova raça:'); if (n && n.trim()) { window.vtAddRaca(f.species, n.trim()); const pt = window.vtPorteFor(f.species, n.trim()); setF((p) => ({ ...p, breed: n.trim(), color: '', size: pt || p.size })); } return; } const pt = window.vtPorteFor(f.species, val); setF((p) => ({ ...p, breed: val, color: '', size: pt || p.size })); }}>
                  <option value="">Selecione…</option>
                  {window.vtRacas(f.species).map((r) => <option key={r}>{r}</option>)}
                  <option value="__nova">+ Cadastrar raça…</option></select></span>
              </label>
            </div>
            <div className="vt-form-row" style={{ margin: 0 }}>
              <label className="vtf" style={{ width: '24%' }}>
                <span className="vtf-label">Sexo</span>
                <span className="vtf-inputwrap"><select className="vtf-input" value={f.sex} onChange={(e) => s('sex')(e.target.value)}>
                  <option>Macho</option><option>Fêmea</option></select></span>
              </label>
              <label className="vtf" style={{ width: '36%' }}>
                <span className="vtf-label">Pelagem / cor</span>
                <span className="vtf-inputwrap"><select className="vtf-input" value={f.color || ''} onChange={(e) => { if (e.target.value === '__nova') { const n = prompt('Nova cor/pelagem:'); if (n && n.trim()) { window.vtAddCor(f.breed || f.species, n.trim()); s('color')(n.trim()); } return; } s('color')(e.target.value); }}>
                  <option value="">Selecione…</option>
                  {window.vtCores(f.species, f.breed).map((c) => <option key={c}>{c}</option>)}
                  <option value="__nova">+ Cadastrar cor…</option></select></span>
              </label>
              <label className="vtf" style={{ width: '32%', justifyContent: 'flex-end' }}>
                <span className="vtf-label">&nbsp;</span>
                <label className="vt-check-inline"><input type="checkbox" checked={!!f.neutered} onChange={(e) => s('neutered')(e.target.checked)} /> Castrado</label>
              </label>
            </div>
          </div>
        </div>
        <VtAgeField birth={f.birth} idade={f.idade} onBirth={s('birth')} onIdade={s('idade')} />
        <div className="vt-form-row">
          <VtField label="Peso" value={f.weight} onChange={s('weight')} mask="weight" placeholder="0,0 kg" width="16%" />
          <label className="vtf" style={{ width: '16%' }}>
            <span className="vtf-label">Porte</span>
            <span className="vtf-inputwrap"><select className="vtf-input" value={f.size || ''} onChange={(e) => s('size')(e.target.value)}>
              <option value="">—</option><option>Mini</option><option>Pequeno</option><option>Médio</option><option>Grande</option><option>Gigante</option></select></span>
          </label>
          <VtField label="Microchip" value={f.chip} onChange={(v) => s('chip')(window.onlyD(v))} placeholder="15 dígitos" width="22%" />
          <VtField label="RGA (RG Animal)" value={f.rga} onChange={s('rga')} placeholder="Registro Geral Animal" width="24%" />
          <label className="vtf" style={{ width: '16%' }}>
            <span className="vtf-label">Status</span>
            <span className="vtf-inputwrap"><select className="vtf-input" value={f.status} onChange={(e) => s('status')(e.target.value)}>
              <option>Ativo</option><option>Inativo</option><option>Arquivado</option><option>Óbito</option></select></span>
          </label>
        </div>

        <div className="vt-form-sec">Plano de saúde & convênio</div>
        <div className="vt-form-row">
          <VtField label="Plano de saúde" value={f.plan} onChange={s('plan')} placeholder="Ex.: PetLove, Porto Seguro" width="40%" />
          <VtField label="Número do plano" value={f.planNum} onChange={s('planNum')} placeholder="Nº da carteirinha" width="32%" />
          <VtField label="Validade" value={f.planExp} onChange={s('planExp')} mask="date" placeholder="DD/MM/AAAA" width="24%" />
        </div>

        <div className="vt-alert-block">
          <div className="vt-alert-head"><VtIcon name="alert" size={17} /> ALERTAS CLÍNICOS</div>
          <p className="vt-alert-hint" style={{ marginTop: 0 }}>Estes campos ficam em destaque no prontuário e pré-preenchem o atendimento.</p>
          <label className="vtf">
            <span className="vtf-label alert"><VtIcon name="alert" size={15} /> ALERGIAS</span>
            <span className="vtf-inputwrap"><input className="vtf-input" value={f.allergies || ''} onChange={(e) => s('allergies')(e.target.value)} placeholder="Separe por vírgulas. Ex: Dipirona, Carne de Frango" /></span>
          </label>
          <label className="vtf" style={{ marginTop: 10 }}>
            <span className="vtf-label alert"><VtIcon name="alert" size={15} /> DOENÇAS CRÔNICAS</span>
            <span className="vtf-inputwrap"><input className="vtf-input" value={f.diseases || ''} onChange={(e) => s('diseases')(e.target.value)} placeholder="Separe por vírgulas. Ex: Diabetes, Insuficiência Renal" /></span>
          </label>
          <label className="vtf" style={{ marginTop: 10 }}>
            <span className="vtf-label alert"><VtIcon name="alert" size={15} /> MEDICAÇÃO DE USO CONTÍNUO</span>
            <span className="vtf-inputwrap"><input className="vtf-input" value={f.meds || ''} onChange={(e) => s('meds')(e.target.value)} placeholder="Separe por vírgulas. Ex: Enalapril, Insulina" /></span>
          </label>
          <div className="vt-alert-grid">
            <label className="vtf">
              <span className="vtf-label alert"><VtIcon name="alert" size={15} /> RISCO ANESTÉSICO</span>
              <span className="vtf-inputwrap"><select className="vtf-input" value={f.risk || 'Baixo'} onChange={(e) => s('risk')(e.target.value)}>
                <option>Baixo</option><option>Moderado</option><option>Alto</option></select></span>
            </label>
            <label className="vtf">
              <span className="vtf-label alert"><VtIcon name="alert" size={15} /> CLASSIFICAÇÃO ASA</span>
              <span className="vtf-inputwrap"><select className="vtf-input" value={f.asa || 'ASA I'} onChange={(e) => s('asa')(e.target.value)}>
                <option>ASA I — Saudável</option><option>ASA II — Doença leve</option><option>ASA III — Doença moderada/grave</option><option>ASA IV — Ameaça à vida</option><option>ASA V — Moribundo</option></select></span>
            </label>
          </div>
        </div>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '50%' }}>
            <span className="vtf-label">Observações gerais / histórico cirúrgico</span>
            <span className="vtf-inputwrap"><textarea className="vtf-input" style={{ minHeight: 80 }} value={f.obs || ''} onChange={(e) => s('obs')(e.target.value)} placeholder="Descreva cirurgias prévias, amputações, ou outras condições especiais..." /></span>
          </label>
          <label className="vtf" style={{ width: '46%' }}>
            <span className="vtf-label">Observação interna</span>
            <span className="vtf-inputwrap"><textarea className="vtf-input" style={{ minHeight: 80, background: '#fcfce8' }} value={f.obsInterna || ''} onChange={(e) => s('obsInterna')(e.target.value)} placeholder="Anotações visíveis apenas para a equipe da clínica..." /></span>
          </label>
        </div>

        <div className="vt-form-sec">Responsável / Tutor</div>
        <OwnerAutocomplete value={f.owner} onChange={s('owner')} onPick={pickOwner} owners={ownersList} error={errs.owner} />
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '48%' }}>
            <span className="vtf-label">Como nos conheceu?</span>
            <span className="vtf-inputwrap"><select className="vtf-input" value={f.origemLead || ''} onChange={(e) => s('origemLead')(e.target.value)}>
              <option value="">Não informado</option>
              {['Instagram', 'Facebook', 'Google', 'Indicação de amigo', 'Indicação de veterinário', 'Passando na frente da clínica', 'Outros'].map((o) => <option key={o}>{o}</option>)}
            </select></span>
          </label>
        </div>
        <div className="vt-form-row">
          <VtField label="CPF" value={f.cpf} onChange={s('cpf')} mask="cpf" validate="cpf" placeholder="000.000.000-00" width="32%" />
          <VtWhatsField label="WhatsApp (mensagens automáticas)" value={f.whats} onChange={s('whats')} width="36%" />
          <VtField label="Outro telefone" value={f.phone} onChange={s('phone')} mask="phone" placeholder="(00) 00000-0000" width="28%" />
        </div>
        <div className="vt-form-row">
          <VtEmailField label="Email" value={f.email} onChange={s('email')} width="52%" />
          <VtField label="Nascimento do tutor" value={f.ownerBirth} onChange={s('ownerBirth')} mask="date" placeholder="DD/MM/AAAA" width="34%" hint="p/ msg de aniversário" />
        </div>
        <div className="vt-form-sec">Endereço do tutor <span className="vt-cep-msg">{cepMsg}</span></div>
        <div className="vt-form-row">
          <VtField label="CEP" value={f.cep} onChange={onCep} mask="cep" placeholder="00000-000" width="20%" />
          <VtField label="Rua" value={f.street} onChange={s('street')} width="50%" />
          <VtField label="Número" value={f.num} onChange={s('num')} width="14%" />
          <VtField label="Complemento" value={f.complement} onChange={s('complement')} placeholder="Apto, bloco" width="12%" />
        </div>
        <div className="vt-form-row">
          <VtField label="Bairro" value={f.district} onChange={s('district')} width="34%" />
          <VtField label="Cidade" value={f.city} onChange={s('city')} width="46%" />
          <VtField label="Estado" value={f.state} onChange={s('state')} width="14%" />
        </div>

        {isHorse && (
          <>
            <div className="vt-form-sec">🐴 Propriedade (equino) <span className="vt-cep-msg">{propCepMsg}</span></div>
            <div className="vt-form-row">
              <VtField label="Nome da propriedade" value={f.propName} onChange={s('propName')} placeholder="Ex.: Haras Bela Vista" width="48%" error={errs.propName} />
              <VtField label="Proprietário" value={f.propOwner} onChange={s('propOwner')} placeholder="Responsável" width="48%" />
            </div>
            <div className="vt-form-row">
              <VtField label="Telefone" value={f.propPhone} onChange={s('propPhone')} mask="phone" placeholder="(00) 00000-0000" width="30%" />
              <VtField label="CEP" value={f.propCep} onChange={onPropCep} mask="cep" placeholder="00000-000" width="20%" />
              <VtField label="Cidade" value={f.propcity} onChange={s('propcity')} width="36%" />
              <VtField label="UF" value={f.propstate} onChange={s('propstate')} width="10%" />
            </div>
            <div className="vt-form-row">
              <VtField label="Endereço" value={f.propstreet} onChange={s('propstreet')} width="74%" />
              <VtField label="Número" value={f.propNum} onChange={s('propNum')} width="22%" />
            </div>
          </>
        )}

        <div className="vt-form-actions">
          <button className="vt-btn-ghost" onClick={onBack}>Cancelar</button>
          <button className="vt-btn-primary" onClick={save}><VtIcon name="plus" size={16} /> Salvar paciente</button>
        </div>
      </div>
    </div>
  );
}

/* Modal de sucesso pós-cadastro — opção de agendar consulta imediatamente */
function PatientSavedModal({ patient, onList, onAgendar }) {
  return (
    <div className="fin-modal-bg" onClick={onList}>
      <div className="fin-modal vt-saved-modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="vt-saved-check"><VtIcon name="check" size={30} /></div>
        <h3 style={{ textAlign: 'center', marginBottom: 4 }}>Paciente cadastrado!</h3>
        <p style={{ textAlign: 'center', marginTop: 0 }}><b>{patient.name}</b> foi salvo com sucesso. Deseja agendar uma consulta agora?</p>
        <div className="vt-saved-actions">
          <button className="vt-btn-ghost" onClick={onList}>Voltar para lista</button>
          <button className="vt-btn-primary" onClick={onAgendar}><VtIcon name="calendar" size={16} /> Agendar consulta agora</button>
        </div>
      </div>
    </div>
  );
}

function PacientesModule({ openOdonto, goAgenda, openAgendaNew, openAtendimento, focusPatientId, clearFocus }) {
  const [view, setView] = vtUseState({ mode: 'list' });
  const [postSave, setPostSave] = vtUseState(null);
  const [patients, setPatients] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.patients) || [];
  });
  const [atendimentos] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.atendimentos) || [];
  });
  // foco vindo de outro módulo (ex.: clicar atendimento)
  vtUseEffect(() => {
    if (focusPatientId && typeof focusPatientId === 'object' && focusPatientId.newFor) {
      setView({ mode: 'new', initial: { status: 'Ativo', species: 'Cão', sex: 'Macho', owner: focusPatientId.newFor.owner, propName: focusPatientId.newFor.property } });
      if (clearFocus) clearFocus();
    } else if (focusPatientId) {
      const p = patients.find((x) => x.id === focusPatientId);
      if (p) setView({ mode: 'profile', patient: p });
      if (clearFocus) clearFocus();
    }
  }, [focusPatientId]);

  const addPatient = (p) => {
    const exists = patients.some((x) => x.id === p.id);
    const next = exists ? patients.map((x) => x.id === p.id ? p : x) : [p, ...patients];
    setPatients(next);
    if (window.VtStore) window.VtStore.setData({ patients: next });
    setView({ mode: 'profile', patient: p });
    if (!exists) setPostSave(p);
  };
  const setStatus = (p, status) => {
    const next = patients.map((x) => x.id === p.id ? { ...x, status } : x);
    setPatients(next);
    if (window.VtStore) window.VtStore.setData({ patients: next });
    setView({ mode: 'profile', patient: { ...p, status } });
    window.vtToast(`Status alterado para ${status}.`, 'ok');
  };

  if (view.mode === 'profile') return <><PatientProfile patient={view.patient} onBack={() => setView({ mode: 'list' })} onOpenOdonto={openOdonto} goAgenda={goAgenda} atendimentos={atendimentos} openAtendimento={openAtendimento} onEdit={() => setView({ mode: 'edit', patient: view.patient })} onStatus={setStatus} onAfterTransfer={(updated, next) => { setPatients(next); setView({ mode: 'profile', patient: updated }); }} />{postSave && <PatientSavedModal patient={postSave} onList={() => { setPostSave(null); setView({ mode: 'list' }); }} onAgendar={() => { const nome = postSave.name; setPostSave(null); if (openAgendaNew) openAgendaNew(nome); }} />}</>;
  if (view.mode === 'new') return <NewPatientForm initial={view.initial} onBack={() => setView({ mode: 'list' })} onSave={addPatient} />;
  if (view.mode === 'edit') return <NewPatientForm initial={view.patient} onBack={() => setView({ mode: 'profile', patient: view.patient })} onSave={addPatient} />;
  return <PatientsList patients={patients} onOpen={(p) => setView({ mode: 'profile', patient: p })} onNew={() => setView({ mode: 'new' })} />;
}

Object.assign(window, { PacientesModule, StatusPill, SpeciesTag, ageFrom, PatientSavedModal });
