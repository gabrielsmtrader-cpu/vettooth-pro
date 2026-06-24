/* ============================================================
   VetTooth Pro — telas de Login e Cadastro
   ============================================================ */
function AuthScreen({ onAuthed }) {
  const [mode, setMode] = vtUseState('login');
  const [f, setF] = vtUseState({});
  const [err, setErr] = vtUseState('');
  const [show, setShow] = vtUseState(false);
  const [reset, setReset] = vtUseState(null); // null | {step:'email'|'code', email, code}
  const s = (k) => (v) => { setF((p) => ({ ...p, [k]: v })); setErr(''); };
  const [rf, setRf] = vtUseState({});
  const rs = (k) => (v) => { setRf((p) => ({ ...p, [k]: v })); setErr(''); };

  const submit = () => {
    if (mode === 'login') {
      const r = window.VtStore.login({ email: f.email, password: f.password });
      if (!r.ok) return setErr(r.error);
      onAuthed(r.user);
    } else {
      const r = window.VtStore.register({ name: f.name, clinic: f.clinic, email: f.email, password: f.password, demo: !!f.demo });
      if (!r.ok) return setErr(r.error);
      window.VtStore.migrate();
      onAuthed(r.user);
    }
  };
  const onKey = (e) => { if (e.key === 'Enter') submit(); };

  const sendReset = () => {
    const r = window.VtStore.requestReset(rf.email || f.email || '');
    if (!r.ok) return setErr(r.error);
    // sem servidor real: mostramos o código na própria tela (simula o email)
    setReset({ step: 'code', email: r.email });
    window.vtToast(`Código enviado para ${r.email}: ${r.code}`, 'ok');
    setRf((p) => ({ ...p, email: r.email, sentCode: r.code }));
  };
  const doConfirmReset = () => {
    const r = window.VtStore.confirmReset(reset.email, rf.code || '', rf.nova || '');
    if (!r.ok) return setErr(r.error);
    window.vtToast('Senha redefinida! Faça login.', 'ok');
    setReset(null); setRf({}); setMode('login'); setErr('');
  };

  return (
    <div className="vt-auth">
      <div className="vt-auth-art">
        <div className="vt-auth-brand">
          <VtLogoMark />
          <div className="vt-logo-text" style={{ color: '#fff' }}>VETTOOTH <span style={{ color: 'var(--teal)' }}>PRO</span></div>
        </div>
        <h2 className="vt-auth-tag">Odontologia veterinária<br />premium, num só lugar.</h2>
        <ul className="vt-auth-list">
          <li><span>🦷</span> Odontograma equino, canino e felino</li>
          <li><span>📋</span> Prontuário, agenda e financeiro</li>
          <li><span>🤖</span> Copiloto de IA clínica e administrativa</li>
          <li><span>🔒</span> Seus dados salvos com segurança</li>
        </ul>
        <div className="vt-auth-foot">Dentalis Vet · VetTooth Pro</div>
      </div>

      <div className="vt-auth-form-wrap">
        <div className="vt-auth-card">
          {reset ? (
            <div>
              <h1 className="vt-auth-title">Recuperar senha</h1>
              <p className="vt-auth-sub">{reset.step === 'email' ? 'Informe seu email para enviarmos um código de redefinição.' : `Enviamos um código para ${reset.email}. Digite-o abaixo e escolha a nova senha.`}</p>
              {reset.step === 'email' ? (
                <>
                  <VtEmailField label="Email da conta" value={rf.email} onChange={rs('email')} required />
                  {err && <div className="vt-auth-err">{err}</div>}
                  <button className="vt-auth-submit" onClick={sendReset}>Enviar código</button>
                </>
              ) : (
                <>
                  {rf.sentCode && <div className="vt-auth-codebox">Código (simulado p/ este navegador): <b>{rf.sentCode}</b></div>}
                  <VtField label="Código recebido" value={rf.code} onChange={rs('code')} placeholder="000000" required />
                  <label className="vtf">
                    <span className="vtf-label">Nova senha<i className="vtf-req">*</i></span>
                    <span className="vtf-inputwrap"><input className="vtf-input" type={show ? 'text' : 'password'} value={rf.nova || ''} placeholder="Mínimo 6 caracteres" onChange={(e) => rs('nova')(e.target.value)} /><button type="button" className="vtf-eye" onClick={() => setShow(!show)}>{show ? '🙈' : '👁'}</button></span>
                  </label>
                  {err && <div className="vt-auth-err">{err}</div>}
                  <button className="vt-auth-submit" onClick={doConfirmReset}>Redefinir senha</button>
                </>
              )}
              <div className="vt-auth-switch"><button onClick={() => { setReset(null); setErr(''); }}>← Voltar ao login</button></div>
            </div>
          ) : (
          <React.Fragment>
          <div className="vt-auth-tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setErr(''); }}>Entrar</button>
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setErr(''); }}>Criar conta</button>
          </div>

          <h1 className="vt-auth-title">{mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}</h1>
          <p className="vt-auth-sub">{mode === 'login' ? 'Acesse o painel da sua clínica.' : 'Comece a usar o VetTooth Pro agora.'}</p>

          {mode === 'signup' && (
            <>
              <VtField label="Seu nome" value={f.name} onChange={s('name')} placeholder="Dra. Sofia Silva" required />
              <VtField label="Nome da clínica" value={f.clinic} onChange={s('clinic')} placeholder="Dentalis Vet" />
            </>
          )}
          <VtEmailField label="Email" value={f.email} onChange={s('email')} required />
          {mode === 'signup' && (
            <label className="vt-check-inline" style={{ margin: '4px 0 10px' }}>
              <input type="checkbox" checked={!!f.demo} onChange={(e) => s('demo')(e.target.checked)} /> Começar com dados de demonstração (senão, workspace vazio)
            </label>
          )}
          <label className="vtf">
            <span className="vtf-label">Senha<i className="vtf-req">*</i></span>
            <span className="vtf-inputwrap">
              <input className="vtf-input" type={show ? 'text' : 'password'} value={f.password || ''}
                placeholder="Mínimo 6 caracteres" onChange={(e) => s('password')(e.target.value)} onKeyDown={onKey} />
              <button type="button" className="vtf-eye" onClick={() => setShow(!show)}>{show ? '🙈' : '👁'}</button>
            </span>
          </label>

          {err && <div className="vt-auth-err">{err}</div>}

          {mode === 'login' && !reset && <button type="button" className="vt-auth-forgot" onClick={() => { setReset({ step: 'email', email: f.email || '' }); setRf({ email: f.email || '' }); setErr(''); }}>Esqueci minha senha</button>}

          <button className="vt-auth-submit" onClick={submit}>
            {mode === 'login' ? 'Entrar' : 'Criar conta e entrar'}
          </button>

          <div className="vt-auth-switch">
            {mode === 'login'
              ? <span>Não tem conta? <button onClick={() => { setMode('signup'); setErr(''); }}>Cadastre-se</button></span>
              : <span>Já tem conta? <button onClick={() => { setMode('login'); setErr(''); }}>Entrar</button></span>}
          </div>
          {mode === 'login' && <div className="vt-auth-demo">Dica: crie uma conta — os dados ficam salvos neste navegador.</div>}
          </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AuthScreen });
