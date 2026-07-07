/* ============================================================
   VetTooth Pro — Auth v2 (Login + Cadastro)
   Design premium, CRMV, força da senha, WhatsApp tutor
   Branch: gabriel
   ============================================================ */

/* força da senha */
function pwStrength(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s; // 0-5
}
function PwBar({ pw }) {
  const s = pwStrength(pw);
  const color = s <= 1 ? '#ef4444' : s <= 2 ? '#f97316' : s <= 3 ? '#eab308' : '#22c55e';
  const label = ['', 'Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'][s] || '';
  if (!pw) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 4, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
        <div style={{ width: `${(s / 5) * 100}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .3s, background .3s' }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2, display: 'block' }}>{label}</span>
    </div>
  );
}

/* campo genérico */
function AF({ label, type = 'text', value = '', onChange, placeholder, required, children }) {
  return (
    <label className="vtf" style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
      <span className="vtf-label" style={{ fontSize: 13, fontWeight: 700 }}>
        {label}{required && <i className="vtf-req" style={{ color: 'var(--teal)', marginLeft: 2, fontStyle: 'normal' }}>*</i>}
      </span>
      <input
        className="vtf-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 14, fontFamily: 'inherit', background: '#fff', transition: 'border .15s' }}
        onFocus={(e) => e.target.style.borderColor = 'var(--teal)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
      />
      {children}
    </label>
  );
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode]     = vtUseState('login'); // 'login' | 'signup' | 'reset'
  const [step, setStep]     = vtUseState(1);        // signup steps
  const [f, setF]           = vtUseState({});
  const [err, setErr]       = vtUseState('');
  const [loading, setLoad]  = vtUseState(false);
  const [showPw, setShowPw] = vtUseState(false);
  const [resetState, setRS] = vtUseState(null); // {email, code?, sentCode?}

  const s = (k) => (v) => { setF((p) => ({ ...p, [k]: v })); setErr(''); };

  /* ── SUBMIT LOGIN ── */
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

  /* ── SUBMIT CADASTRO ── */
  const doSignup = () => {
    if (!f.name || !f.email || !f.password) return setErr('Preencha todos os campos obrigatórios.');
    if (f.password !== f.password2 && f.password2) return setErr('As senhas não conferem.');
    if (!f.acceptTerms) return setErr('Aceite os termos de uso para continuar.');
    setLoad(true);
    setTimeout(() => {
      const r = window.VtStore.register({
        name: f.name, clinic: f.clinic, email: f.email,
        password: f.password, demo: !!f.demo,
      });
      if (!r.ok) { setLoad(false); return setErr(r.error); }
      /* salvar campos extras no perfil */
      window.VtStore.updateProfile({ crmv: f.crmv || '', crmvUF: f.crmvuf || 'SP', phone: f.phone || '', specialty: f.specialty || 'Odontologia Veterinária' });
      window.VtStore.migrate();
      setLoad(false);
      onAuthed(r.user);
    }, 600);
  };

  /* ── RESET DE SENHA ── */
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

  /* ── AUTO-FILL remember ── */
  vtUseEffect(() => {
    const saved = localStorage.getItem('vt-remember');
    if (saved) setF((p) => ({ ...p, email: saved, remember: true }));
  }, []);

  const onKey = (e) => { if (e.key === 'Enter') mode === 'login' ? doLogin() : null; };

  /* ──────────────────── PAINEL ESQUERDO ──────────────────── */
  const ArtPanel = () => (
    <div className="vt-auth-art" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* padrão de pontos */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
        <defs><pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="#14a8a0"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#dots)"/>
      </svg>
      {/* glow blob top-right */}
      <div style={{ position: 'absolute', top: -120, right: -120, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,168,160,.22) 0%, transparent 70%)', pointerEvents: 'none' }} />
      {/* glow blob bottom-left */}
      <div style={{ position: 'absolute', bottom: -80, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,168,160,.14) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* logo */}
      <div className="vt-auth-brand">
        <VtLogoMark />
        <div className="vt-logo-text" style={{ color: '#fff' }}>VETTOOTH <span style={{ color: 'var(--teal)' }}>PRO</span></div>
      </div>

      {/* headline + lista */}
      <div style={{ margin: 'auto 0', paddingBottom: 8, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-block', background: 'rgba(20,168,160,.18)', border: '1px solid rgba(20,168,160,.35)', borderRadius: 99, padding: '5px 14px', fontSize: 12.5, fontWeight: 700, color: '#5df0e8', letterSpacing: .5, marginBottom: 18, textTransform: 'uppercase' }}>
          Dentalis Vet · Sistema Oficial
        </div>
        <h2 className="vt-auth-tag" style={{ lineHeight: 1.15, marginBottom: 16 }}>
          O copiloto que a odontologia veterinária merecia.
        </h2>
        <p style={{ color: '#94adbf', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px', maxWidth: 380 }}>
          Do odontograma ao financeiro, da IA clínica ao WhatsApp com tutores — tudo num só sistema.
        </p>

        <ul className="vt-auth-list">
          {[
            { icon: '🦷', text: 'Odontograma equino, canino e felino' },
            { icon: '🤖', text: 'VetIA Pro — diagnóstico, documentos e secretaria' },
            { icon: '📋', text: 'Prontuário, agenda, estoque e financeiro' },
            { icon: '📱', text: 'WhatsApp com tutores integrado' },
            { icon: '🔒', text: 'Dados salvos e sincronizados na nuvem' },
          ].map((item) => (
            <li key={item.text}>
              <span style={{ width: 32, height: 32, background: 'rgba(20,168,160,.15)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>

        {/* stats flutuantes */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          {[
            { n: '3', label: 'espécies' },
            { n: '16', label: 'módulos' },
            { n: '100%', label: 'offline-first' },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 11.5, color: '#7ea3bc', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="vt-auth-foot" style={{ color: '#3d5f78', position: 'relative', zIndex: 1 }}>Dentalis Vet · VetTooth Pro · 2026</div>
    </div>
  );

  /* ──────────────────── TELA DE LOGIN ──────────────────── */
  if (mode === 'login') return (
    <div className="vt-auth">
      <ArtPanel />
      <div className="vt-auth-form-wrap">
        <div className="vt-auth-card">

          {/* logo no topo do card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
            <VtLogoMark size={28} />
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--navy)', letterSpacing: .5 }}>VETTOOTH <span style={{ color: 'var(--teal)' }}>PRO</span></span>
          </div>

          <div className="vt-auth-tabs">
            <button className="active">Entrar</button>
            <button onClick={() => { setMode('signup'); setErr(''); setStep(1); }}>Criar conta</button>
          </div>

          <h1 className="vt-auth-title">Bem-vindo de volta 👋</h1>
          <p className="vt-auth-sub">Acesse o painel da sua clínica.</p>

          {/* Campo email com ícone */}
          <label className="vtf vt-auth-field" style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
            <span className="vtf-label" style={{ fontSize: 13, fontWeight: 700 }}>Email profissional <i style={{ color: 'var(--teal)', fontStyle: 'normal' }}>*</i></span>
            <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 13, fontSize: 15, color: 'var(--muted)', pointerEvents: 'none' }}>✉️</span>
              <input className="vtf-input" type="email" value={f.email || ''} onChange={(e) => s('email')(e.target.value)} placeholder="seu@email.com"
                style={{ flex: 1, padding: '12px 14px 12px 40px', borderRadius: 11, border: '1.5px solid var(--line)', fontSize: 14, fontFamily: 'inherit', transition: 'border .15s, box-shadow .15s' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--teal)'; e.target.style.boxShadow = '0 0 0 3px rgba(20,168,160,.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }}
              />
            </span>
          </label>

          {/* Campo senha com ícone */}
          <label className="vtf vt-auth-field" style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 4 }}>
            <span className="vtf-label" style={{ fontSize: 13, fontWeight: 700 }}>Senha <i style={{ color: 'var(--teal)', fontStyle: 'normal' }}>*</i></span>
            <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 13, fontSize: 15, color: 'var(--muted)', pointerEvents: 'none' }}>🔒</span>
              <input className="vtf-input" type={showPw ? 'text' : 'password'} value={f.password || ''}
                placeholder="••••••••" onChange={(e) => s('password')(e.target.value)} onKeyDown={onKey}
                style={{ flex: 1, padding: '12px 46px 12px 40px', borderRadius: 11, border: '1.5px solid var(--line)', fontSize: 14, fontFamily: 'inherit', transition: 'border .15s, box-shadow .15s' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--teal)'; e.target.style.boxShadow = '0 0 0 3px rgba(20,168,160,.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>{showPw ? '🙈' : '👁️'}</button>
            </span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 18px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!f.remember} onChange={(e) => s('remember')(e.target.checked)} style={{ accentColor: 'var(--teal)', width: 15, height: 15 }} />
              Lembrar-me
            </label>
            <button type="button" className="vt-auth-forgot" onClick={() => { setMode('reset'); setRS({ email: f.email || '' }); setErr(''); }}>Esqueci a senha</button>
          </div>

          {err && <div className="vt-auth-err" style={{ marginBottom: 14 }}>{err}</div>}

          <button className="vt-auth-submit" onClick={doLogin} disabled={loading}>
            {loading
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span className="vt-spin" />Entrando...</span>
              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>Entrar no painel <span style={{ fontSize: 17 }}>→</span></span>
            }
          </button>

          <div className="vt-auth-switch" style={{ marginTop: 22 }}>
            <span>Novo aqui? <button onClick={() => { setMode('signup'); setErr(''); setStep(1); }}>Crie sua conta grátis</button></span>
          </div>
        </div>
      </div>
    </div>
  );

  /* ──────────────────── TELA DE RESET ──────────────────── */
  if (mode === 'reset') return (
    <div className="vt-auth">
      <ArtPanel />
      <div className="vt-auth-form-wrap">
        <div className="vt-auth-card">
          <button type="button" onClick={() => { setMode('login'); setErr(''); }} style={{ border: 'none', background: 'none', color: 'var(--teal-d)', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0 }}>← Voltar ao login</button>
          <h1 className="vt-auth-title">Recuperar senha 🔐</h1>

          {!resetState?.sentCode ? (
            <>
              <p className="vt-auth-sub">Informe seu email para receber o código de redefinição.</p>
              <AF label="Email da conta" type="email" value={resetState?.email || ''} onChange={(v) => setRS((r) => ({ ...r, email: v }))} placeholder="seu@email.com" required />
              {err && <div className="vt-auth-err">{err}</div>}
              <button className="vt-auth-submit" onClick={doSendReset}>Enviar código</button>
            </>
          ) : (
            <>
              <div className="vt-auth-codebox" style={{ marginBottom: 16 }}>
                Código (simulado para este demo): <b style={{ fontSize: 20, letterSpacing: 4 }}>{resetState.sentCode}</b>
              </div>
              <AF label="Código recebido" value={f.resetCode || ''} onChange={s('resetCode')} placeholder="000000" required />
              <label className="vtf" style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                <span className="vtf-label" style={{ fontSize: 13, fontWeight: 700 }}>Nova senha<i className="vtf-req" style={{ color: 'var(--teal)', marginLeft: 2, fontStyle: 'normal' }}>*</i></span>
                <span style={{ position: 'relative', display: 'flex' }}>
                  <input type={showPw ? 'text' : 'password'} value={f.newPw || ''} onChange={(e) => s('newPw')(e.target.value)} placeholder="Mínimo 6 caracteres"
                    style={{ flex: 1, padding: '11px 46px 11px 14px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 14, fontFamily: 'inherit' }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', fontSize: 16, cursor: 'pointer' }}>{showPw ? '🙈' : '👁️'}</button>
                </span>
                <PwBar pw={f.newPw} />
              </label>
              {err && <div className="vt-auth-err">{err}</div>}
              <button className="vt-auth-submit" onClick={doConfirmReset}>Redefinir senha</button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  /* ──────────────────── TELA DE CADASTRO (2 etapas) ──────────────────── */
  const specialties = ['Odontologia Veterinária', 'Clínica Geral', 'Cirurgia', 'Diagnóstico por Imagem', 'Oncologia', 'Cardiologia', 'Outro'];

  return (
    <div className="vt-auth">
      <ArtPanel />
      <div className="vt-auth-form-wrap">
        <div className="vt-auth-card" style={{ maxWidth: 440 }}>
          <div className="vt-auth-tabs">
            <button onClick={() => { setMode('login'); setErr(''); }}>Entrar</button>
            <button className="active">Criar conta</button>
          </div>

          {/* steps indicator */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[1, 2].map((n) => (
              <div key={n} style={{ flex: 1, height: 4, borderRadius: 99, background: step >= n ? 'var(--teal)' : 'var(--line)', transition: 'background .3s' }} />
            ))}
          </div>

          <h1 className="vt-auth-title" style={{ fontSize: 20 }}>
            {step === 1 ? 'Crie sua conta 🐾' : 'Dados profissionais 🦷'}
          </h1>
          <p className="vt-auth-sub" style={{ marginBottom: 20 }}>
            {step === 1 ? 'Passo 1 de 2 — Informações básicas' : 'Passo 2 de 2 — Perfil veterinário'}
          </p>

          {step === 1 && (
            <>
              <AF label="Nome completo" value={f.name || ''} onChange={s('name')} placeholder="Dr(a). Nome Sobrenome" required />
              <AF label="Nome da clínica" value={f.clinic || ''} onChange={s('clinic')} placeholder="Nome da sua clínica" />
              <AF label="Email profissional" type="email" value={f.email || ''} onChange={s('email')} placeholder="seu@email.com" required />
              <AF label="WhatsApp / Celular" type="tel" value={f.phone || ''} onChange={s('phone')} placeholder="(11) 99999-9999" />

              <label className="vtf" style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 4 }}>
                <span className="vtf-label" style={{ fontSize: 13, fontWeight: 700 }}>Senha<i className="vtf-req" style={{ color: 'var(--teal)', marginLeft: 2, fontStyle: 'normal' }}>*</i></span>
                <span style={{ position: 'relative', display: 'flex' }}>
                  <input type={showPw ? 'text' : 'password'} value={f.password || ''} onChange={(e) => s('password')(e.target.value)} placeholder="Mínimo 6 caracteres"
                    style={{ flex: 1, padding: '11px 46px 11px 14px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 14, fontFamily: 'inherit' }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', fontSize: 16, cursor: 'pointer' }}>{showPw ? '🙈' : '👁️'}</button>
                </span>
                <PwBar pw={f.password} />
              </label>

              {err && <div className="vt-auth-err" style={{ marginBottom: 12 }}>{err}</div>}

              <button className="vt-auth-submit" style={{ marginTop: 16 }} onClick={() => {
                if (!f.name || !f.email || !f.password) return setErr('Preencha nome, email e senha.');
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setErr('Email inválido.');
                if (pwStrength(f.password) < 2) return setErr('Use uma senha mais forte (mín. 6 caracteres com letras e números).');
                setErr(''); setStep(2);
              }}>Próximo →</button>

              <div className="vt-auth-switch" style={{ marginTop: 16 }}>
                <span>Já tem conta? <button onClick={() => { setMode('login'); setErr(''); }}>Entrar</button></span>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <label className="vtf" style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                <span className="vtf-label" style={{ fontSize: 13, fontWeight: 700 }}>Especialidade</span>
                <select value={f.specialty || 'Odontologia Veterinária'} onChange={(e) => s('specialty')(e.target.value)}
                  style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 14, fontFamily: 'inherit', background: '#fff' }}>
                  {specialties.map((sp) => <option key={sp} value={sp}>{sp}</option>)}
                </select>
              </label>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 2 }}>
                  <AF label="CRMV" value={f.crmv || ''} onChange={s('crmv')} placeholder="12345" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="vtf" style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                    <span className="vtf-label" style={{ fontSize: 13, fontWeight: 700 }}>UF</span>
                    <select value={f.crmvuf || 'SP'} onChange={(e) => s('crmvuf')(e.target.value)}
                      style={{ padding: '11px 10px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 14, fontFamily: 'inherit', background: '#fff' }}>
                      {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map((uf) => <option key={uf}>{uf}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              <label className="vt-check-inline" style={{ margin: '0 0 12px', display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!f.demo} onChange={(e) => s('demo')(e.target.checked)} style={{ accentColor: 'var(--teal)', marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                  Iniciar com <b style={{ color: 'var(--ink)' }}>dados de demonstração</b> (pacientes, agenda e financeiro de exemplo para explorar o sistema)
                </span>
              </label>

              <label className="vt-check-inline" style={{ margin: '0 0 16px', display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!f.acceptTerms} onChange={(e) => s('acceptTerms')(e.target.checked)} style={{ accentColor: 'var(--teal)', marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                  Li e aceito os <b style={{ color: 'var(--teal-d)' }}>Termos de Uso</b> e a <b style={{ color: 'var(--teal-d)' }}>Política de Privacidade</b>
                </span>
              </label>

              {err && <div className="vt-auth-err" style={{ marginBottom: 12 }}>{err}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setStep(1); setErr(''); }} style={{ flex: 1, padding: '13px', borderRadius: 11, border: '1.5px solid var(--line)', background: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'var(--muted)' }}>← Voltar</button>
                <button className="vt-auth-submit" style={{ flex: 2, margin: 0 }} onClick={doSignup} disabled={loading}>
                  {loading ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span className="vt-spin" />Criando conta...</span> : '✓ Criar conta e entrar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AuthScreen });
