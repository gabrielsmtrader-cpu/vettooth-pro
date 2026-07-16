/* ============================================================
   VetTooth Pro — app (shell + dashboard + navegação)
   ============================================================ */
const { useState, useEffect } = React;

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'pacientes', label: 'Pacientes', icon: 'paw' },
  { id: 'clientes', label: 'Responsáveis', icon: 'users' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'odontograma', label: 'Odontograma', icon: 'tooth' },
  { id: 'atendimentos', label: 'Atendimentos', icon: 'stethoscope' },
  { id: 'insumos', label: 'Estoque', icon: 'box' },
  { id: 'financas', label: 'Finanças', icon: 'dollar' },
  { id: 'relatorios', label: 'Relatórios', icon: 'chart' },
  { id: 'config', label: 'Configurações', icon: 'gear' },
  { id: 'ia', label: 'IA Assistente', icon: 'spark' },
];

function Sidebar({ active, setActive }) {
  const d = (window.VtStore && window.VtStore.getData()) || {};
  const today = new Date().toISOString().slice(0, 10);
  const agToday = (d.agendaAppts || []).filter((a) => a.date === today).length;
  const lowStock = (d.inventory || []).filter((i) => Number(i.qty != null ? i.qty : i.stock) <= Number(i.min || 0)).length;
  const badges = { agenda: agToday, insumos: lowStock };
  return (
    <aside className="vt-sidebar">
      <div className="vt-logo">
        <VtLogoMark />
        <div className="vt-logo-text">VETTOOTH <span className="pro">PRO</span></div>
      </div>
      <nav className="vt-nav">
        {NAV.map((n) => (
          <button key={n.id} className={`vt-nav-item${active === n.id ? ' active' : ''}`} onClick={() => setActive(n.id)}>
            <VtIcon name={n.icon} />
            <span>{n.label}</span>
            {badges[n.id] > 0 ? <span className={`vt-nav-badge${n.id === 'insumos' ? ' red' : ''}`}>{badges[n.id]}</span> : null}
          </button>
        ))}
      </nav>
      <div className="vt-nav-foot">VetTooth Pro · v1.0</div>
    </aside>
  );
}

