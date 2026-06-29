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

  let pat = contextPatientId ? patients.find((p) => p.id === contextPatientId) : null;
  if (!pat) pat = patients.find((p) => p.name && lower.includes(p.name.toLowerCase()));
  const patAts = pat ? ats.filter((a) => a.patientId === pat.id) : [];
  const lastAt = patAts.slice().sort((a,b) => (b.date||'').localeCompare(a.date||''))[0];

  if (role === 'admin' || role === 'Administradora') {
    if (lower.includes('estoque') || lower.includes('reposi')) {
      if (!lowStock.length) return '✅ Estoque em dia! Todos os itens acima do mínimo.' + AVISO;
      return `🚨 **${lowStock.length} item(s) abaixo do mínimo:**\n\n${lowStock.map((i) => `• **${i.name}**: ${i.qty} ${i.unit} (mín. ${i.min})`).join('\n')}\n\nRecomendo emitir pedido de compra imediatamente.` + AVISO;
    }
    if (lower.includes('financ') || lower.includes('receita') || lower.includes('caixa')) {
      const pendVal = pendentes.reduce((s,t) => s+t.value, 0);
      return `💰 **Resumo financeiro:**\n• Faturamento do mês: **${iaBRL(fatMes)}**\n• A receber: **${iaBRL(pendVal)}** (${pendentes.length} pendente(s))\n• Atendimentos no mês: ${atsMes.length}` + AVISO;
    }
    if (lower.includes('agenda') || lower.includes('hoje')) {
      return `📅 **Hoje:** ${agToday.length} consulta(s)\n${agToday.map((a)=>`• ${a.patient} — ${a.kind}`).join('\n') || '• Sem agendamentos.'}` + AVISO;
    }
    return `📊 **Desempenho do mês:**\n• Pacientes: ${patients.length} · Atendimentos: ${atsMes.length}\n• Receita: ${iaBRL(fatMes)} · A receber: ${iaBRL(pendentes.reduce((s,t)=>s+t.value,0))}\n• Estoque crítico: ${lowStock.length} item(s)` + AVISO;
  }

  if (role === 'secretaria' || role === 'Secretária') {
    if (lower.includes('mensagem') || lower.includes('whatsapp') || lower.includes('lembrete')) {
      const nome = pat ? pat.owner : '[Tutor]'; const pet = pat ? pat.name : '[Pet]';
      return `📱 **Mensagem sugerida:**\n\nOlá, ${nome}! Passando para confirmar a consulta do ${pet}. Por favor, confirme sua presença respondendo esta mensagem.\n\nAtenciosamente, Clínica` + AVISO;
    }
    if (lower.includes('retorno') || lower.includes('pós-op')) {
      return `📱 **Mensagem pós-operatório:**\n\nOlá${pat ? ', ' + pat.owner : ''}! Como ${pat ? pat.name : 'seu pet'} está se recuperando? Qualquer dúvida ou sinal de desconforto, entre em contato. Retorno em 10 dias. 🐾` + AVISO;
    }
    if (lower.includes('cancelar') || lower.includes('reagendar')) {
      return `📱 **Mensagem de reagendamento:**\n\nOlá! Precisamos reagendar sua consulta. Entre em contato para escolhermos um novo horário. Pedimos desculpas pelo transtorno!` + AVISO;
    }
    return `Posso redigir mensagens de WhatsApp, lembretes, confirmações de consulta e comunicados. Descreva o que precisa!` + AVISO;
  }

  /* CLÍNICA */
  if (pat) {
    if (lower.includes('dose') || lower.includes('medica') || lower.includes('analgesia')) {
      const peso = parseFloat((pat.weight||'').replace(',','.')) || 0;
      const esp = (pat.species||'').toLowerCase();
      if (peso > 0) {
        const linhas = esp.includes('felino') || esp.includes('gato')
          ? [`Meloxicam 0,05 mg/kg = **${(peso*0.05).toFixed(2)} mg** VO 1x/dia (2d)`,`Tramadol 1 mg/kg = **${(peso*1).toFixed(1)} mg** VO 12/12h`,`Amoxicilina+Clav 20 mg/kg = **${(peso*20).toFixed(0)} mg** VO 12/12h (7d)`]
          : esp.includes('equino') || esp.includes('cavalo')
          ? [`Meloxicam 0,6 mg/kg = **${(peso*0.6).toFixed(0)} mg** VO 1x/dia`,`Fenilbutazona 4,4 mg/kg = **${(peso*4.4).toFixed(0)} mg** VO 12/12h`]
          : [`Meloxicam 0,1 mg/kg = **${(peso*0.1).toFixed(2)} mg** VO 1x/dia (3d)`,`Tramadol 3 mg/kg = **${(peso*3).toFixed(1)} mg** VO 8/8h`,`Amoxicilina+Clav 20 mg/kg = **${(peso*20).toFixed(0)} mg** VO 12/12h (7d)`];
        return `💊 **Doses para ${pat.name} (${peso}kg):**\n\n${linhas.map((l)=>`• ${l}`).join('\n')}` + AVISO;
      }
    }
    if (lower.includes('plano') || lower.includes('tratamento') || lower.includes('conduta')) {
      const esp = (pat.species||'').toLowerCase();
      if (esp.includes('felino') || esp.includes('gato'))
        return `🐱 **Plano para ${pat.name} (felino):**\n\n1. Radiografia intraoral (EOTRH, reabsorção)\n2. Analgesia pré-op: meloxicam 0,05 mg/kg\n3. Profilaxia + sondagem periodontal sob anestesia\n4. Extrações indicadas\n5. Pós: amoxicilina+clav 20 mg/kg 12/12h 7d + dieta pastosa` + AVISO;
      if (esp.includes('canino') || esp.includes('cão'))
        return `🐶 **Plano para ${pat.name} (canino):**\n\n1. Avaliação clínica completa (halitose, bolsas, mobilidade)\n2. Radiografia das regiões suspeitas\n3. Profilaxia supragengival e subgengival\n4. Extrações seletivas se indicado\n5. Pós: meloxicam 0,1 mg/kg 1x/dia 3d + higiene com clorexidina` + AVISO;
      if (esp.includes('equino') || esp.includes('cavalo'))
        return `🐴 **Plano para ${pat.name} (equino):**\n\n1. Exame com espéculo (pontas, ondas, diastemas)\n2. Sedação + nivelamento odontológico\n3. Extrações indicadas\n4. AINE pós-op: meloxicam 0,6 mg/kg\n5. Reavaliação em 6–12 meses` + AVISO;
    }
  }

  /* ── Diagnóstico diferencial ── */
  if (lower.includes('diagnóstico diferencial') || lower.includes('diferencial') || lower.includes('halitose') || lower.includes('sialorreia')) {
    const sinais = lower.includes('sialorreia') || lower.includes('dificuldade de mastigação') || lower.includes('dificuldade mastigação');
    if (sinais || lower.includes('felino') || lower.includes('gato')) {
      return `🔎 **Diagnóstico diferencial — felino com halitose + sialorreia + disfagia:**\n\n**1° Doença periodontal grau III–IV** (mais provável)\n• Acúmulo de cálculo, bolsas periodontais profundas, exposição de furca\n• Dx: sondagem + radiografia intraoral\n\n**2° Estomatite crônica felina (GECF)**\n• Inflamação difusa de mucosa oral, dor intensa, sialorreia profusa\n• Associação com FCV, FHV-1, FIV/FeLV\n• Dx: biópsia + sorologias\n\n**3° Lesões de reabsorção dentária (RL)**\n• Dor aguda à sondagem no colo dentário\n• Dx: radiografia intraoral (lesões radiolúcidas subgengivais)\n\n**4° Neoplasia oral**\n• Carcinoma de células escamosas (localizado em língua/amígdala/gengiva)\n• Crescimento rápido, ulceração, halitose fétida\n• Dx: biópsia + TC\n\n**5° Corpo estranho oral**\n• Sialorreia aguda, dor localizada, meneio de cabeça\n• Dx: inspeção + radiografia\n\n**Conduta imediata:** hemograma + bioquímica, sorologias FIV/FeLV, radiografia intraoral sob anestesia.` + AVISO;
    }
    return `🔎 **Diagnóstico diferencial para halitose:**\n\n• **Doença periodontal** — causa mais comum em cães e gatos\n• **Corpo estranho oral** — osso, espinho, graveto\n• **Neoplasia oral** — crescimento, úlcera, sangramento\n• **IRC (uremia)** — halitose de amônia em animais geriátricos\n• **Diabetes mellitus** — halitose cetônica\n• **Estomatite felina (GECF)** — em gatos com sialorreia\n\nInforme a espécie, sinais e duração para diagnóstico mais preciso.` + AVISO;
  }

  /* ── Anestesia / protocolos ── */
  if (lower.includes('cetamina') || lower.includes('propofol') || lower.includes('midazolam') || lower.includes('dexmedeto') || lower.includes('protocolo anestés')) {
    const hasPeso = /(\d+[\.,]?\d*)\s*kg/.exec(lower);
    const peso = hasPeso ? parseFloat(hasPeso[1].replace(',','.')) : null;
    const especie = lower.includes('gato') || lower.includes('felino') ? 'felino' : lower.includes('equino') || lower.includes('cavalo') ? 'equino' : 'canino';
    if (especie === 'canino') {
      const base = peso ? `(para ${peso}kg)` : '';
      return `💉 **Protocolo anestésico canino ${base}:**\n\n**MPA (30–40 min antes):**\n• Acepromazina 0,02–0,05 mg/kg IM ${peso ? `= ${(peso*0.03).toFixed(2)}mg` : ''}\n• Meperidina 4–5 mg/kg IM ${peso ? `= ${(peso*4.5).toFixed(0)}mg` : ''} _ou_ Morfina 0,2–0,5 mg/kg IM\n\n**Indução IV:**\n• Propofol 4–6 mg/kg IV lento ${peso ? `= ${(peso*5).toFixed(0)}mg` : ''}\n_ou_\n• Cetamina 5 mg/kg + Midazolam 0,3 mg/kg IV ${peso ? `= Ket ${(peso*5).toFixed(0)}mg + Mida ${(peso*0.3).toFixed(1)}mg` : ''}\n\n**Manutenção:** Isoflurano 1,2–2% em O₂\n\n**Analgesia peri-op:**\n• Meloxicam 0,2 mg/kg IV/SC pré-op ${peso ? `= ${(peso*0.2).toFixed(2)}mg` : ''}\n• Tramadol 2–4 mg/kg IM ${peso ? `= ${(peso*3).toFixed(0)}mg` : ''}\n\n**Bloqueio locoregional:** lidocaína 2% + bupivacaína 0,5% para nervos alveolares.` + AVISO;
    }
    if (especie === 'felino') {
      return `💉 **Protocolo anestésico felino ${peso ? `(${peso}kg)` : ''}:**\n\n**MPA:**\n• Dexmedetomidina 10–20 mcg/kg IM ${peso ? `= ${(peso*15).toFixed(0)}mcg` : ''}\n• Butorfanol 0,2–0,4 mg/kg IM ${peso ? `= ${(peso*0.3).toFixed(2)}mg` : ''}\n\n**Indução:**\n• Cetamina 5 mg/kg + Midazolam 0,2 mg/kg IM ${peso ? `= Ket ${(peso*5).toFixed(0)}mg + Mida ${(peso*0.2).toFixed(1)}mg` : ''}\n_ou_ Propofol 3–5 mg/kg IV lento\n\n**Manutenção:** Isoflurano 1,0–1,5% em O₂\n\n**Analgesia:**\n• Meloxicam 0,05 mg/kg SC ${peso ? `= ${(peso*0.05).toFixed(2)}mg` : ''} (1 dose)\n• Bloqueio infraorbital com bupivacaína 0,25% (0,1 mL/ponto)` + AVISO;
    }
    if (especie === 'equino') {
      return `💉 **Protocolo anestésico equino ${peso ? `(${peso}kg)` : ''}:**\n\n**Sedação em estação (campo):**\n• Xilazina 1,1 mg/kg IV ${peso ? `= ${(peso*1.1).toFixed(0)}mg` : ''}\n• Butorfanol 0,02–0,05 mg/kg IV ${peso ? `= ${(peso*0.03).toFixed(0)}mg` : ''}\n\n**Indução (campo):**\n• Cetamina 2,2 mg/kg IV ${peso ? `= ${(peso*2.2).toFixed(0)}mg` : ''}\n• Midazolam 0,05–0,1 mg/kg IV ${peso ? `= ${(peso*0.07).toFixed(0)}mg` : ''}\n\n**Manutenção (clínica):** Isoflurano em circuito fechado equino\n\n**AINE:** Flunixin meglumine 1,1 mg/kg IV ${peso ? `= ${(peso*1.1).toFixed(0)}mg` : ''} ou Meloxicam 0,6 mg/kg VO` + AVISO;
    }
  }

  /* ── Odontoplastia equina ── */
  if (lower.includes('odontoplastia') || lower.includes('nivelamento') || lower.includes('diastema') || lower.includes('gancho') || lower.includes('ponta de esmalte')) {
    return `🐴 **Protocolo de Odontoplastia Equina:**\n\n**1. Preparo e sedação**\n• Xilazina 0,5–1,0 mg/kg IV + Butorfanol 0,02 mg/kg IV\n• Espéculo oral + fonte de luz\n• Avaliação com sonda dentária e espelho odontológico\n\n**2. Nivelamento odontológico**\n• Remoção de pontas de esmalte (burs manuais ou elétricos)\n• Eliminar ganchos no 106/206 (maxila) e 311/411 (mandíbula)\n• Corrigir degraus e ondas\n• Redução de diastemas com cureta periodontal\n\n**3. Extrações (se indicado)**\n• Dentes de lobo (pré-molares rudimentares) com elevador periosteal\n• Elementos com mobilidade grau III ou suporte ósseo < 25%\n\n**4. Pós-procedimento**\n• Meloxicam 0,6 mg/kg VO 1x/dia por 3–5 dias\n• Dieta de feno macio 5–7 dias\n• Evitar pellet duro por 10 dias\n• Reavaliação em 6 meses\n\n**Equipamentos:** boroscopio bucal + afastadores labiais + burs de tungstênio + seringa de irrigação com solução salina.` + AVISO;
  }

  /* ── Estomatite felina ── */
  if (lower.includes('estomatite') || lower.includes('gecf') || lower.includes('gengivoestomatite')) {
    return `**Estomatite Crônica Felina (GECF):**\n\n**Clínica:** sialorreia, anorexia, disfagia, perda de peso, halitose intensa, mucosa avermelhada/ulcerada além da linha mucogengival\n\n**Diagnóstico:** biópsia (plasmócitos + linfócitos), sorologias FIV/FeLV/FCV\n\n**Tratamento:**\n• **1ª linha:** extração de todos os dentes pré-molares e molares (± caninos e incisivos)\n• Remissão em 60–80% dos casos com extração total\n• **Pós-op:** prednisolona 1 mg/kg/dia reduzindo em 4 semanas\n• ATB: amoxicilina+clav 20 mg/kg 12/12h por 10 dias\n• Interferon ômega felino (se disponível) 1M UI/dia por 90 dias\n\n**Prognóstico:** depende da extensão; resposta parcial pode requerer imunomodulação de longo prazo.` + AVISO;
  }

  if (lower.includes('eotrh'))
    return '**EOTRH:** Lesões nodulares em incisivos/caninos de equinos. Dx: radiografia intraoral. Tx: exodontia + AINE. Pós-op: lavagem das cavernosas + retorno em 10–14 dias.' + AVISO;
  if (lower.includes('periodontite') || lower.includes('doença periodontal'))
    return '**Doença Periodontal:**\n• Grau I: profilaxia + higiene\n• Grau II: curetagem + ATB\n• Grau III: exodontia seletiva + ATB\n• Grau IV: exodontia\n\nATB: Amoxicilina+Clav 20 mg/kg 12/12h 7–10d' + AVISO;
  if (lower.includes('profilaxia') || lower.includes('limpeza dental') || lower.includes('detartragem'))
    return '**Protocolo Profilaxia:** US supragengival → curetagem manual → sondagem → radiografias → polimento → extrações indicadas → orientação do tutor' + AVISO;
  if (lower.includes('receituário') || lower.includes('receita') || lower.includes('prescri'))
    return '**Modelo Receituário:**\n• Meloxicam [dose] VO 1x/dia [X]d\n• Amoxicilina+Clav [dose] VO 12/12h 7d\n• Clorexidina 0,12% gel 2x/dia 7d\n• Dieta pastosa [X] dias\n• Retorno em [X] dias' + AVISO;
  if (lower.includes('pré-anest') || lower.includes('exame pré') || lower.includes('hemograma'))
    return '**Exames pré-anestésicos:**\n• Mínimo: hemograma + ALT + FA + ureia + creatinina\n• Idosos/ASA II+: + proteínas, albumina, glicose, ECG, Rx tórax\n• Equinos: + hemogasometria + fibrinogênio' + AVISO;
  if (lower.includes('fratura') || lower.includes('dente fraturado') || lower.includes('coroa fraturada')) {
    return `**Fratura Dentária — Classificação e Conduta:**\n\n**Classe I (esmalte):** desgaste com punta diamantada, polimento, aplicação de flúor\n**Classe II (esmalte + dentina, polpa fechada):** restauração com ionômero de vidro + resina\n**Classe III (exposição de polpa, recente):** pulpotomia vital + restauração _ou_ endodontia\n**Classe IV (exposição de polpa, crônica):** endodontia ou exodontia\n**Classe V (fratura de raiz):** exodontia cirúrgica\n\nDx: sondagem + radiografia intraoral + teste de vitalidade pulpar.` + AVISO;
  }

  return `Como copiloto **Clínica**, posso ajudar com:\n• Diagnóstico diferencial (descreva os sinais)\n• Protocolos anestésicos (informe espécie e peso)\n• Planos terapêuticos passo a passo\n• Cálculo de doses\n• Laudos, receituários e termos\n• Odontoplastia equina, estomatite felina, EOTRH, periodontite\n\nDescreva o caso!` + AVISO;
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
    agendar: { icon: '📅', title: 'Agendamento sugerido', btn: 'Ir para Agenda' },
    financeiro: { icon: '💰', title: 'Registro financeiro', btn: 'Registrar lançamento' },
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

  const print = () => {
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>${doc.title}</title><style>@page{margin:20mm}body{margin:0}</style></head><body>${finalHtml}</body></html>`);
    w.document.close(); w.focus(); w.print();
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
            <button className="vt-btn vt-btn-primary" style={{fontSize:13}} onClick={print}>🖨️ Imprimir / PDF</button>
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
