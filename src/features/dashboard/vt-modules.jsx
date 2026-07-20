/* ============================================================
   VetTooth Pro — módulos: Clientes, Agenda, Tratamentos,
   Estoque, Finanças, Relatórios, Configurações
   ============================================================ */

/* ---- Configuração viva: tipos de consulta + equipe ----
   Lê override do VtStore, com fallback nos defaults do VtData.
   Ao salvar, persiste E atualiza window.VtData para refletir em todo o app. */
window.vtConsults = function () {
  const d = window.VtStore && window.VtStore.getData();
  return (d && d.consultTypes) || window.VtData.consultTypes;
};
window.VT_CONSULT_DEFAULTS = null;
window.vtSaveConsults = function (list) {
  if (!window.VT_CONSULT_DEFAULTS) window.VT_CONSULT_DEFAULTS = window.VtData.consultTypes.map((t) => ({ ...t }));
  window.VtData.consultTypes = list;
  if (window.VtStore) window.VtStore.setData({ consultTypes: list });
};

/* ---- Catálogo de Protocolos / Procedimentos ----
   Cada protocolo descreve o procedimento e lista os insumos necessários.
   Schema: { id, name, categoria, preco, tempo, insumos: [{itemId,itemName,qty,unit}] } */
window.vtProcProtocols = function () {
  const d = window.VtStore && window.VtStore.getData();
  return (d && d.procProtocols) || [];
};
window.vtSaveProcProtocol = function (p) {
  const d = window.VtStore && window.VtStore.getData() || {};
  const list = (d.procProtocols || []).slice();
  const idx = list.findIndex((x) => x.id === p.id);
  if (idx >= 0) list[idx] = p; else list.unshift({ ...p, id: 'PP' + Date.now().toString(36) });
  window.VtStore.setData({ procProtocols: list });
};
window.vtDeleteProcProtocol = function (id) {
  const d = window.VtStore && window.VtStore.getData() || {};
  window.VtStore.setData({ procProtocols: (d.procProtocols || []).filter((x) => x.id !== id) });
};

/* vtBaixarInsumos: debita cada insumo do estoque e registra movimentação.
   Retorna { custo } (custo total calculado pelos itens debitados). */
window.vtBaixarInsumos = function (insumos, motivo, vet) {
  if (!insumos || !insumos.length) return { custo: 0 };
  const d = window.VtStore && window.VtStore.getData() || {};
  let inventory = (d.inventory || []).slice();
  const inventoryMoves = (d.inventoryMoves || []).slice();
  let custo = 0;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  insumos.forEach((ins) => {
    const idx = inventory.findIndex((x) => x.id === ins.itemId);
    if (idx < 0) return;
    const item = inventory[idx];
    const amt = Number(ins.qty) || 0;
    const newQty = Math.max(0, (Number(item.qty) || 0) - amt);
    const costUnit = window.PR && window.PR.parseMoney ? window.PR.parseMoney(item.cost) || 0 : 0;
    custo += costUnit * amt;
    inventory[idx] = { ...item, qty: newQty };
    inventoryMoves.unshift({
      id: 'MV' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      ts: now.getTime(), date: dateStr,
      itemName: item.name, unit: item.unit,
      tipo: 'Saída', qty: amt, delta: -amt,
      responsavel: vet || (window.vtCurrentVet ? window.vtCurrentVet() : 'Equipe'),
      obs: motivo || 'Procedimento'
    });
  });
  window.VtStore.setData({ inventory, inventoryMoves });
  return { custo };
};

/* ---- Catálogo de Serviços (Procedimentos, Vacinas, Medicamentos, Curativos) ---- */
window.vtServiceCatalog = function (tipo) {
  const d = window.VtStore && window.VtStore.getData();
  const all = (d && d.serviceCatalog) || [];
  return tipo ? all.filter((x) => x.tipo === tipo) : all;
};
window.vtSaveServiceItem = function (item) {
  const d = window.VtStore && window.VtStore.getData() || {};
  const list = (d.serviceCatalog || []).slice();
  if (!item.id) item = { ...item, id: 'SC' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4) };
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) list[idx] = item; else list.unshift(item);
  window.VtStore.setData({ serviceCatalog: list });
  return item;
};
window.vtDeleteServiceItem = function (id) {
  const d = window.VtStore && window.VtStore.getData() || {};
  window.VtStore.setData({ serviceCatalog: (d.serviceCatalog || []).filter((x) => x.id !== id) });
};
/* custo dos insumos de um serviço calculado ao vivo */
window.vtServiceCusto = function (item) {
  const d = window.VtStore && window.VtStore.getData() || {};
  const inv = d.inventory || [];
  return (item.insumos || []).reduce((s, ins) => {
    const invItem = inv.find((x) => x.id === ins.itemId);
    const cu = invItem && window.PR ? (window.PR.parseMoney(invItem.cost) || 0) : (Number(ins.custoUnit) || 0);
    return s + cu * (Number(ins.qty) || 1);
  }, 0);
};

/* ---- Roteiros de avaliação por modelo de consulta ----
   Cada tipo avalia coisas diferentes. Itens são marcados Normal/Alterado/N-A
   pelo veterinário na aba Consulta. Personalizáveis em Configurações. */
window.PR_ROTEIROS_DEFAULT = {
  geral:  { label: 'Clínica Geral',        items: [] },
  odonto: { label: 'Odontológica',          items: [] },
  derma:  { label: 'Dermatológica',         items: [] },
  orto:   { label: 'Ortopédica',            items: [] },
  anest:  { label: 'Avaliação Anestésica',  items: [] },
  neuro:  { label: 'Neurologia',            items: [] },
  nutri:  { label: 'Nutrição',              items: [] },
};

/* ─── ANAMNESES ESPECÍFICAS POR ESPECIALIDADE ──────────────────────────── */
/* Usadas como padrão quando não há override salvo pelo usuário.
   Cada array segue o mesmo schema de window.PR.anamnese (k, q, type, opts). */
window.PR_ANAMNESE_BY_MODEL = {
  geral:  [],
  odonto: [],
  derma:  [],
  orto:   [],
  anest:  [],
  neuro:  [],
  nutri:  [],
};
window.vtConsultRoteiros = function () {
  const d = window.VtStore && window.VtStore.getData();
  return (d && d.consultRoteiros) || window.PR_ROTEIROS_DEFAULT;
};
window.vtSaveConsultRoteiros = function (map) {
  if (window.VtStore) window.VtStore.setData({ consultRoteiros: map });
};
/* Mapeia label de tipo de atendimento → id do modelo de prontuário */
window.vtModelForType = function (typeLabel) {
  const ct = window.vtConsults().find((c) => c.label === typeLabel);
  if (ct && ct.model) return ct.model;
  const l = (typeLabel || '').toLowerCase();
  if (/odont|profilax|exodont|canal|endodont|period|cirurg.*oral|rx.*dent/.test(l)) return 'odonto';
  if (/derma|pele|citol|otite|raspad/.test(l)) return 'derma';
  if (/neuro|convuls|epilep|paralisia|ataxia|disc|hérnia/.test(l)) return 'neuro';
  if (/nutri|dieta|obesidade|emagr|rer|der|aliment/.test(l)) return 'nutri';
  if (/orto|claudic|fisiot/.test(l)) return 'orto';
  if (/anest|sedac|pré.?op|pre.?op/.test(l)) return 'anest';
  return 'geral';
};
/* inclusão de seções por modelo + listas globais personalizáveis */
window.PR_DIAG_DEFAULT = [
  { k: 'principal', label: 'Diagnóstico', ph: 'Diagnóstico definitivo ou mais provável' },
  { k: 'obs', label: 'Observações', ph: 'Notas adicionais' },
];
window.vtConsultInclude = function (modelId) {
  const d = window.VtStore && window.VtStore.getData();
  const map = (d && d.consultInclude) || {};
  return Object.assign({ roteiro: true, exame: true, sistemas: true }, map[modelId] || {});
};
window.vtSaveConsultInclude = function (modelId, inc) {
  const d = window.VtStore && window.VtStore.getData();
  const map = Object.assign({}, (d && d.consultInclude) || {});
  map[modelId] = inc;
  if (window.VtStore) window.VtStore.setData({ consultInclude: map });
};
window.vtAnamneseCfg = function () { const d = window.VtStore && window.VtStore.getData(); return (d && d.anamneseCfg) || window.PR.anamnese; };
window.vtSaveAnamneseCfg = function (l) { if (window.VtStore) window.VtStore.setData({ anamneseCfg: l }); };
window.vtAnamneseFor = function (modelId) { const d = window.VtStore && window.VtStore.getData(); const m = (d && d.anamneseByModel) || {}; return m[modelId] || (window.PR_ANAMNESE_BY_MODEL && window.PR_ANAMNESE_BY_MODEL[modelId]) || window.vtAnamneseCfg(); };
window.vtHasAnamneseOverride = function (modelId) { const d = window.VtStore && window.VtStore.getData(); return !!((d && d.anamneseByModel) || {})[modelId]; };
window.vtSaveAnamneseFor = function (modelId, list) { const d = window.VtStore && window.VtStore.getData(); const m = Object.assign({}, (d && d.anamneseByModel) || {}); if (list) m[modelId] = list; else delete m[modelId]; if (window.VtStore) window.VtStore.setData({ anamneseByModel: m }); };
window.vtExamCfg = function () { const d = window.VtStore && window.VtStore.getData(); return (d && d.examCfg) || window.PR.examParams; };
window.vtSaveExamCfg = function (l) { if (window.VtStore) window.VtStore.setData({ examCfg: l }); };
window.vtSistemasCfg = function () { const d = window.VtStore && window.VtStore.getData(); return (d && d.sistemasCfg) || window.PR.systems; };
window.vtSaveSistemasCfg = function (l) { if (window.VtStore) window.VtStore.setData({ sistemasCfg: l }); };
window.vtDiagCfg = function () { const d = window.VtStore && window.VtStore.getData(); const stored = d && d.diagCfg; if (!stored) return window.PR_DIAG_DEFAULT; const validKeys = window.PR_DIAG_DEFAULT.map((x) => x.k); const filtered = stored.filter((x) => validKeys.includes(x.k)); return filtered.length ? filtered : window.PR_DIAG_DEFAULT; };
window.vtSaveDiagCfg = function (l) { if (window.VtStore) window.VtStore.setData({ diagCfg: l }); };
/* ---- Sistema dinâmico de modelos de consulta ---- */
window.vtConsultModels = function () {
  const d = window.VtStore && window.VtStore.getData();
  const custom = d && d.customConsultModels;
  if (!custom) return window.PR.consultModels;
  const base = window.PR.consultModels.map((m) => {
    const ov = custom.overrides && custom.overrides[m.id];
    return ov ? { ...m, ...ov } : m;
  });
  const extra = (custom.extra || []);
  return [...base, ...extra];
};
window.vtSaveConsultModel = function (id, fields) {
  const d = window.VtStore && window.VtStore.getData();
  const custom = Object.assign({}, (d && d.customConsultModels) || {});
  const isBase = window.PR.consultModels.some((m) => m.id === id);
  if (isBase) {
    custom.overrides = Object.assign({}, custom.overrides || {}, { [id]: fields });
  } else {
    custom.extra = [...(custom.extra || []).filter((m) => m.id !== id), { ...fields, id }];
  }
  if (window.VtStore) window.VtStore.setData({ customConsultModels: custom });
};
window.vtDeleteConsultModel = function (id) {
  const d = window.VtStore && window.VtStore.getData();
  const custom = Object.assign({}, (d && d.customConsultModels) || {});
  custom.extra = (custom.extra || []).filter((m) => m.id !== id);
  if (window.VtStore) window.VtStore.setData({ customConsultModels: custom });
};
window.vtResetConsultModel = function (id) {
  const d = window.VtStore && window.VtStore.getData();
  const custom = Object.assign({}, (d && d.customConsultModels) || {});
  if (custom.overrides) { delete custom.overrides[id]; }
  if (window.VtStore) window.VtStore.setData({ customConsultModels: custom });
};
/* veterinário logado no sistema */
window.vtCurrentVet = function () {
  try { const u = window.VtStore && window.VtStore.currentUser && window.VtStore.currentUser(); if (u && (u.name || u.nome)) return (u.name || u.nome).replace(/^M\.?V\.?\s*/i, ''); } catch (e) {}
  const t = (window.vtTeam && window.vtTeam().filter((m) => m.vet)) || [];
  return (t[0] || {}).name || 'Veterinário';
};
/* lista de veterinários reais = membros da equipe marcados como vet (default: usuário logado) */
window.vtVets = function () {
  const t = (window.vtTeam && window.vtTeam()) || [];
  const vets = t.filter((m) => m.vet).map((m) => ({ id: m.id, name: m.name, role: m.role || 'Veterinário', color: m.color || '#14a8a0', crmv: m.crmv || '' }));
  return vets.length ? vets : [{ id: 'me', name: window.vtCurrentVet(), role: 'Veterinário', color: '#14a8a0', crmv: '' }];
};
window.vtTeamDefault = function () {
  const u = (window.VtStore && window.VtStore.currentUser && window.VtStore.currentUser()) || null;
  if (u) {
    // o usuário que se cadastrou é o administrador do sistema
    return [{ id: 'me', name: (u.name || 'Administrador').replace(/^M\.?V\.?\s*/i, ''), role: 'Administrador', crmv: '', cpf: '', phone: '', email: u.email || '', perms: ['Administrador'], color: '#14a8a0', vet: true }];
  }
  const vets = window.VtData.vets.map((v) => ({ id: v.id, name: v.name, role: v.role, crmv: '', color: v.color, vet: true }));
  return [...vets, { id: 't-rec', name: 'Júlia Ramos', role: 'Recepção / Secretária', crmv: '', color: '#67788c', vet: false }];
};
window.vtTeam = function () {
  const d = window.VtStore && window.VtStore.getData();
  return (d && d.team) || window.vtTeamDefault();
};
window.vtSaveTeam = function (list) {
  if (window.VtStore) window.VtStore.setData({ team: list });
  // membros marcados como veterinário alimentam os seletores de profissional
  const vets = list.filter((m) => m.vet).map((m) => ({ id: m.id, name: m.name, role: m.role, color: m.color }));
  if (vets.length) window.VtData.vets = vets;
};
window.vtVetSignature = function (vetName) {
  const n = (vetName || '').replace('M.V. ', '').trim();
  const team = window.vtTeam() || [];
  // 1) exact match
  let m = team.find((x) => x.vet && (x.name === n || ('M.V. ' + x.name) === vetName));
  // 2) partial match — handles renamed vets (e.g. "Gabriel" → "Gabriel Silva Martinez")
  if (!m) m = team.find((x) => x.vet && (x.name.startsWith(n + ' ') || n.startsWith(x.name + ' ') || x.name.toLowerCase().includes(n.toLowerCase())));
  // 3) only vet on team — safe fallback when there's exactly one
  if (!m && team.filter((x) => x.vet).length === 1) m = team.find((x) => x.vet);
  if (!m) return { name: n, crmv: '', especialidade: '', sign: '', icp: null };
  const icp = (m.icpTipo || m.icpTitular || m.icpCpf) ? {
    tipo: m.icpTipo || 'A1',
    titular: m.icpTitular || m.name,
    cpf: m.icpCpf || '',
    ac: m.icpAC || '',
    validade: m.icpValidade || '',
    serial: m.icpSerial || '',
  } : null;
  return { name: m.name, crmv: m.crmv || '', especialidade: m.especialidade || '', sign: m.sign || '', icp };
};
window.vtClinic = function () {
  const d = window.VtStore && window.VtStore.getData();
  if (d && d.clinic) return d.clinic;
  const u = (window.VtStore && window.VtStore.currentUser && window.VtStore.currentUser()) || {};
  return { name: u.clinic || '', cnpj: '', address: '' };
};
window.VT_CURRENCIES = {
  BRL: { sym: 'R$',  loc: 'pt-BR', label: 'Real (R$)',           flag: '🇧🇷' },
  USD: { sym: 'US$', loc: 'en-US', label: 'Dólar americano (US$)', flag: '🇺🇸' },
  EUR: { sym: '€',   loc: 'de-DE', label: 'Euro (€)',             flag: '🇪🇺' },
  ARS: { sym: '$',   loc: 'es-AR', label: 'Peso argentino (ARS)', flag: '🇦🇷' },
  CLP: { sym: '$',   loc: 'es-CL', label: 'Peso chileno (CLP)',   flag: '🇨🇱' },
  COP: { sym: '$',   loc: 'es-CO', label: 'Peso colombiano (COP)',flag: '🇨🇴' },
  MXN: { sym: '$',   loc: 'es-MX', label: 'Peso mexicano (MXN)', flag: '🇲🇽' },
  PYG: { sym: '₲',   loc: 'es-PY', label: 'Guarani (PYG)',       flag: '🇵🇾' },
  PEN: { sym: 'S/',  loc: 'es-PE', label: 'Sol peruano (PEN)',    flag: '🇵🇪' },
  UYU: { sym: '$U',  loc: 'es-UY', label: 'Peso uruguaio (UYU)', flag: '🇺🇾' },
  GBP: { sym: '£',   loc: 'en-GB', label: 'Libra esterlina (£)', flag: '🇬🇧' },
};
window.VT_IDIOMAS = [
  { value: 'pt-BR', label: 'Português (Brasil)',   flag: '🇧🇷' },
  { value: 'pt-PT', label: 'Português (Portugal)', flag: '🇵🇹' },
  { value: 'es',    label: 'Español',              flag: '🇪🇸' },
  { value: 'es-AR', label: 'Español (Argentina)',  flag: '🇦🇷' },
  { value: 'en',    label: 'English',              flag: '🇺🇸' },
  { value: 'fr',    label: 'Français',             flag: '🇫🇷' },
  { value: 'de',    label: 'Deutsch',              flag: '🇩🇪' },
];
window.VT_DATE_FORMATS = [
  { value: 'dd/mm/yyyy', label: 'DD/MM/AAAA  (31/12/2026)', example: () => { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; } },
  { value: 'mm/dd/yyyy', label: 'MM/DD/AAAA  (12/31/2026)', example: () => { const d = new Date(); return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`; } },
  { value: 'yyyy-mm-dd', label: 'AAAA-MM-DD  (2026-12-31)', example: () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; } },
  { value: 'dd-mm-yyyy', label: 'DD-MM-AAAA  (31-12-2026)', example: () => { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`; } },
  { value: 'dd mmm yyyy', label: 'DD Mmm AAAA (31 Dez 2026)', example: () => new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' }) },
];
window.vtFormatDate = function(dateStr) {
  if (!dateStr) return '';
  const fmt = (window.vtSysCfg && window.vtSysCfg().dataFmt) || 'dd/mm/yyyy';
  const [y, m, d] = String(dateStr).split('-');
  if (!y || !m || !d) return dateStr;
  if (fmt === 'mm/dd/yyyy') return `${m}/${d}/${y}`;
  if (fmt === 'yyyy-mm-dd') return `${y}-${m}-${d}`;
  if (fmt === 'dd-mm-yyyy') return `${d}-${m}-${y}`;
  if (fmt === 'dd mmm yyyy') { try { return new Date(`${y}-${m}-${d}`).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' }); } catch(e) { return dateStr; } }
  return `${d}/${m}/${y}`;
};
window.vtSysCfg = function () { const d = window.VtStore && window.VtStore.getData(); return Object.assign({ idioma: 'pt-BR', moeda: 'BRL', dataFmt: 'dd/mm/yyyy', docStyle: 'classico' }, (d && d.sysCfg) || {}); };
window.vtSaveSysCfg = function (c) { if (window.VtStore) window.VtStore.setData({ sysCfg: c }); window.dispatchEvent(new CustomEvent('vtCfgChanged', { detail: c })); };
/* ---- Formatação global de moeda e data ---- */
window.vtMoney = function(n, decimals) {
  const cfg = window.vtSysCfg ? window.vtSysCfg() : {};
  const code = cfg.moeda || 'BRL';
  const cur = (window.VT_CURRENCIES && window.VT_CURRENCIES[code]) || { loc: 'pt-BR', sym: 'R$' };
  const num = Number(n) || 0;
  const dec = decimals !== undefined ? decimals : 2;
  try {
    return num.toLocaleString(cur.loc, { style: 'currency', currency: code, minimumFractionDigits: dec, maximumFractionDigits: dec });
  } catch(e) {
    return cur.sym + ' ' + num.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
};
window.vtMoney0 = function(n) { return window.vtMoney(n, 0); };
window.vtMoneyFmt = function(n) {
  const cfg = window.vtSysCfg ? window.vtSysCfg() : {};
  const code = cfg.moeda || 'BRL';
  const cur = (window.VT_CURRENCIES && window.VT_CURRENCIES[code]) || { loc: 'pt-BR' };
  return (Number(n) || 0).toLocaleString(cur.loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
window.vtDate = function(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return window.vtFormatDate(s);
  const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return window.vtFormatDate(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`);
  return s;
};
/* ---- Configuração de integrações reais (Google Agenda iCal + WhatsApp) ---- */
window.VT_WA_DEFAULTS = {
  waTplConfirm: 'Olá {tutor}! ✅ Confirmamos o agendamento de {paciente} para {data} às {hora} na {clinica}. Qualquer dúvida, estamos à disposição!',
  waTplLembrete: 'Olá {tutor}! ⏰ Lembrete: {paciente} tem consulta amanhã, {data} às {hora}, na {clinica}. Até logo!',
  waTplPos: 'Olá {tutor}! Obrigado pela visita 🐾 Resumo do atendimento de {paciente} em {data}. Total: {total}. Conte sempre com a {clinica}!',
};
window.vtConfig = function () { const d = window.VtStore && window.VtStore.getData(); return Object.assign({ googleCalendarUrl: '', syncGoogleAgenda: false, whatsappClinica: '', whatsappLembrete: false }, window.VT_WA_DEFAULTS, (d && d.vtConfig) || {}); };
window.vtSaveConfig = function (c) { if (window.VtStore) window.VtStore.setData({ vtConfig: c }); };
window.vtFillTemplate = function (tpl, vars) { return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null && vars[k] !== '') ? vars[k] : m); };
window.vtWaLink = function (numero, msg) { let n = (window.onlyD ? window.onlyD(numero || '') : String(numero || '').replace(/\D/g, '')); if (!n) return null; if (n.length <= 11) n = '55' + n; return 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg || ''); };
window.VT_DOC_STYLES = [
  { id: 'classico', label: 'Clássico', accent: '#14a8a0', desc: 'Linha teal, logo à esquerda' },
  { id: 'navy', label: 'Corporativo', accent: '#16395f', desc: 'Cabeçalho navy, sóbrio' },
  { id: 'minimal', label: 'Minimalista', accent: '#67788c', desc: 'Sem cores, foco no texto' },
  { id: 'centro', label: 'Centralizado', accent: '#e0533c', desc: 'Logo e contato centralizados' },
];
window.vtParceiras = function () { const d = window.VtStore && window.VtStore.getData(); return (d && d.parceiras) || []; };
window.vtSaveParceiras = function (l) { if (window.VtStore) window.VtStore.setData({ parceiras: l }); };

/* ---------------- Clientes / Tutores ---------------- */
/* permissões: usuário logado (mock — admin por padrão) */
window.vtCan = function (perm) {
  const u = (window.VtStore && window.VtStore.currentUser && window.VtStore.currentUser()) || {};
  const perms = u.perms || ['Administrador'];
  if (perms.includes('Administrador')) return true;
  return perms.includes(perm);
};
window.vtIsAdmin = function () { return window.vtCan('Administrador'); };
window.vtIsSecretaria = function () { return window.vtCan('Administrador') || window.vtCan('Secretaria') || window.vtCan('Atendimento'); };

/* ---- código de cliente sequencial (CLI-0001) ---- */
window.vtClienteCode = function (o) {
  if (!o) return 'CLI-0000';
  if (o.code) return o.code;
  const digits = String(o.id || '').replace(/\D/g, '');
  if (digits) return 'CLI-' + digits.slice(-4).padStart(4, '0');
  return 'CLI-0000';
};
window.vtNextClienteCode = function () {
  const d = (window.VtStore && window.VtStore.getData()) || {};
  const owners = d.owners || [];
  const patients = d.patients || [];
  let max = 0;
  const consider = (codeStr, idStr) => {
    const m = /CLI-(\d+)/.exec(codeStr || '');
    if (m) max = Math.max(max, parseInt(m[1], 10) || 0);
    const dg = String(idStr || '').replace(/\D/g, '');
    if (dg) max = Math.max(max, parseInt(dg.slice(-4), 10) || 0);
  };
  // clientes cadastrados
  owners.forEach((o) => consider(o.code, o.id));
  // tutores derivados automaticamente de pacientes (ainda sem cliente cadastrado):
  // o código exibido por vtClienteCode deriva dos dígitos do id do paciente, então
  // precisamos considerá-lo aqui para nunca repetir um CLI já visível na lista.
  patients.forEach((p) => {
    if (p.owner && !owners.some((o) => o.name === p.owner)) consider(null, p.id);
  });
  return 'CLI-' + String(max + 1).padStart(4, '0');
};

/* ---- código de paciente (PAC-0001), derivado do id ---- */
window.vtPacienteCode = function (p) {
  if (!p) return 'PAC-0000';
  if (p.code) return p.code;
  const digits = String(p.id || '').replace(/\D/g, '');
  if (digits) return 'PAC-' + digits.slice(-4).padStart(4, '0');
  return 'PAC-0000';
};

function PropriedadesView({ onBack, patients }) {
  const seed = () => {
    const map = {};
    (patients || []).forEach((p) => {
      if (p.property && p.property.name) { const k = p.property.name; if (!map[k]) map[k] = { ...p.property, id: 'PR-' + Object.keys(map).length }; }
      else if (p.species === 'Cavalo' && p.owner) { const k = p.owner; if (!map[k]) map[k] = { name: k, owner: k, id: 'PR-' + Object.keys(map).length, city: '', phone: '' }; }
    });
    return Object.values(map);
  };
  const [props, setProps] = vtUseState(() => { const d = window.VtStore && window.VtStore.getData(); return (d && d.propriedades) || seed(); });
  const [sel, setSel] = vtUseState(null);
  const [f, setF] = vtUseState(null);
  const persist = (next) => { setProps(next); if (window.VtStore) window.VtStore.setData({ propriedades: next }); };
  const animaisDe = (nome) => (patients || []).filter((p) => (p.property && p.property.name === nome) || p.owner === nome);
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.name || !f.name.trim()) { window.vtToast('Informe o nome da propriedade.', 'err'); return; }
    if (f.id && props.some((x) => x.id === f.id)) persist(props.map((x) => x.id === f.id ? f : x));
    else persist([{ ...f, id: 'PR-' + Date.now().toString(36) }, ...props]);
    setF(null); setSel(null); window.vtToast('Propriedade salva.', 'ok');
  };
  if (sel) {
    const animais = animaisDe(sel.name);
    return (
      <div>
        <button className="vt-back" onClick={() => setSel(null)}><VtIcon name="chevron" size={16} /> Propriedades</button>
        <div className="vt-page-head vt-head-row">
          <div><h1 style={{ margin: 0 }}>{sel.name}</h1><p style={{ margin: '4px 0 0' }}>{sel.owner || 'Propriedade rural'}</p></div>
          <button className="vt-btn-ghost" onClick={() => setF({ ...sel })}><VtIcon name="plus" size={15} /> Editar</button>
        </div>
        <div className="vt-grid" style={{ gridTemplateColumns: '1fr 1.4fr', alignItems: 'start' }}>
          <div className="vt-card vt-sec">
            <h3 className="vt-sec-title">Dados da propriedade</h3>
            <div className="vt-clin-rows">
              <div className="vt-clin-row"><span>Responsável</span><b>{sel.owner || '—'}</b></div>
              <div className="vt-clin-row"><span>Telefone</span><b>{sel.phone || '—'}</b></div>
              <div className="vt-clin-row"><span>Endereço</span><b>{[sel.street, sel.num, sel.city, sel.state].filter(Boolean).join(', ') || '—'}</b></div>
              <div className="vt-clin-row"><span>CEP</span><b>{sel.cep || '—'}</b></div>
            </div>
          </div>
          <div className="vt-card vt-sec">
            <div className="vt-head-row" style={{ marginBottom: 8 }}><h3 className="vt-sec-title" style={{ margin: 0 }}>Animais registrados <span className="vt-count-badge">{animais.length}</span></h3>
              <button className="vt-btn-ghost" onClick={() => window.vtAddAnimalFor(sel.owner || '', sel.name)}><VtIcon name="plus" size={15} /> Novo animal</button></div>
            {animais.length === 0 ? <p className="vt-muted" style={{ fontSize: 13 }}>Nenhum animal vinculado.</p> : (
              <div className="vt-table" style={{ '--cols': 1 }}>
                {animais.map((p) => (
                  <div key={p.id} className="vt-tr" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr' }}>
                    <span className="vt-cell-name"><PetAvatar p={p} /><span><b>{p.name}</b><i className="vt-id">{window.vtPacienteCode ? window.vtPacienteCode(p) : p.id}</i></span></span>
                    <span className="vt-muted">{p.species}</span><span className="vt-muted">{p.breed}</span><span><StatusPill status={p.status} /></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {f && <PropModal f={f} s={s} onClose={() => setF(null)} onSave={save} />}
      </div>
    );
  }
  return (
    <div>
      <div className="vt-page-head vt-head-row">
        <div><h1>Propriedades</h1><p>{props.length} propriedades cadastradas</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="vt-btn-ghost" onClick={onBack}><VtIcon name="chevron" size={16} /> Clientes</button>
          <button className="vt-btn-primary" onClick={() => setF({ name: '', owner: '', phone: '', cep: '', street: '', num: '', district: '', city: '', state: '' })}><VtIcon name="plus" size={17} /> Nova propriedade</button>
        </div>
      </div>
      <div className="vt-card vt-table-card">
        <div className="vt-table" style={{ '--cols': 1 }}>
          <div className="vt-tr vt-th" style={{ gridTemplateColumns: '1.6fr 1.4fr 1fr 0.8fr' }}><span>Propriedade</span><span>Responsável</span><span>Cidade</span><span>Animais</span></div>
          {props.map((pr) => (
            <button key={pr.id} className="vt-tr vt-row-btn" style={{ gridTemplateColumns: '1.6fr 1.4fr 1fr 0.8fr' }} onClick={() => setSel(pr)}>
              <span className="vt-cell-name"><span className="vt-pet-avatar" style={{ background: 'var(--navy)' }}>{pr.name[0]}</span><span><b>{pr.name}</b></span></span>
              <span className="vt-muted">{pr.owner || '—'}</span>
              <span className="vt-muted">{pr.city || '—'}</span>
              <span><span className="vt-tag teal">{animaisDe(pr.name).length}</span></span>
            </button>
          ))}
          {props.length === 0 && <div className="vt-empty-row">Nenhuma propriedade cadastrada.</div>}
        </div>
      </div>
      {f && <PropModal f={f} s={s} onClose={() => setF(null)} onSave={save} />}
    </div>
  );
}
function PropModal({ f, s, onClose, onSave }) {
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
        <h3>{f.id ? 'Editar propriedade' : 'Nova propriedade'}</h3>
        <div className="vt-form-row">
          <VtField label="Nome da propriedade" value={f.name} onChange={s('name')} width="58%" />
          <VtField label="Responsável" value={f.owner} onChange={s('owner')} width="38%" />
        </div>
        <div className="vt-form-row">
          <VtField label="Telefone" value={f.phone} onChange={(v) => s('phone')(window.maskPhone ? window.maskPhone(v) : v)} width="40%" />
          <VtField label="CEP" value={f.cep} onChange={(v) => s('cep')(window.maskCEP ? window.maskCEP(v) : v)} mask="cep" width="26%" />
        </div>
        <div className="vt-form-row">
          <VtField label="Rua" value={f.street} onChange={s('street')} width="58%" />
          <VtField label="Número" value={f.num} onChange={s('num')} width="16%" />
          <VtField label="Bairro" value={f.district} onChange={s('district')} width="20%" />
        </div>
        <div className="vt-form-row">
          <VtField label="Cidade" value={f.city} onChange={s('city')} width="70%" />
          <VtField label="UF" value={f.state} onChange={s('state')} width="24%" />
        </div>
        <div className="fin-modal-actions" style={{ marginTop: 12 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={onSave}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
/* Modal: adicionar animal a um responsável já cadastrado (Bug 3)
   — mesmos campos do cadastro completo de paciente (vt-pacientes) */
function QuickAnimalModal({ ownerName, onClose, onSaved }) {
  const [f, setF] = vtUseState({ species: 'Cão', sex: 'Macho', status: 'Ativo' });
  const isHorse = f.species === 'Cavalo';
  const [err, setErr] = vtUseState('');
  const photoRef = vtUseRef(null);
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const onPhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setF((p) => ({ ...p, photo: reader.result }));
    reader.readAsDataURL(file);
  };
  const save = () => {
    if (!f.name || !f.name.trim()) { setErr('Informe o nome do animal.'); window.vtToast('Informe o nome do animal.', 'err'); return; }
    const d = (window.VtStore && window.VtStore.getData()) || {};
    const pats = d.patients || [];
    const ow = (d.owners || []).find((o) => o.name === ownerName) || {};
    const isHorse = f.species === 'Cavalo';
    const toList = (v) => (v || '').split(',').map((x) => x.trim()).filter(Boolean);
    const patient = {
      id: 'P-' + String(Date.now()).slice(-4), name: f.name.trim(), species: f.species, breed: f.breed || '—',
      sex: f.sex, neutered: !!f.neutered, birth: f.birth || '', weight: f.weight || '', color: f.color || '',
      chip: f.chip || '', rga: f.rga || '', size: f.size || '—', obs: f.obs || '', obsInterna: f.obsInterna || '', status: f.status || 'Ativo',
      asa: f.asa || 'ASA I', risk: f.risk || 'Baixo', photo: f.photo || '#14a8a0', owner: ownerName,
      plan: f.plan || '—', planNum: f.planNum || '', planExp: f.planExp || '',
      allergies: toList(f.allergies), diseases: toList(f.diseases), meds: toList(f.meds),
      cpf: (ow.cpf && ow.cpf !== '—') ? ow.cpf : '', whats: ow.whats || '', phone: (ow.phone && ow.phone !== '—') ? ow.phone : '', phone2: ow.phone2 || '',
      email: (ow.email && ow.email !== '—') ? ow.email : '', ownerBirth: ow.birth || '',
      address: ow.address || null,
      lastVisit: 'Novo', card: '', odontograma: isHorse,
      property: isHorse ? { name: f.propName || '', owner: f.propOwner || '', phone: f.propPhone || '', city: f.propCity || '', state: f.propState || '', street: f.propStreet || '', num: f.propNum || '' } : null,
    };
    let propriedades = d.propriedades || [];
    if (isHorse && f.propName && f.propName.trim()) {
      if (!propriedades.some((pr) => pr.name === f.propName.trim())) {
        propriedades = [{ id: 'PR-' + Date.now().toString(36), name: f.propName.trim(), owner: f.propOwner || ownerName, phone: f.propPhone || '' }, ...propriedades];
      }
    }
    window.VtStore.setData({ patients: [patient, ...pats], propriedades });
    window.vtToast(`${patient.name} adicionado a ${ownerName}.`, 'ok');
    onSaved && onSaved(patient);
    onClose();
  };
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 620 }} onClick={(e) => e.stopPropagation()}>
        <button className="fin-modal-x" onClick={onClose}>×</button>
        <h3>Novo animal</h3>
        <p>Cadastro completo do animal — o responsável já está vinculado.</p>
        <label className="vtf" style={{ width: '100%', marginBottom: 6 }}>
          <span className="vtf-label">Responsável</span>
          <span className="vtf-inputwrap"><input className="vtf-input" value={ownerName} readOnly style={{ background: 'var(--bg)', color: 'var(--muted)', cursor: 'not-allowed' }} /></span>
        </label>

        <div className="vt-form-sec">Foto & identificação</div>
        <div className="vt-form-row" style={{ alignItems: 'center' }}>
          <div className="vt-photo-up" onClick={() => photoRef.current && photoRef.current.click()}>
            {f.photo
              ? <img src={f.photo} alt="foto" className="vt-photo-img" />
              : <span className="vt-photo-ph"><VtIcon name="paw" size={26} /><i>Adicionar foto</i></span>}
            <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhoto} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="vt-form-row" style={{ margin: 0 }}>
              <VtField label="Nome" value={f.name} onChange={s('name')} placeholder="Nome do animal" width="48%" required error={err} />
              <label className="vtf" style={{ width: '24%' }}><span className="vtf-label">Espécie</span>
                <span className="vtf-inputwrap"><select className="vtf-input" value={f.species} onChange={(e) => setF((p) => ({ ...p, species: e.target.value, breed: '', color: '' }))}>
                  {window.vtEspecies().map((e) => <option key={e}>{e}</option>)}</select></span></label>
              <label className="vtf" style={{ width: '24%' }}><span className="vtf-label">Raça</span>
                <span className="vtf-inputwrap"><select className="vtf-input" value={f.breed || ''} onChange={(e) => s('breed')(e.target.value)}>
                  <option value="">Selecione…</option>{window.vtRacas(f.species).map((r) => <option key={r}>{r}</option>)}</select></span></label>
            </div>
            <div className="vt-form-row" style={{ margin: 0 }}>
              <label className="vtf" style={{ width: '24%' }}><span className="vtf-label">Sexo</span>
                <span className="vtf-inputwrap"><select className="vtf-input" value={f.sex} onChange={(e) => s('sex')(e.target.value)}><option>Macho</option><option>Fêmea</option></select></span></label>
              <label className="vtf" style={{ width: '36%' }}><span className="vtf-label">Pelagem / cor</span>
                <span className="vtf-inputwrap"><select className="vtf-input" value={f.color || ''} onChange={(e) => s('color')(e.target.value)}>
                  <option value="">Selecione…</option>{window.vtCores(f.species, f.breed).map((c) => <option key={c}>{c}</option>)}</select></span></label>
              <label className="vtf" style={{ width: '32%', justifyContent: 'flex-end' }}><span className="vtf-label">&nbsp;</span>
                <label className="vt-check-inline"><input type="checkbox" checked={!!f.neutered} onChange={(e) => s('neutered')(e.target.checked)} /> Castrado</label></label>
            </div>
          </div>
        </div>

        <div className="vt-form-row">
          <VtField label="Data de nascimento" value={f.birth} onChange={(v) => s('birth')(window.maskDate ? window.maskDate(v) : v)} placeholder="DD/MM/AAAA" width="22%" />
          <VtField label="Peso" value={f.weight} onChange={s('weight')} mask="weight" placeholder="0,0 kg" width="14%" />
          <label className="vtf" style={{ width: '16%' }}><span className="vtf-label">Porte</span>
            <span className="vtf-inputwrap"><select className="vtf-input" value={f.size || ''} onChange={(e) => s('size')(e.target.value)}>
              <option value="">—</option><option>Mini</option><option>Pequeno</option><option>Médio</option><option>Grande</option><option>Gigante</option></select></span></label>
          <VtField label="Microchip" value={f.chip} onChange={(v) => s('chip')(window.onlyD(v))} placeholder="15 dígitos" width="22%" />
          <VtField label="RGA (RG Animal)" value={f.rga} onChange={s('rga')} placeholder="Registro Geral Animal" width="22%" />
        </div>

        <div className="vt-form-sec">Plano de saúde veterinário</div>
        <div className="vt-form-row">
          <VtField label="Plano de saúde" value={f.plan} onChange={s('plan')} placeholder="Ex.: PetLove, Porto Seguro" width="40%" />
          <VtField label="Número do plano" value={f.planNum} onChange={s('planNum')} placeholder="Nº da carteirinha" width="32%" />
          <VtField label="Validade" value={f.planExp} onChange={(v) => s('planExp')(window.maskDate ? window.maskDate(v) : v)} placeholder="DD/MM/AAAA" width="24%" />
        </div>

        <div className="vt-alert-block">
          <div className="vt-alert-head"><VtIcon name="alert" size={17} /> ALERTAS CLÍNICOS</div>
          <p className="vt-alert-hint" style={{ marginTop: 0 }}>Estes campos ficam em destaque no prontuário e pré-preenchem o atendimento.</p>
          <label className="vtf">
            <span className="vtf-label alert"><VtIcon name="alert" size={15} /> ALERGIAS</span>
            <span className="vtf-inputwrap"><input className="vtf-input" value={f.allergies || ''} onChange={(e) => s('allergies')(e.target.value)} placeholder="Separe por vírgulas. Ex: Dipirona, Carne de Frango" /></span>
          </label>
          <label className="vtf" style={{ marginTop: 10 }}>
            <span className="vtf-label alert"><VtIcon name="alert" size={15} /> DOENÇAS CRÔNICAS</span>
            <span className="vtf-inputwrap"><input className="vtf-input" value={f.diseases || ''} onChange={(e) => s('diseases')(e.target.value)} placeholder="Separe por vírgulas. Ex: Diabetes, Insuficiência Renal" /></span>
          </label>
          <label className="vtf" style={{ marginTop: 10 }}>
            <span className="vtf-label alert"><VtIcon name="alert" size={15} /> MEDICAÇÃO DE USO CONTÍNUO</span>
            <span className="vtf-inputwrap"><input className="vtf-input" value={f.meds || ''} onChange={(e) => s('meds')(e.target.value)} placeholder="Separe por vírgulas. Ex: Enalapril, Insulina" /></span>
          </label>
          <div className="vt-alert-grid">
            <label className="vtf">
              <span className="vtf-label alert"><VtIcon name="alert" size={15} /> RISCO ANESTÉSICO</span>
              <span className="vtf-inputwrap"><select className="vtf-input" value={f.risk || 'Baixo'} onChange={(e) => s('risk')(e.target.value)}>
                <option>Baixo</option><option>Moderado</option><option>Alto</option></select></span>
            </label>
            <label className="vtf">
              <span className="vtf-label alert"><VtIcon name="alert" size={15} /> CLASSIFICAÇÃO ASA</span>
              <span className="vtf-inputwrap"><select className="vtf-input" value={f.asa || 'ASA I'} onChange={(e) => s('asa')(e.target.value)}>
                <option>ASA I — Saudável</option><option>ASA II — Doença leve</option><option>ASA III — Doença moderada/grave</option><option>ASA IV — Ameaça à vida</option><option>ASA V — Moribundo</option></select></span>
            </label>
          </div>
        </div>

        {isHorse && (
          <>
            <div className="vt-form-sec">🐴 Propriedade (equino)</div>
            <div className="vt-form-row">
              <VtField label="Nome da propriedade" value={f.propName || ''} onChange={s('propName')} placeholder="Ex.: Haras Bela Vista" width="48%" />
              <VtField label="Proprietário" value={f.propOwner || ''} onChange={s('propOwner')} placeholder="Responsável" width="48%" />
            </div>
            <div className="vt-form-row">
              <VtField label="Telefone" value={f.propPhone || ''} onChange={(v) => s('propPhone')(window.maskPhone ? window.maskPhone(v) : v)} placeholder="(00) 00000-0000" width="30%" />
              <VtField label="Cidade" value={f.propCity || ''} onChange={s('propCity')} width="44%" />
              <VtField label="UF" value={f.propState || ''} onChange={s('propState')} width="20%" />
            </div>
            <div className="vt-form-row">
              <VtField label="Endereço" value={f.propStreet || ''} onChange={s('propStreet')} width="74%" />
              <VtField label="Número" value={f.propNum || ''} onChange={s('propNum')} width="22%" />
            </div>
          </>
        )}

        <div className="vt-form-row" style={{ marginTop: 10 }}>
          <label className="vtf" style={{ width: '52%' }}><span className="vtf-label">Observações gerais / histórico cirúrgico</span>
            <span className="vtf-inputwrap"><textarea className="vtf-input" style={{ minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }} value={f.obs || ''} onChange={(e) => s('obs')(e.target.value)} placeholder="Cirurgias prévias, condições especiais, anotações…" /></span></label>
          <label className="vtf" style={{ width: '44%' }}><span className="vtf-label">Observação interna (só equipe)</span>
            <span className="vtf-inputwrap"><textarea className="vtf-input" style={{ minHeight: 70, resize: 'vertical', fontFamily: 'inherit', background: '#fcfce8' }} value={f.obsInterna || ''} onChange={(e) => s('obsInterna')(e.target.value)} placeholder="Anotações visíveis apenas para a equipe da clínica…" /></span></label>
        </div>

        <div className="fin-modal-actions" style={{ marginTop: 12 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={save}><VtIcon name="plus" size={16} /> Salvar animal</button>
        </div>
      </div>
    </div>
  );
}

function ClientesModule({ focusOwnerName, clearFocus, openPatient }) {
  const [tab, setClTab] = vtUseState('clientes');
  const [q, setQ] = vtUseState('');
  const [cliLayout, setCliLayout] = vtUseState('grid');
  const [cliTipo, setCliTipo] = vtUseState('Todos');
  const [cliSort, setCliSort] = vtUseState('nome');
  const [tick, setTick] = vtUseState(0);
  const [addAnimal, setAddAnimal] = vtUseState(null);
  const [owners, setOwners] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.owners) || [];
  });
  const [modal, setModal] = vtUseState(false);
  const [profile, setProfile] = vtUseState(null);
  const [f, setF] = vtUseState({ type: 'PF' });
  const patients = (() => { const d = window.VtStore && window.VtStore.getData(); return (d && d.patients) || []; })();
  // inclui automaticamente tutores que vieram do cadastro de pacientes
  const merged = (() => {
    const out = owners.slice();
    patients.forEach((p) => {
      if (p.owner && !out.some((o) => o.name === p.owner)) {
        out.push({ id: 'C-auto-' + p.id, name: p.owner, cpf: p.cpf || '—', phone: p.phone || p.whats || '—', phone2: p.phone2 || '', whats: p.whats || '', email: p.email || '—', city: (p.address && p.address.city) || '—', birth: p.ownerBirth || '', address: p.address || null, type: 'PF', _fromPatient: true });
      }
    });
    return out;
  })();
  const petsOf = (o) => patients.filter((p) => p.owner === o.name);
  const persist = (next) => { setOwners(next); if (window.VtStore) window.VtStore.setData({ owners: next }); };
  const list = merged
    .filter((o) => {
      const code = window.vtClienteCode ? window.vtClienteCode(o) : '';
      const hay = [o.name, code, o.cpf].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q.toLowerCase().trim())
        && (cliTipo === 'Todos' || (o.type || 'PF') === cliTipo);
    })
    .sort((a, b) => cliSort === 'animais' ? (petsOf(b).length - petsOf(a).length) : a.name.localeCompare(b.name));
  const add = () => {
    if (!f.name || !f.name.trim()) { window.vtToast('Informe o nome do responsável.', 'err'); return; }
    if (f.id && !f._fromPatient) { persist(owners.map((o) => o.id === f.id ? { ...o, ...f } : o)); window.vtToast('Responsável atualizado.', 'ok'); }
    else if (f._fromPatient) { persist([{ ...f, id: 'C-' + String(Date.now()).slice(-3), code: window.vtNextClienteCode(), _fromPatient: false }, ...owners]); window.vtToast('Responsável atualizado.', 'ok'); }
    else { const o = { id: 'C-' + String(Date.now()).slice(-3), code: window.vtNextClienteCode(), name: f.name.trim(), cpf: f.cpf || '—', phone: f.phone || '—', phone2: f.phone2 || '', whats: f.whats || '', email: f.email || '—', city: (f.address && f.address.city) || f.city || '—', birth: f.birth || '', address: f.address || null, obs: f.obs || '', pets: 0, type: f.type }; persist([o, ...owners]); window.vtToast(`Responsável ${o.name} cadastrado · ${o.code}.`, 'ok'); }
    setModal(false); setF({ type: 'PF' });
  };
  const del = (o) => { if (!window.vtIsAdmin()) { window.vtToast('Apenas administrador pode excluir.', 'err'); return; } persist(owners.filter((x) => x.id !== o.id)); setProfile(null); window.vtToast('Responsável excluído.', 'ok'); };
  const edit = (o) => { if (!window.vtIsSecretaria()) { window.vtToast('Sem permissão para editar.', 'err'); return; } setProfile(null); setF({ ...o }); setModal(true); };

  // foco vindo da busca global → abrir perfil do responsável
  vtUseEffect(() => {
    if (!focusOwnerName) return;
    const o = merged.find((x) => x.name === focusOwnerName);
    if (o) setProfile(o);
    if (clearFocus) clearFocus();
  }, [focusOwnerName]);

  if (profile) {
    const pets = petsOf(profile);
    const ats = (() => { const d = window.VtStore && window.VtStore.getData(); return (d && d.atendimentos) || []; })();
    const allPetIds = pets.map((p) => p.id);
    const allPetNames = pets.map((p) => p.name);
    const visits = ats.filter((a) => allPetIds.includes(a.patientId) || allPetNames.includes(a.patient)).sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    const money = (n) => window.vtMoney(n);
    const valOf = (a) => (Number(a.valorTotal) || Number(a.total) || 0) + ((a.procedimentos || []).reduce((x, pr) => x + (Number(pr.valor) || Number(pr.price) || 0), 0));
    const totalGasto = visits.reduce((sum, a) => sum + valOf(a), 0);
    const ticketMedio = visits.length ? totalGasto / visits.length : 0;
    const ultimaVisita = visits.length ? visits[0].date : null;
    const petName = (a) => { const pp = pets.find((x) => x.id === a.patientId || x.name === a.patient); return pp ? pp.name : (a.patient || '—'); };
    const whatsNum = (profile.whats && profile.whats !== '—') ? profile.whats : '';
    const telNum = (profile.phone && profile.phone !== '—') ? profile.phone : '';
    const outroNum = (profile.phone2 && profile.phone2 !== '—') ? profile.phone2 : '';

    // Transações financeiras pendentes vinculadas a este tutor
    const finData = (() => { const d = window.VtStore && window.VtStore.getData(); return (d && d.fin) || {}; })();
    const allTx = finData.tx || [];
    const clientTx = allTx.filter((t) => allPetIds.includes(t.patientId) || allPetNames.includes(t.patient) || t.owner === profile.name || t.clientId === profile.id);
    const pendente = clientTx.filter((t) => !t.pago && (t.tipo === 'receita' || !t.tipo)).reduce((s, t) => s + (Number(t.valor) || 0), 0);
    const totalPago = clientTx.filter((t) => t.pago).reduce((s, t) => s + (Number(t.valor) || 0), 0);
    const txPendentes = clientTx.filter((t) => !t.pago && (t.tipo === 'receita' || !t.tipo));

    // Status financeiro
    const statusFin = pendente === 0 ? 'em-dia' : pendente > 500 ? 'inadimplente' : 'pendente';
    const statusFinLabel = { 'em-dia': 'Em dia ✓', pendente: 'Pendente', inadimplente: 'Inadimplente' }[statusFin];
    const statusFinColor = { 'em-dia': 'var(--green)', pendente: 'var(--amber)', inadimplente: 'var(--red)' }[statusFin];
    const statusFinBg = { 'em-dia': '#f0fdf4', pendente: '#fffbeb', inadimplente: '#fef2f2' }[statusFin];

    // Classificação de lealdade
    const parseDate = (str) => { try { const p = (str || '').split('/'); return new Date(p[2], p[1] - 1, p[0]); } catch(e) { return null; } };
    const diasSemVisita = ultimaVisita ? Math.round((Date.now() - (parseDate(ultimaVisita) || new Date()).getTime()) / 86400000) : 999;
    const visitasUltimo12m = visits.filter((v) => { const d = parseDate(v.date); return d && (Date.now() - d.getTime()) < 365 * 86400000; }).length;
    const classificacao = (diasSemVisita > 180 && visits.length > 0) ? 'Inativo' :
      (totalGasto > 2000 || pets.length >= 3) ? 'VIP' :
      visitasUltimo12m >= 3 ? 'Frequente' :
      visits.length === 0 ? 'Novo' : 'Regular';
    const classStyle = { VIP: ['#7c3aed', '#f5f3ff', '👑'], Frequente: ['var(--teal-d)', 'var(--teal-t)', '⭐'], Regular: ['var(--green)', '#f0fdf4', '✓'], Novo: ['var(--amber)', '#fffbeb', '🐾'], Inativo: ['#6b7280', '#f3f4f6', '💤'] };
    const [clColor, clBg, clIcon] = classStyle[classificacao] || ['#6b7280', '#f3f4f6', ''];

    // Gastos mensais últimos 6 meses (sparkbar)
    const now6 = new Date();
    const monthlySpend = Array.from({ length: 6 }, (_, i) => {
      const mo = new Date(now6.getFullYear(), now6.getMonth() - (5 - i), 1);
      const label = mo.toLocaleDateString('pt-BR', { month: 'short' });
      const val = visits.filter((v) => { const d = parseDate(v.date); return d && d.getFullYear() === mo.getFullYear() && d.getMonth() === mo.getMonth(); }).reduce((s, v) => s + valOf(v), 0);
      return { label, val };
    });
    const maxM = Math.max(...monthlySpend.map((m) => m.val), 1);

    return (
      <div>
        <button className="vt-back" onClick={() => setProfile(null)}><VtIcon name="chevron" size={16} /> Responsáveis</button>
        <div className="vt-page-head vt-head-row">
          <div className="vt-cell-name" style={{ gap: 14 }}>
            <span className="vt-pet-avatar" style={{ width: 52, height: 52, fontSize: 20, flex: 'none', background: profile.type === 'PJ' ? '#16395f' : '#14a8a0' }}>{profile.name[0]}</span>
            <div>
              <h1 style={{ margin: 0, lineHeight: 1.15 }}>{profile.name}</h1>
              <p style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                {profile.type === 'PJ' ? 'Pessoa jurídica' : 'Tutor'} · <b className="vt-cli-code inline">{window.vtClienteCode(profile)}</b>
                <span style={{ background: clBg, color: clColor, fontWeight: 700, fontSize: 12, padding: '2px 10px', borderRadius: 20, border: '1.5px solid ' + clColor }}>{clIcon} {classificacao}</span>
                <span style={{ background: statusFinBg, color: statusFinColor, fontWeight: 700, fontSize: 12, padding: '2px 10px', borderRadius: 20, border: '1.5px solid ' + statusFinColor }}>{statusFinLabel}</span>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="vt-btn-ghost" onClick={() => edit(profile)}><VtIcon name="plus" size={15} /> Editar</button>
            {window.vtIsAdmin() && <button className="vt-btn-ghost" style={{ color: 'var(--red)' }} onClick={() => del(profile)}>Excluir</button>}
          </div>
        </div>

        {/* KPI financeiros */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total gasto', value: money(totalGasto), color: 'var(--teal-d)', icon: '💰' },
            { label: 'Ticket médio / visita', value: money(ticketMedio), color: 'var(--navy)', icon: '📊' },
            { label: 'Saldo pendente', value: money(pendente), color: pendente > 0 ? statusFinColor : 'var(--green)', icon: pendente > 0 ? '⚠️' : '✓' },
            { label: 'Última visita', value: ultimaVisita || '—', color: diasSemVisita > 180 ? 'var(--red)' : 'var(--ink)', icon: '📅' },
          ].map((k) => (
            <div key={k.label} className="vt-card" style={{ padding: '14px 18px', borderTop: '3px solid ' + k.color }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{k.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: k.color, lineHeight: 1.1 }}>{k.value}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div className="vt-grid" style={{ gridTemplateColumns: '1fr 1.4fr', alignItems: 'start' }}>
          <div className="vt-card vt-sec">
            <h3 className="vt-sec-title">Dados do cliente</h3>
            <div className="vt-clin-rows">
              <div className="vt-clin-row"><span>Código do cliente</span><b className="vt-cli-code inline">{window.vtClienteCode(profile)}</b></div>
              <div className="vt-clin-row"><span>CPF / CNPJ</span><b>{profile.cpf}</b></div>
              <div className="vt-clin-row"><span>WhatsApp</span><b>{whatsNum || '—'}</b></div>
              <div className="vt-clin-row"><span>Telefone</span><b>{telNum || '—'}</b></div>
              {outroNum && <div className="vt-clin-row"><span>Outro telefone</span><b>{outroNum}</b></div>}
              <div className="vt-clin-row"><span>Email</span><b>{profile.email}</b></div>
              {profile.birth && <div className="vt-clin-row"><span>Nascimento</span><b>{profile.birth}</b></div>}
              <div className="vt-clin-row"><span>Cidade</span><b>{profile.city}</b></div>
              {profile.address && (profile.address.street || profile.address.cep) && <div className="vt-clin-row"><span>Endereço</span><b style={{ fontSize: 12 }}>{[profile.address.street, profile.address.num, profile.address.complement, profile.address.district, profile.address.city, profile.address.state].filter(Boolean).join(', ')}{profile.address.cep ? ' · CEP ' + profile.address.cep : ''}</b></div>}
              <div className="vt-clin-row"><span>Visitas (12 meses)</span><b style={{ color: 'var(--teal-d)' }}>{visitasUltimo12m} visitas</b></div>
              <div className="vt-clin-row"><span>Classificação</span><b><span style={{ background: clBg, color: clColor, fontWeight: 700, fontSize: 12, padding: '1px 10px', borderRadius: 20 }}>{clIcon} {classificacao}</span></b></div>
              <div className="vt-clin-row"><span>Status financeiro</span><b><span style={{ background: statusFinBg, color: statusFinColor, fontWeight: 700, fontSize: 12, padding: '1px 10px', borderRadius: 20 }}>{statusFinLabel}</span></b></div>
              {profile.obs && <div className="vt-clin-row"><span>Observações</span><b style={{ fontWeight: 500 }}>{profile.obs}</b></div>}
            </div>

            {/* Gastos por mês - sparkbars */}
            <div style={{ marginTop: 16, borderTop: '1px solid #eef1f5', paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Gastos — últimos 6 meses</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
                {monthlySpend.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', background: m.val > 0 ? 'var(--teal)' : '#e5e7eb', borderRadius: '4px 4px 0 0', height: Math.max(4, Math.round((m.val / maxM) * 44)) + 'px', transition: 'height 0.4s' }} title={window.vtMoney(m.val)} />
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="vt-card vt-sec">
            <div className="vt-head-row" style={{ marginBottom: 8 }}>
              <h3 className="vt-sec-title" style={{ margin: 0 }}>Animais vinculados <span className="vt-count-badge">{pets.length}</span></h3>
              <button className="vt-btn-ghost" onClick={() => setAddAnimal(profile.name)}><VtIcon name="plus" size={15} /> Novo animal</button>
            </div>
            {pets.length === 0 ? <p className="vt-muted" style={{ fontSize: 13 }}>Nenhum animal cadastrado para este cliente.</p> : (
              <div className="vt-table" style={{ '--cols': 1 }}>
                {pets.map((p) => (
                  <button key={p.id} className="vt-tr vt-row-btn vt-owner-pet" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr 18px' }} onClick={() => openPatient && openPatient(p.id)} title={`Abrir ficha de ${p.name}`}>
                    <span className="vt-cell-name"><PetAvatar p={p} /><span><b>{p.name}</b><i className="vt-id">{window.vtPacienteCode ? window.vtPacienteCode(p) : p.id}</i></span></span>
                    <span className="vt-muted">{p.species}</span>
                    <span className="vt-muted">{p.breed}</span>
                    <span><StatusPill status={p.status} /></span>
                    <VtIcon name="chevron" size={15} />
                  </button>
                ))}
              </div>
            )}

            {/* Pendências financeiras */}
            {txPendentes.length > 0 && (
              <div style={{ marginTop: 16, borderTop: '1px solid #eef1f5', paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>⚠️ Pendências financeiras</div>
                <div className="vt-clin-rows">
                  {txPendentes.slice(0, 5).map((t, i) => (
                    <div key={t.id || i} className="vt-clin-row" style={{ background: '#fffbeb', borderRadius: 8, padding: '6px 10px' }}>
                      <span style={{ fontSize: 13 }}>{t.desc || t.description || 'Cobrança'}{t.date ? ' · ' + t.date : ''}</span>
                      <b style={{ color: 'var(--amber)' }}>{money(Number(t.valor) || 0)}</b>
                    </div>
                  ))}
                  {txPendentes.length > 5 && <div className="vt-muted" style={{ fontSize: 12, textAlign: 'center', paddingTop: 4 }}>+ {txPendentes.length - 5} pendências</div>}
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef2f2', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>Total pendente</span>
                  <b style={{ color: 'var(--red)', fontSize: 15 }}>{money(pendente)}</b>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="vt-card vt-sec" style={{ marginTop: 16 }}>
          <h3 className="vt-sec-title">Histórico de visitas <span className="vt-count-badge">{visits.length}</span></h3>
          {visits.length === 0 ? <p className="vt-muted" style={{ fontSize: 13 }}>Nenhuma visita registrada para os animais deste responsável.</p> : (
            <div className="vt-clin-rows">
              {visits.slice(0, 12).map((a, i) => (
                <div key={a.id || i} className="vt-clin-row">
                  <span>{a.date || '—'} · <b style={{ color: 'var(--ink)' }}>{petName(a)}</b> · {a.type || a.procedure || 'Atendimento'}{a.vet ? ' · ' + String(a.vet).replace('M.V. ', '') : ''}</span>
                  <b>{valOf(a) ? money(valOf(a)) : ''}</b>
                </div>
              ))}
            </div>
          )}
        </div>
        {addAnimal && <QuickAnimalModal ownerName={addAnimal} onClose={() => setAddAnimal(null)} onSaved={() => { setTick((t) => t + 1); }} />}
      </div>
    );
  }
  if (tab === 'propriedades') return <PropriedadesView onBack={() => setClTab('clientes')} patients={patients} />;
  return (
    <div>
      <div className="vt-page-head vt-head-row">
        <div><h1>Responsáveis</h1><p>{merged.length} responsáveis cadastrados</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="vt-btn-ghost" onClick={() => setClTab('propriedades')}><VtIcon name="paw" size={16} /> Propriedades</button>
          <button className="vt-btn-primary" onClick={() => { setF({ type: 'PF' }); setModal(true); }}><VtIcon name="plus" size={17} /> Novo responsável</button>
        </div>
      </div>
      <div className="vt-toolbar-row" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="vt-search inline"><VtIcon name="search" size={17} /><input placeholder="Buscar por nome ou CPF/CNPJ..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <label className="vtf" style={{ flex: 'none', width: 150 }}><span className="vtf-inputwrap"><select className="vtf-input" value={cliTipo} onChange={(e) => setCliTipo(e.target.value)}>{['Todos', 'PF', 'PJ'].map((s) => <option key={s} value={s}>{s === 'PF' ? 'Pessoa física' : s === 'PJ' ? 'Pessoa jurídica' : 'Todos os tipos'}</option>)}</select></span></label>
        <label className="vtf" style={{ flex: 'none', width: 170 }}><span className="vtf-inputwrap"><select className="vtf-input" value={cliSort} onChange={(e) => setCliSort(e.target.value)}><option value="nome">Ordenar: Nome (A-Z)</option><option value="animais">Ordenar: Mais animais</option></select></span></label>
        <div className="vt-viewtoggle">
          <button className={cliLayout === 'grid' ? 'on' : ''} onClick={() => setCliLayout('grid')} title="Grade"><VtIcon name="grid" size={16} /></button>
          <button className={cliLayout === 'list' ? 'on' : ''} onClick={() => setCliLayout('list')} title="Lista"><VtIcon name="receipt" size={16} /></button>
        </div>
      </div>

      {cliLayout === 'grid' ? (
        <div className="vt-pat-grid">
          {list.map((o) => {
            const np = petsOf(o).length;
            const isPJ = o.type === 'PJ';
            const whats = o.whats || ((o.phone && o.phone !== '—') ? o.phone : '');
            return (
              <div key={o.id} className="vt-card vt-pat-card">
                <button className="vt-pat-card-main" onClick={() => setProfile(o)}>
                  <span className="vt-pat-emoji" style={{ background: isPJ ? '#16395f' : 'var(--teal)' }}>
                    {(o.name[0] || '?').toUpperCase()}
                    <span className="vt-pat-emoji-badge">{isPJ ? '🏢' : '👤'}</span>
                  </span>
                  <span className="vt-pat-info">
                    <b>{o.name} <span className="vt-pill" style={{ color: isPJ ? '#16395f' : 'var(--teal-d)', background: isPJ ? '#e6edf5' : 'var(--teal-t, #e0f7f2)' }}>{isPJ ? 'PJ' : 'Tutor'}</span></b>
                    <span className="vt-cli-code">{window.vtClienteCode(o)}</span>
                    <i>{o.cpf && o.cpf !== '—' ? o.cpf : 'CPF/CNPJ não informado'}</i>
                    <span className="vt-pat-sub"><VtIcon name="phone" size={12} /> {whats || '—'}</span>
                    <span className="vt-pat-sub"><VtIcon name="mail" size={12} /> {o.email && o.email !== '—' ? o.email : '—'}</span>
                  </span>
                </button>
                <div className="vt-cli-card-foot">
                  <span className="vt-tag teal">{np} {np === 1 ? 'animal' : 'animais'}</span>
                  <div className="vt-cli-actions">
                    <button className="vt-link" onClick={() => setProfile(o)} title="Ver detalhes">Ver</button>
                    <button className="vt-link" onClick={() => edit(o)} title="Editar">Editar</button>
                    <button className="vt-link" onClick={() => setProfile(o)} title="Ver pacientes vinculados"><VtIcon name="paw" size={13} /> Animais</button>
                    <button className="pr-del-btn" onClick={() => del(o)} title="Excluir">✕</button>
                  </div>
                </div>
              </div>
            );
          })}
          {list.length === 0 && <div className="vt-empty-row">Nenhum responsável encontrado.</div>}
        </div>
      ) : (
      <div className="vt-card vt-table-card">
        <div className="vt-table cols-5">
          <div className="vt-tr vt-th"><span>Tutor</span><span>CPF / CNPJ</span><span>Telefone</span><span>Cidade</span><span>Animais</span></div>
          {list.map((o) => (
            <button key={o.id} className="vt-tr vt-row-btn" onClick={() => setProfile(o)}>
              <span className="vt-cell-name"><span className="vt-pet-avatar" style={{ background: o.type === 'PJ' ? '#16395f' : '#14a8a0' }}>{o.name[0]}</span><span><b>{o.name}</b><i className="vt-id">{window.vtClienteCode(o)}</i></span></span>
              <span className="vt-muted">{o.cpf}</span>
              <span>{o.phone}</span>
              <span className="vt-muted">{o.city}</span>
              <span><span className="vt-tag teal">{petsOf(o).length} {petsOf(o).length === 1 ? 'animal' : 'animais'}</span></span>
            </button>
          ))}
          {list.length === 0 && <div className="vt-empty-row">Nenhum responsável encontrado.</div>}
        </div>
      </div>
      )}
      {modal && (
        <div className="fin-modal-bg" onClick={() => setModal(false)}>
          <div className="fin-modal" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
            <button className="fin-modal-x" onClick={() => setModal(false)}>×</button>
            <h3>{f.id ? 'Editar responsável' : 'Novo responsável'}</h3>
            <div className="vt-form-row">
              <VtField label="Nome / Razão social" value={f.name} onChange={(v) => setF({ ...f, name: v })} width="100%" required />
            </div>
            <div className="vt-form-row">
              <VtField label="CPF / CNPJ" value={f.cpf} onChange={(v) => setF({ ...f, cpf: (window.onlyD(v).length > 11 ? window.maskCNPJ(v) : window.maskCPF(v)) })} width="48%" />
              <VtField label="WhatsApp (mensagens automáticas)" value={f.whats} onChange={(v) => setF({ ...f, whats: window.maskPhone(v) })} width="48%" />
            </div>
            <div className="vt-form-row">
              <VtField label="Telefone" value={f.phone} onChange={(v) => setF({ ...f, phone: window.maskPhone(v) })} placeholder="(00) 00000-0000" width="48%" />
              <VtField label="Outro telefone" value={f.phone2} onChange={(v) => setF({ ...f, phone2: window.maskPhone(v) })} placeholder="(00) 00000-0000" width="48%" />
            </div>
            <div className="vt-form-row">
              <VtEmailField label="Email" value={f.email} onChange={(v) => setF({ ...f, email: v })} width="60%" />
              <VtField label="Nascimento" value={f.birth} onChange={(v) => setF({ ...f, birth: window.maskDate ? window.maskDate(v) : v })} placeholder="DD/MM/AAAA" width="36%" />
            </div>
            <div className="vt-form-row">
              <VtField label="Cidade" value={f.city} onChange={(v) => setF({ ...f, city: v })} width="100%" />
            </div>
            <VtAddress value={f.address} onChange={(addr) => setF((p) => ({ ...p, address: addr, city: addr.city || p.city }))} label="Endereço completo" />
            <label className="vtf" style={{ width: '100%' }}><span className="vtf-label">Observações</span><span className="vtf-inputwrap"><textarea className="vtf-input" style={{ minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }} value={f.obs || ''} onChange={(e) => setF({ ...f, obs: e.target.value })} placeholder="Preferências de contato, histórico, anotações..." /></span></label>
            <div className="fin-modal-actions" style={{ marginTop: 8 }}>
              <button className="vt-btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="vt-btn-primary" onClick={add}>{f.id ? 'Salvar' : 'Salvar cliente'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Agenda (calendário com datas) ---------------- */
const AG_COLORS = { teal: '#14a8a0', navy: '#16395f', red: '#e0533c', amber: '#e2912a', green: '#1fa971', purple: '#8b5cf6', pink: '#d6336c', blue: '#2563eb', brown: '#92633b', gray: '#67788c' };
const AG_COLOR_BG = { teal: '#e2f4f3', navy: '#e6edf4', red: '#fbe7e3', amber: '#fbefdc', green: '#e3f6ec', purple: '#efe9fd', pink: '#fbe4ee', blue: '#e6eeff', brown: '#f0e8df', gray: '#eef1f5' };
/* cor por espécie (segue a imagem de referência) */
function agSpeciesGroup(sp) {
  const s = (sp || '').toLowerCase();
  if (/gato|felin/.test(s)) return 'Felino';
  if (/cavalo|equ|égua|egua|potr/.test(s)) return 'Equino';
  if (/c[ãa]o|cachorr|canin/.test(s)) return 'Canino';
  return 'Outros';
}
const AG_SPECIES_COLOR = { Equino: 'navy', Canino: 'teal', Felino: 'blue', Outros: 'amber' };
function agColorFor(a) {
  // prioriza cor explícita; senão deriva da espécie do paciente
  if (a.color) return a.color;
  const p = ((window.VtStore && window.VtStore.getData()) || {}).patients || [];
  const pat = p.find((x) => x.name === a.patient);
  return AG_SPECIES_COLOR[agSpeciesGroup(pat ? pat.species : a.species)] || 'teal';
}
const AG_STATUS = { Confirmado: 'green', Pendente: 'amber', 'Em andamento': 'blue', Cancelado: 'red', Realizado: 'navy' };
const AG_DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const AG_DOW_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const AG_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
function agISO(d) { return d.toISOString().slice(0, 10); }
function agStartOfWeek(d) { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; }
function agAddDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmtH(h) { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return `${String(hh).padStart(2, '0')}:${mm ? String(mm).padStart(2, '0') : '00'}`; }

/* endereço de visita externa (equino → propriedade; demais → endereço do tutor) */
function agAddrOf(appt) {
  const data = (window.VtStore && window.VtStore.getData()) || {};
  const pat = (data.patients || []).find((p) => p.name === appt.patient);
  if (!pat) return null;
  const a = (pat.species === 'Cavalo' && pat.property) ? pat.property : (pat.address || {});
  const parts = [a.street, a.num, a.district, a.city, a.state].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}
/* monta a rota do dia (visitas externas) no Google Maps, partindo e retornando à clínica */
function agRotaDoDia(dayAppts) {
  const stops = [];
  dayAppts
    .filter((a) => a.status !== 'Cancelado')
    .sort((a, b) => a.start - b.start)
    .forEach((a) => { const ad = (a.endereco && a.endereco.trim()) || agAddrOf(a); if (ad && !stops.includes(ad)) stops.push(ad); });
  if (!stops.length) return null;
  const clin = ((window.VtStore && window.VtStore.getData()) || {}).clinic || {};
  const ca = clin.addr || {};
  const origin = [ca.street, ca.num, ca.city, ca.state].filter(Boolean).join(', ');
  const all = origin ? [origin, ...stops, origin] : stops;
  return 'https://www.google.com/maps/dir/' + all.map(encodeURIComponent).join('/');
}
/* link de criação de evento no Google Calendar a partir de um agendamento */
function agGCalUrl(ev) {
  const data = (window.VtStore && window.VtStore.getData()) || {};
  const pat = (data.patients || []).find((p) => p.name === ev.patient) || {};
  const pad = (n) => String(n).padStart(2, '0');
  const d = (ev.date || agISO(new Date())).replace(/-/g, '');
  const sh = Math.floor(ev.start), sm = Math.round((ev.start - sh) * 60);
  const e0 = ev.start + (ev.dur || 1), eh = Math.floor(e0), em = Math.round((e0 - eh) * 60);
  const start = `${d}T${pad(sh)}${pad(sm)}00`, end = `${d}T${pad(eh)}${pad(em)}00`;
  const text = `${ev.kind || 'Atendimento'} — ${ev.patient}`;
  const details = `Paciente: ${ev.patient}${pat.species ? ' (' + pat.species + ')' : ''}\nTutor: ${pat.owner || '—'}\nVeterinário: ${ev.vet || '—'}\n${ev.obs || ''}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${start}/${end}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(ev.local || 'Clínica própria')}`;
}

function AgendaModule({ focusNewPatient, clearAgendaFocus, onIniciarAtendimento }) {
  const D = window.VtData;
  const CT = window.vtConsults();
  const [appts, setAppts] = vtUseState(() => { const d = window.VtStore && window.VtStore.getData(); return (d && d.agendaAppts) || []; });
  const [modal, setModal] = vtUseState(null);
  const [view, setView] = vtUseState('semana');
  const [cursor, setCursor] = vtUseState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [sel, setSel] = vtUseState(null);
  const [fEsp, setFEsp] = vtUseState({});
  const [fVet, setFVet] = vtUseState({});
  const [fSt, setFSt] = vtUseState({});
  const [routeOpen, setRouteOpen] = vtUseState(false);
  const [gcalOn, setGcalOn] = vtUseState(false);
  const [gcalEmail, setGcalEmail] = vtUseState('');
  const [gcalEvents, setGcalEvents] = vtUseState([]);
  const persist = (list) => { setAppts(list); if (window.VtStore) window.VtStore.setData({ agendaAppts: list }); };
  const save = (ev) => {
    const isEdit = ev.id && appts.some((a) => a.id === ev.id);
    const rec = isEdit ? ev : { ...ev, id: 'AP' + Date.now().toString(36) };
    const baseList = isEdit ? appts.map((a) => a.id === rec.id ? rec : a) : [...appts, rec];
    persist(baseList);
    setModal(null); window.vtToast('Agendamento salvo.', 'ok');
    // Integração leve (Configurações › Integrações): abre o evento no Google Agenda ao criar
    const vcfg = window.vtConfig ? window.vtConfig() : {};
    if (!isEdit && vcfg.syncGoogleAgenda && rec.patient) {
      try { window.open(agGCalUrl(rec), '_blank', 'noopener'); } catch (e) {}
    }
    // WhatsApp — confirmação disponível manualmente no painel de detalhes do agendamento
    // (não abre automaticamente; tutor escolhe quando enviar)
    // sincroniza com o Google Calendar quando conectado (cria ou atualiza)
    if (gcalOn && window.VtGCal && rec.patient && !rec._gcal) {
      const op = rec.gcalId ? window.VtGCal.updateEvent(rec) : window.VtGCal.createEvent(rec);
      op.then((res) => {
        if (res && res.id && res.id !== rec.gcalId) {
          persist(baseList.map((a) => a.id === rec.id ? { ...rec, gcalId: res.id } : a));
        }
        window.vtToast(rec.gcalId ? 'Evento atualizado no Google Calendar.' : 'Evento criado no Google Calendar.', 'ok');
        fetchGcal();
      }).catch(() => window.vtToast('Salvo localmente, mas falhou ao sincronizar com o Google Calendar.', 'err'));
    }
  };
  const del = (id) => {
    const appt = appts.find((a) => a.id === id);
    persist(appts.filter((a) => a.id !== id)); setModal(null); setSel(null);
    window.vtToast('Agendamento removido.', 'ok');
    // remove também do Google Calendar quando conectado
    if (gcalOn && window.VtGCal && appt && appt.gcalId) {
      window.VtGCal.deleteEvent(appt.gcalId).then(() => { window.vtToast('Evento removido do Google Calendar.', 'ok'); fetchGcal(); }).catch(() => {});
    }
  };
  const setStatus = (id, status) => { const next = appts.map((a) => a.id === id ? { ...a, status } : a); persist(next); setSel((s) => s && s.id === id ? { ...s, status } : s); };
  const agCfg = window.vtAgendaCfg ? window.vtAgendaCfg() : (window.VT_AGENDA_CFG_DEFAULT || {});
  const agSlotHours = Math.max(0.25, (agCfg.slotMin || 30) / 60);
  const agStartH = parseInt((agCfg.startTime || '08:00').split(':')[0], 10);
  const agEndH   = parseInt((agCfg.endTime   || '18:00').split(':')[0], 10);
  const agHolidays = agCfg.holidays || [];
  const agDays = agCfg.days || { seg: true, ter: true, qua: true, qui: true, sex: true, sab: false, dom: false };
  const isHoliday = (iso) => agHolidays.some((h) => (typeof h === 'string' ? h : h.date) === iso);
  const getHolidayLabel = (iso) => { const h = agHolidays.find((x) => (typeof x === 'string' ? x : x.date) === iso); return h ? (typeof h === 'string' ? 'Feriado / sem atendimento' : (h.motivo || 'Feriado / sem atendimento')) : null; };
  const agLunchStartH = agCfg.useLunch ? parseInt((agCfg.lunchStart || '12:00').split(':')[0], 10) : -1;
  const agLunchEndH   = agCfg.useLunch ? parseInt((agCfg.lunchEnd   || '13:00').split(':')[0], 10) : -1;
  const isWorkday = (iso) => { const d = new Date(iso + 'T12:00:00'); const keys = ['dom','seg','ter','qua','qui','sex','sab']; return agDays[keys[d.getDay()]] !== false && !isHoliday(iso); };

  const blank = (date, start) => ({ patient: '', kind: CT[0].label, vet: 'M.V. ' + window.vtVets()[0].name, date: agISO(date), start, dur: agSlotHours, color: '', local: 'Clínica própria', endereco: '', alerta: '1 dia', status: 'Pendente', obs: '' });

  const vets = window.vtVets();
  const anyEsp = Object.values(fEsp).some(Boolean), anyVet = Object.values(fVet).some(Boolean), anySt = Object.values(fSt).some(Boolean);
  const matches = (a) => {
    if (anyEsp && !fEsp[agSpeciesGroup((((window.VtStore.getData() || {}).patients || []).find((p) => p.name === a.patient) || {}).species)]) return false;
    if (anyVet && !fVet[(a.vet || '').replace('M.V. ', '')]) return false;
    if (anySt && !fSt[a.status || 'Pendente']) return false;
    return true;
  };
  const onDay = (iso) => {
    const local = appts.filter((a) => a.date === iso && matches(a));
    const gc = gcalOn ? gcalEvents.filter((g) => g.date === iso) : [];
    return [...local, ...gc].sort((a, b) => a.start - b.start);
  };

  const hours = Array.from({ length: agEndH - agStartH }, (_, i) => i + agStartH);
  const goToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setCursor(d); };
  const rotaDia = () => { setRouteOpen(true); };
  /* ---- Google Calendar ---- */
  const weekRange = () => { const s = view === 'mes' ? new Date(cursor.getFullYear(), cursor.getMonth(), 1) : agStartOfWeek(cursor); const e = view === 'mes' ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0) : agAddDays(agStartOfWeek(cursor), 6); return [agISO(s), agISO(e)]; };
  const fetchGcal = () => {
    const [s, e] = weekRange();
    window.VtGCal.listRange(s, e).then((items) => { setGcalEvents(items); window.vtToast(`${items.length} evento(s) do Google Calendar carregado(s).`, 'ok'); })
      .catch((err) => { window.vtToast('Não foi possível buscar eventos: ' + (err && err.message || 'erro'), 'err'); });
  };
  const connectGcal = () => {
    if (!window.VtGCal) { window.vtToast('Módulo Google Calendar indisponível.', 'err'); return; }
    if (gcalOn) { fetchGcal(); return; }
    if (!window.VtGCal.configured()) { window.vtToast('Configure seu Google Client ID em Configurações > Integrações antes de conectar.', 'err'); return; }
    window.VtGCal.connect().then(() => { setGcalOn(true); window.VtGCal.fetchEmail().then(setGcalEmail); fetchGcal(); })
      .catch((err) => {
        if (err && err.message === 'NO_CLIENT_ID') window.vtToast('Configure seu Google Client ID em Configurações > Integrações antes de conectar.', 'err');
        else window.vtToast('Falha ao conectar ao Google: ' + (err && err.message || 'erro'), 'err');
      });
  };
  const disconnectGcal = () => {
    if (window.VtGCal) window.VtGCal.disconnect();
    setGcalOn(false); setGcalEmail(''); setGcalEvents([]);
    window.vtToast('Google Calendar desconectado.', 'ok');
  };
  // restaura a conexão salva (token no localStorage) ao montar a agenda
  vtUseEffect(() => {
    if (window.VtGCal && window.VtGCal.isConnected()) {
      window.VtGCal.fetchEmail().then((e) => { if (window.VtGCal.isConnected()) { setGcalOn(true); setGcalEmail(e); fetchGcal(); } });
    }
  }, []);
  vtUseEffect(() => { if (gcalOn) fetchGcal(); }, [cursor, view, gcalOn]);
  // abre o formulário de novo agendamento já com o paciente recém-cadastrado pré-selecionado
  vtUseEffect(() => {
    if (focusNewPatient) {
      setView('dia');
      setModal({ ...blank(cursor, 9), patient: focusNewPatient });
      window.vtToast('Agende a consulta de ' + focusNewPatient + '.', 'ok');
      if (clearAgendaFocus) clearAgendaFocus();
    }
  }, [focusNewPatient]);
  const step = (dir) => {
    if (view === 'dia') setCursor(agAddDays(cursor, dir));
    else if (view === 'semana') setCursor(agAddDays(cursor, dir * 7));
    else { const x = new Date(cursor); x.setMonth(x.getMonth() + dir); setCursor(x); }
  };
  const title = view === 'mes'
    ? `${AG_MONTHS[cursor.getMonth()]} de ${cursor.getFullYear()}`
    : view === 'dia'
      ? `${cursor.getDate()} de ${AG_MONTHS[cursor.getMonth()]}, ${cursor.getFullYear()}`
      : (() => { const s = agStartOfWeek(cursor); const e = agAddDays(s, 6); return `${s.getDate()} - ${e.getDate()} ${AG_MONTHS[e.getMonth()]}, ${e.getFullYear()}`; })();

  const ESP = ['Equino', 'Canino', 'Felino', 'Outros'];
  const STA = ['Confirmado', 'Pendente', 'Em andamento', 'Cancelado', 'Realizado'];
  const FCheck = ({ on, set, label, dot }) => (
    <label className="ag-fcheck"><input type="checkbox" checked={!!on} onChange={(e) => set(e.target.checked)} />{dot ? <span className="ag-fdot" style={{ background: dot }} /> : null}<span>{label}</span></label>
  );

  return (
    <div className="ag-layout">
      {/* ---- coluna esquerda: mini-calendário + filtros ---- */}
      <div className="ag-side">
        <MiniCal cursor={cursor} onPick={(d) => { setCursor(d); if (view === 'mes') setView('dia'); }} appts={appts} />
        <div className="vt-card ag-filters">
          <h3 className="ag-filters-title">Filtros</h3>
          <div className="ag-fgroup">
            <span className="ag-fhead">Espécie</span>
            {ESP.map((e) => <FCheck key={e} label={e} dot={AG_COLORS[AG_SPECIES_COLOR[e]]} on={fEsp[e]} set={(v) => setFEsp((p) => ({ ...p, [e]: v }))} />)}
          </div>
          <div className="ag-fgroup">
            <span className="ag-fhead">Veterinário</span>
            {vets.map((v) => <FCheck key={v.id} label={v.name} dot={v.color} on={fVet[v.name]} set={(c) => setFVet((p) => ({ ...p, [v.name]: c }))} />)}
          </div>
          <div className="ag-fgroup">
            <span className="ag-fhead">Status</span>
            {STA.map((st) => <FCheck key={st} label={st} dot={AG_COLORS[AG_STATUS[st]]} on={fSt[st]} set={(v) => setFSt((p) => ({ ...p, [st]: v }))} />)}
          </div>
        </div>
      </div>

      {/* ---- coluna central: grade ---- */}
      <div className="ag-center">
        <div className="ag-toolbar">
          <div className="ag-viewseg">
            <button className="ag-today" onClick={goToday}>Hoje</button>
            {[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']].map(([id, l]) => (<button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>{l}</button>))}
          </div>
          <button className="vt-btn-ghost ag-route" onClick={rotaDia} title="Ver a rota das visitas externas do dia">🗺️ Rota do Dia</button>
          <button className={`vt-btn-ghost ag-gcal${gcalOn ? ' connected' : ''}`} onClick={connectGcal} title="Conectar e sincronizar com o Google Calendar"><span className="ag-gcal-dot" style={{ background: gcalOn ? 'var(--green)' : '#c0473a' }} />{gcalOn ? (gcalEmail || 'Google Calendar') : '📅 Conectar Google Agenda'}</button>
          {gcalOn && <button className="vt-btn-ghost ag-sync" onClick={fetchGcal} title="Sincronizar eventos agora">🔄 Sincronizar agora</button>}
          {gcalOn && <button className="vt-btn-ghost ag-disc" onClick={disconnectGcal} title="Desconectar do Google Calendar">Desconectar</button>}
          <button className="vt-btn-primary ag-new" onClick={() => setModal(blank(cursor, 9))}><VtIcon name="plus" size={16} /> Novo agendamento</button>
          <div className="ag-period">
            <button className="ag-navbtn" onClick={() => step(-1)}>‹</button>
            <span className="ag-title">{title}</span>
            <button className="ag-navbtn" onClick={() => step(1)}>›</button>
          </div>
        </div>
        {view === 'mes'
          ? <AgendaMonth cursor={cursor} appts={appts} onDay={onDay} openNew={(d) => setModal(blank(d, 9))} openEv={setSel} onPickDay={(d) => { setCursor(d); setView('dia'); }} isWorkday={isWorkday} />
          : <AgendaGrid days={view === 'dia' ? [cursor] : Array.from({ length: 7 }, (_, i) => agAddDays(agStartOfWeek(cursor), i))} hours={hours} onDay={onDay} openNew={(d, h) => setModal(blank(d, h))} openEv={setSel} selId={sel && sel.id} getHolidayLabel={getHolidayLabel} agLunchStartH={agLunchStartH} agLunchEndH={agLunchEndH} />}
      </div>

      {/* ---- coluna direita: detalhes ---- */}
      <div className="ag-detail">
        <AgendaDetail ev={sel} onEdit={() => setModal(sel)} onStatus={setStatus} onClose={() => setSel(null)} onIniciarAtendimento={onIniciarAtendimento} />
      </div>

      {modal && <AgendaEventModal ev={modal} onClose={() => setModal(null)} onSave={save} onDelete={del} />}
      {routeOpen && <RotaDoDiaPanel day={cursor} appts={appts.filter((a) => a.date === agISO(cursor) && a.status !== 'Cancelado').sort((a, b) => a.start - b.start)} onClose={() => setRouteOpen(false)} />}
    </div>
  );
}

/* painel lateral: Rota do Dia */
function RotaDoDiaPanel({ day, appts, onClose }) {
  const data = (window.VtStore && window.VtStore.getData()) || {};
  const patOf = (name) => (data.patients || []).find((p) => p.name === name) || {};
  const rows = appts.map((a) => { const pat = patOf(a.patient); return { ev: a, pat, addr: (a.endereco && a.endereco.trim()) || agAddrOf(a) }; });
  const withAddr = rows.filter((r) => r.addr);
  const dia = `${day.getDate()} de ${AG_MONTHS[day.getMonth()]}`;
  const mapsUrl = (addr) => 'https://www.google.com/maps/search/?q=' + encodeURIComponent(addr);
  const openUrl = (url) => { const _a = document.createElement('a'); _a.href = url; _a.target = '_blank'; _a.rel = 'noopener noreferrer'; document.body.appendChild(_a); _a.click(); document.body.removeChild(_a); };
  const fullRoute = () => { const url = agRotaDoDia(appts); if (!url) { window.vtToast('Nenhum endereço de atendimento cadastrado para hoje.', 'err'); return; } openUrl(url); };
  return (
    <div className="ag-route-overlay" onClick={onClose}>
      <div className="ag-route-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ag-route-head">
          <div><h3>Rota do Dia</h3><span>{dia} · {appts.length} atendimento(s)</span></div>
          <button className="ag-route-x" onClick={onClose}>×</button>
        </div>
        <div className="ag-route-body">
          {appts.length === 0 && <p className="ag-route-empty">Nenhum atendimento agendado para este dia.</p>}
          {appts.map((a) => { const pat = patOf(a.patient); const addr = (a.endereco && a.endereco.trim()) || agAddrOf(a); return (
            <div key={a.id} className="ag-route-card">
              <div className="ag-route-time">{fmtH(a.start)}</div>
              <div className="ag-route-info">
                <b>{a.patient}{pat.species ? <span className="ag-route-sp"> · {pat.species}</span> : null}</b>
                <i>{a.kind}{a.vet ? ' · ' + a.vet.replace('M.V. ', '') : ''}</i>
                <span className={`ag-route-addr${addr ? '' : ' none'}`}>{addr || (a.local && a.local !== 'Clínica própria' ? a.local : 'Clínica própria — sem endereço externo')}</span>
              </div>
              {addr && <button className="ag-route-maps" onClick={() => openUrl(mapsUrl(addr))} title="Abrir no Google Maps"><VtIcon name="pin" size={15} /> Maps</button>}
            </div>
          ); })}
        </div>
        <div className="ag-route-foot">
          {withAddr.length >= 1
            ? <button className="vt-btn-primary" style={{ width: '100%' }} onClick={fullRoute}><VtIcon name="pin" size={15} /> Abrir Rota no Maps ({withAddr.length} parada{withAddr.length > 1 ? 's' : ''})</button>
            : <p className="ag-route-hint">Nenhum endereço de atendimento cadastrado para hoje. Defina um local externo e o endereço no agendamento.</p>}
        </div>
      </div>
    </div>
  );
}

/* mini-calendário do mês */
function MiniCal({ cursor, onPick, appts }) {
  const [m, setM] = vtUseState(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  vtUseEffect(() => { setM(new Date(cursor.getFullYear(), cursor.getMonth(), 1)); }, [cursor.getFullYear(), cursor.getMonth()]);
  const todayISO = agISO(new Date()), curISO = agISO(cursor);
  const start = agStartOfWeek(m);
  const cells = Array.from({ length: 42 }, (_, i) => agAddDays(start, i));
  const hasEv = (iso) => appts.some((a) => a.date === iso);
  return (
    <div className="vt-card ag-mini">
      <div className="ag-mini-head">
        <button className="ag-navbtn sm" onClick={() => setM(new Date(m.getFullYear(), m.getMonth() - 1, 1))}>‹</button>
        <span>{AG_MONTHS[m.getMonth()]} {m.getFullYear()}</span>
        <button className="ag-navbtn sm" onClick={() => setM(new Date(m.getFullYear(), m.getMonth() + 1, 1))}>›</button>
      </div>
      <div className="ag-mini-grid">
        {['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sá'].map((d, i) => <span key={i} className="ag-mini-dow">{d}</span>)}
        {cells.map((d) => {
          const iso = agISO(d), out = d.getMonth() !== m.getMonth();
          return <button key={iso} className={`ag-mini-day${out ? ' out' : ''}${iso === todayISO ? ' today' : ''}${iso === curISO ? ' sel' : ''}`} onClick={() => onPick(d)}>{d.getDate()}{hasEv(iso) && !out ? <i className="ag-mini-ev" /> : null}</button>;
        })}
      </div>
    </div>
  );
}

/* painel de detalhes do agendamento */
function AgendaDetail({ ev, onEdit, onStatus, onClose, onIniciarAtendimento }) {
  if (!ev) return (
    <div className="vt-card ag-detail-card">
      <h3 className="ag-detail-title">Detalhes do Agendamento</h3>
      <p className="ag-detail-empty">Clique em um agendamento na agenda para ver os detalhes, confirmar ou reagendar.</p>
    </div>
  );
  const pat = (((window.VtStore.getData() || {}).patients) || []).find((p) => p.name === ev.patient) || {};
  const owners = ((window.VtStore.getData() || {}).owners) || [];
  const ow = owners.find((o) => o.name === pat.owner) || {};
  const d = ev.date ? new Date(ev.date + 'T00:00:00') : null;
  const dateStr = d ? `${AG_DOW_FULL[d.getDay()]}, ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '';
  const row = (icon, label, val) => (
    <div className="ag-drow"><span className="ag-dic"><VtIcon name={icon} size={17} /></span><div><i>{label}</i><b>{val || '—'}</b></div></div>
  );
  return (
    <div className="vt-card ag-detail-card">
      <div className="ag-detail-top"><h3 className="ag-detail-title">Detalhes do Agendamento</h3><button className="ag-detail-x" onClick={onClose}>✕</button></div>
      {(() => { const k = AG_STATUS[ev.status] || 'amber'; return <span className="vt-pill" style={{ marginBottom: 8, display: 'inline-block', color: AG_COLORS[k], background: AG_COLOR_BG[k] }}>{ev.status || 'Pendente'}</span>; })()}
      {row('users', 'Tutor', `${pat.owner || '—'}${(ow.phone && ow.phone !== '—') ? '  ·  ' + ow.phone : ''}`)}
      {row('paw', 'Paciente', `${ev.patient}${pat.species ? ` (${pat.species}${pat.breed && pat.breed !== '—' ? ', ' + pat.breed : ''})` : ''}`)}
      {row('stethoscope', 'Motivo', ev.kind)}
      {row('pin', 'Local', `${ev.local || 'Clínica própria'}${ev.endereco ? '  ·  ' + ev.endereco : ''}`)}
      {row('calendar', 'Horário', `${dateStr}${d ? ' · ' : ''}${fmtH(ev.start)} às ${fmtH(ev.start + (ev.dur || 1))}`)}
      {row('user', 'Veterinário', (ev.vet || '').replace('M.V. ', 'M.V. '))}
      {ev.obs ? row('receipt', 'Observações', ev.obs) : null}
      <div className="ag-detail-actions">
        <button className="vt-btn-primary" onClick={() => onStatus(ev.id, 'Confirmado')}><VtIcon name="check" size={16} /> Confirmar</button>
        <button className="vt-btn-ghost" onClick={() => { onStatus(ev.id, 'Realizado'); window.vtToast('Agendamento marcado como realizado.', 'ok'); }} style={{ color: 'var(--green)', borderColor: 'color-mix(in srgb, var(--green) 35%, transparent)' }}><VtIcon name="check" size={16} /> Concluído</button>
        <button className="vt-btn-ghost" onClick={onEdit}><VtIcon name="calendar" size={15} /> Reagendar</button>
        {onIniciarAtendimento && <button className="vt-btn-primary" style={{ background: 'var(--blue)', borderColor: 'var(--blue)' }} onClick={() => onIniciarAtendimento(ev)}><VtIcon name="stethoscope" size={15} /> Iniciar Atendimento</button>}
        {(() => {
          const tutorNum = pat.whats || ow.whats || (ow.phone && ow.phone !== '—' ? ow.phone : '') || pat.phone || '';
          const vcfg = window.vtConfig ? window.vtConfig() : {};
          const buildWaLink = () => {
            if (!tutorNum) return null;
            const dt2 = ev.date ? new Date(ev.date + 'T00:00:00') : null;
            const dataBR = dt2 ? `${String(dt2.getDate()).padStart(2,'0')}/${String(dt2.getMonth()+1).padStart(2,'0')}/${dt2.getFullYear()}` : (ev.date||'');
            const vars = { paciente: ev.patient, tutor: pat.owner||'', data: dataBR, hora: fmtH(ev.start)||'', clinica: (window.vtClinic&&window.vtClinic().name)||'nossa clínica', total: '' };
            const msg = vcfg.waTplConfirm ? window.vtFillTemplate(vcfg.waTplConfirm, vars) : `Olá ${pat.owner||''}! Confirmamos o agendamento de ${ev.patient} para ${dataBR} às ${fmtH(ev.start)} em ${(window.vtClinic&&window.vtClinic().name)||'nossa clínica'}.`;
            return window.vtWaLink(tutorNum, msg);
          };
          const link = buildWaLink();
          return link
            ? <button className="ag-msg-btn" onClick={() => window.open(link, '_blank', 'noopener')}>💬 Enviar WhatsApp</button>
            : <button className="ag-msg-btn" style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Tutor sem número de WhatsApp cadastrado" onClick={() => window.vtToast('Tutor sem número de WhatsApp cadastrado.', 'err')}>💬 Sem número</button>;
        })()}
      </div>
    </div>
  );
}

function AgendaGrid({ days, hours, onDay, openNew, openEv, selId, getHolidayLabel, agLunchStartH, agLunchEndH }) {
  const todayISO = agISO(new Date());
  const patFor = (name) => (((window.VtStore.getData() || {}).patients) || []).find((p) => p.name === name) || {};
  return (
    <div className="vt-card ag-cal">
      <div className="ag-grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
        <div className="ag-corner" />
        {days.map((d) => {
          const iso = agISO(d);
          const holLabel = getHolidayLabel ? getHolidayLabel(iso) : null;
          return (
            <div key={iso} className={`ag-dayhead${iso === todayISO ? ' today' : ''}${holLabel ? ' ag-dayhead-hol' : ''}`}>
              <span className="ag-dow">{AG_DOW_FULL[d.getDay()]}</span><span className="ag-dnum">{d.getDate()}</span>
              {holLabel && <span className="ag-hol-label" title={holLabel}>🔒 {holLabel}</span>}
            </div>
          );
        })}
        {hours.map((h) => (
          <React.Fragment key={h}>
            <div className="ag-hour">{String(h).padStart(2, '0')}:00</div>
            {days.map((d) => {
              const iso = agISO(d);
              const holLabel = getHolidayLabel ? getHolidayLabel(iso) : null;
              const isLunch = agLunchStartH >= 0 && h >= agLunchStartH && h < agLunchEndH;
              const blocked = !!(holLabel || isLunch);
              const blockTitle = holLabel || (isLunch ? 'Intervalo de almoço' : '');
              return (
                <div key={iso + h}
                  className={`ag-cell${blocked ? ' ag-cell-blocked' : ''}`}
                  style={blocked ? { background: holLabel ? 'rgba(239,68,68,.07)' : 'rgba(148,163,184,.08)', cursor: 'not-allowed' } : null}
                  title={blockTitle}
                  onClick={() => { if (blocked) { window.vtToast(blockTitle, 'err'); return; } openNew(d, h); }}>
                  {isLunch && !holLabel && <div className="ag-lunch-stripe" style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'var(--muted)', pointerEvents:'none', opacity:.6 }}>almoço</div>}
                  {onDay(iso).filter((a) => Math.floor(a.start) === h).map((a) => {
                    if (a._gcal) {
                      return (
                        <div key={a.id} className="ag-ev ag-ev-gcal" style={{ height: `${Math.max(1, a.dur) * 44 - 4}px` }} onClick={(e) => { e.stopPropagation(); }} title={a.patient}>
                          <span className="ag-ev-grp ag-gcal-badge">GCal</span>
                          <span className="ag-ev-p">{a.patient}</span>
                        </div>
                      );
                    }
                    const col = agColorFor(a);
                    const pat = patFor(a.patient);
                    const grp = agSpeciesGroup(pat.species || a.species);
                    return (
                      <div key={a.id} className={`ag-ev${selId === a.id ? ' sel' : ''}`} style={{ background: AG_COLOR_BG[col] || AG_COLOR_BG.teal, borderColor: AG_COLORS[col] || AG_COLORS.teal, height: `${Math.max(1, a.dur) * 44 - 4}px` }} onClick={(e) => { e.stopPropagation(); openEv(a); }}>
                        <span className="ag-ev-grp" style={{ color: AG_COLORS[col] || AG_COLORS.teal }}>{grp}</span>
                        <span className="ag-ev-p">{a.patient}{pat.species ? ` (${(pat.species || '').slice(0, 3)})` : ''} – {a.kind}</span>
                        <span className="ag-ev-k">{(a.vet || '').replace('M.V. ', '')}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function AgendaMonth({ cursor, onDay, openNew, openEv, onPickDay, isWorkday }) {
  if (!isWorkday) isWorkday = () => true;
  const todayISO = agISO(new Date());
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = agStartOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => agAddDays(start, i));
  return (
    <div className="vt-card ag-month">
      <div className="ag-month-head">{AG_DOW.map((d) => <div key={d}>{d}</div>)}</div>
      <div className="ag-month-grid">
        {cells.map((d) => {
          const iso = agISO(d); const evs = onDay(iso); const outside = d.getMonth() !== cursor.getMonth(); const closed = !isWorkday(iso);
          return (
            <div key={iso} className={`ag-mcell${outside ? ' out' : ''}${iso === todayISO ? ' today' : ''}${closed && !outside ? ' ag-closed' : ''}`} onClick={() => !closed && openNew(d, agStartH)}>
              <span className="ag-mnum" onClick={(e) => { e.stopPropagation(); onPickDay(d); }}>{d.getDate()}</span>
              <div className="ag-mevs">
                {evs.slice(0, 3).map((a) => (
                  <div key={a.id} className="ag-mev" style={{ background: AG_COLORS[a.color] || AG_COLORS.teal }} onClick={(e) => { e.stopPropagation(); openEv(a); }}>{fmtH(a.start)} {a.patient}</div>
                ))}
                {evs.length > 3 && <span className="ag-mmore">+{evs.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function AgendaEventModal({ ev, onClose, onSave, onDelete }) {
  const D = window.VtData;
  const CT = window.vtConsults();
  const pacientes = (() => { const d = window.VtStore && window.VtStore.getData(); return (d && d.patients) || []; })();
  const parceiras = window.vtParceiras ? window.vtParceiras() : [];
  const TYPE_COLOR = { teal: '#14a8a0', navy: '#16395f', red: '#e0533c', amber: '#e2912a', green: '#1fa971', purple: '#8b5cf6' };
  const colorForType = (label) => { const i = CT.findIndex((t) => t.label === label); return ['teal', 'navy', 'amber', 'purple', 'red', 'green'][i % 6] || 'teal'; };
  const [f, setF] = vtUseState({ ...ev, color: ev.color || colorForType(ev.kind), local: ev.local || 'Clínica própria', endereco: ev.endereco || ((ev.local && ev.local !== 'Clínica própria') ? (agAddrOf(ev) || '') : ''), alerta: ev.alerta || '1 dia', date: ev.date || agISO(new Date()) });
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  // ao escolher um local externo, pré-preenche o endereço a partir do cadastro do paciente/propriedade
  const setLocal = (val) => setF((p) => ({ ...p, local: val, endereco: (val !== 'Clínica própria' && !p.endereco) ? (agAddrOf(p) || '') : (val === 'Clínica própria' ? p.endereco : p.endereco) }));
  const setKind = (label) => setF((p) => ({ ...p, kind: label, color: colorForType(label) }));
  const exists = !!(ev.id);
  const HHALF = []; for (let h = 0; h < 24; h++) { HHALF.push(h); HHALF.push(h + 0.5); }
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 500, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h3>{exists ? 'Editar agendamento' : 'Novo agendamento'}</h3>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '100%' }}><span className="vtf-label">Paciente</span><span className="vtf-inputwrap">
            <input list="ag-pac-list" className="vtf-input" value={f.patient} onChange={(e) => s('patient')(e.target.value)} placeholder="Digite o nome do paciente ou responsável…" autoComplete="off" />
            <datalist id="ag-pac-list">
              {pacientes.map((p) => <option key={p.id} value={p.name}>{p.name} · {p.species} · {p.owner}</option>)}
            </datalist>
          </span></label>
        </div>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '48%' }}><span className="vtf-label">Tipo</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.kind} onChange={(e) => setKind(e.target.value)}>{CT.map((t) => <option key={t.id}>{t.label}</option>)}</select></span></label>
          <label className="vtf" style={{ width: '48%' }}><span className="vtf-label">Veterinário</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.vet} onChange={(e) => s('vet')(e.target.value)}>{window.vtVets().map((v) => <option key={v.id}>{'M.V. ' + v.name}</option>)}</select></span></label>
        </div>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '100%' }}><span className="vtf-label">Local do atendimento</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.local} onChange={(e) => setLocal(e.target.value)}>
            <option>Clínica própria</option><option>Atendimento domiciliar</option><option>Propriedade rural</option>
            {parceiras.map((p) => <option key={p.id} value={'Parceira: ' + p.nome}>{'Parceira: ' + p.nome}</option>)}
          </select></span></label>
        </div>
        {f.local !== 'Clínica própria' && (
          <div className="vt-form-row">
            <label className="vtf" style={{ width: '100%' }}><span className="vtf-label">Endereço do atendimento <b style={{ color: 'var(--red)' }}>*</b> <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(usado na Rota do Dia)</span></span><span className="vtf-inputwrap"><input className="vtf-input" value={f.endereco || ''} onChange={(e) => s('endereco')(e.target.value)} placeholder="Rua, nº, bairro, cidade, estado" /></span>
              <button type="button" className="vt-btn-ghost" style={{ marginTop: 6, fontSize: 12, padding: '4px 10px' }} onClick={() => { const a = agAddrOf(f); if (a) s('endereco')(a); else window.vtToast('Sem endereço no cadastro do paciente.', 'err'); }}>Usar endereço do cadastro</button>
            </label>
          </div>
        )}
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '36%' }}><span className="vtf-label">Data</span><span className="vtf-inputwrap"><input type="date" className="vtf-input" value={f.date} onChange={(e) => s('date')(e.target.value)} /></span></label>
          <label className="vtf" style={{ width: '32%' }}><span className="vtf-label">Início</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.start} onChange={(e) => s('start')(Number(e.target.value))}>{HHALF.map((h) => <option key={h} value={h}>{fmtH(h)}</option>)}</select></span></label>
          <label className="vtf" style={{ width: '28%' }}><span className="vtf-label">Duração</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.dur} onChange={(e) => s('dur')(Number(e.target.value))}>{[0.5, 1, 1.5, 2, 2.5, 3, 4].map((d) => <option key={d} value={d}>{d}h</option>)}</select></span></label>
        </div>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '48%' }}><span className="vtf-label">Alerta de antecedência</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.alerta} onChange={(e) => s('alerta')(e.target.value)}>
            {['Sem alerta', '1 hora antes', '3 horas antes', '1 dia', '2 dias', '1 semana'].map((a) => <option key={a}>{a}</option>)}
          </select></span></label>
          <label className="vtf" style={{ width: '48%' }}><span className="vtf-label">Status</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.status || 'Pendente'} onChange={(e) => s('status')(e.target.value)}>{['Pendente', 'Confirmado', 'Em andamento', 'Cancelado', 'Realizado'].map((st) => <option key={st}>{st}</option>)}</select></span></label>
          <label className="vtf" style={{ width: '48%' }}><span className="vtf-label">Cor (sobrescreve espécie)</span>
            <span style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}><button onClick={() => s('color')('')} style={{ width: 24, height: 24, borderRadius: 7, background: '#fff', border: !f.color ? '2px solid var(--ink)' : '1px solid var(--line)', fontSize: 11 }}>auto</button>{Object.keys(AG_COLORS).map((c) => <button key={c} onClick={() => s('color')(c)} style={{ width: 24, height: 24, borderRadius: 7, background: AG_COLORS[c], border: f.color === c ? '2px solid var(--ink)' : '2px solid transparent' }} />)}</span></label>
        </div>
        <label className="vtf"><span className="vtf-label">Observações</span><span className="vtf-inputwrap"><textarea className="vtf-input" style={{ minHeight: 52 }} value={f.obs || ''} onChange={(e) => s('obs')(e.target.value)} placeholder="Ex.: Paciente necessita de jejum de 12h." /></span></label>
        <div className="fin-modal-actions" style={{ marginTop: 16 }}>
          {exists && <button className="vt-btn-ghost" style={{ marginRight: 'auto', color: 'var(--red)' }} onClick={() => onDelete(f.id)}>Excluir</button>}
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={() => { if (!f.patient) { window.vtToast('Selecione o paciente.', 'err'); return; } if (f.local !== 'Clínica própria' && !(f.endereco || '').trim()) { window.vtToast('Informe o endereço do atendimento (obrigatório para visitas externas).', 'err'); return; } onSave(f); if (f.alerta !== 'Sem alerta') window.vtToast(`Alerta de ${f.alerta} programado para o tutor.`, 'ok'); }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tratamentos (kanban) ---------------- */
function TratamentosModule() {
  const [data, setData] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.treatments) || window.VtData.treatments;
  });
  const [modal, setModal] = vtUseState(null);
  const [f, setF] = vtUseState({});
  const persist = (next) => { setData(next); if (window.VtStore) window.VtStore.setData({ treatments: next }); };
  const cols = [
    { id: 'planejado', label: 'Planejado', tone: 'amber' },
    { id: 'andamento', label: 'Em andamento', tone: 'teal' },
    { id: 'concluido', label: 'Concluído', tone: 'green' },
  ];
  const add = () => {
    if (!f.patient || !f.proc) { window.vtToast('Informe paciente e procedimento.', 'err'); return; }
    const item = { patient: f.patient, proc: f.proc, tooth: f.tooth || '—', cost: f.cost || 'R$ 0,00' };
    persist({ ...data, [modal]: [...(data[modal] || []), item] });
    window.vtToast('Tratamento adicionado.', 'ok');
    setModal(null); setF({});
  };
  const move = (col, idx, dir) => {
    const order = ['planejado', 'andamento', 'concluido'];
    const ci = order.indexOf(col); const target = order[ci + dir];
    if (!target) return;
    const item = data[col][idx];
    persist({ ...data, [col]: data[col].filter((_, i) => i !== idx), [target]: [...data[target], item] });
  };
  return (
    <div>
      <div className="vt-page-head"><h1>Tratamentos</h1><p>Acompanhamento dos procedimentos por etapa</p></div>
      <div className="vt-kanban">
        {cols.map((c) => (
          <div key={c.id} className="vt-kan-col">
            <div className="vt-kan-head"><span className={`vt-dot ${c.tone}`} /> {c.label} <i>{(data[c.id] || []).length}</i></div>
            {(data[c.id] || []).map((it, i) => (
              <div key={i} className="vt-kan-card">
                <div className="vt-kan-pat">{it.patient}</div>
                <div className="vt-kan-proc">{it.proc}</div>
                <div className="vt-kan-foot"><span className="vt-tag">Dente {it.tooth}</span><span className="vt-kan-cost">{it.cost}</span></div>
                <div className="vt-kan-move">
                  {c.id !== 'planejado' && <button onClick={() => move(c.id, i, -1)} title="Voltar etapa">←</button>}
                  {c.id !== 'concluido' && <button onClick={() => move(c.id, i, 1)} title="Avançar etapa">→</button>}
                </div>
              </div>
            ))}
            <button className="vt-kan-add" onClick={() => { setModal(c.id); setF({}); }}><VtIcon name="plus" size={15} /> Adicionar</button>
          </div>
        ))}
      </div>
      {modal && (
        <div className="fin-modal-bg" onClick={() => setModal(null)}>
          <div className="fin-modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3>Novo tratamento</h3>
            <p>Etapa: {cols.find((c) => c.id === modal).label}</p>
            <div className="vt-form-row"><VtField label="Paciente" value={f.patient} onChange={(v) => setF({ ...f, patient: v })} width="100%" required /></div>
            <div className="vt-form-row"><VtField label="Procedimento" value={f.proc} onChange={(v) => setF({ ...f, proc: v })} width="100%" required /></div>
            <div className="vt-form-row">
              <VtField label="Dente(s)" value={f.tooth} onChange={(v) => setF({ ...f, tooth: v })} width="48%" />
              <VtField label="Valor" value={f.cost} onChange={(v) => setF({ ...f, cost: window.maskMoney(v) })} width="48%" />
            </div>
            <div className="fin-modal-actions" style={{ marginTop: 8 }}>
              <button className="vt-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="vt-btn-primary" onClick={add}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Estoque / Insumos ---------------- */
function EstoqueModule() {
  const [inv, setInv] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.inventory) || [];
  });
  const [moves, setMoves] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.inventoryMoves) || [];
  });
  const [modal, setModal] = vtUseState(null);
  const [moveModal, setMoveModal] = vtUseState(null);
  const [tab, setTab] = vtUseState('produtos');
  const [filtro, setFiltro] = vtUseState('Todos');
  const ekCfg = window.vtEstoqueCfg ? window.vtEstoqueCfg() : window.VT_ESTOQUE_CFG_DEFAULT || {};
  const cats = ['Todos', ...(ekCfg.categorias || ['Insumo', 'Medicamento', 'Vacina'])];
  const ekUnits = ekCfg.unidades || ['fr', 'cx', 'amp', 'un', 'kg', 'L'];
  const ekMinDefault = ekCfg.alertThreshold || 0;
  const ekFornecedores = ekCfg.fornecedores || [];
  const persist = (next) => { setInv(next); if (window.VtStore) window.VtStore.setData({ inventory: next }); };
  const blank = { categoria: (ekCfg.categorias || ['Medicamento'])[0] || 'Medicamento', name: '', lot: '', exp: '', supplier: '', qty: 0, min: ekMinDefault, unit: ekUnits[0] || 'fr', conteudo: '', unidConteudo: 'mL', cost: 'R$ 0,00' };
  const save = (f) => {
    if (!f.name || !f.name.trim()) { window.vtToast('Informe o nome do item.', 'err'); return; }
    const item = { ...f, name: f.name.trim(), qty: Number(f.qty) || 0, min: Number(f.min) || 0 };
    if (f.id) persist(inv.map((x) => x.id === f.id ? item : x));
    else persist([{ ...item, id: 'IV' + Date.now().toString(36) }, ...inv]);
    setModal(null); window.vtToast(`"${item.name}" salvo no estoque.`, 'ok');
  };
  const subCost = (i) => {
    const c = window.PR.parseMoney(i.cost); const cont = Number(String(i.conteudo || '').replace(',', '.'));
    return (c && cont) ? c / cont : null;
  };
  const money = window.PR.money;
  const costN = (i) => window.PR.parseMoney(i.cost) || 0;
  const valorTotal = (i) => costN(i) * (Number(i.qty) || 0);
  const statusOf = (i) => { const min = Number(i.min) || 0, q = Number(i.qty) || 0; if (q <= min) return 'Crítico'; if (q <= min * 1.5) return 'Alerta'; return 'OK'; };
  const STK_COLOR = { 'OK': ['var(--green)', 'var(--green-t)'], 'Alerta': ['var(--amber)', 'var(--amber-t)'], 'Crítico': ['var(--red)', 'var(--red-t)'] };
  const catColor = { Insumo: 'navy', Medicamento: 'teal', Vacina: 'amber' };
  const movTipoStyle = (t) => t === 'Entrada' ? { color: 'var(--green)', background: 'var(--green-t)' } : t === 'Saída' ? { color: 'var(--red)', background: 'var(--red-t)' } : { color: 'var(--navy)', background: '#e6edf4' };

  const list = inv.filter((i) => filtro === 'Todos' || (i.categoria || 'Insumo') === filtro);
  const totalEstoque = inv.reduce((s, i) => s + valorTotal(i), 0);
  const alertas = inv.filter((i) => statusOf(i) === 'Alerta');
  const criticos = inv.filter((i) => statusOf(i) === 'Crítico');

  const applyMove = (item, tipo, amount, resp, obs) => {
    const amt = Number(String(amount).replace(',', '.')) || 0;
    if (amt <= 0) { window.vtToast('Informe uma quantidade válida.', 'err'); return; }
    let q = Number(item.qty) || 0, delta = 0;
    if (tipo === 'Entrada') { delta = amt; q += amt; }
    else if (tipo === 'Saída') { delta = -Math.min(amt, q); q = Math.max(0, q - amt); }
    else { delta = amt - q; q = amt; }
    persist(inv.map((x) => x.id === item.id ? { ...x, qty: q } : x));
    const now = new Date();
    const mv = { id: 'MV' + Date.now().toString(36), ts: now.getTime(), date: now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), itemName: item.name, unit: item.unit, tipo, qty: amt, delta, responsavel: resp || (window.vtCurrentVet ? window.vtCurrentVet() : 'Equipe'), obs: obs || '' };
    const nextMoves = [mv, ...moves];
    setMoves(nextMoves); if (window.VtStore) window.VtStore.setData({ inventoryMoves: nextMoves });
    setMoveModal(null); window.vtToast(`${tipo} registrada: ${item.name} (${delta > 0 ? '+' : ''}${delta} ${item.unit}).`, 'ok');
  };

  return (
    <div>
      <div className="vt-page-head vt-head-row">
        <div><h1>Estoque</h1><p>{inv.length} itens · insumos, medicamentos e vacinas com controle de movimentações</p></div>
        <button className="vt-btn-primary" onClick={() => setModal(blank)}><VtIcon name="plus" size={17} /> Cadastrar item</button>
      </div>

      <div className="vt-stk-summary">
        <div className="vt-card vt-stk-sum">
          <span className="vt-stk-sum-ic" style={{ background: 'var(--teal-t)', color: 'var(--teal-d)' }}><VtIcon name="box" size={22} /></span>
          <div><div className="vt-stk-sum-l">Valor total do estoque</div><div className="vt-stk-sum-v">{money(totalEstoque)}</div></div>
        </div>
        <div className="vt-card vt-stk-sum">
          <span className="vt-stk-sum-ic" style={{ background: 'var(--amber-t)', color: 'var(--amber)' }}><VtIcon name="alert" size={22} /></span>
          <div><div className="vt-stk-sum-l">Itens em alerta</div><div className="vt-stk-sum-v" style={{ color: alertas.length ? 'var(--amber)' : 'var(--ink)' }}>{alertas.length}</div></div>
        </div>
        <div className="vt-card vt-stk-sum">
          <span className="vt-stk-sum-ic" style={{ background: 'var(--red-t)', color: 'var(--red)' }}><VtIcon name="alert" size={22} /></span>
          <div><div className="vt-stk-sum-l">Itens críticos</div><div className="vt-stk-sum-v" style={{ color: criticos.length ? 'var(--red)' : 'var(--ink)' }}>{criticos.length}</div></div>
        </div>
      </div>

      <div className="vt-toolbar-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div className="vt-segmented">
          <button className={tab === 'produtos' ? 'active' : ''} onClick={() => setTab('produtos')}>Produtos</button>
          <button className={tab === 'mov' ? 'active' : ''} onClick={() => setTab('mov')}>Movimentações{moves.length ? <span className="vt-count-badge" style={{ marginLeft: 6 }}>{moves.length}</span> : null}</button>
        </div>
        {tab === 'produtos' && <div className="vt-chip-row" style={{ display: 'flex', gap: 7 }}>{cats.map((c) => <button key={c} onClick={() => setFiltro(c)} style={prChipStyle(filtro === c)}>{c === 'Todos' ? 'Todos' : c + 's'}</button>)}</div>}
      </div>

      {tab === 'produtos' ? (
        <div className="vt-card vt-table-card">
          <div className="vt-table">
            <div className="vt-tr vt-th vt-stk-row"><span>Item</span><span>Categoria</span><span>Qtd atual</span><span>Qtd mín.</span><span>Custo médio</span><span>Valor total</span><span>Status</span><span style={{ textAlign: 'right' }}>Ações</span></div>
            {list.map((i) => {
              const st = statusOf(i); const [c, bg] = STK_COLOR[st];
              return (
                <div key={i.id} className={`vt-tr vt-stk-row${st === 'Crítico' ? ' low' : ''}`}>
                  <span><b>{i.name}</b><br /><span className="vt-muted" style={{ fontSize: 11.5 }}>Lote {i.lot || '—'} · val. {i.exp || '—'}</span></span>
                  <span><span className={`vt-tag ${catColor[i.categoria] === 'teal' ? 'teal' : catColor[i.categoria] === 'amber' ? 'amber' : ''}`}>{i.categoria || 'Insumo'}</span></span>
                  <span className={`vt-qty${st === 'Crítico' ? ' bad' : ''}`}>{i.qty} {i.unit}</span>
                  <span className="vt-muted">{i.min} {i.unit}</span>
                  <span>{money(costN(i))}</span>
                  <span style={{ fontWeight: 700 }}>{money(valorTotal(i))}</span>
                  <span><span className="vt-pill" style={{ color: c, background: bg }}>{st}</span></span>
                  <span className="vt-stk-acts">
                    <button className="vt-stk-act in" onClick={() => setMoveModal({ item: i, tipo: 'Entrada' })}>Entrada</button>
                    <button className="vt-stk-act out" onClick={() => setMoveModal({ item: i, tipo: 'Saída' })}>Saída</button>
                    <button className="vt-stk-act" onClick={() => setMoveModal({ item: i, tipo: 'Ajuste' })}>Ajuste</button>
                    <button className="vt-stk-act" onClick={() => setModal(i)}>Editar</button>
                  </span>
                </div>
              );
            })}
            {list.length === 0 && <div className="vt-empty-row">Nenhum item nesta categoria.</div>}
          </div>
        </div>
      ) : (
        <div className="vt-card vt-table-card">
          <div className="vt-table">
            <div className="vt-tr vt-th vt-mov-row"><span>Data / hora</span><span>Item</span><span>Tipo</span><span>Quantidade</span><span>Responsável</span></div>
            {moves.map((m) => (
              <div key={m.id} className="vt-tr vt-mov-row">
                <span className="vt-muted">{m.date}</span>
                <span><b>{m.itemName}</b>{m.obs ? <span className="vt-muted" style={{ display: 'block', fontSize: 11.5 }}>{m.obs}</span> : null}</span>
                <span><span className="vt-mov-tipo" style={movTipoStyle(m.tipo)}>{m.tipo}</span></span>
                <span className={`vt-mov-delta ${m.delta >= 0 ? 'up' : 'down'}`}>{m.delta > 0 ? '+' : ''}{m.delta} {m.unit}</span>
                <span>{m.responsavel}</span>
              </div>
            ))}
            {moves.length === 0 && <div className="vt-empty-row">Nenhuma movimentação registrada. Use os botões Entrada / Saída / Ajuste na aba Produtos.</div>}
          </div>
        </div>
      )}

      {modal && <InsumoModal data={modal} onClose={() => setModal(null)} onSave={save} subCost={subCost} />}
      {moveModal && <MovModal item={moveModal.item} tipo={moveModal.tipo} onClose={() => setMoveModal(null)} onSave={applyMove} />}
    </div>
  );
}
function MovModal({ item, tipo, onClose, onSave }) {
  const team = (window.vtTeam && window.vtTeam()) || [];
  const [amount, setAmount] = vtUseState(tipo === 'Ajuste' ? String(item.qty || 0) : '');
  const [resp, setResp] = vtUseState(window.vtCurrentVet ? window.vtCurrentVet() : ((team[0] || {}).name || ''));
  const [obs, setObs] = vtUseState('');
  const cur = Number(item.qty) || 0;
  const amt = Number(String(amount).replace(',', '.')) || 0;
  const novo = tipo === 'Entrada' ? cur + amt : tipo === 'Saída' ? Math.max(0, cur - amt) : amt;
  const tone = tipo === 'Entrada' ? 'var(--green)' : tipo === 'Saída' ? 'var(--red)' : 'var(--navy)';
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: tone }}>{tipo} de estoque</h3>
        <p>{item.name} · estoque atual <b>{cur} {item.unit}</b></p>
        <div className="vt-form-row">
          <VtField label={tipo === 'Ajuste' ? 'Nova quantidade (absoluta)' : 'Quantidade'} value={amount} onChange={(v) => setAmount(window.onlyD(v))} placeholder="0" width="46%" />
          <label className="vtf" style={{ width: '50%' }}><span className="vtf-label">Responsável</span><span className="vtf-inputwrap"><select className="vtf-input" value={resp} onChange={(e) => setResp(e.target.value)}>{team.map((m) => <option key={m.id}>{m.name}</option>)}{(!team.some((m) => m.name === resp) && resp) ? <option>{resp}</option> : null}</select></span></label>
        </div>
        <label className="vtf"><span className="vtf-label">Observação (opcional)</span><span className="vtf-inputwrap"><input className="vtf-input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder={tipo === 'Saída' ? 'Ex.: uso em cirurgia, paciente Rex' : tipo === 'Entrada' ? 'Ex.: compra NF 1234' : 'Ex.: correção de inventário'} /></span></label>
        <p className="vt-ai-note" style={{ marginTop: 4 }}><VtIcon name="box" size={15} /> Estoque após {tipo.toLowerCase()}: <b style={{ marginLeft: 4 }}>{novo} {item.unit}</b></p>
        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={() => onSave(item, tipo, amount, resp, obs)}>Confirmar {tipo.toLowerCase()}</button>
        </div>
      </div>
    </div>
  );
}
function InsumoModal({ data, onClose, onSave, subCost }) {
  const [f, setF] = vtUseState({ ...data });
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const sc = subCost(f);
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h3>{data.id ? 'Editar item' : 'Cadastrar item'}</h3>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '42%' }}><span className="vtf-label">Categoria</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.categoria} onChange={(e) => s('categoria')(e.target.value)}>{((window.vtEstoqueCfg ? window.vtEstoqueCfg().categorias : null) || ['Insumo', 'Medicamento', 'Vacina']).map((c) => <option key={c}>{c}</option>)}</select></span></label>
          <VtField label="Nome do item" value={f.name} onChange={s('name')} width="54%" />
        </div>
        <div className="vt-form-row">
          <VtField label="Lote" value={f.lot} onChange={s('lot')} width="32%" />
          <VtField label="Validade" value={f.exp} onChange={s('exp')} placeholder="MM/AAAA" width="30%" />
          {(() => { const forns = window.vtEstoqueCfg ? (window.vtEstoqueCfg().fornecedores || []) : []; return forns.length > 0 ? (<label className="vtf" style={{ width: '34%' }}><span className="vtf-label">Fornecedor</span><span className="vtf-inputwrap"><input className="vtf-input" list="vt-forn-list" value={f.supplier} onChange={(e) => s('supplier')(e.target.value)} placeholder="Selecionar ou digitar..." /><datalist id="vt-forn-list">{forns.map((fn) => <option key={fn.nome} value={fn.nome} />)}</datalist></span></label>) : (<VtField label="Fornecedor" value={f.supplier} onChange={s('supplier')} width="34%" />); })()}
        </div>
        <div className="vt-form-sec" style={{ marginTop: 8 }}>Conteúdo & custo</div>
        <div className="vt-form-row">
          <VtField label="Custo por unidade (frasco/caixa)" value={f.cost} onChange={(v) => s('cost')(window.maskMoney(v))} width="48%" />
          <label className="vtf" style={{ width: '24%' }}><span className="vtf-label">Unidade</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.unit} onChange={(e) => s('unit')(e.target.value)}>{((window.vtEstoqueCfg ? window.vtEstoqueCfg().unidades : null) || ['fr', 'cx', 'amp', 'un', 'kg', 'L']).map((u) => <option key={u}>{u}</option>)}</select></span></label>
          <VtField label="Conteúdo/un." value={f.conteudo} onChange={s('conteudo')} placeholder="20" width="14%" />
          <label className="vtf" style={{ width: '14%' }}><span className="vtf-label">Em</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.unidConteudo} onChange={(e) => s('unidConteudo')(e.target.value)}>{['mL', 'mg', 'comp', 'dose', 'g', 'un'].map((u) => <option key={u}>{u}</option>)}</select></span></label>
        </div>
        {sc != null && <p className="vt-ai-note"><VtIcon name="spark" size={15} /> Custo por uso: <b>{window.PR.money(sc)} / {f.unidConteudo}</b>. Ex.: uma dose de 0,5 {f.unidConteudo} custa <b>{window.PR.money(sc * 0.5)}</b>.</p>}
        <div className="vt-form-row" style={{ marginTop: 8 }}>
          <VtField label="Quantidade em estoque" value={f.qty} onChange={(v) => s('qty')(window.onlyD(v))} width="48%" />
          <VtField label="Estoque mínimo" value={f.min} onChange={(v) => s('min')(window.onlyD(v))} width="48%" />
        </div>
        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={() => onSave(f)}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Relatórios ---------------- */
function RelatoriosModule() {
  const [open, setOpen] = vtUseState(null); // qual relatório está aberto
  const [periodo, setPeriodo] = vtUseState('mes'); // mes | semana | ano | tudo
  const [busca, setBusca] = vtUseState('');

  const db = (window.VtStore && window.VtStore.getData()) || {};
  const patients = db.patients || [];
  const ats = db.atendimentos || [];
  const fin = db.fin || { tx: [] };
  const inv = db.inventory || [];
  const txAll = fin.tx || [];

  // helpers
  const money = (n) => window.vtMoney(n);
  const money0 = (n) => window.vtMoney(n, 0);
  const vtISO = (t) => { const s = t.date || ''; const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : s.slice(0,10); };
  const isRec = (t) => t.kind === 'receita' || t.type === 'entrada';
  const isCus = (t) => t.kind === 'custo'   || t.type === 'saida';
  const val = (t) => Number(t.value || t.val || 0);

  // filtro de período
  const today = new Date().toISOString().slice(0,10);
  const periodoStart = (() => {
    if (periodo === 'semana') { const d = new Date(); d.setDate(d.getDate()-7); return d.toISOString().slice(0,10); }
    if (periodo === 'mes')    { return today.slice(0,7)+'-01'; }
    if (periodo === 'ano')    { return today.slice(0,4)+'-01-01'; }
    return '2000-01-01';
  })();

  const txFiltradas = txAll.filter(t => vtISO(t) >= periodoStart);
  const atsFiltrados = ats.filter(a => {
    const iso = (a.date||'').match(/(\d{2})\/(\d{2})\/(\d{4})/) ? `${(a.date||'').slice(6)}-${(a.date||'').slice(3,5)}-${(a.date||'').slice(0,2)}` : a.date||'';
    return iso >= periodoStart;
  });

  // KPIs gerais
  const receita = txFiltradas.filter(isRec).reduce((s,t)=>s+val(t),0);
  const custo   = txFiltradas.filter(isCus).reduce((s,t)=>s+val(t),0);
  const lucro   = receita - custo;
  const lowStock = inv.filter(i => Number(i.qty != null ? i.qty : i.stock) <= Number(i.min||0));
  const porEspecie = {};
  patients.forEach(p => { if(p.species) porEspecie[p.species] = (porEspecie[p.species]||0)+1; });

  // taxa de retorno: pacientes com >1 atendimento / total com algum atendimento
  const pacComAt = new Set(ats.map(a => a.patientId).filter(Boolean));
  const pacRetorno = new Set(ats.filter(a => {
    const iso = (a.date||'').match(/(\d{2})\/(\d{2})\/(\d{4})/) ? `${(a.date||'').slice(6)}-${(a.date||'').slice(3,5)}-${(a.date||'').slice(0,2)}` : a.date||'';
    return iso >= periodoStart;
  }).map(a => a.patientId).filter(Boolean));
  const multiAt = [...pacRetorno].filter(id => ats.filter(a => a.patientId === id).length > 1);
  const taxaRetorno = pacRetorno.size > 0 ? Math.round(multiAt.length / pacRetorno.size * 100) : 0;

  // ranking de procedimentos
  const procCount = {};
  atsFiltrados.forEach(a => { const k = a.procedure || a.type || 'Sem procedimento'; procCount[k] = (procCount[k]||0)+1; });
  const topProc = Object.entries(procCount).sort((a,b)=>b[1]-a[1])[0];

  const CARDS = [
    { id:'atendimentos',  icon:'stethoscope', title:'Atendimentos',       desc:'Por tipo, veterinário e período',    n: String(atsFiltrados.length), sub:'registros no período' },
    { id:'receita',       icon:'dollar',      title:'Receita',            desc:'Entradas e faturamento por período', n: money0(receita),             sub: `lucro ${money0(lucro)}` },
    { id:'custos',        icon:'chart',       title:'Custos',             desc:'Despesas e saídas no período',       n: money0(custo),               sub: `margem ${receita ? Math.round(lucro/receita*100):0}%` },
    { id:'pacientes',     icon:'paw',         title:'Pacientes',          desc:'Base de pacientes por espécie',      n: String(patients.filter(p=>p.status!=='Óbito').length), sub:`${patients.length} total` },
    { id:'procedimentos', icon:'tooth',       title:'Procedimentos',      desc:'Ranking de procedimentos realizados', n: topProc ? String(topProc[1]) : '0', sub: topProc ? `1º: ${topProc[0].substring(0,20)}` : 'Sem dados' },
    { id:'retorno',       icon:'users',       title:'Taxa de Retorno',    desc:'Pacientes que retornaram ao período', n: `${taxaRetorno}%`,           sub:`${multiAt.length} de ${pacRetorno.size} pacientes` },
    { id:'estoque',       icon:'box',         title:'Estoque',            desc:'Inventário e alertas de reposição',  n: String(lowStock.length),     sub:'itens abaixo do mínimo' },
    { id:'especies',      icon:'tooth',       title:'Espécies',           desc:'Distribuição da base de pacientes',  n: String(Object.keys(porEspecie).length), sub:'espécies atendidas' },
  ];

  // impressão
  const imprimir = (titulo, html) => {
    const w = window.open('','_blank');
    const clinic = window.vtClinic ? window.vtClinic() : {};
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titulo}</title>
    <style>body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:24px}
    h1{font-size:18px;margin:0 0 4px}p{margin:0 0 16px;color:#555;font-size:12px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{background:#f0f4f8;text-align:left;padding:7px 10px;font-size:12px;border-bottom:2px solid #dde3ea}
    td{padding:6px 10px;border-bottom:1px solid #eef0f3;font-size:12px}
    tr:nth-child(even) td{background:#fafbfc}
    .tot{font-weight:700;background:#f0f4f8!important}
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px}
    .verde{background:#e6f7f0;color:#1a7a4a}.vermelho{background:#fde8e8;color:#a31515}.amarelo{background:#fff8e1;color:#795700}
    @media print{@page{margin:15mm}}</style></head><body>
    <h1>${titulo}</h1>
    <p>${clinic.name||'Dentalis Vet'} · Gerado em ${new Date().toLocaleString('pt-BR')} · Período: ${periodo==='tudo'?'Todo o histórico':periodo==='ano'?'Este ano':periodo==='mes'?'Este mês':'Últimos 7 dias'}</p>
    ${html}</body></html>`);
    w.document.close();
    setTimeout(()=>w.print(),400);
  };

  // ---- RELATÓRIO ABERTO ----
  if (open) {
    const buscaL = busca.toLowerCase();

    // Relatório de Atendimentos
    if (open === 'atendimentos') {
      const rows = atsFiltrados.filter(a =>
        !buscaL || (a.patientName||'').toLowerCase().includes(buscaL) ||
        (a.type||'').toLowerCase().includes(buscaL) || (a.vet||'').toLowerCase().includes(buscaL)
      ).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
      const totVal = rows.reduce((s,a)=>s+Number((a.value||'').replace(/[^\d,]/g,'').replace(',','.'))||0, 0);
      const html = `<table><thead><tr><th>Data</th><th>Paciente</th><th>Tipo</th><th>Procedimento</th><th>Veterinário</th><th>Valor</th></tr></thead><tbody>
        ${rows.map(a=>`<tr><td>${a.date||''}</td><td>${a.patientName||''}</td><td>${a.type||''}</td><td>${a.procedure||'—'}</td><td>${(a.vet||'').replace('M.V.','').trim()}</td><td>${a.value||'—'}</td></tr>`).join('')}
        <tr class="tot"><td colspan="5">Total</td><td>${window.vtMoney(totVal)}</td></tr>
      </tbody></table>`;
      return (
        <div>
          <button className="vt-back" onClick={()=>{setOpen(null);setBusca('')}}><VtIcon name="chevron" size={16}/> Relatórios</button>
          <div className="vt-page-head vt-head-row">
            <div><h1>Relatório de Atendimentos</h1><p>{rows.length} registros · {periodo==='mes'?'Este mês':periodo==='semana'?'Últimos 7 dias':periodo==='ano'?'Este ano':'Todo o histórico'}</p></div>
            <button className="vt-btn-primary" onClick={()=>imprimir('Relatório de Atendimentos',html)}><VtIcon name="print" size={15}/> Imprimir / PDF</button>
          </div>
          <div className="vt-card vt-sec" style={{marginBottom:14}}>
            <input className="vtf-input" style={{width:'100%'}} placeholder="Filtrar por paciente, tipo, veterinário…" value={busca} onChange={e=>setBusca(e.target.value)}/>
          </div>
          <div className="vt-card vt-sec" style={{overflowX:'auto'}}>
            {rows.length===0 ? <p className="vt-muted" style={{padding:16}}>Nenhum atendimento no período.</p> : (
              <table className="pr-dtable" style={{width:'100%'}}>
                <thead><tr><th>Data</th><th>Paciente</th><th>Tipo</th><th>Procedimento</th><th>Veterinário</th><th>Valor</th></tr></thead>
                <tbody>
                  {rows.map((a,i)=>(
                    <tr key={a.id||i}>
                      <td style={{whiteSpace:'nowrap'}}>{a.date||'—'}</td>
                      <td><b>{a.patientName||'—'}</b></td>
                      <td>{a.type||'—'}</td>
                      <td style={{color:'var(--muted)',fontSize:12}}>{a.procedure||'—'}</td>
                      <td style={{fontSize:12}}>{(a.vet||'—').replace('M.V.','').trim()}</td>
                      <td style={{fontWeight:600,color:'var(--teal)'}}>{a.value||'—'}</td>
                    </tr>
                  ))}
                  <tr style={{background:'var(--bg)',fontWeight:700}}>
                    <td colSpan="5">Total ({rows.length} registros)</td>
                    <td style={{color:'var(--teal)'}}>{window.vtMoney(totVal)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      );
    }

    // Relatório de Receita ou Custos
    if (open === 'receita' || open === 'custos') {
      const isRel = open === 'receita';
      const rows = txFiltradas.filter(isRel ? isRec : isCus).filter(t =>
        !buscaL || (t.desc||t.description||'').toLowerCase().includes(buscaL) ||
        (t.cat||t.category||'').toLowerCase().includes(buscaL)
      ).sort((a,b)=>vtISO(b).localeCompare(vtISO(a)));
      const total = rows.reduce((s,t)=>s+val(t),0);
      const porCat = {};
      rows.forEach(t=>{ const c=t.cat||t.category||'Outros'; porCat[c]=(porCat[c]||0)+val(t); });
      const titulo = isRel ? 'Relatório de Receitas' : 'Relatório de Custos';
      const cor = isRel ? 'var(--teal)' : 'var(--red)';
      const html = `<table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Pagamento</th><th>Status</th><th>Valor</th></tr></thead><tbody>
        ${rows.map(t=>`<tr><td>${t.date||''}</td><td>${t.desc||t.description||''}</td><td>${t.cat||t.category||''}</td><td>${t.pay||''}</td><td>${t.status||''}</td><td>${window.vtMoney(val(t))}</td></tr>`).join('')}
        <tr class="tot"><td colspan="5">Total</td><td>${window.vtMoney(total)}</td></tr>
      </tbody></table>`;
      return (
        <div>
          <button className="vt-back" onClick={()=>{setOpen(null);setBusca('')}}><VtIcon name="chevron" size={16}/> Relatórios</button>
          <div className="vt-page-head vt-head-row">
            <div><h1>{titulo}</h1><p>{rows.length} lançamentos · Total: {money(total)}</p></div>
            <button className="vt-btn-primary" onClick={()=>imprimir(titulo,html)}><VtIcon name="print" size={15}/> Imprimir / PDF</button>
          </div>
          {/* resumo por categoria */}
          <div className="vt-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',marginBottom:14,gap:10}}>
            {Object.entries(porCat).sort((a,b)=>b[1]-a[1]).map(([cat,v])=>(
              <div key={cat} className="vt-card" style={{padding:'12px 16px'}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>{cat}</div>
                <div style={{fontWeight:700,fontSize:15,color:cor}}>{money0(v)}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>{total ? Math.round(v/total*100) : 0}% do total</div>
              </div>
            ))}
          </div>
          <div className="vt-card vt-sec" style={{marginBottom:14}}>
            <input className="vtf-input" style={{width:'100%'}} placeholder="Filtrar por descrição ou categoria…" value={busca} onChange={e=>setBusca(e.target.value)}/>
          </div>
          <div className="vt-card vt-sec" style={{overflowX:'auto'}}>
            {rows.length===0 ? <p className="vt-muted" style={{padding:16}}>Nenhum lançamento no período.</p> : (
              <table className="pr-dtable" style={{width:'100%'}}>
                <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Pagamento</th><th>Status</th><th>Valor</th></tr></thead>
                <tbody>
                  {rows.map((t,i)=>{
                    const st = t.status||'';
                    const stColor = st==='recebido'||st==='pago' ? '#27a871' : st==='pendente' ? '#e09c3c' : 'var(--muted)';
                    return (
                      <tr key={t.id||i}>
                        <td style={{whiteSpace:'nowrap'}}>{t.date||'—'}</td>
                        <td><b>{t.desc||t.description||'—'}</b></td>
                        <td style={{fontSize:12}}>{t.cat||t.category||'—'}</td>
                        <td style={{fontSize:12,textTransform:'capitalize'}}>{t.pay||'—'}</td>
                        <td><span style={{fontSize:11,fontWeight:600,color:stColor,background:stColor+'18',borderRadius:4,padding:'2px 7px'}}>{st||'—'}</span></td>
                        <td style={{fontWeight:700,color:cor}}>{money(val(t))}</td>
                      </tr>
                    );
                  })}
                  <tr style={{background:'var(--bg)',fontWeight:700}}>
                    <td colSpan="5">Total ({rows.length} lançamentos)</td>
                    <td style={{color:cor}}>{money(total)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      );
    }

    // Relatório de Pacientes
    if (open === 'pacientes') {
      const rows = patients.filter(p =>
        !buscaL || (p.name||'').toLowerCase().includes(buscaL) ||
        (p.species||'').toLowerCase().includes(buscaL) || (p.owner||'').toLowerCase().includes(buscaL)
      );
      const html = `<table><thead><tr><th>Código</th><th>Paciente</th><th>Espécie</th><th>Raça</th><th>Tutor</th><th>Status</th></tr></thead><tbody>
        ${rows.map(p=>`<tr><td>${window.vtPacienteCode?window.vtPacienteCode(p):p.id}</td><td>${p.name||''}</td><td>${p.species||''}</td><td>${p.breed||''}</td><td>${p.owner||''}</td><td>${p.status||'Ativo'}</td></tr>`).join('')}
      </tbody></table>`;
      return (
        <div>
          <button className="vt-back" onClick={()=>{setOpen(null);setBusca('')}}><VtIcon name="chevron" size={16}/> Relatórios</button>
          <div className="vt-page-head vt-head-row">
            <div><h1>Relatório de Pacientes</h1><p>{rows.length} pacientes encontrados</p></div>
            <button className="vt-btn-primary" onClick={()=>imprimir('Relatório de Pacientes',html)}><VtIcon name="print" size={15}/> Imprimir / PDF</button>
          </div>
          <div className="vt-card vt-sec" style={{marginBottom:14}}>
            <input className="vtf-input" style={{width:'100%'}} placeholder="Filtrar por nome, espécie, tutor…" value={busca} onChange={e=>setBusca(e.target.value)}/>
          </div>
          <div className="vt-card vt-sec" style={{overflowX:'auto'}}>
            <table className="pr-dtable" style={{width:'100%'}}>
              <thead><tr><th>Código</th><th>Paciente</th><th>Espécie</th><th>Raça</th><th>Tutor</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((p,i)=>{
                  const st = p.status||'Ativo';
                  const stColor = st==='Óbito'?'#e0533c':st==='Inativo'?'#67788c':'#27a871';
                  return (
                    <tr key={p.id||i}>
                      <td style={{fontSize:12,color:'var(--muted)'}}>{window.vtPacienteCode?window.vtPacienteCode(p):p.id}</td>
                      <td><b>{p.name||'—'}</b></td>
                      <td>{p.species||'—'}</td>
                      <td style={{fontSize:12}}>{p.breed||'—'}</td>
                      <td style={{fontSize:12}}>{p.owner||'—'}</td>
                      <td><span style={{fontSize:11,fontWeight:600,color:stColor,background:stColor+'18',borderRadius:4,padding:'2px 7px'}}>{st}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Relatório de Estoque
    if (open === 'estoque') {
      const rows = inv.filter(i =>
        !buscaL || (i.name||'').toLowerCase().includes(buscaL) || (i.cat||i.category||'').toLowerCase().includes(buscaL)
      );
      const html = `<table><thead><tr><th>Item</th><th>Categoria</th><th>Quantidade</th><th>Mínimo</th><th>Unidade</th><th>Preço</th><th>Fornecedor</th><th>Status</th></tr></thead><tbody>
        ${rows.map(i=>{const q=Number(i.qty!=null?i.qty:i.stock);const st=q===0?'ZERADO':q<=Number(i.min||0)?'BAIXO':'OK';return`<tr><td>${i.name||''}</td><td>${i.cat||''}</td><td>${q}</td><td>${i.min||0}</td><td>${i.unit||''}</td><td>${window.vtMoney(Number(i.price||0))}</td><td>${i.supplier||''}</td><td class="${st==='OK'?'verde':st==='BAIXO'?'amarelo':'vermelho'} badge">${st}</td></tr>`}).join('')}
      </tbody></table>`;
      return (
        <div>
          <button className="vt-back" onClick={()=>{setOpen(null);setBusca('')}}><VtIcon name="chevron" size={16}/> Relatórios</button>
          <div className="vt-page-head vt-head-row">
            <div><h1>Relatório de Estoque</h1><p>{rows.length} itens · {lowStock.length} abaixo do mínimo</p></div>
            <button className="vt-btn-primary" onClick={()=>imprimir('Relatório de Estoque',html)}><VtIcon name="print" size={15}/> Imprimir / PDF</button>
          </div>
          <div className="vt-card vt-sec" style={{marginBottom:14}}>
            <input className="vtf-input" style={{width:'100%'}} placeholder="Filtrar por item ou categoria…" value={busca} onChange={e=>setBusca(e.target.value)}/>
          </div>
          <div className="vt-card vt-sec" style={{overflowX:'auto'}}>
            <table className="pr-dtable" style={{width:'100%'}}>
              <thead><tr><th>Item</th><th>Cat.</th><th style={{textAlign:'center'}}>Qtd</th><th style={{textAlign:'center'}}>Mín</th><th>Unidade</th><th>Preço unit.</th><th>Fornecedor</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((item,i)=>{
                  const q = Number(item.qty!=null?item.qty:item.stock);
                  const min = Number(item.min||0);
                  const st = q===0?'ZERADO':q<=min?'BAIXO':'OK';
                  const stColor = st==='OK'?'#27a871':st==='BAIXO'?'#e09c3c':'#e0533c';
                  return (
                    <tr key={item.id||i}>
                      <td><b>{item.name||'—'}</b></td>
                      <td style={{fontSize:12}}>{item.cat||item.category||'—'}</td>
                      <td style={{textAlign:'center',fontWeight:700,color:stColor}}>{q}</td>
                      <td style={{textAlign:'center',color:'var(--muted)',fontSize:12}}>{min}</td>
                      <td style={{fontSize:12}}>{item.unit||'—'}</td>
                      <td style={{fontSize:12}}>{window.vtMoney(Number(item.price||0))}</td>
                      <td style={{fontSize:12}}>{item.supplier||'—'}</td>
                      <td><span style={{fontSize:11,fontWeight:600,color:stColor,background:stColor+'18',borderRadius:4,padding:'2px 7px'}}>{st}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Relatório de Procedimentos (ranking)
    if (open === 'procedimentos') {
      const procMap = {};
      atsFiltrados.forEach(a => {
        const k = a.procedure || a.type || 'Sem procedimento';
        if (!procMap[k]) procMap[k] = { n: 0, total: 0, vet: {} };
        procMap[k].n++;
        const v = Number((a.value||'').replace(/[^\d,]/g,'').replace(',','.')) || 0;
        procMap[k].total += v;
        const vet = (a.vet||'').replace('M.V.','').trim() || 'Não informado';
        procMap[k].vet[vet] = (procMap[k].vet[vet]||0)+1;
      });
      const ranking = Object.entries(procMap).sort((a,b)=>b[1].n-a[1].n);
      const maxN = ranking[0] ? ranking[0][1].n : 1;
      const html = `<table><thead><tr><th>#</th><th>Procedimento</th><th>Realizações</th><th>Faturamento</th></tr></thead><tbody>
        ${ranking.map(([proc,d],i)=>`<tr><td>${i+1}º</td><td>${proc}</td><td>${d.n}</td><td>${window.vtMoney(d.total)}</td></tr>`).join('')}
      </tbody></table>`;
      return (
        <div>
          <button className="vt-back" onClick={()=>{setOpen(null);setBusca('')}}><VtIcon name="chevron" size={16}/> Relatórios</button>
          <div className="vt-page-head vt-head-row">
            <div><h1>Ranking de Procedimentos</h1><p>{ranking.length} procedimentos · {atsFiltrados.length} atendimentos no período</p></div>
            <button className="vt-btn-primary" onClick={()=>imprimir('Ranking de Procedimentos',html)}><VtIcon name="print" size={15}/> Imprimir / PDF</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:18}}>
            {ranking.map(([proc,d],i)=>{
              const pct = Math.round(d.n/maxN*100);
              const topVet = Object.entries(d.vet).sort((a,b)=>b[1]-a[1])[0];
              return (
                <div key={proc} className="vt-card" style={{padding:'14px 18px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                    <span style={{width:28,height:28,borderRadius:8,background:'var(--teal-t)',color:'var(--teal-d)',display:'grid',placeItems:'center',fontWeight:800,fontSize:13,flexShrink:0}}>{i+1}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <b style={{fontSize:14}}>{proc}</b>
                      {topVet && <span style={{fontSize:12,color:'var(--muted)',marginLeft:8}}>Principal: {topVet[0]}</span>}
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontWeight:800,color:'var(--teal-d)',fontSize:16}}>{d.n}x</div>
                      <div style={{fontSize:12,color:'var(--muted)'}}>{money(d.total)}</div>
                    </div>
                  </div>
                  <div style={{height:6,borderRadius:3,background:'var(--bg)'}}>
                    <div style={{height:'100%',borderRadius:3,background:'var(--teal)',width:pct+'%',transition:'width .3s'}}/>
                  </div>
                </div>
              );
            })}
            {ranking.length===0 && <p className="vt-muted" style={{padding:16}}>Nenhum procedimento no período.</p>}
          </div>
        </div>
      );
    }

    // Relatório de Taxa de Retorno
    if (open === 'retorno') {
      // por paciente: quantos atendimentos teve
      const porPaciente = {};
      ats.forEach(a => {
        if (!a.patientId) return;
        if (!porPaciente[a.patientId]) {
          const pac = patients.find(p => p.id === a.patientId) || {};
          porPaciente[a.patientId] = { name: pac.name||a.patientName||a.patientId, species: pac.species||'', owner: pac.owner||'', count: 0, dates: [] };
        }
        porPaciente[a.patientId].count++;
        if (a.date) porPaciente[a.patientId].dates.push(a.date);
      });
      const rows = Object.values(porPaciente).sort((a,b)=>b.count-a.count);
      const retornaram = rows.filter(r=>r.count>1);
      const totalAtivos = rows.length;
      return (
        <div>
          <button className="vt-back" onClick={()=>{setOpen(null);setBusca('')}}><VtIcon name="chevron" size={16}/> Relatórios</button>
          <div className="vt-page-head vt-head-row">
            <div><h1>Taxa de Retorno</h1><p>Pacientes que retornaram à clínica no período</p></div>
            <button className="vt-btn-primary" onClick={()=>imprimir('Taxa de Retorno',`<table><thead><tr><th>Paciente</th><th>Espécie</th><th>Tutor</th><th>Visitas</th></tr></thead><tbody>${retornaram.map(r=>`<tr><td>${r.name}</td><td>${r.species}</td><td>${r.owner}</td><td>${r.count}</td></tr>`).join('')}</tbody></table>`)}><VtIcon name="print" size={15}/> Imprimir</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:18}}>
            {[
              {label:'Pacientes atendidos', n:totalAtivos, color:'var(--navy)'},
              {label:'Retornaram',          n:retornaram.length, color:'var(--green)'},
              {label:'Taxa de retorno',     n:`${totalAtivos?Math.round(retornaram.length/totalAtivos*100):0}%`, color:'var(--teal-d)'},
            ].map(c=>(
              <div key={c.label} className="vt-card" style={{padding:'16px 20px'}}>
                <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>{c.label}</div>
                <div style={{fontSize:26,fontWeight:800,color:c.color}}>{c.n}</div>
              </div>
            ))}
          </div>
          <div className="vt-card vt-sec" style={{overflowX:'auto'}}>
            <table className="pr-dtable" style={{width:'100%'}}>
              <thead><tr><th>Paciente</th><th>Espécie</th><th>Tutor</th><th>Nº de visitas</th><th>Última visita</th></tr></thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i} style={{background:r.count>1?'var(--green-t)':'transparent'}}>
                    <td><b>{r.name}</b></td>
                    <td style={{fontSize:12}}>{r.species||'—'}</td>
                    <td style={{fontSize:12}}>{r.owner||'—'}</td>
                    <td style={{fontWeight:800,color:r.count>1?'var(--green)':'var(--muted)'}}>{r.count}x {r.count>1?'✓ Retornou':''}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{r.dates.sort().slice(-1)[0]||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Relatório de Espécies
    if (open === 'especies') {
      const total = patients.length || 1;
      const entries = Object.entries(porEspecie).sort((a,b)=>b[1]-a[1]);
      const cores = ['#14a8a0','#2f6fed','#6c3fc0','#e0533c','#e09c3c','#27a871'];
      const html = `<table><thead><tr><th>Espécie</th><th>Quantidade</th><th>%</th></tr></thead><tbody>
        ${entries.map(([k,v])=>`<tr><td>${k}</td><td>${v}</td><td>${Math.round(v/total*100)}%</td></tr>`).join('')}
      </tbody></table>`;
      return (
        <div>
          <button className="vt-back" onClick={()=>setOpen(null)}><VtIcon name="chevron" size={16}/> Relatórios</button>
          <div className="vt-page-head vt-head-row">
            <div><h1>Distribuição por Espécie</h1><p>{patients.length} pacientes · {entries.length} espécies</p></div>
            <button className="vt-btn-primary" onClick={()=>imprimir('Distribuição por Espécie',html)}><VtIcon name="print" size={15}/> Imprimir / PDF</button>
          </div>
          <div className="vt-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:18}}>
            {entries.map(([esp,qtd],i)=>{
              const pct = Math.round(qtd/total*100);
              return (
                <div key={esp} className="vt-card" style={{padding:'16px 20px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                    <span style={{width:12,height:12,borderRadius:'50%',background:cores[i%cores.length],flexShrink:0}}/>
                    <b style={{fontSize:14}}>{esp}</b>
                  </div>
                  <div style={{fontSize:28,fontWeight:800,color:cores[i%cores.length],lineHeight:1}}>{qtd}</div>
                  <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>{pct}% da base</div>
                  <div style={{height:4,borderRadius:2,background:'var(--border)',marginTop:10}}>
                    <div style={{height:'100%',borderRadius:2,background:cores[i%cores.length],width:pct+'%'}}/>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="vt-card vt-sec" style={{overflowX:'auto'}}>
            <table className="pr-dtable" style={{width:'100%'}}>
              <thead><tr><th>Espécie</th><th>Quantidade</th><th>% da base</th></tr></thead>
              <tbody>
                {entries.map(([esp,qtd],i)=>(
                  <tr key={esp}>
                    <td style={{display:'flex',alignItems:'center',gap:8}}><span style={{width:10,height:10,borderRadius:'50%',background:cores[i%cores.length],display:'inline-block'}}/><b>{esp}</b></td>
                    <td>{qtd}</td>
                    <td>{Math.round(qtd/total*100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  }

  // ---- TELA PRINCIPAL (cards) ----
  return (
    <div>
      <div className="vt-page-head vt-head-row">
        <div><h1>Relatórios</h1><p>Clique em um relatório para abrir, filtrar e imprimir</p></div>
        <select className="vtf-input" style={{width:160}} value={periodo} onChange={e=>setPeriodo(e.target.value)}>
          <option value="semana">Últimos 7 dias</option>
          <option value="mes">Este mês</option>
          <option value="ano">Este ano</option>
          <option value="tudo">Todo o histórico</option>
        </select>
      </div>

      {/* resumo financeiro rápido */}
      <div className="vt-grid" style={{gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18}}>
        {[
          { label:'Receita no período', val: money0(receita), cor:'#14a8a0' },
          { label:'Custos no período',  val: money0(custo),   cor:'#e0533c' },
          { label:'Lucro líquido',      val: money0(lucro),   cor: lucro>=0?'#27a871':'#e0533c' },
        ].map(k=>(
          <div key={k.label} className="vt-card" style={{padding:'14px 18px'}}>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>{k.label}</div>
            <div style={{fontSize:22,fontWeight:800,color:k.cor}}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="vt-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        {CARDS.map((c) => (
          <button key={c.id} className="vt-card vt-report" style={{cursor:'pointer',textAlign:'left',border:'1.5px solid var(--border)',transition:'box-shadow .15s'}}
            onClick={()=>{ setOpen(c.id); setBusca(''); }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 18px rgba(0,0,0,.10)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow=''}>
            <div className="vt-report-ic"><VtIcon name={c.icon} size={24} /></div>
            <div className="vt-report-body">
              <div className="vt-report-title">{c.title}</div>
              <div className="vt-report-desc">{c.desc}</div>
            </div>
            <div className="vt-report-num">
              <b>{c.n}</b><i>{c.sub}</i>
              <span style={{fontSize:11,color:'var(--teal)',marginTop:4,display:'block',fontWeight:600}}>Ver relatório →</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Configurações ---------------- */
window.SED_PROTO_DEFAULT = [
  { id: 'sp1', nome: 'Detomidina', especie: 'Equino', dose: '0,01–0,02 mg/kg', via: 'IV', obs: 'Sedação em pé. Início 2–5 min.' },
  { id: 'sp2', nome: 'Butorfanol', especie: 'Equino', dose: '0,01–0,025 mg/kg', via: 'IV', obs: 'Analgesia. Associar à detomidina.' },
  { id: 'sp3', nome: 'Detomidina + Butorfanol', especie: 'Equino', dose: '0,01 + 0,01 mg/kg', via: 'IV', obs: 'Protocolo padrão odontologia equina.' },
  { id: 'sp4', nome: 'Dexmedetomidina', especie: 'Cão/Gato', dose: '5–10 µg/kg', via: 'IM/IV', obs: 'Associar opioide conforme ASA.' },
  { id: 'sp5', nome: 'Acepromazina', especie: 'Cão/Gato', dose: '0,02–0,05 mg/kg', via: 'IM', obs: 'Pré-anestésico. Evitar em hipotensos.' },
];
window.vtSedProtocols = function () { const d = window.VtStore && window.VtStore.getData(); return (d && d.sedProtocols) || window.SED_PROTO_DEFAULT; };
window.vtSaveSedProtocols = function (l) { if (window.VtStore) window.VtStore.setData({ sedProtocols: l }); };
window.VT_NOTIF_DEFAULT = { waAgenda: true, waLembrete: true, waCobranca: true, waPosConsulta: false, emAgenda: true, emLembrete: false, emCobranca: true, emPosConsulta: false };
window.vtNotifCfg = function () { const d = window.VtStore && window.VtStore.getData(); return Object.assign({}, window.VT_NOTIF_DEFAULT, (d && d.notifCfg) || {}); };
window.vtSaveNotifCfg = function (c) { if (window.VtStore) window.VtStore.setData({ notifCfg: c }); };

// ── ODONTOGRAMA CFG ──────────────────────────────────────────────────────────
window.VT_ODONTO_CFG_DEFAULT = {
  conds: null, notation: 'triadan',
  mobilityLabels: ['Sem mobilidade detectável (M0)', 'Mobilidade ≤ 0,5 mm (M1)', 'Mobilidade 0,5–1 mm (M2)', 'Mobilidade > 1 mm ou depressão (M3)'],
  furcationLabels: ['Sem envolvimento (F0)', 'Sonda entra ≤ 1/3 da furca (F1)', 'Sonda entra > 1/3 mas não atravessa (F2)', 'Sonda atravessa a furca (F3)'],
  perioStages: [
    { stage: 'I',   label: 'Estágio I – Gingivite',               pocketMax: 3,  desc: 'Inflamação gengival sem perda de inserção' },
    { stage: 'II',  label: 'Estágio II – Periodontite inicial',   pocketMax: 5,  desc: '< 25 % de perda de inserção' },
    { stage: 'III', label: 'Estágio III – Periodontite moderada', pocketMax: 7,  desc: '25–50 % de perda de inserção' },
    { stage: 'IV',  label: 'Estágio IV – Periodontite avançada',  pocketMax: 99, desc: '> 50 % de perda de inserção' },
  ],
};
window.vtOdontoCfg = function () { const d = window.VtStore && window.VtStore.getData(); return Object.assign({}, window.VT_ODONTO_CFG_DEFAULT, (d && d.odontoCfg) || {}); };
window.vtSaveOdontoCfg = function (c) { if (window.VtStore) window.VtStore.setData({ odontoCfg: c }); if (c.conds && c.conds.length) window.OD_CONDS = c.conds; window.dispatchEvent(new CustomEvent('vtCfgChanged')); };

// ── AGENDA CFG ───────────────────────────────────────────────────────────────
window.VT_AGENDA_CFG_DEFAULT = {
  days: { seg: true, ter: true, qua: true, qui: true, sex: true, sab: false, dom: false },
  startTime: '08:00', endTime: '18:00', lunchStart: '12:00', lunchEnd: '13:00', useLunch: true,
  slotMin: 30, advanceDays: 60, holidays: [],
};
window.vtAgendaCfg = function () { const d = window.VtStore && window.VtStore.getData(); return Object.assign({}, window.VT_AGENDA_CFG_DEFAULT, (d && d.agendaCfg) || {}); };
window.vtSaveAgendaCfg = function (c) { if (window.VtStore) window.VtStore.setData({ agendaCfg: c }); window.dispatchEvent(new CustomEvent('vtCfgChanged')); };

// ── ESTOQUE CFG ──────────────────────────────────────────────────────────────
window.VT_ESTOQUE_CFG_DEFAULT = {
  categorias: ['Medicamentos', 'Materiais cirúrgicos', 'Descartáveis', 'Equipamentos', 'Limpeza', 'Outros'],
  unidades: ['un', 'cx', 'fr', 'amp', 'ml', 'g', 'kg', 'par', 'rolo'],
  alertThreshold: 5, fornecedores: [],
};
window.vtEstoqueCfg = function () { const d = window.VtStore && window.VtStore.getData(); return Object.assign({}, window.VT_ESTOQUE_CFG_DEFAULT, (d && d.estoqueCfg) || {}); };
window.vtSaveEstoqueCfg = function (c) { if (window.VtStore) window.VtStore.setData({ estoqueCfg: c }); window.dispatchEvent(new CustomEvent('vtCfgChanged')); };

// ── FINANCEIRO CFG ───────────────────────────────────────────────────────────
window.VT_FINANCEIRO_CFG_DEFAULT = {
  pagamentos: { dinheiro: true, credito: true, debito: true, pix: true, boleto: false, transferencia: false, convenio: false },
  pixTipo: 'celular', pixChave: '', creditoMaxParcelas: 12,
  iss: 5, prazoRecb: 0, multaMes: 2, nfInicio: 1, prefixoNF: '',
};
window.vtFinanceiroCfg = function () { const d = window.VtStore && window.VtStore.getData(); return Object.assign({}, window.VT_FINANCEIRO_CFG_DEFAULT, (d && d.financeiroCfg) || {}); };
window.vtSaveFinanceiroCfg = function (c) { if (window.VtStore) window.VtStore.setData({ financeiroCfg: c }); window.dispatchEvent(new CustomEvent('vtCfgChanged')); };

function SedacaoTab() {
  const [list, setList] = vtUseState(() => window.vtSedProtocols().map((p) => ({ ...p })));
  const persist = (l) => { setList(l); window.vtSaveSedProtocols(l); };
  const setK = (i, k, v) => persist(list.map((p, j) => j === i ? { ...p, [k]: v } : p));
  const add = () => persist([...list, { id: 'sp' + Date.now().toString(36), nome: '', especie: 'Equino', dose: '', via: 'IV', obs: '' }]);
  const del = (i) => persist(list.filter((_, j) => j !== i));
  return (
    <div className="vt-card vt-sec vt-form">
      <div className="vt-head-row" style={{ marginBottom: 12 }}>
        <div><div className="vt-form-sec" style={{ margin: 0 }}>Protocolos de sedação</div><p className="vt-muted" style={{ fontSize: 13, margin: '4px 0 0' }}>Doses padrão pré-definidas — aparecem como atalho no Passo 5 do odontograma.</p></div>
        <button className="vt-btn-primary" onClick={add}><VtIcon name="plus" size={15} /> Novo protocolo</button>
      </div>
      <table className="pr-dtable">
        <thead><tr><th>Fármaco</th><th style={{ width: 130 }}>Espécie</th><th style={{ width: 150 }}>Dose</th><th style={{ width: 90 }}>Via</th><th>Observação</th><th style={{ width: 44 }}></th></tr></thead>
        <tbody>
          {list.map((p, i) => (
            <tr key={p.id}>
              <td><input className="vtf-input" value={p.nome} placeholder="Ex.: Detomidina" onChange={(e) => setK(i, 'nome', e.target.value)} /></td>
              <td><input className="vtf-input" value={p.especie} onChange={(e) => setK(i, 'especie', e.target.value)} /></td>
              <td><input className="vtf-input" value={p.dose} placeholder="mg/kg" onChange={(e) => setK(i, 'dose', e.target.value)} /></td>
              <td><input className="vtf-input" value={p.via} onChange={(e) => setK(i, 'via', e.target.value)} /></td>
              <td><input className="vtf-input" value={p.obs} onChange={(e) => setK(i, 'obs', e.target.value)} /></td>
              <td><button className="pr-del-btn" onClick={() => del(i)}>✕</button></td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan="6" className="vt-muted" style={{ padding: 14 }}>Nenhum protocolo. Adicione um.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
function NotificacoesTab() {
  const [c, setC] = vtUseState(() => window.vtNotifCfg());
  const set = (k) => { const next = { ...c, [k]: !c[k] }; setC(next); window.vtSaveNotifCfg(next); };
  const Row = ({ title, sub, wa, em }) => (
    <div className="vt-clin-row" style={{ alignItems: 'center' }}>
      <span style={{ flex: 1 }}><b style={{ display: 'block', fontWeight: 700 }}>{title}</b><i style={{ fontStyle: 'normal', fontSize: 12.5, color: 'var(--muted)' }}>{sub}</i></span>
      <button className={`pr-check${c[wa] ? ' on' : ''}`} onClick={() => set(wa)}><span className="pr-check-box" style={c[wa] ? { background: '#25d366', borderColor: '#25d366' } : null}>{c[wa] ? '✓' : ''}</span>WhatsApp</button>
      <button className={`pr-check${c[em] ? ' on' : ''}`} onClick={() => set(em)}><span className="pr-check-box" style={c[em] ? { background: 'var(--teal)', borderColor: 'var(--teal)' } : null}>{c[em] ? '✓' : ''}</span>Email</button>
    </div>
  );
  return (
    <div className="vt-card vt-sec vt-form">
      <div className="vt-form-sec">Notificações automáticas</div>
      <p className="vt-muted" style={{ fontSize: 13, marginTop: 0 }}>Escolha por qual canal cada evento é enviado ao tutor.</p>
      <div className="vt-clin-rows">
        <Row title="Confirmação de agendamento" sub="Enviada quando uma consulta é marcada" wa="waAgenda" em="emAgenda" />
        <Row title="Lembrete 24h antes" sub="Lembra o tutor da consulta no dia anterior" wa="waLembrete" em="emLembrete" />
        <Row title="Cobrança" sub="Aviso de fatura/cobrança pendente" wa="waCobranca" em="emCobranca" />
        <Row title="Pós-consulta / resumo" sub="Enviada após o encerramento do atendimento" wa="waPosConsulta" em="emPosConsulta" />
      </div>
    </div>
  );
}
function SegurancaTab() {
  const [c, setC] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.securityCfg) || { pin: '', timeout: '30', twofa: false };
  });
  const save = (next) => { setC(next); if (window.VtStore) window.VtStore.setData({ securityCfg: next }); };
  const set = (k, v) => save({ ...c, [k]: v });
  const log = (() => { const d = window.VtStore && window.VtStore.getData(); return (d && d.accessLog) || []; })();
  return (
    <div>
      <div className="vt-ai-note" style={{ marginBottom: 14, fontSize: 13 }}>
        💡 Para <b>alterar a senha</b> de acesso da conta, vá em <b>Configurações → Conta &amp; Backup</b>.
      </div>
      <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
        <div className="vt-form-sec">PIN de bloqueio de tela</div>
        <p className="vt-muted" style={{ fontSize: 13, marginTop: 0 }}>PIN de 4 dígitos para bloquear e desbloquear a tela rapidamente — útil em terminais compartilhados. Use o botão 🔒 no topo para bloquear manualmente.</p>
        <div className="vt-form-row" style={{ alignItems: 'flex-end' }}>
          <label className="vtf" style={{ width: '30%' }}><span className="vtf-label">PIN (4 dígitos)</span><span className="vtf-inputwrap"><input className="vtf-input" inputMode="numeric" maxLength={4} value={c.pin || ''} onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" /></span></label>
          {c.pin && <button className="vt-btn-ghost" style={{ flex: 'none' }} onClick={() => set('pin', '')}>Remover PIN</button>}
        </div>
      </div>

      <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
        <div className="vt-form-sec">Sessão & autenticação</div>
        <div className="vt-form-row" style={{ alignItems: 'center' }}>
          <label className="vtf" style={{ width: '48%' }}><span className="vtf-label">Timeout de sessão (inatividade)</span><span className="vtf-inputwrap"><select className="vtf-input" value={c.timeout || '30'} onChange={(e) => set('timeout', e.target.value)}>
            <option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="never">Nunca expirar</option></select></span></label>
        </div>
        <label className="pr-check" style={{ marginTop: 6 }} onClick={() => set('twofa', !c.twofa)}><span className="pr-check-box" style={c.twofa ? { background: 'var(--teal)', borderColor: 'var(--teal)' } : null}>{c.twofa ? '✓' : ''}</span>Autenticação em dois fatores (2FA) por e-mail</label>
      </div>

      <div className="vt-card vt-sec">
        <div className="vt-form-sec">Log de acessos</div>
        <p className="vt-muted" style={{ fontSize: 13, marginTop: 0 }}>Últimos acessos registrados nesta conta.</p>
        <div className="vt-clin-rows">
          {log.length === 0 ? <div className="vt-empty-row">Nenhum acesso registrado ainda.</div> : log.slice(0, 8).map((l, i) => (
            <div key={i} className="vt-clin-row"><span style={{ flex: 1 }}>{l.user || 'Usuário'}</span><span className="vt-muted">{l.when || ''}</span><span className="vt-muted">{l.ip || ''}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}
function LgpdTab() {
  const [c, setC] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.lgpdCfg) || { termos: false, termosData: '', consentimento: true };
  });
  const save = (next) => { setC(next); if (window.VtStore) window.VtStore.setData({ lgpdCfg: next }); };
  const aceitar = () => save({ ...c, termos: true, termosData: new Date().toLocaleString('pt-BR') });
  const exportAll = () => {
    try {
      const data = window.VtStore.getData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `vettooth-dados-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      window.vtToast('Dados exportados.', 'ok');
    } catch (e) { window.vtToast('Falha ao exportar.', 'err'); }
  };
  const excluir = () => {
    const t = window.prompt('Esta ação remove dados sob demanda (LGPD). Digite EXCLUIR para confirmar:');
    if (t === 'EXCLUIR') window.vtToast('Solicitação de exclusão registrada. A equipe processará conforme a LGPD.', 'ok');
    else if (t != null) window.vtToast('Confirmação incorreta — nada foi excluído.', 'err');
  };
  return (
    <div>
      <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
        <div className="vt-form-sec">Termos de uso & política de privacidade</div>
        <p className="vt-muted" style={{ fontSize: 13, marginTop: 0 }}>O uso do sistema implica o tratamento de dados pessoais de tutores e da equipe conforme a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018). Os dados são armazenados localmente neste dispositivo.</p>
        {c.termos
          ? <p className="vt-ai-note"><VtIcon name="check" size={15} /> Termos aceitos em <b>{c.termosData}</b></p>
          : <div className="vt-form-actions" style={{ marginTop: 4 }}><button className="vt-btn-primary" onClick={aceitar}>Aceitar termos e política</button></div>}
      </div>

      <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
        <div className="vt-form-sec">Consentimento do tutor</div>
        <label className="pr-check" onClick={() => save({ ...c, consentimento: !c.consentimento })}><span className="pr-check-box" style={c.consentimento ? { background: 'var(--teal)', borderColor: 'var(--teal)' } : null}>{c.consentimento ? '✓' : ''}</span>Coletar consentimento do tutor no cadastro (uso de dados e contato)</label>
      </div>

      <div className="vt-card vt-sec">
        <div className="vt-form-sec">Direitos do titular (LGPD)</div>
        <p className="vt-muted" style={{ fontSize: 13, marginTop: 0 }}>Portabilidade e exclusão de dados sob demanda.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="vt-btn-ghost" onClick={exportAll}><VtIcon name="receipt" size={15} /> Exportar todos os dados (JSON)</button>
          <button className="vt-btn-ghost" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={excluir}>Solicitar exclusão de dados</button>
        </div>
      </div>
    </div>
  );
}
/* ====================== PROTOCOLOS TAB ====================== */
const PROTO_CATS = ['Clínica Geral', 'Odontologia', 'Cirurgia', 'Vacina', 'Medicação', 'Exame', 'Outro'];
function ProtocolosTab() {
  const [protocols, setProtocols] = vtUseState(() => window.vtProcProtocols());
  const [form, setForm] = vtUseState(null);
  const [insumoSearch, setInsumoSearch] = vtUseState('');
  const blank = { name: '', categoria: 'Clínica Geral', preco: '', tempo: '', descricao: '', insumos: [] };

  const reload = () => setProtocols(window.vtProcProtocols());
  const save = () => {
    if (!form.name.trim()) { window.vtToast('Informe o nome do protocolo.', 'err'); return; }
    window.vtSaveProcProtocol(form);
    reload(); setForm(null);
    window.vtToast('Protocolo salvo.', 'ok');
  };
  const del = (id) => {
    window.vtDeleteProcProtocol(id);
    reload(); window.vtToast('Protocolo removido.', 'ok');
  };

  const invItems = (() => { const d = window.VtStore && window.VtStore.getData(); return (d && d.inventory) || []; })();
  const filteredInv = invItems.filter((i) =>
    !insumoSearch || i.name.toLowerCase().includes(insumoSearch.toLowerCase())
  );
  const addInsumo = (item) => {
    const already = (form.insumos || []).find((x) => x.itemId === item.id);
    if (already) return;
    setForm((p) => ({ ...p, insumos: [...(p.insumos || []), { itemId: item.id, itemName: item.name, qty: 1, unit: item.unit || 'un' }] }));
    setInsumoSearch('');
  };
  const updInsumo = (itemId, k, v) => setForm((p) => ({ ...p, insumos: p.insumos.map((x) => x.itemId === itemId ? { ...x, [k]: v } : x) }));
  const delInsumo = (itemId) => setForm((p) => ({ ...p, insumos: p.insumos.filter((x) => x.itemId !== itemId) }));

  return (
    <div>
      <div className="vt-toolbar-row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <p className="vt-muted" style={{ margin: 0, fontSize: 13 }}>Cadastre protocolos com os insumos necessários. Os materiais são debitados do estoque automaticamente ao aplicar.</p>
        <button className="vt-btn-primary" onClick={() => setForm({ ...blank })}><VtIcon name="plus" size={15} /> Novo protocolo</button>
      </div>

      {form && (
        <div className="vt-card vt-sec" style={{ marginBottom: 18 }}>
          <h3 className="vt-sec-title">{form.id ? 'Editar protocolo' : 'Novo protocolo'}</h3>
          <div className="pr-fieldrow c2">
            <label className="pr-field"><span>Nome do protocolo *</span><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex.: Exodontia simples" /></label>
            <label className="pr-field"><span>Categoria</span>
              <select value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}>
                {PROTO_CATS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <div className="pr-fieldrow c2">
            <label className="pr-field"><span>Preço de venda (R$)</span><input value={form.preco} onChange={(e) => setForm((p) => ({ ...p, preco: e.target.value.replace(/\D/g, '') }))} placeholder="0" /></label>
            <label className="pr-field"><span>Tempo estimado</span><input value={form.tempo} onChange={(e) => setForm((p) => ({ ...p, tempo: e.target.value }))} placeholder="Ex.: 60 min" /></label>
          </div>
          <label className="pr-field" style={{ marginBottom: 14 }}><span>Descrição / observações</span><input value={form.descricao || ''} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Instruções, cuidados, observações…" /></label>

          <h4 style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 700 }}>Insumos / materiais utilizados</h4>
          {(form.insumos || []).length > 0 && (
            <table className="pr-dtable" style={{ marginBottom: 10 }}>
              <thead><tr><th>Item (estoque)</th><th style={{ width: 90 }}>Qtd</th><th style={{ width: 70 }}>Unid.</th><th></th></tr></thead>
              <tbody>
                {form.insumos.map((ins) => (
                  <tr key={ins.itemId}>
                    <td><b>{ins.itemName}</b></td>
                    <td><input className="num" value={ins.qty} onChange={(e) => updInsumo(ins.itemId, 'qty', e.target.value.replace(/[^\d.]/g, ''))} style={{ width: 80 }} /></td>
                    <td><input value={ins.unit} onChange={(e) => updInsumo(ins.itemId, 'unit', e.target.value)} style={{ width: 60 }} /></td>
                    <td><button className="pr-del-btn" onClick={() => delInsumo(ins.itemId)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <input value={insumoSearch} onChange={(e) => setInsumoSearch(e.target.value)} placeholder="Buscar item do estoque…" style={{ flex: 1, minWidth: 200, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
            {insumoSearch && filteredInv.slice(0, 6).map((i) => (
              <button key={i.id} className="pr-quickpick-btn" style={prChipStyle(false)} onClick={() => addInsumo(i)}>+ {i.name} ({i.qty} {i.unit})</button>
            ))}
            {insumoSearch && filteredInv.length === 0 && <span className="vt-muted" style={{ fontSize: 12 }}>Nenhum item no estoque. Cadastre em Estoque primeiro.</span>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="vt-btn-primary" onClick={save}>Salvar protocolo</button>
            <button className="vt-btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {protocols.length === 0 && !form && (
        <p className="pr-empty" style={{ textAlign: 'center', marginTop: 40 }}>Nenhum protocolo cadastrado. Clique em "Novo protocolo" para começar.</p>
      )}
      <div className="vt-stack">
        {protocols.map((p) => (
          <div key={p.id} className="vt-card vt-sec">
            <div className="pr-sec-head" style={{ marginBottom: 6 }}>
              <div>
                <h3 className="vt-sec-title" style={{ margin: 0 }}>{p.name}</h3>
                <p className="vt-muted" style={{ margin: '2px 0 0', fontSize: 12 }}>{p.categoria}{p.tempo ? ' · ' + p.tempo : ''}{p.preco ? ' · R$ ' + p.preco : ''}</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="vt-link" onClick={() => setForm({ ...p })}>Editar</button>
                <button className="pr-del-btn" onClick={() => del(p.id)}>✕</button>
              </div>
            </div>
            {p.descricao && <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--muted)' }}>{p.descricao}</p>}
            {p.insumos && p.insumos.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {p.insumos.map((ins) => (
                  <span key={ins.itemId} style={{ background: 'var(--teal-t)', color: 'var(--teal-d)', borderRadius: 12, padding: '2px 9px', fontSize: 12 }}>{ins.itemName}: {ins.qty} {ins.unit}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   ServiceCatalogTab — catálogo de serviços precificados
   ============================================================ */
const SVC_TIPOS = ['Procedimento', 'Vacina', 'Medicamento', 'Curativo'];
const SVC_UNIDADES = ['un', 'dose', 'ml', 'comprimido', 'ampola', 'frasco', 'sessão', 'kg'];

function InsumoRow({ ins, idx, inv, onUpd, onDel, onPick, money }) {
  const [q, setQ] = vtUseState('');
  const filtered = q ? inv.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', position: 'relative' }}>
      <div style={{ flex: 2, minWidth: 190, position: 'relative' }}>
        <input value={ins.nome || q} onChange={(e) => { setQ(e.target.value); onUpd(idx, 'nome', e.target.value); }} placeholder="Buscar insumo do estoque…" style={{ width: '100%', padding: '5px 9px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }} />
        {filtered.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 9, zIndex: 20, boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}>
            {filtered.map((x) => <button key={x.id} onClick={() => { onPick(idx, x); setQ(''); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 13px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}>{x.name} ({x.qty} {x.unit})</button>)}
          </div>
        )}
      </div>
      <input className="num" value={ins.qty} onChange={(e) => onUpd(idx, 'qty', Number(e.target.value.replace(/\D/g, '')) || 1)} placeholder="Qtd" style={{ width: 58, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }} />
      <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 28 }}>{ins.unit || 'un'}</span>
      {ins.custoUnit > 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>≈ {money((ins.custoUnit || 0) * (Number(ins.qty) || 1))}</span>}
      <button className="pr-del-btn" onClick={() => onDel(idx)}>✕</button>
    </div>
  );
}

function ServiceCatalogTab() {
  const money = window.PR ? window.PR.money : (n) => 'R$ ' + Number(n).toFixed(2);
  const [tipo, setTipo] = vtUseState('Procedimento');
  const [items, setItems] = vtUseState(() => window.vtServiceCatalog(tipo));
  const [form, setForm] = vtUseState(null);
  const inv = (() => { const d = window.VtStore && window.VtStore.getData(); return (d && d.inventory) || []; })();

  const switchTipo = (t) => { setTipo(t); setItems(window.vtServiceCatalog(t)); setForm(null); };
  const reload = () => setItems(window.vtServiceCatalog(tipo));

  const blank = (t) => ({ nome: '', descricao: '', preco: '', custo: '', unidade: t === 'Medicamento' ? 'dose' : 'un', insumos: [], ativo: true, tipo: t || tipo });

  const calcCusto = (insumos, inv2) => (insumos || []).reduce((s, ins) => {
    const it = (inv2 || inv).find((x) => x.id === ins.itemId);
    const cu = it && window.PR ? (window.PR.parseMoney(it.cost) || 0) : (Number(ins.custoUnit) || 0);
    return s + cu * (Number(ins.qty) || 1);
  }, 0);

  const updF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const addInsumo = () => setForm((p) => ({ ...p, insumos: [...(p.insumos || []), { itemId: '', nome: '', qty: 1, unit: 'un', custoUnit: 0 }] }));
  const updInsumo = (i, k, v) => setForm((p) => { const ins = p.insumos.map((x, j) => j === i ? { ...x, [k]: v } : x); return { ...p, insumos: ins }; });
  const delInsumo = (i) => setForm((p) => ({ ...p, insumos: p.insumos.filter((_, j) => j !== i) }));
  const pickInsumo = (i, invItem) => {
    const cu = window.PR ? (window.PR.parseMoney(invItem.cost) || 0) : 0;
    setForm((p) => {
      const ins = p.insumos.map((x, j) => j === i ? { ...x, itemId: invItem.id, nome: invItem.name, unit: invItem.unit, custoUnit: cu } : x);
      const custo = calcCusto(ins, inv);
      return { ...p, insumos: ins, custo: String(custo.toFixed(2)) };
    });
  };

  const save = () => {
    if (!form.nome.trim()) { window.vtToast('Informe o nome do serviço.', 'err'); return; }
    const preco = parseFloat(String(form.preco).replace(',', '.')) || 0;
    const custo = parseFloat(String(form.custo).replace(',', '.')) || calcCusto(form.insumos);
    const toSave = { ...form, nome: form.nome.trim(), preco, custo };
    delete toSave._new;
    window.vtSaveServiceItem(toSave);
    reload(); setForm(null);
    window.vtToast('Serviço salvo.', 'ok');
  };

  const del = (id) => { if (!confirm('Excluir este serviço?')) return; window.vtDeleteServiceItem(id); reload(); };

  const preco = form ? (parseFloat(String(form.preco).replace(',', '.')) || 0) : 0;
  const custo = form ? (parseFloat(String(form.custo).replace(',', '.')) || calcCusto(form.insumos || [])) : 0;

  return (
    <div>
      <div className="vt-head-row" style={{ marginBottom: 14 }}>
        <div>
          <h3 className="vt-sec-title" style={{ margin: 0 }}>Catálogo de Serviços</h3>
          <p className="vt-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Cadastre e precifique procedimentos, vacinas, medicamentos e curativos. Ao selecionar no atendimento, o preço entra automaticamente.</p>
        </div>
        {!form && <button className="vt-btn-primary" onClick={() => setForm({ ...blank(tipo), _new: true })}><VtIcon name="plus" size={15} /> Novo {tipo}</button>}
      </div>
      <div className="vt-chip-row" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {SVC_TIPOS.map((t) => <button key={t} onClick={() => switchTipo(t)} style={prChipStyle(tipo === t)}>{t}</button>)}
      </div>

      {!form && (
        <div className="vt-card vt-sec">
          {items.length === 0 ? <p className="pr-empty">Nenhum {tipo.toLowerCase()} cadastrado. Clique em "Novo {tipo}" para começar.</p> : (
            <table className="pr-dtable">
              <thead><tr><th>Nome</th><th>Unidade</th><th style={{ width: 130 }}>Preço</th><th style={{ width: 120 }}>Custo</th><th style={{ width: 110 }}>Lucro</th><th style={{ width: 100 }}></th></tr></thead>
              <tbody>
                {items.map((it) => {
                  const lucro = (it.preco || 0) - (it.custo || 0);
                  return (
                    <tr key={it.id}>
                      <td><b>{it.nome}</b>{it.descricao && <i style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{it.descricao}</i>}{it.insumos && it.insumos.length > 0 && <i style={{ display: 'block', fontSize: 11, color: 'var(--teal-d)' }}>{it.insumos.length} insumo(s) vinculado(s)</i>}</td>
                      <td>{it.unidade}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 700 }}>{money(it.preco || 0)}</td>
                      <td style={{ color: 'var(--red)' }}>{money(it.custo || 0)}</td>
                      <td style={{ color: lucro >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{money(lucro)}</td>
                      <td><div style={{ display: 'flex', gap: 6 }}><button className="vt-link" onClick={() => setForm({ ...it })}>Editar</button><button className="pr-del-btn" onClick={() => del(it.id)}>✕</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {form && (
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">{form._new ? 'Novo ' + tipo : 'Editar · ' + form.nome}</h3>
          <div className="pr-fieldrow c2">
            <label className="pr-field"><span>Nome *</span><input value={form.nome} onChange={(e) => updF('nome', e.target.value)} placeholder={tipo === 'Procedimento' ? 'Ex.: Limpeza dentária' : tipo === 'Vacina' ? 'Ex.: V10 Canina' : tipo === 'Medicamento' ? 'Ex.: Amoxicilina 50mg/ml' : 'Ex.: Curativo simples'} /></label>
            <label className="pr-field"><span>Unidade de cobrança</span>
              <select value={form.unidade} onChange={(e) => updF('unidade', e.target.value)}>
                {SVC_UNIDADES.map((u) => <option key={u}>{u}</option>)}
              </select>
            </label>
          </div>
          <label className="pr-field" style={{ marginBottom: 14 }}><span>Descrição (opcional)</span><input value={form.descricao} onChange={(e) => updF('descricao', e.target.value)} placeholder="Breve descrição do serviço" /></label>
          <div className="pr-fieldrow c2">
            <label className="pr-field"><span>Preço cobrado (R$)</span><input className="num" value={form.preco} onChange={(e) => updF('preco', e.target.value)} placeholder="0,00" /></label>
            <label className="pr-field">
              <span>Custo estimado (R$) <i style={{ fontWeight: 400, fontSize: 11 }}>— calculado dos insumos abaixo</i></span>
              <input className="num" value={form.custo} onChange={(e) => updF('custo', e.target.value)} placeholder={calcCusto(form.insumos || []).toFixed(2)} />
            </label>
          </div>
          <div style={{ margin: '16px 0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Insumos consumidos <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--muted)' }}>— serão deduzidos do estoque ao usar no atendimento</span></h4>
            <button className="pr-addrow" onClick={addInsumo}><VtIcon name="plus" size={13} /> Adicionar insumo</button>
          </div>
          {(form.insumos || []).length === 0 && <p className="vt-muted" style={{ fontSize: 12.5, marginBottom: 8 }}>Nenhum insumo vinculado.</p>}
          {(form.insumos || []).map((ins, i) => (
            <InsumoRow key={i} ins={ins} idx={i} inv={inv} onUpd={updInsumo} onDel={delInsumo} onPick={pickInsumo} money={money} />
          ))}
          <div style={{ marginTop: 12, padding: '10px 16px', background: 'var(--bg)', borderRadius: 10, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <span>Preço: <b style={{ color: 'var(--green)' }}>{money(preco)}</b></span>
            <span>Custo: <b style={{ color: 'var(--red)' }}>{money(custo)}</b></span>
            <span>Lucro: <b style={{ color: preco - custo >= 0 ? 'var(--green)' : 'var(--red)' }}>{money(preco - custo)}</b></span>
          </div>
          <div className="fin-modal-actions" style={{ marginTop: 16 }}>
            <button className="vt-btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button className="vt-btn-primary" onClick={save}>Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigModule() {
  const [tab, setTab] = vtUseState(null);

  const groups = [
    { title: 'Clínica', items: [
      { id: 'clinica',       icon: 'tooth',        label: 'Clínica',               desc: 'Dados cadastrais, logo e endereço' },
      { id: 'equipe',        icon: 'users',         label: 'Veterinários',          desc: 'Equipe, colaboradores e assinaturas' },
    ]},
    { title: 'Atendimento', items: [
      { id: 'consultas',     icon: 'receipt',       label: 'Tipos de consulta',     desc: 'Categorias e formas de atendimento' },
      { id: 'especialidades',icon: 'spark',         label: 'Especialidades',        desc: 'Áreas de atuação da clínica' },
      { id: 'catalogo',      icon: 'box',           label: 'Catálogo de Serviços',  desc: 'Procedimentos e tabela de preços' },
      { id: 'sedacao',       icon: 'syringe',       label: 'Sedação',               desc: 'Protocolos anestésicos padrão' },
      { id: 'protocolos',    icon: 'list',          label: 'Protocolos',            desc: 'Fluxos e checklists clínicos' },
      { id: 'odontograma',   icon: 'tooth',         label: 'Odontograma',           desc: 'Condições, escalas clínicas e notação' },
    ]},
    { title: 'Documentos & Modelos', items: [
      { id: 'roteiros',      icon: 'pen',           label: 'Modelos de consulta',   desc: 'Roteiros, anamneses e campos personalizados' },
      { id: 'prescricoes',   icon: 'receipt',       label: 'Prescrições',           desc: 'Modelos de receituário médico' },
      { id: 'exames',        icon: 'search',        label: 'Exames',                desc: 'Solicitações padrão de exame complementar' },
      { id: 'modelos',       icon: 'file',          label: 'Modelos & PDF',         desc: 'Documentos, termos e layouts de impressão' },
    ]},
    { title: 'Operacional', items: [
      { id: 'agenda',        icon: 'bell',          label: 'Agenda',                desc: 'Horários, slots, feriados e disponibilidade' },
      { id: 'estoque',       icon: 'box',           label: 'Estoque',               desc: 'Categorias, unidades, fornecedores e alertas' },
      { id: 'financeiro',    icon: 'receipt',       label: 'Financeiro',            desc: 'Formas de pagamento, ISS e regras de cobrança' },
    ]},
    { title: 'Sistema', items: [
      { id: 'sistema',       icon: 'gear',          label: 'Sistema',               desc: 'Idioma, moeda, cores e tipo de operação' },
      { id: 'notificacoes',  icon: 'bell',          label: 'Notificações',          desc: 'Alertas, lembretes e comunicação automática' },
      { id: 'integracoes',   icon: 'link',          label: 'Integrações',           desc: 'Conectar agendas, pagamentos e serviços externos' },
      { id: 'parceiras',     icon: 'pin',           label: 'Clínicas parceiras',    desc: 'Rede de referência e encaminhamentos' },
    ]},
    { title: 'Conta & Segurança', items: [
      { id: 'conta',         icon: 'user',          label: 'Conta & backup',        desc: 'Perfil profissional e exportação de dados' },
      { id: 'seguranca',     icon: 'shield',        label: 'Segurança',             desc: 'Senha, PIN e controle de acesso' },
      { id: 'lgpd',          icon: 'check',         label: 'Termos & LGPD',         desc: 'Consentimentos, privacidade e conformidade' },
    ]},
  ];

  const allItems = groups.flatMap((g) => g.items);
  const current = tab ? allItems.find((i) => i.id === tab) : null;

  const cardStyle = {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%',
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s, box-shadow .15s',
  };
  const iconWrap = {
    width: 42, height: 42, borderRadius: 10, background: 'var(--teal-t)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--teal)',
  };

  if (tab) {
    return (
      <div>
        <div className="vt-page-head" style={{ marginBottom: 20 }}>
          <button className="vt-back" onClick={() => setTab(null)} style={{ marginBottom: 6 }}>
            <VtIcon name="chevron" size={16} style={{ transform: 'rotate(90deg)' }} /> Configurações
          </button>
          <h1 style={{ marginTop: 0 }}>{current?.label}</h1>
          {current?.desc && <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>{current.desc}</p>}
        </div>
        {tab === 'clinica'        && <ClinicaTab />}
        {tab === 'equipe'         && <EquipeTab />}
        {tab === 'seguranca'      && <SegurancaTab />}
        {tab === 'notificacoes'   && <NotificacoesTab />}
        {tab === 'sedacao'        && <SedacaoTab />}
        {tab === 'sistema'        && <SistemaTab />}
        {tab === 'conta'          && <ContaTab />}
        {tab === 'parceiras'      && <ParceirasTab />}
        {tab === 'consultas'      && <ConsultasTab />}
        {tab === 'especialidades' && <EspecialidadesTab />}
        {tab === 'roteiros'       && <RoteirosTab />}
        {tab === 'prescricoes'    && <RxPresetsTab />}
        {tab === 'exames'         && <ExamPresetsTab />}
        {tab === 'modelos'        && <ModelosTab />}
        {tab === 'integracoes'    && <IntegracoesTab />}
        {tab === 'lgpd'           && <LgpdTab />}
        {tab === 'protocolos'     && <ProtocolosTab />}
        {tab === 'catalogo'       && <ServiceCatalogTab />}
        {tab === 'odontograma'    && <OdontogramaTab />}
        {tab === 'agenda'         && <AgendaConfigTab />}
        {tab === 'estoque'        && <EstoqueConfigTab />}
        {tab === 'financeiro'     && <FinanceiroConfigTab />}
      </div>
    );
  }

  return (
    <div>
      <div className="vt-page-head"><h1>Configurações</h1><p>Personalize sua clínica, equipe e sistema</p></div>
      {groups.map((g) => (
        <div key={g.title} style={{ marginBottom: 28 }}>
          <h3 className="vt-sec-title" style={{ marginBottom: 12, fontSize: 11.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>{g.title}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {g.items.map((item) => (
              <button key={item.id} style={cardStyle} onClick={() => setTab(item.id)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(20,168,160,.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={iconWrap}><VtIcon name={item.icon} size={20} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{item.desc}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
function ContaTab() {
  const u = (window.VtStore.currentUser && window.VtStore.currentUser()) || {};
  const fileRef = React.useRef(null);
  const pfxRef = React.useRef(null);
  const [pw, setPw] = vtUseState({ atual: '', nova: '' });
  const [icpSession, setIcpSession] = vtUseState(() => window.vtIcpA1Session || null);
  const [pfxPw, setPfxPw] = vtUseState('');
  const [pfxLoading, setPfxLoading] = vtUseState(false);
  // membro de equipe do usuário logado (admin + veterinário)
  const meIdx = (() => { const t = window.vtTeam(); const i = t.findIndex((m) => m.vet); return i >= 0 ? i : 0; })();
  const [me, setMe] = vtUseState(() => { const t = window.vtTeam(); return { ...(t[meIdx] || { name: u.name || '', vet: true }) }; });
  const setMeK = (k) => (v) => setMe((p) => ({ ...p, [k]: v }));
  const saveMe = () => {
    const t = window.vtTeam().map((x) => ({ ...x }));
    if (t[meIdx]) t[meIdx] = { ...t[meIdx], ...me, vet: true }; else t.unshift({ ...me, id: 'me', vet: true });
    window.vtSaveTeam(t);
    window.vtToast('Assinatura e dados profissionais salvos.', 'ok');
  };
  const doExport = () => {
    const payload = window.VtStore.exportData();
    if (!payload) { window.vtToast('Nada para exportar.', 'err'); return; }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `vettooth-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    window.vtToast('Backup exportado.', 'ok');
  };
  const onFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const payload = JSON.parse(r.result);
        if (!window.confirm('Restaurar este backup vai SUBSTITUIR os dados atuais. Continuar?')) return;
        const res = window.VtStore.importData(payload, 'replace');
        if (res.ok) { window.vtToast('Backup restaurado. Recarregando...', 'ok'); setTimeout(() => location.reload(), 900); }
        else window.vtToast(res.error, 'err');
      } catch (err) { window.vtToast('Arquivo inválido.', 'err'); }
    };
    r.readAsText(file);
  };
  const changePw = async () => {
    const res = await window.VtStore.changePassword(pw.atual, pw.nova);
    if (res.ok) { window.vtToast('Senha alterada.', 'ok'); setPw({ atual: '', nova: '' }); }
    else window.vtToast(res.error, 'err');
  };
  const loadA1 = (file) => {
    if (!file) return;
    setPfxLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const forge = window.forge;
        if (!forge) { window.vtToast('Biblioteca de certificados ainda carregando. Aguarde e tente novamente.', 'err'); setPfxLoading(false); return; }
        const byteArr = new Uint8Array(reader.result);
        let binary = '';
        byteArr.forEach((b) => { binary += String.fromCharCode(b); });
        const p12Der = forge.util.binary.raw.decode(binary);
        const p12Asn1 = forge.asn1.fromDer(p12Der);
        let p12;
        try { p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pfxPw); }
        catch (e) { window.vtToast('Senha incorreta ou arquivo inválido.', 'err'); setPfxLoading(false); return; }
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
        const certList = (certBags[forge.pki.oids.certBag] || []).filter((b) => b.cert);
        const keyList = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
        if (!certList.length) { window.vtToast('Nenhum certificado encontrado no arquivo.', 'err'); setPfxLoading(false); return; }
        if (!keyList.length) { window.vtToast('Chave privada não encontrada no arquivo .pfx.', 'err'); setPfxLoading(false); return; }
        const cert = certList[0].cert;
        const privateKey = keyList[0].key;
        const getCN = (name) => { try { return name.getField('CN').value; } catch (e) { return ''; } };
        const cn = getCN(cert.subject);
        const issuerCN = getCN(cert.issuer);
        const validTo = cert.validity.notAfter;
        const validFrom = cert.validity.notBefore;
        const serial = cert.serialNumber;
        const isValid = new Date() < validTo;
        const cpf = (() => { const m = cn.match(/\d{11}/); return m ? m[0].replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : ''; })();
        const mmyyyy = `${String(validTo.getMonth() + 1).padStart(2, '0')}/${validTo.getFullYear()}`;
        const session = { cert, privateKey, certPem: forge.pki.certificateToPem(cert), cn, cpf, issuerCN, validTo, validFrom, serial, isValid };
        window.vtIcpA1Session = session;
        setIcpSession(session);
        setMe((p) => ({ ...p, icpTipo: 'A1', icpTitular: cn || p.icpTitular, icpCpf: cpf || p.icpCpf, icpAC: issuerCN || p.icpAC, icpValidade: mmyyyy, icpSerial: serial || p.icpSerial }));
        window.vtToast(isValid ? '✅ Certificado A1 carregado com sucesso!' : '⚠️ Certificado carregado, mas está vencido.', isValid ? 'ok' : 'err');
        setPfxPw('');
      } catch (e) { window.vtToast('Erro ao processar certificado: ' + (e.message || e), 'err'); }
      finally { setPfxLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };
  return (
    <div>
      <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
        <div className="vt-form-sec">Conta</div>
        <div className="vt-clin-rows">
          <div className="vt-clin-row"><span>Nome</span><b>{u.name || '—'}</b></div>
          <div className="vt-clin-row"><span>Email de acesso</span><b>{u.email || '—'}</b></div>
          <div className="vt-clin-row"><span>Clínica</span><b>{u.clinic || '—'}</b></div>
        </div>
        <p className="vt-ai-note" style={{ marginTop: 12 }}><VtIcon name="spark" size={15} /> Seus dados e os dos pacientes ficam salvos na sua conta e <b>permanecem</b> a cada atualização do sistema. Faça backups periódicos por segurança.</p>
      </div>

      <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
        <div className="vt-form-sec">Backup dos dados</div>
        <p className="vt-muted" style={{ fontSize: 13, marginTop: 0 }}>Exporte um arquivo com todos os pacientes, clientes, atendimentos e configurações — ou restaure de um backup.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="vt-btn-primary" onClick={doExport}><VtIcon name="receipt" size={15} /> Exportar backup</button>
          <button className="vt-btn-ghost" onClick={() => fileRef.current && fileRef.current.click()}><VtIcon name="plus" size={15} /> Restaurar backup</button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={onFile} />
        </div>
      </div>

      <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
        <div className="vt-form-sec">Minha assinatura digital & carimbo</div>
        <p className="vt-muted" style={{ fontSize: 13, marginTop: 0 }}>Sua assinatura, CRMV e especialidade entram automaticamente no rodapé de receitas, atestados e laudos que você emitir.</p>
        <div className="vt-form-row">
          <VtField label="Nome profissional" value={me.name} onChange={setMeK('name')} width="46%" />
          <VtField label="CRMV" value={me.crmv} onChange={setMeK('crmv')} placeholder="CRMV-SP 12345" width="26%" />
          <VtField label="Especialidade" value={me.especialidade} onChange={setMeK('especialidade')} placeholder="Ex.: Odontologia" width="26%" />
        </div>
        <span className="vtf-label" style={{ display: 'block', marginBottom: 6 }}>Assinatura (desenhe abaixo)</span>
        <SignaturePad value={me.sign} onChange={setMeK('sign')} label={`${me.name || 'Veterinário'} — ${me.crmv || 'CRMV'}`} />
        <label className="vt-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, cursor: 'pointer' }}>
          <VtIcon name="plus" size={14} /> ou enviar foto da assinatura
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => setMeK('sign')(r.result); r.readAsDataURL(file); }} />
        </label>
        <div className="vt-form-actions"><button className="vt-btn-primary" onClick={saveMe}>Salvar assinatura</button></div>
      </div>

      {(() => { const [icpOpen, setIcpOpen] = vtUseState(false); return (
      <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
        <div className="vt-form-sec" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => setIcpOpen(p => !p)}>
          <span>🔏 Certificado Digital ICP-Brasil</span>
          <span style={{ fontSize:12, color:'var(--muted)', fontWeight:400 }}>{icpOpen ? '▲ recolher' : '▼ expandir'}</span>
        </div>
        {!icpOpen && <p className="vt-muted" style={{ fontSize:12.5, margin:'4px 0 0' }}>Configuração de e-CPF A1/A3 para assinatura qualificada de receituário de controle especial.</p>}
        {icpOpen && <div>
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, fontSize: 12.5, color: '#1e40af' }}>
          <b>Tipo de assinatura por receituário:</b><br />
          • <b>Simples / Antimicrobiano:</b> Assinatura Avançada — Gov.br prata/ouro (Lei 14.063/2020)<br />
          • <b>Controle Especial (NRV):</b> Assinatura <b>Qualificada</b> — e-CPF ICP-Brasil (Portaria MAPA/SDA 837/2025)
        </div>
        <div className="vt-form-row">
          <label className="vtf-wrap" style={{ width: '32%' }}>
            <span className="vtf-label">Tipo de certificado</span>
            <select className="vtf-input" value={me.icpTipo || 'A1'} onChange={(e) => setMeK('icpTipo')(e.target.value)}>
              <option value="">Não configurado</option>
              <option value="A1">e-CPF A1 (arquivo .pfx)</option>
              <option value="A3">e-CPF A3 (token/smartcard)</option>
              <option value="nuvem">e-CPF em nuvem (VidaaS / SafeSign)</option>
            </select>
          </label>
          <VtField label="Titular (nome no certificado)" value={me.icpTitular || ''} onChange={setMeK('icpTitular')} placeholder="Como consta no certificado" width="66%" />
        </div>
        <div className="vt-form-row">
          <VtField label="e-CPF (CPF do titular)" value={me.icpCpf || ''} onChange={setMeK('icpCpf')} placeholder="000.000.000-00" width="32%" />
          <VtField label="Autoridade Certificadora (AC)" value={me.icpAC || ''} onChange={setMeK('icpAC')} placeholder="Ex.: Certisign, Serpro, Valid" width="36%" />
          <VtField label="Validade do certificado" value={me.icpValidade || ''} onChange={setMeK('icpValidade')} placeholder="MM/AAAA" width="28%" />
        </div>
        <VtField label="Número de série (opcional)" value={me.icpSerial || ''} onChange={setMeK('icpSerial')} placeholder="Ex.: 12:AB:CD:EF:..." />

        {/* ---- A1: carregar .pfx em memória ---- */}
        {(!me.icpTipo || me.icpTipo === 'A1') && (
          <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--line)' }}>
            {icpSession ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--green)' }}>Certificado A1 carregado nesta sessão</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{icpSession.cn}</div>
                  </div>
                  <button className="vt-btn-ghost" style={{ fontSize: 12, color: 'var(--red)', borderColor: 'var(--red)', flex: 'none' }} onClick={() => { delete window.vtIcpA1Session; setIcpSession(null); window.vtToast('Certificado removido da sessão.', 'ok'); }}>Remover</button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, background: 'var(--card)', borderRadius: 8, padding: '8px 12px' }}>
                  <b>AC:</b> {icpSession.issuerCN}<br />
                  <b>Série:</b> {icpSession.serial}<br />
                  <b>Válido:</b> {icpSession.validFrom.toLocaleDateString('pt-BR')} → {icpSession.validTo.toLocaleDateString('pt-BR')}
                  {!icpSession.isValid && <span style={{ color: 'var(--red)', fontWeight: 700 }}>&nbsp;⚠️ VENCIDO</span>}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Carregar certificado A1 (.pfx) nesta sessão</div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 12px' }}>O arquivo fica apenas em memória — nunca é salvo no servidor ou localStorage. Você precisará carregá-lo novamente a cada sessão.</p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <label className="vtf" style={{ flex: 'none' }}>
                    <span className="vtf-label">Senha do .pfx</span>
                    <span className="vtf-inputwrap"><input className="vtf-input" type="password" value={pfxPw} onChange={(e) => setPfxPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && pfxRef.current && pfxRef.current.click()} placeholder="Senha do arquivo" style={{ width: 210 }} /></span>
                  </label>
                  <button className="vt-btn-primary" disabled={pfxLoading} style={{ flex: 'none' }} onClick={() => pfxRef.current && pfxRef.current.click()}>
                    {pfxLoading ? '⏳ Carregando...' : '🔐 Selecionar .pfx'}
                  </button>
                  <input ref={pfxRef} type="file" accept=".pfx,.p12" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) loadA1(e.target.files[0]); e.target.value = ''; }} />
                </div>
                {!window.forge && <p style={{ fontSize: 12, color: 'var(--amber)', marginTop: 8, margin: '8px 0 0' }}>⚠️ Biblioteca de certificados carregando, aguarde alguns segundos.</p>}
              </div>
            )}
          </div>
        )}

        {/* ---- A3: orientação ---- */}
        {me.icpTipo === 'A3' && (
          <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13, lineHeight: 1.7 }}>
            <b>Token A3 (USB / smartcard):</b> instale a extensão <b>Lacuna Web PKI</b> no navegador. Após a instalação o sistema reconhece o token automaticamente ao emitir documentos.<br />
            <a href="https://webpki.lacunasoftware.com/Home/Download" target="_blank" rel="noopener noreferrer" className="vt-link" style={{ marginTop: 4, display: 'inline-block' }}>Baixar Lacuna Web PKI →</a>
          </div>
        )}

        {/* ---- Nuvem: orientação ---- */}
        {me.icpTipo === 'nuvem' && (
          <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13, lineHeight: 1.7 }}>
            <b>Certificado em nuvem (VidaaS / SafeSign):</b> ao emitir um documento, você será redirecionado para autenticar na sua provedora e a assinatura será aplicada automaticamente.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
          <button className="vt-btn-primary" onClick={saveMe}>Salvar dados do certificado</button>
          <a href="https://assinador.iti.br" target="_blank" rel="noopener noreferrer" className="vt-btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>🔗 Assinador ITI (backup)</a>
        </div>
        </div>}
      </div>
      ); })()}

      <div className="vt-card vt-sec vt-form">
        <div className="vt-form-sec">Alterar senha</div>
        <div className="vt-form-row">
          <label className="vtf" style={{ width: '48%' }}><span className="vtf-label">Senha atual</span><span className="vtf-inputwrap"><input className="vtf-input" type="password" value={pw.atual} onChange={(e) => setPw({ ...pw, atual: e.target.value })} /></span></label>
          <label className="vtf" style={{ width: '48%' }}><span className="vtf-label">Nova senha</span><span className="vtf-inputwrap"><input className="vtf-input" type="password" value={pw.nova} onChange={(e) => setPw({ ...pw, nova: e.target.value })} placeholder="6+ caracteres" /></span></label>
        </div>
        <div className="vt-form-actions"><button className="vt-btn-primary" onClick={changePw}>Salvar nova senha</button></div>
      </div>
    </div>
  );
}
function SistemaTab() {
  const [c, setC] = vtUseState(() => window.vtSysCfg());
  const set = (k, v) => { const next = { ...c, [k]: v }; setC(next); window.vtSaveSysCfg(next); };
  const cur = window.VT_CURRENCIES[c.moeda] || window.VT_CURRENCIES.BRL;
  const idiomaInfo = (window.VT_IDIOMAS || []).find(i => i.value === c.idioma) || { flag: '🌐', label: c.idioma };
  const fmtInfo = (window.VT_DATE_FORMATS || []).find(f => f.value === (c.dataFmt || 'dd/mm/yyyy'));
  let exemploMoeda = '';
  try { exemploMoeda = (1234.5).toLocaleString(cur.loc, { style: 'currency', currency: c.moeda }); } catch(e) { exemploMoeda = cur.sym + ' 1.234,50'; }
  const exemploData = fmtInfo ? fmtInfo.example() : '';
  return (
    <div>
      <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
        <div className="vt-form-sec">Idioma &amp; Moeda</div>
        <div className="vt-form-row" style={{ marginBottom: 12 }}>
          <label className="vtf" style={{ width: '48%' }}>
            <span className="vtf-label">Idioma do sistema</span>
            <span className="vtf-inputwrap">
              <select className="vtf-input" value={c.idioma} onChange={(e) => set('idioma', e.target.value)}>
                {(window.VT_IDIOMAS || [{ value:'pt-BR', label:'Português (Brasil)', flag:'🇧🇷' }]).map(i =>
                  <option key={i.value} value={i.value}>{i.flag} {i.label}</option>
                )}
              </select>
            </span>
          </label>
          <label className="vtf" style={{ width: '48%' }}>
            <span className="vtf-label">Moeda</span>
            <span className="vtf-inputwrap">
              <select className="vtf-input" value={c.moeda} onChange={(e) => set('moeda', e.target.value)}>
                {Object.entries(window.VT_CURRENCIES).map(([k, v]) =>
                  <option key={k} value={k}>{v.flag} {v.label}</option>
                )}
              </select>
            </span>
          </label>
        </div>
        <div className="vt-form-row" style={{ marginBottom: 14 }}>
          <label className="vtf" style={{ width: '48%' }}>
            <span className="vtf-label">Formato de data</span>
            <span className="vtf-inputwrap">
              <select className="vtf-input" value={c.dataFmt || 'dd/mm/yyyy'} onChange={(e) => set('dataFmt', e.target.value)}>
                {(window.VT_DATE_FORMATS || []).map(f =>
                  <option key={f.value} value={f.value}>{f.label}</option>
                )}
              </select>
            </span>
          </label>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <div style={{ flex:'1 1 200px', background:'var(--teal-t,#e2f4f3)', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>{idiomaInfo.flag}</span>
            <div>
              <div style={{ fontSize:11, color:'var(--muted,#6b7280)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>Idioma ativo</div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--ink,#0e2c4d)' }}>{idiomaInfo.label}</div>
            </div>
          </div>
          <div style={{ flex:'1 1 200px', background:'var(--teal-t,#e2f4f3)', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>{cur.flag}</span>
            <div>
              <div style={{ fontSize:11, color:'var(--muted,#6b7280)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>Moeda · Exemplo</div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--teal,#14a8a0)' }}>{exemploMoeda}</div>
            </div>
          </div>
          <div style={{ flex:'1 1 200px', background:'var(--teal-t,#e2f4f3)', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>📅</span>
            <div>
              <div style={{ fontSize:11, color:'var(--muted,#6b7280)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>Data · Hoje</div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--ink,#0e2c4d)' }}>{exemploData}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="vt-card vt-sec" style={{ marginBottom: 16 }}>
        <div className="vt-form-sec">Tipo de operação</div>
        <p className="vt-muted" style={{ fontSize: 13, marginTop: 0 }}>Ajusta termos e descrições do sistema ao seu perfil.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 12 }}>
          {[['clinica', 'Clínica veterinária'], ['hospital', 'Hospital veterinário'], ['volante', 'Veterinário(a) volante']].map(([id, l]) => (
            <button key={id} className={`pr-check${(c.tipo || 'clinica') === id ? ' on' : ''}`} onClick={() => set('tipo', id)}><span className="pr-check-box" style={(c.tipo || 'clinica') === id ? { background: 'var(--teal)', borderColor: 'var(--teal)' } : null}>{(c.tipo || 'clinica') === id ? '✓' : ''}</span>{l}</button>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8 }}>
          {(c.tipo || 'clinica') === 'clinica' && '🏥 Modo Clínica: dashboard mostra "visão geral da clínica". Ideal para consultórios e policlínicas.'}
          {(c.tipo || 'clinica') === 'hospital' && '🏨 Modo Hospital: dashboard mostra "visão geral do hospital". Ideal para centros cirúrgicos e internação.'}
          {(c.tipo || 'clinica') === 'volante' && '🚗 Modo Volante: dashboard mostra "visão geral do atendimento". Ideal para veterinário autônomo sem estrutura fixa.'}
        </div>
      </div>

      <div className="vt-card vt-sec">
        <div className="vt-form-sec">Cores do sistema</div>
        <p className="vt-muted" style={{ fontSize: 13, marginTop: 0 }}>Cor principal da interface (barra lateral, botões e destaques).</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['#14a8a0', '#16395f', '#7a5cc8', '#1f8a5b', '#c0497a', '#d97706', '#2563eb', '#0f766e'].map((col) => (
            <button key={col} onClick={() => { set('cor', col); document.documentElement.style.setProperty('--teal', col); }} style={{ width: 34, height: 34, borderRadius: 9, background: col, border: (c.cor || '#14a8a0') === col ? '3px solid var(--ink)' : '3px solid transparent' }} />
          ))}
        </div>
        <p className="vt-muted" style={{ fontSize: 12, marginTop: 10 }}>A configuração de <b>estilo e layout dos documentos</b> fica em Configurações › Clínica.</p>
      </div>
    </div>
  );
}
function ClinicaTab() {
  const [f, setF] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    if (d && d.clinic) return d.clinic;
    const u = (window.VtStore && window.VtStore.currentUser && window.VtStore.currentUser()) || {};
    return { name: u.clinic || '', cnpj: '', address: '' };
  });
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (f.cnpj && !window.validCNPJ(f.cnpj)) { window.vtToast('CNPJ inválido.', 'err'); return; }
    if (window.VtStore) window.VtStore.setData({ clinic: f });
    window.vtToast('Configurações da clínica salvas.', 'ok');
  };
  const [acc, setAcc] = vtUseState('dados');
  const [prev, setPrev] = vtUseState('impressao');
  const vet = window.vtVetSignature ? window.vtVetSignature('M.V. ' + (window.vtCurrentVet ? window.vtCurrentVet() : '')) : {};
  const addr = f.addr || {};
  const addrLine = [addr.street, addr.num, addr.district, addr.city, addr.state].filter(Boolean).join(', ');
  const accent = f.docColor || '#1652a8';
  return (
    <div className="docs-split">
      <div className="docs-left">
        <button className="docs-acc-head" onClick={() => setAcc(acc === 'dados' ? '' : 'dados')}>Dados cadastrais <VtIcon name="chevron" size={16} /></button>
        {acc === 'dados' && (
          <div className="docs-acc-body">
            <label className="docs-field"><span>Nome da clínica</span><input value={f.name || ''} onChange={(e) => s('name')(e.target.value)} /><i className="req">Campo Obrigatório</i><small>Esse é o nome que vai aparecer no cabeçalho dos documentos gerados (prescrições, exames, termos e atestados).</small></label>
            <label className="docs-field"><span>CRMV da clínica</span><input value={f.crmv || ''} onChange={(e) => s('crmv')(e.target.value)} placeholder="12345" /><i className="req">Campo Obrigatório</i><small>Caso não tenha CRMV para a clínica, utilize o seu CRMV pessoal.</small></label>
            <label className="docs-field"><span>Estado</span><select value={f.crmvUF || 'SP'} onChange={(e) => s('crmvUF')(e.target.value)}>{['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => <option key={uf}>{uf}</option>)}</select><i className="req">Campo Obrigatório</i></label>
            <label className="docs-field"><span>Razão social</span><input value={f.razao || ''} onChange={(e) => s('razao')(e.target.value)} /><i>Campo Opcional</i></label>
            <label className="docs-field"><span>CNPJ</span><input value={f.cnpj || ''} onChange={(e) => s('cnpj')(window.maskCNPJ ? window.maskCNPJ(e.target.value) : e.target.value)} placeholder="00.000.000/0000-00" /><i>Campo Opcional</i></label>
            <label className="docs-field"><span>Nº registro no MAPA da Clínica</span><input value={f.mapa || ''} onChange={(e) => s('mapa')(e.target.value)} placeholder="00000000/0000" /><i>Campo Opcional</i></label>
            <label className="docs-field"><span>Inscrição Municipal</span><input value={f.inscMun || ''} onChange={(e) => s('inscMun')(e.target.value)} /><i>Campo Opcional</i></label>
            <label className="docs-field"><span>Inscrição Estadual</span><input value={f.inscEst || ''} onChange={(e) => s('inscEst')(e.target.value)} /><i>Campo Opcional</i></label>
          </div>
        )}
        <button className="docs-acc-head" onClick={() => setAcc(acc === 'config' ? '' : 'config')}>Configurações de Documentos <VtIcon name="chevron" size={16} /></button>
        {acc === 'config' && (
          <div className="docs-acc-body">
            <div className="docs-sub">COR PADRÃO <i className="req">(OBRIGATÓRIO)</i></div>
            <small style={{ fontSize: 11, color: 'var(--faint)' }}>A cor padrão será utilizada nos documentos gerados (prescrições, exames, termos e atestados).</small>
            <div className="docs-palette">
              {['#14a8a0','#000000','#5b6470','#9aa4ae','#0d3b66','#1565c0','#3b82f6','#1f6e3a','#1f8a5b','#3ddc84','#5b1d8a','#8e24aa','#c026d3','#a8501a','#d97706','#e0991f','#9b1b46','#d6336c','#e879a8'].map((c) => (
                <button key={c} type="button" className={`docs-sw${(f.docColor || '#14a8a0') === c ? ' on' : ''}`} style={{ background: c }} onClick={() => s('docColor')(c)} />
              ))}
            </div>
            <div className="docs-sub" style={{ marginTop: 10 }}>TEMA DE DOCUMENTOS IMPRESSOS</div>
            <small style={{ fontSize: 11, color: 'var(--faint)' }}>Aplicado a todos os documentos do prontuário (Prescrições, Exames, Atestados e Termos).</small>
            <div className="docs-themes">
              {[['classico', 'left'], ['moderno', 'split'], ['centro', 'center']].map(([id, kind]) => (
                <button key={id} type="button" className={`docs-theme${(f.docLayout || 'classico') === id ? ' on' : ''}`} onClick={() => s('docLayout')(id)}>
                  <span className="docs-theme-hd">
                    {kind === 'center'
                      ? <span className="dt-logo center" style={{ background: f.docColor || '#14a8a0' }} />
                      : <React.Fragment><span className="dt-logo" style={{ background: f.docColor || '#14a8a0' }} /><span className="dt-lines" style={{ alignItems: kind === 'split' ? 'flex-end' : 'flex-start' }}><i style={{ background: f.docColor || '#14a8a0' }} /><i style={{ background: f.docColor || '#14a8a0', width: '60%' }} /></span></React.Fragment>}
                  </span>
                  <span className="dt-body"><i /><i /><i style={{ width: '70%' }} /></span>
                </button>
              ))}
            </div>
            <div className="docs-sub" style={{ marginTop: 10 }}>LOGO <i>(OPCIONAL)</i></div>
            <small style={{ fontSize: 11, color: 'var(--faint)' }}>Caso não tenha logo, o Nome da Clínica aparecerá em destaque.</small>
            <label className="vac-photo" style={{ minHeight: 120, marginTop: 4 }}>
              {f.logo ? <img src={f.logo} alt="logo" style={{ maxHeight: 110 }} /> : <span><VtIcon name="plus" size={16} /> Enviar logo</span>}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => s('logo')(r.result); r.readAsDataURL(file); }} />
            </label>
            {f.logo && <div style={{ display: 'flex', gap: 8 }}><button type="button" className="vt-btn-ghost" onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = (e) => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => s('logo')(r.result); r.readAsDataURL(file); }; i.click(); }}>Substituir</button><button type="button" className="vt-btn-ghost" style={{ color: 'var(--red)' }} onClick={() => s('logo')('')}>Excluir</button></div>}
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Aplicar Logo em:</div>
            {[['logoRx', 'Prescrição'], ['logoEx', 'Solicitações de exame'], ['logoDoc', 'Atestados e termos']].map(([k, l]) => (
              <label key={k} className="docs-check"><input type="checkbox" checked={f[k] !== false} onChange={(e) => s(k)(e.target.checked)} /><span>{l}</span></label>
            ))}
            <div className="docs-sub" style={{ marginTop: 10 }}>OBSERVAÇÕES GERAIS</div>
            <small style={{ fontSize: 11, color: 'var(--faint)' }}>Ficam no rodapé dos documentos — regras de retorno, horários, política de internação, etc.</small>
            <textarea className="docs-obs" value={f.docObs || ''} onChange={(e) => s('docObs')(e.target.value)} placeholder="Observações Gerais" />
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Aplicar Observações Gerais em:</div>
            {[['obsRx', 'Prescrição'], ['obsEx', 'Solicitações de exame'], ['obsDoc', 'Atestados e termos']].map(([k, l]) => (
              <label key={k} className="docs-check"><input type="checkbox" checked={f[k] !== false} onChange={(e) => s(k)(e.target.checked)} /><span>{l}</span></label>
            ))}
          </div>
        )}
        <button className="docs-acc-head" onClick={() => setAcc(acc === 'contato' ? '' : 'contato')}>Informações de contato <VtIcon name="chevron" size={16} /></button>
        {acc === 'contato' && (
          <div className="docs-acc-body">
            <label className="docs-field"><span>Telefone</span><input value={f.phone || ''} onChange={(e) => s('phone')(window.maskPhone ? window.maskPhone(e.target.value) : e.target.value)} /></label>
            <label className="docs-field"><span>WhatsApp</span><input value={f.whats || ''} onChange={(e) => s('whats')(window.maskPhone ? window.maskPhone(e.target.value) : e.target.value)} /></label>
            <label className="docs-field"><span>E-mail</span><input value={f.email || ''} onChange={(e) => s('email')(e.target.value)} /></label>
            <label className="docs-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><input type="checkbox" checked={f.docShowContact !== false} onChange={(e) => s('docShowContact')(e.target.checked)} /><span>Exibir contato nos documentos</span></label>
          </div>
        )}
        <button className="docs-acc-head" onClick={() => setAcc(acc === 'divulg' ? '' : 'divulg')}>Informações de divulgação <VtIcon name="chevron" size={16} /></button>
        {acc === 'divulg' && (
          <div className="docs-acc-body">
            <label className="docs-field"><span>Site</span><input value={f.site || ''} onChange={(e) => s('site')(e.target.value)} placeholder="www.suaclinica.com.br" /></label>
            <label className="docs-field"><span>Instagram</span><input value={f.instagram || ''} onChange={(e) => s('instagram')(e.target.value)} placeholder="@suaclinica" /></label>
            <label className="docs-field"><span>Facebook</span><input value={f.facebook || ''} onChange={(e) => s('facebook')(e.target.value)} placeholder="/suaclinica" /></label>
            <label className="docs-field"><span>Frase de divulgação</span><input value={f.slogan || ''} onChange={(e) => s('slogan')(e.target.value)} placeholder="Ex.: Cuidando do sorriso do seu pet" /></label>
            <label className="docs-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><input type="checkbox" checked={f.docShowSocial !== false} onChange={(e) => s('docShowSocial')(e.target.checked)} /><span>Exibir redes sociais nos documentos</span></label>
          </div>
        )}
        <button className="docs-acc-head" onClick={() => setAcc(acc === 'endereco' ? '' : 'endereco')}>Endereço <VtIcon name="chevron" size={16} /></button>
        {acc === 'endereco' && (
          <div className="docs-acc-body"><VtAddress value={f.addr} onChange={(a) => s('addr')(a)} label="" /></div>
        )}
        <button className="docs-acc-head" onClick={() => setAcc(acc === 'compart' ? '' : 'compart')}>Opção de compartilhamento <VtIcon name="chevron" size={16} /></button>
        {acc === 'compart' && (
          <div className="docs-acc-body">
            {[['shWhats', 'WhatsApp', f.shWhats !== false], ['shEmail', 'E-mail', f.shEmail !== false], ['shLink', 'Link de validação', f.shLink !== false], ['shDownload', 'Download em PDF', f.shDownload !== false]].map(([k, l, on]) => (
              <label key={k} className="docs-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><input type="checkbox" checked={on} onChange={(e) => s(k)(e.target.checked)} /><span>{l}</span></label>
            ))}
            <small style={{ fontSize: 11, color: 'var(--faint)' }}>Botões exibidos na Prévia Digital enviada ao tutor.</small>
          </div>
        )}
        <button className="docs-acc-head" onClick={() => setAcc(acc === 'compra' ? '' : 'compra')}>Opção de compra <VtIcon name="chevron" size={16} /></button>
        {acc === 'compra' && (
          <div className="docs-acc-body">
            <label className="docs-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><input type="checkbox" checked={!!f.buyEnabled} onChange={(e) => s('buyEnabled')(e.target.checked)} /><span>Permitir compra dos itens prescritos</span></label>
            <label className="docs-field"><span>Texto do botão de compra</span><input value={f.buyLabel || ''} onChange={(e) => s('buyLabel')(e.target.value)} placeholder="Comprar medicamentos" /></label>
            <label className="docs-field"><span>Link da loja / farmácia</span><input value={f.buyLink || ''} onChange={(e) => s('buyLink')(e.target.value)} placeholder="https://sualoja.com.br" /></label>
          </div>
        )}
        <div style={{ padding: '14px 16px' }}><button className="vt-btn-primary" onClick={save}>Salvar configurações</button></div>
      </div>

      <div className="docs-right">
        <div className="docs-prev-tabs">
          <button className={prev === 'impressao' ? 'on' : ''} onClick={() => setPrev('impressao')}>Prévia Impressão</button>
          <button className={prev === 'digital' ? 'on' : ''} onClick={() => setPrev('digital')}>Prévia Digital</button>
        </div>
        <div className="docs-prev-stage">
          <div className={`docs-paper${prev === 'digital' ? ' digital' : ''}`}>
            <div className={`docs-hd theme-${f.docLayout || 'classico'}`}>
              {f.logo ? <img className="docs-hd-logo" src={f.logo} alt="logo" /> : <div className="docs-hd-logo ph" style={{ borderColor: accent, color: accent }}>{(f.name || 'V')[0]}</div>}
              <div className="docs-hd-id">
                <b style={{ color: accent }}>{f.name || 'Nome da clínica'}</b>
                <span style={{ color: accent }}>{`CRMV ${f.crmv || '—'} ${f.crmvUF || ''}`}</span>
                {f.mapa ? <span style={{ color: accent }}>Registro no MAPA {f.mapa}</span> : null}
              </div>
              <div className="docs-hd-contact">
                {addrLine ? <span>{addrLine}</span> : null}
                {f.site ? <span>Site: {f.site}</span> : null}
                {f.phone ? <span>Telefone: {f.phone}</span> : null}
                {f.email ? <span>E-mail: {f.email}</span> : null}
              </div>
            </div>
            <div className="docs-rule" style={{ background: accent }} />
            <div className="docs-bodytitle">Prévia da Prescrição</div>
            <div className="docs-lines"><i /><i /><i style={{ width: '70%' }} /><i style={{ width: '85%' }} /></div>
            <div className="docs-sign">
              <span>Assinado eletronicamente por</span>
              {vet.sign ? <img src={vet.sign} alt="assinatura" style={{ height: 38, display: 'block', margin: '4px 0' }} /> : null}
              <b>{(window.vtCurrentVet ? window.vtCurrentVet() : f.name) || 'Veterinário'}</b>
              <b>CRMV {f.crmv || '—'}/{f.crmvUF || 'SP'}</b>
            </div>
            {prev === 'digital' && (
              <div className="docs-digital-foot" style={{ background: accent }}>
                <b className="docs-foot-name">{f.name || 'Nome da clínica'}</b>
                {f.slogan ? <p className="docs-slogan">{f.slogan}</p> : null}
                {addrLine ? <span>{addrLine}</span> : null}
                {f.site ? <span className="docs-foot-site">{f.site}</span> : null}
                {f.phone ? <span>Telefone: {f.phone}</span> : null}
                {f.email ? <span>E-mail: {f.email}</span> : null}
                <span>CRMV: {f.crmv || '—'}/{f.crmvUF || 'SP'}</span>
                {f.mapa ? <span>Registro no MAPA: {f.mapa}</span> : null}
                {f.docShowSocial !== false && (
                  <div className="docs-foot-social">
                    {f.facebook ? <span className="docs-foot-ic">f</span> : null}
                    {f.instagram ? <span className="docs-foot-ic">◉</span> : null}
                  </div>
                )}
                <div className="docs-share">
                  {f.shWhats !== false && <span className="docs-share-btn wa">💬 WhatsApp</span>}
                  {f.shEmail !== false && <span className="docs-share-btn">✉ E-mail</span>}
                  {f.shDownload !== false && <span className="docs-share-btn">⬇ PDF</span>}
                  {f.shLink !== false && <span className="docs-share-btn">🔗 Validar</span>}
                </div>
                {f.buyEnabled && <div className="docs-buy">🛒 {f.buyLabel || 'Comprar medicamentos'}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
const TEAM_COLORS = ['#2f6fed', '#8b5cf6', '#e0533c', '#14a8a0', '#1fa971', '#e0991f', '#d6336c'];
function ParceirasTab() {
  const [list, setList] = vtUseState(() => window.vtParceiras());
  const [modal, setModal] = vtUseState(null);
  const persist = (l) => { setList(l); window.vtSaveParceiras(l); };
  const blank = { nome: '', endereco: '', telefone: '', email: '', responsavel: '' };
  const save = (f) => {
    if (f._del) { persist(list.filter((x) => x.id !== f.id)); setModal(null); window.vtToast('Clínica removida.', 'ok'); return; }
    if (!f.nome.trim()) { window.vtToast('Informe o nome da clínica.', 'err'); return; }
    if (f.id) persist(list.map((x) => x.id === f.id ? f : x));
    else persist([...list, { ...f, id: 'CP' + Date.now().toString(36) }]);
    setModal(null); window.vtToast('Clínica parceira salva.', 'ok');
  };
  const del = (id) => persist(list.filter((x) => x.id !== id));
  return (
    <div>
      <div className="vt-head-row" style={{ marginBottom: 14 }}>
        <p className="vt-muted" style={{ margin: 0, fontSize: 13 }}>Clínicas e hospitais parceiros para encaminhamentos e atendimentos.</p>
        <button className="vt-btn-primary" onClick={() => setModal(blank)}><VtIcon name="plus" size={15} /> Adicionar clínica</button>
      </div>
      <div className="vt-card vt-table-card">
        <div className="vt-table" style={{ '--cols': 1 }}>
          <div className="vt-tr vt-th vt-team-row"><span>Clínica</span><span>Contato</span><span>Responsável</span><span></span></div>
          {list.map((p) => (
            <div key={p.id} className="vt-tr vt-team-row">
              <span className="vt-cell-name"><span className="vt-avatar" style={{ background: 'var(--navy)' }}>{p.nome.slice(0, 2).toUpperCase()}</span><span><b>{p.nome}</b><i className="vt-id">{p.endereco || '—'}</i></span></span>
              <span className="vt-muted">{[p.telefone, p.email].filter(Boolean).join(' · ') || '—'}</span>
              <span>{p.responsavel || '—'}</span>
              <span className="vt-row-actions"><button className="vt-link" onClick={() => setModal(p)}>Editar</button><button className="pr-del-btn" onClick={() => del(p.id)}>✕</button></span>
            </div>
          ))}
          {list.length === 0 && <div className="vt-empty-row">Nenhuma clínica parceira cadastrada.</div>}
        </div>
      </div>
      {modal && <ParceiraModal data={modal} onClose={() => setModal(null)} onSave={save} />}
    </div>
  );
}
function ParceiraModal({ data, onClose, onSave }) {
  const [f, setF] = vtUseState({ ...data });
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3>{data.id ? 'Editar clínica parceira' : 'Nova clínica parceira'}</h3>
        <div className="vt-form-row"><VtField label="Nome da clínica" value={f.nome} onChange={s('nome')} width="100%" /></div>
        <VtAddress value={f.addr} onChange={(addr) => s('addr')(addr)} label="Endereço" />
        <div className="vt-form-row">
          <VtField label="Telefone" value={f.telefone} onChange={s('telefone')} mask="phone" width="48%" />
          <VtEmailField label="Email" value={f.email} onChange={s('email')} width="48%" />
        </div>
        <div className="vt-form-row"><VtField label="Responsável" value={f.responsavel} onChange={s('responsavel')} placeholder="Nome do responsável" width="100%" /></div>
        <div style={{ borderTop: '1px solid var(--line)', margin: '14px 0 10px', paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Dados para pagamento / transferência</div>
          <div className="vt-form-row"><VtField label="Chave PIX" value={f.pixChave || ''} onChange={s('pixChave')} placeholder="CPF, CNPJ, e-mail, celular ou chave aleatória" width="100%" /></div>
          <div className="vt-form-row">
            <VtField label="Banco" value={f.banco || ''} onChange={s('banco')} placeholder="Ex.: Nubank, Itaú" width="44%" />
            <VtField label="Agência" value={f.agencia || ''} onChange={s('agencia')} placeholder="0000" width="24%" />
            <VtField label="Conta" value={f.conta || ''} onChange={s('conta')} placeholder="00000-0" width="28%" />
          </div>
          <div className="vt-form-row">
            <VtField label="Titular da conta" value={f.titularConta || ''} onChange={s('titularConta')} placeholder="Nome completo" width="60%" />
            <VtField label="CPF / CNPJ" value={f.cpfCnpjConta || ''} onChange={s('cpfCnpjConta')} placeholder="Documento" width="36%" />
          </div>
        </div>
        <div className="fin-modal-actions" style={{ marginTop: 14 }}>
          {data.id && <button className="vt-btn-ghost" style={{ marginRight: 'auto', color: 'var(--red)' }} onClick={() => { onSave({ ...f, _del: true }); }}>Remover</button>}
          <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="vt-btn-primary" onClick={() => onSave(f)}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
function EquipeTab() {
  const [team, setTeam] = vtUseState(() => window.vtTeam());
  const [modal, setModal] = vtUseState(null); // 'new' | índice
  const [f, setF] = vtUseState({});
  const s = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const persist = (list) => { setTeam(list); window.vtSaveTeam(list); };
  const openNew = () => { setF({ name: '', role: '', crmv: '', color: TEAM_COLORS[team.length % TEAM_COLORS.length], vet: true }); setModal('new'); };
  const openEdit = (i) => { setF({ ...team[i] }); setModal(i); };
  const save = () => {
    if (!f.name || !f.name.trim()) { window.vtToast('Informe o nome do membro.', 'err'); return; }
    if (modal === 'new') {
      persist([...team, { ...f, id: 'm-' + Date.now().toString(36) }]);
      window.vtToast(`${f.name} adicionado à equipe.`, 'ok');
    } else {
      persist(team.map((m, i) => i === modal ? { ...f } : m));
      window.vtToast('Membro atualizado.', 'ok');
    }
    setModal(null);
  };
  const remove = (i) => { persist(team.filter((_, j) => j !== i)); window.vtToast('Membro removido.', 'ok'); };

  return (
    <div>
      <div className="vt-head-row" style={{ marginBottom: 14 }}>
        <p className="vt-muted" style={{ margin: 0, fontSize: 13 }}>Profissionais marcados como veterinário aparecem nos seletores de atendimento.</p>
        <button className="vt-btn-primary" onClick={openNew}><VtIcon name="plus" size={15} /> Adicionar membro</button>
      </div>
      <div className="vt-card vt-table-card">
        <div className="vt-table" style={{ '--cols': 1 }}>
          <div className="vt-tr vt-th vt-team-row"><span>Membro</span><span>Função / permissões</span><span>CRMV</span><span></span></div>
          {team.map((t, i) => (
            <div key={t.id || i} className="vt-tr vt-team-row">
              <span className="vt-cell-name"><span className="vt-avatar" style={{ background: t.color }}>{t.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span><span><b>{t.name}</b>{t.vet ? <i className="vt-id" style={{ color: 'var(--teal-d)' }}>Veterinário</i> : null}</span></span>
              <span className="vt-muted">{t.role || '—'}</span>
              <span>{t.crmv || '—'}</span>
              <span className="vt-row-actions"><button className="vt-link" onClick={() => openEdit(i)}>Editar</button><button className="pr-del-btn" onClick={() => remove(i)}>✕</button></span>
            </div>
          ))}
          {team.length === 0 && <div className="vt-empty-row">Nenhum membro cadastrado.</div>}
        </div>
      </div>

      {modal !== null && (
        <div className="fin-modal-bg" onClick={() => setModal(null)}>
          <div className="fin-modal" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3>{modal === 'new' ? 'Novo membro da equipe' : 'Editar membro'}</h3>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
              <label className="vt-photo-up" style={{ width: 64, height: 64, flex: 'none' }}>
                {f.photo ? <img className="vt-photo-img" src={f.photo} alt="" /> : <span style={{ fontSize: 11, color: 'var(--muted)' }}>Foto</span>}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => s('photo')(r.result); r.readAsDataURL(file); }} />
              </label>
              <div style={{ flex: 1 }}><VtField label="Nome completo" value={f.name} onChange={s('name')} width="100%" /></div>
            </div>
            <div className="vt-form-row">
              <VtField label="CPF" value={f.cpf} onChange={s('cpf')} mask="cpf" placeholder="000.000.000-00" width="36%" />
              <label className="vtf" style={{ width: '18%' }}><span className="vtf-label">CRMV — UF</span><span className="vtf-inputwrap"><select className="vtf-input" value={f.crmvUF || 'SP'} onChange={(e) => s('crmvUF')(e.target.value)}>{['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => <option key={uf}>{uf}</option>)}</select></span></label>
              <VtField label="Nº do CRMV" value={f.crmv} onChange={s('crmv')} placeholder="12345" width="42%" />
            </div>
            <div className="vt-form-row">
              <VtField label="Telefone" value={f.phone} onChange={s('phone')} mask="phone" width="48%" />
              <VtEmailField label="Email" value={f.email} onChange={s('email')} width="48%" />
            </div>
            <VtAddress value={f.addr} onChange={(addr) => s('addr')(addr)} label="Endereço" />
            <div className="vt-form-row"><VtField label="Função / cargo" value={f.role} onChange={s('role')} placeholder="Ex.: Veterinário · Recepção" width="100%" /></div>
            <span className="vtf-label" style={{ display: 'block', marginBottom: 6 }}>Permissões do sistema</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {['Administrador', 'Atendimento', 'Financeiro', 'Agenda', 'Estoque', 'Relatórios'].map((perm) => {
                const on = (f.perms || []).includes(perm);
                return <button key={perm} className={`pr-check${on ? ' on' : ''}`} onClick={() => s('perms')(on ? (f.perms || []).filter((x) => x !== perm) : [...(f.perms || []), perm])}><span className="pr-check-box" style={on ? { background: 'var(--teal)', borderColor: 'var(--teal)' } : null}>{on ? '✓' : ''}</span>{perm}</button>;
              })}
            </div>
            <div className="vt-form-row"><label className="vtf" style={{ width: '100%' }}><span className="vtf-label">Alterar senha de acesso</span><span className="vtf-inputwrap"><input className="vtf-input" type="password" value={f.senha || ''} onChange={(e) => s('senha')(e.target.value)} placeholder="Nova senha (deixe em branco para manter)" /></span></label></div>
            <div className="vt-form-row" style={{ alignItems: 'center', gap: 18 }}>
              <label className="vtf" style={{ flex: 'none' }}>
                <span className="vtf-label">Cor de identificação</span>
                <span style={{ display: 'flex', gap: 7, marginTop: 4 }}>
                  {TEAM_COLORS.map((c) => <button key={c} onClick={() => s('color')(c)} style={{ width: 26, height: 26, borderRadius: 8, background: c, border: f.color === c ? '2px solid var(--ink)' : '2px solid transparent' }} />)}
                </span>
              </label>
              <label className="pr-check" style={{ alignSelf: 'flex-end', cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none' }} onClick={() => s('vet')(!f.vet)}>
                <span className="pr-check-box" style={f.vet ? { background: 'var(--teal)', borderColor: 'var(--teal)' } : null}>{f.vet ? '✓' : ''}</span>
                É veterinário(a)
              </label>
            </div>
            {f.vet && (
              <div style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 14 }}>
                <div className="vt-form-row"><VtField label="Especialidade" value={f.especialidade} onChange={s('especialidade')} placeholder="Ex.: Odontologia veterinária" width="100%" /></div>
                <span className="vtf-label" style={{ display: 'block', marginBottom: 6 }}>Assinatura digital / carimbo</span>
                <SignaturePad value={f.sign} onChange={s('sign')} label={`${f.name || 'Veterinário'} — ${f.crmv || 'CRMV'}`} />
                <label className="vt-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, cursor: 'pointer' }}>
                  <VtIcon name="plus" size={14} /> ou enviar foto da assinatura
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => s('sign')(r.result); r.readAsDataURL(file); }} />
                </label>
              </div>
            )}
            <div className="fin-modal-actions" style={{ marginTop: 14 }}>
              {modal !== 'new' && <button className="vt-btn-ghost" style={{ marginRight: 'auto', color: 'var(--red)' }} onClick={() => { remove(modal); setModal(null); }}>Remover</button>}
              <button className="vt-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="vt-btn-primary" onClick={save}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConsultasTab() {
  const [rows, setRows] = vtUseState(() => window.vtConsults().map((t) => ({ ...t })));
  const [dirty, setDirty] = vtUseState(false);
  const upd = (i, k, v) => { setRows(rows.map((r, j) => j === i ? { ...r, [k]: v } : r)); setDirty(true); };
  const add = () => { setRows([...rows, { id: 'ct-' + Date.now().toString(36), label: '', dur: 30, price: 'R$ 0,00' }]); setDirty(true); };
  const del = (i) => { setRows(rows.filter((_, j) => j !== i)); setDirty(true); };
  const save = () => {
    const clean = rows.filter((r) => r.label && r.label.trim()).map((r) => ({ ...r, label: r.label.trim(), dur: Number(r.dur) || 0, price: r.price || 'R$ 0,00' }));
    if (!clean.length) { window.vtToast('Cadastre ao menos um tipo de consulta.', 'err'); return; }
    window.vtSaveConsults(clean);
    setRows(clean.map((r) => ({ ...r }))); setDirty(false);
    window.vtToast('Tipos de consulta atualizados.', 'ok');
  };
  const reset = () => { const def = window.VT_CONSULT_DEFAULTS || window.VtData.consultTypes; window.vtSaveConsults(def.map((t) => ({ ...t }))); setRows(def.map((t) => ({ ...t }))); setDirty(false); window.vtToast('Tipos de consulta restaurados ao padrão.', 'ok'); };
  return (
    <div className="vt-card vt-sec">
      <div className="vt-head-row" style={{ marginBottom: 6 }}>
        <div><h3 className="vt-sec-title" style={{ margin: 0 }}>Tipos de consulta e valores</h3><p className="vt-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Personalize os tipos de atendimento, duração estimada e valor padrão. Refletem na agenda e nos atendimentos.</p></div>
        <button className="vt-btn-primary" onClick={save} disabled={!dirty} style={!dirty ? { opacity: .5 } : null}><VtIcon name="plus" size={15} /> Salvar alterações</button>
      </div>
      <table className="pr-dtable" style={{ marginTop: 8 }}>
        <thead><tr><th style={{ width: '52%' }}>Tipo de consulta</th><th style={{ width: 150 }}>Duração (min)</th><th style={{ width: 170 }}>Valor padrão</th><th style={{ width: 44 }}></th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              <td><input value={r.label} onChange={(e) => upd(i, 'label', e.target.value)} placeholder="Nome do atendimento" /></td>
              <td><input className="num" value={r.dur} onChange={(e) => upd(i, 'dur', e.target.value.replace(/\D/g, ''))} placeholder="30" /></td>
              <td><input value={r.price} onChange={(e) => upd(i, 'price', window.maskMoney(e.target.value))} placeholder="R$ 0,00" /></td>
              <td><button className="pr-del-btn" onClick={() => del(i)}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <button className="pr-addrow" onClick={add}><VtIcon name="plus" size={14} /> Adicionar tipo de consulta</button>
        <button className="vt-link" style={{ marginLeft: 'auto' }} onClick={reset}>Restaurar padrão</button>
      </div>
    </div>
  );
}

function ModelosConsultaTab() {
  const ALL_MODELS = (window.vtConsultModels ? window.vtConsultModels() : window.PR.consultModels).filter((m) => m.id !== 'livre');
  const [editing, setEditing] = vtUseState(null); // modelId being edited
  const [tab, setTabM] = vtUseState('anamnese'); // editor sub-tab

  /* ── dados por modelo ── */
  const [roteiros, setRoteiros] = vtUseState(() => window.vtConsultRoteiros());
  const [anameseMap, setAnameseMap] = vtUseState(() => {
    const out = {};
    ALL_MODELS.forEach((m) => { out[m.id] = window.vtAnamneseFor(m.id).map((x) => ({ ...x })); });
    return out;
  });
  const [globalExame, setGlobalExame] = vtUseState(() => window.vtExamCfg().map((x) => ({ ...x })));
  const [globalSistemas, setGlobalSistemas] = vtUseState(() => [...window.vtSistemasCfg()]);

  const openModel = (id) => { setEditing(id); setTabM('anamnese'); };
  const closeModel = () => setEditing(null);

  const getAnm = (id) => anameseMap[id] || [];
  const setAnm = (id, list) => {
    setAnameseMap((m) => ({ ...m, [id]: list }));
    window.vtSaveAnamneseFor(id, list);
  };
  const getRoteiro = (id) => (roteiros[id] || {}).items || [];
  const setRoteiro = (id, items) => {
    const next = { ...roteiros, [id]: { ...(roteiros[id] || {}), items } };
    setRoteiros(next); window.vtSaveConsultRoteiros(next);
  };
  const getInc = (id) => window.vtConsultInclude(id);
  const toggleInc = (id, k) => { const cur = getInc(id); window.vtSaveConsultInclude(id, { ...cur, [k]: !cur[k] }); setTabM((t) => t); };

  /* ── Anamnese editor ── */
  const AnmEditor = ({ modelId }) => {
    const list = getAnm(modelId);
    const upd = (i, k, v) => setAnm(modelId, list.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const del = (i) => setAnm(modelId, list.filter((_, j) => j !== i));
    const add = () => setAnm(modelId, [...list, { k: 'q' + Date.now().toString(36), q: '', type: 'text', opts: [] }]);
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>Configure as perguntas da anamnese para este modelo. Tipo <b>Texto</b> = caixa de entrada livre. Tipo <b>Botões</b> = seleção rápida com opções.</p>
        {list.map((it, i) => (
          <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: it.type === 'quick' ? 10 : 0, flexWrap: 'wrap' }}>
              <input value={it.q} onChange={(e) => upd(i, 'q', e.target.value)} placeholder="Pergunta…"
                style={{ flex: 2, fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', minWidth: 160 }} />
              <select value={it.type} onChange={(e) => upd(i, 'type', e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13 }}>
                <option value="text">Caixa de texto</option>
                <option value="quick">Botões de seleção</option>
              </select>
              <button className="pr-del-btn" onClick={() => del(i)}>✕</button>
            </div>
            {it.type === 'quick' && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Opções dos botões (separadas por vírgula):</div>
                <input value={(it.opts || []).join(', ')} onChange={(e) => upd(i, 'opts', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  placeholder="Ex: Sim, Não, Às vezes"
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px' }} />
                {(it.opts || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 4 }}>Prévia:</span>
                    {(it.opts || []).map((opt, oi) => (
                      <span key={oi} style={{ padding: '3px 10px', borderRadius: 12, border: '1.5px solid var(--teal)', color: 'var(--teal)', fontSize: 12 }}>{opt}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhuma pergunta configurada. Clique em "+ Adicionar" para começar.</p>}
        <button className="pr-addrow" onClick={add} style={{ marginTop: 4 }}><VtIcon name="plus" size={14} /> Adicionar pergunta</button>
      </div>
    );
  };

  /* ── Roteiro editor ── */
  const RoteiroEditor = ({ modelId }) => {
    const items = getRoteiro(modelId);
    const upd = (i, v) => setRoteiro(modelId, items.map((x, j) => j === i ? v : x));
    const del = (i) => setRoteiro(modelId, items.filter((_, j) => j !== i));
    const add = () => setRoteiro(modelId, [...items, '']);
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>Itens do roteiro de avaliação. Cada item aparece na aba Consulta com botões Normal / Alterado / N-A e campo de observação.</p>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: 13, minWidth: 20 }}>{i + 1}.</span>
            <input value={it} onChange={(e) => upd(i, e.target.value)} placeholder="Ex: Avaliação periodontal"
              style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 8, padding: '9px 11px' }} />
            <button className="pr-del-btn" onClick={() => del(i)}>✕</button>
          </div>
        ))}
        {items.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum item no roteiro deste modelo.</p>}
        <button className="pr-addrow" onClick={add} style={{ marginTop: 4 }}><VtIcon name="plus" size={14} /> Adicionar item</button>
      </div>
    );
  };

  /* ── Seções editor ── */
  const SecoesEditor = ({ modelId }) => {
    const [tick, setTick] = vtUseState(0);
    const inc = getInc(modelId);
    const tog = (k) => { toggleInc(modelId, k); setTick((n) => n + 1); };
    const incNow = window.vtConsultInclude(modelId);
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 18px' }}>Defina quais seções aparecem durante uma consulta deste modelo.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
          {[
            { k: null, l: 'Anamnese', always: true, desc: 'Perguntas sobre histórico e queixas do paciente' },
            { k: 'exame', l: 'Exame Físico', desc: 'Parâmetros vitais (temperatura, FC, FR, peso…)' },
            { k: 'roteiro', l: 'Roteiro de Avaliação', desc: 'Lista de itens configurados na aba acima' },
            { k: 'sistemas', l: 'Avaliação por Sistemas', desc: 'Cardiovascular, Respiratório, Digestório…' },
            { k: null, l: 'Diagnóstico', always: true, desc: 'Diagnóstico definitivo e observações' },
          ].map(({ k, l, always, desc }) => {
            const on = always || incNow[k];
            return (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10,
                border: `1px solid ${on ? 'var(--teal)' : 'var(--line)'}`, background: on ? 'var(--teal-t, #e2f4f3)' : 'var(--card)' }}>
                {always ? (
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, flexShrink: 0 }}>✓</div>
                ) : (
                  <button onClick={() => tog(k)} style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${on ? 'var(--teal)' : 'var(--muted)'}`,
                    background: on ? 'var(--teal)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                    {on ? '✓' : ''}
                  </button>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: on ? 'var(--teal)' : 'var(--ink)' }}>{l} {always && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>(sempre ativo)</span>}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Campos Globais editor ── */
  const CamposGlobaisEditor = () => {
    const [open, setOpen] = vtUseState('exame');
    const saveAll = () => {
      window.vtSaveExamCfg(globalExame.filter((x) => x.l && x.l.trim()).map((x) => ({ ...x, k: x.k || x.l.toLowerCase().replace(/\s+/g, '_') })));
      window.vtSaveSistemasCfg(globalSistemas.filter((x) => x && x.trim()));
      window.vtToast('Campos globais salvos.', 'ok');
    };
    const Acc = ({ id, title, children }) => (
      <div style={{ border: '1px solid var(--line)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
        <button onClick={() => setOpen(open === id ? '' : id)} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: open === id ? 'var(--teal-t, #e2f4f3)' : 'var(--card)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
          {title} <span style={{ color: 'var(--muted)' }}>{open === id ? '▲' : '▼'}</span>
        </button>
        {open === id && <div style={{ padding: '14px 16px', background: 'var(--bg)' }}>{children}</div>}
      </div>
    );
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>Campos compartilhados por todos os modelos. Alterações afetam todas as consultas.</p>
        <Acc id="exame" title={`Parâmetros do Exame Físico (${globalExame.length})`}>
          {globalExame.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input value={it.l} onChange={(e) => setGlobalExame(globalExame.map((x, j) => j === i ? { ...x, l: e.target.value } : x))}
                placeholder="Parâmetro" style={{ flex: 2, fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px' }} />
              <input value={it.u} onChange={(e) => setGlobalExame(globalExame.map((x, j) => j === i ? { ...x, u: e.target.value } : x))}
                placeholder="Unidade" style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px' }} />
              <input value={it.ph || ''} onChange={(e) => setGlobalExame(globalExame.map((x, j) => j === i ? { ...x, ph: e.target.value } : x))}
                placeholder="Valor padrão" style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px' }} />
              <button className="pr-del-btn" onClick={() => setGlobalExame(globalExame.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="pr-addrow" onClick={() => setGlobalExame([...globalExame, { k: 'p' + Date.now().toString(36), l: '', u: '', ph: '' }])}><VtIcon name="plus" size={14} /> Adicionar parâmetro</button>
        </Acc>
        <Acc id="sistemas" title={`Sistemas da Avaliação Clínica (${globalSistemas.length})`}>
          {globalSistemas.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input value={s} onChange={(e) => setGlobalSistemas(globalSistemas.map((x, j) => j === i ? e.target.value : x))}
                placeholder="Ex: Cardiovascular" style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px' }} />
              <button className="pr-del-btn" onClick={() => setGlobalSistemas(globalSistemas.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="pr-addrow" onClick={() => setGlobalSistemas([...globalSistemas, ''])}><VtIcon name="plus" size={14} /> Adicionar sistema</button>
        </Acc>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="vt-btn-primary" onClick={saveAll}>Salvar campos globais</button>
        </div>
      </div>
    );
  };

  /* ── Editor de um modelo ── */
  if (editing) {
    const model = ALL_MODELS.find((m) => m.id === editing);
    const TABS_M = [
      { id: 'anamnese', label: 'Anamnese' },
      { id: 'roteiro',  label: 'Roteiro de Avaliação' },
      { id: 'secoes',   label: 'Seções Visíveis' },
      { id: 'globais',  label: 'Campos Globais' },
    ];
    return (
      <div>
        <button className="vt-link" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontSize: 13 }} onClick={closeModel}>
          ← Voltar aos modelos
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--teal-t, #e2f4f3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            <VtIcon name={model && model.icon || 'stethoscope'} size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--navy, #16395f)' }}>{model && model.label}</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{model && model.desc}</p>
          </div>
        </div>
        <div className="vt-chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {TABS_M.map((t) => (
            <button key={t.id} onClick={() => setTabM(t.id)}
              style={{ padding: '6px 16px', borderRadius: 20, border: `1.5px solid ${tab === t.id ? 'var(--teal)' : 'var(--line)'}`, background: tab === t.id ? 'var(--teal)' : 'var(--card)', color: tab === t.id ? '#fff' : 'var(--ink)', fontSize: 13, cursor: 'pointer', fontWeight: tab === t.id ? 600 : 400 }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="vt-card vt-sec" style={{ padding: 20 }}>
          {tab === 'anamnese' && <AnmEditor modelId={editing} />}
          {tab === 'roteiro'  && <RoteiroEditor modelId={editing} />}
          {tab === 'secoes'   && <SecoesEditor modelId={editing} />}
          {tab === 'globais'  && <CamposGlobaisEditor />}
        </div>
      </div>
    );
  }

  /* ── Lista de modelos ── */
  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--navy, #16395f)' }}>Modelos de Consulta</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Clique em um modelo para configurar suas perguntas, botões, seções e campos de avaliação.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {ALL_MODELS.map((m) => {
          const anmCount = getAnm(m.id).length;
          const rotCount = getRoteiro(m.id).length;
          const inc = getInc(m.id);
          const secoesOn = ['exame','roteiro','sistemas'].filter((k) => inc[k]).length;
          return (
            <button key={m.id} onClick={() => openModel(m.id)}
              style={{ textAlign: 'left', background: 'var(--card)', border: '1.5px solid var(--line)', borderRadius: 14, padding: 18, cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(20,168,160,.15)'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--teal-t, #e2f4f3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <VtIcon name={m.icon || 'stethoscope'} size={18} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{m.label}</div>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{m.desc}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: anmCount > 0 ? 'var(--teal-t, #e2f4f3)' : 'var(--bg)', color: anmCount > 0 ? 'var(--teal)' : 'var(--muted)', border: '1px solid var(--line)' }}>
                  {anmCount} pergunta{anmCount !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: rotCount > 0 ? 'var(--teal-t, #e2f4f3)' : 'var(--bg)', color: rotCount > 0 ? 'var(--teal)' : 'var(--muted)', border: '1px solid var(--line)' }}>
                  {rotCount} item{rotCount !== 1 ? 's' : ''} roteiro
                </span>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                  {secoesOn + 2} seção/seções
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── ANTIGO RoteirosTab — substituído por ModelosConsultaTab acima ── */
function RoteirosTab() {
  return <ModelosConsultaTab />;
}
function _RoteirosTabOld() {
  const models = (window.vtConsultModels ? window.vtConsultModels() : window.PR.consultModels).filter((m) => m.id !== 'livre');
  const [data, setData] = vtUseState(() => {
    const cur = window.vtConsultRoteiros();
    const out = {};
    models.forEach((m) => { out[m.id] = { label: (cur[m.id] || {}).label || m.label, items: [...(((cur[m.id]) || {}).items || [])] }; });
    return out;
  });
  const [sel, setSel] = vtUseState(models[0].id);
  const [dirty, setDirty] = vtUseState(false);
  const cur = data[sel];
  const [incTick, setIncTick] = vtUseState(0);
  const incCur = window.vtConsultInclude(sel);
  const toggleInc = (k) => { window.vtSaveConsultInclude(sel, { ...incCur, [k]: !incCur[k] }); setIncTick((n) => n + 1); };
  const setItems = (items) => { setData((d) => ({ ...d, [sel]: { ...d[sel], items } })); setDirty(true); };
  const upd = (i, v) => setItems(cur.items.map((it, j) => j === i ? v : it));
  const add = () => setItems([...cur.items, '']);
  const del = (i) => setItems(cur.items.filter((_, j) => j !== i));
  const save = () => {
    const clean = {};
    Object.keys(data).forEach((k) => { clean[k] = { label: data[k].label, items: data[k].items.map((s) => s.trim()).filter(Boolean) }; });
    window.vtSaveConsultRoteiros(clean);
    setDirty(false); window.vtToast('Modelos de consulta salvos.', 'ok');
  };
  const reset = () => {
    const def = window.PR_ROTEIROS_DEFAULT; const out = {};
    models.forEach((m) => { out[m.id] = { label: (def[m.id] || {}).label || m.label, items: [...(((def[m.id]) || {}).items || [])] }; });
    setData(out); window.vtSaveConsultRoteiros(JSON.parse(JSON.stringify(def))); setDirty(false);
    window.vtToast('Roteiros restaurados ao padrão.', 'ok');
  };
  return (
    <div>
      <div className="vt-ai-note" style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.6 }}>
        <b>O que são os Modelos de Consulta?</b><br />
        Cada tipo de atendimento (Clínica Geral, Odontologia, Pré-cirúrgico...) tem um <b>roteiro de avaliação</b> próprio — a lista de itens que o veterinário preenche durante a consulta. Aqui você personaliza esses itens para cada modelo. As alterações aparecem automaticamente na aba <b>Consulta</b> de cada atendimento.
      </div>
    <div className="vt-card vt-sec">
      <div className="vt-head-row" style={{ marginBottom: 12 }}>
        <div><h3 className="vt-sec-title" style={{ margin: 0 }}>Modelos de consulta · roteiros de avaliação</h3><p className="vt-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Cada tipo de consulta avalia itens diferentes. Personalize o roteiro de cada modelo — ele aparece na aba Consulta.</p></div>
        <button className="vt-btn-primary" onClick={save} disabled={!dirty} style={!dirty ? { opacity: .5 } : null}><VtIcon name="plus" size={15} /> Salvar</button>
      </div>
      <div className="vt-chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
        {models.map((m) => <button key={m.id} onClick={() => setSel(m.id)} style={prChipStyle(sel === m.id)}>{m.label}</button>)}
      </div>
      <p className="pr-block-title" style={{ marginBottom: 8 }}>Seções incluídas neste modelo</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 18 }}>
        <span className="pr-check on" style={{ opacity: .6, cursor: 'default' }}><span className="pr-check-box" style={{ background: 'var(--teal)', borderColor: 'var(--teal)' }}>✓</span>Anamnese <i style={{ fontStyle: 'normal', fontSize: 11, marginLeft: 4 }}>(sempre)</i></span>
        {[['roteiro', 'Roteiro de avaliação'], ['exame', 'Exame físico'], ['sistemas', 'Avaliação por sistemas']].map(([k, l]) => (
          <button key={k} className={`pr-check${incCur[k] ? ' on' : ''}`} onClick={() => toggleInc(k)}><span className="pr-check-box" style={incCur[k] ? { background: 'var(--teal)', borderColor: 'var(--teal)' } : null}>{incCur[k] ? '✓' : ''}</span>{l}</button>
        ))}
        <span className="pr-check on" style={{ opacity: .6, cursor: 'default' }}><span className="pr-check-box" style={{ background: 'var(--teal)', borderColor: 'var(--teal)' }}>✓</span>Diagnóstico <i style={{ fontStyle: 'normal', fontSize: 11, marginLeft: 4 }}>(sempre)</i></span>
      </div>
      <p className="pr-block-title" style={{ marginBottom: 10 }}>Itens do roteiro — {cur.label} ({cur.items.length})</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cur.items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={it} onChange={(e) => upd(i, e.target.value)} placeholder="Item de avaliação" style={{ flex: 1, fontFamily: 'inherit', fontSize: 14, border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px' }} />
            <button className="pr-del-btn" onClick={() => del(i)}>✕</button>
          </div>
        ))}
        {cur.items.length === 0 && <p className="pr-empty">Nenhum item neste modelo.</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <button className="pr-addrow" onClick={add}><VtIcon name="plus" size={14} /> Adicionar item</button>
        <button className="vt-link" style={{ marginLeft: 'auto' }} onClick={reset}>Restaurar padrão</button>
      </div>
      <div className="pr-divider" style={{ margin: '18px 0' }} />
      <AnamnesePorModelo modelId={sel} modelLabel={cur.label} />
      <div className="pr-divider" style={{ margin: '20px 0' }} />
      <ConsultaCamposEditor />
    </div>
    </div>
  );
}

/* editor de anamnese específico de cada modelo de consulta */
function AnamnesePorModelo({ modelId, modelLabel }) {
  const [over, setOver] = vtUseState(() => window.vtHasAnamneseOverride(modelId));
  const [list, setList] = vtUseState(() => window.vtAnamneseFor(modelId).map((x) => ({ ...x })));
  React.useEffect(() => { setOver(window.vtHasAnamneseOverride(modelId)); setList(window.vtAnamneseFor(modelId).map((x) => ({ ...x }))); }, [modelId]);
  const persist = (l) => { setList(l); window.vtSaveAnamneseFor(modelId, l); };
  const enable = () => { setOver(true); persist(window.vtAnamneseCfg().map((x) => ({ ...x }))); window.vtToast('Anamnese específica ativada para ' + modelLabel + '.', 'ok'); };
  const disable = () => { setOver(false); window.vtSaveAnamneseFor(modelId, null); setList(window.vtAnamneseCfg().map((x) => ({ ...x }))); window.vtToast('Usando anamnese padrão.', 'ok'); };
  const upd = (i, k, v) => persist(list.map((x, j) => j === i ? { ...x, [k]: v } : x));
  return (
    <div>
      <div className="vt-head-row" style={{ marginBottom: 8 }}>
        <div><h3 className="vt-sec-title" style={{ margin: 0 }}>Anamnese de {modelLabel}</h3><p className="vt-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>{over ? 'Perguntas exclusivas deste modelo.' : 'Usando a anamnese padrão (Campos da consulta). Ative para personalizar só este modelo.'}</p></div>
        {over ? <button className="vt-link" onClick={disable}>Usar padrão</button> : <button className="vt-btn-ghost" onClick={enable}><VtIcon name="plus" size={15} /> Anamnese específica</button>}
      </div>
      {over && (
        <div>
          {list.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input value={it.q} onChange={(e) => upd(i, 'q', e.target.value)} placeholder="Pergunta" style={{ flex: 2, fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', minWidth: 0 }} />
              <select value={it.type} onChange={(e) => upd(i, 'type', e.target.value)} style={{ padding: '8px', borderRadius: 8, border: '1px solid var(--line)' }}><option value="text">Texto</option><option value="quick">Botões rápidos</option></select>
              {it.type === 'quick' && <input value={(it.opts || []).join(', ')} onChange={(e) => upd(i, 'opts', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="Opções, vírgula" style={{ flex: 2, fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', minWidth: 0 }} />}
              <button className="pr-del-btn" onClick={() => persist(list.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="pr-addrow" onClick={() => persist([...list, { k: 'q' + Date.now().toString(36), q: '', type: 'text' }])}><VtIcon name="plus" size={14} /> Adicionar pergunta</button>
        </div>
      )}
    </div>
  );
}

/* editor global dos campos da consulta (anamnese, exame, sistemas, diagnóstico) */
function ConsultaCamposEditor() {
  const [anm, setAnm] = vtUseState(() => window.vtAnamneseCfg().map((x) => ({ ...x })));
  const [exp, setExp] = vtUseState(() => window.vtExamCfg().map((x) => ({ ...x })));
  const [sys, setSys] = vtUseState(() => [...window.vtSistemasCfg()]);
  const [dia, setDia] = vtUseState(() => window.vtDiagCfg().map((x) => ({ ...x })));
  const [open, setOpen] = vtUseState('anm');
  const saveAll = () => {
    window.vtSaveAnamneseCfg(anm.filter((x) => x.q && x.q.trim()));
    window.vtSaveExamCfg(exp.filter((x) => x.l && x.l.trim()).map((x) => ({ ...x, k: x.k || x.l.toLowerCase().replace(/\s+/g, '_') })));
    window.vtSaveSistemasCfg(sys.filter((x) => x && x.trim()));
    window.vtSaveDiagCfg(dia.filter((x) => x.label && x.label.trim()).map((x) => ({ ...x, k: x.k || x.label.toLowerCase().replace(/\s+/g, '_') })));
    window.vtToast('Campos da consulta salvos.', 'ok');
  };
  const Sec = ({ id, title, children }) => (
    <div className="vt-card vt-sec" style={{ padding: 0, marginBottom: 10 }}>
      <div className="pr-sys-head" onClick={() => setOpen(open === id ? '' : id)}><span className="pr-sys-name">{title}</span><VtIcon name="chevron" size={16} /></div>
      {open === id && <div style={{ padding: '0 16px 16px' }}>{children}</div>}
    </div>
  );
  const rowInput = (val, on, ph, w) => <input value={val} onChange={(e) => on(e.target.value)} placeholder={ph} style={{ flex: w || 1, fontFamily: 'inherit', fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', minWidth: 0 }} />;
  return (
    <div>
      <div className="vt-head-row" style={{ marginBottom: 12 }}>
        <div><h3 className="vt-sec-title" style={{ margin: 0 }}>Campos da consulta</h3><p className="vt-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Personalize as perguntas e campos que aparecem em todas as consultas.</p></div>
        <button className="vt-btn-primary" onClick={saveAll}><VtIcon name="plus" size={15} /> Salvar campos</button>
      </div>
      <Sec id="anm" title={`Anamnese — perguntas (${anm.length})`}>
        {anm.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {rowInput(it.q, (v) => setAnm(anm.map((x, j) => j === i ? { ...x, q: v } : x)), 'Pergunta', 2)}
            <select value={it.type} onChange={(e) => setAnm(anm.map((x, j) => j === i ? { ...x, type: e.target.value } : x))} style={{ padding: '8px', borderRadius: 8, border: '1px solid var(--line)' }}><option value="text">Texto</option><option value="quick">Botões rápidos</option></select>
            {it.type === 'quick' && rowInput((it.opts || []).join(', '), (v) => setAnm(anm.map((x, j) => j === i ? { ...x, opts: v.split(',').map((s) => s.trim()).filter(Boolean) } : x)), 'Opções, separadas por vírgula', 2)}
            <button className="pr-del-btn" onClick={() => setAnm(anm.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="pr-addrow" onClick={() => setAnm([...anm, { k: 'q' + Date.now().toString(36), q: '', type: 'text' }])}><VtIcon name="plus" size={14} /> Adicionar pergunta</button>
      </Sec>
      <Sec id="exp" title={`Exame físico — parâmetros (${exp.length})`}>
        {exp.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            {rowInput(it.l, (v) => setExp(exp.map((x, j) => j === i ? { ...x, l: v } : x)), 'Parâmetro', 2)}
            {rowInput(it.u, (v) => setExp(exp.map((x, j) => j === i ? { ...x, u: v } : x)), 'Unidade', 1)}
            <button className="pr-del-btn" onClick={() => setExp(exp.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="pr-addrow" onClick={() => setExp([...exp, { l: '', u: '', ph: '' }])}><VtIcon name="plus" size={14} /> Adicionar parâmetro</button>
      </Sec>
      <Sec id="sys" title={`Avaliação por sistemas (${sys.length})`}>
        {sys.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            {rowInput(it, (v) => setSys(sys.map((x, j) => j === i ? v : x)), 'Sistema')}
            <button className="pr-del-btn" onClick={() => setSys(sys.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="pr-addrow" onClick={() => setSys([...sys, ''])}><VtIcon name="plus" size={14} /> Adicionar sistema</button>
      </Sec>
      <Sec id="dia" title={`Diagnóstico — campos (${dia.length})`}>
        {dia.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            {rowInput(it.label, (v) => setDia(dia.map((x, j) => j === i ? { ...x, label: v } : x)), 'Campo')}
            <button className="pr-del-btn" onClick={() => setDia(dia.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="pr-addrow" onClick={() => setDia([...dia, { k: 'd' + Date.now().toString(36), label: '', ph: '' }])}><VtIcon name="plus" size={14} /> Adicionar campo</button>
      </Sec>
    </div>
  );
}
function ModelosTab() {
  const DEFAULTS = {
    'Receituário padrão': 'RECEITUÁRIO\n\nPaciente: {{paciente}}\nTutor: {{tutor}}\n\nPrescrição:\n1. \n\n_______________________\nM.V. {{veterinario}} — CRMV',
    'Pedido de exame': 'PEDIDO DE EXAME\n\nPaciente: {{paciente}}\nExames solicitados:\n- Hemograma\n- Bioquímica\n\n_______________________\nM.V. {{veterinario}}',
    'Laudo odontológico': 'LAUDO ODONTOLÓGICO\n\nPaciente: {{paciente}}\nAchados: {{achados}}\nConduta: \n\n_______________________\nM.V. {{veterinario}}',
    'Termo de consentimento': 'TERMO DE CONSENTIMENTO\n\nEu, {{tutor}}, autorizo o procedimento em {{paciente}}.\n\nData: ___/___/______\nAssinatura: _______________________',
    'Pós-operatório': 'ORIENTAÇÕES PÓS-OPERATÓRIAS\n\nPaciente: {{paciente}}\n1. Repouso por X dias\n2. Medicação conforme receita\n3. Retorno em: ___',
  };
  const [docs, setDocs] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.docTemplates) || DEFAULTS;
  });
  const [edit, setEdit] = vtUseState(null);
  const [text, setText] = vtUseState('');
  const open = (name) => { setEdit(name); setText(docs[name] || ''); };
  const save = () => {
    const next = { ...docs, [edit]: text };
    setDocs(next);
    if (window.VtStore) window.VtStore.setData({ docTemplates: next });
    window.vtToast(`Modelo "${edit}" salvo.`, 'ok');
    setEdit(null);
  };
  return (
    <div className="vt-card vt-sec">
      <h3 className="vt-sec-title">Modelos de documentos</h3>
      <p className="vt-muted" style={{ marginTop: -6, marginBottom: 14, fontSize: 13 }}>Documentos padrão do sistema. Editor e PDF juntos — use {'{{paciente}}'}, {'{{tutor}}'}, {'{{veterinario}}'} como variáveis.</p>
      <div className="vt-model-list">{Object.keys(docs).map((i) => <div key={i} className="vt-model-row"><VtIcon name="receipt" size={17} /> {i} <button className="vt-link" onClick={() => open(i)}>Editar</button></div>)}</div>
      {edit && (
        <div className="fin-modal-bg" onClick={() => setEdit(null)}>
          <div className="fin-modal" style={{ width: 600 }} onClick={(e) => e.stopPropagation()}>
            <h3>{edit}</h3>
            <p>Editor de documento. As variáveis são preenchidas ao gerar o PDF.</p>
            <textarea className="vtf-input" style={{ minHeight: 280, fontFamily: 'ui-monospace, monospace', fontSize: 13, lineHeight: 1.5 }} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="fin-modal-actions" style={{ marginTop: 12 }}>
              <button className="vt-btn-ghost" onClick={() => { const w = window.open('', '_blank'); w.document.write('<html><head><title>' + edit + '</title><style>body{font-family:serif;padding:40px;white-space:pre-wrap;font-size:14px;line-height:1.7}</style></head><body>' + text.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</body></html>'); w.document.close(); setTimeout(() => w.print(), 300); }}>Imprimir / PDF</button>
              <button className="vt-btn-ghost" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="vt-btn-primary" onClick={save}>Salvar modelo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function IntegracoesTab() {
  const [integ, setInteg] = vtUseState(() => {
    const d = window.VtStore && window.VtStore.getData();
    return (d && d.integrations) || { 'Google Calendar': true, 'WhatsApp Business': true, 'Stripe': false, 'Mercado Pago': true, 'Asaas': false, 'Conta Azul': false };
  });
  const toggle = (name) => {
    const next = { ...integ, [name]: !integ[name] };
    setInteg(next);
    if (window.VtStore) window.VtStore.setData({ integrations: next });
    window.vtToast(`${name} ${next[name] ? 'ativada' : 'desativada'}.`, 'ok');
  };
  const [gid, setGid] = vtUseState(() => { try { const ls = localStorage.getItem('vtGoogleClientId'); if (ls) return ls; } catch (e) {} const d = window.VtStore && window.VtStore.getData(); return (d && d.integrationsCfg && d.integrationsCfg.googleClientId) || (window.GOOGLE_CLIENT_ID || ''); });
  const [, forceGcal] = vtUseState(0);
  const saveGid = () => {
    const v = gid.trim();
    try { localStorage.setItem('vtGoogleClientId', v); } catch (e) {}
    const d = (window.VtStore && window.VtStore.getData()) || {};
    if (window.VtStore) window.VtStore.setData({ integrationsCfg: { ...(d.integrationsCfg || {}), googleClientId: v } });
    window.GOOGLE_CLIENT_ID = v;
    window.vtToast('Google Client ID salvo.', 'ok');
  };
  const discGid = () => { if (window.VtGCal) window.VtGCal.disconnect(); forceGcal((n) => n + 1); window.vtToast('Google Calendar desconectado.', 'ok'); };
  const origin = (typeof location !== 'undefined' && location.origin && location.origin !== 'null') ? location.origin : '(a origem onde este app está hospedado)';
  const [cfg, setCfg] = vtUseState(() => window.vtConfig());
  const setCfgK = (k, v) => { const next = { ...cfg, [k]: v }; setCfg(next); window.vtSaveConfig(next); };
  const [icalModal, setIcalModal] = vtUseState(false);
  const [icalDraft, setIcalDraft] = vtUseState('');
  const gConnected = !!(cfg.googleCalendarUrl && cfg.googleCalendarUrl.trim());
  const testWhats = () => {
    const link = window.vtWaLink(cfg.whatsappClinica, 'Mensagem de teste do VetTooth Pro ✅ Integração de WhatsApp funcionando!');
    if (!link) { window.vtToast('Informe o número do WhatsApp da clínica.', 'err'); return; }
    window.open(link, '_blank', 'noopener');
  };
  const VT_WA_VARS = ['{paciente}', '{data}', '{hora}', '{tutor}', '{clinica}', '{total}'];
  return (
    <div>
      {/* ---- Google Agenda (iCal / link rápido) ---- */}
      <div className="vt-card vt-sec" style={{ marginBottom: 16 }}>
        <div className="vt-head-row" style={{ marginBottom: 6 }}>
          <h3 className="vt-sec-title" style={{ margin: 0 }}><VtIcon name="calendar" size={16} /> Google Agenda</h3>
          <span className={`vt-integ-status${gConnected ? ' on' : ''}`}>{gConnected ? '✅ Google Agenda conectado' : '⚠️ Não conectado'}</span>
        </div>
        <p className="vt-muted" style={{ fontSize: 13, marginTop: 0 }}>Conecte a agenda da clínica ao seu Google Calendar colando a URL pública (iCal) do calendário. Você também pode abrir cada novo agendamento direto no Google Agenda.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="vt-btn-primary" onClick={() => { setIcalDraft(cfg.googleCalendarUrl || ''); setIcalModal(true); }}>🔗 {gConnected ? 'Editar conexão' : 'Conectar com Google Agenda'}</button>
          {gConnected && <button className="vt-btn-ghost" onClick={() => { setCfgK('googleCalendarUrl', ''); window.vtToast('Google Agenda desconectado.', 'ok'); }}>Desconectar</button>}
          {gConnected && <a className="vt-link" href={cfg.googleCalendarUrl} target="_blank" rel="noopener noreferrer">Abrir calendário</a>}
        </div>
        <label className="vt-check-inline" style={{ marginTop: 12 }}><input type="checkbox" checked={!!cfg.syncGoogleAgenda} onChange={(e) => setCfgK('syncGoogleAgenda', e.target.checked)} /> Ao criar agendamento, abrir evento no Google Agenda</label>
      </div>

      {/* ---- WhatsApp ---- */}
      <div className="vt-card vt-sec" style={{ marginBottom: 16 }}>
        <h3 className="vt-sec-title"><VtIcon name="phone" size={16} /> WhatsApp</h3>
        <div className="vt-form-row" style={{ alignItems: 'flex-end' }}>
          <label className="vtf" style={{ flex: 1 }}><span className="vtf-label">Número do WhatsApp da clínica</span><span className="vtf-inputwrap"><input className="vtf-input" value={cfg.whatsappClinica} onChange={(e) => setCfgK('whatsappClinica', e.target.value)} placeholder="Ex.: 11999998888 (com DDD)" /></span></label>
          <button className="vt-btn-ghost" style={{ flex: 'none' }} onClick={testWhats}>Testar WhatsApp</button>
        </div>
        <label className="vt-check-inline" style={{ marginTop: 4 }}><input type="checkbox" checked={!!cfg.whatsappLembrete} onChange={(e) => setCfgK('whatsappLembrete', e.target.checked)} /> Enviar lembrete automático 24h antes da consulta</label>
        <p className="vt-muted" style={{ fontSize: 12, margin: '12px 0 6px' }}>Variáveis disponíveis nos modelos: {VT_WA_VARS.map((v) => <code key={v} className="vt-wa-var">{v}</code>)}</p>
        <label className="vtf" style={{ width: '100%' }}><span className="vtf-label">1 · Confirmação de agendamento</span><span className="vtf-inputwrap"><textarea className="vtf-input" style={{ minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }} value={cfg.waTplConfirm} onChange={(e) => setCfgK('waTplConfirm', e.target.value)} /></span></label>
        <label className="vtf" style={{ width: '100%', marginTop: 10 }}><span className="vtf-label">2 · Lembrete 24h antes</span><span className="vtf-inputwrap"><textarea className="vtf-input" style={{ minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }} value={cfg.waTplLembrete} onChange={(e) => setCfgK('waTplLembrete', e.target.value)} /></span></label>
        <label className="vtf" style={{ width: '100%', marginTop: 10 }}><span className="vtf-label">3 · Pós-consulta / resumo</span><span className="vtf-inputwrap"><textarea className="vtf-input" style={{ minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }} value={cfg.waTplPos} onChange={(e) => setCfgK('waTplPos', e.target.value)} /></span></label>
      </div>

      <div className="vt-card vt-sec" style={{ marginBottom: 16 }}>
        <h3 className="vt-sec-title"><VtIcon name="calendar" size={16} /> Google Calendar — login real (OAuth)</h3>
        <p className="vt-muted" style={{ fontSize: 13, marginTop: 0 }}>Para conectar a Agenda ao Google Calendar com login real: crie um projeto em <b>console.cloud.google.com</b>, ative a <b>Google Calendar API</b>, crie credenciais <b>OAuth 2.0 (tipo: Aplicativo Web)</b> e adicione a origem atual como <b>JavaScript autorizado</b>. Depois cole o <b>Client ID</b> abaixo.</p>
        <p className="vt-muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 10 }}>Origem atual (JavaScript autorizado): <code style={{ background: 'var(--teal-t,#eaf6f5)', padding: '2px 6px', borderRadius: 5 }}>{origin}</code></p>
        <div className="vt-form-row" style={{ alignItems: 'flex-end' }}>
          <label className="vtf" style={{ flex: 1 }}><span className="vtf-label">Google Client ID</span><span className="vtf-inputwrap"><input className="vtf-input" value={gid} onChange={(e) => setGid(e.target.value)} placeholder="xxxxxxxx.apps.googleusercontent.com" /></span></label>
          <button className="vt-btn-primary" style={{ flex: 'none' }} onClick={saveGid}>Salvar</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          <span className="vt-muted" style={{ fontSize: 12 }}><span className="ag-gcal-dot" style={{ background: (window.VtGCal && window.VtGCal.isConnected()) ? 'var(--green)' : '#c0473a' }} />Status: {window.VtGCal && window.VtGCal.configured() ? <b style={{ color: 'var(--green)' }}>Configurado</b> : <b style={{ color: 'var(--amber)' }}>Não configurado</b>}{window.VtGCal && window.VtGCal.isConnected() ? <b> · Conectado{window.VtGCal.getEmail() ? ' (' + window.VtGCal.getEmail() + ')' : ''}</b> : ' · Desconectado'}</span>
          {window.VtGCal && window.VtGCal.isConnected() && <button className="vt-btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={discGid}>Desconectar</button>}
        </div>
      </div>
      <div className="vt-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        {Object.keys(integ).map((name) => (
          <div key={name} className="vt-card vt-integ">
            <span className="vt-integ-name">{name}</span>
            <button className={`vt-toggle${integ[name] ? ' on' : ''}`} onClick={() => toggle(name)}><i /></button>
          </div>
        ))}
      </div>
      {icalModal && (
        <div className="fin-modal-bg" onClick={() => setIcalModal(false)}>
          <div className="fin-modal" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
            <button className="fin-modal-x" onClick={() => setIcalModal(false)}>×</button>
            <h3>Conectar com Google Agenda</h3>
            <p>Cole a URL pública (iCal) do seu Google Calendar para vincular à clínica.</p>
            <ol className="vt-ical-steps">
              <li>No Google Calendar (computador), passe o mouse sobre o calendário desejado e clique em <b>⋮ → Configurações e compartilhamento</b>.</li>
              <li>Em <b>Permissões de acesso</b>, marque <b>“Tornar disponível ao público”</b> (ou use o endereço secret iCal).</li>
              <li>Em <b>Integrar agenda</b>, copie o <b>“Endereço público no formato iCal”</b> (termina em <code>.ics</code>).</li>
              <li>Cole a URL abaixo e salve.</li>
            </ol>
            <label className="vtf" style={{ width: '100%' }}><span className="vtf-label">URL do calendário (iCal)</span><span className="vtf-inputwrap"><input className="vtf-input" value={icalDraft} onChange={(e) => setIcalDraft(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/.../public/basic.ics" /></span></label>
            <div className="fin-modal-actions" style={{ marginTop: 14 }}>
              <button className="vt-btn-ghost" onClick={() => setIcalModal(false)}>Cancelar</button>
              <button className="vt-btn-primary" onClick={() => { setCfgK('googleCalendarUrl', icalDraft.trim()); setIcalModal(false); window.vtToast(icalDraft.trim() ? 'Google Agenda conectado!' : 'Conexão limpa.', 'ok'); }}>Salvar conexão</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Editor de Especialidades ---- */
const ESPECIALIDADES_ICONS = ['grid','paw','users','calendar','tooth','pen','box','dollar','chart','gear','spark','bell','search','syringe','alert','receipt','stethoscope','pin','phone','mail','user','check'];
const ESPECIALIDADES_COLORS = ['#14a8a0','#2563eb','#d97706','#7c3aed','#16a34a','#dc2626','#0891b2','#64748b'];

function EspecialidadesTab() {
  const baseIds = window.PR.consultModels.map((m) => m.id);
  const getModels = () => (window.vtConsultModels ? window.vtConsultModels() : window.PR.consultModels);
  const [models, setModels] = vtUseState(getModels);
  const [sel, setSel] = vtUseState(null); // id do modelo em edição
  const [form, setForm] = vtUseState(null); // campos do form
  const [newMode, setNewMode] = vtUseState(false);

  const refresh = () => setModels(getModels());

  const openEdit = (m) => {
    setSel(m.id);
    setForm({ label: m.label, desc: m.desc || '', icon: m.icon || 'stethoscope', color: m.color || '#14a8a0' });
    setNewMode(false);
  };

  const openNew = () => {
    setSel('__new__');
    setForm({ label: '', desc: '', icon: 'stethoscope', color: '#14a8a0' });
    setNewMode(true);
  };

  const cancel = () => { setSel(null); setForm(null); setNewMode(false); };

  const save = () => {
    if (!form.label || !form.label.trim()) { window.vtToast('Informe o nome da especialidade.', 'err'); return; }
    const id = newMode ? form.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString(36).slice(-4) : sel;
    window.vtSaveConsultModel(id, { label: form.label.trim(), desc: form.desc.trim(), icon: form.icon, color: form.color });
    window.vtToast('Especialidade salva.', 'ok');
    refresh(); cancel();
  };

  const doReset = (id) => {
    if (!window.confirm('Restaurar os valores padrão desta especialidade?')) return;
    window.vtResetConsultModel(id);
    window.vtToast('Especialidade restaurada.', 'ok');
    refresh(); cancel();
  };

  const doDelete = (id) => {
    if (!window.confirm('Excluir esta especialidade personalizada?')) return;
    window.vtDeleteConsultModel(id);
    window.vtToast('Especialidade excluída.', 'ok');
    refresh(); cancel();
  };

  const sf = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="vt-head-row" style={{ marginBottom: 16 }}>
        <div><h3 className="vt-sec-title" style={{ margin: 0 }}>Especialidades de consulta</h3><p className="vt-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Personalize nome, ícone e cor de cada especialidade. Crie novas especialidades para o picker de consulta.</p></div>
        <button className="vt-btn-primary" onClick={openNew}><VtIcon name="plus" size={15} /> Nova especialidade</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        {models.map((m) => {
          const c = m.color || '#14a8a0';
          const isExtra = !baseIds.includes(m.id);
          return (
            <button key={m.id} onClick={() => openEdit(m)} style={{ textAlign: 'left', padding: '16px 18px', borderRadius: 13, border: `2px solid ${sel === m.id ? c : 'var(--line)'}`, background: sel === m.id ? `${c}0c` : 'var(--card)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <VtIcon name={m.icon} size={20} style={{ color: c }} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', display: 'block' }}>{m.label}</b>
                  {isExtra && <span style={{ fontSize: 10.5, fontWeight: 700, color: c, background: `${c}18`, padding: '1px 7px', borderRadius: 999 }}>Personalizada</span>}
                </div>
              </div>
              {m.desc && <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{m.desc}</p>}
            </button>
          );
        })}
      </div>

      {sel && form && (
        <div className="vt-card vt-sec" style={{ marginTop: 4 }}>
          <h3 className="vt-sec-title" style={{ marginTop: 0 }}>{newMode ? 'Nova especialidade' : `Editar — ${models.find((m) => m.id === sel) ? models.find((m) => m.id === sel).label : ''}`}</h3>
          <div className="vt-form-row">
            <label className="vtf" style={{ flex: 2 }}><span className="vtf-label">Nome</span><span className="vtf-inputwrap"><input className="vtf-input" value={form.label} onChange={(e) => sf('label')(e.target.value)} placeholder="Ex.: Cardiologia" /></span></label>
            <label className="vtf" style={{ flex: 3 }}><span className="vtf-label">Descrição</span><span className="vtf-inputwrap"><input className="vtf-input" value={form.desc} onChange={(e) => sf('desc')(e.target.value)} placeholder="Breve descrição da especialidade" /></span></label>
          </div>

          <div style={{ marginBottom: 14 }}>
            <span className="vtf-label" style={{ display: 'block', marginBottom: 8 }}>Ícone</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {ESPECIALIDADES_ICONS.map((ic) => (
                <button key={ic} onClick={() => sf('icon')(ic)} title={ic} style={{ width: 38, height: 38, borderRadius: 9, border: `2px solid ${form.icon === ic ? (form.color || '#14a8a0') : 'var(--line)'}`, background: form.icon === ic ? `${form.color || '#14a8a0'}18` : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.12s' }}>
                  <VtIcon name={ic} size={18} style={{ color: form.icon === ic ? (form.color || '#14a8a0') : 'var(--muted)' }} />
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <span className="vtf-label" style={{ display: 'block', marginBottom: 8 }}>Cor</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {ESPECIALIDADES_COLORS.map((c) => (
                <button key={c} onClick={() => sf('color')(c)} style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: `3px solid ${form.color === c ? 'var(--ink)' : '#fff'}`, boxShadow: `0 0 0 1px ${form.color === c ? c : 'var(--line)'}`, cursor: 'pointer', transition: 'all 0.12s' }} title={c} />
              ))}
              <label title="Cor personalizada" style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                <input type="color" value={form.color} onChange={(e) => sf('color')(e.target.value)} style={{ width: 30, height: 30, padding: 1, border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer' }} />
                <span className="vtf-label" style={{ fontSize: 11.5 }}>Custom</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="vt-btn-primary" onClick={save}><VtIcon name="check" size={15} /> Salvar</button>
            <button className="vt-btn-ghost" onClick={cancel}>Cancelar</button>
            {!newMode && baseIds.includes(sel) && (
              <button className="vt-btn-ghost" onClick={() => doReset(sel)} style={{ color: 'var(--amber)', borderColor: 'var(--amber)' }}>Restaurar padrão</button>
            )}
            {!newMode && !baseIds.includes(sel) && (
              <button className="vt-btn-ghost" onClick={() => doDelete(sel)} style={{ color: 'var(--red)', borderColor: 'var(--red)', marginLeft: 'auto' }}>Excluir</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ODONTOGRAMA CONFIG TAB ───────────────────────────────────────────────────
function OdontogramaTab() {
  const getDefConds = () => (window.OD_CONDS || []).map((c) => ({ ...c }));
  const [cfg, setCfg] = vtUseState(() => window.vtOdontoCfg());
  const [conds, setConds] = vtUseState(() => { const c = window.vtOdontoCfg(); return c.conds && c.conds.length ? c.conds.map((x) => ({ ...x })) : getDefConds(); });
  const [editIdx, setEditIdx] = vtUseState(null);
  const [editRow, setEditRow] = vtUseState(null);
  const [newMode, setNewMode] = vtUseState(false);
  const OD_DEFAULT_IDS = ['normal','ausente','fratura','reabsorcao','carie','abrasao','atricao','gengivite','periodontite','massa'];

  const saveCfg = (patch) => { const next = { ...cfg, ...patch }; setCfg(next); window.vtSaveOdontoCfg(next); window.vtToast('Configurações de odontograma salvas.', 'ok'); };
  const saveConds = (list) => { setConds(list); const next = { ...cfg, conds: list }; setCfg(next); window.vtSaveOdontoCfg(next); window.vtToast('Condições salvas.', 'ok'); };
  const cancelEdit = () => { setEditIdx(null); setEditRow(null); setNewMode(false); };
  const openEdit = (idx) => { setEditIdx(idx); setEditRow({ ...conds[idx] }); setNewMode(false); };
  const openNew = () => { setEditIdx(-1); setEditRow({ id: '', label: '', short: '', color: '#6366f1' }); setNewMode(true); };
  const saveRow = () => {
    if (!editRow.label.trim()) { window.vtToast('Informe o nome da condição.', 'err'); return; }
    const row = { ...editRow };
    if (!row.id.trim()) row.id = row.label.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'') + '_' + Date.now().toString(36).slice(-4);
    saveConds(newMode ? [...conds, row] : conds.map((c, i) => (i === editIdx ? row : c)));
    cancelEdit();
  };
  const deleteRow = (idx) => {
    if (OD_DEFAULT_IDS.includes(conds[idx].id)) { window.vtToast('Condições padrão não podem ser removidas.', 'err'); return; }
    if (!window.confirm('Remover esta condição?')) return;
    saveConds(conds.filter((_, i) => i !== idx)); cancelEdit();
  };
  const resetConds = () => { if (!window.confirm('Restaurar condições padrão? Personalizações serão perdidas.')) return; const def = getDefConds(); setConds(def); saveCfg({ conds: def }); };

  const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 };
  const sec = { marginBottom: 28 };

  return (
    <div>
      <div style={sec}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={labelStyle}>Condições dentárias</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="vt-btn-ghost" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--amber)', borderColor: 'var(--amber)' }} onClick={resetConds}>Restaurar padrão</button>
            <button className="vt-btn-primary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={openNew}>+ Adicionar</button>
          </div>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {conds.map((c, idx) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: idx < conds.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', background: editIdx === idx ? 'var(--teal-t)' : '' }} onClick={() => openEdit(idx)}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: c.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{c.label}</div>
              {c.short && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px' }}>{c.short}</div>}
              {!OD_DEFAULT_IDS.includes(c.id) && <div style={{ fontSize: 11, color: 'var(--teal)' }}>personalizado</div>}
            </div>
          ))}
        </div>
        {editIdx !== null && editRow && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--teal)', borderRadius: 10, padding: 16, marginTop: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Nome *</div><input className="vt-input" value={editRow.label} onChange={(e) => setEditRow({ ...editRow, label: e.target.value })} placeholder="Ex: Hipoplasia de esmalte" /></div>
              <div><div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Código curto (máx 3)</div><input className="vt-input" value={editRow.short} maxLength={3} onChange={(e) => setEditRow({ ...editRow, short: e.target.value.toUpperCase() })} placeholder="Ex: HE" /></div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Cor de destaque</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={editRow.color} onChange={(e) => setEditRow({ ...editRow, color: e.target.value })} style={{ width: 42, height: 32, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{editRow.color}</span>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: editRow.color, border: '1px solid var(--border)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="vt-btn-primary" onClick={saveRow}>Salvar</button>
              <button className="vt-btn-ghost" onClick={cancelEdit}>Cancelar</button>
              {!newMode && !OD_DEFAULT_IDS.includes(conds[editIdx]?.id) && <button className="vt-btn-ghost" onClick={() => deleteRow(editIdx)} style={{ color: 'var(--red)', borderColor: 'var(--red)', marginLeft: 'auto' }}>Remover</button>}
            </div>
          </div>
        )}
      </div>

      <div style={sec}>
        <div style={labelStyle}>Notação preferida</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['triadan','Triadan modificada (padrão veterinário)'],['avdc','AVDC (nomenclatura americana)']].map(([v, lbl]) => (
            <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--card)', border: '1px solid ' + (cfg.notation === v ? 'var(--teal)' : 'var(--border)'), borderRadius: 8, padding: '10px 14px', flex: 1 }}>
              <input type="radio" name="notation" value={v} checked={cfg.notation === v} onChange={() => saveCfg({ notation: v })} style={{ accentColor: 'var(--teal)' }} />
              <span style={{ fontSize: 14 }}>{lbl}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={sec}>
        <div style={labelStyle}>Graus de mobilidade (M0–M3)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(cfg.mobilityLabels || window.VT_ODONTO_CFG_DEFAULT.mobilityLabels).map((lbl, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--teal)', width: 28, flexShrink: 0 }}>M{i}</div>
              <input className="vt-input" value={lbl} style={{ flex: 1 }} onChange={(e) => { const next = [...(cfg.mobilityLabels || window.VT_ODONTO_CFG_DEFAULT.mobilityLabels)]; next[i] = e.target.value; setCfg({ ...cfg, mobilityLabels: next }); }} onBlur={() => { window.vtSaveOdontoCfg(cfg); }} />
            </div>
          ))}
        </div>
        <button className="vt-btn-ghost" style={{ marginTop: 8, fontSize: 12, padding: '4px 10px' }} onClick={() => saveCfg({ mobilityLabels: cfg.mobilityLabels })}>Salvar graus de mobilidade</button>
      </div>

      <div style={sec}>
        <div style={labelStyle}>Graus de furcação (F0–F3)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(cfg.furcationLabels || window.VT_ODONTO_CFG_DEFAULT.furcationLabels).map((lbl, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--teal)', width: 28, flexShrink: 0 }}>F{i}</div>
              <input className="vt-input" value={lbl} style={{ flex: 1 }} onChange={(e) => { const next = [...(cfg.furcationLabels || window.VT_ODONTO_CFG_DEFAULT.furcationLabels)]; next[i] = e.target.value; setCfg({ ...cfg, furcationLabels: next }); }} onBlur={() => { window.vtSaveOdontoCfg(cfg); }} />
            </div>
          ))}
        </div>
        <button className="vt-btn-ghost" style={{ marginTop: 8, fontSize: 12, padding: '4px 10px' }} onClick={() => saveCfg({ furcationLabels: cfg.furcationLabels })}>Salvar graus de furcação</button>
      </div>

      <div style={sec}>
        <div style={labelStyle}>Estadiamento periodontal (AVDC/WSAVA) — profundidade de bolsa (mm)</div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {(cfg.perioStages || window.VT_ODONTO_CFG_DEFAULT.perioStages).map((st, i) => (
            <div key={st.stage} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: ['#14a8a0','#eab308','#f97316','#ef4444'][i], width: 28, flexShrink: 0 }}>{st.stage}</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input className="vt-input" value={st.label} onChange={(e) => { const next = (cfg.perioStages || window.VT_ODONTO_CFG_DEFAULT.perioStages).map((s, j) => j === i ? { ...s, label: e.target.value } : s); setCfg({ ...cfg, perioStages: next }); }} onBlur={() => saveCfg({ perioStages: cfg.perioStages })} />
                <input className="vt-input" value={st.desc} placeholder="Descrição clínica" onChange={(e) => { const next = (cfg.perioStages || window.VT_ODONTO_CFG_DEFAULT.perioStages).map((s, j) => j === i ? { ...s, desc: e.target.value } : s); setCfg({ ...cfg, perioStages: next }); }} onBlur={() => saveCfg({ perioStages: cfg.perioStages })} />
              </div>
              {i < 3 ? (
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>até</span>
                  <input type="number" className="vt-input" value={st.pocketMax} min={1} max={30} style={{ width: 64, textAlign: 'center' }} onChange={(e) => { const next = (cfg.perioStages || window.VT_ODONTO_CFG_DEFAULT.perioStages).map((s, j) => j === i ? { ...s, pocketMax: Number(e.target.value) } : s); setCfg({ ...cfg, perioStages: next }); }} onBlur={() => saveCfg({ perioStages: cfg.perioStages })} />
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>mm</span>
                </div>
              ) : (
                <div style={{ flexShrink: 0, fontSize: 12, color: 'var(--muted)', width: 90, textAlign: 'right' }}>acima do anterior</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AGENDA CONFIG TAB ────────────────────────────────────────────────────────
function AgendaConfigTab() {
  const [cfg, setCfg] = vtUseState(() => { const c = window.vtAgendaCfg(); return { ...window.VT_AGENDA_CFG_DEFAULT, ...c, days: { ...window.VT_AGENDA_CFG_DEFAULT.days, ...(c.days || {}) } }; });
  const [newHoliday, setNewHoliday] = vtUseState('');
  const [newHolidayMotivo, setNewHolidayMotivo] = vtUseState('');

  const save = (patch) => { const next = { ...cfg, ...patch }; setCfg(next); window.vtSaveAgendaCfg(next); window.vtToast('Configurações de agenda salvas.', 'ok'); };

  const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 };
  const sec = { marginBottom: 28 };
  const DAYS = [['seg','Seg'],['ter','Ter'],['qua','Qua'],['qui','Qui'],['sex','Sex'],['sab','Sáb'],['dom','Dom']];
  const SLOTS = [15,20,30,45,60,90,120];
  const ADVANCES = [7,14,30,60,90,180];

  const addHoliday = () => {
    if (!newHoliday) { window.vtToast('Selecione uma data.', 'err'); return; }
    if (!newHolidayMotivo.trim()) { window.vtToast('Informe o motivo do bloqueio.', 'err'); return; }
    const list = [...(cfg.holidays || [])];
    const exists = list.some((h) => (typeof h === 'string' ? h : h.date) === newHoliday);
    if (!exists) {
      list.push({ date: newHoliday, motivo: newHolidayMotivo.trim() });
      list.sort((a, b) => (typeof a === 'string' ? a : a.date).localeCompare(typeof b === 'string' ? b : b.date));
      save({ holidays: list });
    }
    setNewHoliday(''); setNewHolidayMotivo('');
  };
  const removeHoliday = (dateStr) => save({ holidays: (cfg.holidays || []).filter((h) => (typeof h === 'string' ? h : h.date) !== dateStr) });

  return (
    <div>
      <div style={sec}>
        <div style={labelStyle}>Dias de funcionamento</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DAYS.map(([k, lbl]) => (
            <label key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', background: 'var(--card)', border: '1px solid ' + (cfg.days[k] ? 'var(--teal)' : 'var(--border)'), borderRadius: 8, padding: '10px 14px', minWidth: 54, transition: 'border-color .15s' }}>
              <input type="checkbox" checked={!!cfg.days[k]} style={{ accentColor: 'var(--teal)' }} onChange={(e) => save({ days: { ...cfg.days, [k]: e.target.checked } })} />
              <span style={{ fontSize: 13, fontWeight: cfg.days[k] ? 700 : 400 }}>{lbl}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={sec}>
        <div style={labelStyle}>Horário de funcionamento</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Abertura</div><input type="time" className="vt-input" value={cfg.startTime} style={{ width: 130 }} onChange={(e) => save({ startTime: e.target.value })} /></div>
          <div><div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Encerramento</div><input type="time" className="vt-input" value={cfg.endTime} style={{ width: 130 }} onChange={(e) => save({ endTime: e.target.value })} /></div>
        </div>
      </div>

      <div style={sec}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
          <input type="checkbox" checked={!!cfg.useLunch} style={{ accentColor: 'var(--teal)' }} onChange={(e) => save({ useLunch: e.target.checked })} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Bloquear intervalo de almoço</span>
        </label>
        {cfg.useLunch && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingLeft: 24 }}>
            <div><div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Início</div><input type="time" className="vt-input" value={cfg.lunchStart} style={{ width: 130 }} onChange={(e) => save({ lunchStart: e.target.value })} /></div>
            <div><div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Fim</div><input type="time" className="vt-input" value={cfg.lunchEnd} style={{ width: 130 }} onChange={(e) => save({ lunchEnd: e.target.value })} /></div>
          </div>
        )}
      </div>

      <div style={sec}>
        <div style={labelStyle}>Duração padrão do slot de agendamento</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SLOTS.map((s) => <button key={s} className={cfg.slotMin === s ? 'vt-btn-primary' : 'vt-btn-ghost'} onClick={() => save({ slotMin: s })} style={{ minWidth: 60 }}>{s} min</button>)}
        </div>
      </div>

      <div style={sec}>
        <div style={labelStyle}>Antecedência máxima de agendamento</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ADVANCES.map((d) => <button key={d} className={cfg.advanceDays === d ? 'vt-btn-primary' : 'vt-btn-ghost'} onClick={() => save({ advanceDays: d })} style={{ minWidth: 64 }}>{d} dias</button>)}
        </div>
      </div>

      <div style={sec}>
        <div style={labelStyle}>Feriados e dias sem atendimento</div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0, marginBottom: 10 }}>Dias bloqueados aparecem na agenda com aviso e impedem o agendamento. O motivo é exibido ao tentar marcar.</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <input type="date" className="vt-input" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} style={{ width: 170 }} />
          <input className="vt-input" value={newHolidayMotivo} onChange={(e) => setNewHolidayMotivo(e.target.value)} placeholder="Motivo obrigatório (ex: Natal, Emenda)" style={{ flex: 1, minWidth: 180 }} />
          <button className="vt-btn-primary" onClick={addHoliday} disabled={!newHoliday || !newHolidayMotivo.trim()}>+ Adicionar</button>
        </div>
        {!(cfg.holidays || []).length && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhum feriado cadastrado.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(cfg.holidays || []).map((h) => {
            const dateStr = typeof h === 'string' ? h : h.date;
            const motivo  = typeof h === 'string' ? '' : (h.motivo || '');
            return (
            <div key={dateStr} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
              <span style={{ fontWeight: 700, minWidth: 80 }}>{dateStr.split('-').reverse().join('/')}</span>
              <span style={{ flex: 1, color: 'var(--muted)' }}>{motivo || <i>sem motivo</i>}</span>
              <button onClick={() => removeHoliday(dateStr)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── ESTOQUE CONFIG TAB ───────────────────────────────────────────────────────
function EstoqueConfigTab() {
  const [cfg, setCfg] = vtUseState(() => { const c = window.vtEstoqueCfg(); return { ...window.VT_ESTOQUE_CFG_DEFAULT, ...c }; });
  const [newCat, setNewCat] = vtUseState('');
  const [newUnit, setNewUnit] = vtUseState('');
  const [fornForm, setFornForm] = vtUseState(null);

  const save = (patch) => { const next = { ...cfg, ...patch }; setCfg(next); window.vtSaveEstoqueCfg(next); window.vtToast('Configurações de estoque salvas.', 'ok'); };

  const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 };
  const sec = { marginBottom: 28 };
  const chip = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 13 };

  const addCat = () => { const v = newCat.trim(); if (!v || cfg.categorias.includes(v)) return; save({ categorias: [...cfg.categorias, v] }); setNewCat(''); };
  const removeCat = (c) => save({ categorias: cfg.categorias.filter((x) => x !== c) });
  const addUnit = () => { const v = newUnit.trim().toLowerCase(); if (!v || cfg.unidades.includes(v)) return; save({ unidades: [...cfg.unidades, v] }); setNewUnit(''); };
  const removeUnit = (u) => save({ unidades: cfg.unidades.filter((x) => x !== u) });
  const saveForn = () => {
    if (!fornForm?.nome?.trim()) { window.vtToast('Informe o nome do fornecedor.', 'err'); return; }
    const list = [...(cfg.fornecedores || [])];
    const f = { nome: fornForm.nome.trim(), cnpj: fornForm.cnpj?.trim() || '', tel: fornForm.tel?.trim() || '', email: fornForm.email?.trim() || '' };
    if (fornForm.idx != null) list[fornForm.idx] = f; else list.push(f);
    save({ fornecedores: list }); setFornForm(null);
  };
  const deleteForn = (idx) => { if (!window.confirm('Remover fornecedor?')) return; save({ fornecedores: (cfg.fornecedores || []).filter((_, i) => i !== idx) }); setFornForm(null); };

  return (
    <div>
      <div className="vt-ai-note" style={{ marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span>💡 Aqui você configura categorias, unidades e fornecedores. Para ver o estoque de produtos, acesse o módulo <b>Estoque</b>.</span>
        <button className="vt-btn-primary" style={{ flex: 'none', fontSize: 12, padding: '5px 12px' }} onClick={() => window._vtSetActive && window._vtSetActive('insumos')}>Ir para Estoque →</button>
      </div>
      <div style={sec}>
        <div style={labelStyle}>Categorias de produtos</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <input className="vt-input" value={newCat} placeholder="Nova categoria..." onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCat()} style={{ flex: 1, maxWidth: 280 }} />
          <button className="vt-btn-primary" onClick={addCat} disabled={!newCat.trim()}>+ Adicionar</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {cfg.categorias.map((c) => <div key={c} style={chip}>{c}<button onClick={() => removeCat(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 15, padding: 0 }}>×</button></div>)}
        </div>
      </div>

      <div style={sec}>
        <div style={labelStyle}>Unidades de medida</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <input className="vt-input" value={newUnit} placeholder="Nova unidade (ex: ml)..." onChange={(e) => setNewUnit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addUnit()} style={{ flex: 1, maxWidth: 200 }} />
          <button className="vt-btn-primary" onClick={addUnit} disabled={!newUnit.trim()}>+ Adicionar</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {cfg.unidades.map((u) => <div key={u} style={chip}>{u}<button onClick={() => removeUnit(u)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 15, padding: 0 }}>×</button></div>)}
        </div>
      </div>

      <div style={sec}>
        <div style={labelStyle}>Limite global de alerta (estoque mínimo)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="number" className="vt-input" value={cfg.alertThreshold} min={0} max={9999} style={{ width: 90 }} onChange={(e) => setCfg({ ...cfg, alertThreshold: Number(e.target.value) })} onBlur={() => save({ alertThreshold: cfg.alertThreshold })} />
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>unidades — produtos abaixo deste valor recebem alerta</span>
        </div>
      </div>

      <div style={sec}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={labelStyle}>Fornecedores</div>
          <button className="vt-btn-primary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setFornForm({ nome: '', cnpj: '', tel: '', email: '', idx: null })}>+ Adicionar</button>
        </div>
        {!(cfg.fornecedores || []).length && !fornForm && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhum fornecedor cadastrado.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(cfg.fornecedores || []).map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }} onClick={() => setFornForm({ ...f, idx: i })}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{f.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{[f.cnpj, f.tel, f.email].filter(Boolean).join('  ·  ') || 'Sem detalhes'}</div>
              </div>
              <VtIcon name="chevron" size={14} style={{ transform: 'rotate(-90deg)', color: 'var(--muted)' }} />
            </div>
          ))}
        </div>
        {fornForm && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--teal)', borderRadius: 10, padding: 16, marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Nome *</div><input className="vt-input" value={fornForm.nome} placeholder="Razão social ou nome fantasia" onChange={(e) => setFornForm({ ...fornForm, nome: e.target.value })} /></div>
              <div><div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>CNPJ</div><input className="vt-input" value={fornForm.cnpj} placeholder="00.000.000/0000-00" onChange={(e) => setFornForm({ ...fornForm, cnpj: e.target.value })} /></div>
              <div><div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Telefone / WhatsApp</div><input className="vt-input" value={fornForm.tel} placeholder="(11) 99999-9999" onChange={(e) => setFornForm({ ...fornForm, tel: e.target.value })} /></div>
              <div><div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>E-mail</div><input className="vt-input" value={fornForm.email} placeholder="contato@fornecedor.com" onChange={(e) => setFornForm({ ...fornForm, email: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="vt-btn-primary" onClick={saveForn}>Salvar</button>
              <button className="vt-btn-ghost" onClick={() => setFornForm(null)}>Cancelar</button>
              {fornForm.idx != null && <button className="vt-btn-ghost" onClick={() => deleteForn(fornForm.idx)} style={{ color: 'var(--red)', borderColor: 'var(--red)', marginLeft: 'auto' }}>Remover</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── FINANCEIRO CONFIG TAB ────────────────────────────────────────────────────
function FinanceiroConfigTab() {
  const [cfg, setCfg] = vtUseState(() => { const c = window.vtFinanceiroCfg(); return { ...window.VT_FINANCEIRO_CFG_DEFAULT, ...c, pagamentos: { ...window.VT_FINANCEIRO_CFG_DEFAULT.pagamentos, ...(c.pagamentos || {}) } }; });

  const save = (patch) => { const next = { ...cfg, ...patch }; setCfg(next); window.vtSaveFinanceiroCfg(next); window.vtToast('Configurações financeiras salvas.', 'ok'); };

  const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 };
  const sec = { marginBottom: 28 };

  const PAGS = [
    { key: 'dinheiro',      label: 'Dinheiro / Espécie',       icon: '💵' },
    { key: 'credito',       label: 'Cartão de crédito',         icon: '💳' },
    { key: 'debito',        label: 'Cartão de débito',          icon: '💳' },
    { key: 'pix',           label: 'PIX',                       icon: '📲' },
    { key: 'boleto',        label: 'Boleto bancário',           icon: '🧾' },
    { key: 'transferencia', label: 'Transferência bancária',    icon: '🏦' },
    { key: 'convenio',      label: 'Convênio / Plano de saúde', icon: '📋' },
  ];
  const PIX_TIPOS = [['celular','Celular'],['cpf','CPF'],['cnpj','CNPJ'],['email','E-mail'],['aleatoria','Chave aleatória']];

  return (
    <div>
      <div style={sec}>
        <div style={labelStyle}>Formas de pagamento aceitas</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PAGS.map(({ key, label, icon }) => (
            <div key={key}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', border: '1px solid ' + (cfg.pagamentos?.[key] ? 'var(--teal)' : 'var(--border)'), borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'border-color .15s' }}>
                <input type="checkbox" checked={!!(cfg.pagamentos?.[key])} style={{ accentColor: 'var(--teal)', width: 16, height: 16, flexShrink: 0 }} onChange={(e) => save({ pagamentos: { ...cfg.pagamentos, [key]: e.target.checked } })} />
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontWeight: 500, fontSize: 14, flex: 1 }}>{label}</span>
              </label>
              {key === 'credito' && cfg.pagamentos?.credito && (
                <div style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Parcelamento máximo:</span>
                    <select className="vt-input" value={cfg.creditoMaxParcelas} style={{ width: 90 }} onChange={(e) => save({ creditoMaxParcelas: Number(e.target.value) })}>
                      {[1,2,3,4,6,8,10,12].map((n) => <option key={n} value={n}>{n}x</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Quem absorve a taxa da operadora?</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {[['clinica','⬅ Clínica absorve (desconta do líquido)'],['cliente','➡ Cliente paga (acréscimo no valor cobrado)']].map(([id, lbl]) => (
                        <label key={id} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'8px 14px', borderRadius:8, border:'1px solid '+(cfg.creditoJurosPor===id?'var(--teal)':'var(--border)'), background:cfg.creditoJurosPor===id?'var(--teal-t)':'var(--card)', fontSize:13, fontWeight:cfg.creditoJurosPor===id?600:400 }} onClick={() => save({ creditoJurosPor: id })}>
                          <span style={{ width:14, height:14, borderRadius:'50%', border:'2px solid '+(cfg.creditoJurosPor===id?'var(--teal)':'var(--border)'), background:cfg.creditoJurosPor===id?'var(--teal)':'transparent', flexShrink:0 }} />
                          {lbl}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Taxa da operadora por número de parcelas (%)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                      {Array.from({ length: cfg.creditoMaxParcelas || 1 }, (_, i) => i + 1).map((n) => (
                        <label key={n} style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{n}× parcela{n>1?'s':''}</span>
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <input type="number" className="vt-input" min="0" max="20" step="0.01" style={{ width:70, fontSize:13 }}
                              value={(cfg.creditoTaxas || {})[n] ?? 0}
                              onChange={(e) => { const t = { ...(cfg.creditoTaxas||{}), [n]: Number(e.target.value) }; save({ creditoTaxas: t }); }} />
                            <span style={{ fontSize:12, color:'var(--muted)' }}>%</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Simulador de cálculo */}
                  <div style={{ background:'var(--teal-t)', borderRadius:8, padding:'10px 14px', fontSize:12.5 }}>
                    <b style={{ display:'block', marginBottom:6 }}>Simulação para R$ 100,00:</b>
                    {Array.from({ length: Math.min(3, cfg.creditoMaxParcelas || 1) }, (_, i) => i + 1).map((n) => {
                      const taxa = (cfg.creditoTaxas || {})[n] || 0;
                      const cli = cfg.creditoJurosPor === 'cliente';
                      const cobrado = cli ? (100 / (1 - taxa / 100)) : 100;
                      const liquido = cli ? 100 : (100 * (1 - taxa / 100));
                      return <div key={n} style={{ marginTop:3 }}>{n}×: cobrado <b>R$ {cobrado.toFixed(2)}</b> · taxa {taxa}% · líquido clínica <b>R$ {liquido.toFixed(2)}</b></div>;
                    })}
                  </div>
                </div>
              )}
              {key === 'pix' && cfg.pagamentos?.pix && (
                <div style={{ display: 'flex', gap: 10, marginTop: 6, paddingLeft: 20, flexWrap: 'wrap' }}>
                  <select className="vt-input" value={cfg.pixTipo} style={{ width: 160 }} onChange={(e) => save({ pixTipo: e.target.value })}>
                    {PIX_TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input className="vt-input" value={cfg.pixChave} placeholder="Chave PIX" style={{ flex: 1, maxWidth: 280 }} onChange={(e) => setCfg({ ...cfg, pixChave: e.target.value })} onBlur={() => save({ pixChave: cfg.pixChave })} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={sec}>
        <div style={labelStyle}>Fiscal e tributação</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Alíquota ISS (%)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" className="vt-input" value={cfg.iss} min={0} max={10} step={0.5} style={{ width: 90 }} onChange={(e) => setCfg({ ...cfg, iss: Number(e.target.value) })} onBlur={() => save({ iss: cfg.iss })} />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>%</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Prefixo NF (opcional)</div>
            <input className="vt-input" value={cfg.prefixoNF} placeholder="Ex: NF-" style={{ width: 120 }} onChange={(e) => setCfg({ ...cfg, prefixoNF: e.target.value })} onBlur={() => save({ prefixoNF: cfg.prefixoNF })} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Numeração inicial</div>
            <input type="number" className="vt-input" value={cfg.nfInicio} min={1} style={{ width: 110 }} onChange={(e) => setCfg({ ...cfg, nfInicio: Number(e.target.value) })} onBlur={() => save({ nfInicio: cfg.nfInicio })} />
          </div>
        </div>
      </div>

      <div style={sec}>
        <div style={labelStyle}>Regras de cobrança</div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Prazo de recebimento padrão</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[0,7,15,30,60].map((d) => <button key={d} className={cfg.prazoRecb === d ? 'vt-btn-primary' : 'vt-btn-ghost'} style={{ minWidth: 60 }} onClick={() => save({ prazoRecb: d })}>{d === 0 ? 'À vista' : d + ' dias'}</button>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Multa por atraso (% ao mês)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" className="vt-input" value={cfg.multaMes} min={0} max={10} step={0.5} style={{ width: 90 }} onChange={(e) => setCfg({ ...cfg, multaMes: Number(e.target.value) })} onBlur={() => save({ multaMes: cfg.multaMes })} />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>% a.m.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ClientesModule, AgendaModule, TratamentosModule, EstoqueModule, RelatoriosModule, ConfigModule });
