/* ============================================================
   VetTooth Pro — Prontuário Eletrônico (Módulo de Atendimento)
   Shell + cabeçalho + autosave + navegação por abas
   Abas: Resumo · Histórico (aqui) · demais em arquivos -exam / -plan
   ============================================================ */
const { useState: pUse, useRef: pRef, useEffect: pEff, useMemo: pMemo } = React;

/* ---------- Dados / catálogos compartilhados ---------- */
window.PR = (function () {
  const money = (n) => window.vtMoney(n);
  const parseMoney = (s) => Number(String(s || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  const todayBR = () => new Date().toLocaleDateString('pt-BR');
  const nowHM = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const consultModels = [
    { id: 'geral',  label: 'Clínica Geral',  icon: 'stethoscope', desc: 'Avaliação clínica integral e triagem do paciente' },
    { id: 'odonto', label: 'Odontologia',    icon: 'tooth',       desc: 'Avaliação periodontal, odontograma e protocolo dental' },
    { id: 'derma',  label: 'Dermatologia',   icon: 'receipt',     desc: 'Pele, pelos, anexos e protocolo de alergias' },
    { id: 'neuro',  label: 'Neurologia',     icon: 'spark',       desc: 'Exame neurológico, neurolocalização e diagnóstico' },
    { id: 'nutri',  label: 'Nutrição',       icon: 'chart',       desc: 'Avaliação nutricional, ECC, RER/DER e plano alimentar' },
    { id: 'orto',   label: 'Ortopedia',      icon: 'chart',       desc: 'Aparelho locomotor, testes ortopédicos e neurológicos' },
    { id: 'livre',  label: 'Modelo Livre',   icon: 'pen',         desc: 'Consulta personalizada sem estrutura pré-definida', color: '#64748b' },
  ];

  const anamnese = [
    { k: 'inicio', q: 'Início dos sintomas', type: 'quick', opts: ['Hoje', 'Há 2–3 dias', 'Há 1 semana', '+ de 1 mês'] },
    { k: 'evolucao', q: 'Tempo / evolução', type: 'quick', opts: ['Agudo', 'Progressivo', 'Crônico', 'Intermitente'] },
    { k: 'medicacoes', q: 'Medicamentos em uso', type: 'text' },
    { k: 'tratamentos', q: 'Tratamentos anteriores', type: 'text' },
    { k: 'cirurgias', q: 'Cirurgias anteriores', type: 'text' },
    { k: 'doencas', q: 'Doenças anteriores', type: 'text' },
    { k: 'alimentacao', q: 'Alimentação', type: 'quick', opts: ['Ração seca', 'Ração úmida', 'Natural', 'Mista', 'Pasto/feno'] },
    { k: 'hidrica', q: 'Ingestão hídrica', type: 'quick', opts: ['Normal', 'Aumentada', 'Reduzida'] },
    { k: 'urina', q: 'Urina', type: 'quick', opts: ['Normal', 'Aumentada', 'Reduzida', 'Com sangue'] },
    { k: 'fezes', q: 'Fezes', type: 'quick', opts: ['Normais', 'Diarreia', 'Ressecadas', 'Com sangue'] },
    { k: 'contato', q: 'Contato com outros animais', type: 'quick', opts: ['Sim', 'Não'] },
    { k: 'vacinacao', q: 'Vacinação', type: 'quick', opts: ['Em dia', 'Atrasada', 'Não vacinado'] },
    { k: 'vermifugacao', q: 'Vermifugação', type: 'quick', opts: ['Em dia', 'Atrasada', 'Nunca'] },
    { k: 'ectoparasita', q: 'Controle ectoparasitário', type: 'quick', opts: ['Em dia', 'Atrasado', 'Nenhum'] },
    { k: 'odonto', q: 'Histórico odontológico', type: 'text' },
    { k: 'reprodutivo', q: 'Histórico reprodutivo', type: 'text' },
    { k: 'obsTutor', q: 'Observações do tutor', type: 'text' },
  ];

  const examParams = [
    { k: 'temp', l: 'Temperatura', u: '°C', ph: '38,5' },
    { k: 'fc', l: 'Freq. cardíaca', u: 'bpm', ph: '90' },
    { k: 'fr', l: 'Freq. respiratória', u: 'mpm', ph: '24' },
    { k: 'peso', l: 'Peso', u: 'kg', ph: '0,0' },
    { k: 'ecc', l: 'Escore corporal (ECC)', u: '/9', ph: '5' },
    { k: 'mucosas', l: 'Mucosas', u: '', ph: 'Róseas' },
    { k: 'tpc', l: 'TPC', u: 's', ph: '< 2' },
    { k: 'hidratacao', l: 'Hidratação', u: '', ph: 'Normal' },
    { k: 'pulso', l: 'Pulso', u: '', ph: 'Forte' },
    { k: 'dor', l: 'Dor', u: '/10', ph: '0' },
    { k: 'mental', l: 'Estado mental', u: '', ph: 'Alerta' },
    { k: 'locomocao', l: 'Locomoção', u: '', ph: 'Normal' },
  ];

  const systems = [
    'Cardiovascular', 'Respiratório', 'Digestório', 'Urinário', 'Locomotor',
    'Neurológico', 'Tegumentar', 'Reprodutivo', 'Oftálmico', 'Auditivo', 'Oral',
  ];

  const odontoFlags = [
    'Placa', 'Cálculo', 'Gengivite', 'Periodontite', 'Mobilidade', 'Furca',
    'Fraturas', 'Ausências dentárias', 'Persistência decídua', 'Lesões',
    'Reabsorções', 'Maloclusões', 'Diastemas',
  ];

  const examCatalog = [
    { n: 'Hemograma completo', ic: 'receipt' }, { n: 'Perfil bioquímico', ic: 'receipt' },
    { n: 'Radiografia', ic: 'chart' }, { n: 'Ultrassonografia', ic: 'chart' },
    { n: 'Tomografia', ic: 'chart' }, { n: 'Ressonância magnética', ic: 'chart' },
    { n: 'Citologia', ic: 'receipt' }, { n: 'Histopatologia', ic: 'receipt' },
    { n: 'Urinálise', ic: 'receipt' }, { n: 'Radiografia odontológica', ic: 'tooth' },
  ];

  const medTemplates = [
    { nome: 'Meloxicam 0,2%', dose: '0,1 mg/kg', via: 'VO', freq: '1x ao dia', tempo: '5 dias' },
    { nome: 'Amoxicilina + Clav.', dose: '20 mg/kg', via: 'VO', freq: '12/12h', tempo: '10 dias' },
    { nome: 'Dipirona', dose: '25 mg/kg', via: 'VO', freq: '8/8h', tempo: '3 dias' },
    { nome: 'Gabapentina', dose: '10 mg/kg', via: 'VO', freq: '12/12h', tempo: 'Contínuo' },
    { nome: 'Clorexidina 0,12%', dose: 'Tópico', via: 'Tópica', freq: '12/12h', tempo: '14 dias' },
  ];

  const procCatalog = [
    { nome: 'Profilaxia odontológica', valor: 350, custo: 95, tempo: '90 min' },
    { nome: 'Exodontia simples', valor: 320, custo: 80, tempo: '45 min' },
    { nome: 'Exodontia cirúrgica', valor: 620, custo: 180, tempo: '120 min' },
    { nome: 'Tratamento periodontal', valor: 480, custo: 130, tempo: '90 min' },
    { nome: 'Sedação / anestesia', valor: 300, custo: 110, tempo: '60 min' },
    { nome: 'Sutura', valor: 180, custo: 45, tempo: '30 min' },
    { nome: 'Nivelamento odontológico (equino)', valor: 450, custo: 90, tempo: '60 min' },
  ];

  return { money, parseMoney, todayBR, nowHM, consultModels, anamnese, examParams, systems, odontoFlags, examCatalog, medTemplates, procCatalog };
})();

/* ---------- Esqueleto de um atendimento completo ---------- */
function prBlank(patient, base) {
  const D = window.VtData;
  return Object.assign({
    id: 'A' + Date.now().toString(36),
    patientId: patient.id,
    patientName: patient.name,
    status: 'em_andamento',
    date: window.PR.todayBR(),
    time: window.PR.nowHM(),
    type: 'Consulta – Clínica Geral',
    vet: 'M.V. ' + (window.vtCurrentVet ? window.vtCurrentVet() : 'Veterinário'),
    vetColor: (window.vtVets ? (window.vtVets()[0] || {}).color : null) || '#14a8a0',
    local: 'Clínica própria',
    motivo: '', queixa: '',
    alergias: '',
    comorbidades: [], medicacoesUso: '', vacinacao: '', vermifugacao: '',
    consultModel: (base && base.type && window.vtModelForType) ? window.vtModelForType(base && base.type) : 'geral',
    weight: patient.weight || '',
    isRetorno: false,
    anamnese: {}, exame: {}, exameObs: '', roteiro: {},
    sistemas: {}, odonto: { flags: {}, obs: '', plano: '', charts: [] },
    diag: { principal: '', secundarios: '', diferencial: '', suspeitas: '', obs: '' },
    tratamento: '', proximosPassos: '', obsInterna: '',
    retornoData: '', retornoHora: '', retornoTipo: '', retornoObs: '',
    rxNumero: '',
    exames: [], prescricoes: [], procedimentos: [],
    orcamento: { items: [], desconto: 0, taxa: 0, aprovado: false },
    anexos: [],
    agendamentos: [], retornos: [], documentos: [], medicamentos: [], cirurgias: [], internacoes: [], vendas: [],
    final: { vetSign: '', tutorSign: '', retorno: '', email: '', auditoria: false },
    value: '',
  }, base || {});
}

/* Garante que um atendimento legado (seed) tenha todos os campos */
function prEnsure(at, patient) {
  const odonto = Object.assign({ flags: {}, obs: '', plano: '', charts: [] }, at.odonto || {});
  // semeia um odontograma p/ atendimentos odontológicos sem registro
  if (!odonto.charts.length && /odont|profilax|exod/i.test(at.type || '')) {
    odonto.charts = [{ id: 'OG' + (at.id || ''), date: at.date || window.PR.todayBR(), vet: (at.vet || '').replace('M.V. ', '') || 'Equipe', summary: at.procedure || at.type || 'Odontograma' }];
  }
  return Object.assign(prBlank(patient), at, {
    anamnese: at.anamnese || {}, exame: at.exame || {}, sistemas: at.sistemas || {}, roteiro: at.roteiro || {},
    odonto: odonto,
    diag: at.diag || { principal: '', secundarios: '', diferencial: '', suspeitas: '', obs: '' },
    alergias: at.alergias || '',
    tratamento: at.tratamento || '', proximosPassos: at.proximosPassos || '', obsInterna: at.obsInterna || '',
    retornoData: at.retornoData || '', retornoHora: at.retornoHora || '', retornoTipo: at.retornoTipo || '', retornoObs: at.retornoObs || '',
    isRetorno: at.isRetorno || false,
    rxNumero: at.rxNumero || '',
    exames: at.exames || [], prescricoes: at.prescricoes || [], procedimentos: at.procedimentos || [],
    orcamento: at.orcamento || { items: [], desconto: 0, taxa: 0, aprovado: false },
    anexos: at.anexos || [], final: at.final || { vetSign: '', tutorSign: '', retorno: '', email: '', auditoria: false },
    agendamentos: at.agendamentos || [], retornos: at.retornos || [], documentos: at.documentos || [],
    medicamentos: at.medicamentos || [], cirurgias: at.cirurgias || [], internacoes: at.internacoes || [], vendas: at.vendas || [],
    status: at.status || 'finalizado',
  });
}

/* ---------- Cards de fluxo do atendimento ---------- */
const PR_FLOW_CARDS = [
  { id: 'consulta',       label: 'Consulta',               icon: 'stethoscope', color: '#2563eb', bg: '#dbeafe' },
  { id: 'odonto-flow',    label: 'Odontograma',            icon: 'tooth',       color: '#14a8a0', bg: '#e2f4f3', external: true },
  { id: 'procedimentos',  label: 'Procedimentos e Medic.', icon: 'syringe',     color: '#7c3aed', bg: '#ede9fe' },
  { id: 'exames',         label: 'Pedido de Exames',       icon: 'chart',       color: '#059669', bg: '#d1fae5' },
  { id: 'prescricao',     label: 'Receituários',           icon: 'receipt',     color: '#d97706', bg: '#fef3c7' },
  { id: 'orcamento',      label: 'Orçamentos',             icon: 'dollar',      color: '#ea580c', bg: '#ffedd5' },
  { id: 'cirurgias',      label: 'Cirurgias / Intern.',    icon: 'alert',       color: '#dc2626', bg: '#fee2e2' },
  { id: 'anestesia',      label: 'Ficha Anestésica',       icon: 'spark',       color: '#0f766e', bg: '#ccfbf1' },
  { id: 'atestados',      label: 'Termos e Docs',          icon: 'pen',         color: '#475569', bg: '#f1f5f9' },
  { id: 'anexos',         label: 'Anexos',                 icon: 'box',         color: '#64748b', bg: '#f8fafc' },
];

/* Sub-cards da tela de Procedimentos e Medicações */
const PR_PROC_SUBS = [
  { id: 'vacina',       label: 'Vacinar',           icon: 'syringe',     color: '#7c3aed', bg: '#ede9fe', desc: 'Registro e aplicação de vacinas' },
  { id: 'medicamentos', label: 'Medicar',            icon: 'box',         color: '#0891b2', bg: '#e0f2fe', desc: 'Aplicação de medicamentos' },
  { id: 'proc-outros',  label: 'Curativo / Outros',  icon: 'receipt',     color: '#6366f1', bg: '#eef2ff', desc: 'Curativos e outros procedimentos' },
];

/* Sub-cards da tela de Cirurgias e Internações */
const PR_CIR_SUBS = [
  { id: 'cirurgia',   label: 'Cirurgia',    icon: 'stethoscope', color: '#dc2626', bg: '#fee2e2', desc: 'Registro de procedimentos cirúrgicos' },
  { id: 'internacao', label: 'Internação',  icon: 'calendar',    color: '#b45309', bg: '#fef3c7', desc: 'Internações e hospitalização' },
];
const PR_TABS = [];

/* ---------- Cabeçalho ---------- */
function PrHeader({ at, patient, saving, onBack, onAction, go, tab }) {
  const p = patient;
  const alerts = [];
  if (p.allergies && p.allergies.length) alerts.push(['red', 'Alergia: ' + p.allergies.join(', ')]);
  if (p.diseases && p.diseases.length) alerts.push(['amber', 'Doença crônica: ' + p.diseases.join(', ')]);
  if (p.meds && p.meds.length) alerts.push(['teal', 'Uso contínuo: ' + p.meds.join(', ')]);
  if (p.risk && p.risk !== 'Baixo') alerts.push(['amber', 'Risco anestésico ' + p.risk.toLowerCase() + ' · ' + p.asa]);
  if (p.aggressive) alerts.push(['red', 'Paciente agressivo']);
  if (p.status === 'Óbito') alerts.push(['muted', 'Óbito registrado']);

  // PACOTE — chips de identificação rápida (espécie · raça · sexo) + pill de peso
  const idChips = [p.species, p.breed, p.sex + (p.neutered ? ' · castrado' : '')].filter(Boolean);
  const pesoAtual = at.weight || p.weight || '';

  const meta = [
    ['Espécie', p.species], ['Raça', p.breed], ['Sexo', p.sex + (p.neutered ? ' · castrado' : '')],
    ['Idade', ageFrom(p.birth)], ['Nascimento', p.birth || '—'], ['Peso atual', at.weight || p.weight || '—'],
    ['Tutor', p.owner], (p.property && p.property.name ? ['Propriedade', p.property.name] : ['Convênio', p.plan || '—']),
    ['Veterinário', at.vet.replace('M.V. ', '')], ['Data', at.date + ' · ' + at.time],
  ];
  const statusCls = at.status === 'finalizado' ? 'finalizado' : at.status === 'arquivado' ? 'arquivado' : 'andamento';
  const statusLbl = at.status === 'finalizado' ? 'Finalizado' : at.status === 'arquivado' ? 'Arquivado' : 'Em andamento';

  const QUICK = [
    ['salvar', 'Salvar', 'plus', 'primary'],
    ['imprimir', 'Imprimir', 'print', ''],
    ['pdf', 'Gerar PDF', 'receipt', ''], ['whats', 'WhatsApp', '', 'wa'],
  ];
  return (
    <div className="pr-head">
      <button className="pr-back" onClick={onBack}><VtIcon name="chevron" size={15} /> Atendimentos</button>
      <div className="pr-head-top">
        <PetAvatar p={p} lg />
        <div className="pr-id">
          <div className="pr-name">{p.name} <StatusPill status={p.status} /> {pesoAtual ? <span className="pr-wpill">{pesoAtual}</span> : null} <span className="pr-prot">Prontuário {p.id}</span></div>
          <div className="pr-idchips">{idChips.map((c, i) => <span key={i} className="pr-idchip">{c}</span>)}</div>
          <div className="pr-metarow">
            {meta.map(([l, v], i) => <span key={i} className="pr-meta"><i>{l}</i><b>{v || '—'}</b></span>)}
          </div>
        </div>
        <div className="pr-head-right">
          <span className={`pr-autosave${saving ? ' saving' : ''}`}><span className="dot" />{saving ? 'Salvando…' : 'Salvo automaticamente'}</span>
          <span className={`pr-status-pill ${statusCls}`}>{statusLbl}</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="pr-alerts">
          {alerts.map(([c, t], i) => <span key={i} className={`pr-alert ${c}`}>{t}</span>)}
        </div>
      )}

      <div className="pr-quick">
        {QUICK.map(([id, label, icon, cls]) => (
          <button key={id} className={`pr-qbtn ${cls}`} onClick={() => onAction(id)}>
            {id === 'whats' ? '💬' : <VtIcon name={icon} size={15} />} {label}
          </button>
        ))}
        <button className="pr-qbtn" style={{ background: 'linear-gradient(135deg,#6d28d9,#4f46e5)', color: '#fff', border: 'none' }}
          onClick={() => window.vtOpenIA && window.vtOpenIA(
            `Paciente: ${p.name} (${p.species}, ${p.breed}, ${p.sex}, ${at.weight || p.weight || '?'}kg). Motivo da consulta: ${at.motivo || 'não informado'}. Queixa: ${at.queixa || 'não informada'}. Diagnóstico: ${(at.diag && at.diag.principal) || 'em avaliação'}. Sugira plano terapêutico e orientações pós-procedimento.`,
            p.id
          )}>
          <VtIcon name="spark" size={15} /> VetIA
        </button>
      </div>
    </div>
  );
}

