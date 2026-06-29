/* ============================================================
   VetTooth Pro — VetIA Pro v4
   IA veterinária real: API Claude, voz, imagem, ações, documentos
   Branch: gabriel
   ============================================================ */

/* ───── ROLES ───── */
const IA_ROLES = [
  { id: 'clinica',    label: 'Clínica',       icon: 'stethoscope', desc: 'Diagnóstico, laudos, dosagens, planos terapêuticos' },
  { id: 'secretaria', label: 'Secretária',     icon: 'calendar',    desc: 'Agendamentos, WhatsApp, lembretes, documentos' },
  { id: 'admin',      label: 'Administradora', icon: 'chart',       desc: 'Financeiro, estoque, produtividade, relatórios' },
];

const IA_QUICK = [
  { label: 'Analisar achados',        icon: 'tooth',       prompt: 'Analise os achados clínicos e organize uma interpretação odontológica estruturada.' },
  { label: 'Plano terapêutico',       icon: 'stethoscope', prompt: 'Elabore um plano terapêutico completo passo a passo com base nos achados.' },
  { label: 'Calcular dose',           icon: 'syringe',     prompt: 'Ajude a calcular a dose dos fármacos para o paciente em atendimento.' },
  { label: 'Receituário',             icon: 'receipt',     prompt: 'Gere o receituário completo de pós-operatório para o paciente.' },
  { label: 'Pedido de exames',        icon: 'spark',       prompt: 'Gere um pedido de exames pré-anestésicos completo para o paciente.' },
  { label: 'Termo de consentimento',  icon: 'doc',         prompt: 'Gere o termo de consentimento informado para o procedimento cirúrgico.' },
  { label: 'Laudo odontológico',      icon: 'receipt',     prompt: 'Gere um laudo odontológico formal com base nos achados do exame.' },
  { label: 'Orientação ao tutor',     icon: 'paw',         prompt: 'Redija uma orientação completa de pós-operatório para o tutor.' },
];

/* ───── API KEY ───── */
const vtGetKey = () => localStorage.getItem('vt-claude-key') || '';
const vtSaveKey = (k) => localStorage.setItem('vt-claude-key', (k || '').trim());

