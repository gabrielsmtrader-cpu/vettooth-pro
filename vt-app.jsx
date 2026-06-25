/* ============================================================
   VetTooth Pro — app (shell + dashboard + navegação)
   ============================================================ */
const { useState } = React;

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
  const lowStock = (d.inventory || []).filter((i) => Number(i.qty) < Number(i.min)).length;
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

function TopBar({ user, onLogout, onAvatar, nav }) {
  const [menu, setMenu] = useState(false);
  const initials = (user && user.name ? user.name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('') : 'VT').toUpperCase();
  return (
    <header className="vt-topbar">
      <GlobalSearch nav={nav} />
      <div className="vt-topbar-spacer" />
      <div className="vt-topbar-actions">
        <button className="vt-bell"><VtIcon name="bell" size={20} /><span className="dot" /></button>
        <div className="vt-user" style={{ position: 'relative' }} onClick={() => setMenu(!menu)}>
          {user && user.avatar ? <img className="vt-avatar" src={user.avatar} alt="" style={{ objectFit: 'cover' }} /> : <div className="vt-avatar">{initials}</div>}
          <div className="vt-user-name">{user ? user.name : 'Usuário'}</div>
          <VtIcon name="chevron" size={16} />
          {menu && (
            <div className="vt-user-menu" onClick={(e) => e.stopPropagation()}>
              <div className="vt-user-menu-head">
                <b>{user ? user.name : ''}</b>
                <i>{user ? user.email : ''}</i>
                {user && user.clinic && <span>{user.clinic}</span>}
              </div>
              <label className="vt-user-menu-item" style={{ color: 'var(--ink)', cursor: 'pointer' }}>
                <VtIcon name="plus" size={15} style={{ transform: 'none' }} /> Trocar foto / avatar
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { window.VtStore.updateProfile && window.VtStore.updateProfile({ avatar: r.result }); if (onAvatar) onAvatar(r.result); }; r.readAsDataURL(f); }} />
              </label>
              <button className="vt-user-menu-item" onClick={onLogout}><VtIcon name="chevron" size={15} /> Sair da conta</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ----------------------- Dashboard ----------------------- */
const KPIS = [
  { icon: 'calendar', label: 'Atendimentos hoje', value: '12', delta: '+2%', dir: 'up' },
  { icon: 'tooth', label: 'Procedimentos', value: '28', delta: '+5%', dir: 'up' },
  { icon: 'dollar', label: 'Receita', value: 'R$ 8.500', delta: '+10%', dir: 'up' },
  { icon: 'chart', label: 'Custos', value: 'R$ 2.100', delta: '+1%', dir: 'down' },
];
const NEXT = [
  { name: 'Luna', meta: '(Cão, Limpeza)', time: '09:00' },
  { name: 'Thor', meta: '(Gato, Extração)', time: '10:15' },
  { name: 'Bella', meta: '(Cavalo, Exame)', time: '11:30' },
  { name: 'Max', meta: '(Cão, Retorno)', time: '14:00' },
];
const ALERTS = [
  { k: 'Estoque baixo:', v: 'Broca Odontológica', c: 'var(--red)' },
  { k: 'Retorno:', v: 'Fred (Gato) em 2 dias', c: 'var(--amber)' },
  { k: 'Vacina:', v: 'Rex (Cão) vencendo', c: 'var(--teal)' },
];

function LineChart() {
  const [hover, setHover] = useState(null);
  const d = (window.VtStore && window.VtStore.getData()) || {};
  const tx = (d.fin && d.fin.tx) || [];
  const days = [];
  for (let i = 29; i >= 0; i--) { const dt = new Date(); dt.setDate(dt.getDate() - i); days.push(dt.toISOString().slice(0, 10)); }
  let receita = days.map((iso) => tx.filter((t) => t.kind === 'receita' && t.date === iso).reduce((s, t) => s + (Number(t.value) || 0), 0));
  let custos = days.map((iso) => tx.filter((t) => t.kind === 'custo' && t.date === iso).reduce((s, t) => s + (Number(t.value) || 0), 0));
  const peak = Math.max(1, ...receita, ...custos);
  const max = peak * 1.15;
  const empty = receita.every((v) => v === 0) && custos.every((v) => v === 0);
  const W = 520, H = 150, pad = 8;
  const xAt = (i) => pad + (i * (W - pad * 2)) / (days.length - 1);
  const pt = (arr, i) => [xAt(i), H - pad - (arr[i] / max) * (H - pad * 2)];
  const line = (arr) => arr.map((_, i) => `${i ? 'L' : 'M'}${pt(arr, i).join(' ')}`).join(' ');
  const area = (arr) => `${line(arr)} L${pt(arr, arr.length - 1)[0]} ${H} L${pad} ${H} Z`;
  const money = (n) => 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
  const recebHoje = (fin.tx || []).filter((t) => t.kind === 'receita' && t.status === 'pago' && t.paidAt === today).reduce((s, t) => s + t.value, 0);
  const aReceber = (fin.tx || []).filter((t) => t.kind === 'receita' && t.status !== 'pago').reduce((s, t) => s + t.value, 0);
  const lowStock = (inv || []).filter((i) => Number(i.qty) < Number(i.min));
  const money = (n) => 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  // métricas do mês
  const mPrefix = today.slice(0, 7);
  const fatMes = (fin.tx || []).filter((t) => t.kind === 'receita' && (t.date || '').slice(0, 7) === mPrefix).reduce((s, t) => s + (Number(t.value) || 0), 0);
  const procMes = ats.filter((a) => (a.date || a.dataISO || '').slice(0, 7) === mPrefix || ((a.procedimentos || []).length && (a.status === 'finalizado'))).length;
  const ticketBase = (fin.tx || []).filter((t) => t.kind === 'receita');
  const ticket = ticketBase.length ? ticketBase.reduce((s, t) => s + (Number(t.value) || 0), 0) / ticketBase.length : 0;
  const comRetorno = patients.filter((p) => ats.filter((a) => a.patientId === p.id).length > 1).length;
  const taxaRetorno = patients.length ? Math.round(comRetorno / patients.length * 100) : 0;
  const kpis = [
    { icon: 'calendar', label: 'Agendamentos', value: String(appts.length), sub: 'esta semana', go: 'agenda' },
    { icon: 'paw', label: 'Pacientes ativos', value: String(patients.filter((p) => p.status !== 'Óbito').length), sub: `${patients.length} no total`, go: 'pacientes' },
    { icon: 'stethoscope', label: 'Atendimentos', value: String(ats.length), sub: 'registrados', go: 'atendimentos' },
    { icon: 'dollar', label: 'Recebido hoje', value: money(recebHoje), sub: `${money(aReceber)} a receber`, go: 'financas' },
    { icon: 'dollar', label: 'Faturamento do mês', value: money(fatMes), sub: 'receita no mês', go: 'financas' },
    { icon: 'receipt', label: 'Ticket médio', value: money(ticket), sub: 'por lançamento', go: 'financas' },
    { icon: 'tooth', label: 'Procedimentos do mês', value: String(procMes), sub: 'finalizados', go: 'atendimentos' },
    { icon: 'chart', label: 'Taxa de retorno', value: taxaRetorno + '%', sub: `${comRetorno} pacientes recorrentes`, go: 'relatorios' },
  ];
  const proximos = appts.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.start || 0) - (b.start || 0)).filter((a) => (a.date || '') >= today).slice(0, 5);
  // atividade recente
  const recent = ats.slice().sort((a, b) => (b.id || '').localeCompare(a.id || '')).slice(0, 6);
  const patName = (id) => (patients.find((p) => p.id === id) || {}).name || '';
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

      <div className="vt-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 18 }}>
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">Próximos agendamentos</h3>
          {proximos.length === 0 ? <p className="vt-muted" style={{ fontSize: 13 }}>Nenhum agendamento.</p> : proximos.map((n, i) => (
            <div key={i} className="vt-list-row">
              <span className="name">{n.patient}</span>
              <span className="meta">({n.kind})</span>
              <span className="time">{(n.date || '').slice(8, 10)}/{(n.date || '').slice(5, 7)} {fmtH ? fmtH(n.start) : n.start}</span>
            </div>
          ))}
          <button className="vt-btn-ghost" style={{ marginTop: 10 }} onClick={() => setActive('agenda')}>Ver agenda</button>
        </div>
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">Alertas</h3>
          {lowStock.length === 0 ? <p className="vt-muted" style={{ fontSize: 13 }}>Estoque em dia.</p> : lowStock.slice(0, 5).map((a, i) => (
            <div key={i} className="vt-alert-row">
              <span className="vt-alert-dot" style={{ background: 'var(--red)' }} />
              <div><span className="k">Estoque baixo:</span> {a.name} ({a.qty} {a.unit})</div>
            </div>
          ))}
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
                <span className="vt-act-meta">{a.date || ''}{a.status ? <em className={`vt-act-st ${a.status}`}>{a.status === 'finalizado' ? 'Finalizado' : a.status === 'arquivado' ? 'Arquivado' : 'Em andamento'}</em> : null}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------- Odontograma (módulo) ----------------------- */
function Odontograma({ patientId }) {
  const src = (() => {
    if (!patientId) return 'EquiChart.html';
    const d = (window.VtStore && window.VtStore.getData()) || {};
    const p = (d.patients || []).find((x) => x.id === patientId);
    if (!p) return 'EquiChart.html';
    const qs = new URLSearchParams();
    qs.set('patient', p.name);
    if (p.owner) qs.set('owner', p.owner);
    if (p.species) qs.set('species', p.species);
    return 'EquiChart.html?' + qs.toString();
  })();
  return (
    <div className="vt-frame-wrap">
      <iframe key={src} className="vt-frame" src={src} title="Odontograma" />
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
  const [dataVer, setDataVer] = useState(0);
  const flush = active === 'odontograma';

  // Escuta restauração de dados do Supabase → força re-render de todos os módulos
  useEffect(() => {
    const handler = () => setDataVer((v) => v + 1);
    document.addEventListener('vtDataRestored', handler);
    window.vtForceRefresh = handler;
    return () => { document.removeEventListener('vtDataRestored', handler); delete window.vtForceRefresh; };
  }, []);

  if (!user) return <AuthScreen onAuthed={(u) => { setUser(u); setActive('dashboard'); }} />;

  const logout = () => { window.VtStore.logout(); setUser(null); };
  const openPatient = (id) => { setFocusPatient(id); setActive('pacientes'); };
  const openOwner = (name) => { setFocusOwner(name); setActive('clientes'); };
  const openAtendimento = (patientId, atendimentoId) => { setFocusAtend({ patientId, atendimentoId: atendimentoId || null }); setActive('atendimentos'); };
  const openOdonto = (pid) => { setOdontoPatient(pid || null); setActive('odontograma'); };
  const openAgendaNew = (patientName) => { setFocusAgenda(patientName || ''); setActive('agenda'); };
  const navSearch = { patient: openPatient, owner: openOwner, atendimento: openAtendimento, setActive };
  // adicionar novo animal a partir da ficha do responsável/propriedade
  window.vtAddAnimalFor = (owner, propertyName) => { setFocusPatient({ newFor: { owner: owner || '', property: propertyName || '' } }); setActive('pacientes'); };

  return (
    <div className="vt-app">
      <Sidebar active={active} setActive={setActive} />
      <div className="vt-main">
        <TopBar user={user} onLogout={logout} onAvatar={(a) => setUser((u) => ({ ...u, avatar: a }))} nav={navSearch} />
        <main className={`vt-content${flush ? ' flush' : ''}`}>
          {active === 'dashboard' && <Dashboard setActive={setActive} user={user} />}
          {active === 'pacientes' && <PacientesModule key={'pac-'+dataVer} openOdonto={openOdonto} goAgenda={() => setActive('agenda')} openAgendaNew={openAgendaNew} openAtendimento={openAtendimento} focusPatientId={focusPatient} clearFocus={() => setFocusPatient(null)} />}
          {active === 'clientes' && <ClientesModule key={'cli-'+dataVer} openPatient={openPatient} focusOwnerName={focusOwner} clearFocus={() => setFocusOwner(null)} />}
          {active === 'agenda' && <AgendaModule key={'ag-'+dataVer} focusNewPatient={focusAgenda} clearAgendaFocus={() => setFocusAgenda(null)} />}
          {active === 'odontograma' && <Odontograma patientId={odontoPatient} />}
          {active === 'atendimentos' && <AtendimentosModule key={'at-'+dataVer} openPatient={openPatient} openOdonto={openOdonto} focus={focusAtend} clearFocus={() => setFocusAtend(null)} />}
          {active === 'insumos' && <EstoqueModule key={'est-'+dataVer} />}
          {active === 'financas' && <FinancasModule key={'fin-'+dataVer} />}
          {active === 'relatorios' && <RelatoriosModule />}
          {active === 'config' && <ConfigModule />}
          {active === 'ia' && <IAModule />}
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
