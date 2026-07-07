/* ============================================================
   VetTooth Pro — Auth v3 (Login + Cadastro)
   Design premium — SVG icons, sem emojis nos inputs
   Branch: gabriel
   ============================================================ */

/* ── SVG icons ── */
const IcMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 7 10 7 10-7"/>
  </svg>
);
const IcLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IcEye = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);
const IcCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

/* ── força da senha ── */
function pwStrength(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}
function PwBar({ pw }) {
  const s = pwStrength(pw);
  const color = s <= 1 ? '#ef4444' : s <= 2 ? '#f97316' : s <= 3 ? '#eab308' : '#22c55e';
  const label = ['', 'Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'][s] || '';
  if (!pw) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 3, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
        <div style={{ width: `${(s / 5) * 100}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .3s, background .3s' }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600, marginTop: 3, display: 'block' }}>{label}</span>
    </div>
  );
}

/* ── campo genérico (sem ícone) ── */
function AF({ label, type = 'text', value = '', onChange, placeholder, required, children }) {
  const [focused, setFocused] = vtUseState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#374151', letterSpacing: .1 }}>
        {label}{required && <span style={{ color: 'var(--teal)', marginLeft: 3 }}>*</span>}
      </span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ padding: '11px 13px', borderRadius: 10, border: `1.5px solid ${focused ? 'var(--teal)' : '#dde3ed'}`, fontSize: 14, fontFamily: 'inherit', background: '#fff', outline: 'none', boxShadow: focused ? '0 0 0 3px rgba(20,168,160,.1)' : 'none', transition: 'border .15s, box-shadow .15s', color: '#111827' }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
      {children}
    </label>
  );
}

/* ── campo com ícone prefixo ── */
function AFIcon({ label, icon, type = 'text', value = '', onChange, placeholder, required, right }) {
  const [focused, setFocused] = vtUseState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#374151', letterSpacing: .1 }}>
        {label}{required && <span style={{ color: 'var(--teal)', marginLeft: 3 }}>*</span>}
      </span>
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 13, color: focused ? 'var(--teal)' : '#9ca3af', transition: 'color .15s', display: 'flex', pointerEvents: 'none' }}>{icon}</span>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={{ flex: 1, padding: `12px 13px 12px 42px`, paddingRight: right ? 44 : 13, borderRadius: 10, border: `1.5px solid ${focused ? 'var(--teal)' : '#dde3ed'}`, fontSize: 14, fontFamily: 'inherit', background: '#fff', outline: 'none', boxShadow: focused ? '0 0 0 3px rgba(20,168,160,.1)' : 'none', transition: 'border .15s, box-shadow .15s', color: '#111827' }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        />
        {right}
      </span>
    </label>
  );
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode]     = vtUseState('login');
  const [step, setStep]     = vtUseState(1);
  const [f, setF]           = vtUseState({});
  const [err, setErr]       = vtUseState('');
  const [loading, setLoad]  = vtUseState(false);
  const [showPw, setShowPw] = vtUseState(false);
  const [resetState, setRS] = vtUseState(null);

  const s = (k) => (v) => { setF((p) => ({ ...p, [k]: v })); setErr(''); };

  const doLogin = () => {
    if (!f.email || !f.password) return setErr('Preencha email e senha.');
    setLoad(true);
    setTimeout(() => {
      const r = window.VtStore.login({ email: f.email, password: f.password });
      setLoad(false);
      if (!r.ok) return setErr(r.error);
      if (f.remember) localStorage.setItem('vt-remember', f.email);
      onAuthed(r.user);
    }, 400);
  };

  const doSignup = () => {
    if (!f.name || !f.email || !f.password) return setErr('Preencha todos os campos obrigatórios.');
    if (f.password !== f.password2 && f.password2) return setErr('As senhas não conferem.');
    if (!f.acceptTerms) return setErr('Aceite os termos de uso para continuar.');
    setLoad(true);
    setTimeout(() => {
      const r = window.VtStore.register({ name: f.name, clinic: f.clinic, email: f.email, password: f.password, demo: !!f.demo });
      if (!r.ok) { setLoad(false); return setErr(r.error); }
      window.VtStore.updateProfile({ crmv: f.crmv || '', crmvUF: f.crmvuf || 'SP', phone: f.phone || '', specialty: f.specialty || 'Odontologia Veterinária' });
      window.VtStore.migrate();
      setLoad(false);
      onAuthed(r.user);
    }, 600);
  };

  const doSendReset = () => {
    const r = window.VtStore.requestReset(resetState?.email || f.email || '');
    if (!r.ok) return setErr(r.error);
    setRS({ email: r.email, sentCode: r.code });
    window.vtToast && window.vtToast(`Código (simulado): ${r.code}`, 'ok');
  };
  const doConfirmReset = () => {
    const r = window.VtStore.confirmReset(resetState.email, f.resetCode || '', f.newPw || '');
    if (!r.ok) return setErr(r.error);
    window.vtToast && window.vtToast('Senha redefinida! Faça login.', 'ok');
    setMode('login'); setRS(null); setF({}); setErr('');
  };

  vtUseEffect(() => {
    const saved = localStorage.getItem('vt-remember');
    if (saved) setF((p) => ({ ...p, email: saved, remember: true }));
  }, []);

  const onKey = (e) => { if (e.key === 'Enter' && mode === 'login') doLogin(); };

  /* ── ícones das features ── */
  const featureIcons = [
    { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/></svg>, text: 'Odontograma equino, canino e felino' },
    { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>, text: 'VetIA Pro — diagnóstico e secretaria' },
    { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, text: 'Agenda, prontuário e estoque' },
    { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 9.81a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>, text: 'WhatsApp com tutores integrado' },
    { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, text: 'Dados sincronizados na nuvem' },
  ];

  /* ──────────────────── PAINEL ESQUERDO ──────────────────── */
  const ArtPanel = () => (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(150deg, #071828 0%, #0c2a40 40%, #0a3040 70%, #08252f 100%)', color: '#fff', padding: '48px 52px', display: 'flex', flexDirection: 'column' }}>

      {/* padrão de pontos */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }}>
        <defs><pattern id="dots2" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="#14a8a0"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#dots2)"/>
      </svg>

      {/* glow blobs */}
      <div style={{ position: 'absolute', top: -160, right: -160, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,168,160,.18) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -100, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,168,160,.12) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, position: 'relative', zIndex: 1 }}>
        <VtLogoMark />
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fff' }}>VETTOOTH <span style={{ color: 'var(--teal)' }}>PRO</span></span>
      </div>

      {/* conteúdo central */}
      <div style={{ margin: 'auto 0', position: 'relative', zIndex: 1 }}>

        {/* badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(20,168,160,.15)', border: '1px solid rgba(20,168,160,.3)', borderRadius: 99, padding: '5px 14px', marginBottom: 24 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#14a8a0', boxShadow: '0 0 0 3px rgba(20,168,160,.3)', display: 'inline-block' }}></span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#4dd9d3', letterSpacing: 1, textTransform: 'uppercase' }}>Dentalis Vet · Sistema Oficial</span>
        </div>

        {/* headline */}
        <h2 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15, letterSpacing: -.02, margin: '0 0 16px', color: '#fff', maxWidth: 360 }}>
          O copiloto que a odontologia veterinária merecia.
        </h2>
        <p style={{ color: '#7a9ab3', fontSize: 14.5, lineHeight: 1.75, margin: '0 0 32px', maxWidth: 360 }}>
          Do odontograma ao financeiro, da IA clínica ao WhatsApp com tutores — tudo num só sistema.
        </p>

        {/* lista de features */}
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {featureIcons.map((item, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <span style={{ width: 34, height: 34, background: 'rgba(20,168,160,.12)', border: '1px solid rgba(20,168,160,.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#14a8a0', flexShrink: 0 }}>
                {item.svg}
              </span>
              <span style={{ fontSize: 14, color: '#a8c4d6', fontWeight: 500 }}>{item.text}</span>
            </li>
          ))}
        </ul>

        {/* stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { n: '3', label: 'espécies' },
            { n: '16', label: 'módulos' },
            { n: '∞', label: 'possibilidades' },
          ].map((stat) => (
            <div key={stat.label} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '16px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{stat.n}</div>
              <div style={{ fontSize: 11, color: '#5e8099', marginTop: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#2d4a5e', position: 'relative', zIndex: 1 }}>Dentalis Vet · VetTooth Pro · 2026</div>
    </div>
  );

  /* ── wrapper do card ── */
  const CardWrap = ({ children }) => (
    <div style={{ display: 'grid', placeItems: 'center', padding: '32px 24px', background: '#f0f4f9', minHeight: '100%' }}>
      <div style={{ width: '100%', maxWidth: 408, background: '#fff', borderRadius: 24, boxShadow: '0 2px 4px rgba(14,44,77,.04), 0 8px 24px rgba(14,44,77,.07), 0 24px 64px rgba(14,44,77,.09)', padding: '36px 36px 32px', border: '1px solid rgba(14,44,77,.07)' }}>
        {children}
      </div>
    </div>
  );

  /* ── cabeçalho do card (logo) ── */
  const CardLogo = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: 'center', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid #f1f4f8' }}>
      <VtLogoMark size={26} />
      <span style={{ fontWeight: 900, fontSize: 14, color: 'var(--navy)', letterSpacing: 1.2, textTransform: 'uppercase' }}>VETTOOTH <span style={{ color: 'var(--teal)' }}>PRO</span></span>
    </div>
  );

  /* ── tabs ── */
  const AuthTabs = ({ active, onLogin, onSignup }) => (
    <div style={{ display: 'flex', background: '#f3f6fb', borderRadius: 13, padding: 4, gap: 3, marginBottom: 26 }}>
      <button onClick={onLogin} style={{ flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 14, color: active === 'login' ? 'var(--navy)' : '#94a3b8', background: active === 'login' ? '#fff' : 'transparent', boxShadow: active === 'login' ? '0 1px 3px rgba(14,44,77,.1), 0 4px 12px rgba(14,44,77,.06)' : 'none', transition: 'all .15s', border: 'none', cursor: 'pointer' }}>Entrar</button>
      <button onClick={onSignup} style={{ flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 14, color: active === 'signup' ? 'var(--navy)' : '#94a3b8', background: active === 'signup' ? '#fff' : 'transparent', boxShadow: active === 'signup' ? '0 1px 3px rgba(14,44,77,.1), 0 4px 12px rgba(14,44,77,.06)' : 'none', transition: 'all .15s', border: 'none', cursor: 'pointer' }}>Criar conta</button>
    </div>
  );

  /* ── botão principal ── */
  const SubmitBtn = ({ onClick, disabled, children }) => (
    <button onClick={onClick} disabled={disabled}
      style={{ width: '100%', background: disabled ? '#94a3b8' : 'linear-gradient(135deg, #17c4bb 0%, #0f8f88 100%)', color: '#fff', fontWeight: 800, fontSize: 15, padding: '14px', borderRadius: 12, marginTop: 6, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', boxShadow: disabled ? 'none' : '0 4px 16px rgba(15,143,136,.3)', transition: 'transform .12s, box-shadow .12s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: .2 }}
      onMouseEnter={(e) => { if (!disabled) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 22px rgba(15,143,136,.4)'; }}}
      onMouseLeave={(e) => { e.target.style.transform = ''; e.target.style.boxShadow = disabled ? 'none' : '0 4px 16px rgba(15,143,136,.3)'; }}
    >
      {children}
    </button>
  );

  /* ── mensagem de erro ── */
  const ErrMsg = ({ msg }) => !msg ? null : (
    <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {msg}
    </div>
  );

  /* ──────────────────── TELA DE LOGIN ──────────────────── */
  if (mode === 'login') return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', height: '100%' }}>
      <ArtPanel />
      <CardWrap>
        <CardLogo />
        <AuthTabs active="login"
          onLogin={() => {}}
          onSignup={() => { setMode('signup'); setErr(''); setStep(1); }}
        />

        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', margin: '0 0 4px', letterSpacing: -.02 }}>Bem-vindo de volta</h1>
          <p style={{ color: '#94a3b8', fontSize: 13.5, margin: 0 }}>Acesse o painel da sua clínica</p>
        </div>

        <AFIcon label="Email profissional" icon={<IcMail />} type="email" value={f.email || ''} onChange={s('email')} placeholder="seu@email.com" required />

        <AFIcon label="Senha" icon={<IcLock />} type={showPw ? 'text' : 'password'} value={f.password || ''} onChange={s('password')} placeholder="••••••••" required
          right={
            <button type="button" onClick={() => setShowPw(!showPw)}
              style={{ position: 'absolute', right: 12, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}>
              <IcEye open={showPw} />
            </button>
          }
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '-2px 0 20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={!!f.remember} onChange={(e) => s('remember')(e.target.checked)} style={{ accentColor: 'var(--teal)', width: 15, height: 15 }} />
            Lembrar-me
          </label>
          <button type="button" onClick={() => { setMode('reset'); setRS({ email: f.email || '' }); setErr(''); }}
            style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-d)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Esqueci a senha
          </button>
        </div>

        <ErrMsg msg={err} />

        <SubmitBtn onClick={doLogin} disabled={loading}>
          {loading
            ? <><span className="vt-spin" /> Entrando...</>
            : <><span>Entrar no painel</span><IcArrow /></>
          }
        </SubmitBtn>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: '#94a3b8' }}>
          Novo aqui?{' '}
          <button onClick={() => { setMode('signup'); setErr(''); setStep(1); }}
            style={{ color: 'var(--teal-d)', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Crie sua conta grátis
          </button>
        </div>
      </CardWrap>
    </div>
  );

  /* ──────────────────── TELA DE RESET ──────────────────── */
  if (mode === 'reset') return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', height: '100%' }}>
      <ArtPanel />
      <CardWrap>
        <CardLogo />
        <button type="button" onClick={() => { setMode('login'); setErr(''); }}
          style={{ border: 'none', background: 'none', color: 'var(--teal-d)', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 18, padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Voltar ao login
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', margin: '0 0 4px' }}>Recuperar senha</h1>

        {!resetState?.sentCode ? (
          <>
            <p style={{ color: '#94a3b8', fontSize: 13.5, margin: '0 0 22px' }}>Informe seu email para receber o código de redefinição.</p>
            <AFIcon label="Email da conta" icon={<IcMail />} type="email" value={resetState?.email || ''} onChange={(v) => setRS((r) => ({ ...r, email: v }))} placeholder="seu@email.com" required />
            <ErrMsg msg={err} />
            <SubmitBtn onClick={doSendReset}>Enviar código</SubmitBtn>
          </>
        ) : (
          <>
            <div style={{ background: '#f0fdf9', border: '1px dashed var(--teal)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--teal-d)', marginBottom: 16 }}>
              Código (simulado): <b style={{ fontSize: 18, letterSpacing: 3 }}>{resetState.sentCode}</b>
            </div>
            <AF label="Código recebido" value={f.resetCode || ''} onChange={s('resetCode')} placeholder="000000" required />
            <AFIcon label="Nova senha" icon={<IcLock />} type={showPw ? 'text' : 'password'} value={f.newPw || ''} onChange={s('newPw')} placeholder="Mínimo 6 caracteres" required
              right={
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}>
                  <IcEye open={showPw} />
                </button>
              }
            />
            <PwBar pw={f.newPw} />
            <ErrMsg msg={err} />
            <SubmitBtn onClick={doConfirmReset}>Redefinir senha</SubmitBtn>
          </>
        )}
      </CardWrap>
    </div>
  );

  /* ──────────────────── TELA DE CADASTRO ──────────────────── */
  const specialties = ['Odontologia Veterinária', 'Clínica Geral', 'Cirurgia', 'Diagnóstico por Imagem', 'Oncologia', 'Cardiologia', 'Outro'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', height: '100%' }}>
      <ArtPanel />
      <CardWrap>
        <CardLogo />
        <AuthTabs active="signup"
          onLogin={() => { setMode('login'); setErr(''); }}
          onSignup={() => {}}
        />

        {/* step indicator */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 22 }}>
          {[1, 2].map((n) => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 99, background: step >= n ? 'var(--teal)' : '#e2e8f0', transition: 'background .3s' }} />
          ))}
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)', margin: '0 0 3px', letterSpacing: -.01 }}>
          {step === 1 ? 'Crie sua conta' : 'Dados profissionais'}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 20px' }}>
          {step === 1 ? 'Passo 1 de 2 — Informações básicas' : 'Passo 2 de 2 — Perfil veterinário'}
        </p>

        {step === 1 && (
          <>
            <AF label="Nome completo" value={f.name || ''} onChange={s('name')} placeholder="Dr(a). Nome Sobrenome" required />
            <AF label="Nome da clínica" value={f.clinic || ''} onChange={s('clinic')} placeholder="Nome da sua clínica" />
            <AFIcon label="Email profissional" icon={<IcMail />} type="email" value={f.email || ''} onChange={s('email')} placeholder="seu@email.com" required />
            <AF label="WhatsApp / Celular" type="tel" value={f.phone || ''} onChange={s('phone')} placeholder="(11) 99999-9999" />
            <AFIcon label="Senha" icon={<IcLock />} type={showPw ? 'text' : 'password'} value={f.password || ''} onChange={s('password')} placeholder="Mínimo 6 caracteres" required
              right={
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}>
                  <IcEye open={showPw} />
                </button>
              }
            />
            <PwBar pw={f.password} />
            <ErrMsg msg={err} />
            <SubmitBtn onClick={() => {
              if (!f.name || !f.email || !f.password) return setErr('Preencha nome, email e senha.');
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setErr('Email inválido.');
              if (pwStrength(f.password) < 2) return setErr('Use uma senha mais forte.');
              setErr(''); setStep(2);
            }}>
              <span>Próximo</span>
              <IcArrow />
            </SubmitBtn>
            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13.5, color: '#94a3b8' }}>
              Já tem conta?{' '}
              <button onClick={() => { setMode('login'); setErr(''); }} style={{ color: 'var(--teal-d)', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Entrar</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#374151' }}>Especialidade</span>
              <select value={f.specialty || 'Odontologia Veterinária'} onChange={(e) => s('specialty')(e.target.value)}
                style={{ padding: '12px 13px', borderRadius: 10, border: '1.5px solid #dde3ed', fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#111827', outline: 'none' }}>
                {specialties.map((sp) => <option key={sp} value={sp}>{sp}</option>)}
              </select>
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 2 }}><AF label="CRMV" value={f.crmv || ''} onChange={s('crmv')} placeholder="12345" /></div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#374151' }}>UF</span>
                  <select value={f.crmvuf || 'SP'} onChange={(e) => s('crmvuf')(e.target.value)}
                    style={{ padding: '12px 10px', borderRadius: 10, border: '1.5px solid #dde3ed', fontSize: 14, fontFamily: 'inherit', background: '#fff', outline: 'none' }}>
                    {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map((uf) => <option key={uf}>{uf}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <label style={{ margin: '0 0 12px', display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!f.demo} onChange={(e) => s('demo')(e.target.checked)} style={{ accentColor: 'var(--teal)', marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Iniciar com <b style={{ color: '#111827' }}>dados de demonstração</b>
              </span>
            </label>

            <label style={{ margin: '0 0 18px', display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!f.acceptTerms} onChange={(e) => s('acceptTerms')(e.target.checked)} style={{ accentColor: 'var(--teal)', marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Li e aceito os <b style={{ color: 'var(--teal-d)' }}>Termos de Uso</b> e a <b style={{ color: 'var(--teal-d)' }}>Política de Privacidade</b>
              </span>
            </label>

            <ErrMsg msg={err} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setStep(1); setErr(''); }}
                style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#64748b' }}>
                ← Voltar
              </button>
              <SubmitBtn onClick={doSignup} disabled={loading}>
                {loading
                  ? <><span className="vt-spin" /> Criando...</>
                  : <><IcCheck /><span>Criar conta</span></>
                }
              </SubmitBtn>
            </div>
          </>
        )}
      </CardWrap>
    </div>
  );
}

Object.assign(window, { AuthScreen });