function GlobalSearch({ nav }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const inputRef = React.useRef(null);
  const boxRef = React.useRef(null);

  // atalho de teclado: Ctrl/Cmd+K ou "/" foca a busca
  React.useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        inputRef.current && inputRef.current.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') { setOpen(false); inputRef.current && inputRef.current.blur(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const term = q.trim().toLowerCase();
  const results = (() => {
    if (!term) return [];
    const d = (window.VtStore && window.VtStore.getData()) || {};
    const pats = d.patients || [];
    const ats = d.atendimentos || [];
    const out = [];
    // pacientes — nome, espécie, raça, id (PAC/equivalente), microchip, tutor
    pats.forEach((p) => {
      const code = window.vtPacienteCode ? window.vtPacienteCode(p) : '';
      const hay = [p.name, p.species, p.breed, p.id, code, p.chip, p.owner].filter(Boolean).join(' ').toLowerCase();
      if (hay.includes(term)) out.push({ kind: 'paciente', icon: 'paw', id: p.id, title: p.name, sub: `${p.species || ''}${p.breed ? ' · ' + p.breed : ''} · ${p.owner || 'sem tutor'}`, data: p });
    });
    // responsáveis — nome, telefone, email (owners + tutores derivados de pacientes)
    const ownersSeen = new Set();
    const ownersList = (d.owners || []).slice();
    pats.forEach((p) => { if (p.owner && !ownersList.some((o) => o.name === p.owner)) ownersList.push({ id: 'auto-' + p.id, name: p.owner, phone: p.phone, phone2: p.phone2, whats: p.whats, email: p.email }); });
    ownersList.forEach((o) => {
      if (ownersSeen.has(o.name)) return;
      const code = window.vtClienteCode ? window.vtClienteCode(o) : '';
      const hay = [o.name, code, o.phone, o.phone2, o.whats, o.email, o.cpf].filter(Boolean).join(' ').toLowerCase();
      if (hay.includes(term)) { ownersSeen.add(o.name); out.push({ kind: 'responsavel', icon: 'users', id: o.id, title: o.name, sub: [code, o.whats || o.phone, o.email].filter((x) => x && x !== '—').join(' · ') || 'responsável', data: o }); }
    });
    // atendimentos — data, tipo, paciente, procedimento
    ats.forEach((a) => {
      const hay = [a.patientName, a.type, a.date, a.procedure, a.vet].filter(Boolean).join(' ').toLowerCase();
      if (hay.includes(term)) out.push({ kind: 'atendimento', icon: 'stethoscope', id: a.id, title: `${a.type || 'Atendimento'} · ${a.patientName || ''}`, sub: [a.date, (a.vet || '').replace('M.V. ', '')].filter(Boolean).join(' · '), data: a });
    });
    return out.slice(0, 12);
  })();

  const groups = [
    { kind: 'paciente', label: 'Pacientes', items: results.filter((r) => r.kind === 'paciente') },
    { kind: 'responsavel', label: 'Responsáveis', items: results.filter((r) => r.kind === 'responsavel') },
    { kind: 'atendimento', label: 'Atendimentos', items: results.filter((r) => r.kind === 'atendimento') },
  ].filter((g) => g.items.length);

  const choose = (r) => {
    setOpen(false); setQ('');
    if (r.kind === 'paciente') nav.patient(r.id);
    else if (r.kind === 'responsavel') nav.owner(r.title);
    else if (r.kind === 'atendimento') nav.atendimento(r.data.patientId, r.id);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && results[hi]) { e.preventDefault(); choose(results[hi]); }
  };

  React.useEffect(() => { setHi(0); }, [q]);
  let flatIdx = -1;

  return (
    <div className="vt-search" ref={boxRef}>
      <VtIcon name="search" size={18} />
      <input ref={inputRef} placeholder="Buscar paciente, tutor, ID…   (Ctrl+K)" value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown} />
      {q && <button className="vt-search-clear" onMouseDown={(e) => { e.preventDefault(); setQ(''); inputRef.current && inputRef.current.focus(); }}>×</button>}
      {open && term && (
        <div className="vt-search-pop">
          {results.length === 0 ? (
            <div className="vt-search-empty">Nenhum resultado para “{q}”.</div>
          ) : groups.map((g) => (
            <div key={g.kind} className="vt-search-group">
              <div className="vt-search-glabel">{g.label}</div>
              {g.items.map((r) => { flatIdx++; const idx = flatIdx; return (
                <button key={r.kind + r.id} className={`vt-search-item${idx === hi ? ' on' : ''}`}
                  onMouseEnter={() => setHi(idx)} onMouseDown={(e) => { e.preventDefault(); choose(r); }}>
                  <span className={`vt-search-ic ${r.kind}`}><VtIcon name={r.icon} size={15} /></span>
                  <span className="vt-search-tx"><b>{r.title}</b><i>{r.sub}</i></span>
                  <VtIcon name="chevron" size={15} />
                </button>
              ); })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SyncIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [status, setStatus] = useState('ok'); // 'ok' | 'syncing' | 'offline' | 'error'

  React.useEffect(() => {
    const onOnline  = () => setOnline(true);
    const onOffline = () => { setOnline(false); setStatus('offline'); };
    const onSync    = (e) => setStatus(e.detail.status);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('vtSyncStatus', onSync);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('vtSyncStatus', onSync);
    };
  }, []);

  if (online && status === 'ok') return null; // não mostra nada quando tudo OK

  const cfg = online
    ? status === 'syncing'
      ? { color: '#2563eb', bg: 'rgba(37,99,235,.08)', icon: '↑', label: 'Sincronizando…' }
      : status === 'error'
      ? { color: '#dc2626', bg: 'rgba(220,38,38,.08)', icon: '⚠', label: 'Erro ao sincronizar' }
      : { color: '#14a8a0', bg: 'rgba(20,168,160,.08)', icon: '✓', label: 'Online' }
    : { color: '#d97706', bg: 'rgba(217,119,6,.10)', icon: '⚡', label: 'Offline — dados salvos localmente' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99,
      background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600, marginRight: 8,
      border: `1px solid ${cfg.color}22`, whiteSpace: 'nowrap' }}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </div>
  );
}

function TopBar({ user, onLogout, onAvatar, onProfileUpdate, nav }) {
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState(null); // 'perfil' | 'atalhos' | 'novidades' | 'ajuda'
  const [dark, setDark] = useState(() => document.body.classList.contains('vt-dark'));
  const [pf, setPf] = useState({});
  const initials = (user && user.name ? user.name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('') : 'VT').toUpperCase();

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.body.classList.toggle('vt-dark', next);
    if (window.VtStore) window.VtStore.setData({ darkMode: next });
  };

  const openModal = (m) => { setMenu(false); if (m === 'perfil') setPf({ name: user && user.name || '', email: user && user.email || '', phone: user && user.phone || '', cargo: user && user.cargo || '', especialidade: user && user.especialidade || '', crmv: user && user.crmv || '', crmvUF: user && user.crmvUF || '', newPass: '', confPass: '' }); setModal(m); };

  const savePerfil = () => {
    const { newPass, confPass, curPass, ...profileFields } = pf;
    if (newPass || confPass) {
      if (newPass !== confPass) { window.vtToast && window.vtToast('As senhas não coincidem.', 'error'); return; }
      if (newPass.length < 6) { window.vtToast && window.vtToast('Nova senha precisa de 6+ caracteres.', 'error'); return; }
      if (!curPass) { window.vtToast && window.vtToast('Informe a senha atual para alterá-la.', 'error'); return; }
      const r = window.VtStore && window.VtStore.changePassword && window.VtStore.changePassword(curPass, newPass);
      if (r && !r.ok) { window.vtToast && window.vtToast(r.error, 'error'); return; }
    }
    if (window.VtStore && window.VtStore.updateProfile) window.VtStore.updateProfile(profileFields);
    if (onProfileUpdate) onProfileUpdate(profileFields);
    window.vtToast && window.vtToast('Perfil atualizado com sucesso!', 'ok');
    setModal(null);
  };

  const closeMenu = () => setMenu(false);

  React.useEffect(() => {
    const saved = window.VtStore && window.VtStore.getData && window.VtStore.getData();
    if (saved && saved.darkMode) { setDark(true); document.body.classList.add('vt-dark'); }
    const handler = (e) => { if (!e.target.closest('.vt-user')) setMenu(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const SHORTCUTS = [
    { key: 'Ctrl + K', label: 'Busca global' }, { key: 'Ctrl + N', label: 'Novo paciente' },
    { key: 'Ctrl + A', label: 'Nova consulta' }, { key: 'Ctrl + F', label: 'Ir para Finanças' },
    { key: 'Ctrl + E', label: 'Ir para Estoque' }, { key: 'Esc', label: 'Fechar modal / menu' },
    { key: 'Alt + 1', label: 'Dashboard' }, { key: 'Alt + 2', label: 'Pacientes' },
    { key: 'Alt + 3', label: 'Agenda' }, { key: 'Alt + 4', label: 'Atendimentos' },
  ];

  const NEWS = [
    { ver: 'v2.4', data: 'Jul/2026', titulo: 'Ficha do Responsável completa', desc: 'KPIs financeiros, classificação automática (VIP/Frequente), status de pagamento e gráfico de gastos mensais.' },
    { ver: 'v2.3', data: 'Jun/2026', titulo: 'Ficha Anestésica + Estoque v3', desc: 'Novo módulo de anestesia com checklists pré/pós e monitoração intraoperatória. Estoque com código de barras, markup e fornecedores.' },
    { ver: 'v2.2', data: 'Mai/2026', titulo: 'Financeiro v4 e multi-contas', desc: 'Múltiplas contas bancárias, DRE por regime (caixa/competência), fluxo de caixa previsto vs. real.' },
  ];

  const menuItem = (icon, label, onClick, color, badge) => (
    <button className="vt-umi" style={{ color: color || 'var(--ink)' }} onClick={onClick}>
      <span className="vt-umi-ic">{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span style={{ fontSize: 10, background: 'var(--teal)', color: '#fff', padding: '1px 7px', borderRadius: 99, fontWeight: 700 }}>{badge}</span>}
    </button>
  );

  return (
    <header className="vt-topbar">
      <GlobalSearch nav={nav} />
      <div className="vt-topbar-spacer" />
      <div className="vt-topbar-actions">
        <SyncIndicator />
        <button className="vt-bell" onClick={() => window.vtToast && window.vtToast('Sem notificações novas.', 'ok')}><VtIcon name="bell" size={20} /><span className="dot" /></button>
        <div className="vt-user" style={{ position: 'relative' }} onClick={() => setMenu(!menu)}>
          {user && user.avatar ? <img className="vt-avatar" src={user.avatar} alt="" style={{ objectFit: 'cover' }} /> : <div className="vt-avatar">{initials}</div>}
          <div className="vt-user-name">{user ? user.name.split(' ')[0] : 'Usuário'}</div>
          <VtIcon name="chevron" size={16} />
          {menu && (
            <div className="vt-user-menu" onClick={(e) => e.stopPropagation()} style={{ width: 260 }}>
              <div className="vt-user-menu-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  {user && user.avatar ? <img className="vt-avatar" src={user.avatar} alt="" style={{ objectFit: 'cover', width: 40, height: 40, fontSize: 16 }} /> : <div className="vt-avatar" style={{ width: 40, height: 40, fontSize: 16, flex: 'none' }}>{initials}</div>}
                  <div><b style={{ fontSize: 14 }}>{user ? user.name : ''}</b><i style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontStyle: 'normal' }}>{user ? user.email : ''}</i></div>
                </div>
                {user && user.clinic && <span>{user.clinic}</span>}
              </div>
              <div style={{ padding: '6px 4px' }}>
                {menuItem('👤', 'Meu perfil', () => openModal('perfil'))}
                <label className="vt-umi" style={{ color: 'var(--ink)', cursor: 'pointer' }}>
                  <span className="vt-umi-ic">📷</span>
                  <span style={{ flex: 1 }}>Trocar foto / avatar</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { window.VtStore.updateProfile && window.VtStore.updateProfile({ avatar: r.result }); if (onAvatar) onAvatar(r.result); }; r.readAsDataURL(f); closeMenu(); }} />
                </label>
                <div className="vt-umi" style={{ color: 'var(--ink)', cursor: 'pointer' }} onClick={toggleDark}>
                  <span className="vt-umi-ic">{dark ? '☀️' : '🌙'}</span>
                  <span style={{ flex: 1 }}>{dark ? 'Modo claro' : 'Modo escuro'}</span>
                  <span style={{ width: 36, height: 20, background: dark ? 'var(--teal)' : '#d1d5db', borderRadius: 99, display: 'flex', alignItems: 'center', padding: '0 3px', transition: 'background 0.2s' }}>
                    <span style={{ width: 14, height: 14, borderRadius: 99, background: '#fff', transform: dark ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </span>
                </div>
                <div style={{ borderTop: '1px solid var(--line-2)', margin: '6px 0' }} />
                {menuItem('⌨️', 'Atalhos de teclado', () => openModal('atalhos'))}
                {menuItem('🆕', 'Novidades', () => openModal('novidades'), null, 'v2.4')}
                {menuItem('❓', 'Ajuda & Suporte', () => openModal('ajuda'))}
                <div style={{ borderTop: '1px solid var(--line-2)', margin: '6px 0' }} />
                {menuItem('🚪', 'Sair da conta', onLogout, 'var(--red)')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Meu Perfil */}
      {modal === 'perfil' && (
        <div className="fin-modal-bg" onClick={() => setModal(null)}>
          <div className="fin-modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
            <button className="fin-modal-x" onClick={() => setModal(null)}>×</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              {user && user.avatar ? <img className="vt-avatar" src={user.avatar} alt="" style={{ width: 56, height: 56, objectFit: 'cover' }} /> : <div className="vt-avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{initials}</div>}
              <div><h3 style={{ margin: 0 }}>Meu Perfil</h3><p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>Dados do usuário logado</p></div>
            </div>
            <div className="vt-form-row">
              <VtField label="Nome completo" value={pf.name} onChange={(v) => setPf({ ...pf, name: v })} width="100%" required />
            </div>
            <div className="vt-form-row">
              <VtField label="E-mail" value={pf.email} onChange={(v) => setPf({ ...pf, email: v })} width="60%" />
              <VtField label="Telefone / WhatsApp" value={pf.phone} onChange={(v) => setPf({ ...pf, phone: v })} width="38%" />
            </div>
            <div className="vt-form-row">
              <VtField label="Cargo / Função" value={pf.cargo} onChange={(v) => setPf({ ...pf, cargo: v })} placeholder="Ex: Médico-veterinário" width="48%" />
              <VtField label="Especialidade" value={pf.especialidade} onChange={(v) => setPf({ ...pf, especialidade: v })} placeholder="Ex: Odontologia veterinária" width="48%" />
            </div>
            <div className="vt-form-row">
              <VtField label="CRMV" value={pf.crmv} onChange={(v) => setPf({ ...pf, crmv: v })} placeholder="Ex: 12345" width="35%" />
              <VtField label="UF do CRMV" value={pf.crmvUF} onChange={(v) => setPf({ ...pf, crmvUF: v })} placeholder="Ex: SP" width="20%" />
              <div style={{ flex: 1 }} />
            </div>
            <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 16, marginTop: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>ALTERAR SENHA <span style={{ fontWeight: 400 }}>(deixe em branco para manter a atual)</span></p>
              <div className="vt-form-row">
                <VtField label="Senha atual" value={pf.curPass} onChange={(v) => setPf({ ...pf, curPass: v })} type="password" width="31%" />
                <VtField label="Nova senha" value={pf.newPass} onChange={(v) => setPf({ ...pf, newPass: v })} type="password" width="31%" />
                <VtField label="Confirmar nova senha" value={pf.confPass} onChange={(v) => setPf({ ...pf, confPass: v })} type="password" width="31%" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button className="vt-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="vt-btn-primary" onClick={savePerfil}>Salvar alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Atalhos de Teclado */}
      {modal === 'atalhos' && (
        <div className="fin-modal-bg" onClick={() => setModal(null)}>
          <div className="fin-modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <button className="fin-modal-x" onClick={() => setModal(null)}>×</button>
            <h3 style={{ marginTop: 0 }}>⌨️ Atalhos de Teclado</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SHORTCUTS.map((s) => (
                <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: 9, background: 'var(--bg)' }}>
                  <span style={{ fontSize: 14 }}>{s.label}</span>
                  <kbd style={{ background: 'var(--card)', border: '1.5px solid var(--line)', borderRadius: 7, padding: '3px 10px', fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: 'var(--navy)', boxShadow: '0 1px 0 var(--line)' }}>{s.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novidades */}
      {modal === 'novidades' && (
        <div className="fin-modal-bg" onClick={() => setModal(null)}>
          <div className="fin-modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
            <button className="fin-modal-x" onClick={() => setModal(null)}>×</button>
            <h3 style={{ marginTop: 0 }}>🆕 Novidades do VetTooth Pro</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {NEWS.map((n) => (
                <div key={n.ver} style={{ background: 'var(--bg)', borderRadius: 12, padding: '14px 16px', borderLeft: '4px solid var(--teal)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ background: 'var(--teal)', color: '#fff', fontWeight: 800, fontSize: 12, padding: '2px 9px', borderRadius: 99 }}>{n.ver}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{n.data}</span>
                  </div>
                  <b style={{ fontSize: 14 }}>{n.titulo}</b>
                  <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{n.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajuda */}
      {modal === 'ajuda' && (
        <div className="fin-modal-bg" onClick={() => setModal(null)}>
          <div className="fin-modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <button className="fin-modal-x" onClick={() => setModal(null)}>×</button>
            <h3 style={{ marginTop: 0 }}>❓ Ajuda & Suporte</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '📖', label: 'Central de Ajuda', desc: 'Tutoriais e documentação do sistema', action: () => window.vtToast && window.vtToast('Documentação em construção.', 'ok') },
                { icon: '💬', label: 'Falar com Suporte', desc: 'Chat com a equipe técnica', action: () => window.vtToast && window.vtToast('Suporte via WhatsApp em breve.', 'ok') },
                { icon: '🐞', label: 'Reportar um problema', desc: 'Enviar bug ou sugestão', action: () => window.vtToast && window.vtToast('Obrigado! Feedback registrado.', 'ok') },
                { icon: '📹', label: 'Vídeos tutoriais', desc: 'Aprenda a usar o sistema', action: () => window.vtToast && window.vtToast('Vídeos em construção.', 'ok') },
              ].map((item) => (
                <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--bg)', textAlign: 'left', width: '100%', border: 'none', cursor: 'pointer' }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <div><b style={{ fontSize: 14 }}>{item.label}</b><p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{item.desc}</p></div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--teal-t)', borderRadius: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--teal-d)', fontWeight: 600 }}>VetTooth Pro · Dentalis Vet</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>Sistema de gestão veterinária para odontologia. Versão 2.4</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ----------------------- Dashboard ----------------------- */

function vtTxISO(t) {
  // suporta DD/MM/YYYY e YYYY-MM-DD
  const s = t.date || t.paidAt || '';
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s.slice(0, 10);
}
function vtIsReceita(t) { return t.kind === 'receita' || t.type === 'entrada'; }
function vtIsCusto(t)   { return t.kind === 'custo'   || t.type === 'saida'; }
function vtTxVal(t)     { return Number(t.value || t.val || 0); }
function vtStockQty(i)  { return Number(i.qty != null ? i.qty : i.stock); }
function vtIsCancel(s)  { return s === 'arquivado' || s === 'cancelado'; }

function LineChart() {
  const [hover, setHover] = useState(null);
  const d = (window.VtStore && window.VtStore.getData()) || {};
  const tx = (d.fin && d.fin.tx) || [];
  const days = [];
  for (let i = 29; i >= 0; i--) { const dt = new Date(); dt.setDate(dt.getDate() - i); days.push(dt.toISOString().slice(0, 10)); }
  let receita = days.map((iso) => tx.filter((t) => vtIsReceita(t) && vtTxISO(t) === iso).reduce((s, t) => s + vtTxVal(t), 0));
  let custos = days.map((iso) => tx.filter((t) => vtIsCusto(t) && vtTxISO(t) === iso).reduce((s, t) => s + vtTxVal(t), 0));
  const peak = Math.max(1, ...receita, ...custos);
  const max = peak * 1.15;
  const empty = receita.every((v) => v === 0) && custos.every((v) => v === 0);
  const W = 520, H = 150, pad = 8;
  const xAt = (i) => pad + (i * (W - pad * 2)) / (days.length - 1);
  const pt = (arr, i) => [xAt(i), H - pad - (arr[i] / max) * (H - pad * 2)];
  const line = (arr) => arr.map((_, i) => `${i ? 'L' : 'M'}${pt(arr, i).join(' ')}`).join(' ');
  const area = (arr) => `${line(arr)} L${pt(arr, arr.length - 1)[0]} ${H} L${pad} ${H} Z`;
  const money = (n) => window.vtMoney(n, 0);
  if (empty) return <p className="vt-muted" style={{ fontSize: 13, padding: '24px 0', textAlign: 'center' }}>Sem movimentações financeiras nos últimos 30 dias. Finalize atendimentos para ver o gráfico.</p>;
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - r.left) / r.width * W;
    let idx = Math.round((rel - pad) / (W - pad * 2) * (days.length - 1));
    idx = Math.max(0, Math.min(days.length - 1, idx));
    setHover(idx);
  };
  return (
    <div className="vt-chart-wrap" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="170" preserveAspectRatio="none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#14a8a0" stopOpacity="0.22" /><stop offset="1" stopColor="#14a8a0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area(receita)} fill="url(#gr)" />
        <path d={line(receita)} fill="none" stroke="#14a8a0" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <path d={line(custos)} fill="none" stroke="#9fc6c3" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {hover != null && <line x1={xAt(hover)} y1="0" x2={xAt(hover)} y2={H} stroke="#cfd6dd" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        {hover != null && <circle cx={pt(receita, hover)[0]} cy={pt(receita, hover)[1]} r="3.5" fill="#14a8a0" vectorEffect="non-scaling-stroke" />}
        {hover != null && <circle cx={pt(custos, hover)[0]} cy={pt(custos, hover)[1]} r="3.5" fill="#9fc6c3" vectorEffect="non-scaling-stroke" />}
      </svg>
      {hover != null && (
        <div className="vt-chart-tip" style={{ left: `${xAt(hover) / W * 100}%` }}>
          <b>{(days[hover] || '').slice(8, 10)}/{(days[hover] || '').slice(5, 7)}</b>
          <span><i style={{ background: '#14a8a0' }} /> {money(receita[hover])}</span>
          <span><i style={{ background: '#9fc6c3' }} /> {money(custos[hover])}</span>
        </div>
      )}
    </div>
  );
}

function Dashboard({ setActive }) {
  const d = (window.VtStore && window.VtStore.getData()) || {};
  const patients = d.patients || [];
  const ats = d.atendimentos || [];
  const fin = d.fin || { tx: [] };
  const inv = d.inventory || [];
  const today = new Date().toISOString().slice(0, 10);
  const appts = d.agendaAppts || [];
  const money = (n) => window.vtMoney(n, 0);
  const fmtDate = (d) => window.vtDate ? window.vtDate(d) : (d || '');
  const mPrefix = today.slice(0, 7);
  const brToYM = (br) => { const m = (br || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}` : (br || '').slice(0, 7); };

  // financeiro — suporta {type:'entrada'|'saida', val} e {kind:'receita'|'custo', value}
  const txAll = fin.tx || [];
  const fatMes = txAll.filter((t) => vtIsReceita(t) && vtTxISO(t).slice(0, 7) === mPrefix).reduce((s, t) => s + vtTxVal(t), 0);
  const custoMes = txAll.filter((t) => vtIsCusto(t) && vtTxISO(t).slice(0, 7) === mPrefix).reduce((s, t) => s + vtTxVal(t), 0);
  const recebHoje = txAll.filter((t) => vtIsReceita(t) && vtTxISO(t) === today && (t.status === 'pago' || t.status === 'recebido')).reduce((s, t) => s + vtTxVal(t), 0);
  const aReceber = txAll.filter((t) => vtIsReceita(t) && t.status === 'pendente').reduce((s, t) => s + vtTxVal(t), 0);
  const ticketBase = txAll.filter(vtIsReceita);
  const ticket = ticketBase.length ? ticketBase.reduce((s, t) => s + vtTxVal(t), 0) / ticketBase.length : 0;

  // estoque — suporta {stock} e {qty}
  const lowStock = inv.filter((i) => vtStockQty(i) <= Number(i.min || 0));
  const itensCrit = inv.filter((i) => vtStockQty(i) === 0);

  // agenda
  const weekStart = (() => { const dt = new Date(); dt.setDate(dt.getDate() - dt.getDay()); return dt.toISOString().slice(0, 10); })();
  const weekEnd   = (() => { const dt = new Date(); dt.setDate(dt.getDate() - dt.getDay() + 7); return dt.toISOString().slice(0, 10); })();
  const aptsWeek = appts.filter((a) => (a.date || '') >= weekStart && (a.date || '') < weekEnd).length;
  const aptsHoje = appts.filter((a) => (a.date || '') === today).sort((a, b) => (a.time || a.start || '').localeCompare(b.time || b.start || ''));
  const proximos = appts.filter((a) => (a.date || '') > today).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || '')).slice(0, 4);

  // vacinas vencendo em 30 dias
  const vacAlert = (() => {
    const limit = new Date(); limit.setDate(limit.getDate() + 30);
    const limitISO = limit.toISOString().slice(0, 10);
    const res = [];
    ats.forEach((a) => {
      const p = patients.find((pt) => pt.id === a.patientId);
      if (!p) return;
      (a.vacinas || []).forEach((v) => {
        if (v.proxima && v.proxima >= today && v.proxima <= limitISO) {
          res.push({ patient: p.name, tipo: v.tipo || 'Vacina', proxima: v.proxima });
        }
      });
    });
    return res.sort((a, b) => a.proxima.localeCompare(b.proxima)).slice(0, 8);
  })();

  // atendimentos
  const procMes = ats.filter((a) => brToYM(a.date || a.dataISO || '') === mPrefix && a.status !== 'arquivado' && a.status !== 'cancelado').length;
  const comRetorno = patients.filter((p) => ats.filter((a) => a.patientId === p.id).length > 1).length;
  const taxaRetorno = patients.length ? Math.round(comRetorno / patients.length * 100) : 0;
  const recent = ats.slice().sort((a, b) => { const da = (b.date || '').split('/').reverse().join('-'); const db = (a.date || '').split('/').reverse().join('-'); return da.localeCompare(db) || (b.id || '').localeCompare(a.id || ''); }).slice(0, 5);
  const patName = (id) => (patients.find((p) => p.id === id) || {}).name || '';

  const kpis = [
    { icon: 'calendar', label: 'Hoje', value: String(aptsHoje.length), sub: `${aptsWeek} esta semana · ${appts.length} total`, go: 'agenda' },
    { icon: 'paw', label: 'Pacientes ativos', value: String(patients.filter((p) => p.status !== 'Óbito').length), sub: `${patients.length} cadastrados`, go: 'pacientes' },
    { icon: 'dollar', label: 'Faturamento do mês', value: money(fatMes), sub: `Custos: ${money(custoMes)} · Líquido: ${money(fatMes - custoMes)}`, go: 'financas' },
    { icon: 'dollar', label: 'Recebido hoje', value: money(recebHoje), sub: aReceber > 0 ? `${money(aReceber)} pendente` : 'Sem pendências', go: 'financas' },
    { icon: 'receipt', label: 'Ticket médio', value: money(ticket), sub: `${ticketBase.length} lançamentos`, go: 'financas' },
    { icon: 'tooth', label: 'Procedimentos/mês', value: String(procMes), sub: `${ats.length} no total`, go: 'atendimentos' },
    { icon: 'chart', label: 'Taxa de retorno', value: taxaRetorno + '%', sub: `${comRetorno} pacientes recorrentes`, go: 'relatorios' },
    { icon: 'box', label: 'Estoque crítico', value: String(lowStock.length), sub: itensCrit.length > 0 ? `${itensCrit.length} zerado(s)` : 'Verifique itens', go: 'insumos' },
  ];

  const statusColor = (s) => s === 'confirmado' ? '#27a871' : s === 'cancelado' ? '#e0533c' : '#e09c3c';
  const statusLabel = (s) => s === 'confirmado' ? 'Confirmado' : s === 'cancelado' ? 'Cancelado' : 'Aguardando';

  return (
    <div>
      <div className="vt-page-head">
        <h1>Dashboard</h1>
        <p>Visão geral da clínica — dados em tempo real</p>
      </div>

      <div className="vt-grid vt-kpis vt-anim" style={{ marginBottom: 18 }}>
        {kpis.map((k, i) => (
          <button key={k.label} className="vt-card vt-kpi vt-kpi-btn" style={{ animationDelay: (i * 0.05) + 's' }} onClick={() => k.go && setActive(k.go)}>
            <div className="vt-kpi-ic"><VtIcon name={k.icon} size={24} /></div>
            <div>
              <div className="vt-kpi-label">{k.label}</div>
              <div className="vt-kpi-value">{k.value}</div>
              <div className="vt-kpi-delta up"><span>{k.sub}</span></div>
            </div>
          </button>
        ))}
      </div>

      {/* Agenda de Hoje */}
      <div className="vt-card vt-sec" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 className="vt-sec-title" style={{ margin: 0 }}>Agenda de Hoje — {fmtDate(today)}</h3>
          <button className="vt-btn-ghost" style={{ fontSize: 12 }} onClick={() => setActive('agenda')}>Ver tudo</button>
        </div>
        {aptsHoje.length === 0 ? (
          <p className="vt-muted" style={{ fontSize: 13 }}>Nenhum agendamento para hoje.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 8 }}>
            {aptsHoje.map((n, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal)', minWidth: 40 }}>{n.time || n.start || '--'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.patient}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{n.type || n.kind || 'Consulta'} · {n.vet ? n.vet.replace('Dr. ','').replace('Dra. ','') : ''}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: statusColor(n.status), background: statusColor(n.status)+'18', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>{statusLabel(n.status)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {vacAlert.length > 0 && (
        <div className="vt-card vt-sec" style={{ marginBottom: 18, borderLeft: '3px solid #e09c3c' }}>
          <h3 className="vt-sec-title" style={{ color: '#c97b10' }}>💉 Vacinas vencendo nos próximos 30 dias ({vacAlert.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
            {vacAlert.map((v, i) => {
              const parts = v.proxima.split('-');
              const dateStr = parts[2] + '/' + parts[1] + '/' + parts[0];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', borderRadius: 8, padding: '7px 12px', border: '1px solid #fbbf2440' }}>
                  <span style={{ fontSize: 20 }}>💉</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{v.patient}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{v.tipo} · vence {dateStr}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="vt-btn-ghost" style={{ marginTop: 10 }} onClick={() => setActive('atendimentos')}>Ver atendimentos</button>
        </div>
      )}

      <div className="vt-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 18 }}>
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">Próximos dias</h3>
          {proximos.length === 0 ? <p className="vt-muted" style={{ fontSize: 13 }}>Sem agendamentos futuros.</p> : proximos.map((n, i) => (
            <div key={i} className="vt-list-row">
              <span className="name">{n.patient}</span>
              <span className="meta">{n.type || n.kind || ''}</span>
              <span className="time">{fmtDate(n.date)} {n.time || ''}</span>
            </div>
          ))}
          <button className="vt-btn-ghost" style={{ marginTop: 10 }} onClick={() => setActive('agenda')}>Ver agenda</button>
        </div>
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">Alertas de estoque</h3>
          {lowStock.length === 0
            ? <p className="vt-muted" style={{ fontSize: 13 }}>Estoque em dia ✓</p>
            : lowStock.slice(0, 6).map((a, i) => (
              <div key={i} className="vt-alert-row">
                <span className="vt-alert-dot" style={{ background: vtStockQty(a) === 0 ? 'var(--red)' : 'var(--amber)' }} />
                <div><span className="k">{vtStockQty(a) === 0 ? 'Zerado:' : 'Baixo:'}</span> {a.name} ({vtStockQty(a)} {a.unit})</div>
              </div>
            ))
          }
          <button className="vt-btn-ghost" style={{ marginTop: 10 }} onClick={() => setActive('insumos')}>Ver estoque</button>
        </div>
      </div>

      <div className="vt-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">Ações rápidas</h3>
          <div className="vt-qa-grid">
            <button className="vt-qa navy" onClick={() => setActive('pacientes')}><VtIcon name="plus" /> Novo paciente</button>
            <button className="vt-qa navy" onClick={() => setActive('atendimentos')}><VtIcon name="stethoscope" /> Atendimentos</button>
            <button className="vt-qa teal" onClick={() => setActive('agenda')}><VtIcon name="calendar" /> Agendar</button>
            <button className="vt-qa teal" onClick={() => setActive('financas')}><VtIcon name="dollar" /> Financeiro</button>
            <button className="vt-qa" style={{ background: 'linear-gradient(135deg,#6c3fc0,#14a8a0)', color: '#fff' }} onClick={() => window.vtOpenIA && window.vtOpenIA('Olá! Como posso ajudar hoje?')}><VtIcon name="spark" /> VetIA Pro</button>
            <button className="vt-qa" style={{ background: 'var(--bg)', border: '1.5px solid var(--border)' }} onClick={() => setActive('relatorios')}><VtIcon name="chart" /> Relatórios</button>
          </div>
        </div>
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">Receita x Custos <span style={{ color: 'var(--faint)', fontWeight: 600, fontSize: 13 }}>(últimos 30 dias)</span></h3>
          <div className="vt-chart-legend">
            <span><i style={{ background: '#14a8a0' }} /> Receita</span>
            <span><i style={{ background: '#9fc6c3' }} /> Custos</span>
          </div>
          <LineChart />
        </div>
      </div>

      <div className="vt-card vt-sec" style={{ marginTop: 18 }}>
        <h3 className="vt-sec-title">Atividade recente</h3>
        {recent.length === 0 ? <p className="vt-muted" style={{ fontSize: 13 }}>Nenhuma atividade ainda.</p> : (
          <div className="vt-activity">
            {recent.map((a, i) => (
              <button key={a.id || i} className="vt-act-row" onClick={() => setActive('atendimentos')}>
                <span className="vt-act-ic" style={{ background: a.vetColor || 'var(--teal)' }}><VtIcon name="stethoscope" size={15} /></span>
                <div className="vt-act-body">
                  <b>{a.patientName || patName(a.patientId) || 'Paciente'}</b>
                  <i>{a.type || 'Atendimento'}{a.procedure ? ' · ' + a.procedure : ''}</i>
                </div>
                <span className="vt-act-meta">{fmtDate(a.date)}{a.status ? <em className={`vt-act-st ${a.status}`}>{a.status === 'finalizado' ? 'Finalizado' : a.status === 'arquivado' ? 'Arquivado' : 'Em andamento'}</em> : null}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------- Odontograma (módulo nativo OdontogramaModule) ----------------------- */
function Odontograma({ patientId }) {
  if (!window.OdontogramaModule) return (
    <div className="vt-frame-wrap" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color:'var(--muted)' }}>
      <div style={{ width:32, height:32, border:'3px solid var(--line)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'vtspin .7s linear infinite' }} />
      Carregando odontograma…
    </div>
  );
  return (
    <div className="vt-frame-wrap od-embed">
      <window.OdontogramaModule initialPatientId={patientId || ''} />
    </div>
  );
}

/* ----------------------- Placeholder ----------------------- */
function Placeholder({ nav }) {
  return (
    <div>
      <div className="vt-page-head"><h1>{nav.label}</h1><p>Módulo do VetTooth Pro</p></div>
      <div className="vt-placeholder">
        <div className="vt-card vt-placeholder-card">
          <div className="vt-placeholder-ic"><VtIcon name={nav.icon} size={30} /></div>
          <h2>{nav.label}</h2>
          <p>Esta tela faz parte do VetTooth Pro e será construída na sequência, seguindo o design das telas que você enviou.</p>
          <div className="vt-badge-soon">Em construção</div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- App ----------------------- */
function App() {
  const [user, setUser] = useState(() => { const u = window.VtStore.currentUser(); if (u) { window.VtStore.migrate(); const cfg = window.vtSysCfg && window.vtSysCfg(); if (cfg && cfg.cor) document.documentElement.style.setProperty('--teal', cfg.cor); } return u; });
  const [active, setActive] = useState('dashboard');
  const [focusPatient, setFocusPatient] = useState(null);
  const [focusAtend, setFocusAtend] = useState(null);
  const [focusOwner, setFocusOwner] = useState(null);
  const [focusAgenda, setFocusAgenda] = useState(null);
  const [odontoPatient, setOdontoPatient] = useState(null);
  const [focusIA, setFocusIA] = useState(null);
  const [dataVer, setDataVer] = useState(0);
  const flush = active === 'odontograma';

  // Escuta restauração de dados do Supabase → força re-render de todos os módulos
  useEffect(() => {
    const handler = () => setDataVer((v) => v + 1);
    document.addEventListener('vtDataRestored', handler);
    window.addEventListener('vtCfgChanged', handler);
    window.vtForceRefresh = handler;
    return () => { document.removeEventListener('vtDataRestored', handler); window.removeEventListener('vtCfgChanged', handler); delete window.vtForceRefresh; };
  }, []);

  if (!user) return <AuthScreen onAuthed={(u) => { setUser(u); setActive('dashboard'); }} />;

  // expõe setActive e openIA para launchers globais
  window._vtSetActive = setActive;
  window._vtOpenIA = (prompt, patientId) => { setFocusIA({ prompt: prompt || '', patientId: patientId || null }); setActive('ia'); };

  const logout = () => { window.VtStore.logout(); setUser(null); };
  const openPatient = (id) => { setFocusPatient(id); setActive('pacientes'); };
  const openIA = (prompt, patientId) => { setFocusIA({ prompt: prompt || '', patientId: patientId || null }); setActive('ia'); };
  const openOwner = (name) => { setFocusOwner(name); setActive('clientes'); };
  const openAtendimento = (patientId, atendimentoId) => { setFocusAtend({ patientId, atendimentoId: atendimentoId || null }); setActive('atendimentos'); };
  const openOdonto = (pid) => { setOdontoPatient(pid || null); setActive('odontograma'); };
  const openAgendaNew = (patientName) => { setFocusAgenda(patientName || ''); setActive('agenda'); };
  const iniciarAtendimentoFromAgenda = (appt) => { setFocusAtend({ fromAgenda: appt }); setActive('atendimentos'); };
  const navSearch = { patient: openPatient, owner: openOwner, atendimento: openAtendimento, setActive };
  // adicionar novo animal a partir da ficha do responsável/propriedade
  window.vtAddAnimalFor = (owner, propertyName) => { setFocusPatient({ newFor: { owner: owner || '', property: propertyName || '' } }); setActive('pacientes'); };

  return (
    <div className="vt-app">
      <Sidebar active={active} setActive={setActive} />
      <div className="vt-main">
        <TopBar user={user} onLogout={logout} onAvatar={(a) => setUser((u) => ({ ...u, avatar: a }))} onProfileUpdate={(p) => setUser((u) => ({ ...u, ...p }))} nav={navSearch} />
        <main className={`vt-content${flush ? ' flush' : ''}`}>
          {active === 'dashboard' && <Dashboard key={'dash-'+dataVer} setActive={setActive} user={user} />}
          {active === 'pacientes' && <PacientesModule key={'pac-'+dataVer} openOdonto={openOdonto} goAgenda={() => setActive('agenda')} openAgendaNew={openAgendaNew} openAtendimento={openAtendimento} focusPatientId={focusPatient} clearFocus={() => setFocusPatient(null)} />}
          {active === 'clientes' && <ClientesModule key={'cli-'+dataVer} openPatient={openPatient} focusOwnerName={focusOwner} clearFocus={() => setFocusOwner(null)} />}
          {active === 'agenda' && <AgendaModule key={'ag-'+dataVer} focusNewPatient={focusAgenda} clearAgendaFocus={() => setFocusAgenda(null)} onIniciarAtendimento={iniciarAtendimentoFromAgenda} />}
          {active === 'odontograma' && <Odontograma patientId={odontoPatient} />}
          {active === 'atendimentos' && <AtendimentosModule key={'at-'+dataVer} openPatient={openPatient} openOdonto={openOdonto} focus={focusAtend} clearFocus={() => setFocusAtend(null)} />}
          {active === 'insumos' && <EstoqueModule3 key={'est-'+dataVer} />}
          {active === 'financas' && <FinancasModuleV4 key={'fin-'+dataVer} />}
          {active === 'relatorios' && <RelatoriosModule />}
          {active === 'config' && <ConfigModule />}
          {active === 'ia' && <IAModule key={'ia-'+(focusIA?.patientId||'x')+'-'+dataVer} initialPrompt={focusIA?.prompt} contextPatientId={focusIA?.patientId} />}
        </main>
      </div>
    </div>
  );
}

class VtAppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[VetTooth] Falha ao montar o sistema:', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#eef1f5', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
        <div style={{ width: 'min(520px, 100%)', background: '#fff', border: '1px solid #dce3ea', borderRadius: 18, padding: 28, boxShadow: '0 18px 50px rgba(14,44,77,.10)' }}>
          <div style={{ color: '#0e2c4d', fontSize: 21, fontWeight: 800, marginBottom: 8 }}>Não foi possível abrir o painel</div>
          <p style={{ color: '#657489', lineHeight: 1.55, margin: '0 0 20px' }}>Seus dados continuam salvos. Recarregue o sistema para concluir a atualização do formato da conta.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => window.location.reload()} style={{ border: 0, borderRadius: 10, padding: '11px 17px', background: '#0e8f88', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Recarregar sistema</button>
            <button onClick={() => { window.VtStore && window.VtStore.logout(); window.location.reload(); }} style={{ border: '1px solid #d5dde5', borderRadius: 10, padding: '11px 17px', background: '#fff', color: '#34465a', fontWeight: 700, cursor: 'pointer' }}>Voltar ao login</button>
          </div>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<VtAppErrorBoundary><App /></VtAppErrorBoundary>);