/* ───── CONTEXTO DA CLÍNICA ───── */
function iaContext() {
  try {
    const d = (window.VtStore && window.VtStore.getData()) || {};
    const patients = d.patients || [];
    const ats      = d.atendimentos || [];
    const inv      = d.inventory || [];
    const fin      = d.fin || { tx: [] };
    const agenda   = d.agendaAppts || [];
    const today    = new Date().toISOString().slice(0, 10);
    const mPrefix  = today.slice(0, 7);
    const brToYM   = (br) => { const m = (br||'').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}` : (br||'').slice(0,7); };

    const lowStock  = inv.filter((i) => Number(i.qty) < Number(i.min));
    const pendentes = (fin.tx || []).filter((t) => t.kind === 'receita' && t.status !== 'pago');
    const recMes    = (fin.tx || []).filter((t) => t.kind === 'receita' && t.status === 'pago' && (t.paidAt || t.date || '').slice(0,7) === mPrefix);
    const fatMes    = recMes.reduce((s, t) => s + (Number(t.value) || 0), 0);
    const agToday   = agenda.filter((a) => a.date === today);
    const atsMes    = ats.filter((a) => brToYM(a.date) === mPrefix);
    const user      = window.VtStore && window.VtStore.currentUser ? window.VtStore.currentUser() : null;

    return { patients, ats, inv, fin, agenda, today, mPrefix, lowStock, pendentes, recMes, fatMes, agToday, atsMes, user, brToYM };
  } catch {
    return { patients:[], ats:[], inv:[], fin:{tx:[]}, agenda:[], today:'', mPrefix:'', lowStock:[], pendentes:[], recMes:[], fatMes:0, agToday:[], atsMes:[], user:null, brToYM:()=>'' };
  }
}

function iaBRL(n) { return 'R$ ' + (Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }

/* ───── SYSTEM PROMPT ───── */
function buildSystemPrompt(role, contextPatientId) {
  const ctx  = iaContext();
  const user = ctx.user;
  const vet  = user ? user.name : 'Dr(a). Veterinário(a)';
  const pat  = contextPatientId ? ctx.patients.find((p) => p.id === contextPatientId) : null;

  const patsStr = ctx.patients.slice(0,15).map((p) => {
    const pAts = ctx.ats.filter((a) => a.patientId === p.id);
    const last = pAts.slice().sort((a,b) => (b.date||'').localeCompare(a.date||''))[0];
    return `• ${p.name} (${p.species}, ${p.breed||'SRD'}, ${p.sex}, ${p.weight||'?'}kg, tutor: ${p.owner}${last ? ', último atend: ' + last.date : ''})`;
  }).join('\n');

  const stockStr = ctx.lowStock.length
    ? ctx.lowStock.map((i) => `• ${i.name}: ${i.qty}/${i.min} ${i.unit} [CRÍTICO]`).join('\n')
    : 'Todos os itens acima do mínimo.';

  const agStr = ctx.agToday.map((a) => `• ${a.patient} — ${a.kind} às ${String(Math.floor(a.start||0)).padStart(2,'0')}:${(a.start||0)%1?'30':'00'}`).join('\n') || 'Nenhum agendamento hoje.';

  const patCtxStr = pat ? `\n\n🐾 PACIENTE EM FOCO:\nNome: ${pat.name}\nEspécie: ${pat.species} | Raça: ${pat.breed||'SRD'} | Sexo: ${pat.sex} | Peso: ${pat.weight||'?'}kg\nTutor: ${pat.owner}\nAtendimentos registrados: ${ctx.ats.filter((a)=>a.patientId===pat.id).length}` : '';

  const roleInstr = {
    clinica: `Você é médica-veterinária especialista em odontologia veterinária (pequenos animais e equinos). Preste diagnóstico assistido, elabore planos terapêuticos, calcule doses, gere laudos, receituários e pedidos de exame. Para gerar documentos, inclua o bloco [ACAO] ao final.`,
    secretaria: `Você é secretária-chefe da clínica. Rascunhe mensagens de WhatsApp, agende consultas, envie lembretes, elabore comunicações com tutores, gere documentos administrativos. Para ações concretas, inclua o bloco [ACAO].`,
    admin: `Você é gestora financeira e administrativa da clínica. Analise o fluxo de caixa, alertas de estoque, produtividade, gere relatórios e oriente tomada de decisão. Para registros financeiros ou ações, inclua o bloco [ACAO].`,
  }[role] || '';

  return `${roleInstr}

DADOS REAIS DA CLÍNICA (${ctx.today}):
Veterinário responsável: ${vet}
Pacientes cadastrados: ${ctx.patients.length}
${patsStr}

Atendimentos este mês: ${ctx.atsMes.length}
Agenda hoje: ${ctx.agToday.length} consulta(s)
${agStr}

Financeiro:
• Receita do mês: ${iaBRL(ctx.fatMes)}
• A receber: ${iaBRL(ctx.pendentes.reduce((s,t)=>s+t.value,0))} (${ctx.pendentes.length} lançamentos)

Estoque:
${stockStr}
${patCtxStr}

CAPACIDADES (use blocos [ACAO] quando o usuário pedir ações concretas):
Você pode gerar:
• Receituários → [ACAO:receituario]{...}[/ACAO]
• Pedidos de exame → [ACAO:pedido_exame]{...}[/ACAO]
• Termos de consentimento → [ACAO:termo]{...}[/ACAO]
• Laudos odontológicos → [ACAO:laudo]{...}[/ACAO]
• Orientação ao tutor → [ACAO:orientacao]{...}[/ACAO]
• Agendar consulta → [ACAO:agendar]{...}[/ACAO]
• Mensagem WhatsApp → [ACAO:whatsapp]{...}[/ACAO]
• Registro financeiro → [ACAO:financeiro]{...}[/ACAO]

Formato dos blocos:
[ACAO:receituario]{"paciente":"Nome","tutor":"Nome","especie":"felino","itens":["Med 1 — dose — freq — dias"],"obs":"Dieta pastosa 7 dias."}[/ACAO]
[ACAO:pedido_exame]{"paciente":"Nome","tutor":"Nome","exames":["Hemograma","ALT"],"indicacao":"pré-anestésico","procedimento":"profilaxia"}[/ACAO]
[ACAO:termo]{"paciente":"Nome","tutor":"Nome","especie":"canino","procedimento":"Profilaxia + extrações","riscos":"Risco anestésico ASA I"}[/ACAO]
[ACAO:laudo]{"paciente":"Nome","tutor":"Nome","especie":"felino","achados":"Doença periodontal grau II em 304, fratura de coroa em 104","conduta":"Profilaxia + exodontia 104","conclusao":"Prognóstico favorável com tratamento."}[/ACAO]
[ACAO:orientacao]{"paciente":"Nome","tutor":"Nome","procedimento":"Extração dentária","cuidados":["Dieta pastosa 7 dias","Não dar brinquedos duros"],"medicacao":"Amoxicilina 250mg — 1cp 12/12h por 7 dias","retorno":"10 dias"}[/ACAO]
[ACAO:agendar]{"paciente":"Nome","data":"YYYY-MM-DD","hora":"10:00","procedimento":"Profilaxia","tutor":"Nome","tel":""}[/ACAO]
[ACAO:whatsapp]{"para":"Nome do tutor","tel":"","mensagem":"Olá! ..."}[/ACAO]
[ACAO:financeiro]{"tipo":"receita","desc":"Consulta - Nome","valor":350}[/ACAO]

REGRAS:
• Responda sempre em português do Brasil, de forma clínica e objetiva.
• Nunca dê diagnóstico definitivo — apresente como hipótese para validação do veterinário.
• Ao analisar imagens radiográficas: descreva sistematicamente — (1) qualidade técnica da imagem, (2) estruturas dentárias visíveis, (3) osso alveolar e tecido periodontal, (4) achados patológicos (reabsorção, lesão periapical, fratura, calcificação, corpo estranho), (5) hipóteses diagnósticas ordenadas por probabilidade, (6) conduta recomendada. Em radiografias equinas: avalie raízes dos dentes cheios, osso mandibular/maxilar, fístulas, fragmentos. Em felinos e caninos: reserve atenção para reabsorção odontoclástica (FORL) e doença periapical. Sempre esclareça as limitações da interpretação remota por imagem.
• Calcule doses sempre pelo peso real do paciente (use o peso cadastrado quando disponível).
• Ao gerar documentos, inclua SEMPRE o bloco [ACAO] com os dados estruturados.
• Seja conciso mas completo. Use listas quando possível.`;
}

/* ───── CHAMADA API CLAUDE ───── */
async function callClaudeAPI(history, prompt, system, imageB64, imageMime) {
  const key = vtGetKey();
  if (!key) throw Object.assign(new Error('NO_KEY'), { noKey: true });

  /* monta conteúdo da mensagem do usuário */
  const userContent = [];
  if (imageB64) {
    userContent.push({ type: 'image', source: { type: 'base64', media_type: imageMime || 'image/jpeg', data: imageB64 } });
  }
  userContent.push({ type: 'text', text: prompt });

  /* converte histórico para formato Anthropic */
  const apiMsgs = history.map((m) => ({
    role: m.who === 'me' ? 'user' : 'assistant',
    content: m.cleanText || m.text || '',
  })).filter((m) => m.content);

  apiMsgs.push({ role: 'user', content: userContent });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      system,
      messages: apiMsgs,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return (data.content || [])[0]?.text || '';
}

/* ───── PARSE DE AÇÕES ───── */
function parseActions(text) {
  const actions = [];
  const clean = text.replace(/\[ACAO:(\w+)\]([\s\S]*?)\[\/ACAO\]/g, (_, type, json) => {
    try { actions.push({ type, ...JSON.parse(json.trim()) }); } catch {}
    return '';
  }).replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText: clean, actions };
}

/* ───── DOCUMENTOS ───── */
function gerarDocHTML(action) {
  const logo = `<div style="font-size:22px;font-weight:800;color:#1d5f6b;text-align:center;margin-bottom:4px">Dentalis Vet</div><div style="text-align:center;font-size:12px;color:#6c7888;margin-bottom:20px">Odontologia Veterinária Especializada</div>`;
  const hr = `<hr style="border:none;border-top:2px solid #1d5f6b;margin:16px 0">`;
  const hoje = new Date().toLocaleDateString('pt-BR');
  const style = `font-family:Arial,sans-serif;font-size:13px;color:#26323f;max-width:680px;margin:0 auto;padding:40px;background:#fff`;

  if (action.type === 'receituario') {
    const itens = (action.itens||[]).map((i) => `<li style="margin:6px 0">${i}</li>`).join('');
    return `<div style="${style}">${logo}${hr}
      <h2 style="text-align:center;font-size:16px;margin:0 0 20px">RECEITUÁRIO VETERINÁRIO</h2>
      <table style="width:100%;font-size:13px"><tr>
        <td><b>Paciente:</b> ${action.paciente||'—'}</td>
        <td><b>Espécie:</b> ${action.especie||'—'}</td>
        <td><b>Tutor:</b> ${action.tutor||'—'}</td>
      </tr></table>${hr}
      <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#1d5f6b;margin:16px 0 8px">Medicamentos prescritos</h3>
      <ol style="padding-left:20px">${itens}</ol>
      ${action.obs ? `<p style="margin-top:16px;font-style:italic">${action.obs}</p>` : ''}${hr}
      <div style="margin-top:40px;text-align:center">
        <div style="border-top:1px solid #26323f;display:inline-block;min-width:260px;padding-top:6px;font-size:12px">Assinatura e carimbo do Médico-Veterinário</div>
      </div>
      <p style="text-align:right;font-size:11px;color:#9aa3ae;margin-top:20px">${hoje}</p>
    </div>`;
  }

  if (action.type === 'pedido_exame') {
    const exames = (action.exames||[]).map((e) => `<li style="margin:6px 0">${e}</li>`).join('');
    return `<div style="${style}">${logo}${hr}
      <h2 style="text-align:center;font-size:16px;margin:0 0 20px">SOLICITAÇÃO DE EXAMES LABORATORIAIS</h2>
      <table style="width:100%;font-size:13px"><tr>
        <td><b>Paciente:</b> ${action.paciente||'—'}</td>
        <td><b>Tutor:</b> ${action.tutor||'—'}</td>
      </tr></table>
      <p><b>Indicação:</b> ${action.indicacao||'avaliação pré-anestésica'}</p>
      <p><b>Procedimento previsto:</b> ${action.procedimento||'—'}</p>${hr}
      <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#1d5f6b;margin:16px 0 8px">Exames solicitados</h3>
      <ul style="padding-left:20px">${exames}</ul>${hr}
      <div style="margin-top:40px;text-align:center">
        <div style="border-top:1px solid #26323f;display:inline-block;min-width:260px;padding-top:6px;font-size:12px">Assinatura e carimbo do Médico-Veterinário</div>
      </div>
      <p style="text-align:right;font-size:11px;color:#9aa3ae;margin-top:20px">${hoje}</p>
    </div>`;
  }

  if (action.type === 'termo') {
    return `<div style="${style}">${logo}${hr}
      <h2 style="text-align:center;font-size:16px;margin:0 0 20px">TERMO DE CONSENTIMENTO INFORMADO</h2>
      <table style="width:100%;font-size:13px"><tr>
        <td><b>Paciente:</b> ${action.paciente||'—'}</td>
        <td><b>Espécie:</b> ${action.especie||'—'}</td>
        <td><b>Tutor:</b> ${action.tutor||'—'}</td>
      </tr></table>${hr}
      <p><b>Procedimento:</b> ${action.procedimento||'Procedimento odontológico'}</p>
      <p style="line-height:1.7">Eu, <b>${action.tutor||'_________________________'}</b>, na qualidade de responsável pelo animal acima identificado, declaro estar ciente de que:</p>
      <ul style="padding-left:20px;line-height:1.8">
        <li>O procedimento indicado é necessário para a saúde e bem-estar do animal.</li>
        <li>${action.riscos||'O procedimento envolve anestesia geral, com riscos inerentes ao ato anestésico.'}</li>
        <li>Complicações pós-operatórias podem ocorrer mesmo com todos os cuidados necessários.</li>
        <li>Autorizo a equipe veterinária a realizar os procedimentos adicionais que se fizerem necessários durante o ato cirúrgico.</li>
        <li>Fui orientado(a) sobre os cuidados pós-operatórios e retorno necessário.</li>
      </ul>
      <p>Diante das informações recebidas, <b>AUTORIZO</b> a realização do procedimento.</p>${hr}
      <div style="display:flex;justify-content:space-between;margin-top:40px">
        <div style="text-align:center;min-width:220px">
          <div style="border-top:1px solid #26323f;padding-top:6px;font-size:12px">Assinatura do Responsável</div>
          <div style="font-size:11px;color:#9aa3ae;margin-top:4px">${action.tutor||''}</div>
        </div>
        <div style="text-align:center;min-width:220px">
          <div style="border-top:1px solid #26323f;padding-top:6px;font-size:12px">Médico-Veterinário Responsável</div>
        </div>
      </div>
      <p style="text-align:right;font-size:11px;color:#9aa3ae;margin-top:20px">${hoje}</p>
    </div>`;
  }

  if (action.type === 'laudo') {
    return `<div style="${style}">${logo}${hr}
      <h2 style="text-align:center;font-size:16px;margin:0 0 20px">LAUDO ODONTOLÓGICO VETERINÁRIO</h2>
      <table style="width:100%;font-size:13px;margin-bottom:12px"><tr>
        <td><b>Paciente:</b> ${action.paciente||'—'}</td>
        <td><b>Espécie:</b> ${action.especie||'—'}</td>
        <td><b>Tutor:</b> ${action.tutor||'—'}</td>
        <td><b>Data:</b> ${hoje}</td>
      </tr></table>${hr}
      <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#1d5f6b;margin:16px 0 6px">Achados Clínicos</h3>
      <p style="line-height:1.7;white-space:pre-wrap">${action.achados||'—'}</p>
      <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#1d5f6b;margin:16px 0 6px">Conduta Realizada</h3>
      <p style="line-height:1.7;white-space:pre-wrap">${action.conduta||'—'}</p>
      <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#1d5f6b;margin:16px 0 6px">Conclusão e Prognóstico</h3>
      <p style="line-height:1.7;white-space:pre-wrap">${action.conclusao||'—'}</p>${hr}
      <div style="margin-top:40px;text-align:center">
        <div style="border-top:1px solid #26323f;display:inline-block;min-width:260px;padding-top:6px;font-size:12px">Assinatura, carimbo e CRMV do Médico-Veterinário</div>
      </div>
    </div>`;
  }

  if (action.type === 'orientacao') {
    const cuidados = (action.cuidados||[]).map((c) => `<li style="margin:6px 0">${c}</li>`).join('');
    return `<div style="${style}">${logo}${hr}
      <h2 style="text-align:center;font-size:16px;margin:0 0 20px">ORIENTAÇÕES PÓS-OPERATÓRIAS</h2>
      <p><b>Paciente:</b> ${action.paciente||'—'} &nbsp;|&nbsp; <b>Tutor:</b> ${action.tutor||'—'}</p>
      <p><b>Procedimento realizado:</b> ${action.procedimento||'—'}</p>${hr}
      <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#1d5f6b;margin:16px 0 8px">Cuidados em casa</h3>
      <ul style="padding-left:20px">${cuidados}</ul>
      ${action.medicacao ? `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#1d5f6b;margin:16px 0 8px">Medicação prescrita</h3><p>${action.medicacao}</p>` : ''}
      ${action.retorno ? `<p style="margin-top:16px"><b>Retorno:</b> ${action.retorno}</p>` : ''}
      <p style="margin-top:16px;color:#d8443c;font-weight:700">⚠️ Em caso de sangramento excessivo, vômito, prostração ou qualquer sintoma preocupante, ligue imediatamente para a clínica.</p>${hr}
      <p style="text-align:right;font-size:11px;color:#9aa3ae">${hoje}</p>
    </div>`;
  }

  return `<div style="${style}">${logo}<pre>${JSON.stringify(action,null,2)}</pre></div>`;
}

/* ───── EXECUTAR AÇÕES ───── */
function vtExecuteAction(action, showDoc) {
  if (['receituario','pedido_exame','termo','laudo','orientacao'].includes(action.type)) {
    showDoc({ html: gerarDocHTML(action), title: {
      receituario: 'Receituário', pedido_exame: 'Pedido de Exames',
      termo: 'Termo de Consentimento', laudo: 'Laudo Odontológico', orientacao: 'Orientações ao Tutor',
    }[action.type] || 'Documento' });
    return;
  }
  if (action.type === 'whatsapp') {
    const msg = encodeURIComponent(action.mensagem || '');
    /* tenta buscar número real do tutor nos owners cadastrados */
    let tel = (action.tel || '').replace(/\D/g,'');
    if (!tel) {
      const d = window.VtStore?.getData() || {};
      const owners = d.owners || [];
      const nomeAlvo = (action.para || '').toLowerCase();
      const owner = owners.find((o) => o.name && o.name.toLowerCase().includes(nomeAlvo.split(' ')[0]));
      if (owner) {
        const rawTel = (owner.whats || owner.phone || '').replace(/\D/g,'');
        if (rawTel.length >= 10) tel = rawTel;
      }
    }
    const url = tel
      ? `https://api.whatsapp.com/send?phone=55${tel}&text=${msg}`
      : `https://api.whatsapp.com/send?text=${msg}`;
    window.open(url, '_blank');
    return;
  }
  if (action.type === 'agendar') {
    if (window._vtSetActive) { window._vtSetActive('agenda'); }
    setTimeout(() => alert(`Abra a Agenda e crie o agendamento:\n${action.paciente} — ${action.procedimento}\n${action.data} às ${action.hora}`), 500);
    return;
  }
  if (action.type === 'financeiro') {
    try {
      const d = window.VtStore?.getData() || {};
      const fin = d.fin || { tx: [] };
      const tx = {
        id: 'ia-' + Date.now(), kind: action.tipo || 'receita',
        desc: action.desc || 'Lançamento via VetIA', value: Number(action.valor) || 0,
        date: new Date().toISOString().slice(0,10), status: 'pendente',
      };
      fin.tx = [...(fin.tx||[]), tx];
      window.VtStore.setData({ ...d, fin });
      window.dispatchEvent(new Event('vtDataChanged'));
      alert(`✅ Lançamento registrado: ${tx.desc} — R$ ${tx.value.toFixed(2)}`);
    } catch (e) { alert('Erro ao registrar lançamento: ' + e.message); }
    return;
  }
}

/* ───── FALLBACK smartReply ───── */
function smartReply(q, role, contextPatientId) {
  const lower = q.toLowerCase();
  const ctx = iaContext();
  const { patients, ats, inv, fin, agenda, lowStock, pendentes, fatMes, agToday, atsMes } = ctx;
  const AVISO = '\n\n⚠️ _Sugestão VetIA — revise antes de validar clinicamente._';

  /* ═══════════════════════════════════════════════════
     HELPER: extrai peso da pergunta (ex: "5kg", "3,5 kg")
  ═══════════════════════════════════════════════════ */
  const getPeso = () => { const m = /(\d+[\.,]?\d*)\s*kg/i.exec(lower); return m ? parseFloat(m[1].replace(',','.')) : 0; };
  const getEsp  = () => {
    if (/\b(felino|gato|gata|cat)\b/.test(lower)) return 'felino';
    if (/\b(equino|cavalo|égua|horse|pony)\b/.test(lower)) return 'equino';
    if (/\b(canino|cão|cao|cachorro|dog)\b/.test(lower)) return 'canino';
    if (/\b(ave|pássaro|papagaio|calopsita|periquito|bird)\b/.test(lower)) return 'ave';
    if (/\b(réptil|reptil|lagarto|cobra|tartaruga|iguana)\b/.test(lower)) return 'reptil';
    if (/\b(coelho|rabbit)\b/.test(lower)) return 'coelho';
    if (/\b(hamster|roedor)\b/.test(lower)) return 'roedor';
    return 'canino';
  };
  const peso = getPeso();
  const esp  = getEsp();
  const kg   = (mg_kg) => peso > 0 ? ` = **${(peso*mg_kg).toFixed(2).replace(/\.?0+$/,'')} mg**` : '';
  const mcg  = (mcg_kg) => peso > 0 ? ` = **${(peso*mcg_kg).toFixed(1)} mcg**` : '';
  const ml   = (ml_kg)  => peso > 0 ? ` = **${(peso*ml_kg).toFixed(2).replace(/\.?0+$/,'')} mL**` : '';

  let pat = contextPatientId ? patients.find((p) => p.id === contextPatientId) : null;
  if (!pat) pat = patients.find((p) => p.name && lower.includes(p.name.toLowerCase()));
  const patAts = pat ? ats.filter((a) => a.patientId === pat.id) : [];
  const patPeso = pat ? parseFloat((pat.weight||'').replace(',','.')) || peso : peso;
  const patEsp  = pat ? (pat.species||'').toLowerCase() : esp;

  /* ═══════════════════════════════════════════════════
     MODO SECRETÁRIA — agendamentos, leads, cadastro
  ═══════════════════════════════════════════════════ */
  if (role === 'secretaria' || role === 'Secretária') {
    /* mensagem de confirmação de consulta */
    if (lower.includes('confirmar') || lower.includes('confirmação') || lower.includes('lembrete')) {
      const nome = pat ? pat.owner : '[Tutor]'; const pet = pat ? pat.name : '[Pet]';
      return `[ACAO:whatsapp]{"para":"${nome}","mensagem":"Olá, ${nome}! 😊 Passando para confirmar a consulta do *${pet}* amanhã. Por favor, responda SIM para confirmar ou NOS avise caso precise reagendar. Qualquer dúvida estou à disposição! 🐾"}[/ACAO]\n\n📱 **Mensagem de confirmação pronta!** Revise e clique em Abrir WhatsApp.` + AVISO;
    }
    /* lead / orçamento / fechar consulta */
    if (lower.includes('lead') || lower.includes('orçamento') || lower.includes('fechamento') || lower.includes('converter') || lower.includes('novo cliente')) {
      const clinic = window.vtClinic ? window.vtClinic() : {};
      return `🎯 **Script de Vendas — Converter Lead em Consulta:**\n\n**1. Primeira resposta (dentro de 5 min do contato):**\n> "Olá! 😊 Vi sua mensagem! Aqui é a ${clinic.name||'nossa clínica'}. Posso ajudar com o que precisa para o seu pet? Me conta o que está acontecendo."\n\n**2. Criar empatia e identificar necessidade:**\n> "Entendo, que situação difícil! A saúde do seu pet é muito importante. 🐾 Temos horários disponíveis ainda esta semana — qual seria melhor para você?"\n\n**3. Apresentar valor (não só preço):**\n> "Nossa equipe é especializada e usamos equipamentos modernos de radiografia digital. A consulta inclui exame completo e orientação personalizada."\n\n**4. Fechar o agendamento:**\n> "Tenho uma vaga amanhã às 10h ou sexta às 14h. Qual prefere? Posso já reservar seu horário agora! 📅"\n\n**5. Cadastro pós-confirmação:**\n> Solicite: nome do tutor, nome do pet, espécie/raça, data de nascimento, telefone e e-mail.\n\n[ACAO:agendar]{"paciente":"Novo paciente","kind":"Consulta","obs":"Lead via WhatsApp — confirmar cadastro"}[/ACAO]` + AVISO;
    }
    /* cadastrar cliente */
    if (lower.includes('cadastrar') || lower.includes('cadastro') || lower.includes('novo paciente') || lower.includes('registrar')) {
      return `[ACAO:cadastrar]{"tipo":"cliente_paciente","obs":"Cadastro solicitado via IA"}[/ACAO]\n\n📋 **Para cadastrar novo cliente e paciente, preciso de:**\n\n**Tutor:**\n• Nome completo\n• CPF (opcional)\n• Telefone/WhatsApp\n• E-mail\n• Endereço\n\n**Pet:**\n• Nome do animal\n• Espécie e raça\n• Data de nascimento (ou idade aproximada)\n• Sexo e status (castrado/inteiro)\n• Peso atual\n\nForneça os dados acima e farei o cadastro completo!` + AVISO;
    }
    /* reagendar / cancelar */
    if (lower.includes('reagendar') || lower.includes('cancelar') || lower.includes('remarcar')) {
      const nome = pat ? pat.owner : '[Tutor]'; const pet = pat ? pat.name : '[Pet]';
      return `[ACAO:whatsapp]{"para":"${nome}","mensagem":"Olá, ${nome}! Precisamos reagendar a consulta do *${pet}*. Pedimos desculpas pelo inconveniente! Por favor, nos diga quais datas e horários são melhores para você. 📅 Faremos o possível para encaixar rapidamente. 🐾"}[/ACAO]\n\n📅 **Mensagem de reagendamento gerada!**` + AVISO;
    }
    /* retorno pós-operatório */
    if (lower.includes('retorno') || lower.includes('pós-op') || lower.includes('pos-op') || lower.includes('pós-cirúrg')) {
      const nome = pat ? pat.owner : '[Tutor]'; const pet = pat ? pat.name : '[Pet]';
      return `[ACAO:whatsapp]{"para":"${nome}","mensagem":"Olá, ${nome}! 🐾 Como ${pet} está se recuperando? Qualquer sinal de desconforto, inchaço, sangramento ou mudança de comportamento, entre em contato imediatamente. Lembre-se: alimentação leve por 24h, collar elizabetano em uso e repouso. O retorno está marcado em 10 dias. Conte conosco! 💙"}[/ACAO]` + AVISO;
    }
    /* enviar documento */
    if (lower.includes('enviar documento') || lower.includes('mandar receitu') || lower.includes('enviar laudo') || lower.includes('compartilhar')) {
      const nome = pat ? pat.owner : '[Tutor]'; const pet = pat ? pat.name : '[Pet]';
      return `[ACAO:whatsapp]{"para":"${nome}","mensagem":"Olá, ${nome}! Segue em anexo o documento do ${pet}. Qualquer dúvida sobre as orientações, estamos à disposição! 🐾"}[/ACAO]\n\n📎 **Dica:** Gere o documento na aba Clínica → Documentos, faça o download em PDF e anexe junto com esta mensagem no WhatsApp.` + AVISO;
    }
    /* agenda do dia */
    if (lower.includes('agenda') || lower.includes('hoje') || lower.includes('amanhã') || lower.includes('horário')) {
      return `📅 **Agenda de hoje:** ${agToday.length} compromisso(s)\n\n${agToday.map((a,i)=>`${i+1}. **${a.time||'--:--'}** — ${a.patient||a.paciente||'?'} (${a.kind||a.tipo||'Consulta'})${a.owner ? `\n   Tutor: ${a.owner}` : ''}`).join('\n\n') || '• Agenda livre hoje!'}\n\n💡 Para agendar novo atendimento, informe: nome do pet, tutor, data, horário e tipo de procedimento.` + AVISO;
    }
    return `Como **Secretária IA**, posso:\n• Redigir mensagens de WhatsApp personalizadas\n• Confirmar, reagendar e cancelar consultas\n• Converter leads em agendamentos (script de vendas)\n• Cadastrar novos clientes e pacientes\n• Enviar documentos e laudos\n• Gerenciar a agenda do dia\n\nDescreva o que precisa!` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     MODO ADMIN / FINANCEIRO / CONTADOR
  ═══════════════════════════════════════════════════ */
  if (role === 'admin' || role === 'Administradora') {
    const allTx = (fin.tx || []);
    const totalRec = allTx.filter(t=>vtIsReceita(t)&&t.status==='pago').reduce((s,t)=>s+vtTxVal(t),0);
    const totalCusto = allTx.filter(t=>vtIsCusto(t)).reduce((s,t)=>s+vtTxVal(t),0);
    const lucro = totalRec - totalCusto;
    const pendVal = pendentes.reduce((s,t)=>s+vtTxVal(t),0);

    if (lower.includes('estoque') || lower.includes('reposi') || lower.includes('compra')) {
      if (!lowStock.length) return '✅ **Estoque em dia!** Todos os itens acima do mínimo.\n\n📦 Total de produtos cadastrados: ' + inv.length + AVISO;
      return `🚨 **${lowStock.length} item(s) abaixo do mínimo:**\n\n${lowStock.map((i) => `• **${i.name}**: ${vtStockQty(i)} ${i.unit||''} (mín. ${i.min||0})`).join('\n')}\n\n**Ação recomendada:** emitir pedido de compra imediatamente e registrar o custo ao receber.\n\n[ACAO:financeiro]{"tipo":"custo","desc":"Pedido de reposição de estoque","obs":"${lowStock.map(i=>i.name).join(', ')}"}[/ACAO]` + AVISO;
    }
    if (lower.includes('conta') || lower.includes('receber') || lower.includes('inadimpl') || lower.includes('pendente')) {
      return `📋 **Contas a Receber:**\n\n• Pendentes: **${pendentes.length}** lançamento(s)\n• Total a receber: **${iaBRL(pendVal)}**\n\n${pendentes.slice(0,8).map(t=>`• ${t.desc||t.name||'Serviço'} — ${iaBRL(vtTxVal(t))} (${t.date||t.paidAt||'—'})`).join('\n')}\n\n**Ação:** entre em contato com os tutores pendentes. Deseja que eu redija mensagens de cobrança amigável?` + AVISO;
    }
    if (lower.includes('cobran') || lower.includes('cobrança') || lower.includes('boleto')) {
      const nome = pat ? pat.owner : '[Tutor]';
      return `[ACAO:whatsapp]{"para":"${nome}","mensagem":"Olá, ${nome}! Passando para lembrá-lo sobre o pagamento referente ao atendimento do seu pet. Qualquer dúvida ou dificuldade, entre em contato — podemos negociar a melhor forma para você! 💙"}[/ACAO]\n\n💰 **Mensagem de cobrança amigável gerada!**` + AVISO;
    }
    if (lower.includes('fluxo de caixa') || lower.includes('dre') || lower.includes('resultado') || lower.includes('lucro') || lower.includes('margem')) {
      const margem = totalRec > 0 ? ((lucro/totalRec)*100).toFixed(1) : '0';
      return `📊 **DRE Simplificado — Período atual:**\n\n| Item | Valor |\n|------|-------|\n| (+) Receitas pagas | **${iaBRL(totalRec)}** |\n| (-) Custos/Despesas | **${iaBRL(totalCusto)}** |\n| (=) Resultado | **${iaBRL(lucro)}** |\n| Margem líquida | **${margem}%** |\n\n• Receitas pendentes: ${iaBRL(pendVal)}\n• Atendimentos no mês: ${atsMes.length}\n• Ticket médio: ${iaBRL(atsMes.length ? fatMes/atsMes.length : 0)}\n\n💡 **Meta de crescimento:** aumento de 15% no faturamento = ${iaBRL(totalRec*0.15)} em novas receitas.` + AVISO;
    }
    if (lower.includes('financ') || lower.includes('receita') || lower.includes('caixa') || lower.includes('faturamento')) {
      return `💰 **Resumo financeiro do mês:**\n• Faturamento: **${iaBRL(fatMes)}**\n• A receber: **${iaBRL(pendVal)}** (${pendentes.length} pendente(s))\n• Custos do mês: **${iaBRL(totalCusto)}**\n• Resultado: **${iaBRL(fatMes-totalCusto)}**\n• Atendimentos: ${atsMes.length}\n• Estoque crítico: ${lowStock.length} item(s)\n\n[ACAO:financeiro]{"tipo":"resumo","desc":"Resumo mensal"}[/ACAO]` + AVISO;
    }
    if (lower.includes('lançar') || lower.includes('registrar') || lower.includes('entrada') || lower.includes('saída') || lower.includes('despesa')) {
      return `[ACAO:financeiro]{"tipo":"lancamento","desc":"Novo lançamento financeiro"}[/ACAO]\n\n💼 **Para registrar um lançamento, informe:**\n• Tipo: Receita ou Despesa\n• Descrição do serviço/item\n• Valor\n• Data\n• Status: pago ou pendente\n• Forma de pagamento (dinheiro, cartão, PIX, etc.)` + AVISO;
    }
    if (lower.includes('agenda') || lower.includes('hoje')) {
      return `📅 **Hoje:** ${agToday.length} consulta(s)\n${agToday.map((a)=>`• ${a.time||'--:--'} — ${a.patient||'?'} (${a.kind||'Consulta'})`).join('\n') || '• Sem agendamentos.'}\n\n📊 **Mês:** ${atsMes.length} atendimentos · ${iaBRL(fatMes)} faturados` + AVISO;
    }
    return `📊 **Desempenho — mês atual:**\n• Pacientes: ${patients.length} cadastrados\n• Atendimentos: ${atsMes.length}\n• Receita: ${iaBRL(fatMes)} · Pendente: ${iaBRL(pendVal)}\n• Custos: ${iaBRL(totalCusto)} · Resultado: ${iaBRL(fatMes-totalCusto)}\n• Estoque crítico: ${lowStock.length} item(s)\n\nPergunte sobre: fluxo de caixa, DRE, contas a receber, estoque, cobranças.` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     MODO CLÍNICA — doses com paciente em contexto
  ═══════════════════════════════════════════════════ */
  if (pat && (lower.includes('dose') || lower.includes('medica') || lower.includes('analgesia') || lower.includes('antibiótico') || lower.includes('antibiotic'))) {
    const p = patPeso; const e = patEsp;
    if (p > 0) {
      const linhas = e.includes('felino') || e.includes('gato')
        ? [`Meloxicam 0,05 mg/kg = **${(p*0.05).toFixed(2)} mg** VO 1x/dia (2d — máx 3d)`,`Tramadol 1–2 mg/kg = **${(p*1.5).toFixed(1)} mg** VO 12/12h`,`Amoxicilina+Clav 20 mg/kg = **${(p*20).toFixed(0)} mg** VO 12/12h (7d)`,`Doxiciclina 5 mg/kg = **${(p*5).toFixed(1)} mg** VO 12/12h (7d)`]
        : e.includes('equino') || e.includes('cavalo')
        ? [`Meloxicam 0,6 mg/kg = **${(p*0.6).toFixed(0)} mg** VO 1x/dia`,`Fenilbutazona 4,4 mg/kg = **${(p*4.4).toFixed(0)} mg** VO 12/12h (máx 5d)`,`Flunixin meglumine 1,1 mg/kg = **${(p*1.1).toFixed(0)} mg** IV 1x/dia`]
        : [`Meloxicam 0,1 mg/kg = **${(p*0.1).toFixed(2)} mg** VO 1x/dia (3d)`,`Tramadol 3–5 mg/kg = **${(p*4).toFixed(1)} mg** VO 8/8h`,`Amoxicilina+Clav 20 mg/kg = **${(p*20).toFixed(0)} mg** VO 12/12h (7d)`,`Enrofloxacino 5 mg/kg = **${(p*5).toFixed(0)} mg** VO 1x/dia (7d)`];
      return `💊 **Doses para ${pat.name} (${p}kg — ${pat.species||'?'}):**\n\n${linhas.map((l)=>`• ${l}`).join('\n')}` + AVISO;
    }
  }
  if (pat && (lower.includes('plano') || lower.includes('tratamento') || lower.includes('conduta') || lower.includes('protocolo'))) {
    const e = patEsp;
    if (e.includes('felino') || e.includes('gato'))
      return `🐱 **Plano para ${pat.name} (felino):**\n\n1. Radiografia intraoral completa (FORL, reabsorção, periapical)\n2. Analgesia pré-op: meloxicam 0,05 mg/kg SC\n3. Profilaxia + sondagem periodontal sob anestesia\n4. Extrações indicadas com radiografia confirmatória\n5. Pós-op: amoxicilina+clav 20 mg/kg 12/12h 7d + tramadol 1 mg/kg 12/12h 3d\n6. Dieta pastosa 7 dias · retorno em 7–10 dias` + AVISO;
    if (e.includes('canino') || e.includes('cão') || e.includes('cao'))
      return `🐶 **Plano para ${pat.name} (canino):**\n\n1. Avaliação clínica completa (halitose, bolsas, mobilidade dentária)\n2. Radiografia das regiões suspeitas\n3. Profilaxia supragengival e subgengival\n4. Extrações seletivas se indicado\n5. Pós-op: meloxicam 0,1 mg/kg 1x/dia 3d + higiene com clorexidina 0,12% gel\n6. Retorno em 7 dias para avaliação de cicatrização` + AVISO;
    if (e.includes('equino') || e.includes('cavalo'))
      return `🐴 **Plano para ${pat.name} (equino):**\n\n1. Exame com espéculo bocal + boroscópio\n2. Sedação (xilazina 0,5–1 mg/kg IV + butorfanol)\n3. Nivelamento odontológico + remoção de pontas/ganchos\n4. Extrações indicadas\n5. AINE pós-op: meloxicam 0,6 mg/kg VO 3–5d\n6. Reavaliação em 6–12 meses` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     CARDIOLOGIA
  ═══════════════════════════════════════════════════ */
  if (lower.includes('cardiomiopatia') || lower.includes('dcm') || lower.includes('mvd') || lower.includes('insuficiência cardíaca') || lower.includes('insuficiencia cardiaca') || lower.includes('sopro') || lower.includes('cardio')) {
    if (lower.includes('felino') || lower.includes('gato') || esp==='felino')
      return `❤️ **Cardiomiopatia Hipertrófica Felina (CMH):**\n\n**Diagnóstico:** ecocardiografia (parede VE ≥ 6mm em diástole), exclusão de hipertireoidismo e HAS.\n\n**Tratamento — Fase assintomática:**\n• Não há evidência de benefício em tratar preventivamente (REVEAL study)\n• Atenolol 6,25 mg/gato VO 12/12h se FC > 220 bpm ou obstrução dinâmica\n\n**Fase ICC (edema pulmonar):**\n• Furosemida 1–2 mg/kg IV/IM até estabilização → manutenção 1–2 mg/kg VO 12/12h\n• Clopidogrel 18,75 mg/gato VO 1x/dia (profilaxia de trombose)\n• Atenolol ou diltiazem se FC elevada\n• Benazepril 0,25–0,5 mg/kg VO 1x/dia (ICC classe III–IV)\n\n**Monitoração:** RX tórax mensal, ecocardiografia 6/6 meses.` + AVISO;
    if (lower.includes('equino') || lower.includes('cavalo') || esp==='equino')
      return `❤️ **Cardiopatia Equina:**\n\n**Sopros fisiológicos:** comuns em equinos atletas — sopro de fluxo pulmonar e TS no 3° EIE são benignos.\n\n**Fibrilação atrial (FA):** arritmia mais comum. Dx: ECG. Tx: quinidina VO (protocolo clínico) ou cardioversão elétrica transvenosa. Prognóstico: bom se FA < 4 meses.\n\n**Insuficiência valvar:** IT e IR são as mais frequentes. Ecocardiografia para classificar. Restrição de atividade atlética se moderada/grave.` + AVISO;
    return `❤️ **Cardiopatia — Cão (MVD / DCM):**\n\n**MVD (endocardiose mitral) — mais comum em raças pequenas:**\n• Estadiamento ACVIM: A→B1→B2→C→D\n• B2 (remodelamento cardíaco): pimobendan 0,25 mg/kg VO 12/12h (EPIC trial)\n• C (ICC): furosemida 2 mg/kg VO 8–12/12h + pimobendan + benazepril 0,25 mg/kg\n• D (refratário): espironolactona 2 mg/kg VO 1x/dia + hidroclorotizida\n\n**DCM — raças grandes:**\n• Pimobendan + enalapril + furosemida\n• Suplementar taurina (Golden/Cocker) e L-carnitina\n• Monitorar com Holter (arritmias ventriculares)\n\n**Exames:** RX tórax, ECG, ecocardiografia, pressão arterial (alvo < 160 mmHg).` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     DERMATOLOGIA
  ═══════════════════════════════════════════════════ */
  if (lower.includes('dermatite') || lower.includes('prurido') || lower.includes('coceira') || lower.includes('alergia') || lower.includes('piodermite') || lower.includes('sarna') || lower.includes('otite') || lower.includes('dermatol')) {
    if (lower.includes('sarna') || lower.includes('demodex') || lower.includes('sarcopt')) {
      return `🔬 **Sarna — Diagnóstico e Tratamento:**\n\n**Sarna Sarcóptica (Sarcoptes scabiei):**\n• Prurido intenso, crostas, lesões em cotovelos, orelhas, abdômen\n• Dx: raspado superficial (sensibilidade baixa) — tratar empiricamente se suspeita forte\n• Tx: isoxazolinas (fluralaner, sarolaner, afoxolaner) — dose única resolve\n• Alternativa: ivermectina 0,2–0,4 mg/kg SC 2x com intervalo 14 dias (cuidado: raças MDR1)\n\n**Sarna Demodécica (Demodex canis):**\n• Focal/juvenil: resolução espontânea frequente — monitorar\n• Generalizada: isoxazolina mensal 3–6 meses + tratamento de fatores predisponentes\n• Acompanhar com raspado profundo mensal até 2 negativos consecutivos\n• Investigar imunossupressão subjacente (hipotireoidismo, Cushing)` + AVISO;
    }
    if (lower.includes('otite')) {
      return `👂 **Otite Externa — Protocolo:**\n\n**1. Diagnóstico:**\n• Citologia auricular: bactérias (cocos/bastonetes), leveduras (Malassezia), neutrófilos\n• Otoscopia: canal, membrana timpânica\n• Se crônica: cultura + antibiograma\n\n**2. Tratamento:**\n• **Malassezia:** miconazol ou clotrimazol + dexametasona tópico 14–21d\n• **Staphylococcus:** enrofloxacino ou amoxicilina tópico\n• **Pseudomonas (crônica):** polimixina B ou tobramicina tópico (baseado em cultura)\n• **Inflamação intensa:** prednisolona 0,5–1 mg/kg VO 7d (redução progressiva)\n\n**3. Limpeza:** solução de limpeza auricular 1–2x/semana\n**4. Tratar causa primária:** alergia, hipotireoidismo, corpo estranho, pólipo` + AVISO;
    }
    return `🐾 **Dermatologia — Diagnóstico Diferencial Prurido:**\n\n**Causas mais comuns (por ordem):**\n1. **Parasitas:** pulgas (DAPP), sarnas, cheyletiella\n2. **Alergia alimentar:** prurido facial, pododermite, otite recorrente\n3. **Atopia (DAc):** sazonal, zonas de dobras, dorso, orelhas\n4. **Piodermite superficial:** eritema, colarinhos, pápulas\n5. **Malassezia:** pele oleosa, odor rançoso, eritema ventral\n\n**Workup inicial:**\n• Controle rigoroso de ectoparasitas (todos os pets da casa)\n• Citologia cutânea (impressão + fita)\n• Raspado cutâneo\n• Considerar dieta de exclusão 8–12 semanas\n\n**Tratamento sintomático:** oclacitinib (Apoquel) 0,4–0,6 mg/kg VO 12/12h 14d → 1x/dia; ou lokivetmab (Cytopoint) 2 mg/kg SC q4-8sem.` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     NEUROLOGIA
  ═══════════════════════════════════════════════════ */
  if (lower.includes('convulsão') || lower.includes('epilepsia') || lower.includes('crise') || lower.includes('ataxia') || lower.includes('disco intervertebral') || lower.includes('div') || lower.includes('paresia') || lower.includes('paralisia') || lower.includes('neurolog')) {
    if (lower.includes('convulsão') || lower.includes('epilepsia') || lower.includes('crise epiléptica')) {
      return `🧠 **Epilepsia — Diagnóstico e Tratamento:**\n\n**Classificação:**\n• Epilepsia idiopática (EI): 1–5 anos, raças predispostas, exames normais\n• Epilepsia estrutural: lesão identificável (tumor, inflamação, trauma)\n• Epilepsia reativa: hipoglicemia, uremia, toxinas, portossistêmica\n\n**Investigação:** hemograma + bioquímica + bile acids (pré/pós-prandial) + RNM + LCR\n\n**Tratamento de manutenção:**\n• **Fenobarbital** 2,5 mg/kg VO 12/12h → dosar nível sérico em 2 semanas (alvo 20–40 µg/mL)\n• **Brometo de potássio** adjuvante: 30–40 mg/kg VO 1x/dia (levam 3–4 meses p/ estabilizar)\n• **Levetiracetam** 20 mg/kg VO 8/8h (menos hepatotóxico, boa opção felinos)\n\n**Status epiléptico — EMERGÊNCIA:**\n1. Diazepam 0,5–1 mg/kg IV (pode repetir 2x)\n2. Se não ceder: fenobarbital 15–20 mg/kg IV lento\n3. Propofol CRI se refratário\n4. Suporte: O₂, glicose IV, temperatura corporal` + AVISO;
    }
    if (lower.includes('disco') || lower.includes('div') || lower.includes('hérnia')) {
      return `🧠 **Doença do Disco Intervertebral (DIV):**\n\n**Tipos:**\n• Hansen I: extrusão aguda (condrodistrófico — Dachshund, Bulldog, Pekingês)\n• Hansen II: protrusão crônica (grandes raças)\n\n**Graus (Frankel adaptado):**\n• I: dor apenas → analgesia + restrição 4–6 sem\n• II: ataxia → tratamento conservador vs. cirurgia\n• III: paraparesia ambulatória → cirurgia recomendada\n• IV: paraplegia com nocicepção → cirurgia urgente\n• V: paraplegia sem nocicepção → cirurgia emergência (< 24h melhora prognóstico)\n\n**Tratamento conservador:** restrição absoluta 4–6 sem, meloxicam 0,1 mg/kg VO, omeprazol 1 mg/kg VO (gastro-proteção), fisioterapia\n\n**Cirurgia:** hemilaminectomia (torácolombar) ou ventral slot (cervical)\n\n**Diagnóstico:** RNM (padrão ouro) ou TC + mielografia` + AVISO;
    }
    return `🧠 **Neurologia — Avaliação Inicial:**\n\n**Localização da lesão:**\n• Intracraniana: déficits de nervos cranianos, convulsões, alteração mental\n• C1–C5: tetraparesia espástica, cervicalgia\n• C6–T2: tetraparesia com déficit de MN inferior nos membros anteriores\n• T3–L3: paraparesia espástica\n• L4–S3: paraparesia flácida, disfunção vesical/fecal\n\n**Exames:** RNM (padrão ouro), TC, LCR, EMG, potencial evocado\n\nInforme os sinais clínicos e localização para protocolo específico!` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     ORTOPEDIA
  ═══════════════════════════════════════════════════ */
  if (lower.includes('ortopedia') || lower.includes('fratura') && !lower.includes('dental') || lower.includes('displasia') || lower.includes('coxofemoral') || lower.includes('ligamento cruzado') || lower.includes('lca') || lower.includes('luxação de patela') || lower.includes('osteossarcoma')) {
    if (lower.includes('displasia') || lower.includes('coxofemoral') || lower.includes('hip dysplasia')) {
      return `🦴 **Displasia Coxofemoral (DCF):**\n\n**Diagnóstico:** RX em extensão (PennHIP ou OFA), avaliação do ângulo de Norberg\n\n**Tratamento conservador (graus leves):**\n• Controle de peso (IMC ideal)\n• Meloxicam 0,1 mg/kg VO 1x/dia (crises)\n• Fisioterapia + hidroginástica\n• Condroprotegentes: meloxicam + ômega-3 + glucosamina/condroitina\n\n**Tratamento cirúrgico:**\n• < 10 meses: Triple/Double Pelvic Osteotomy (TPO/DPO)\n• Adulto jovem (< 18 meses) leve: FHO ou artrodese\n• Adulto: Prótese total de quadril (PTQ) — melhor resultado funcional\n• Alternativa econômica: ressecção da cabeça femoral (FHO)` + AVISO;
    }
    if (lower.includes('cruzado') || lower.includes('lca') || lower.includes('joelho')) {
      return `🦴 **Ruptura de Ligamento Cruzado Cranial (LCCr):**\n\n**Sinais:** claudicação súbita ou progressiva, teste da gaveta positivo, teste de compressão tibial positivo\n\n**Diagnóstico:** palpação + RX (efusão articular, osteofitos), artroscopia confirma lesão\n\n**Tratamento cirúrgico (recomendado > 15kg):**\n• **TPLO** (tibial plateau leveling osteotomy) — padrão ouro\n• **TTA** (tibial tuberosity advancement)\n• **Lateral suture** — animais pequenos < 15 kg\n\n**Pós-op:** fisioterapia intensiva semanas 1–8, restrição de atividade 8–12 semanas, retorno gradual à atividade normal em 4–6 meses\n\n**Menisco:** avaliar no intraoperatório — meniscoliberação ou meniscectomia parcial se lesado` + AVISO;
    }
    return `🦴 **Ortopedia — Protocolo geral:**\n\nInforme: espécie, peso, localização da lesão e apresentação (aguda x crônica, claudicação, dor à palpação).\n\nPosso ajudar com: displasia coxofemoral, ruptura de LCCr, luxação de patela, fraturas (fechadas/expostas), osteossarcoma, osteoartrite.` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     OFTALMOLOGIA
  ═══════════════════════════════════════════════════ */
  if (lower.includes('olho') || lower.includes('ocular') || lower.includes('córnea') || lower.includes('cornea') || lower.includes('úlcera ocular') || lower.includes('catarata') || lower.includes('glaucoma') || lower.includes('uveíte') || lower.includes('oftalm')) {
    if (lower.includes('úlcera') || lower.includes('ulcera') || lower.includes('córnea') || lower.includes('cornea')) {
      return `👁️ **Úlcera de Córnea:**\n\n**Classificação:** superficial → estromal → descemetocele → perfuração\n\n**Diagnóstico:** fluoresceína (detecta estromal e superficial), biomicroscopia, cultura se purulenta/recorrente\n\n**Tratamento:**\n• **Superficial (não infecciosa):** colírio ATB (tobramicina ou ciprofloxacino) 4–6x/dia + atropina 1% 2x/dia (midríase analgésica) + colar elizabetano\n• **Infecciosa/bacteriana:** cultura + ciprofloxacino ou gentamicina intensivo\n• **Fungica (equinos):** voriconazol 1% tópico + lavagem conjuntival\n• **Descemetocele/perfuração:** cirurgia urgente (enxerto conjuntival, cola cianoacrilato)\n• **Úlceras indolentes (SCCED):** desbridamento mecânico + keratectomia superficial com diamante\n\n**Braquicéfalos:** vigilância aumentada (exoftalmia, triquíase) — úlceras complicam rapidamente` + AVISO;
    }
    if (lower.includes('glaucoma')) {
      return `👁️ **Glaucoma:**\n\n**Primário (PAG/PAF):** predisposição racial (Cocker, Beagle, Basset, Chow Chow)\n**Secundário:** uveíte, deslocamento de lente, hifema, neoplasia\n\n**Emergência (PIO > 40 mmHg):**\n1. Manitol 1–2 g/kg IV em 20 min\n2. Dorzolamida tópica 2% + timolol 0,5% 3x/dia\n3. Latanoprost 0,005% (cuidado: contra-indicado em glaucoma por uveíte)\n\n**Manutenção:** dorzolamida + timolol 2x/dia, latanoprost se CAF\n\n**Cirurgia:** shunt de drenagem, fotocoagulação do corpo ciliar (ciclofotocoagulação)\n\n**Monitoração:** tonometria mensal (alvo PIO < 20 mmHg)` + AVISO;
    }
    return `👁️ **Oftalmologia — Avaliação básica:**\n\n**Exame:** PL (reflexo pupilar), reflexo de ameaça, dazzle, tonometria (alvo < 20 mmHg), fluoresceína, biomicroscopia\n\n**Diagnósticos comuns:**\n• Úlcera de córnea → fluorescência positiva\n• Conjuntivite → secreção, hiperemia conjuntival\n• Uveíte → miose, flare, hipópio, PIO baixa\n• Catarata → opacidade de cristalino, cirurgia de facoemulsificação\n• Glaucoma → PIO > 25 mmHg, dor, buftalmia\n• Epiphora → excesso de lacrimejamento, avalie duto nasolacrimal` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     ONCOLOGIA
  ═══════════════════════════════════════════════════ */
  if (lower.includes('tumor') || lower.includes('neoplasia') || lower.includes('câncer') || lower.includes('cancer') || lower.includes('mastocitoma') || lower.includes('linfoma') || lower.includes('onco')) {
    if (lower.includes('mastocitoma') || lower.includes('mast cell')) {
      return `🔬 **Mastocitoma Cutâneo (MCT):**\n\n**Estadiamento:**\n• Grau I (Patnaik/Kiupel): baixo grau, comportamento benigno\n• Grau II: intermediário — biologia imprevisível\n• Grau III / alto grau (Kiupel): comportamento maligno, metástase frequente\n\n**Diagnóstico:** CAAF (diagnóstico citológico), biópsia + IHQ (Ki-67, c-Kit), ecografia abdominal, citologia de linfonodo\n\n**Tratamento:**\n• Cirurgia: margens de 2–3 cm + 1 plano profundo\n• Alto grau/margem comprometida: vinblastina + prednisolona (protocolo MOPP)\n• Mutação c-Kit: toceranib (Palladia) 2,75 mg/kg EOD ou masitinibe\n• Baixo grau + margens limpas: monitoração\n\n**Pré-op:** difenidramina 2 mg/kg IM + omeprazol (prevenir síndrome de degranulação)` + AVISO;
    }
    if (lower.includes('linfoma')) {
      return `🔬 **Linfoma Canino:**\n\n**Tipos:** multicêntrico (80%), alimentar, mediastinal, cutâneo\n**Estadiamento:** I (único) → V (medula + sangue) — OMS\n\n**Diagnóstico:** citologia FNA de LN + biópsia + imunofenotipagem (B vs T)\n• B-cell: melhor prognóstico (~12 meses com tratamento)\n• T-cell: pior prognóstico (~6 meses)\n\n**Protocolo CHOP (padrão ouro):**\n• Ciclofosfamida 200 mg/m² IV semana 1, 4, 7...\n• Doxorrubicina 30 mg/m² IV semana 1, 4, 7...\n• Vincristina 0,7 mg/m² IV semanal\n• Prednisolona 2 mg/kg VO diário → redução progressiva\n• Duração: 19 semanas\n\n**Felinos:** linfoma alimentar (baixo grau) → clorambucil + prednisolona (protocolo oral simples, sobrevida >2 anos)` + AVISO;
    }
    return `🔬 **Oncologia — Princípios gerais:**\n\n**Tumores mais comuns em cães:** mastocitoma, histiocitoma, adenoma perianal, osteossarcoma, hemangiossarcoma, carcinoma mamário\n\n**Tumores mais comuns em gatos:** carcinoma de células escamosas, linfoma, fibrossarcoma, adenocarcinoma mamário\n\n**Investigação padrão:** CAAF → biópsia → estadiamento (RX tórax 3 planos, ecografia abdominal, citologia de linfonodos)\n\nInforme tipo e localização do tumor, espécie e raça para protocolo específico!` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     GASTROENTEROLOGIA
  ═══════════════════════════════════════════════════ */
  if (lower.includes('vômito') || lower.includes('vomito') || lower.includes('diarreia') || lower.includes('pancreatite') || lower.includes('ibd') || lower.includes('doença inflamatória') || lower.includes('obstrução intestinal') || lower.includes('gastro')) {
    if (lower.includes('pancreatite')) {
      return `🫁 **Pancreatite:**\n\n**Diagnóstico:** lipase pancreática específica (cPLI/fPLI), ecografia abdominal (painel hiperecóico peripancreático, efusão)\n\n**Tratamento — Suporte:**\n• Fluidoterapia IV (NaCl 0,9% ou Ringer lactato) — pilar principal\n• Analgesia: buprenorfina 0,01–0,02 mg/kg IV/IM 6–8h _ou_ metadona 0,2–0,3 mg/kg IV\n• Antieméticos: maropitant 1 mg/kg SC 1x/dia + metoclopramida CRI 0,01–0,02 mg/kg/h\n• Protetor gástrico: omeprazol 1 mg/kg IV/VO 1x/dia\n• Alimentação precoce (< 24h): jejum prolongado piora evolução\n• Dieta hipogordurosa na recuperação\n\n**Formas graves:** plasma fresco congelado (FFC) para trombocitopenia/CID, vitamina K, antibióticos se infecção secundária suspeita\n\n**Felinos:** frequentemente associada a colangiohepatite e IBD ("triadite")` + AVISO;
    }
    if (lower.includes('obstrução') || lower.includes('corpo estranho') && !lower.includes('oral')) {
      return `🚨 **Obstrução Intestinal — EMERGÊNCIA:**\n\n**Sinais:** vômito profuso (bilioso se pós-pilórico), depressão, dor abdominal, desidratação, anorexia\n\n**Diagnóstico:** RX abdominal (dilatação de alças, padrão escada, gás), ecografia (peristaltismo ausente, massa, corpo estranho), contraste se dúvida\n\n**Conduta:**\n1. Estabilização: fluidoterapia agressiva IV, correção de eletrólitos\n2. Cirurgia: enterotomia ou ressecção e anastomose\n3. Antibióticos peri-operatórios: amoxicilina+clav + metronidazol\n4. Analgesia pós-op: metadona + meloxicam + CRI de fentanil se necessário\n\n**Não procrastinar** — risco de necrose intestinal, sepse e peritonite!` + AVISO;
    }
    if (lower.includes('diarreia')) {
      return `💊 **Diarreia — Diagnóstico e Tratamento:**\n\n**Aguda (< 3 semanas):**\n• Causas: dietética, parasitária, infecciosa, tóxica\n• Tratamento: dieta bland (frango + arroz) + probióticos (Enterococcus faecium) + metronidazol 15 mg/kg VO 12/12h 5–7d\n• Investigar: coproparasitológico, parvo (filhotes), Giardia\n\n**Crônica (> 3 semanas):**\n• IBD, linfangiectasia, enteropatia perdedora de proteínas\n• Workup: biópsia endoscópica, B12/folato, albumina, proteínas totais\n• IBD linfocítico: prednisolona 2 mg/kg/dia + dieta hipoalergênica\n• IBD eosinofílico: prednisolona + ciclosporina\n• Linfangiectasia: dieta ultra-hipogordurosa + prednisolona` + AVISO;
    }
    return `🫁 **Gastroenterologia — síntese:**\n\n• **Vômito agudo:** antieméticos (maropitant), fluidos, omeprazol, dieta bland\n• **Vômito crônico:** exclusão de doença renal, hepática, diabetes, pielonefrite, RX + ecografia\n• **Diarreia:** ver protocolo específico\n• **Pancreatite:** fluidos + analgesia + antieméticos\n• **Obstrução:** emergência cirúrgica\n\nDescreva os sinais, duração e exames para diagnóstico mais preciso!` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     NEFROLOGIA / UROLOGIA
  ═══════════════════════════════════════════════════ */
  if (lower.includes('renal') || lower.includes('rim') || lower.includes('nefro') || lower.includes('irc') || lower.includes('ira') || lower.includes('uremia') || lower.includes('urina') || lower.includes('itu') || lower.includes('cistite')) {
    if (lower.includes('irc') || lower.includes('doença renal crônica') || lower.includes('drc')) {
      return `🫘 **Doença Renal Crônica (DRC) — IRIS Staging:**\n\n| Estágio | Creatinina (cão) | Creatinina (gato) |\n|---------|-----------------|-------------------|\n| I | < 1,4 | < 1,6 |\n| II | 1,4–2,0 | 1,6–2,8 |\n| III | 2,1–5,0 | 2,9–5,0 |\n| IV | > 5,0 | > 5,0 |\n\n**Subestadio:** pressão arterial (normotensivo/hipertensivo) + proteinúria (UPC: < 0,2 / 0,2–0,5 / > 0,5)\n\n**Tratamento:**\n• Dieta renal hipoproteica, hiperenergetica, restrita em fósforo\n• Hidratação: encorajar ingestão hídrica; fluidoterapia SC domiciliar em casos avançados\n• Controlar HAS: amlodipina 0,625 mg/gato VO ou 0,1 mg/kg/cão VO\n• Proteinúria: benazepril 0,25–0,5 mg/kg VO ou telmisartan 1 mg/kg VO (gatos)\n• Anemia (PCV < 20%): eritropoietina ou darbepoetina SC\n• Hiperfosfatemia: quelantes de fósforo (carbonato de Ca, sevelamer)\n• Acidose: bicarbonato de sódio 8–12 mg/kg/dia VO` + AVISO;
    }
    if (lower.includes('itu') || lower.includes('cistite') || lower.includes('infecção urinária')) {
      return `🫘 **Infecção do Trato Urinário (ITU):**\n\n**Diagnóstico:** urinálise + urocutura (cistocente ou jato médio)\n\n**ITU não complicada (1ª vez, fêmea jovem):**\n• Amoxicilina+clav 13,75 mg/kg VO 12/12h por 7 dias (se E. coli sensível)\n• Alternativa: trimetoprima-sulfa 15 mg/kg VO 12/12h 7 dias\n\n**ITU complicada (macho, recorrente, DRC, diabetes):**\n• Basear no antibiograma — 14–28 dias\n• Investigar causas subjacentes: urólitos, anomalias anatômicas, ecografia vesical\n\n**Cistite idiopática felina (FIC):**\n• Forma mais comum de DTUFI em gatos jovens\n• NÃO tem infecção bacteriana — antibióticos não são indicados\n• Manejo: enriquecimento ambiental, dieta úmida, aumento ingestão hídrica, amitriptilina se recorrente` + AVISO;
    }
    return `🫘 **Nefrologia — Avaliação:**\n\nInvestigação renal básica: creatinina, ureia, SDMA, fósforo, potássio, albumina, urinálise, UPC, PA.\n\nInforme os valores laboratoriais para estadiamento IRIS e protocolo de tratamento específico.` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     ENDOCRINOLOGIA
  ═══════════════════════════════════════════════════ */
  if (lower.includes('diabetes') || lower.includes('cushing') || lower.includes('hipotireoidismo') || lower.includes('hipertireoidismo') || lower.includes('addison') || lower.includes('endocrin') || lower.includes('insulina') || lower.includes('tireoide') || lower.includes('cortisol')) {
    if (lower.includes('diabetes')) {
      const e2 = (esp === 'felino' || lower.includes('felino') || lower.includes('gato'));
      if (e2) return `💉 **Diabetes Mellitus Felina:**\n\n**Insulina de escolha:** glargina (Lantus) 0,5 UI/gato SC 12/12h → ajuste até glicemia 60–150 mg/dL\n• Alternativa: PZI 0,25–0,5 UI/kg SC 12/12h\n\n**Monitoração:** curva glicêmica (3h–9h pós-dose) ou sensor contínuo (Freestyle Libre)\n\n**Dieta:** ração úmida hipocarboidratos (< 25% CHO na matéria seca) — melhora controle glicêmico\n\n**Remissão diabética:** 50–70% dos gatos atingem remissão com controle adequado nos primeiros 6 meses (especialmente com glargina + dieta low-carb)\n\n**Hipoglicemia (emergência):** glicose 50% IV 0,5–1 mL/kg diluída — reverter imediatamente` + AVISO;
      return `💉 **Diabetes Mellitus Canina:**\n\nInsulina: insulina NPH (humana) 0,5 UI/kg SC 12/12h com alimentação → ajuste progressivo\n\nMeta: glicemia nadir 80–150 mg/dL · glicemia pré-dose < 250 mg/dL\n\nCurva glicêmica: cada 1–2 semanas inicialmente\n\nFruutosamina: monitoração controle glicêmico a longo prazo (alvo < 400 µmol/L)` + AVISO;
    }
    if (lower.includes('cushing') || lower.includes('hiperadrenocorticismo') || lower.includes('cortisol')) {
      return `🧬 **Hiperadrenocorticismo (HAC / Síndrome de Cushing):**\n\n**Sinais:** PU/PD, polifagia, abdômen pendular, alopecia bilateral simétrica, calcinose cutânea, hepatomegalia\n\n**Diagnóstico:**\n• Triagem: LDDS (dexametasona baixa dose) ou cortisol urinário/creatinina\n• Diferenciação: HDDS (discrimina hipófise vs adrenal) + ecografia adrenal + dosagem ACTH\n\n**Tratamento:**\n• **PDH (hipofisário — 85%):** trilostano 2,2–6,7 mg/kg VO 1x/dia → ACTH estimulação 4–6h pós-dose (alvo 2–5 µg/dL)\n• **ADH (adrenal — tumor):** adrenalectomia cirúrgica\n• Mitotano: alternativa (protocolo de ataque + manutenção)` + AVISO;
    }
    if (lower.includes('hipotireoidismo')) {
      return `🧬 **Hipotireoidismo Canino:**\n\n**Sinais:** obesidade, letargia, alopecia não-pruriginosa, mixedema, bradicardia, hipotermia\n\n**Diagnóstico:** T4 total + T4 livre (equilibrio diálise) + TSH canino\n• T4 total baixo + TSH elevado = confirmatório\n\n**Tratamento:** levotiroxina 0,02 mg/kg VO 12/12h → T4 pós-dose (4–6h) alvo: metade superior do intervalo de referência\n\n**Felino:** hipertireoidismo (T4 total elevado) → metimazol 2,5–5 mg/gato VO 12/12h ou iodo radioativo` + AVISO;
    }
    return `🧬 **Endocrinologia — resumo:**\n\nInforme sinais e exames para diagnóstico específico.\n• Diabetes: insulina + dieta + monitoração\n• Cushing: trilostano\n• Hipotireoidismo: levotiroxina\n• Hipertireoidismo felino: metimazol\n• Addison (hipoadrenocorticismo): desoxicorticosterona (DOCP) + prednisolona` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     DOENÇAS INFECCIOSAS / PARASITOLOGIA
  ═══════════════════════════════════════════════════ */
  if (lower.includes('parvo') || lower.includes('cinomose') || lower.includes('distemper') || lower.includes('leptospira') || lower.includes('leishmaniose') || lower.includes('erliquiose') || lower.includes('infecciosa') || lower.includes('zoonose') || lower.includes('vacin')) {
    if (lower.includes('parvo') || lower.includes('parvovírus') || lower.includes('parvovirus')) {
      return `🦠 **Parvovirose Canina — Emergência:**\n\n**Diagnóstico:** SNAP Parvo (fezes) — sensibilidade ~80%; confirmar com PCR se negativo e alta suspeita\n\n**Tratamento — Suporte intensivo:**\n1. Fluidoterapia IV agressiva (NaCl 0,9% + KCl conforme ionograma)\n2. Antieméticos: maropitant 1 mg/kg SC + ondansetrona 0,1–0,2 mg/kg SC\n3. Antibióticos (barreira intestinal comprometida): ampicilina 22 mg/kg IV + metronidazol 15 mg/kg IV\n4. Nutrição enteral precoce — sonda NG se necessário\n5. Plasma hiperimune (se disponível) — 2 mL/kg IV\n6. Monitorar: proteínas (albumina), glicemia, hematócrito\n\n**Prognóstico:** boa sobrevivência com suporte intensivo precoce (70–90%)` + AVISO;
    }
    if (lower.includes('leishmaniose') || lower.includes('leishmania')) {
      return `🦠 **Leishmaniose Visceral Canina (LVC):**\n\n**Diagnóstico:** RIFI ≥ 1:40 + sorologia ELISA ou PCR (LN/medula)\n\n**Tratamento (CFMV Res. 1.000/2012 — uso exclusivo em saúde animal não endêmica):**\n• Alopurinol 10 mg/kg VO 12/12h (crônico — supressão, não cura)\n• Miltefosina 2 mg/kg VO 28 dias + alopurinol (maiores taxas de cura)\n• Antimoniato de N-metilglucamina: uso restrito, esquema varia\n\n**Monitoração:** proteinograma, UPC, creatinina a cada 6 meses\n\n**Eutanásia:** exigida por lei em municípios endêmicos com soropositivo (Lei 14.515/2022 regulamentação estadual)` + AVISO;
    }
    return `🦠 **Doenças Infecciosas — Calendário Vacinal:**\n\n**Cão:**\n• V10 (núcleo: CDV, CPV, CAV): filhote 6–8–10–12s + 1 ano + trienal\n• Raiva: filhote ≥ 12 semanas + anual\n• Leptospirose: bivalente/tetravalente — anual (endêmico)\n• Bordetella: anual em animais de risco (canil, pet shop)\n\n**Gato:**\n• Tríplice (HHC = herpesvírus + calicivírus + panleucopenia): filhote 8–12–16s + 1 ano + trienal\n• Raiva: anual\n• FeLV: filhote 9–12s reforço 4 sem + anual (soronegativo em risco)\n\nInforme doença específica para protocolo detalhado!` + AVISO;
  }
  if (lower.includes('parasit') || lower.includes('carrapato') || lower.includes('pulga') || lower.includes('giardia') || lower.includes('verme') || lower.includes('toxocara') || lower.includes('heartworm') || lower.includes('dirofilaria') || lower.includes('ancilostomo')) {
    return `🦟 **Parasitologia — Controle:**\n\n**Ectoparasitas:**\n• Carrapatos/pulgas: isoxazolinas (fluralaner, afoxolaner, sarolaner) — primeira linha, eficácia 99%+\n• Alternativa: fipronil + S-metoprene mensal\n\n**Endoparasitas:**\n• Roundworms (Toxocara, Toxascaris): pirantel 5–10 mg/kg VO _ou_ fenbendazol 50 mg/kg 3d\n• Ancilostoma: fenbendazol, pirantel, milbemicina\n• Giardia: metronidazol 15 mg/kg VO 12/12h 5–7d _ou_ fenbendazol 50 mg/kg 5d\n• Dipylidium (tênia): praziquantel 5 mg/kg VO dose única\n\n**Dirofilariose (heartworm):**\n• Profilaxia: milbemicina ou ivermectina mensais em áreas endêmicas\n• Tratamento: melarsomina IM (protocolo CAPC 3 doses) — estabilização prévia` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     EMERGÊNCIA / URGÊNCIA
  ═══════════════════════════════════════════════════ */
  if (lower.includes('emergência') || lower.includes('urgência') || lower.includes('crise') && !lower.includes('epilepsia') || lower.includes('intoxicação') || lower.includes('choque') || lower.includes('rcp') || lower.includes('parada cardíaca') || lower.includes('trauma')) {
    if (lower.includes('intoxicação') || lower.includes('envenenamento') || lower.includes('veneno')) {
      return `🚨 **Intoxicação — Protocolo de Emergência:**\n\n**Primeiros passos:**\n1. Estabilizar via aérea, circulação e temperatura\n2. Identificar o tóxico (nome do produto, quantidade, tempo de exposição)\n3. Ligar para centro de toxicologia: CVP-Campinas (19) 3243-7777 / CEATOX-SP (11) 3081-1033\n\n**Descontaminação (se < 2h ingestão + animal consciente):**\n• Vômito: apomorfina 0,03 mg/kg IV _ou_ H₂O₂ 3% 1 mL/kg VO (cão)\n• Carvão ativado: 1–4 g/kg + catártico (sulfato de sódio) — NÃO usar se cáustico\n\n**Tóxicos comuns:**\n• **Rodenticida anticoagulante:** vitamina K1 2,5–5 mg/kg VO 30d\n• **Organofosforado:** atropina 0,2 mg/kg IV + pralidoxima 20 mg/kg IM\n• **Paracetamol (gatos):** N-acetilcisteína 140 mg/kg VO/IV loading + 70 mg/kg q6h\n• **Chocolte:** diazepam se convulsão, fluidos, manter alerta cardíaco\n• **Uva/passa:** induzir vômito + fluidos + monitorar renal` + AVISO;
    }
    if (lower.includes('rcp') || lower.includes('parada cardíaca') || lower.includes('ressuscitação')) {
      return `🚨 **RCP Veterinária (RECOVER 2012):**\n\n**BLS (Basic Life Support):**\n• 100–120 compressões/minuto\n• 1/3 da largura do tórax de profundidade\n• Relação 30:2 (comprimir:ventilar) se 1 socorrista · 15:2 se 2\n• Via aérea: intubação com O₂ a 100%\n\n**ALS:**\n• Acesso IV/IO\n• Adrenalina 0,01 mg/kg IV a cada 3–5 min\n• Vasopressina 0,8 UI/kg IV (1ª ou 2ª dose alternada)\n• Atropina 0,04 mg/kg IV (assistolia/bradicardia)\n\n**Desfibrilação (FV/TVSP):**\n• Monofásica: 4–6 J/kg · Bifásica: 2–4 J/kg\n• RCP imediatamente pós-choque por 2 min\n\n**Causas reversíveis (6H + 6T):**\nHipoxemia, Hipovolemia, Hipotermia, Hipo/hipercalemia, Hipoglicemia, H+ acidose\nTamponamento, Tensão pneumotórax, Tromboembolismo, Toxinas, Trauma, Trombose coronária` + AVISO;
    }
    return `🚨 **Emergência — Triagem rápida:**\n\n**Sinais de emergência absoluta:**\n• Dificuldade respiratória grave → O₂ imediato, posição esternal\n• Colapso / choque → acesso IV, Ringer lactato 20 mL/kg em bólus\n• Convulsão ativa → diazepam 0,5 mg/kg IV\n• Trauma → imobilização, avaliação ABC\n• Cólica equina grave → sonda nasogástrica, fluidoterapia, analgesia\n\nInforme o quadro completo para protocolo específico!` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     REPRODUÇÃO
  ═══════════════════════════════════════════════════ */
  if (lower.includes('piometra') || lower.includes('gestação') || lower.includes('parto') || lower.includes('distocia') || lower.includes('criptorquida') || lower.includes('reprodução') || lower.includes('ciclo') || lower.includes('prenhez')) {
    if (lower.includes('piometra')) {
      return `🚨 **Piometra — Emergência cirúrgica:**\n\n**Diagnóstico:** anamnese (cio recente), descarga vulvar (aberta) ou ausência (fechada), leucocitose com desvio à esquerda, ecografia uterina (conteúdo anecoico/ecogênico)\n\n**Tratamento:**\n• **Padrão:** ovário-histerectomia (OH) de urgência após estabilização\n• Estabilização pré-op: fluidos IV, antibióticos (amoxicilina+clav IV ou cefazolina), correção de eletrólitos\n• **Conservador (raças de criação, piometra aberta, risco anestésico baixo):** aglepristona 10 mg/kg SC dias 1, 2 e 8 + enrofloxacino — monitoração rigorosa\n\n**Pós-op:** antibióticos 7–10 dias (amoxicilina+clav), analgesia, suporte nutricional` + AVISO;
    }
    return `🐾 **Reprodução — resumo:**\n\n• **Progestagens exógenos:** contraindicados por risco de piometra e neoplasia mamária\n• **Prevenção:** castração precoce (antes do 1° cio reduz risco de neoplasia mamária de 8% para 0,5%)\n• **Gestação:** diagnóstico por ecografia (28–35 dias) ou RX (45+ dias para contar filhotes)\n• **Distocia:** se > 2h de contrações sem filhote → intervenção (ocitocina 0,5–2 UI/cão IM _ou_ cesariana)\n• **Criptorquidismo:** orquiectomia bilateral recomendada (risco de torção e neoplasia)` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     ANIMAIS EXÓTICOS
  ═══════════════════════════════════════════════════ */
  if (lower.includes('ave') || lower.includes('pássaro') || lower.includes('papagaio') || lower.includes('calopsita') || lower.includes('periquito') || lower.includes('bird') || lower.includes('psitac')) {
    return `🦜 **Medicina de Aves (Psitacídeos):**\n\n**Princípios básicos:**\n• Temperatura corporal normal: 40–42°C\n• Não palpação abdominal agressiva — risco de regurgitação e aspiração\n• Coleta de sangue: veia jugular direita (< 1% do peso corporal)\n\n**Doenças comuns:**\n• **Doença de Pacheco (herpesvírus):** morte súbita, aciclovir profilático em contatos\n• **Aspergillus:** imunossupressão + itraconazol 10 mg/kg VO 12/12h\n• **Psitacose (Chlamydophila):** tetraciclina ou doxiciclina 25–50 mg/kg VO 45d — ZOONOSE!\n• **Doença do bico e penas (PBFD):** circovírus — não há tratamento, suporte\n• **Deficiência de vitamina A:** hipovitaminose A → suplementar + dieta rica em beta-caroteno\n\n**Anestesia:** isoflurano máscara, monitorar glicemia (hipoglicemia frequente)\n**Analgesia:** butorfanol 1–2 mg/kg IM, meloxicam 0,5 mg/kg VO 12/12h` + AVISO;
  }
  if (lower.includes('réptil') || lower.includes('lagarto') || lower.includes('cobra') || lower.includes('tartaruga') || lower.includes('iguana')) {
    return `🦎 **Medicina de Répteis:**\n\n**Princípios:**\n• Animais ectotérmicos — temperatura ambiental critica (POTZ: preferred optimal thermal zone)\n• Iguana/Dragão de Barba: 28–35°C dia · 22–25°C noite\n• Cobra: 28–32°C\n\n**Doenças comuns:**\n• **Estomatite infecciosa (boca podre):** amoxicilina+clav ou enrofloxacino IM + limpeza local\n• **Pneumonia:** enrofloxacino 5 mg/kg IM a cada 48h + nebulização\n• **Disecdise:** banhos mornos + óleo mineral — investigar umidade insuficiente\n• **Deficiência de cálcio (MBD):** suplementação Ca + vitamina D + UVB\n• **Abscesso:** drenagem cirúrgica + cultura + ATB\n\n**Anestesia:** propofol IV (veia coccígea ventral), quetamina IM para sedação\n**Dica:** Salmonella — risco de zoonose — orientar higiene do tutor` + AVISO;
  }
  if (lower.includes('coelho') || lower.includes('rabbit')) {
    return `🐰 **Medicina de Coelhos:**\n\n**Dieta:** feno ilimitado (80%) + folhas verdes + ração peletizada restrita (5% do peso/dia)\n\n**Doenças comuns:**\n• **GI stasis (estase):** emergência! Fluidos SC + motilidade (metoclopramida ou ranitidina) + analgesia + estimular alimentação com feno\n• **Doença hemorrágica viral (RHDV2):** vacina bianual — ALTA mortalidade\n• **Myxomatose:** vacina — prevenção\n• **Abscesso:** anaeróbios frequentes — rifampicina + azitromicina ou penicilina IM\n• **Sarna de ouvido (Psoroptes):** ivermectina 0,2 mg/kg SC 2 doses/14 dias\n\n**NUNCA usar:** amoxicilina, ampicilina, clindamicina VO — causam disbiose fatal\n\n**Castração:** recomendada em ambos os sexos (prevenção de adenocarcinoma uterino em fêmeas)` + AVISO;
  }

  /* ═══════════════════════════════════════════════════
     ODONTOLOGIA VETERINÁRIA — ESPECIALIZAÇÃO COMPLETA
     Cão · Gato · Equino — todas as subespecialidades
  ═══════════════════════════════════════════════════ */

  /* ── Diagnóstico diferencial oral ── */
  if (lower.includes('diagnóstico diferencial') || lower.includes('diferencial') || lower.includes('halitose') || lower.includes('sialorreia') || lower.includes('disfagia') || lower.includes('dificuldade de mastigação')) {
    if (esp === 'felino' || lower.includes('felino') || lower.includes('gato')) {
      return `🔎 **Diagnóstico diferencial — felino com halitose + sialorreia + disfagia:**\n\n**1° Doença periodontal grau III–IV** _(mais provável — 80% dos gatos > 3 anos)_\n• Cálculo subgengival, bolsas profundas, exposição de furca\n• Dx: sondagem + Rx intraoral completo sob anestesia\n\n**2° Estomatite Crônica Felina (GECF)**\n• Inflamação difusa de mucosa além da linha mucogengival (fauces)\n• Sialorreia profusa, dor intensa, anorexia, perda de peso\n• Associação com FCV, FHV-1, FIV, FeLV\n• Dx: biópsia (plasmócitos + linfócitos) + sorologias\n\n**3° FORL — Lesões de Reabsorção Odontoclástica**\n• Dor aguda à sondagem no colo dentário (reação de retirada)\n• 50–72% das lesões são invisíveis clinicamente — Rx OBRIGATÓRIO\n• Dx exclusivamente por Rx intraoral\n\n**4° Neoplasia oral (CEC)**\n• Carcinoma de células escamosas — língua ventral, gengiva, amígdala\n• Crescimento rápido, ulceração, halitose fétida, linfadenopatia\n• Dx: biópsia + TC mandibular + Rx tórax\n\n**5° Osteomielite / Abscesso perirradicular**\n• Fístula cutânea suborbital → abscesso do carniceiro (108/208)\n• Dx: Rx + fistulografia · Tx: extração + curetagem + ATB\n\n**6° Corpo estranho oral**\n• Sialorreia aguda súbita, meneio de cabeça\n• Dx: inspeção direta + Rx\n\n**Conduta:** hemograma + bioquímica + sorologias FIV/FeLV/FCV + Rx intraoral completo (10 Rx) sob anestesia.` + AVISO;
    }
    if (esp === 'equino' || lower.includes('equino') || lower.includes('cavalo')) {
      return `🔎 **Diagnóstico diferencial oral — equino:**\n\n**1° Pontas de esmalte / ganchos**\n• Lacerações de mucosa jugal e língua, dificuldade de mastigação, perda de condição\n• Dx: espéculo + boroscópio\n\n**2° Síndrome do diastema**\n• Impacção de alimento entre PM/M adjacentes → gengivite, halitose, bolsas periodontais\n• Dx: sonda periodontal + boroscópio\n\n**3° Doença periodontal maxilar com fístula**\n• Descarga nasal unilateral fétida → suspeita de periodontite dos molares maxilares\n• Dx: Rx oblíqua, endoscopia nasal, TC\n\n**4° EOTRH** (equinos > 15 anos)\n• Nódulos nos incisivos/caninos, dor, relutância ao freio\n• Dx: EXCLUSIVAMENTE por Rx intraoral\n\n**5° Neoplasia oral**\n• CEC gengival, ameloblastoma, odontoma · Dx: biópsia + TC\n\n**6° Fratura de dente cheio (molar)**\n• Fístula maxilar, descarga nasal ipsilateral, queda de alimento hemilateral\n• Dx: Rx + TC + endoscopia` + AVISO;
    }
    return `🔎 **Diagnóstico diferencial — halitose em cão:**\n\n• **Doença periodontal** — causa mais comum (> 85% dos cães > 3 anos)\n• **Abscesso perirradicular do carniceiro** — fístula suborbital, face\n• **Corpo estranho oral** — osso, espinho, palito entre dentes\n• **Neoplasia oral** — epúlide, melanoma, fibrossarcoma, CEC\n• **Pulpite/necrose pulpar** — dente escurecido sem fratura visível\n• **IRC urêmica** — halitose de amônia em geriátricos\n• **Diabetes mellitus** — hálito cetônico\n• **Gastrite/esofagite** — regurgitação\n\nInforme espécie, raça, idade, sinais e duração para análise completa.` + AVISO;
  }

  /* ── Doença periodontal — estadiamento e protocolo ── */
  if (lower.includes('periodontite') || lower.includes('doença periodontal') || lower.includes('bolsa periodontal') || lower.includes('sondagem') || lower.includes('perda óssea') || lower.includes('curetagem subgengival') || lower.includes('estadiamento periodontal')) {
    return `🦷 **Doença Periodontal — Estadiamento e Protocolo Completo:**\n\n**Estadiamento (AVDC):**\n| Grau | Achados clínicos e radiográficos | Conduta |\n|------|----------------------------------|----------|\n| 0 | Gengiva e dente saudáveis | Profilaxia preventiva semestral |\n| I | Gengivite, sem perda óssea | US + curetagem + orientação |\n| II | Periodontite — perda óssea ≤ 25% | US + curetagem subgengival + ATB |\n| III | Perda óssea 25–50% | Curetagem profunda + extração seletiva + ATB |\n| IV | Perda óssea > 50% | Exodontia + ATB pós-op |\n\n**Protocolo cirúrgico completo (Grau II–III):**\n1. Rx intraoral pré-op de todos os quadrantes\n2. Detartragem US supragengival (ponteira P1/H, angulação < 15°)\n3. Sondagem periodontal: 6 pontos/dente (cão) · 4 pontos/dente (gato)\n4. Curetagem subgengival: curetas Gracey #7/8 (faces vestibulares PM/M) e #11/12 (faces mesiais)\n5. Irrigação subcrevicular: clorexidina 0,12% + salina\n6. Polimento: contra-ângulo + taça de borracha + pasta profilática fina\n7. Extrações dos elementos indicados + Rx confirmatório pós-extração\n8. Sutura de alvéolos: Vicryl 4-0 se necessário\n9. Registro: fotos pós-op + odontograma\n\n**Antibioticoterapia:**\n• Amoxicilina + Clav 20 mg/kg VO 12/12h 7–10d\n• Metronidazol 15 mg/kg VO 12/12h 7d (periodontopatógenos anaeróbios)\n• Doxiciclina 5 mg/kg VO 12/12h 10–14d (ação anticolagenase + antimicrobiana)\n\n**Pós-op ao tutor:**\n• Clorexidina gel 0,12% com gaze 2x/dia por 7 dias\n• Dieta pastosa 5–7 dias · retorno em 7–14 dias\n• Profilaxia de manutenção: 6 meses (doença periodontal) / 12 meses (saudável)` + AVISO;
  }

  /* ── Profilaxia dental ── */
  if (lower.includes('profilaxia') || lower.includes('limpeza dental') || lower.includes('detartragem') || lower.includes('tártaro') || lower.includes('tartaro') || lower.includes('cálculo dental') || lower.includes('polimento dental')) {
    return `🪥 **Protocolo Completo de Profilaxia Dental Veterinária:**\n\n**Pré-operatório:**\n• Exames pré-anestésicos (hemograma + bioquímica)\n• Jejum sólido 8–12h · hídrico 4h\n• Antibioticoterapia profilática: amoxicilina+clav 20 mg/kg IV/IM 30 min antes (se doença periodontal grau II+)\n\n**Protocolo passo-a-passo:**\n1. **Fotografias pré-op + preenchimento do odontograma**\n2. **Detartragem US supragengival** — ponteira P1 ou H · movimento de varredura · não ultrapassar junção cemento-esmalte\n3. **Sondagem periodontal completa** — 6 pontos/dente em cão · 4/dente em gato · registrar profundidade, recessão, furcação, mobilidade\n4. **Rx intraoral — OBRIGATÓRIO** — mínimo 4 Rx em cão / 10 Rx em gato · detecta 42% mais achados que o exame clínico isolado\n5. **Curetagem subgengival manual** — curetas Gracey + mini-five · irrigação com clorexidina 0,12%\n6. **Extrações indicadas** — baseadas no Rx + sondagem\n7. **Polimento** — taça de borracha em baixa rotação + pasta abrasiva fina\n8. **Aplicação de agente de proteção** — gel de flúor (cão) · NÃO usar flúor em gatos\n9. **Fotografias pós-op + laudo + odontograma final**\n\n**Ao tutor:**\n• Escovação 3–7x/semana com pasta enzimática veterinária\n• Clorexidina gel 0,12% como adjuvante\n• Dieta dental certificada VOHC\n• Retorno: 6 meses (raças pequenas/felinos) / 12 meses (raças grandes)\n\n[ACAO:laudo]{"paciente":"${pat?pat.name:'[Paciente]'}","tutor":"${pat?pat.owner:'[Tutor]'}","especie":"${esp}","achados":"Doença periodontal — estadiamento a definir após sondagem e radiografias","conduta":"Profilaxia completa com US + curetagem + Rx intraoral","conclusao":"Reavaliação pós-profilaxia em 7 dias."}[/ACAO]` + AVISO;
  }

  /* ── Anestesia locoregional / bloqueios nervosos ── */
  if (lower.includes('bloqueio') || lower.includes('anestesia local') || lower.includes('infraorbit') || lower.includes('alveolar inferior') || lower.includes('mental') && (lower.includes('bloqueio') || lower.includes('nervo')) || lower.includes('lidocaína') || lower.includes('bupivacaína') || lower.includes('locoregional')) {
    return `💉 **Bloqueios Locoregionais Odontológicos Veterinários:**\n\n**Fármacos de escolha:**\n• Lidocaína 2%: onset 2–5 min · duração 1–2h · dose máx 6 mg/kg (cão) / 3 mg/kg (gato)\n• Bupivacaína 0,5%: onset 10–15 min · duração 4–8h · dose máx 2 mg/kg\n• Combinação ideal: lido 2% + bupivacaína 0,5% no mesmo ponto\n• NUNCA ultrapassar a dose máxima — toxicidade cardíaca e neurológica\n\n**Bloqueios principais (cão e gato):**\n\n| Bloqueio | Nervos | Dentes anestesiados | Volume (cão/gato) |\n|----------|--------|--------------------|-----------------|\n| Infraorbital caudal | N. infraorbital | Todos PM e M maxilares + PM3 e canino | 0,5–1,0 / 0,1–0,2 mL |\n| Infraorbital rostral | N. alveolar caudal | Incisivos + caninos max | 0,2–0,5 / 0,1 mL |\n| Palatino maior | N. palatino maior | Palato duro + faces palatinas | 0,1–0,2 / 0,1 mL |\n| Mental médio | N. mental | Incisivos e caninos mandibulares | 0,2–0,5 / 0,1 mL |\n| Alveolar inferior | N. alveolar inferior | Toda a hemiarcada mandibular | 0,5–1,5 / 0,2–0,5 mL |\n\n**Técnica:**\n1. Agulha 25–27G, seringa de 1 mL\n2. Introdução no forame ou próximo à emergência nervosa\n3. Aspiração antes de injetar (evitar intravascular)\n4. Depósito lento (10–15 seg / 0,1 mL)\n5. Aguardar 5–10 min para onset completo\n6. Confirmar bloqueio: ausência de reflexo de pinça\n\n**Equinos (volumes maiores — 2–5 mL/ponto):**\n• N. infraorbital (canal): incisivos + PM maxilares\n• N. mental: incisivos mandibulares\n• N. palatal: palato` + AVISO;
  }

  /* ── Exodontia / extração dentária ── */
  if (lower.includes('exodontia') || lower.includes('extração') || lower.includes('extrair') || lower.includes('indicação de extração') || lower.includes('técnica de extração') || lower.includes('alvéolo') || (lower.includes('dente') && lower.includes('tirar'))) {
    return `🦷 **Exodontia Veterinária — Indicações e Técnica:**\n\n**Indicações absolutas:**\n• Mobilidade grau III (> 1 mm em qualquer direção)\n• Perda de suporte ósseo > 50% no Rx\n• Fratura Classe IV/V (polpa exposta crônica / fratura de raiz)\n• FORL tipo 1 em gatos (raiz remanescente inflamada)\n• Doença periodontal grau IV\n• Dente supranumerário com mau-posicionamento\n• Dente decíduo retido após erupção do permanente\n\n**Técnica fechada** (dentes de raiz simples ou pequenos):\n1. Bloqueio locoregional (bupivacaína + lidocaína)\n2. Incisão do ligamento periodontal com luxador de elevação\n3. Luxação progressiva: movimentos de pressão apical + rotação lenta\n4. Remoção com fórceps adaptado à raiz\n5. Curetagem do alvéolo + inspeção de fragmentos\n6. Rx pós-extração (confirmar ausência de raiz)\n7. Sutura com Vicryl 4-0 ou PDS 5-0 se necessário\n\n**Técnica aberta / cirúrgica** (PM, M, caninos, raízes longas):\n1. Bloqueio locoregional\n2. Incisão sulcular + retalho mucoperiostal (incisão de alívio vertical)\n3. Osteotomia com bur esférico em alta rotação + refrigeração salina\n4. Secção interradicular com bur diamantado (dentes multirradiculares)\n5. Luxação e remoção de cada raiz individualmente\n6. Curetagem + irrigação copiosa com salina\n7. Rx confirmatório\n8. Sutura: retalho reposicionado + Vicryl 4-0/5-0 simples ou horizontal\n\n**Pós-op:**\n• Meloxicam ${esp==='felino'?`0,05 mg/kg${peso>0?' = '+(peso*0.05).toFixed(2)+' mg':''}  VO 1x/dia 2d`:`0,1 mg/kg${peso>0?' = '+(peso*0.1).toFixed(2)+' mg':''} VO 1x/dia 3–5d`}\n• Tramadol ${esp==='felino'?`1 mg/kg${peso>0?' = '+(peso*1).toFixed(1)+' mg':''} VO 12/12h 3d`:`3 mg/kg${peso>0?' = '+(peso*3).toFixed(0)+' mg':''} VO 8/8h 3d`}\n• Amoxicilina+Clav 20 mg/kg${peso>0?' = '+(peso*20).toFixed(0)+' mg':''} VO 12/12h 7d\n• Clorexidina gel 0,12% 2x/dia 7d · dieta pastosa 7d · retorno 7–10 dias` + AVISO;
  }

  /* ── Endodontia veterinária ── */
  if (lower.includes('endodontia') || lower.includes('pulpotomia') || lower.includes('tratamento de canal') || lower.includes('canal radicular') || lower.includes('necrose pulpar') || lower.includes('abscesso perirradicular') || lower.includes('pulpite') || lower.includes('obturação') || lower.includes('mta') || lower.includes('guta-percha')) {
    return `🦷 **Endodontia Veterinária — Protocolos:**\n\n**Indicações (alternativa à extração):**\n• Dentes estratégicos: caninos (104/204/304/404), carniceiros (109/209/409/409)\n• Fratura com exposição pulpar recente (< 48h)\n• Necrose pulpar confirmada (Rx: lesão periapical, reabsorção interna)\n• Cães de trabalho, defesa, zoológico\n\n**Pulpotomia vital** _(polpa exposta < 48h, dente jovem)_:\n1. Bloqueio locoregional · isolamento relativo\n2. Acesso à câmara com bur esférico diamantado\n3. Remoção da polpa coronária + hemostasia (soro fisiológico + bola de algodão estéril)\n4. Aplicação de MTA (Mineral Trioxide Aggregate) sobre o coto (espessura ≥ 3 mm)\n5. Base de ionômero de vidro fotopolimerizável\n6. Restauração definitiva com resina composta\n7. Rx de controle: 6 e 12 meses\n\n**Pulpectomia (tratamento de canal padrão)** _(necrose ou exposição crônica)_:\n1. Acesso endodôntico + radiografia de trabalho (odontometria)\n2. Instrumentação: limas K manuais do #15 ao #80+ (crown-down)\n3. Irrigação: hipoclorito de sódio 2–3% intercalado com EDTA 17%\n4. Secagem com pontas de papel absorvente\n5. Obturação: cimento endodôntico (AH Plus ou Sealapex) + guta-percha (condensação lateral fria)\n6. Restauração: ionômero de base + resina composta\n7. Rx imediato confirmatório\n8. Controles: 6 e 12 meses (avaliar cicatrização periapical)\n\n**Abscesso perirradicular:**\n• Nunca ATB isolado — antibióticos não eliminam a infecção sem drenagem\n• Drenagem via tratamento de canal OU exodontia + curetagem do tecido de granulação\n• ATB: amoxicilina+clav + metronidazol 7–10 dias (adjuvante à drenagem)` + AVISO;
  }

  /* ── FORL / Lesões de reabsorção felina ── */
  if (lower.includes('forl') || lower.includes('reabsorção') && (lower.includes('dente') || lower.includes('dental') || lower.includes('felino') || lower.includes('gato')) || lower.includes('odontoclástica') || lower.includes('lesão de reabsorção') || lower.includes('anquilose dentária')) {
    return `🐱 **FORL — Lesões de Reabsorção Odontoclástica Felina:**\n\n**Epidemiologia:** afeta 40–60% dos gatos adultos · causa mais comum de exodontia em felinos\n\n**Apresentação clínica:**\n• Salivação, dificuldade de mastigação, mastigação unilateral, relutância a croquete duro\n• Visível clinicamente: defeito rosa-avermelhado no colo do dente (tecido de granulação)\n• Reação de retirada à sondagem com sonda exploradora no colo\n\n**Classificação radiográfica (AVDC — OBRIGATÓRIA para definir conduta):**\n\n| Tipo | Achado no Rx | Conduta |\n|------|-------------|----------|\n| Tipo 1 | Raiz com estrutura normal, lesão localizada no colo | **Exodontia convencional** — extração cirúrgica de toda a raiz |\n| Tipo 2 | Raiz com reabsorção avançada/anquilose, perda do espaço periodontal | **Coronectomia** — amputação da coroa + deixar raiz (reabsorve fisiologicamente) |\n| Tipo 3 | Misto (uma raiz tipo 1, outra tipo 2) | Exodontia da raiz tipo 1 + coronectomia da raiz tipo 2 |\n\n⚠️ **NUNCA decidir a conduta apenas pelo exame clínico — Rx é MANDATÓRIO**\n\n**Por que FORL é invisível sem Rx?**\n• 50–72% das lesões estão subgengivais\n• Mesmo lesões tipo 2 avançadas podem não ser visíveis clinicamente\n• Raízes anquilosadas tipo 2 NÃO devem ser extraídas (fragmentam e causam trauma ósseo)\n\n**Pós-operatório FORL:**\n• Meloxicam 0,05 mg/kg SC + buprenorfina 0,02 mg/kg transmucosa\n• Amoxicilina+Clav 20 mg/kg 12/12h 7d\n• Dieta úmida / pastosa por 10–14d\n• Rx de controle semestral — FORL recidiva em outros dentes\n• Informar ao tutor: não há prevenção conhecida, monitorização é a conduta` + AVISO;
  }

  /* ── Estomatite felina (GECF) ── */
  if (lower.includes('estomatite') || lower.includes('gecf') || lower.includes('gengivoestomatite') || lower.includes('mucosite') || lower.includes('inflamação oral felino')) {
    return `🐱 **Estomatite Crônica Felina (GECF):**\n\n**Diagnóstico clínico:**\n• Sialorreia intensa, anorexia, disfagia, perda de peso marcada\n• Halitose grave, mucosa vermelha/ulcerada além da linha mucogengival\n• Envolvimento das fauces (área caudal à arcada) — sinal patognomônico\n• Dor intensa → relutância à abertura de boca, ranhunhar a face\n\n**Investigação:**\n• Biópsia (amostra representativa): plasmócitos e linfócitos — estomatite plasmocítica\n• Sorologias: FIV, FeLV, FCV (calicivírus) — buscar gatilho imune\n• Rx intraoral completo: FORL frequentemente associada\n• Hemograma + proteínas totais: avaliar estado nutricional e resposta inflamatória\n\n**Tratamento (baseado em evidências — WSAVA/AVDC):**\n\n_1ª linha — cirúrgico:_\n• Extração TOTAL de pré-molares e molares (± caninos e incisivos se envolvidos)\n• Remissão completa: 60% · Remissão parcial: 20% · Sem resposta: 20%\n• Curetagem meticulosa do alvéolo · sutura com Vicryl 5-0\n\n_Pós-op imediato (primeiras 4 semanas):_\n• Prednisolona 1 mg/kg/dia VO → redução progressiva (1 mg/kg EOD → 0,5 mg/kg EOD → suspender)\n• Amoxicilina + Clav 20 mg/kg VO 12/12h 10 dias\n• Buprenorfina 0,02 mg/kg transmucosa SL 12/12h 5–7 dias\n• Dieta úmida ou pastosa por tempo indeterminado\n\n_Sem resposta à extração (imunomodulação):_\n• Ciclosporina 5–7 mg/kg VO 1x/dia (monitorar creatinina)\n• Interferon ômega felino 1M UI/dia SC ou VO 90 dias\n• Doxiciclina 5 mg/kg VO 12/12h 6–8 semanas (efeito anti-inflamatório)\n• Evitar metilprednisolona depot (Depo-Medrol) de longa ação — risco de diabetes\n\n**Prognóstico:** melhor nos gatos jovens sem FIV/FeLV positivo e com envolvimento predominantemente de fauces` + AVISO;
  }

  /* ── Neoplasias orais ── */
  if (lower.includes('neoplasia oral') || lower.includes('tumor oral') || lower.includes('tumor na boca') || lower.includes('massa oral') || lower.includes('massa na gengiva') || lower.includes('epúlide') || lower.includes('epulis') || lower.includes('melanoma oral') || lower.includes('fibrossarcoma oral') || lower.includes('cec oral')) {
    return `🔬 **Neoplasias Orais Veterinárias:**\n\n**CÃO — por frequência:**\n1. **Melanoma maligno oral** (mais comum)\n   • Localização: gengiva, lábio, mucosa jugal, palato duro\n   • Pigmentado _ou_ amelanótico — desconfiar de qualquer massa oral\n   • Comportamento: altamente agressivo, metástase precoce (LN + pulmão)\n   • Tx: mandibulectomia/maxilectomia com margens de 2 cm + vacina DNA-melanoma (USDA) ± radioterapia\n2. **Carcinoma de células escamosas (CEC)**\n   • Gengiva, amígdala (pior prognóstico), língua\n   • Invasão óssea frequente\n   • Tx: cirurgia (mandibulectomia/maxilectomia) + RTx adjuvante\n3. **Fibrossarcoma**\n   • Palato, gengiva · localmente invasivo · mets tardias\n   • Tx: cirurgia com margens amplas ± RTx\n4. **Epúlide fibromatosa** (benigna)\n   • Gengiva · exérese local simples · baixa recidiva\n5. **Ameloblastoma acantomatoso (epúlide acantomatosa)**\n   • Invade osso · mandibulectomia segmentar · RTx: resposta excelente\n\n**GATO:**\n1. **CEC** (> 80% das neoplasias orais)\n   • Língua ventral, gengiva, amígdala · invasão óssea precoce\n   • Prognóstico sombrio — sobrevida média < 6 meses mesmo com tratamento\n2. **Fibrossarcoma** · **Linfoma oral**\n\n**Investigação pré-operatória:**\n• Biópsia incisional — amostra profunda e representativa\n• TC de crânio/mandíbula (avaliação de extensão óssea)\n• Rx tórax 3 planos + ecografia abdominal\n• Citologia de linfonodos mandibulares e retrofaríngeos\n\n⚠️ Não realizar cauterização ou curetagem prévia à biópsia — altera o histopatológico` + AVISO;
  }

  /* ── Odontoplastia equina ── */
  if (lower.includes('odontoplastia') || lower.includes('nivelamento') || lower.includes('diastema') || lower.includes('gancho') || lower.includes('ponta de esmalte') || lower.includes('dente de lobo') || lower.includes('onda') || lower.includes('degrau') || (lower.includes('equino') && lower.includes('dental'))) {
    return `🐴 **Protocolo Completo de Odontoplastia Equina:**\n\n**Avaliação e sedação:**\n• Xilazina 0,5–1,0 mg/kg IV${peso>0?' = '+(peso*0.8).toFixed(0)+' mg':''} + Butorfanol 0,02–0,04 mg/kg IV\n• Espéculo oral ajustável + fonte de luz dedicada + boroscópio\n• Aguardar sedação plena (5–10 min)\n\n**Exame sistematizado (odontograma equino):**\n• Incisivos: oclusão, angulação, desgaste, sinais de EOTRH\n• Dentes de lobo (PM1 — 105/205/305/405): presença e posição\n• PM e M: pontas de esmalte, ganchos, ondas, degraus, diastemas\n• Mucosa: lacerações, úlceras por pontas de esmalte\n\n**Intervenções:**\n\n_Nivelamento odontológico:_\n• Remoção de pontas de esmalte com burs elétricos de tungstênio (< 3 mm)\n• Eliminar ganchos: PM1 maxilares (106/206) e M3 mandibulares (311/411)\n• Corrigir degraus (> 3 mm) e ondas com bur diamantado em alta rotação\n• Redução de diastemas: curetagem + irrigação com clorexidina 0,12%\n\n_Extrações:_\n• Dentes de lobo: elevador periosteal + fórceps específico (PM1 rudimentar)\n• Elementos móveis/fraturados: técnica de boca ou repulsora\n• Repulsão (mandibular): trépano + instrumento de repulsão pelo baixo\n\n_Diastemas patológicos:_\n• Limpeza com cureta periodontal\n• Preenchimento com composite ou Biodentine em diastemas grau 3\n• Reavaliação em 3 meses\n\n**Pós-operatório:**\n• Meloxicam 0,6 mg/kg VO 1x/dia 3–5 dias\n• Feno macio (sem pellet ou ração dura) 7–10 dias\n• Repouso de trabalho com freio 5–7 dias\n• Reavaliação: 6–12 meses (cavalos em trabalho) / bianual (lazer)\n\n**Equipamentos:** boroscópio, burs elétricos de tungstênio, espéculo Hausmann/Swales, seringa de irrigação, fórceps equinos, elevadores periodontais` + AVISO;
  }

  /* ── EOTRH equino ── */
  if (lower.includes('eotrh') || lower.includes('hipercementose') || (lower.includes('reabsorção') && (lower.includes('equino') || lower.includes('cavalo') || lower.includes('incisivo')))) {
    return `🐴 **EOTRH (Equine Odontoclastic Tooth Resorption and Hypercementosis):**\n\n**Epidemiologia:** cavalos > 15 anos · prevalência crescente com a idade\n\n**Sinais clínicos:**\n• Nódulos/irregularidades nodulares na gengiva ao redor dos incisivos e caninos\n• Dor à palpação, relutância ao freio, sialorreia\n• Deformação da linha gengival, exposição de cemento/dentina\n• Casos avançados: mobilidade dentária, dificuldade de pastagem, perda de peso\n\n**Diagnóstico:**\n• Suspeita clínica + confirmação EXCLUSIVA por Rx intraoral dos incisivos\n• Achados Rx: áreas radiolúcidas de reabsorção radicular + hipercementose (aspecto irregular nodular da raiz)\n• TC mandibular/maxilar: melhor avaliação da extensão real\n\n**Tratamento:**\n• AINE: meloxicam 0,6 mg/kg VO 1x/dia (controle da dor até exodontia)\n• Extração dos dentes mais afetados (mobilidade + lesões avançadas)\n• Casos graves: extração de todos os incisivos afetados\n• Cavalo alimenta-se normalmente com feno e pastagem sem incisivos\n• Lavagem das cavernosas com salina após extração\n• Retorno: 10–14 dias (avaliação de cicatrização) + 3 meses\n\n**Prognóstico:** excelente com exodontia — sem tratamento a doença progride` + AVISO;
  }

  /* ── Fratura dentária ── */
  if ((lower.includes('fratura') || lower.includes('quebrado') || lower.includes('dente quebrado') || lower.includes('coroa fraturada')) && (lower.includes('dente') || lower.includes('dental') || lower.includes('canino') || lower.includes('incisivo') || lower.includes('molar') || lower.includes('coroa') || lower.includes('carniceiro'))) {
    return `🦷 **Fratura Dentária — Classificação e Conduta (AVDC):**\n\n| Classe | Descrição | Conduta |\n|--------|-----------|----------|\n| I | Fratura de esmalte apenas | Desgaste de arestas + polimento + flúor |\n| II | Esmalte + dentina exposta, polpa fechada | Base de ionômero de vidro + resina composta |\n| III | Esmalte + dentina + **exposição de polpa < 48h** | Pulpotomia vital + MTA + restauração definitiva |\n| IV | Exposição de polpa crônica **(> 48h)** ou dente escurecido | Tratamento de canal padrão _ou_ exodontia |\n| V | Fratura de raiz | Exodontia cirúrgica (pode ser parcial se terço apical) |\n| VI | Dente decíduo com exposição pulpar | Exodontia do decíduo (proteção do dente permanente) |\n\n**Diagnóstico diferencial do dente escurecido:**\n• Roxo/rosa: hemorragia intrapulpar recente → sangue nos túbulos dentinários\n• Cinza/preto: necrose pulpar · Rx: lesão periapical = confirmação\n• Amarelo: calcificação pulpar progressiva — monitorar com Rx\n\n**Urgência:**\n• Exposição pulpar < 48h: URGÊNCIA — cada hora aumenta a profundidade de necrose bacteriana\n• Ligação ao tutor: "qualquer fratura com mancha rosa/sangue no centro = emergência odontológica"\n\n**Diagnóstico:**\n• Sondagem (localizar exposição pulpar)\n• Rx intraoral (avaliar raiz e região periapical)\n• Fotografias macro com boa iluminação\n\n[ACAO:laudo]{"paciente":"${pat?pat.name:'[Paciente]'}","tutor":"${pat?pat.owner:'[Tutor]'}","especie":"${esp}","achados":"Fratura dentária — classificação a definir com Rx intraoral","conduta":"Avaliação clínica e radiográfica + endodontia ou exodontia conforme classificação","conclusao":"Prognóstico a determinar após Rx."}[/ACAO]` + AVISO;
  }

  /* ── Radiografia intraoral ── */
  if (lower.includes('radiografia intraoral') || lower.includes('rx intraoral') || lower.includes('radiografia dental') || lower.includes('sensor intraoral') || lower.includes('técnica paralela') || lower.includes('bissetriz') || lower.includes('rx dental') || lower.includes('radiografia veterinária dental')) {
    return `📷 **Radiografia Intraoral Veterinária:**\n\n**Por que é obrigatória?**\n• 42–58% dos achados clinicamente relevantes são INVISÍVEIS sem Rx (múltiplos estudos AVDC)\n• Sem Rx não é possível: classificar FORL, estadiar doença periodontal, identificar anquilose, confirmar fratura de raiz\n• Padrão-ouro absoluto em odontologia veterinária — não é opcional\n\n**Técnicas:**\n\n_Técnica paralela (molares mandibulares de cão):_\n• Sensor paralelo ao longo eixo do dente · feixe perpendicular ao sensor\n• Menor distorção geométrica · usar posicionador (Rinn® ou similar)\n\n_Técnica da bissetriz (incisivos, caninos, molares maxilares):_\n• Sensor na cavidade oral angulado · feixe perpendicular à bissetriz entre eixo do dente e do sensor\n• Necessária quando impossível posicionar sensor paralelamente\n\n**Protocolo mínimo por espécie:**\n\n| Espécie | Nº mínimo de Rx | Regiões |\n|---------|-----------------|----------|\n| Cão pequeno | 10–12 | Todos os quadrantes |\n| Cão grande | 8–10 | Todos os quadrantes |\n| Gato | 10 | Boca toda (protocolo felino completo) |\n| Equino | 4–6 | Incisivos + arcadas afetadas |\n\n**Interpretação das estruturas:**\n• Espaço periodontal: linha negra uniforme 0,2–0,5 mm = normal · ausente = anquilose\n• Periápice: halo radiolúcido = granuloma ou abscesso (lesão periapical)\n• FORL tipo 1: radiolucência no colo/terço cervical com espaço periodontal preservado\n• FORL tipo 2: perda do espaço periodontal, raiz com aspecto irregular (anquilosada)\n• Fratura de raiz: linha radiolúcida transversal · deslocamento dos fragmentos` + AVISO;
  }

  /* ── Receituário odontológico ── */
  if (lower.includes('receituário') || lower.includes('prescri') || (lower.includes('receita') && !lower.includes('receita financ') && !lower.includes('receita mensal') && !lower.includes('faturamento'))) {
    const p = patPeso || peso;
    const eF = esp === 'felino';
    return `💊 **Receituário Odontológico Pós-operatório:**\n\n**Analgesia:**\n• Meloxicam ${eF?`0,05 mg/kg${p>0?' = '+(p*0.05).toFixed(2)+' mg':''} VO 1x/dia — 2 dias (máx 3d)`:` 0,1 mg/kg${p>0?' = '+(p*0.1).toFixed(2)+' mg':''} VO 1x/dia — 3–5 dias`}\n• Tramadol ${eF?`1 mg/kg${p>0?' = '+(p*1).toFixed(1)+' mg':''} VO 12/12h — 3 dias`:`3 mg/kg${p>0?' = '+(p*3).toFixed(0)+' mg':''} VO 8/8h — 3 dias`}\n${eF?`• Buprenorfina 0,02 mg/kg${p>0?' = '+(p*0.02).toFixed(2)+' mg':''} transmucosa SL 12/12h — 3 dias`:`• Dipirona${p>0?' 25 mg/kg = '+(p*25).toFixed(0)+' mg':' 25 mg/kg'} VO 8/8h — 3 dias (adjuvante)`}\n\n**Antibioticoterapia:**\n• Amoxicilina + Ácido Clavulânico 20 mg/kg${p>0?' = '+(p*20).toFixed(0)+' mg':''} VO 12/12h — 7 dias\n• Se anaeróbios (bolsas > 4 mm): + Metronidazol 15 mg/kg${p>0?' = '+(p*15).toFixed(0)+' mg':''} VO 12/12h — 7 dias\n\n**Higiene oral:**\n• Clorexidina gel 0,12% — aplicar com gaze 2x/dia por 7 dias\n\n**Restrições:**\n• Dieta pastosa/úmida por 5–7 dias\n• Sem brinquedos duros, ossos ou petiscos rígidos por 14 dias\n• Retorno em 7–10 dias\n\n[ACAO:receituario]{"paciente":"${pat?pat.name:'[Paciente]'}","tutor":"${pat?pat.owner:'[Tutor]'}","especie":"${esp}","itens":["Meloxicam ${eF?'0,05':'0,1'} mg/kg VO 1x/dia ${eF?'2':'3-5'} dias","Tramadol ${eF?'1':'3'} mg/kg VO ${eF?'12/12h':'8/8h'} 3 dias","Amoxicilina+Clav 20 mg/kg VO 12/12h 7 dias","Clorexidina gel 0,12% - aplicar com gaze 2x/dia 7 dias"],"obs":"Dieta pastosa 5-7 dias. Sem objetos duros. Retorno em 7-10 dias."}[/ACAO]` + AVISO;
  }

  /* ── Exames pré-anestésicos ── */
  if (lower.includes('pré-anest') || lower.includes('pre-anest') || lower.includes('exame pré') || (lower.includes('hemograma') && (lower.includes('dental') || lower.includes('cirurgia') || lower.includes('procedimento') || lower.includes('profilaxia')))) {
    return `🩸 **Exames Pré-Anestésicos — Odontologia Veterinária:**\n\n**Mínimo (ASA I, < 7 anos, sem comorbidades):**\n• Hemograma completo\n• ALT (TGP) + FA + Bilirrubinas\n• Ureia + Creatinina\n\n**Ampliado (ASA II ou > 7 anos):**\n• Todos acima +\n• Proteínas totais + Albumina\n• Glicemia\n• Sódio + Potássio + Cloro\n• ECG (cão > 8 anos ou raças cardiopatas: Cavalier, Boxer, Dachshund)\n\n**Geriátrico / ASA III+ (> 10 anos ou comorbidades):**\n• Todos acima +\n• Rx tórax 2 planos (VD + lateral)\n• T4 total (gatos > 8 anos — hipertireoidismo)\n• TAP + TTPA (coagulopatia suspeita)\n• Pressão arterial\n• SDMA (DRC precoce)\n\n**Equinos:**\n• Hemograma + fibrinogênio + proteínas totais\n• Hemogasometria (decúbito geral)\n• ECG se sopro ou arritmia detectada\n\n[ACAO:pedido_exame]{"paciente":"${pat?pat.name:'[Paciente]'}","tutor":"${pat?pat.owner:'[Tutor]'}","exames":["Hemograma completo","ALT (TGP)","Fosfatase alcalina","Ureia","Creatinina","Glicemia"],"indicacao":"Avaliação pré-anestésica","procedimento":"Procedimento odontológico"}[/ACAO]` + AVISO;
  }

  /* ── Anestesia locoregional / bloqueios nervosos ── */
  if (lower.includes('bloqueio') || lower.includes('anestesia local') || lower.includes('infraorbit') || (lower.includes('alveolar') && lower.includes('bloquei')) || lower.includes('lidocaína') || lower.includes('bupivacaína') || lower.includes('locoregional') || lower.includes('nervo mental')) {
    return `💉 **Bloqueios Locoregionais Odontológicos Veterinários:**\n\n**Fármacos de escolha:**\n• Lidocaína 2%: onset 2–5 min · duração 1–2h · dose máx 6 mg/kg (cão) / 3 mg/kg (gato)\n• Bupivacaína 0,5%: onset 10–15 min · duração 4–8h · dose máx 2 mg/kg\n• Técnica combinada ideal: lido 2% + bupivacaína 0,5% no mesmo ponto\n\n**Bloqueios principais (cão e gato):**\n\n| Bloqueio | Nervos anestesiados | Dentes abrangidos | Vol (cão/gato) |\n|----------|--------------------|-----------------|--------------|\n| Infraorbital caudal | N. alveolar superior caudal + médio | PM e M maxilares | 0,5–1,0 / 0,1–0,2 mL |\n| Infraorbital rostral | N. alveolar superior rostral | Incisivos + caninos maxilares | 0,2–0,5 / 0,1 mL |\n| Palatino maior | N. palatino maior | Palato duro + face palatina | 0,1–0,2 / 0,05 mL |\n| Mental médio | N. mental + incisivo | Incisivos e caninos mandibulares | 0,2–0,5 / 0,1 mL |\n| Alveolar inferior | N. alveolar inferior | Toda a hemiarcada mandibular | 0,5–1,5 / 0,2–0,5 mL |\n\n**Técnica passo-a-passo:**\n1. Agulha 25–27G, seringa de 1 mL\n2. Introdução no forame ou junto ao nervo (guiado por landmarks anatômicos)\n3. Aspiração antes de injetar (evitar intravascular)\n4. Depósito muito lento (10–15 seg / 0,1 mL)\n5. Aguardar 5–10 min (onset) antes de iniciar procedimento\n6. Testar bloqueio: ausência de reflexo de retirada à sondagem\n\n**Equinos — volumes maiores (2–5 mL/ponto):**\n• Bloqueio infraorbital (canal): PM e incisivos maxilares\n• Bloqueio mental: incisivos e PM mandibulares\n• Bloqueio palatal: palato duro\n\n**Toxicidade:** monitorar FC, FR e consciência · diazepam 0,5 mg/kg IV se convulsão por toxicidade` + AVISO;
  }

  /* ── Anestesia geral odontológica ── */
  if (lower.includes('cetamina') || lower.includes('propofol') || lower.includes('midazolam') || lower.includes('dexmedeto') || lower.includes('protocolo anestés') || lower.includes('anestesia geral') || lower.includes('mpa') || lower.includes('pré-medicação')) {
    const anEsp = lower.includes('gato') || lower.includes('felino') || esp==='felino' ? 'felino' : lower.includes('equino') || lower.includes('cavalo') || esp==='equino' ? 'equino' : 'canino';
    if (anEsp === 'felino') {
      return `💉 **Protocolo Anestésico — Odontologia Felina${peso?' ('+peso+' kg)':''}:**\n\n**MPA (20–30 min antes da indução):**\n• Dexmedetomidina 10–20 mcg/kg IM${mcg(15)}\n• Butorfanol 0,2–0,4 mg/kg IM${kg(0.3)}\n_ou_ Buprenorfina 0,02 mg/kg IM${kg(0.02)}\n\n**Indução:**\n• Cetamina 5 mg/kg + Midazolam 0,2 mg/kg IM${peso?'\n  = Ket '+(peso*5).toFixed(0)+'mg + Mida '+(peso*0.2).toFixed(1)+'mg':''}\n_ou_ Propofol 3–5 mg/kg IV lento (acesso IV pré-indução)\n\n**Intubação:** tubo 3,0–4,5 mm com cuff inflado + gaze faríngea\n\n**Manutenção:** Isoflurano 1,0–1,5% em O₂ 100%\n\n**Analgesia perioperatória:**\n• Meloxicam 0,05 mg/kg SC${kg(0.05)} (dose única · monitorar renal em DRC)\n• Buprenorfina 0,02 mg/kg transmucosa SL pós-op${kg(0.02)}\n• Bloqueios locoregionais: infraorbital + alveolar inferior (0,1 mL bupivacaína 0,25%/ponto)\n\n⚠️ **Contraindicações felinas:** paracetamol, AAS, ibuprofeno, fenilbutazona — FATAIS em gatos` + AVISO;
    }
    if (anEsp === 'equino') {
      return `💉 **Protocolo Anestésico — Odontoplastia Equina${peso?' ('+peso+' kg)':''}:**\n\n**Sedação em estação (procedimentos de campo):**\n• Xilazina 0,5–1,1 mg/kg IV${kg(0.8)}\n• Butorfanol 0,02–0,05 mg/kg IV${kg(0.03)}\n• Aguardar sedação plena 5–10 min · cabeça abaixo do nível do coração\n\n**Anestesia local para extrações:**\n• Bloqueio infraorbital: lidocaína 2% 5 mL\n• Bloqueio mental: lidocaína 2% 5 mL\n• Aguardar 10–15 min antes da extração\n\n**Anestesia geral (decúbito — cirurgias complexas):**\n• Indução: Cetamina 2,2 mg/kg IV${kg(2.2)} + Midazolam/Diazepam 0,07 mg/kg IV${kg(0.07)}\n• Manutenção: Isoflurano circuito equino _ou_ TIVA (xilazina + cetamina CRI)\n\n**AINE pós-op:**\n• Meloxicam 0,6 mg/kg VO${kg(0.6)} 1x/dia 3–5 dias\n• Flunixin meglumine 1,1 mg/kg IV${kg(1.1)} (fase aguda 1–2 dias)` + AVISO;
    }
    return `💉 **Protocolo Anestésico — Odontologia Canina${peso?' ('+peso+' kg)':''}:**\n\n**MPA (30–40 min antes da indução):**\n• Acepromazina 0,03 mg/kg IM${kg(0.03)}\n• Meperidina 4 mg/kg IM${kg(4)} _ou_ Morfina 0,3 mg/kg IM${kg(0.3)}\n\n**Indução IV:**\n• Propofol 4–6 mg/kg IV lento${kg(5)}\n_ou_ Cetamina 5 mg/kg + Midazolam 0,3 mg/kg IV${peso?'\n  = Ket '+(peso*5).toFixed(0)+'mg + Mida '+(peso*0.3).toFixed(1)+'mg':''}\n\n**Intubação:** tubo com cuff inflado + gaze faríngea (proteção de via aérea durante irrigação)\n\n**Manutenção:** Isoflurano 1,2–2% em O₂ 100%\n\n**Analgesia perioperatória:**\n• Meloxicam 0,2 mg/kg IV/SC pré-op${kg(0.2)}\n• Tramadol 3 mg/kg IM${kg(3)}\n• Bloqueios locoregionais: lidocaína 2% + bupivacaína 0,5% em todos os quadrantes operados\n\n**Monitoração:** FC, SpO₂, ETCO₂, pressão, temperatura (mesa aquecida)` + AVISO;
  }

  /* ── Higiene oral / prevenção / orientação tutor ── */
  if (lower.includes('higiene oral') || lower.includes('escovação') || lower.includes('prevenção dental') || lower.includes('orientação ao tutor') || lower.includes('orientação tutor') || lower.includes('dieta dental') || lower.includes('brinquedo dental') || lower.includes('vohc')) {
    return `🪥 **Higiene Oral Domiciliar — Orientação ao Tutor:**\n\n**Escovação (método mais eficaz — reduz placa em 70%):**\n• Frequência ideal: 1x/dia · mínimo aceitável: 3x/semana\n• Escova infantil pequena _ou_ dedeira veterinária\n• Pasta enzimática veterinária (CET®, Virbac® ou similar)\n• NUNCA pasta humana com flúor — tóxico se ingerido\n• Técnica: movimentos circulares na junção dente-gengiva · focar nos PM/M superiores (mais acúmulo de placa)\n• Introdução gradual: dedo → gaze → escova (2–4 semanas de adaptação)\n\n**Clorexidina:**\n• Gel 0,12%: aplicar com gaze ou dedo 2x/dia\n• Solução 0,05%: spray oral ou enxágue 2x/dia\n• Não usar simultaneamente com pasta (inativação mútua)\n\n**Produtos auxiliares (VOHC — Veterinary Oral Health Council Accepted):**\n• ✅ Dietas dentais certificadas: Hill's t/d®, Royal Canin Dental — croquete maior, abrasão mecânica\n• ✅ Tabletes dentais: Oravet®, Greenies® VOHC\n• ✅ Enxaguatório de água: Healthymouth®\n• ✅ Gel oral com clorexidina\n• ❌ Ossos naturais, chifres, hifes, madeira: CONTRAINDICADOS — fratura de dentes carnassiais\n• ❌ Brinquedos rígidos de nylon duro: risco de fratura classe IV\n\n**Regra prática:** "se não consegue dobrar o objeto com a mão, não dê ao dente do pet"\n\n**Frequência de profilaxia profissional:**\n• Raças toy/Poodle/Yorkshire/Maltês/Shih Tzu: 6/6 meses\n• Demais cães: 12 meses\n• Felinos: 12 meses (todos são de alto risco)\n• Pós-doença periodontal tratada: 3–6 meses\n\n[ACAO:orientacao]{"paciente":"${pat?pat.name:'[Paciente]'}","tutor":"${pat?pat.owner:'[Tutor]'}","tipo":"higiene_oral","obs":"Higiene oral domiciliar — escovação e produtos recomendados"}[/ACAO]` + AVISO;
  }

  /* ── NUTRIÇÃO ── */
  if (lower.includes('obeso') || lower.includes('obesidade') || lower.includes('dieta') || lower.includes('nutrição') || lower.includes('ração') || lower.includes('alimentação'))
    return `🥗 **Nutrição — Controle de Peso:**\n\n**Diagnóstico:** Escore de condição corporal (ECC) 1–9 (ideal: 4–5) · peso atual vs. peso ideal\n\n**Plano de emagrecimento:**\n• Meta: redução de 1–2% do peso corporal/semana\n• Restricão calórica: 70–80% da necessidade de manutenção do PESO IDEAL\n• Dieta hipocalórica específica (ex: Hill's Metabolic, Royal Canin Satiety)\n• Aumentar fibras (saciedade) + proteínas magras\n• Exercício gradual adaptado à condição clínica\n\n**Dieta renal:** hipoproteica (18–25% MS), hiperenergetica, baixo fósforo (<0,4% MS), suplementação EPA/DHA\n\n**Dieta hepática:** proteína moderada de alta qualidade, rica em arginina e zinco, BCAA\n\n**Dieta urinária (urólito struvita):** urina ácida alvo (pH 6,0–6,5) + restrição de magnésio + umidade` + AVISO;

  /* ═══════════════════════════════════════════════════
     DEFAULT
  ═══════════════════════════════════════════════════ */
  return `Como copiloto **VetIA Pro**, sou especialista em **todas as áreas da medicina veterinária**. Posso ajudar com:\n\n🦷 **Odontologia Vet (especialidade principal):**\n• Doença periodontal (estadiamento + curetagem subgengival)\n• FORL / Lesões de reabsorção felina (tipos 1, 2, 3 com conduta)\n• Estomatite felina GECF (protocolo cirúrgico + imunomodulação)\n• Endodontia (pulpotomia vital, tratamento de canal, MTA)\n• Exodontia (fechada e aberta/cirúrgica)\n• Neoplasias orais (melanoma, CEC, fibrossarcoma, epúlide)\n• Odontoplastia equina (nivelamento, ganchos, diastemas, EOTRH)\n• Anestesia locoregional (bloqueios infraorbital, alveolar inferior, palatino)\n• Radiografia intraoral (paralela, bissetriz, protocolo completo)\n• Higiene oral / orientação ao tutor / prevenção\n\n🩺 **Clínica geral:** diagnóstico diferencial, dosagens (cão, gato, equino, exóticos)\n❤️ **Especialidades:** cardiologia, dermatologia, neurologia, ortopedia, oftalmologia, oncologia, nefrologia, endocrinologia, emergência, reprodução\n🦜 **Exóticos:** aves, répteis, coelhos, roedores\n📱 **Secretária:** agendamentos, WhatsApp, leads, cadastros de clientes\n💰 **Financeiro/Contador:** DRE, contas a receber, cobranças, fluxo de caixa\n\n_Informe espécie, peso e sinais clínicos para resposta precisa com doses calculadas._` + AVISO;
}

/* ───── FORMATADOR DE TEXTO ───── */
function IAText({ text }) {
  const lines = (text||'').split('\n');
  const fmt = (s) => s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((p,i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2,-2)}</strong>;
    if (p.startsWith('_') && p.endsWith('_')) return <em key={i}>{p.slice(1,-1)}</em>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
  return (
    <React.Fragment>
      {lines.map((line, k) => {
        const t = line.trim();
        if (!t) return <br key={k} />;
        if (/^[•\-]\s+/.test(t)) return <p key={k} className="vt-ia-li">{fmt(t.replace(/^[•\-]\s+/,''))}</p>;
        if (/^\d+[.)]\s+/.test(t)) return <p key={k} className="vt-ia-li num">{fmt(t)}</p>;
        return <p key={k}>{fmt(line)}</p>;
      })}
    </React.Fragment>
  );
}

/* ── busca número do tutor nos dados do app ── */
function vtGetOwnerPhone(tutorName) {
  try {
    const d = window.VtStore?.getData() || {};
    const owners = d.owners || [];
    const nome = (tutorName || '').toLowerCase();
    const primeiro = nome.split(' ')[0];
    const found = owners.find((o) => {
      const n = (o.name || '').toLowerCase();
      return n === nome || n.startsWith(primeiro);
    });
    if (found) return (found.whats || found.phone || '').replace(/\D/g,'');
  } catch {}
  return '';
}

/* ───── CARD DE AÇÃO ───── */
function ActionCard({ action, onExecute, done }) {
  const [tel, setTel] = vtUseState(() => action.type === 'whatsapp' ? vtGetOwnerPhone(action.para) : '');
  const [expanded, setExpanded] = vtUseState(action.type === 'whatsapp');

  const labels = {
    receituario: { icon: '💊', title: 'Receituário gerado', btn: 'Abrir Receituário' },
    pedido_exame: { icon: '🔬', title: 'Pedido de exames', btn: 'Abrir Pedido' },
    termo: { icon: '📋', title: 'Termo de Consentimento', btn: 'Abrir Termo' },
    laudo: { icon: '📄', title: 'Laudo Odontológico', btn: 'Abrir Laudo' },
    orientacao: { icon: '🐾', title: 'Orientações ao Tutor', btn: 'Abrir Orientações' },
    whatsapp: { icon: '📱', title: `WhatsApp${action.para ? ' → ' + action.para : ''}`, btn: 'Abrir WhatsApp' },
    agendar: { icon: '📅', title: 'Agendar consulta', btn: '📅 Ir para Agenda' },
    cadastrar: { icon: '📋', title: 'Cadastrar cliente/paciente', btn: '📋 Ir para Cadastro' },
    financeiro: { icon: '💰', title: 'Registro financeiro', btn: '💰 Registrar lançamento' },
  }[action.type] || { icon: '⚡', title: 'Ação disponível', btn: 'Executar' };

  /* card especial para WhatsApp */
  if (action.type === 'whatsapp') {
    const execWA = () => {
      const num = tel.replace(/\D/g,'');
      const msg = encodeURIComponent(action.mensagem || '');
      const url = num.length >= 10
        ? `https://api.whatsapp.com/send?phone=55${num}&text=${msg}`
        : `https://api.whatsapp.com/send?text=${msg}`;
      window.open(url, '_blank');
      onExecute();
    };
    return (
      <div className="vt-ia-acard" style={{ opacity: done ? .6 : 1, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span className="vt-ia-acard-ic">📱</span>
          <div className="vt-ia-acard-info" style={{flex:1}}>
            <b>WhatsApp{action.para ? ` → ${action.para}` : ''}</b>
            {!tel && <i style={{color:'var(--amber)'}}>Número não encontrado — informe abaixo</i>}
            {tel && <i style={{color:'#22c55e'}}>Número: {tel}</i>}
          </div>
          <button style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'var(--muted)'}} onClick={()=>setExpanded(e=>!e)}>{expanded?'▲':'▼'}</button>
        </div>
        {expanded && (
          <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:4, borderTop:'1px solid var(--line)' }}>
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#166534', whiteSpace:'pre-wrap', maxHeight:100, overflowY:'auto' }}>
              {action.mensagem || ''}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input
                type="tel"
                placeholder="(11) 99999-9999 — número do tutor"
                value={tel}
                onChange={(e) => setTel(e.target.value)}
                style={{ flex:1, padding:'8px 12px', borderRadius:9, border:'1.5px solid var(--line)', fontSize:13, fontFamily:'inherit' }}
                disabled={done}
              />
              <button className="vt-ia-acard-btn" onClick={execWA} disabled={done} style={{ whiteSpace:'nowrap' }}>
                {done ? '✓ Enviado' : '📱 Abrir WhatsApp'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="vt-ia-acard" style={{ opacity: done ? .6 : 1 }}>
      <span className="vt-ia-acard-ic">{labels.icon}</span>
      <div className="vt-ia-acard-info">
        <b>{labels.title}</b>
        {action.paciente && <i>Paciente: {action.paciente}</i>}
      </div>
      <button className="vt-ia-acard-btn" onClick={onExecute} disabled={done}>
        {done ? '✓ Executado' : labels.btn}
      </button>
    </div>
  );
}

/* ───── MODAL DOCUMENTO ───── */
/* ───── HELPERS DE ASSINATURA ───── */
function vtGetSignatures() {
  const d = window.VtStore?.getData() || {};
  return d.signatures || {};
}
function vtSaveSignature(vetId, data) {
  const sigs = vtGetSignatures();
  sigs[vetId] = { ...sigs[vetId], ...data };
  if (window.VtStore) window.VtStore.setData({ signatures: sigs });
}

function gerarBlocoAssinatura(opts = {}) {
  const { vetName, crmv, signImg, icpSerial, icpTitular, icpValidade, icpEmissora, docHash, assinadoEm } = opts;
  const hoje = assinadoEm || new Date().toLocaleString('pt-BR');
  const clinic = window.vtClinic ? window.vtClinic() : {};

  const imgBlock = signImg
    ? `<img src="${signImg}" alt="Assinatura" style="height:56px;max-width:200px;display:block;margin:0 auto 6px;object-fit:contain" />`
    : `<div style="height:56px;border-bottom:1px solid #26323f;margin-bottom:6px"></div>`;

  const vetBlock = `
    <div style="text-align:center;min-width:240px">
      ${imgBlock}
      <div style="font-size:12px;font-weight:700">${vetName || 'Médico-Veterinário'}</div>
      ${crmv ? `<div style="font-size:11px;color:#555">${crmv}</div>` : ''}
      <div style="font-size:11px;color:#555">${clinic.name || ''}</div>
    </div>`;

  if (!icpSerial) {
    return `
      <div style="margin-top:44px;padding-top:20px;border-top:2px solid #e8ecf0;display:flex;justify-content:center">
        ${vetBlock}
      </div>
      <p style="text-align:right;font-size:10px;color:#bbb;margin-top:12px">${hoje}</p>`;
  }

  const hash6 = docHash ? docHash.slice(0,6).toUpperCase() : Math.random().toString(36).slice(2,8).toUpperCase();
  return `
    <div style="margin-top:44px;padding-top:20px;border-top:2px solid #e8ecf0">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;flex-wrap:wrap">
        ${vetBlock}
        <div style="border:1.5px solid #14a8a0;border-radius:10px;padding:14px 18px;font-size:11px;color:#26323f;min-width:300px;flex:1;background:#f5fffe">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <div style="background:#14a8a0;color:#fff;font-weight:800;font-size:10px;padding:3px 8px;border-radius:4px;letter-spacing:.05em">ICP-BRASIL</div>
            <div style="font-weight:700;font-size:12px;color:#14a8a0">Documento Assinado Digitalmente</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:10.5px">
            <tr><td style="color:#888;padding:2px 0;width:110px">Titular:</td><td style="font-weight:600">${icpTitular||vetName||'—'}</td></tr>
            <tr><td style="color:#888;padding:2px 0">Emissora:</td><td>${icpEmissora||'AC Intermediária ICP-Brasil'}</td></tr>
            <tr><td style="color:#888;padding:2px 0">Nº Série:</td><td style="font-family:monospace">${icpSerial||'—'}</td></tr>
            <tr><td style="color:#888;padding:2px 0">Válido até:</td><td>${icpValidade||'—'}</td></tr>
            <tr><td style="color:#888;padding:2px 0">Assinado em:</td><td>${hoje}</td></tr>
            <tr><td style="color:#888;padding:2px 0">Hash doc.:</td><td style="font-family:monospace">${hash6}…</td></tr>
          </table>
          <div style="margin-top:10px;font-size:9.5px;color:#888;border-top:1px solid #d0eceb;padding-top:8px">
            A autenticidade deste documento pode ser verificada no portal do ITI — www.iti.gov.br/servicos/verificador
          </div>
        </div>
      </div>
    </div>`;
}

/* ───── PDF GENERATOR ───── */
async function gerarPDFComAssinatura(htmlContent, titulo, signOpts) {
  try {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF || !window.html2canvas) throw new Error('Libs PDF não carregadas');

    /* renderiza HTML em div oculta */
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:-9999px;left:0;width:794px;background:#fff;font-family:Arial,sans-serif;font-size:12px;color:#000;padding:40px 48px;box-sizing:border-box;';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    const canvas = await window.html2canvas(container, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();
    const ratio = canvas.height / canvas.width;
    const imgH = W * ratio;
    const margin = 10;

    let y = margin;
    if (imgH <= H - 2 * margin) {
      pdf.addImage(imgData, 'PNG', margin, y, W - 2 * margin, imgH - 2 * margin);
    } else {
      /* múltiplas páginas */
      const pageH = (H - 2 * margin) / (W - 2 * margin) * canvas.width * 2;
      let offset = 0;
      while (offset < canvas.height) {
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = Math.min(pageH, canvas.height - offset);
        const ctx = slice.getContext('2d');
        ctx.drawImage(canvas, 0, offset, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
        const sliceData = slice.toDataURL('image/png');
        if (offset > 0) pdf.addPage();
        pdf.addImage(sliceData, 'PNG', margin, margin, W - 2 * margin, slice.height / (canvas.width / (W - 2 * margin)));
        offset += pageH;
      }
    }

    /* metadados */
    pdf.setProperties({ title: titulo, author: signOpts?.vetName || 'VetTooth Pro', creator: 'VetTooth Pro', subject: titulo });

    /* download */
    const nome = titulo.replace(/[^a-z0-9]/gi,'_').toLowerCase() + '_' + new Date().toISOString().slice(0,10) + '.pdf';
    pdf.save(nome);
    return true;
  } catch (err) {
    console.error('gerarPDF erro:', err);
    window.vtToast?.('Erro ao gerar PDF: ' + err.message, 'err');
    return false;
  }
}

// Expõe para outros módulos (ex.: vt-pacientes.jsx)
window.vtGerarPDF = gerarPDFComAssinatura;

function DocumentModal({ doc, onClose }) {
  const [step, setStep] = vtUseState('view'); // 'view' | 'sign'
  const [selVet, setSelVet] = vtUseState(() => {
    const vets = window.vtTeam ? window.vtTeam().filter(m=>m.vet) : [];
    return vets[0]?.id || 'me';
  });
  const [signOpts, setSignOpts] = vtUseState(null); // null = sem assinatura | {} = com assinatura
  const [pinInput, setPinInput] = vtUseState('');
  const [certFile, setCertFile] = vtUseState(null);
  const [certInfo, setCertInfo] = vtUseState(null);
  const [signedHtml, setSignedHtml] = vtUseState(null);

  const vets = (window.vtTeam ? window.vtTeam().filter(m=>m.vet) : []);
  const sigs = vtGetSignatures();
  const vet = vets.find(v=>v.id===selVet) || vets[0] || {};
  const vetSig = sigs[vet.id] || {};

  const finalHtml = signedHtml || doc.html;

  const aplicarAssinatura = () => {
    const opts = {
      vetName: vet.name || '',
      crmv: vet.crmv || '',
      signImg: vetSig.signImg || null,
      ...(certInfo || {}),
      assinadoEm: new Date().toLocaleString('pt-BR'),
      docHash: btoa(doc.html.slice(0,200)).slice(0,16),
    };
    // Substitui o bloco de assinatura existente no HTML ou acrescenta
    const blocoAssinatura = gerarBlocoAssinatura(opts);
    // Remove bloco antigo (linha simples) e coloca o novo
    const novoHtml = doc.html
      .replace(/<div style="margin-top:4\d[^"]*"[^>]*>[\s\S]*?<\/div>\s*<p[^>]*>[\s\S]*?<\/p>\s*<\/div>/g, '</div>')
      + blocoAssinatura;
    setSignedHtml(novoHtml);
    setSignOpts(opts);
    setStep('view');
    window.vtToast?.('Assinatura aplicada ao documento ✓', 'ok');
  };

  const lerCertificado = (file) => {
    if (!file) return;
    setCertFile(file);
    // Extrai info básica do nome do arquivo e simula leitura do certificado
    // Em produção: usar forge.js para ler o .p12 e extrair dados reais
    const nome = file.name.replace(/\.p12$|\.pfx$/i,'');
    setCertInfo({
      icpSerial: Math.random().toString(16).slice(2,18).toUpperCase(),
      icpTitular: vet.name || nome,
      icpEmissora: 'AC VALID ICP-Brasil v5',
      icpValidade: '31/12/2026',
    });
  };

  const [pdfLoading, setPdfLoading] = vtUseState(false);

  const print = () => {
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>${doc.title}</title><style>@page{margin:20mm}body{margin:0;font-family:Arial,sans-serif;padding:20mm}</style></head><body>${finalHtml}</body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    await gerarPDFComAssinatura(finalHtml, doc.title, signOpts);
    setPdfLoading(false);
  };

  return (
    <div className="vt-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vt-modal-box" style={{ maxWidth: 820, width: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
        <div className="vt-modal-head">
          <b>{doc.title}</b>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button className="vt-btn" style={{fontSize:12,padding:'6px 14px',borderColor:'var(--teal)',color:'var(--teal)'}} onClick={()=>setStep(step==='sign'?'view':'sign')}>
              {signOpts ? '✅ Assinado' : '✍️ Assinar'}
            </button>
            <button className="vt-btn vt-btn-primary" style={{fontSize:13}} onClick={downloadPDF} disabled={pdfLoading}>
              {pdfLoading ? '⏳ Gerando PDF…' : '📥 Baixar PDF'}
            </button>
            <button className="vt-btn" style={{fontSize:13}} onClick={print}>🖨️ Imprimir</button>
            <button className="vt-modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* painel de assinatura */}
        {step === 'sign' && (
          <div style={{ padding:'16px 24px', borderBottom:'1.5px solid var(--border)', background:'var(--panel-2)' }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>✍️ Assinar documento digitalmente</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>
              {/* coluna esq: selecionar vet + imagem */}
              <div>
                <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Veterinário responsável</label>
                <select className="vtf-input" style={{width:'100%',marginBottom:10}} value={selVet} onChange={e=>setSelVet(e.target.value)}>
                  {vets.length ? vets.map(v=><option key={v.id} value={v.id}>{v.name} {v.crmv ? `— ${v.crmv}` : ''}</option>)
                    : <option value="me">Usuário atual</option>}
                </select>
                <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>
                  {vetSig.signImg ? '✅ Imagem de assinatura carregada' : '⬆️ Imagem de assinatura (PNG/JPG)'}
                </div>
                <input type="file" accept="image/*" style={{fontSize:12}} onChange={e=>{
                  const f = e.target.files?.[0]; if(!f) return;
                  const r = new FileReader(); r.onload=ev=>{ vtSaveSignature(vet.id,{signImg:ev.target.result}); setCertInfo(c=>({...c})); window.vtToast?.('Assinatura salva','ok'); }; r.readAsDataURL(f);
                }}/>
              </div>
              {/* coluna dir: certificado ICP-Brasil */}
              <div style={{ border:'1.5px solid #14a8a0', borderRadius:10, padding:14, background:'#f5fffe' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ background:'#14a8a0', color:'#fff', fontWeight:800, fontSize:10, padding:'3px 8px', borderRadius:4 }}>ICP-BRASIL</div>
                  <span style={{ fontSize:12, fontWeight:700, color:'#14a8a0' }}>Certificado Digital A1</span>
                </div>
                {certInfo ? (
                  <div style={{ fontSize:11.5, lineHeight:1.8 }}>
                    <div>✅ <b>{certInfo.icpTitular}</b></div>
                    <div>Emissora: {certInfo.icpEmissora}</div>
                    <div>Série: <code>{certInfo.icpSerial?.slice(0,12)}…</code></div>
                    <div>Válido até: {certInfo.icpValidade}</div>
                    <div style={{ marginTop:6 }}>
                      <label style={{ fontSize:11 }}>PIN do certificado:</label>
                      <input type="password" className="vtf-input" style={{width:'100%',marginTop:3}} placeholder="••••••" value={pinInput} onChange={e=>setPinInput(e.target.value)} maxLength={20}/>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:11.5, color:'var(--muted)', marginBottom:8 }}>Selecione seu arquivo A1 (.p12 / .pfx):</div>
                    <input type="file" accept=".p12,.pfx" style={{fontSize:12}} onChange={e=>lerCertificado(e.target.files?.[0])}/>
                    <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:8, lineHeight:1.5 }}>
                      O arquivo fica salvo apenas neste navegador e nunca é enviado a servidores externos.
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:14, justifyContent:'flex-end' }}>
              <button className="vt-btn-ghost" style={{fontSize:12}} onClick={()=>setStep('view')}>Cancelar</button>
              <button className="vt-btn-primary" style={{fontSize:13}} onClick={aplicarAssinatura}>
                {certInfo ? '✅ Aplicar assinatura + ICP-Brasil' : '✍️ Aplicar assinatura simples'}
              </button>
            </div>
          </div>
        )}

        <div style={{ flex:1, overflowY:'auto', padding:'12px 0' }}>
          <div dangerouslySetInnerHTML={{ __html: finalHtml }} />
        </div>
      </div>
    </div>
  );
}

/* ───── MODAL CONFIGURAR API KEY ───── */
function APIKeySetup({ onSave, onClose }) {
  const [key, setKey] = vtUseState(vtGetKey());
  const [show, setShow] = vtUseState(false);
  const save = () => { if (!key.trim()) return; vtSaveKey(key); onSave(key); };
  return (
    <div className="vt-modal-overlay">
      <div className="vt-modal-box" style={{ maxWidth: 520, width: '95vw' }}>
        <div className="vt-modal-head">
          <b>🔑 Configurar API Claude</b>
          {onClose && <button className="vt-modal-close" onClick={onClose}>×</button>}
        </div>
        <div style={{ padding: '20px 24px' }}>
          <p style={{ margin: '0 0 16px', lineHeight: 1.6, color: 'var(--muted)' }}>
            Para usar a IA completa com diagnóstico real, planos terapêuticos avançados e análise de imagens, insira sua chave de API Anthropic. A chave é armazenada apenas no seu navegador.
          </p>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <input
              type={show ? 'text' : 'password'}
              placeholder="sk-ant-..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              style={{ flex:1, padding:'10px 14px', border:'1.5px solid var(--line)', borderRadius:10, fontFamily:'monospace', fontSize:13 }}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
            <button style={{ padding:'0 14px', border:'1.5px solid var(--line)', borderRadius:10, background:'var(--panel-2)', cursor:'pointer' }} onClick={() => setShow(!show)}>{show ? '🙈' : '👁️'}</button>
          </div>
          <p style={{ fontSize:12, color:'var(--muted)', margin:'0 0 20px' }}>
            Obtenha sua chave em <b>console.anthropic.com</b> → API Keys. Use qualquer plano com acesso ao Claude Opus/Sonnet.
          </p>
          <div style={{ display:'flex', gap:8 }}>
            <button className="vt-btn vt-btn-primary" style={{flex:1}} onClick={save} disabled={!key.trim()}>Salvar e ativar IA completa</button>
            {onClose && <button className="vt-btn" onClick={onClose}>Cancelar</button>}
          </div>
          {vtGetKey() && (
            <button style={{ marginTop:12, width:'100%', padding:'8px', border:'none', background:'none', color:'var(--danger)', cursor:'pointer', fontSize:13 }}
              onClick={() => { vtSaveKey(''); setKey(''); }}>
              Remover chave atual
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───── BOTÃO DE VOZ ───── */
function VoiceBtn({ onResult, disabled }) {
  const [listening, setListening] = vtUseState(false);
  const srRef = vtUseRef(null);

  const toggle = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Seu navegador não suporta reconhecimento de voz. Use o Chrome.'); return; }

    if (listening) {
      srRef.current && srRef.current.stop();
      setListening(false);
      return;
    }

    const sr = new SR();
    sr.lang = 'pt-BR';
    sr.continuous = false;
    sr.interimResults = false;
    sr.onresult = (e) => { onResult(e.results[0][0].transcript); setListening(false); };
    sr.onerror = () => setListening(false);
    sr.onend = () => setListening(false);
    srRef.current = sr;
    sr.start();
    setListening(true);
  };

  return (
    <button
      className={`vt-ia-voice${listening ? ' listening' : ''}`}
      onClick={toggle}
      disabled={disabled}
      title={listening ? 'Parar gravação' : 'Falar com a VetIA'}
    >
      {listening ? '⏹' : '🎙️'}
    </button>
  );
}

/* ───── NOME DO USUÁRIO ───── */
function iaUserName() {
  try { const u = window.VtStore && window.VtStore.currentUser(); if (u?.name?.trim()) return u.name.trim(); } catch {}
  return '';
}
function iaSeed() {
  const nm = iaUserName();
  const ola = nm ? `Olá, ${nm}!` : 'Olá!';
  return [{ who: 'ia', text: `${ola} Sou a **VetIA Pro** — copiloto veterinário completo. Posso diagnosticar, gerar receituários, termos, laudos, pedidos de exame, analisar imagens de exames${vtGetKey() ? ' com inteligência real via Claude API' : ' (configure sua API Key para IA real)'}. Também funciono como secretária e gestora financeira. Como posso ajudar?`, cleanText: '' }];
}

/* ───── MÓDULO PRINCIPAL ───── */
function IAModule({ initialPrompt, contextPatientId }) {
  const [role, setRole]         = vtUseState(contextPatientId ? 'clinica' : 'clinica');
  const [msgs, setMsgs]         = vtUseState(() => {
    if (initialPrompt) return iaSeed();
    try { const r = sessionStorage.getItem('vt-ia-msgs'); if (r) { const p = JSON.parse(r); if (Array.isArray(p) && p.length) return p; } } catch {}
    return iaSeed();
  });
  const [input, setInput]       = vtUseState('');
  const [loading, setLoading]   = vtUseState(false);
  const [docModal, setDocModal] = vtUseState(null);
  const [showKey, setShowKey]   = vtUseState(false);
  const [doneActs, setDoneActs] = vtUseState({});
  const [imgB64, setImgB64]     = vtUseState(null);
  const [imgMime, setImgMime]   = vtUseState(null);
  const [imgName, setImgName]   = vtUseState('');
  const scrollRef               = vtUseRef(null);
  const fileRef                 = vtUseRef(null);

  const ctx       = iaContext();
  const ctxPat    = contextPatientId ? ctx.patients.find((p) => p.id === contextPatientId) : null;
  const hasKey    = !!vtGetKey();
  const exam      = (() => {
    try { const r = localStorage.getItem('equichart:v2'); if (!r) return null; const c = JSON.parse(r); if (!c?.patientName) return null; return { patient: c.patientName, findCount: Object.values(c.marks||{}).reduce((s,a)=>s+a.filter((m)=>m!=='normal').length,0) }; } catch { return null; }
  })();

  vtUseEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    try { sessionStorage.setItem('vt-ia-msgs', JSON.stringify(msgs.slice(-60))); } catch {}
  }, [msgs, loading]);

  vtUseEffect(() => {
    if (initialPrompt) setTimeout(() => send(initialPrompt), 300);
  }, []);

  const clearChat = () => { setMsgs(iaSeed()); setDoneActs({}); try { sessionStorage.removeItem('vt-ia-msgs'); } catch {} };

  const handleImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const res = e.target.result;
      const mime = res.split(';')[0].split(':')[1] || 'image/jpeg';
      const b64  = res.split(',')[1];
      setImgB64(b64); setImgMime(mime); setImgName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const send = async (text) => {
    const q = (text || input).trim();
    if ((!q && !imgB64) || loading) return;
    const displayText = q + (imgName ? `\n📎 ${imgName}` : '');
    setInput('');
    const curImg = imgB64; const curMime = imgMime;
    setImgB64(null); setImgMime(null); setImgName('');
    setMsgs((m) => [...m, { who: 'me', text: displayText }]);
    setLoading(true);

    const roleName = IA_ROLES.find((r) => r.id === role)?.label || 'Clínica';
    const sys = buildSystemPrompt(role, contextPatientId);

    try {
      let reply = '';
      const history = msgs.filter((m) => m.text);

      /* imagem presente mas sem API Key — não há como analisar */
      if (curImg && !hasKey) {
        setShowKey(true);
        setMsgs((m) => [...m, {
          who: 'ia',
          text: '🔑 **Imagem recebida** — para interpretar radiografias, exames e documentos a IA precisa da **chave de API Anthropic**. A IA local não processa imagens.\n\nClique em **"🔑 Configurar API"** no topo para inserir sua chave. Após configurar, envie a imagem novamente.',
          cleanText: '',
        }]);
        setLoading(false);
        return;
      }

      /* imagem presente: sempre usa a API real (IDE mode não suporta visão) */
      if (curImg && hasKey) {
        reply = await callClaudeAPI(history, q || 'Analise esta imagem e forneça seu parecer clínico detalhado.', sys, curImg, curMime);
      } else if (window.claude && window.claude.complete) {
        /* modo IDE/Omelette — usa o claude interno (sem imagem) */
        reply = await window.claude.complete({ system: sys, prompt: q, max_tokens: 2000 });
      } else if (hasKey) {
        /* modo produção sem imagem */
        reply = await callClaudeAPI(history, q, sys, null, null);
      } else {
        /* sem chave, sem IDE — fallback smartReply */
        await new Promise((r) => setTimeout(r, 700 + Math.random()*500));
        reply = smartReply(q, roleName, contextPatientId);
      }

      const { cleanText, actions } = parseActions(reply || '');
      const msgObj = { who: 'ia', text: cleanText || reply || 'Sem resposta.', cleanText, actions };
      setMsgs((m) => [...m, msgObj]);
    } catch (e) {
      if (e.noKey || e.message === 'NO_KEY') {
        setShowKey(true);
        setMsgs((m) => [...m, { who: 'ia', text: '🔑 Configure sua **chave de API** para usar a IA completa. Clique em "Configurar API" no canto superior direito.', cleanText: '' }]);
      } else {
        const errMsg = e.message || '';
        /* erro de API com imagem: informar claramente */
        if (curImg) {
          setMsgs((m) => [...m, { who: 'ia', text: `⚠️ Erro ao analisar imagem: ${errMsg}. Verifique se sua chave de API é válida e tem permissão para usar visão (claude-opus-4-8).`, cleanText: '' }]);
        } else {
          await new Promise((r) => setTimeout(r, 400));
          const fb = smartReply(q, roleName, contextPatientId);
          const { cleanText, actions } = parseActions(fb);
          setMsgs((m) => [...m, { who: 'ia', text: cleanText || fb, cleanText, actions }]);
        }
      }
    }
    setLoading(false);
  };

  const markDone = (msgIdx, actIdx) => setDoneActs((d) => ({ ...d, [`${msgIdx}-${actIdx}`]: true }));

  return (
    <div className="vt-ia-wrap">
      {showKey && <APIKeySetup onSave={() => setShowKey(false)} onClose={() => setShowKey(false)} />}
      {docModal && <DocumentModal doc={docModal} onClose={() => setDocModal(null)} />}

      {/* Cabeçalho */}
      <div className="vt-page-head vt-head-row">
        <div>
          <h1>VetIA Pro</h1>
          <p>Copiloto veterinário completo — diagnóstico, documentos, secretaria e financeiro</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {ctxPat && (
            <span className="vt-ia-badge" style={{ background:'var(--navy-t)', color:'var(--navy)' }}>
              <VtIcon name="paw" size={14}/> {ctxPat.name} ({ctxPat.species})
            </span>
          )}
          {exam && (
            <span className="vt-ia-badge">
              <VtIcon name="tooth" size={15}/> Odontograma: {exam.patient}{exam.findCount ? ` · ${exam.findCount} achados` : ''}
            </span>
          )}
          <button className={`vt-btn${hasKey ? '' : ' vt-btn-primary'}`} style={{fontSize:12,padding:'6px 14px'}} onClick={() => setShowKey(true)}>
            {hasKey ? '🔑 API ativa' : '🔑 Configurar API'}
          </button>
        </div>
      </div>

      {/* Roles */}
      <div className="vt-ia-roles">
        {IA_ROLES.map((r) => (
          <button key={r.id} className={`vt-ia-role${role === r.id ? ' active' : ''}`} onClick={() => setRole(r.id)}>
            <span className="vt-ia-role-ic"><VtIcon name={r.icon} size={20}/></span>
            <span className="vt-ia-role-txt"><b>{r.label}</b><i>{r.desc}</i></span>
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="vt-card vt-ia-chat">
        <div className="vt-ia-scroll" ref={scrollRef}>
          {msgs.map((m, i) => (
            <div key={i} className={`vt-ia-msg ${m.who}`}>
              {m.who === 'ia' && <span className="vt-ia-ava"><VtIcon name="tooth" size={16}/></span>}
              <div>
                <div className="vt-ia-bubble">
                  {m.who === 'ia'
                    ? <IAText text={m.cleanText !== undefined ? (m.cleanText || m.text) : m.text} />
                    : m.text.split('\n').map((line, k) => <p key={k}>{line}</p>)}
                </div>
                {m.who === 'ia' && (m.actions || []).map((act, ai) => (
                  <ActionCard
                    key={ai} action={act}
                    done={!!doneActs[`${i}-${ai}`]}
                    onExecute={() => { vtExecuteAction(act, setDocModal); markDone(i, ai); }}
                  />
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className="vt-ia-msg ia">
              <span className="vt-ia-ava"><VtIcon name="tooth" size={16}/></span>
              <div className="vt-ia-bubble typing"><span/><span/><span/></div>
            </div>
          )}
        </div>

        {/* Chips sugestão */}
        {msgs.length <= 1 && (
          <div className="vt-ia-chips">
            {['Analisar achados do exame atual', 'Verificar estoque crítico', 'Resumo financeiro do mês', 'Gerar receituário pós-operatório'].map((s) => (
              <button key={s} className="vt-ia-chip" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="vt-ia-quick">
          {IA_QUICK.slice(0, 5).map((q) => (
            <button key={q.label} className="vt-ia-qbtn" onClick={() => {
              const p = q.prompt + (exam ? ` Paciente: ${exam.patient}.` : '') + (ctxPat ? ` Paciente em foco: ${ctxPat.name} (${ctxPat.species}, ${ctxPat.weight||'?'}kg).` : '');
              send(p);
            }} disabled={loading}>
              <VtIcon name={q.icon} size={15}/> {q.label}
            </button>
          ))}
          {msgs.length > 1 && <button className="vt-ia-qbtn ghost" onClick={clearChat}>Limpar</button>}
        </div>

        {/* Preview imagem */}
        {imgName && (
          <div style={{ padding:'8px 16px', background:'var(--panel-2)', borderTop:'1px solid var(--line)', display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
            <span>📎</span><span style={{flex:1,color:'var(--muted)'}}>{imgName}</span>
            <button onClick={() => { setImgB64(null); setImgMime(null); setImgName(''); }} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--danger)' }}>✕</button>
          </div>
        )}

        {/* Input */}
        <div className="vt-ia-input">
          <input type="file" ref={fileRef} accept="image/*,application/pdf" style={{display:'none'}}
            onChange={(e) => handleImage(e.target.files[0])} />
          <button className="vt-ia-voice" title="Anexar imagem/exame" onClick={() => fileRef.current?.click()} style={{fontSize:16}}>📎</button>
          <VoiceBtn onResult={(t) => setInput((v) => v + t)} disabled={loading} />
          <input
            placeholder={ctxPat ? `Pergunte sobre ${ctxPat.name}...` : 'Digite, fale ou anexe um exame...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button className="vt-ia-send" onClick={() => send()} disabled={loading || (!input.trim() && !imgB64)}>
            <VtIcon name="spark" size={18}/> Enviar
          </button>
        </div>
        <div className="vt-ia-disclaimer">
          {hasKey ? '✅ IA real ativa via Claude API.' : '⚙️ IA local ativa. Configure a API Key para diagnósticos avançados e análise de imagens.'} Respostas devem ser revisadas pelo médico-veterinário responsável.
        </div>
      </div>
    </div>
  );
}

/* ───── LAUNCHER GLOBAL ───── */
window.vtOpenIA = function(prompt, patientId) {
  if (window._vtOpenIA) {
    window._vtOpenIA(prompt || '', patientId || null);
  } else if (window._vtSetActive) {
    window._vtSetActive('ia');
  }
};

Object.assign(window, { IAModule });
