/* ============================================================
   VetTooth Pro — Supabase Database Layer + Sync Bridge
   - Inicializa o cliente Supabase
   - Patcha VtStore.setData para push automático ao Supabase
   - Pull do Supabase na inicialização (restore de dados)
   - Expõe helpers por tabela: window.dbPacientes, etc.
   ============================================================ */
(function () {
  const SB_URL = 'https://rqdxybuxjtzzzpjqzojk.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxZHh5YnV4anR6enpwanF6b2prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjcwOTIsImV4cCI6MjA5ODk0MzA5Mn0.5-lMvhedwmXNYI6n_GbjBu4jlvNAJVTZl-RAz3fSQTU';

  /* ── INIT SUPABASE ─────────────────────────────────────────── */
  function initClient() {
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      setTimeout(initClient, 200);
      return;
    }
    window.vtDB = supabase.createClient(SB_URL, SB_KEY);
    window.vtDBReady = true;
    document.dispatchEvent(new Event('vtDBReady'));
    console.log('[VetTooth] Supabase conectado ✓');
    _setupSync();
  }
  initClient();

  /* ── SYNC BRIDGE ───────────────────────────────────────────── */
  // Salva/restaura todo o VtStore como JSONB na tabela dados_clinica.
  // Isso mantém 100% de compatibilidade com os módulos existentes.

  let _pushTimer = null;
  let _syncing = false;
  let _pendingPush = false;  // marcado quando offline impede o push

  /* ── Estado online/offline ──────────────────────────────────── */
  function _setOnlineStatus(online) {
    document.dispatchEvent(new CustomEvent('vtOnlineStatus', { detail: { online } }));
    if (online) {
      console.log('[vtSync] Online detectado — sincronizando dados pendentes…');
      _flushPending();
    }
  }
  window.addEventListener('online',  () => _setOnlineStatus(true));
  window.addEventListener('offline', () => _setOnlineStatus(false));

  // Registra push pendente no localStorage para sobreviver recargas
  const PENDING_KEY = 'vettooth:sync:pending';
  function _markPending()  { try { localStorage.setItem(PENDING_KEY, '1'); } catch {} }
  function _clearPending() { try { localStorage.removeItem(PENDING_KEY); } catch {} }
  function _hasPending()   { try { return !!localStorage.getItem(PENDING_KEY); } catch { return false; } }

  function _getEmail() {
    try { return localStorage.getItem('vettooth:session') || null; } catch { return null; }
  }

  async function _push() {
    const email = _getEmail();
    if (!email || !window.vtDB || !window.VtStore) return;
    const db = window.VtStore._loadDB ? window.VtStore._loadDB() : null;
    if (!db || !db.data || !db.data[email]) return;

    if (!navigator.onLine) {
      _markPending();
      document.dispatchEvent(new CustomEvent('vtSyncStatus', { detail: { status: 'offline' } }));
      console.log('[vtSync] Offline — push enfileirado');
      return;
    }

    document.dispatchEvent(new CustomEvent('vtSyncStatus', { detail: { status: 'syncing' } }));

    // Remove fotos (base64 pesado) antes de enviar
    const raw = window.VtStore._normalizeData
      ? window.VtStore._normalizeData(db.data[email])
      : db.data[email];
    const payload = JSON.parse(JSON.stringify(raw));
    if (payload.patients) {
      payload.patients = payload.patients.map((p) => {
        const c = { ...p };
        if (c.photo && c.photo.startsWith && c.photo.startsWith('data:')) c.photo = '';
        return c;
      });
    }

    try {
      const { error } = await window.vtDB.from('dados_clinica')
        .upsert({ email, payload, updated_at: new Date().toISOString() });
      if (error) {
        console.warn('[vtSync] push error:', error.message);
        _markPending();
        document.dispatchEvent(new CustomEvent('vtSyncStatus', { detail: { status: 'error' } }));
      } else {
        _clearPending();
        console.log('[vtSync] Dados salvos no Supabase ✓');
        document.dispatchEvent(new CustomEvent('vtSyncStatus', { detail: { status: 'ok' } }));
      }
    } catch (e) {
      console.warn('[vtSync] push falhou:', e.message);
      _markPending();
      document.dispatchEvent(new CustomEvent('vtSyncStatus', { detail: { status: 'offline' } }));
    }
  }

  // Descarrega push pendente quando online
  async function _flushPending() {
    if (!_hasPending()) return;
    await _push();
  }

  function _schedulePush() {
    clearTimeout(_pushTimer);
    _pushTimer = setTimeout(_push, 2000);
  }

  async function _pull(email) {
    if (!window.vtDB || !email) return false;
    try {
      const { data, error } = await window.vtDB.from('dados_clinica')
        .select('payload').eq('email', email).maybeSingle();
      if (error) { console.warn('[vtSync] pull error:', error.message); return false; }
      if (!data || !data.payload) {
        // Sem dados no Supabase → push o que existe localmente
        setTimeout(_push, 500);
        return false;
      }
      const remotePayload = window.VtStore && window.VtStore._normalizeData
        ? window.VtStore._normalizeData(data.payload)
        : data.payload;
      // Mescla: Supabase como base, dados locais têm prioridade (usuário pode ter algo mais novo)
      if (window.VtStore && window.VtStore._loadDB && window.VtStore.setData) {
        const localDb = window.VtStore._loadDB();
        const localRaw = (localDb.data && localDb.data[email]) || {};
        const local = window.VtStore._normalizeData
          ? window.VtStore._normalizeData(localRaw)
          : localRaw;
        // Corrige automaticamente backups antigos que ficaram duplamente
        // serializados como texto dentro do JSONB.
        if (typeof data.payload === 'string') {
          window.VtStore._setDataRaw(email, remotePayload);
          setTimeout(_push, 500);
          console.log('[vtSync] Formato legado do workspace corrigido ✓');
          return true;
        }
        // Se o local não tem pacientes mas o Supabase tem → usa Supabase
        const sbPats = (remotePayload.patients || []).length;
        const localPats = (local.patients || []).length;
        if (sbPats > localPats) {
          window.VtStore._setDataRaw(email, remotePayload);
          console.log('[vtSync] Dados restaurados do Supabase ✓', sbPats, 'pacientes');
          return true;
        }
      }
    } catch (e) { console.warn('[vtSync] pull falhou:', e.message); }
    return false;
  }

  function _setupSync() {
    if (!window.VtStore) {
      setTimeout(_setupSync, 300);
      return;
    }

    // Expõe _setDataRaw para poder restaurar sem loop
    if (!window.VtStore._setDataRaw) {
      const origSetData = window.VtStore.setData;
      window.VtStore._setDataRaw = function (email, payload) {
        try {
          const db = window.VtStore._loadDB();
          const current = window.VtStore._normalizeData
            ? window.VtStore._normalizeData(db.data[email])
            : (db.data[email] || {});
          const incoming = window.VtStore._normalizeData
            ? window.VtStore._normalizeData(payload)
            : payload;
          db.data[email] = { ...current, ...incoming };
          localStorage.setItem('vettooth:db:v1', JSON.stringify(db));
        } catch (e) { console.warn('[vtSync] _setDataRaw error:', e.message); }
      };

      // Patcha setData para push automático
      window.VtStore.setData = function (patch) {
        origSetData.call(this, patch);
        _schedulePush();
      };
    }

    // Patcha login para pull do Supabase na autenticação
    if (!window.VtStore._origLogin) {
      window.VtStore._origLogin = window.VtStore.login;
      window.VtStore.login = async function (creds) {
        const result = await window.VtStore._origLogin.call(this, creds);
        if (result && result.ok) {
          const email = (creds.email || '').trim().toLowerCase();
          const restored = await _pull(email);
          if (restored) {
            // Notifica o app para recarregar os dados
            setTimeout(() => {
              document.dispatchEvent(new CustomEvent('vtDataRestored'));
              // Força reload leve para componentes pegarem os dados novos
              if (window.vtForceRefresh) window.vtForceRefresh();
            }, 100);
          }
        }
        return result;
      };
    }

    // Ouve mensagens do Service Worker (push solicitado pelo SW)
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'VT_DO_PUSH') _push();
      });
    }

    // Se já está logado: tenta pull imediato e descarrega pending
    const email = _getEmail();
    if (email) {
      _pull(email).then((restored) => {
        if (restored) {
          document.dispatchEvent(new CustomEvent('vtDataRestored'));
          if (window.vtForceRefresh) window.vtForceRefresh();
        }
        // Se havia push pendente (feito offline), sobe agora
        if (_hasPending() && navigator.onLine) _push();
      });
    }
  }

  /* ── UTILITÁRIO ────────────────────────────────────────────── */
  const q = async (table, fn) => {
    if (!window.vtDB) return null;
    try {
      const { data, error } = await fn(window.vtDB.from(table));
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('[vtDB] ' + table + ':', e.message);
      return null;
    }
  };

  /* ── PACIENTES ─────────────────────────────────────────────── */
  window.dbPacientes = {
    getAll:   ()       => q('pacientes', t => t.select('*').order('nome')),
    get:      (id)     => q('pacientes', t => t.select('*').eq('id', id).maybeSingle()),
    search:   (s)      => q('pacientes', t => t.select('*').ilike('nome', `%${s}%`).limit(30)),
    create:   (d)      => q('pacientes', t => t.insert(d).select().single()),
    update:   (id, d)  => q('pacientes', t => t.update(d).eq('id', id).select().single()),
    delete:   (id)     => q('pacientes', t => t.delete().eq('id', id)),
  };

  /* ── TUTORES ───────────────────────────────────────────────── */
  window.dbTutores = {
    getAll:  ()       => q('tutores', t => t.select('*').order('nome')),
    get:     (id)     => q('tutores', t => t.select('*').eq('id', id).maybeSingle()),
    search:  (s)      => q('tutores', t => t.select('*').ilike('nome', `%${s}%`).limit(20)),
    create:  (d)      => q('tutores', t => t.insert(d).select().single()),
    update:  (id, d)  => q('tutores', t => t.update(d).eq('id', id).select().single()),
  };

  /* ── ATENDIMENTOS ──────────────────────────────────────────── */
  window.dbAtendimentos = {
    getAll:        ()       => q('atendimentos', t => t.select('*,pacientes(nome,especie,raca,sexo,peso)').order('data', { ascending: false })),
    getHoje:       ()       => { const d = new Date().toISOString().split('T')[0]; return q('atendimentos', t => t.select('*,pacientes(nome,especie,raca,sexo,peso,alergias)').gte('data', d + 'T00:00:00').lte('data', d + 'T23:59:59')); },
    getByPaciente: (id)     => q('atendimentos', t => t.select('*').eq('paciente_id', id).order('data', { ascending: false })),
    create:        (d)      => q('atendimentos', t => t.insert(d).select().single()),
    update:        (id, d)  => q('atendimentos', t => t.update(d).eq('id', id).select().single()),
    delete:        (id)     => q('atendimentos', t => t.delete().eq('id', id)),
  };

  /* ── AGENDA ────────────────────────────────────────────────── */
  window.dbAgenda = {
    getAll:   ()       => q('agenda', t => t.select('*').order('data').order('hora')),
    getHoje:  ()       => { const d = new Date().toISOString().split('T')[0]; return q('agenda', t => t.select('*').eq('data', d)); },
    create:   (d)      => q('agenda', t => t.insert(d).select().single()),
    update:   (id, d)  => q('agenda', t => t.update(d).eq('id', id).select().single()),
    delete:   (id)     => q('agenda', t => t.delete().eq('id', id)),
  };

  /* ── FINANCEIRO ────────────────────────────────────────────── */
  window.dbFinanceiro = {
    getAll:    ()            => q('financeiro', t => t.select('*,pacientes(nome)').order('data', { ascending: false })),
    getByMes:  (ano, mes)    => { const s = `${ano}-${String(mes).padStart(2, '0')}-01`; const lastDay = new Date(ano, mes, 0).getDate(); const e = `${ano}-${String(mes).padStart(2, '0')}-${lastDay}`; return q('financeiro', t => t.select('*').gte('data', s).lte('data', e)); },
    create:    (d)           => q('financeiro', t => t.insert(d).select().single()),
    update:    (id, d)       => q('financeiro', t => t.update(d).eq('id', id).select().single()),
    delete:    (id)          => q('financeiro', t => t.delete().eq('id', id)),
  };

  /* ── ASSINATURAS ───────────────────────────────────────────── */
  window.dbAssinaturas = {
    getAll:  ()       => q('assinaturas', t => t.select('*,pacientes(nome)').order('created_at', { ascending: false })),
    create:  (d)      => q('assinaturas', t => t.insert(d).select().single()),
    update:  (id, d)  => q('assinaturas', t => t.update(d).eq('id', id).select().single()),
    delete:  (id)     => q('assinaturas', t => t.delete().eq('id', id)),
  };

  /* ── ODONTOGRAMAS ──────────────────────────────────────────── */
  window.dbOdontogramas = {
    getByPaciente: (id)     => q('odontogramas', t => t.select('*').eq('paciente_id', id).order('created_at', { ascending: false })),
    create:        (d)      => q('odontogramas', t => t.insert(d).select().single()),
    update:        (id, d)  => q('odontogramas', t => t.update(d).eq('id', id).select().single()),
  };

  /* ── PROCEDIMENTOS ─────────────────────────────────────────── */
  window.dbProcedimentos = {
    getByAtendimento: (id)  => q('procedimentos', t => t.select('*').eq('atendimento_id', id)),
    getByPaciente:    (id)  => q('procedimentos', t => t.select('*').eq('paciente_id', id).order('data', { ascending: false })),
    create:           (d)   => q('procedimentos', t => t.insert(d).select().single()),
  };

  /* ── VACINAS ───────────────────────────────────────────────── */
  window.dbVacinas = {
    getByPaciente: (id)  => q('vacinas', t => t.select('*').eq('paciente_id', id).order('data_aplicacao', { ascending: false })),
    create:        (d)   => q('vacinas', t => t.insert(d).select().single()),
  };

  /* ── EXAMES ────────────────────────────────────────────────── */
  window.dbExames = {
    getByPaciente: (id)     => q('exames', t => t.select('*').eq('paciente_id', id).order('data_solicitacao', { ascending: false })),
    create:        (d)      => q('exames', t => t.insert(d).select().single()),
    update:        (id, d)  => q('exames', t => t.update(d).eq('id', id).select().single()),
  };

  /* ── DADOS CLÍNICA (cloud backup) ─────────────────────────── */
  window.dbClinica = {
    pull:  (email)   => q('dados_clinica', t => t.select('payload').eq('email', email).maybeSingle()),
    push:  (email, payload) => q('dados_clinica', t => t.upsert({ email, payload, updated_at: new Date().toISOString() })),
  };

  /* ── HELPER localStorage fallback ─────────────────────────── */
  window.vtStore = {
    get:    (key)          => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } },
    set:    (key, val)     => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
    push:   (key, item)    => { const arr = window.vtStore.get(key) || []; arr.push(item); window.vtStore.set(key, arr); return arr; },
    update: (key, id, p)   => { const arr = (window.vtStore.get(key) || []).map(x => x.id === id ? Object.assign({}, x, p) : x); window.vtStore.set(key, arr); return arr; },
    remove: (key, id)      => { const arr = (window.vtStore.get(key) || []).filter(x => x.id !== id); window.vtStore.set(key, arr); return arr; },
  };

  /* ── EXPORT forçar sync manual ─────────────────────────────── */
  window.vtSyncNow = _push;
  window.vtSyncPull = _pull;

})();
