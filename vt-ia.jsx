/* ============================================================
   VetTooth Pro — IA Assistente (copiloto clínico)
   Motor smartReply lê dados reais do VtStore.
   window.claude.complete usado quando disponível (API real).
   ============================================================ */
const IA_SUGGESTIONS = [
  'Resumo dos pacientes críticos desta semana',
  'Sugerir plano terapêutico para EOTRH felino',
  'Escrever orientação de pós-operatório de extração',
  'Quais itens de estoque precisam de reposição urgente?',
];

const IA_QUICK = [
  { label: 'Analisar achados', icon: 'tooth', prompt: 'Analise os achados do exame odontológico atual e organize uma interpretação clínica estruturada.' },
  { label: 'Sugerir tratamento', icon: 'stethoscope', prompt: 'Com base nos achados clínicos, sugira um plano de tratamento odontológico passo a passo.' },
  { label: 'Calcular dose', icon: 'syringe', prompt: 'Ajude a calcular a dose de sedação/medicação. Considere espécie, peso e fármaco — me pergunte o que faltar.' },
  { label: 'Gerar laudo', icon: 'receipt', prompt: 'Gere um laudo odontológico formal a partir dos achados do exame atual, pronto para revisão e assinatura.' },
  { label: 'Diagnóstico diferencial', icon: 'spark', prompt: 'Liste os principais diagnósticos diferenciais para o quadro odontológico descrito, do mais ao menos provável.' },
];

const IA_ROLES = [
  { id: 'clinica', label: 'Clínica', icon: 'stethoscope', desc: 'Diagnóstico assistido, plano terapêutico, laudos' },
  { id: 'secretaria', label: 'Secretária', icon: 'calendar', desc: 'Mensagens a tutores, WhatsApp, lembretes' },
  { id: 'admin', label: 'Administradora', icon: 'chart', desc: 'Fluxo de caixa, estoque, produtividade' },
];

/* lê o odontograma salvo (EquiChart) */
function iaExamData() {
  try {
    const raw = localStorage.getItem('equichart:v2');
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c || !c.patientName) return null;
    const findCount = Object.values(c.marks || {}).reduce((s, a) => s + a.filter((m) => m !== 'normal').length, 0);
    return { patient: c.patientName, findCount };
  } catch (e) { return null; }
}

