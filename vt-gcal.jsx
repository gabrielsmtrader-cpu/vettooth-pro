/* ============================================================
   VetTooth Pro — Integração Google Calendar (login real)
   Google Identity Services (GIS) token flow + Calendar API v3 via fetch.
   Client ID  → localStorage 'vtGoogleClientId' (fallback: VtStore / window.GOOGLE_CLIENT_ID)
   Token      → localStorage 'vtGcalToken' (persiste a conexão entre recarregamentos)
   Expõe window.VtGCal {
     configured, isConnected, connect, disconnect,
     listRange, createEvent, updateEvent, deleteEvent, getEmail, fetchEmail
   }
   ============================================================ */
(function () {
  const SCOPE = 'https://www.googleapis.com/auth/calendar';
  const API = 'https://www.googleapis.com/calendar/v3';
  const LS_CID = 'vtGoogleClientId';
  const LS_TOK = 'vtGcalToken';

  let tokenClient = null;
  let accessToken = null;
  let userEmail = '';

  // restaura o token salvo (mantém a conexão após recarregar a página)
  try { accessToken = localStorage.getItem(LS_TOK) || null; } catch (e) {}

  // Client ID: localStorage tem prioridade; depois window e VtStore (compatibilidade)
  function clientId() {
    try { const ls = localStorage.getItem(LS_CID); if (ls) return ls; } catch (e) {}
    if (window.GOOGLE_CLIENT_ID) return window.GOOGLE_CLIENT_ID;
    try { const d = (window.VtStore && window.VtStore.getData()) || {}; return (d.integrationsCfg && d.integrationsCfg.googleClientId) || ''; } catch (e) { return ''; }
  }

  function configured() { return !!clientId(); }
  function isConnected() { return !!accessToken; }
  function getEmail() { return userEmail; }

  // inicia o fluxo OAuth (popup, sem redirect); resolve quando o token é concedido
  function connect() {
    return new Promise((resolve, reject) => {
      const cid = clientId();
      if (!cid) { reject(new Error('NO_CLIENT_ID')); return; }
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) { reject(new Error('Google Identity Services não carregado.')); return; }
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: cid,
        scope: SCOPE,
        callback: (resp) => {
          if (resp && resp.access_token) {
            accessToken = resp.access_token;
            try { localStorage.setItem(LS_TOK, accessToken); } catch (e) {}
            resolve(resp);
          } else { reject(new Error('Autorização negada.')); }
        },
        error_callback: (err) => reject(err || new Error('Falha no login Google.')),
      });
      tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
    });
  }

  // logout: revoga o token e limpa o localStorage
  function disconnect() {
    const t = accessToken;
    accessToken = null; userEmail = '';
    try { localStorage.removeItem(LS_TOK); } catch (e) {}
    if (t && window.google && window.google.accounts && window.google.accounts.oauth2) {
      try { window.google.accounts.oauth2.revoke(t, () => {}); } catch (e) {}
    }
  }

  function authHeaders() { return { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }; }

  // trata respostas: 401 → derruba a sessão; demais erros → mensagem da API
  function handle(res) {
    if (res.status === 401) { disconnect(); throw new Error('Sessão Google expirada. Reconecte.'); }
    if (!res.ok) return res.json().catch(() => ({})).then((e) => { throw new Error((e.error && e.error.message) || ('HTTP ' + res.status)); });
    return res.json();
  }

  // e-mail da conta conectada (o id do calendário 'primary' é o e-mail)
  function fetchEmail() {
    if (!accessToken) return Promise.resolve('');
    return fetch(API + '/calendars/primary', { headers: authHeaders() }).then(handle)
      .then((r) => { userEmail = (r && (r.id || r.summary)) || ''; return userEmail; })
      .catch(() => '');
  }

  // lista eventos entre dois ISO (YYYY-MM-DD), inclusivo
  function listRange(startISO, endISO) {
    const timeMin = new Date(startISO + 'T00:00:00').toISOString();
    const end = new Date(endISO + 'T00:00:00'); end.setDate(end.getDate() + 1);
    const params = new URLSearchParams({ timeMin, timeMax: end.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '100' });
    return fetch(API + '/calendars/primary/events?' + params.toString(), { headers: authHeaders() }).then(handle)
      .then((r) => (r.items || []).map(mapEvent).filter(Boolean));
  }

  // converte evento do Google para o formato interno da agenda
  function mapEvent(it) {
    const s = it.start && (it.start.dateTime || it.start.date);
    const e = it.end && (it.end.dateTime || it.end.date);
    if (!s) return null;
    const sd = new Date(s);
    const date = sd.toISOString().slice(0, 10);
    const startH = it.start.dateTime ? sd.getHours() + sd.getMinutes() / 60 : 9;
    let dur = 1;
    if (it.start.dateTime && e) { const ed = new Date(e); dur = Math.max(0.5, (ed - sd) / 3600000); }
    return { id: 'GC-' + it.id, gcalId: it.id, _gcal: true, patient: it.summary || '(sem título)', kind: 'GCal', vet: '', date, start: startH, dur, status: 'GCal', local: it.location || '', endereco: it.location || '', obs: it.description || '' };
  }

  // monta o corpo do evento (compartilhado por create/update)
  function eventBody(ev) {
    const pad = (n) => String(n).padStart(2, '0');
    const sh = Math.floor(ev.start), sm = Math.round((ev.start - sh) * 60);
    const e0 = ev.start + (ev.dur || 1), eh = Math.floor(e0), em = Math.round((e0 - eh) * 60);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
    return {
      summary: `${ev.kind || 'Atendimento'} — ${ev.patient}`,
      description: `Veterinário: ${ev.vet || '—'}\n${ev.obs || ''}`.trim(),
      location: ev.endereco || (ev.local && ev.local !== 'Clínica própria' ? ev.local : ''),
      start: { dateTime: `${ev.date}T${pad(sh)}:${pad(sm)}:00`, timeZone: tz },
      end: { dateTime: `${ev.date}T${pad(eh)}:${pad(em)}:00`, timeZone: tz },
    };
  }

  // cria evento no Google Calendar a partir de um agendamento interno
  function createEvent(ev) {
    return fetch(API + '/calendars/primary/events', { method: 'POST', headers: authHeaders(), body: JSON.stringify(eventBody(ev)) }).then(handle);
  }

  // atualiza um evento existente (ev.gcalId obrigatório; sem id, cria)
  function updateEvent(ev) {
    if (!ev.gcalId) return createEvent(ev);
    return fetch(API + '/calendars/primary/events/' + encodeURIComponent(ev.gcalId), { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(eventBody(ev)) }).then(handle);
  }

  // remove um evento do Google Calendar
  function deleteEvent(gcalId) {
    if (!gcalId) return Promise.resolve();
    return fetch(API + '/calendars/primary/events/' + encodeURIComponent(gcalId), { method: 'DELETE', headers: authHeaders() })
      .then((res) => { if (res.status === 401) { disconnect(); throw new Error('Sessão Google expirada. Reconecte.'); } if (!res.ok && res.status !== 410) throw new Error('HTTP ' + res.status); return true; });
  }

  window.VtGCal = { configured, isConnected, connect, disconnect, listRange, createEvent, updateEvent, deleteEvent, getEmail, fetchEmail };
})();