/* legado — mantido apenas para referência interna, não renderizado */
const PR_ACTIONBAR = [];

/* ---------- Aba Resumo ---------- */
function PrResumo({ at, patient, history, weights, go }) {
  const last = (cats) => history.find((h) => cats.includes(h.cat));
  const lastWeight = weights[0];
  const totalGasto = history.reduce((s, h) => s + window.PR.parseMoney(h.value), 0);
  const tiles = [
    ['Último atendimento', history[0] ? history[0].date : '—', history[0] ? history[0].title : 'Nenhum'],
    ['Último peso', lastWeight ? lastWeight.weight : (patient.weight || '—'), lastWeight ? 'ECC ' + lastWeight.score + '/9' : ''],
    ['Última vacina', (last(['Vacinas']) || {}).date || '—', (last(['Vacinas']) || {}).title || 'Sem registro'],
    ['Último exame', (last(['Exames']) || {}).date || '—', (last(['Exames']) || {}).title || 'Sem registro'],
    ['Último procedimento', (last(['Procedimentos']) || {}).date || '—', (last(['Procedimentos']) || {}).title || 'Sem registro'],
    ['Última cirurgia', (last(['Cirurgias']) || {}).date || '—', (last(['Cirurgias']) || {}).title || 'Sem registro'],
    ['Último orçamento', (last(['Financeiro']) || {}).date || '—', (last(['Financeiro']) || {}).value || '—'],
    ['Total gasto pelo tutor', window.PR.money(totalGasto), `${history.length} eventos`],
  ];
  return (
    <div>
      <div className="pr-sec-head"><div><h2 className="pr-h">Resumo do paciente</h2><p className="pr-h-sub">Visão geral consolidada do histórico clínico</p></div></div>
      <div className="pr-tiles pr-block">
        {tiles.map(([l, v, s], i) => (
          <div key={i} className="vt-card pr-tile"><span className="pr-tile-l">{l}</span><span className="pr-tile-v">{v}</span>{s ? <span className="pr-tile-s">{s}</span> : null}</div>
        ))}
      </div>
      <div className="pr-2col">
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">Alertas clínicos</h3>
          <div className="vt-clin-rows">
            <div className="vt-clin-row"><span>Doenças pré-existentes</span><Chips items={patient.diseases} empty="Nenhuma" tone="amber" /></div>
            <div className="vt-clin-row"><span>Alergias</span><Chips items={patient.allergies} empty="Nenhuma" tone="red" /></div>
            <div className="vt-clin-row"><span>Medicamentos contínuos</span><Chips items={patient.meds} empty="Nenhum" tone="teal" /></div>
            <div className="vt-clin-row"><span>Risco anestésico</span><span className="vt-tag amber">{patient.asa} · {patient.risk}</span></div>
          </div>
        </div>
        <div className="vt-stack">
          <div className="vt-card vt-sec pr-quickpanel">
            <h3 className="vt-sec-title">Ações rápidas</h3>
            <button className="pr-qp-btn primary" onClick={() => go('consulta')}><VtIcon name="stethoscope" size={16} /> Nova Consulta / Procedimento</button>
            <button className="pr-qp-btn" onClick={() => window.print()}><VtIcon name="receipt" size={16} /> Imprimir Prontuário</button>
            <button className="pr-qp-btn wa" onClick={() => {
              const num = patient.whats || patient.phone || '';
              const link = window.vtWaLink && window.vtWaLink(num, 'Olá! Sobre o atendimento de ' + patient.name + ' na clínica.');
              if (link) window.open(link, '_blank', 'noopener');
              else window.vtToast('Tutor sem número de WhatsApp cadastrado.', 'err');
            }}>💬 Enviar ao Tutor</button>
          </div>
          <div className="vt-card vt-sec pr-alertcard">
            <h3 className="vt-sec-title">Alertas</h3>
            {(patient.allergies && patient.allergies.length)
              ? <div className="pr-alertlist">{patient.allergies.map((a, i) => <span key={i} className="pr-alert red"><VtIcon name="alert" size={14} /> {a}</span>)}</div>
              : <p className="vt-ai-note" style={{ color: 'var(--muted)' }}>Nenhuma alergia registrada para {patient.name}.</p>}
            {patient.aggressive && <span className="pr-alert red" style={{ marginTop: 8 }}><VtIcon name="alert" size={14} /> Paciente agressivo</span>}
          </div>
          <div className="vt-card vt-sec">
            <h3 className="vt-sec-title">Próximo retorno</h3>
            <p className="vt-ai-note"><VtIcon name="calendar" size={15} /> {at.final && at.final.retorno ? `Retorno previsto para ${at.final.retorno}.` : 'Nenhum retorno agendado para este atendimento.'}</p>
            <button className="vt-btn-ghost" style={{ marginTop: 12 }} onClick={() => go('final')}><VtIcon name="calendar" size={15} /> Definir retorno</button>
          </div>
          <div className="vt-card vt-sec">
            <h3 className="vt-sec-title">Vacinas pendentes</h3>
            <div className="vt-clin-row" style={{ borderBottom: 'none', paddingTop: 0 }}><span>V10 / Antirrábica</span><span className="vt-tag teal">Em dia</span></div>
          </div>
          <div className="vt-card vt-sec">
            <h3 className="vt-sec-title">IA · assistente</h3>
            <p className="vt-ai-note"><VtIcon name="spark" size={15} /> Peso, alergias e risco anestésico de <b>{patient.name}</b> foram pré-carregados do histórico ao abrir este atendimento.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Aba Histórico ---------- */
const PR_HIST_CATS = ['Tudo', 'Consultas', 'Pesagens', 'Procedimentos', 'Exames', 'Vacinas', 'Internações', 'Cirurgias', 'Financeiro', 'Documentos'];
function PrHistorico({ history }) {
  const [cat, setCat] = pUse('Tudo');
  const [di, setDi] = pUse(''); const [df, setDf] = pUse('');
  const inRange = (d) => {
    const t = parseBR(d); if (!t) return true;
    if (di && t < parseBR(di)) return false;
    if (df && t > parseBR(df)) return false;
    return true;
  };
  const list = history.filter((e) => (cat === 'Tudo' || e.cat === cat) && inRange(e.date));
  return (
    <div>
      <div className="pr-sec-head"><div><h2 className="pr-h">Histórico clínico</h2><p className="pr-h-sub">Linha do tempo completa do paciente</p></div></div>
      <div className="vt-toolbar-row" style={{ flexWrap: 'wrap' }}>
        <label className="pr-field" style={{ flex: 'none' }}><span>De</span><VtField value={di} onChange={setDi} mask="date" placeholder="DD/MM/AAAA" width="150px" /></label>
        <label className="pr-field" style={{ flex: 'none' }}><span>Até</span><VtField value={df} onChange={setDf} mask="date" placeholder="DD/MM/AAAA" width="150px" /></label>
      </div>
      <div className="fc-hist-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
        {PR_HIST_CATS.map((c) => <button key={c} className={`pr-quickpick-btn${cat === c ? ' on' : ''}`} onClick={() => setCat(c)} style={prChipStyle(cat === c)}>{c}</button>)}
      </div>
      <div className="vt-card vt-sec">
        {list.length === 0 ? <p className="pr-empty">Nenhum evento neste filtro.</p> : (
          <div className="vt-at-timeline">
            {list.map((e, i) => (
              <div key={i} className="vt-at-item">
                <span className="vt-at-line"><span className="vt-at-bullet" style={{ background: e.color || '#14a8a0' }} /></span>
                <div className="vt-at-body">
                  <div className="vt-at-top"><span className="vt-at-type">{e.title}</span><span className="vt-at-date">{e.date}</span></div>
                  <div className="vt-at-proc">{e.desc}</div>
                  <div className="vt-at-meta">
                    <span className="vt-tag">{e.cat}</span>
                    {e.vet && <span style={{ color: e.color }}>● {e.vet}</span>}
                    {e.value && <span className="vt-at-val">{e.value}</span>}
                  </div>
                  {e.notes && <div className="vt-at-notes">{e.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function prChipStyle(on) {
  return { fontSize: 13, fontWeight: 700, padding: '7px 14px', borderRadius: 999,
    border: '1px solid ' + (on ? 'var(--teal)' : 'var(--line)'), background: on ? 'var(--teal)' : '#fff',
    color: on ? '#fff' : 'var(--muted)' };
}

/* ---------- Tela de Finalizar Atendimento ---------- */
const FIN_TIPO_COLOR ={ 'Consulta': '#2563eb', 'Procedimento': '#7c3aed', 'Medicamento': '#0891b2', 'Vacina': '#d97706', 'Cirurgia': '#dc2626', 'Internação': '#b45309', 'Exame': '#059669', 'Vacina aplicada': '#d97706' };

function buildChargeItems(at, vaccines) {
  const items = [];
  const consultVal = window.PR.parseMoney(at.value) || 0;
  items.push({ id: 'c0', tipo: 'Consulta', nome: at.type || 'Consulta', valor: consultVal, custo: 0 });
  (at.procedimentos || []).forEach((p, i) => {
    if (!p.nome) return;
    items.push({ id: 'p' + i, tipo: 'Procedimento', nome: p.nome, valor: Number(p.valor) || 0, custo: Number(p.custo) || 0 });
  });
  (at.medicamentos || []).forEach((m, i) => {
    if (!m.nome) return;
    const label = m.nome + (m.dose ? ' · ' + m.dose : '') + (m.via ? ' (' + m.via + ')' : '') + (m.qtd ? ' ×' + m.qtd : '');
    const qty = Number(m.qtd) || 1;
    items.push({ id: 'm' + i, tipo: 'Medicamento', nome: label, valor: (Number(m.valor) || 0) * qty, custo: (Number(m.custo) || 0) * qty });
  });
  (at.cirurgias || []).forEach((c, i) => {
    if (!c.procedimento) return;
    items.push({ id: 'cr' + i, tipo: 'Cirurgia', nome: c.procedimento + (c.anestesia ? ' · ' + c.anestesia : ''), valor: Number(c.valor) || 0, custo: Number(c.custo) || 0 });
  });
  (at.internacoes || []).forEach((n, i) => {
    const nome = (n.motivo || 'Internação') + (n.totalDias ? ' · ' + n.totalDias + ' dia(s)' : '');
    items.push({ id: 'in' + i, tipo: 'Internação', nome, valor: Number(n.valor) || 0, custo: Number(n.custo) || 0 });
  });
  (at.exames || []).forEach((e, i) => {
    const nome = typeof e === 'string' ? e : e.nome;
    if (!nome) return;
    items.push({ id: 'ex' + i, tipo: 'Exame', nome, valor: typeof e === 'object' ? (Number(e.valor) || 0) : 0, custo: 0 });
  });
  (vaccines || []).forEach((v, i) => {
    if (!v.tipo) return;
    const nome = (v.tipoCustom || v.tipo) + (v.lote ? ' · lote ' + v.lote : '');
    items.push({ id: 'vx' + i, tipo: 'Vacina aplicada', nome, valor: Number(v.valor) || 0, custo: Number(v.custo) || 0 });
  });
  return items;
}

function PrFinalizar({ at, patch, patient, vaccines, onFinalizar, onCommit }) {
  const money = window.PR.money;
  const [items, setItems] = pUse(() => buildChargeItems(at, vaccines));
  const [obs, setObs] = pUse('');
  const [sent, setSent] = pUse(false);

  const updItem = (id, val) => setItems((prev) => prev.map((x) => x.id === id ? { ...x, valor: parseFloat(String(val).replace(/[^\d,.]/, '').replace(',', '.')) || 0 } : x));
  const delItem = (id) => setItems((prev) => prev.filter((x) => x.id !== id));
  const addLine = () => setItems((prev) => [...prev, { id: 'ex' + Date.now(), tipo: 'Procedimento', nome: '', valor: 0, custo: 0 }]);
  const updNome = (id, v) => setItems((prev) => prev.map((x) => x.id === id ? { ...x, nome: v } : x));

  const total = items.reduce((s, i) => s + (Number(i.valor) || 0), 0);
  const custo = items.reduce((s, i) => s + (Number(i.custo) || 0), 0);
  const lucro = total - custo;

  const orcAprovado = at.orcamento && at.orcamento.aprovado && (at.orcamento.items || []).length > 0;
  const orcTotal = orcAprovado ? (at.orcamento.items || []).reduce((s, i) => s + (Number(i.valor) || 0) * (Number(i.qtd) || 1), 0) : 0;

  const confirmar = () => {
    if (total <= 0) { window.vtToast('Informe o valor de pelo menos um item antes de finalizar.', 'err'); return; }
    const info = { items, total, custo, lucro, obs, data: window.PR.todayBR() };
    const finalAt = { ...at, status: 'finalizado', value: money(total), fechamento: info };
    onCommit(finalAt);
    if (onFinalizar) onFinalizar(finalAt, info);
    setSent(true);
  };

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: 'var(--green)', marginBottom: 8 }}>Atendimento finalizado!</h2>
        <p className="vt-muted">{money(total)} enviado para Finanças › A Receber. Selecione a forma de pagamento e a data por lá ao dar entrada.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="pr-sec-head" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="pr-h">Finalizar Atendimento</h2>
          <p className="pr-h-sub">{patient.name} · {at.type || 'Consulta'} · {at.date}</p>
        </div>
      </div>

      {/* Itens do atendimento */}
      <div className="vt-card vt-sec" style={{ marginBottom: 16 }}>
        <h3 className="vt-sec-title" style={{ marginBottom: 12 }}>Serviços realizados</h3>
        <table className="pr-dtable">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Tipo</th>
              <th>Descrição</th>
              <th className="num" style={{ width: 130 }}>Valor (R$)</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11.5, fontWeight: 600, background: (FIN_TIPO_COLOR[item.tipo] || '#64748b') + '22', color: FIN_TIPO_COLOR[item.tipo] || '#64748b' }}>
                    {item.tipo}
                  </span>
                </td>
                <td><input value={item.nome} onChange={(e) => updNome(item.id, e.target.value)} placeholder="Descrição" style={{ width: '100%' }} /></td>
                <td>
                  <input className="num" value={item.valor || ''} onChange={(e) => updItem(item.id, e.target.value)} placeholder="0" style={{ fontWeight: 700 }} />
                </td>
                <td><button className="pr-del-btn" onClick={() => delItem(item.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="pr-addrow" style={{ marginTop: 10 }} onClick={addLine}><VtIcon name="plus" size={14} /> Adicionar item</button>
      </div>

      {/* Totais */}
      <div className="pr-2col" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">Resumo financeiro</h3>
          <div className="pr-totals">
            <div className="pr-total-row"><span>Total a cobrar</span><b style={{ fontSize: 20, color: 'var(--ink)' }}>{money(total)}</b></div>
            {custo > 0 && <><div className="pr-total-row"><span>Custo de insumos</span><b style={{ color: 'var(--red)' }}>{money(custo)}</b></div>
            <div className="pr-total-row profit"><span>Lucro estimado</span><b>{money(lucro)}</b></div></>}
          </div>
        </div>
        <div className="vt-card vt-sec">
          <h3 className="vt-sec-title">Observações</h3>
          <label className="pr-field">
            <span>Observações (opcional)</span>
            <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: desconto combinado, condição especial…" />
          </label>
          <p className="vt-muted" style={{ fontSize: 12.5, marginTop: 10 }}>A forma de pagamento e a data do recebimento são definidas em <b>Finanças › A Receber</b> ao dar entrada.</p>
        </div>
      </div>

      {/* Orçamento aprovado — aviso */}
      {orcAprovado && (
        <div className="vt-ai-note" style={{ marginBottom: 16, background: '#fef3c7', borderColor: '#fbbf24' }}>
          <VtIcon name="dollar" size={15} /> Orçamento aprovado de {money(orcTotal)} será enviado automaticamente para <b>Finanças › Orçamentos</b> ao confirmar.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="vt-btn-primary" style={{ background: 'var(--green)', fontSize: 15, padding: '10px 24px' }} onClick={confirmar}>
          <VtIcon name="check" size={17} /> Confirmar e enviar para Finanças
        </button>
        <span className="vt-muted" style={{ fontSize: 13 }}>O atendimento será finalizado e o valor enviado para Finanças › A Receber, pendente de pagamento.</span>
      </div>
    </div>
  );
}

/* ---------- Modal WhatsApp Templates ---------- */
function WaTemplatesModal({ at, patient, vaccines, onClose }) {
  const cfg = window.vtIntegCfg ? window.vtIntegCfg() : {};
  const fill = window.vtFillTemplate || ((t, v) => t);
  const vars = {
    tutor: patient.owner || '',
    paciente: patient.name || '',
    especie: patient.species || '',
    data: at.date || '',
    hora: at.time || '',
    vet: (at.vet || '').replace('M.V. ', ''),
    diag: (at.diag && at.diag.principal) || '',
    retorno: (at.final && at.final.retorno) || '',
    vacina: (vaccines && vaccines[0] && vaccines[0].tipo) || '',
  };
  const nextVac = vaccines && vaccines.find((v) => v.proxima);
  const templates = [
    { id: 'confirm', label: '📅 Confirmação de Consulta', body: cfg.waTplConfirm || 'Olá {tutor}! Confirmando a consulta de {paciente} em {data} às {hora}. Qualquer dúvida estamos à disposição. 🐾' },
    { id: 'pos', label: '✅ Pós-consulta / Resumo', body: cfg.waTplPos || 'Olá {tutor}! Obrigado pela visita de {paciente}. {diag ? "Diagnóstico: " + diag + ". " : ""}Qualquer dúvida não hesite em entrar em contato. 🐾' },
    { id: 'vac', label: '💉 Vacina — lembrete de retorno', body: nextVac ? 'Olá {tutor}! O retorno de {paciente} para a vacina {vacina} está previsto para ' + (nextVac.proxima || '{retorno}').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1') + '. Agende com antecedência! 🐾' : 'Olá {tutor}! Lembre-se de agendar a próxima vacina de {paciente}. 🐾' },
    { id: 'cir', label: '🩺 Pós-cirúrgico', body: 'Olá {tutor}! Passando para saber como {paciente} está se recuperando. Lembre-se dos cuidados: repouso, não molhar a incisão, e retorno em {retorno}. Qualquer sinal de alerta, entre em contato imediatamente. 🐾' },
  ];
  const [sel, setSel] = pUse(templates[0].id);
  const [msg, setMsg] = pUse(() => fill(templates[0].body, vars));
  const phone = patient.whats || patient.phone || '';
  const selectTpl = (tpl) => { setSel(tpl.id); setMsg(fill(tpl.body, vars)); };
  const send = () => {
    if (!phone) { window.vtToast('Tutor sem número cadastrado.', 'err'); return; }
    const link = window.vtWaLink ? window.vtWaLink(phone, msg) : ('https://wa.me/?text=' + encodeURIComponent(msg));
    window.open(link, '_blank', 'noopener');
    onClose();
  };
  return (
    <div className="vt-modal-overlay" onClick={onClose}>
      <div className="vt-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="vt-modal-head"><h3>💬 Mensagem ao Tutor via WhatsApp</h3><button className="vt-modal-x" onClick={onClose}>✕</button></div>
        <div style={{ padding: '0 20px 20px' }}>
          <p style={{ marginBottom: 12, color: 'var(--muted)', fontSize: 13 }}>Tutor: <b>{patient.owner || '—'}</b> · Fone: <b>{phone || 'não cadastrado'}</b></p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {templates.map((t) => (
              <button key={t.id} className={sel === t.id ? 'vt-btn-primary' : 'vt-btn-ghost'} style={{ fontSize: 12.5, padding: '5px 12px' }} onClick={() => selectTpl(t)}>{t.label}</button>
            ))}
          </div>
          <label className="pr-field" style={{ marginBottom: 14 }}>
            <span>Mensagem</span>
            <textarea rows={5} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 13, padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }} value={msg} onChange={(e) => setMsg(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="vt-btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="vt-btn-primary" style={{ background: '#25D366', borderColor: '#25D366' }} onClick={send}>Abrir WhatsApp</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Shell do prontuário ---------- */
function Prontuario({ patient, atendimento, weights, vaccines, onBack, onCommit, onAddWeight, onSaveVaccines, onFinalizar, onOpenOdonto }) {
  const [at, setAt] = pUse(() => prEnsure(atendimento, patient));
  const [tab, setTab] = pUse('resumo');
  const [procSub, setProcSub] = pUse(null); // sub-seleção dentro de Procedimentos
  const [cirSub, setCirSub] = pUse(null);   // sub-seleção dentro de Cirurgias/Internações
  const [pesoModal, setPesoModal] = pUse(false);
  const [odontoModal, setOdontoModal] = pUse(false);
  const [waModal, setWaModal] = pUse(false);
  const [saving, setSaving] = pUse(false);
  const first = pRef(true);
  const tabRef = pRef(null);

  // autosave (debounced)
  pEff(() => {
    if (first.current) { first.current = false; return; }
    setSaving(true);
    const t = setTimeout(() => { onCommit(at); setSaving(false); }, 650);
    return () => clearTimeout(t);
  }, [at]);

  const patch = (obj) => setAt((p) => ({ ...p, ...obj }));
  const group = (g) => (k, v) => setAt((p) => ({ ...p, [g]: { ...p[g], [k]: v } }));
  const go = (t) => { setTab(t); setProcSub(null); setCirSub(null); if (tabRef.current) tabRef.current.scrollTop = 0; };

  // histórico do paciente (eventos derivados)
  const history = pMemo(() => buildHistory(patient, weights), [patient.id, weights, at.id]);

  const action = (id) => {
    if (id === 'salvar') { onCommit(at); window.vtToast('Atendimento salvo.', 'ok'); }
    else if (id === 'imprimir') window.print();
    else if (id === 'pdf') window.vtToast('PDF do atendimento gerado.', 'ok');
    else if (id === 'whats') setWaModal(true);
    else if (id === 'finalizar') { go('final'); }
    else if (id === 'faturar') {
      const r = window.vtFaturarAtendimento(at, patient);
      if (!r.nReceitas && !r.baixados.length) { window.vtToast('Nada a faturar — registre procedimentos, vendas ou medicamentos.', 'err'); return; }
      onCommit({ ...at, faturado: true });
      window.vtToast(`Faturado: receita ${window.PR.money(r.receita)} · custo ${window.PR.money(r.custo)} · lucro ${window.PR.money(r.lucro)}${r.baixados.length ? ' · estoque baixado' : ''}.`, 'ok');
    }
  };

  // contadores p/ badges nos cards de fluxo
  const counts = {
    consulta: 0,
    'odonto-flow': 0,
    procedimentos: (vaccines || []).length + (at.medicamentos || []).length + (at.procedimentos || []).length,
    exames: (at.exames || []).length,
    prescricao: (at.prescricoes || []).length,
    orcamento: (at.orcamento && at.orcamento.items ? at.orcamento.items.length : 0),
    cirurgias: (at.cirurgias || []).length + (at.internacoes || []).length,
    atestados: (at.documentos || []).length,
    anexos: (at.anexos || []).length,
  };
  const doneTabs = {
    consulta: !!(at.motivo || at.queixa),
    exame: Object.values(at.exame || {}).some(Boolean) || !!at.exameObs,
    diag: !!(at.diag && at.diag.principal),
  };

  return (
    <div className="pr">
      <div className="pr-top">
        <PrHeader at={at} patient={patient} saving={saving} onBack={onBack} onAction={action} go={go} tab={tab} />
        {/* nav secundária: visão geral + histórico */}
        <div className="pr-secnav">
          <button className={`pr-secbtn${tab === 'resumo' ? ' on' : ''}`} onClick={() => go('resumo')}>Visão Geral</button>
          <button className={`pr-secbtn${tab === 'historico' ? ' on' : ''}`} onClick={() => go('historico')}>Histórico clínico</button>
        </div>
        {/* barra principal de fluxo do atendimento */}
        <div className="pr-flowbar">
          {PR_FLOW_CARDS.map(({ id, label, icon, color, bg, external }) => {
            const cnt = counts[id] || 0;
            const done = doneTabs[id];
            const handleClick = external
              ? () => { onCommit(at); if (onOpenOdonto) onOpenOdonto(); else window.vtToast('Odontograma disponível no menu lateral.', 'ok'); }
              : () => go(id);
            return (
              <button key={id} className={`pr-fcard${tab === id ? ' active' : ''}${external ? ' pr-fcard-ext' : ''}`}
                style={{ '--fc': color, '--fb': bg }} onClick={handleClick}>
                <span className="pr-fcard-ic"><VtIcon name={icon} size={20} /></span>
                <span className="pr-fcard-lbl">{label}</span>
                {cnt > 0 && <span className="pr-fcard-badge">{cnt}</span>}
                {!cnt && done && <span className="pr-fcard-ok" />}
                {external && <span className="pr-fcard-ext-badge">↗</span>}
              </button>
            );
          })}
          <button className={`pr-fcard pr-fcard-final${tab === 'final' ? ' active' : ''}`} onClick={() => go('final')}>
            <span className="pr-fcard-ic"><VtIcon name="check" size={20} /></span>
            <span className="pr-fcard-lbl">Finalizar Atendimento</span>
          </button>
        </div>
      </div>
      <div className="pr-body" ref={tabRef}>
        {tab === 'resumo' && <PrResumo at={at} patient={patient} history={history} weights={weights} go={go} />}
        {tab === 'historico' && <PrHistorico history={history} />}
        {tab === 'peso' && <PesoTab p={patient} weights={weights} onAdd={onAddWeight} onNew={() => setPesoModal(true)} />}
        {tab === 'consulta' && (
          <div className="pr-consulta-stack">
            <PrConsulta
              at={at} patch={patch} go={go} integrated
              setAnamnese={group('anamnese')}
              setExame={group('exame')}
              setSistemas={group('sistemas')}
              setDiag={group('diag')}
              patient={patient}
            />
          </div>
        )}
        {tab === 'procedimentos' && !procSub && (
          <div>
            <div className="pr-sec-head"><div><h2 className="pr-h">Procedimentos e Medicações</h2><p className="pr-h-sub">Selecione o tipo de procedimento realizado durante a consulta</p></div></div>
            <div className="pr-proc-subcards">
              {PR_PROC_SUBS.map(({ id, label, icon, color, bg, desc }) => (
                <button key={id} className="pr-proc-subcard" style={{ '--fc': color, '--fb': bg }} onClick={() => setProcSub(id)}>
                  <span className="pr-proc-subcard-ic"><VtIcon name={icon} size={28} /></span>
                  <span className="pr-proc-subcard-label">{label}</span>
                  <span className="pr-proc-subcard-desc">{desc}</span>
                  {id === 'vacina' && (vaccines || []).length > 0 && <span className="pr-fcard-badge">{(vaccines || []).length}</span>}
                  {id === 'medicamentos' && (at.medicamentos || []).length > 0 && <span className="pr-fcard-badge">{(at.medicamentos || []).length}</span>}
                  {id === 'proc-outros' && (at.procedimentos || []).length > 0 && <span className="pr-fcard-badge">{(at.procedimentos || []).length}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        {tab === 'procedimentos' && procSub && (
          <div>
            <button className="pr-proc-back" onClick={() => setProcSub(null)}>← Voltar para Procedimentos</button>
            {procSub === 'vacina'       && <VacinaTab p={patient} vaccines={vaccines || []} onSave={onSaveVaccines} vet={at.vet} />}
            {procSub === 'medicamentos' && <PrMedicamentos at={at} patch={patch} />}
            {procSub === 'proc-outros'  && <PrProcedimentos at={at} patch={patch} />}
          </div>
        )}
        {tab === 'prescricao' && <PrPrescricoes at={at} patch={patch} patient={patient} />}
        {tab === 'exames' && <PrExames at={at} patch={patch} patient={patient} />}
        {tab === 'agendamento' && <PrAgendamento at={at} patch={patch} />}
        {tab === 'retornos' && <PrRetornos at={at} patch={patch} />}
        {tab === 'anestesia' && (window.FichaAnestesica
          ? <window.FichaAnestesica atendimentoId={at.id} patientId={patient && patient.id} patient={patient} />
          : <p style={{padding:20,color:'var(--muted)'}}>Módulo de anestesia não carregado.</p>
        )}
        {tab === 'atestados' && <PrAtestados at={at} patch={patch} patient={patient} />}
        {tab === 'cirurgias' && !cirSub && (
          <div>
            <div className="pr-sec-head"><div><h2 className="pr-h">Cirurgias e Internações</h2><p className="pr-h-sub">Selecione o tipo de registro</p></div></div>
            <div className="pr-proc-subcards">
              {PR_CIR_SUBS.map(({ id, label, icon, color, bg, desc }) => {
                const cnt = id === 'cirurgia' ? (at.cirurgias || []).length : (at.internacoes || []).length;
                return (
                  <button key={id} className="pr-proc-subcard" style={{ '--fc': color, '--fb': bg }} onClick={() => setCirSub(id)}>
                    <span className="pr-proc-subcard-ic"><VtIcon name={icon} size={28} /></span>
                    <span className="pr-proc-subcard-label">{label}</span>
                    <span className="pr-proc-subcard-desc">{desc}</span>
                    {cnt > 0 && <span className="pr-fcard-badge">{cnt}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {tab === 'cirurgias' && cirSub && (
          <div>
            <button className="pr-proc-back" onClick={() => setCirSub(null)}>← Voltar para Cirurgias e Internações</button>
            {cirSub === 'cirurgia'   && <PrCirurgias at={at} patch={patch} />}
            {cirSub === 'internacao' && <PrInternacoes at={at} patch={patch} />}
          </div>
        )}
        {tab === 'internacoes' && <PrInternacoes at={at} patch={patch} />}
        {tab === 'anexos' && <PrAnexos at={at} patch={patch} />}
        {tab === 'orcamento' && <PrOrcamento at={at} patch={patch} patient={patient} />}
        {tab === 'vendas' && <PrVendas at={at} patch={patch} />}
        {tab === 'final' && <PrFinalizar key={'fin-' + (at.procedimentos||[]).length + '-' + (at.medicamentos||[]).length + '-' + (vaccines||[]).length} at={at} patch={patch} patient={patient} vaccines={vaccines} onFinalizar={onFinalizar} onCommit={onCommit} />}
      </div>
      {pesoModal && <PesoModal p={patient} scale={window.VtScores.scaleFor(patient.species)} onClose={() => setPesoModal(false)} onSave={(w) => { onAddWeight(w); setPesoModal(false); }} />}
      {waModal && <WaTemplatesModal at={at} patient={patient} vaccines={vaccines} onClose={() => setWaModal(false)} />}
    </div>
  );
}

/* Constrói eventos de histórico a partir dos atendimentos + pesagens do paciente */
function buildHistory(patient, weights) {
  const d = (window.VtStore && window.VtStore.getData()) || {};
  const ats = (d.atendimentos || []).filter((a) => a.patientId === patient.id);
  const catOf = (t) => {
    t = (t || '').toLowerCase();
    if (t.includes('cirurg')) return 'Cirurgias';
    if (t.includes('exod') || t.includes('extra')) return 'Cirurgias';
    if (t.includes('vacin')) return 'Vacinas';
    if (t.includes('exame') || t.includes('avali')) return 'Exames';
    if (t.includes('profilax') || t.includes('proced')) return 'Procedimentos';
    return 'Consultas';
  };
  const events = ats.map((a) => ({
    date: a.date, title: a.type, desc: a.procedure || a.type, vet: (a.vet || '').replace('M.V. ', ''),
    color: a.vetColor || '#14a8a0', value: a.value, notes: a.notes, cat: catOf(a.type),
  }));
  (weights || []).forEach((w) => events.push({
    date: w.date, title: 'Pesagem', desc: `${w.weight} · ECC ${w.score}/9`, cat: 'Pesagens', color: '#1fa971',
    notes: w.obs,
  }));
  return events.sort((a, b) => parseBR(b.date) - parseBR(a.date));
}

Object.assign(window, { Prontuario, prBlank, prEnsure, PR_TABS, buildHistory, prChipStyle });