/* snapshot do VtStore para o contexto de IA */
function iaContext() {
  try {
    const d = (window.VtStore && window.VtStore.getData()) || {};
    const patients = d.patients || [];
    const ats = d.atendimentos || [];
    const inv = d.inventory || [];
    const fin = d.fin || { tx: [] };
    const agenda = d.agendaAppts || [];
    const today = new Date().toISOString().slice(0, 10);
    const mPrefix = today.slice(0, 7);
    const brToYM = (br) => { const m = (br||'').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}` : (br||'').slice(0,7); };

    const lowStock = inv.filter((i) => Number(i.qty) < Number(i.min));
    const pendentes = (fin.tx || []).filter((t) => t.kind === 'receita' && t.status !== 'pago');
    const recMes = (fin.tx || []).filter((t) => t.kind === 'receita' && t.status === 'pago' && (t.paidAt || t.date || '').slice(0, 7) === mPrefix);
    const fatMes = recMes.reduce((s, t) => s + (Number(t.value) || 0), 0);
    const agToday = agenda.filter((a) => a.date === today);
    const atsMes = ats.filter((a) => brToYM(a.date) === mPrefix);
    const user = window.VtStore && window.VtStore.currentUser ? window.VtStore.currentUser() : null;

    return { patients, ats, inv, fin, agenda, today, mPrefix, lowStock, pendentes, recMes, fatMes, agToday, atsMes, user };
  } catch (e) { return { patients: [], ats: [], inv: [], fin: { tx: [] }, agenda: [], today: '', mPrefix: '', lowStock: [], pendentes: [], recMes: [], fatMes: 0, agToday: [], atsMes: [], user: null }; }
}

/* formatação de moeda */
function iaBRL(n) { return 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/* =====================================================================
   MOTOR DE RESPOSTAS — usa dados reais do VtStore
   ===================================================================== */
function smartReply(q, role, contextPatientId) {
  const lower = q.toLowerCase();
  const ctx = iaContext();
  const { patients, ats, inv, fin, agenda, lowStock, pendentes, fatMes, agToday, atsMes } = ctx;
  const AVISO = '\n\n⚠️ Sugestão da VetIA — revise antes de validar clinicamente.';

  /* ---------- paciente mencionado na pergunta ou por contexto ---------- */
  let pat = contextPatientId ? patients.find((p) => p.id === contextPatientId) : null;
  if (!pat) pat = patients.find((p) => p.name && lower.includes(p.name.toLowerCase()));

  const patAts = pat ? ats.filter((a) => a.patientId === pat.id) : [];
  const lastAt = patAts.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

  /* ---------- ROLE: ADMINISTRADORA ---------- */
  if (role === 'Administradora') {
    if (lower.includes('estoque') || lower.includes('insumo') || lower.includes('reposi')) {
      if (lowStock.length === 0) return '✅ Estoque em dia! Todos os itens estão acima do mínimo configurado.' + AVISO;
      const lista = lowStock.map((i) => `• **${i.name}**: ${i.qty} ${i.unit} (mín. ${i.min})`).join('\n');
      return `🚨 **${lowStock.length} item(s) abaixo do mínimo:**\n\n${lista}\n\nRecomendo emitir pedido de compra para os itens críticos antes do próximo atendimento.` + AVISO;
    }
    if (lower.includes('financ') || lower.includes('receita') || lower.includes('caixa') || lower.includes('faturamento')) {
      const total = (fin.tx || []).filter((t) => t.kind === 'receita').reduce((s, t) => s + t.value, 0);
      const pendVal = pendentes.reduce((s, t) => s + t.value, 0);
      return `💰 **Resumo financeiro:**\n• Faturamento do mês: **${iaBRL(fatMes)}**\n• A receber: **${iaBRL(pendVal)}** (${pendentes.length} lançamento(s) pendente(s))\n• Total histórico em receitas: ${iaBRL(total)}\n\nSugestão: priorize a cobrança dos ${pendentes.length} lançamento(s) pendente(s) para fechar o caixa.` + AVISO;
    }
    if (lower.includes('agenda') || lower.includes('hoje') || lower.includes('atendimento') && lower.includes('hoje')) {
      return `📅 **Hoje (${ctx.today}):** ${agToday.length} agendamento(s) confirmado(s).\n${agToday.map((a) => `• ${a.patient} — ${a.kind} às ${String(Math.floor(a.start || 0)).padStart(2,'0')}:${(a.start||0)%1?'30':'00'}`).join('\n') || '• Nenhum agendamento.'}` + AVISO;
    }
    if (lower.includes('produtiv') || lower.includes('desempenho') || lower.includes('resumo')) {
      return `📊 **Desempenho do mês:**\n• Pacientes cadastrados: **${patients.length}**\n• Atendimentos no mês: **${atsMes.length}**\n• Receita do mês: **${iaBRL(fatMes)}**\n• Itens críticos no estoque: **${lowStock.length}**\n• Agendamentos hoje: **${agToday.length}**` + AVISO;
    }
  }

  /* ---------- ROLE: SECRETÁRIA ---------- */
  if (role === 'Secretária') {
    if (lower.includes('lembrete') || lower.includes('mensagem') || lower.includes('whatsapp') || lower.includes('tutor')) {
      if (pat) {
        return `📱 **Mensagem sugerida para ${pat.owner || 'o tutor'}:**\n\nOlá, ${pat.owner || 'tutor'}! Passando para lembrá-lo(a) de que ${pat.name} tem consulta agendada. Por favor, confirme sua presença respondendo esta mensagem.\n\nAtenciosamente,\n${ctx.user ? ctx.user.name : 'VetTooth Pro'}` + AVISO;
      }
      return `📱 **Modelo de lembrete de consulta:**\n\nOlá! Passando para confirmar o agendamento do seu pet. Por favor, responda confirmando sua presença ou entre em contato para reagendar.\n\nAtenciosamente, Clínica VetTooth` + AVISO;
    }
    if (lower.includes('retorno') || lower.includes('pós-op') || lower.includes('pos-op') || lower.includes('pós op')) {
      const nomePet = pat ? pat.name : '[nome do animal]';
      const nomeOwner = pat ? (pat.owner || 'tutor') : 'tutor';
      return `📱 **Mensagem de acompanhamento pós-operatório:**\n\nOlá, ${nomeOwner}! Como o ${nomePet} está se recuperando? Qualquer dúvida ou sinal como falta de apetite, letargia ou inchaço na região operada, entre em contato imediatamente. O retorno está agendado para daqui a 10 dias. Cuide bem! 🐾` + AVISO;
    }
    if (lower.includes('prontuário') || lower.includes('resumo') || lower.includes('histórico')) {
      if (pat && lastAt) {
        return `📋 **Resumo do histórico de ${pat.name}:**\n• Espécie: ${pat.species} · ${pat.breed}\n• Tutor: ${pat.owner}\n• Último atendimento: ${lastAt.date} — ${lastAt.type || lastAt.procedure || 'consulta'}\n• Total de atendimentos: ${patAts.length}` + AVISO;
      }
    }
    if (lower.includes('cancelamento') || lower.includes('cancelar') || lower.includes('reagendar')) {
      return `📱 **Mensagem de cancelamento/reagendamento:**\n\nOlá! Infelizmente precisamos cancelar o agendamento previsto. Pedimos desculpas pelo inconveniente e gostaríamos de reagendar para a data que melhor lhe convir. Entre em contato para escolher um novo horário. Obrigado pela compreensão!` + AVISO;
    }
  }

  /* ---------- ROLE: CLÍNICA (default) ---------- */

  /* Paciente específico com contexto */
  if (pat) {
    if (lower.includes('histórico') || lower.includes('resumo') || lower.includes('prontuário') || lower.includes('paciente')) {
      const atsSummary = patAts.slice(0,3).map((a) => `• ${a.date}: ${a.type || a.procedure || 'consulta'} — ${a.notes || 'sem observações'}`).join('\n') || '• Sem atendimentos registrados.';
      return `🐾 **${pat.name}** (${pat.species} · ${pat.breed} · ${pat.sex})\n**Tutor:** ${pat.owner}\n**Peso:** ${pat.weight || 'não informado'}\n\n**Últimos atendimentos:**\n${atsSummary}\n\nTotal de consultas: ${patAts.length}` + AVISO;
    }
    if (lower.includes('plano') || lower.includes('tratamento') || lower.includes('conduta')) {
      const especie = (pat.species || '').toLowerCase();
      if (especie.includes('felino') || especie.includes('gato')) {
        return `🐱 **Plano terapêutico sugerido para ${pat.name} (felino):**\n\n1. **Avaliação radiográfica intraoral** — descartar EOTRH, lesões de reabsorção, periodontite\n2. **Analgesia pré-operatória** — meloxicam 0,05 mg/kg VO 12h antes\n3. **Profilaxia odontológica** sob anestesia + sondagem periodontal\n4. **Extração** dos elementos afetados (se indicado)\n5. **Pós-operatório:** amoxicilina + clavulanato 20 mg/kg 12/12h por 7 dias, dieta pastosa 7 dias\n6. **Retorno em 10–14 dias`  + AVISO;
      }
      if (especie.includes('canino') || especie.includes('cão')) {
        return `🐶 **Plano terapêutico sugerido para ${pat.name} (canino):**\n\n1. **Avaliação clínica completa** — halitose, mobilidade dentária, profundidade de bolsa\n2. **Radiografia intraoral** das regiões comprometidas\n3. **Profilaxia supragengival e subgengival** sob anestesia\n4. **Extração seletiva** dos elementos sem suporte periodontal\n5. **Antibioticoterapia** se houver infecção: amoxicilina 22 mg/kg 12/12h\n6. **Dieta pastosa** por 5–7 dias + higiene oral diária com clorexidina 0,12%` + AVISO;
      }
      if (especie.includes('equino') || especie.includes('cavalo')) {
        return `🐴 **Plano terapêutico sugerido para ${pat.name} (equino):**\n\n1. **Exame odontológico completo com espéculo** — pontas de esmalte, ondas, diastemas\n2. **Nivelamento odontológico (odontoplastia)** sob sedação\n3. **Extração** de elementos com mobilidade ou infecção\n4. **AINE pós-procedimento** — meloxicam ou flunixin meglumine\n5. **Reavaliação em 6–12 meses** ou conforme achados` + AVISO;
      }
    }
    if (lower.includes('dose') || lower.includes('medica') || lower.includes('analgesia') || lower.includes('anestesia')) {
      const peso = parseFloat((pat.weight || '').replace(',', '.')) || 0;
      const especie = (pat.species || '').toLowerCase();
      const linhas = [];
      if (peso > 0) {
        if (especie.includes('felino') || especie.includes('gato')) {
          linhas.push(`**Meloxicam** (gato, 0,05 mg/kg): ${(peso * 0.05).toFixed(2)} mg VO — 1x/dia por 2 dias`);
          linhas.push(`**Tramadol** (gato, 1 mg/kg): ${(peso * 1).toFixed(1)} mg VO — 12/12h`);
          linhas.push(`**Amoxicilina + Clavulanato** (20 mg/kg): ${(peso * 20).toFixed(0)} mg VO — 12/12h por 7 dias`);
        } else if (especie.includes('canino') || especie.includes('cão')) {
          linhas.push(`**Meloxicam** (cão, 0,1 mg/kg): ${(peso * 0.1).toFixed(2)} mg VO — 1x/dia por 3 dias`);
          linhas.push(`**Tramadol** (cão, 2–5 mg/kg): ${(peso * 3).toFixed(1)} mg VO — 8/8h`);
          linhas.push(`**Amoxicilina + Clavulanato** (20 mg/kg): ${(peso * 20).toFixed(0)} mg VO — 12/12h por 7 dias`);
        } else {
          linhas.push(`**Meloxicam** (equino, 0,6 mg/kg): ${(peso * 0.6).toFixed(0)} mg VO — 1x/dia`);
          linhas.push(`**Fenilbutazona** (equino, 4,4 mg/kg): ${(peso * 4.4).toFixed(0)} mg VO — 12/12h`);
        }
        return `💊 **Cálculo de doses para ${pat.name} (${peso} kg):**\n\n${linhas.join('\n')}\n\n⚠️ Doses são sugestões baseadas no peso cadastrado. Ajuste conforme avaliação clínica individual.` + AVISO;
      }
      return `💊 Informe o peso de ${pat.name} para calcular as doses corretamente. O peso cadastrado não foi encontrado.` + AVISO;
    }
  }

  /* ---------- Perguntas gerais sem paciente específico ---------- */
  if (lower.includes('eotrh')) {
    return '**EOTRH (Equine Odontoclastic Tooth Resorption and Hypercementosis):**\n\n**Achados clínicos:** lesões nodulares nos dentes incisivos/caninos, dor à manipulação, halitose, perda de peso.\n\n**Diagnóstico:** radiografia intraoral essencial (lesões de reabsorção + hipercementose).\n\n**Tratamento:** exodontia dos elementos afetados é o padrão-ouro. Analgesia com AINE pré e pós-operatório.\n\n**Pós-operatório:**\n1. Dieta pastosa ou pasto maciço 7–14 dias\n2. Meloxicam 0,6 mg/kg 1x/dia por 5 dias\n3. Limpeza das cavernosas com solução salina 2x/dia\n4. Reavaliação em 10–14 dias' + AVISO;
  }
  if (lower.includes('doença periodontal') || lower.includes('periodontite') || lower.includes('gengivite')) {
    return '**Doença Periodontal — Protocolo Clínico:**\n\n**Grau I (Gengivite):** profilaxia + higiene oral domiciliar\n**Grau II (Periodontite leve):** profilaxia + curetagem subgengival + antibiótico\n**Grau III (Periodontite moderada):** idem + reavaliação radiográfica + exodontia seletiva\n**Grau IV (Periodontite grave):** exodontia dos elementos sem suporte\n\n**Antibioticoterapia sugerida:** amoxicilina + clavulanato 20 mg/kg 12/12h por 7–10 dias\n\n**Higiene domiciliar:** escovação 3x/semana com gel de clorexidina 0,12%' + AVISO;
  }
  if (lower.includes('profilaxia') || lower.includes('limpeza dental') || lower.includes('detartragem')) {
    return '**Protocolo de Profilaxia Odontológica:**\n\n1. **Pré-anestésico:** avaliação ASA, exames (hemograma + bioquímica)\n2. **Anestesia:** indução + manutenção inalatória\n3. **Remoção do cálculo:** ultrassom supragengival → instrumentação manual subgengival\n4. **Sondagem periodontal:** todas as faces de todos os elementos\n5. **Radiografia:** elementos suspeitos (reabsorção, furca, ápice)\n6. **Polimento** com pasta de baixa abrasividade\n7. **Exodontia** dos elementos sem viabilidade\n8. **Orientação do tutor:** higiene domiciliar + retorno em 6–12 meses' + AVISO;
  }
  if (lower.includes('pré-anestés') || lower.includes('pre-anest') || lower.includes('exames') || lower.includes('hemograma')) {
    return '**Pedido de Exames Pré-Anestésicos:**\n\n**Mínimo (ASA I, jovem saudável):**\n• Hemograma completo\n• ALT, FA, ureia, creatinina\n\n**Completo (ASA II ou III / idosos):**\n• Hemograma + coagulograma\n• Bioquímica completa (proteínas totais, albumina, glicose)\n• Eletrocardiograma\n• Radiografia torácica\n\n**Equinos:** adicionalmente hemogasometria e fibrinogênio' + AVISO;
  }
  if (lower.includes('receituário') || lower.includes('receita') || lower.includes('prescri')) {
    return '**Modelo de Receituário Odontológico Pós-Procedimento:**\n\n**Analgesia:**\n• Meloxicam [dose/kg] — VO — 1x/dia — [X] dias\n• Dipirona [dose/kg] — VO — 8/8h — 3 dias (se necessário)\n\n**Antibioticoterapia (se infecção):**\n• Amoxicilina + Clavulanato [dose] — VO — 12/12h — 7 dias\n\n**Higiene oral:**\n• Clorexidina 0,12% gel — aplicar 2x/dia na região operada — 7 dias\n\n**Dieta:** pastosa por [X] dias\n**Retorno:** [X] dias' + AVISO;
  }
  if (lower.includes('resumo') || lower.includes('crítico') || lower.includes('critico') || lower.includes('atenção')) {
    const crits = patients.filter((p) => {
      const pAts = ats.filter((a) => a.patientId === p.id);
      return pAts.some((a) => (a.notes || '').toLowerCase().includes('crítico') || (a.notes || '').toLowerCase().includes('urgente') || (a.status === 'em_andamento'));
    });
    const stockAlerts = lowStock.map((i) => `• Estoque crítico: ${i.name} (${i.qty} ${i.unit})`).join('\n');
    const todayApts = agToday.length > 0 ? `• ${agToday.length} agendamento(s) hoje` : '• Nenhum agendamento hoje';
    const pendVal = pendentes.reduce((s, t) => s + t.value, 0);
    return `📋 **Resumo da clínica:**\n\n${todayApts}\n• ${patients.length} pacientes cadastrados · ${ats.length} atendimentos\n• Receita do mês: ${iaBRL(fatMes)}\n• A receber: ${iaBRL(pendVal)}\n${lowStock.length ? `\n🚨 Alertas de estoque:\n${stockAlerts}` : '\n✅ Estoque em dia'}` + AVISO;
  }

  /* fallback */
  const roleLabel = { clinica: 'Clínica', secretaria: 'Secretária', admin: 'Administradora' }[role] || 'Clínica';
  return `Como copiloto **${roleLabel}**, posso ajudar com:\n\n${role === 'clinica' ? '• Diagnóstico assistido e diagnóstico diferencial\n• Planos terapêuticos passo a passo\n• Cálculo de doses (informe espécie e peso)\n• Geração de laudos e receituários\n• Orientações pós-operatórias' : role === 'secretaria' ? '• Mensagens de lembrete para tutores\n• Modelos de WhatsApp para confirmação de consulta\n• Orientações de pós-operatório para enviar ao tutor\n• Resumo de histórico do paciente' : '• Análise financeira do mês\n• Alertas de estoque crítico\n• Resumo de produtividade\n• Agenda do dia'}\n\nDescreva o caso ou faça sua pergunta!` + AVISO;
}

/* formatação leve das respostas: **negrito** e listas */
function IAText({ text }) {
  const lines = (text || '').split('\n');
  const fmt = (s) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
  );
  return (
    <React.Fragment>
      {lines.map((line, k) => {
        const t = line.trim();
        if (/^[•\-]\s+/.test(t)) return <p key={k} className="vt-ia-li">{fmt(t.replace(/^[•\-]\s+/, ''))}</p>;
        if (/^\d+[.)]\s+/.test(t)) return <p key={k} className="vt-ia-li num">{fmt(t)}</p>;
        return <p key={k}>{fmt(line)}</p>;
      })}
    </React.Fragment>
  );
}

function iaUserName() {
  try { const u = window.VtStore && window.VtStore.currentUser(); if (u && u.name && u.name.trim()) return u.name.trim(); } catch (e) {}
  return '';
}
function iaSeed() {
  const nm = iaUserName();
  const ola = nm ? `Olá, ${nm}!` : 'Olá!';
  return [
    { who: 'ia', text: `${ola} Sou a **VetIA**, copiloto do VetTooth Pro. Acesso os dados reais da clínica — pacientes, estoque, financeiro e agenda — para respostas contextualizadas. Como posso ajudar?` },
  ];
}

/* =====================================================================
   COMPONENTE PRINCIPAL
   Props: initialPrompt (string), contextPatientId (string)
   ===================================================================== */
function IAModule({ initialPrompt, contextPatientId }) {
  const [role, setRole] = vtUseState(() => {
    if (contextPatientId) return 'clinica';
    return 'clinica';
  });
  const [msgs, setMsgs] = vtUseState(() => {
    if (initialPrompt) return iaSeed();
    try { const raw = sessionStorage.getItem('vt-ia-msgs'); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) return p; } } catch (e) {}
    return iaSeed();
  });
  const exam = iaExamData();
  const [input, setInput] = vtUseState('');
  const [loading, setLoading] = vtUseState(false);
  const scrollRef = vtUseRef(null);

  /* auto-enviar initialPrompt ao montar */
  vtUseEffect(() => {
    if (initialPrompt) {
      setTimeout(() => send(initialPrompt), 200);
    }
  }, []);

  vtUseEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    try { sessionStorage.setItem('vt-ia-msgs', JSON.stringify(msgs.slice(-40))); } catch (e) {}
  }, [msgs, loading]);

  const clearChat = () => { setMsgs(iaSeed()); try { sessionStorage.removeItem('vt-ia-msgs'); } catch (e) {} };

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setMsgs((m) => [...m, { who: 'me', text: q }]);
    setLoading(true);

    const roleName = IA_ROLES.find((r) => r.id === role)?.label || 'Clínica';
    const ctx = iaContext();
    const patientsList = ctx.patients.slice(0, 10).map((p) => `${p.name} (${p.species}, ${p.sex}, ${p.weight||'?'}kg, tutor: ${p.owner})`).join('; ');
    const sys = `Você é o copiloto de IA "${roleName}" do VetTooth Pro, sistema de odontologia veterinária. Responda em português do Brasil, de forma clínica e objetiva. Nunca dê diagnóstico definitivo — apresente hipóteses para revisão do médico-veterinário. Dados atuais da clínica: ${ctx.patients.length} pacientes (${patientsList.slice(0,300)}). Atendimentos este mês: ${ctx.atsMes.length}. Itens críticos no estoque: ${ctx.lowStock.map((i) => i.name).join(', ') || 'nenhum'}. Receita do mês: R$ ${ctx.fatMes.toFixed(2)}. ${contextPatientId ? 'Paciente em foco: ' + (ctx.patients.find((p) => p.id === contextPatientId)?.name || 'desconhecido') : ''}`;

    try {
      if (window.claude && window.claude.complete) {
        const reply = await window.claude.complete({ system: sys, prompt: q, max_tokens: 700 });
        setMsgs((m) => [...m, { who: 'ia', text: (reply || '').trim() || 'Não consegui gerar uma resposta agora.' }]);
      } else {
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
        setMsgs((m) => [...m, { who: 'ia', text: smartReply(q, roleName, contextPatientId) }]);
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 400));
      setMsgs((m) => [...m, { who: 'ia', text: smartReply(q, roleName, contextPatientId) }]);
    }
    setLoading(false);
  };

  /* paciente em contexto */
  const ctx = iaContext();
  const ctxPatient = contextPatientId ? ctx.patients.find((p) => p.id === contextPatientId) : null;

  return (
    <div className="vt-ia-wrap">
      <div className="vt-page-head vt-head-row">
        <div>
          <h1>IA Assistente</h1>
          <p>VetIA — copiloto clínico, secretária e administrativo com dados reais da clínica</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {ctxPatient && (
            <span className="vt-ia-badge" style={{ background: 'var(--navy-t)', color: 'var(--navy)' }}>
              <VtIcon name="paw" size={14} /> Contexto: {ctxPatient.name} ({ctxPatient.species})
            </span>
          )}
          {exam && (
            <span className="vt-ia-badge">
              <VtIcon name="tooth" size={15} /> Odontograma: {exam.patient}{exam.findCount ? ` · ${exam.findCount} achados` : ''}
            </span>
          )}
        </div>
      </div>

      <div className="vt-ia-roles">
        {IA_ROLES.map((r) => (
          <button key={r.id} className={`vt-ia-role${role === r.id ? ' active' : ''}`} onClick={() => { setRole(r.id); }}>
            <span className="vt-ia-role-ic"><VtIcon name={r.icon} size={20} /></span>
            <span className="vt-ia-role-txt"><b>{r.label}</b><i>{r.desc}</i></span>
          </button>
        ))}
      </div>

      <div className="vt-card vt-ia-chat">
        <div className="vt-ia-scroll" ref={scrollRef}>
          {msgs.map((m, i) => (
            <div key={i} className={`vt-ia-msg ${m.who}`}>
              {m.who === 'ia' && <span className="vt-ia-ava"><VtIcon name="tooth" size={16} /></span>}
              <div className="vt-ia-bubble">
                {m.who === 'ia' ? <IAText text={m.text} /> : m.text.split('\n').map((line, k) => <p key={k}>{line}</p>)}
              </div>
            </div>
          ))}
          {loading && (
            <div className="vt-ia-msg ia">
              <span className="vt-ia-ava"><VtIcon name="tooth" size={16} /></span>
              <div className="vt-ia-bubble typing"><span /><span /><span /></div>
            </div>
          )}
        </div>

        {msgs.length <= 1 && (
          <div className="vt-ia-chips">
            {IA_SUGGESTIONS.map((s) => <button key={s} className="vt-ia-chip" onClick={() => send(s)}>{s}</button>)}
          </div>
        )}

        <div className="vt-ia-quick">
          {IA_QUICK.map((q) => (
            <button key={q.label} className="vt-ia-qbtn" onClick={() => {
              const prompt = (exam ? `${q.prompt} (Paciente em odontograma: ${exam.patient}.)` : q.prompt) +
                (ctxPatient ? ` Paciente: ${ctxPatient.name} (${ctxPatient.species}, ${ctxPatient.weight||'?'}kg).` : '');
              send(prompt);
            }} disabled={loading}>
              <VtIcon name={q.icon} size={15} /> {q.label}
            </button>
          ))}
          {msgs.length > 1 && <button className="vt-ia-qbtn ghost" onClick={clearChat} title="Limpar conversa">Limpar</button>}
        </div>

        <div className="vt-ia-input">
          <input
            placeholder={ctxPatient ? `Pergunte sobre ${ctxPatient.name}...` : 'Pergunte ao copiloto...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button className="vt-ia-send" onClick={() => send()} disabled={loading}>
            <VtIcon name="spark" size={18} /> Enviar
          </button>
        </div>
        <div className="vt-ia-disclaimer">
          As respostas são sugestões da VetIA com base nos dados da clínica e devem ser revisadas pelo médico-veterinário responsável.
        </div>
      </div>
    </div>
  );
}

/* launcher global — chamado de outros módulos */
window.vtOpenIA = function (prompt, patientId) {
  if (window._vtOpenIA) {
    window._vtOpenIA(prompt || '', patientId || null);
  } else if (window._vtSetActive) {
    window._vtSetActive('ia');
  }
};

Object.assign(window, { IAModule });
