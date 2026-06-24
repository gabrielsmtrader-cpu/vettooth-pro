/* ============================================================
   VetTooth Pro — Supabase Database Layer
   URL: https://nxxyjzrkumwumkhxiijy.supabase.co
   ============================================================ */
(function () {
  const SB_URL = 'https://nxxyjzrkumwumkhxiijy.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54eHlqenJrdW13dW1raHhpaWp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjQxMzYsImV4cCI6MjA5NzkwMDEzNn0.p-nzq_c49AJCRU5Fz0unpMyREUTO4sxlyiMwlpwYoC8';

  // Wait for Supabase CDN to load
  function initClient() {
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      setTimeout(initClient, 200);
      return;
    }
    window.vtDB = supabase.createClient(SB_URL, SB_KEY);
    window.vtDBReady = true;
    document.dispatchEvent(new Event('vtDBReady'));
    console.log('[VetTooth] Supabase conectado ✓');
  }
  initClient();

  // ── UTILITÁRIO ──────────────────────────────────────────────
  const q = async (table, fn) => {
    if (!window.vtDB) return null;
    try { const { data, error } = await fn(window.vtDB.from(table)); if (error) throw error; return data; }
    catch (e) { console.warn('[vtDB] ' + table + ':', e.message); return null; }
  };

  // ── PACIENTES ───────────────────────────────────────────────
  window.dbPacientes = {
    getAll:   () => q('pacientes', t => t.select('*').order('nome')),
    get:      (id) => q('pacientes', t => t.select('*').eq('id', id).single()),
    search:   (s) => q('pacientes', t => t.select('*').ilike('nome', `%${s}%`).limit(30)),
    create:   (d) => q('pacientes', t => t.insert(d).select().single()),
    update:   (id, d) => q('pacientes', t => t.update(d).eq('id', id).select().single()),
    delete:   (id) => q('pacientes', t => t.delete().eq('id', id)),
  };

  // ── TUTORES ─────────────────────────────────────────────────
  window.dbTutores = {
    getAll:  () => q('tutores', t => t.select('*').order('nome')),
    get:     (id) => q('tutores', t => t.select('*').eq('id', id).single()),
    search:  (s) => q('tutores', t => t.select('*').ilike('nome', `%${s}%`).limit(20)),
    create:  (d) => q('tutores', t => t.insert(d).select().single()),
    update:  (id, d) => q('tutores', t => t.update(d).eq('id', id).select().single()),
  };

  // ── ATENDIMENTOS ────────────────────────────────────────────
  window.dbAtendimentos = {
    getAll:        () => q('atendimentos', t => t.select('*,pacientes(nome,especie,raca,sexo,peso)').order('data', { ascending: false })),
    getHoje:       () => { const d = new Date().toISOString().split('T')[0]; return q('atendimentos', t => t.select('*,pacientes(nome,especie,raca,sexo,peso,alergias)').gte('data', d+'T00:00:00').lte('data', d+'T23:59:59')); },
    getByPaciente: (id) => q('atendimentos', t => t.select('*').eq('paciente_id', id).order('data', { ascending: false })),
    create:        (d) => q('atendimentos', t => t.insert(d).select().single()),
    update:        (id, d) => q('atendimentos', t => t.update(d).eq('id', id).select().single()),
  };

  // ── AGENDA ──────────────────────────────────────────────────
  window.dbAgenda = {
    getAll:   () => q('agenda', t => t.select('*').order('data').order('hora')),
    getHoje:  () => { const d = new Date().toISOString().split('T')[0]; return q('agenda', t => t.select('*').eq('data', d)); },
    create:   (d) => q('agenda', t => t.insert(d).select().single()),
    update:   (id, d) => q('agenda', t => t.update(d).eq('id', id).select().single()),
    delete:   (id) => q('agenda', t => t.delete().eq('id', id)),
  };

  // ── FINANCEIRO ──────────────────────────────────────────────
  window.dbFinanceiro = {
    getAll:    () => q('financeiro', t => t.select('*,pacientes(nome)').order('data', { ascending: false })),
    getByMes:  (ano, mes) => { const s = `${ano}-${String(mes).padStart(2,'0')}-01`; const e = `${ano}-${String(mes).padStart(2,'0')}-31`; return q('financeiro', t => t.select('*').gte('data', s).lte('data', e)); },
    create:    (d) => q('financeiro', t => t.insert(d).select().single()),
    update:    (id, d) => q('financeiro', t => t.update(d).eq('id', id).select().single()),
    delete:    (id) => q('financeiro', t => t.delete().eq('id', id)),
  };

  // ── ASSINATURAS ─────────────────────────────────────────────
  window.dbAssinaturas = {
    getAll:  () => q('assinaturas', t => t.select('*,pacientes(nome)').order('created_at', { ascending: false })),
    create:  (d) => q('assinaturas', t => t.insert(d).select().single()),
    update:  (id, d) => q('assinaturas', t => t.update(d).eq('id', id).select().single()),
  };

  // ── ODONTOGRAMAS ────────────────────────────────────────────
  window.dbOdontogramas = {
    getByPaciente: (id) => q('odontogramas', t => t.select('*').eq('paciente_id', id).order('created_at', { ascending: false })),
    create:        (d) => q('odontogramas', t => t.insert(d).select().single()),
    update:        (id, d) => q('odontogramas', t => t.update(d).eq('id', id).select().single()),
  };

  // ── PROCEDIMENTOS ───────────────────────────────────────────
  window.dbProcedimentos = {
    getByAtendimento: (id) => q('procedimentos', t => t.select('*').eq('atendimento_id', id)),
    getByPaciente:    (id) => q('procedimentos', t => t.select('*').eq('paciente_id', id).order('data', { ascending: false })),
    create:           (d)  => q('procedimentos', t => t.insert(d).select().single()),
  };

  // ── VACINAS ─────────────────────────────────────────────────
  window.dbVacinas = {
    getByPaciente: (id) => q('vacinas', t => t.select('*').eq('paciente_id', id).order('data_aplicacao', { ascending: false })),
    create:        (d)  => q('vacinas', t => t.insert(d).select().single()),
  };

  // ── EXAMES ──────────────────────────────────────────────────
  window.dbExames = {
    getByPaciente: (id) => q('exames', t => t.select('*').eq('paciente_id', id).order('data_solicitacao', { ascending: false })),
    create:        (d)  => q('exames', t => t.insert(d).select().single()),
    update:        (id, d) => q('exames', t => t.update(d).eq('id', id).select().single()),
  };

  // ── HELPER: localStorage fallback ───────────────────────────
  // Se Supabase retornar null, usa localStorage como cache local
  window.vtStore = {
    get: (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } },
    set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
    push: (key, item) => { const arr = window.vtStore.get(key) || []; arr.push(item); window.vtStore.set(key, arr); return arr; },
    update: (key, id, patch) => { const arr = (window.vtStore.get(key) || []).map(x => x.id === id ? {...x,...patch} : x); window.vtStore.set(key, arr); return arr; },
    remove: (key, id) => { const arr = (window.vtStore.get(key) || []).filter(x => x.id !== id); window.vtStore.set(key, arr); return arr; },
  };

})();
