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

  function register({ name, clinic, email, password, demo }) {
    const db = loadDB();
    const key = norm(email);
    if (!name || !email || !password) return { ok: false, error: 'Preencha todos os campos.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return { ok: false, error: 'Email inválido.' };
    if (password.length < 6) return { ok: false, error: 'A senha deve ter ao menos 6 caracteres.' };
    if (db.users[key]) return { ok: false, error: 'Este email já possui cadastro.' };
    db.users[key] = { name, clinic: clinic || '', email: key, pass: hash(password), perms: ['Administrador'], createdAt: Date.now() };
    db.data[key] = demo ? seedData() : emptyData();
    saveDB(db);
    setSession(key);
    return { ok: true, user: publicUser(db.users[key]) };
  }

  function login({ email, password }) {
    const db = loadDB();
    const key = norm(email);
    const u = db.users[key];
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
  function changePassword(atual, nova) {
    const key = localStorage.getItem(SESSION_KEY);
    if (!key) return { ok: false, error: 'Sessão expirada.' };
    const db = loadDB();
    const u = db.users[key];
    if (!u || u.pass !== hash(atual)) return { ok: false, error: 'Senha atual incorreta.' };
    if (!nova || nova.length < 6) return { ok: false, error: 'Nova senha precisa de 6+ caracteres.' };
    u.pass = hash(nova); saveDB(db);
    return { ok: true };
  }

  // recuperação de senha por "email" (gera código; sem servidor, exibe no fluxo)
  function requestReset(email) {
    const db = loadDB();
    const key = norm(email);
    if (!db.users[key]) return { ok: false, error: 'Não há conta com este email.' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    db.users[key].resetCode = code;
    db.users[key].resetAt = Date.now();
    saveDB(db);
    return { ok: true, code, email: key, name: db.users[key].name };
  }
  function confirmReset(email, code, nova) {
    const db = loadDB();
    const key = norm(email);
    const u = db.users[key];
    if (!u || !u.resetCode) return { ok: false, error: 'Solicite um novo código.' };
    if (String(code).trim() !== u.resetCode) return { ok: false, error: 'Código incorreto.' };
    if (Date.now() - (u.resetAt || 0) > 30 * 60 * 1000) return { ok: false, error: 'Código expirado. Solicite outro.' };
    if (!nova || nova.length < 6) return { ok: false, error: 'Nova senha precisa de 6+ caracteres.' };
    u.pass = hash(nova); delete u.resetCode; delete u.resetAt; saveDB(db);
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
  function updateProfile(patch) {
    const key = localStorage.getItem(SESSION_KEY);
    if (!key) return { ok: false };
    const db = loadDB();
    const u = db.users[key];
    if (!u) return { ok: false };
    Object.assign(u, patch || {});
    saveDB(db);
    return { ok: true };
  }

  return { register, login, logout: clearSession, currentUser, getData, setData, exportData, importData, changePassword, updateProfile, requestReset, confirmReset, migrate, _loadDB: loadDB };
})();
