/* ============================================================
   VetTooth Pro — Service Worker v1
   Estratégia: Cache-First para assets estáticos + offline fallback
   Sync: enfileira push offline e sobe ao reconectar
   ============================================================ */

const CACHE_NAME = 'vettooth-v4';
const CACHE_CDN  = 'vettooth-cdn-v1';

/* ── Assets locais ─────────────────────────────────────────── */
const LOCAL_ASSETS = [
  '/VetTooth%20Pro.html',
  '/VetTooth Pro.html',
  '/vt-icons.jsx',
  '/vt-gcal.jsx',
  '/vt-fields.jsx',
  '/vt-data.jsx',
  '/vt-db.jsx',
  '/vt-auth.jsx',
  '/vt-login.jsx',
  '/vt-atendimentos.jsx',
  '/vt-pacientes.jsx',
  '/vt-racas.jsx',
  '/vt-richtext.jsx',
  '/vt-modules.jsx',
  '/vt-sign.jsx',
  '/vt-odonto.jsx',
  '/vt-financeiro.jsx',
  '/vt-financeiro2.jsx',
  '/vt-financeiro3.jsx',
  '/vt-financeiro4.jsx',
  '/vt-split.jsx',
  '/vt-contas.jsx',
  '/vt-ia.jsx',
  '/vt-scores.jsx',
  '/vt-ficha.jsx',
  '/vt-prontuario.jsx',
  '/vt-prontuario-exam.jsx',
  '/vt-prontuario-vacina.jsx',
  '/vt-prontuario-plan.jsx',
  '/vt-prontuario-extra.jsx',
  '/vt-rx.jsx',
  '/vt-asa.jsx',
  '/vt-docs.jsx',
  '/vt-integra.jsx',
  '/vt-anestesia.jsx',
  '/vt-estoque3.jsx',
  '/vt-app.jsx',
  '/vt-odonto-steps.jsx',
  '/vt-odonto-especie.jsx',
  '/vt-species-arch.jsx',
  '/vt-prontuario-plan.jsx',
  '/odonto-ui.jsx',
  '/panels.jsx',
  '/app.jsx',
  '/chart-anatomical.jsx',
  '/chart-base-svg.jsx',
  '/chart-components.jsx',
  '/chart-svg.jsx',
  '/ui-components.jsx',
  '/vt-atendimentos.jsx',
];

/* ── URLs de CDN ───────────────────────────────────────────── */
const CDN_URLS = [
  'https://unpkg.com/react@18.3.1/umd/react.development.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/node-forge@1.3.1/dist/forge.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
];

/* ── INSTALL — pré-cacheia tudo ─────────────────────────────── */
self.addEventListener('install', (e) => {
  e.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((c) =>
        Promise.allSettled(LOCAL_ASSETS.map((url) => c.add(url).catch(() => {})))
      ),
      caches.open(CACHE_CDN).then((c) =>
        Promise.allSettled(CDN_URLS.map((url) =>
          fetch(url, { cache: 'no-store' })
            .then((r) => { if (r.ok) c.put(url, r); })
            .catch(() => {})
        ))
      ),
    ]).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE — limpa caches antigos ───────────────────────── */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== CACHE_CDN)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH — cache-first para assets, network-first para Supabase ── */
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Deixa requisições Supabase passarem direto (tentativa de rede)
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Requisições de navegação (HTML) → cache-first, fallback sempre para o app
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/VetTooth Pro.html')
        .then(r => r || fetch('/VetTooth%20Pro.html'))
        .catch(() => fetch('/VetTooth%20Pro.html'))
    );
    return;
  }

  // Demais requisições → cache-first, depois rede, depois cache stale
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((response) => {
          // Cacheia locais e CDN dinamicamente
          if (
            response.ok &&
            (url.hostname === self.location.hostname ||
             url.hostname.includes('jsdelivr') ||
             url.hostname.includes('unpkg') ||
             url.hostname.includes('cloudflare') ||
             url.hostname.includes('googleapis') ||
             url.hostname.includes('gstatic'))
          ) {
            const toCache = url.hostname === self.location.hostname ? CACHE_NAME : CACHE_CDN;
            caches.open(toCache).then((c) => c.put(e.request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Offline e não está no cache
          if (e.request.destination === 'document') {
            return caches.match('/VetTooth Pro.html');
          }
          return new Response('', { status: 503 });
        });
    })
  );
});

/* ── BACKGROUND SYNC ────────────────────────────────────────── */
self.addEventListener('sync', (e) => {
  if (e.tag === 'vt-sync-push') {
    e.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'VT_DO_PUSH' }));
      })
    );
  }
});

/* ── MENSAGENS DO CLIENTE ───────────────────────────────────── */
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
