/* ============================================================
   VetTooth Pro — Auth + "banco de dados" local (localStorage)
   Persiste usuários e os dados do app por usuário.
   Exposto em window.VtStore
   ============================================================ */
window.VtStore = (function () {
  const DB_KEY = 'vettooth:db:v1';
  const SESSION_KEY = 'vettooth:session';

  function loadDB() {
    try { return JSON.parse(localStorage.getItem(DB_KEY)) || { users: {}, data: {} }; }
    catch (e) { return { users: {}, data: {} }; }
  }
  function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

  // hash simples (não-criptográfico, suficiente p/ protótipo)
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16);
  }

  const norm = (email) => (email || '').trim().toLowerCase();

  function hasRemoteDB() {
    return !!(window.vtDB && window.vtDB.from);
  }

  function waitRemoteDB(timeoutMs = 2500) {
    if (hasRemoteDB()) return Promise.resolve(true);
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        document.removeEventListener('vtDBReady', onReady);
        resolve(ok);
      };
      const onReady = () => finish(true);
      document.addEventListener('vtDBReady', onReady);
      setTimeout(() => finish(hasRemoteDB()), timeoutMs);
    });
  }

  async function remoteGetUser(email) {
    if (!hasRemoteDB()) return null;
    const { data, error } = await window.vtDB
      .from('usuarios_app')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  function remoteToLocalUser(u) {
    if (!u) return null;
    return {
      name: u.name || '',
      clinic: u.clinic || '',
      email: u.email,
      pass: u.pass_hash || '',
      perms: Array.isArray(u.perms) ? u.perms : ['Administrador'],
      avatar: u.avatar || '',
      crmv: u.crmv || '',
      crmvUF: u.crmv_uf || '',
      phone: u.phone || '',
      specialty: u.specialty || '',
      createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now(),
      resetCode: u.reset_code || undefined,
      resetAt: u.reset_at ? new Date(u.reset_at).getTime() : undefined,
    };
  }

  function isDuplicateUserError(error) {
    const msg = (error && (error.message || error.details || String(error))) || '';
    return error && (error.code === '23505' || /duplicate key value|usuarios_app_pkey/i.test(msg));
  }

  async function remoteCreateUser(u, opts) {
    if (!hasRemoteDB()) return;
    const { error } = await window.vtDB.from('usuarios_app').upsert({
      email: u.email,
      name: u.name,
      clinic: u.clinic || '',
      pass_hash: u.pass,
      perms: u.perms || ['Administrador'],
      avatar: u.avatar || '',
      crmv: u.crmv || '',
      crmv_uf: u.crmvUF || '',
      phone: u.phone || '',
      specialty: u.specialty || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });
    if (error && opts && opts.ignoreDuplicate && isDuplicateUserError(error)) return;
    if (error) throw error;
  }

  async function remoteUpdateUser(email, patch) {
    if (!hasRemoteDB()) return;
    const out = {};
    if ('name' in patch) out.name = patch.name;
    if ('clinic' in patch) out.clinic = patch.clinic;
    if ('pass' in patch) out.pass_hash = patch.pass;
    if ('perms' in patch) out.perms = patch.perms;
    if ('avatar' in patch) out.avatar = patch.avatar;
    if ('crmv' in patch) out.crmv = patch.crmv;
    if ('crmvUF' in patch) out.crmv_uf = patch.crmvUF;
    if ('phone' in patch) out.phone = patch.phone;
    if ('specialty' in patch) out.specialty = patch.specialty;
    if ('resetCode' in patch) out.reset_code = patch.resetCode || null;
    if ('resetAt' in patch) out.reset_at = patch.resetAt ? new Date(patch.resetAt).toISOString() : null;
    out.updated_at = new Date().toISOString();
    const { error } = await window.vtDB.from('usuarios_app').update(out).eq('email', email);
    if (error) throw error;
  }

  async function register({ name, clinic, email, password, demo }) {
    const db = loadDB();
    const key = norm(email);
    if (!name || !email || !password) return { ok: false, error: 'Preencha todos os campos.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return { ok: false, error: 'Email inválido.' };
    if (password.length < 6) return { ok: false, error: 'A senha deve ter ao menos 6 caracteres.' };
    await waitRemoteDB();
    try {
      const remote = await remoteGetUser(key);
      if (remote) return { ok: false, error: 'Este email já possui cadastro.' };
    } catch (e) {
      return { ok: false, error: 'Não foi possível verificar o cadastro no Supabase: ' + e.message };
    }
    if (db.users[key]) return { ok: false, error: 'Este email já possui cadastro neste navegador. Tente entrar ou redefinir a senha.' };
    db.users[key] = { name, clinic: clinic || '', email: key, pass: hash(password), perms: ['Administrador'], createdAt: Date.now() };
    db.data[key] = demo ? seedData() : emptyData();
    saveDB(db);
    setSession(key);
    try {
      await remoteCreateUser(db.users[key]);
      if (hasRemoteDB()) {
        await window.vtDB.from('dados_clinica').upsert({
          email: key,
          payload: db.data[key],
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      delete db.users[key];
      delete db.data[key];
      saveDB(db);
      clearSession();
      return { ok: false, error: 'Cadastro local criado, mas falhou ao salvar no Supabase: ' + e.message };
    }
    return { ok: true, user: publicUser(db.users[key]) };
  }

  async function login({ email, password }) {
    const db = loadDB();
    const key = norm(email);
    let u = db.users[key];
    if (!u) await waitRemoteDB();
    if (!u && hasRemoteDB()) {
      try {
        const remote = await remoteGetUser(key);
        if (remote) {
          u = remoteToLocalUser(remote);
          db.users[key] = u;
          if (!db.data[key]) db.data[key] = emptyData();
          saveDB(db);
        }
      } catch (e) {
        return { ok: false, error: 'Falha ao consultar login no Supabase: ' + e.message };
      }
    }
    await waitRemoteDB();
    if (hasRemoteDB()) {
      try {
        const remote = await remoteGetUser(key);
        if (remote) {
          const remoteUser = remoteToLocalUser(remote);
          if (remoteUser.pass === hash(password)) {
            u = remoteUser;
            db.users[key] = u;
            if (!db.data[key]) db.data[key] = emptyData();
            saveDB(db);
          }
        } else if (u) {
          await remoteCreateUser(u, { ignoreDuplicate: true });
        }
      } catch (e) {
        return { ok: false, error: 'Login local encontrado, mas falhou ao preparar usuário no Supabase: ' + e.message };
      }
    }
    if (!u) return { ok: false, error: 'Usuário não encontrado.' };
    if (u.pass !== hash(password)) return { ok: false, error: 'Senha incorreta.' };
    setSession(key);
    return { ok: true, user: publicUser(u) };
  }

  function publicUser(u) { return { name: u.name, clinic: u.clinic, email: u.email, perms: u.perms || ['Administrador'], avatar: u.avatar || '', crmv: u.crmv || '', crmvUF: u.crmvUF || '' }; }

  // workspace vazio — começa só com os dados do próprio usuário (sem demo)
  function emptyData() {
    return {
      patients: [], owners: [], charts: {}, atendimentos: [],
      agendaAppts: [], inventory: [], weights: {}, vaccines: {}, vacAgenda: [],
      propriedades: [], parceiras: [],
      fin: { caixa: { open: false, abertura: 0, saldo: 0 }, tx: [] },
    };
  }

  // exporta TODOS os dados do usuário logado (backup)
  function exportData() {
    const key = localStorage.getItem(SESSION_KEY);
    if (!key) return null;
    const db = loadDB();
    return { exportedAt: new Date().toISOString(), user: publicUser(db.users[key] || {}), data: db.data[key] || {} };
  }
  // importa/restaura dados no usuário logado (merge ou substituição)
  function importData(payload, mode) {
    const key = localStorage.getItem(SESSION_KEY);
    if (!key || !payload || !payload.data) return { ok: false, error: 'Backup inválido.' };
    const db = loadDB();
    db.data[key] = mode === 'replace' ? payload.data : { ...(db.data[key] || {}), ...payload.data };
    saveDB(db);
    return { ok: true };
  }
  // altera a senha do usuário logado
  async function changePassword(atual, nova) {
    const key = localStorage.getItem(SESSION_KEY);
    if (!key) return { ok: false, error: 'Sessão expirada.' };
    const db = loadDB();
    const u = db.users[key];
    if (!u || u.pass !== hash(atual)) return { ok: false, error: 'Senha atual incorreta.' };
    if (!nova || nova.length < 6) return { ok: false, error: 'Nova senha precisa de 6+ caracteres.' };
    u.pass = hash(nova); saveDB(db);
    try { await remoteUpdateUser(key, { pass: u.pass }); }
    catch (e) { return { ok: false, error: 'Senha local alterada, mas falhou no Supabase: ' + e.message }; }
    return { ok: true };
  }

  // recuperação de senha por "email" (gera código; sem servidor, exibe no fluxo)
  async function requestReset(email) {
    const db = loadDB();
    const key = norm(email);
    if (!db.users[key] && hasRemoteDB()) {
      try {
        const remote = await remoteGetUser(key);
        if (remote) { db.users[key] = remoteToLocalUser(remote); saveDB(db); }
      } catch (e) { return { ok: false, error: 'Falha ao consultar Supabase: ' + e.message }; }
    }
    if (!db.users[key]) return { ok: false, error: 'Não há conta com este email.' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    db.users[key].resetCode = code;
    db.users[key].resetAt = Date.now();
    saveDB(db);
    try { await remoteUpdateUser(key, { resetCode: code, resetAt: db.users[key].resetAt }); }
    catch (e) { return { ok: false, error: 'Falha ao salvar código no Supabase: ' + e.message }; }
    return { ok: true, code, email: key, name: db.users[key].name };
  }
  async function confirmReset(email, code, nova) {
    const db = loadDB();
    const key = norm(email);
    const u = db.users[key];
    if (!u || !u.resetCode) return { ok: false, error: 'Solicite um novo código.' };
    if (String(code).trim() !== u.resetCode) return { ok: false, error: 'Código incorreto.' };
    if (Date.now() - (u.resetAt || 0) > 30 * 60 * 1000) return { ok: false, error: 'Código expirado. Solicite outro.' };
    if (!nova || nova.length < 6) return { ok: false, error: 'Nova senha precisa de 6+ caracteres.' };
    u.pass = hash(nova); delete u.resetCode; delete u.resetAt; saveDB(db);
    try { await remoteUpdateUser(key, { pass: u.pass, resetCode: null, resetAt: null }); }
    catch (e) { return { ok: false, error: 'Senha local redefinida, mas falhou no Supabase: ' + e.message }; }
    return { ok: true };
  }

  function setSession(key) { localStorage.setItem(SESSION_KEY, key); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }
  function currentUser() {
    const key = localStorage.getItem(SESSION_KEY);
    if (!key) return null;
    const db = loadDB();
    return db.users[key] ? publicUser(db.users[key]) : null;
  }

  // ---- dados do app por usuário ----
  function getData() {
    const key = localStorage.getItem(SESSION_KEY);
    if (!key) return null;
    const db = loadDB();
    if (!db.data[key]) { db.data[key] = seedData(); saveDB(db); }
    return db.data[key];
  }
  function setData(patch) {
    const key = localStorage.getItem(SESSION_KEY);
    if (!key) return;
    const db = loadDB();
    db.data[key] = { ...(db.data[key] || seedData()), ...patch };
    saveDB(db);
  }

  // dados iniciais (copiados do mock) p/ novo usuário
  function seedData() {
    const base = window.VtData || {};
    return {
      patients: JSON.parse(JSON.stringify(base.patients || [])),
      owners: JSON.parse(JSON.stringify(base.owners || [])),
      charts: {}, // odontogramas por paciente
      atendimentos: [
        { id: 'A1', patientId: 'P-0003', patientName: 'Bella', date: '18/01/2026', type: 'Avaliação odontológica', vet: 'M.V. Sofia Silva', vetColor: '#2f6fed', weight: '420,0 kg', procedure: 'Exame odontológico completo', notes: 'Pontas de esmalte em arcadas superiores.', value: 'R$ 250,00' },
        { id: 'A2', patientId: 'P-0001', patientName: 'Thor', date: '02/06/2026', type: 'Exodontia', vet: 'M.V. Marcos Dias', vetColor: '#e0533c', weight: '4,8 kg', procedure: 'Extração do elemento 108', notes: 'Pós-operatório sem intercorrências.', value: 'R$ 620,00' },
        { id: 'A3', patientId: 'P-0002', patientName: 'Luna', date: '28/05/2026', type: 'Profilaxia odontológica', vet: 'M.V. Sofia Silva', vetColor: '#2f6fed', weight: '28,4 kg', procedure: 'Limpeza da arcada completa', notes: '', value: 'R$ 350,00' },
      ],
    };
  }

  // ---- migração segura: nunca apaga dados existentes em atualizações ----
  function migrate() {
    const key = localStorage.getItem(SESSION_KEY);
    if (!key) return;
    const db = loadDB();
    if (!db.data[key]) return;
    const d = db.data[key];
    // garante que chaves novas existam sem sobrescrever as do usuário
    const defaults = {
      patients: [], owners: [], charts: {}, atendimentos: [],
      agendaAppts: [], inventory: [], weights: {}, vaccines: {}, vacAgenda: [],
      propriedades: [], parceiras: [],
      fin: { caixa: { open: false, abertura: 0, saldo: 0 }, tx: [] },
    };
    let changed = false;
    Object.keys(defaults).forEach((k) => { if (d[k] === undefined) { d[k] = defaults[k]; changed = true; } });
    if (changed) saveDB(db);
  }

  // atualiza dados do perfil do usuário logado (avatar, nome, etc.)
  async function updateProfile(patch) {
    const key = localStorage.getItem(SESSION_KEY);
    if (!key) return { ok: false };
    const db = loadDB();
    const u = db.users[key];
    if (!u) return { ok: false };
    Object.assign(u, patch || {});
    saveDB(db);
    try { await remoteUpdateUser(key, patch || {}); }
    catch (e) { console.warn('[VtStore] updateProfile Supabase:', e.message); }
    return { ok: true };
  }

  return { register, login, logout: clearSession, currentUser, getData, setData, exportData, importData, changePassword, updateProfile, requestReset, confirmReset, migrate, _loadDB: loadDB };
})();
