/* ============================================================
   VetTooth Pro — IA Assistente (copiloto clínico)
   Usa window.claude.complete quando disponível.
   ============================================================ */
const IA_SUGGESTIONS = [
  'Gerar texto clínico do odontograma da Bella',
  'Sugerir plano terapêutico para EOTRH felino',
  'Escrever orientação de pós-operatório de extração',
  'Montar pedido de exames pré-anestésicos',
];

/* Atalhos rápidos (sempre visíveis acima do input) */
const IA_QUICK = [
  { label: 'Analisar achados', icon: 'tooth', prompt: 'Analise os achados do exame odontológico atual e organize uma interpretação clínica estruturada.' },
  { label: 'Sugerir tratamento', icon: 'stethoscope', prompt: 'Com base nos achados, sugira um plano de tratamento odontológico passo a passo.' },
  { label: 'Calcular dose', icon: 'syringe', prompt: 'Ajude a calcular a dose de sedação/medicação. Considere espécie, peso e fármaco — me pergunte o que faltar.' },
  { label: 'Gerar laudo', icon: 'receipt', prompt: 'Gere um laudo odontológico formal a partir dos achados do exame atual, pronto para revisão e assinatura.' },
  { label: 'Diagnóstico diferencial', icon: 'spark', prompt: 'Liste os principais diagnósticos diferenciais para o quadro odontológico descrito, do mais ao menos provável.' },
];

/* lê o odontograma salvo (EquiChart) para o badge "dados do exam disponíveis" */
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

/* formatação leve das respostas: **negrito** e listas (•, -, 1.) */
function IAText({ text }) {
  const lines = (text || '').split('\n');
  const fmt = (s) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>);
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

const IA_ROLES = [
  { id: 'clinica', label: 'Clínica', icon: 'stethoscope', desc: 'Diagnóstico assistido, plano terapêutico, laudos' },
  { id: 'secretaria', label: 'Secretária', icon: 'calendar', desc: 'Mensagens a tutores, WhatsApp, lembretes' },
  { id: 'admin', label: 'Administradora', icon: 'chart', desc: 'Fluxo de caixa, estoque, produtividade' },
];

/* nome do usuário logado na sessão atual */
function iaUserName() {
  try { const u = window.VtStore && window.VtStore.currentUser(); if (u && u.name && u.name.trim()) return u.name.trim(); } catch (e) {}
  return '';
}
/* saudação inicial personalizada com o nome real do usuário da sessão */
function iaSeed() {
  const nm = iaUserName();
  const ola = nm ? `Olá, ${nm}!` : 'Olá!';
  return [
    { who: 'ia', text: `${ola} Sou a **VetIA**, copiloto clínico do VetTooth Pro. Posso ajudar com diagnóstico assistido, planos terapêuticos, receituários e laudos — sempre para a sua revisão. Como posso ajudar?` },
  ];
}
const IA_SEED = iaSeed();
function IAModule() {
  const [role, setRole] = vtUseState('clinica');
  const [msgs, setMsgs] = vtUseState(() => {
    try { const raw = sessionStorage.getItem('vt-ia-msgs'); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) return p; } } catch (e) {}
    return iaSeed();
  });
  const exam = iaExamData();
  const [input, setInput] = vtUseState('');
  const [loading, setLoading] = vtUseState(false);
  const scrollRef = vtUseRef(null);

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
    const roleName = IA_ROLES.find((r) => r.id === role).label;
    const sys = `Você é o copiloto de IA "${roleName}" do VetTooth Pro, um sistema de odontologia veterinária (cães, gatos e equinos). Responda em português do Brasil, de forma clínica, objetiva e estruturada (use listas curtas quando útil). Você é um ASSISTENTE: nunca dê diagnóstico definitivo sozinho — sempre apresente hipóteses e finalize lembrando que o conteúdo é uma sugestão para revisão do médico-veterinário. Contexto disponível: pacientes como Bella (cavalo, pontas de esmalte), Thor (gato), Fred (gato, EOTRH felino), Luna e Max (cães).`;
    try {
      if (window.claude && window.claude.complete) {
        const reply = await window.claude.complete({ system: sys, prompt: q, max_tokens: 700 });
        setMsgs((m) => [...m, { who: 'ia', text: (reply || '').trim() || 'Não consegui gerar uma resposta agora.' }]);
      } else {
        setMsgs((m) => [...m, { who: 'ia', text: demoReply(q, roleName) }]);
      }
    } catch (e) {
      setMsgs((m) => [...m, { who: 'ia', text: demoReply(q, roleName) }]);
    }
    setLoading(false);
  };

  return (
    <div className="vt-ia-wrap">
      <div className="vt-page-head vt-head-row">
        <div><h1>IA Assistente</h1><p>VetIA — copiloto clínico, secretária e administrativo, sempre sob revisão do veterinário</p></div>
        {exam && <span className="vt-ia-badge"><VtIcon name="tooth" size={15} /> Dados do exame disponíveis · {exam.patient}{exam.findCount ? ` (${exam.findCount} achados)` : ''}</span>}
      </div>
      <div className="vt-ia-roles">
        {IA_ROLES.map((r) => (
          <button key={r.id} className={`vt-ia-role${role === r.id ? ' active' : ''}`} onClick={() => setRole(r.id)}>
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
              <div className="vt-ia-bubble">{m.who === 'ia' ? <IAText text={m.text} /> : m.text.split('\n').map((line, k) => <p key={k}>{line}</p>)}</div>
            </div>
          ))}
          {loading && <div className="vt-ia-msg ia"><span className="vt-ia-ava"><VtIcon name="tooth" size={16} /></span><div className="vt-ia-bubble typing"><span /><span /><span /></div></div>}
        </div>
        {msgs.length <= 1 && (
          <div className="vt-ia-chips">
            {IA_SUGGESTIONS.map((s) => <button key={s} className="vt-ia-chip" onClick={() => send(s)}>{s}</button>)}
          </div>
        )}
        <div className="vt-ia-quick">
          {IA_QUICK.map((q) => (
            <button key={q.label} className="vt-ia-qbtn" onClick={() => send(exam ? `${q.prompt} (Paciente em exame: ${exam.patient}.)` : q.prompt)} disabled={loading}>
              <VtIcon name={q.icon} size={15} /> {q.label}
            </button>
          ))}
          {msgs.length > 1 && <button className="vt-ia-qbtn ghost" onClick={clearChat} title="Limpar conversa">Limpar</button>}
        </div>
        <div className="vt-ia-input">
          <input placeholder="Pergunte ao copiloto..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
          <button className="vt-ia-send" onClick={() => send()} disabled={loading}><VtIcon name="spark" size={18} /> Enviar</button>
        </div>
        <div className="vt-ia-disclaimer">As respostas são sugestões geradas por IA e devem ser revisadas pelo médico-veterinário responsável.</div>
      </div>
    </div>
  );
}

function demoReply(q, role) {
  const lower = q.toLowerCase();
  if (lower.includes('odontograma') || lower.includes('bella')) {
    return 'Texto clínico sugerido (odontograma — Bella, equino):\n• 311: presença de gancho dentário.\n• 206: presença de diastema.\n• Pontas de esmalte em arcadas superiores.\nConduta sugerida: nivelamento odontológico (odontoplastia) e reavaliação em 6 meses.\n\n⚠️ Sugestão gerada por IA — revise antes de validar.';
  }
  if (lower.includes('eotrh') || lower.includes('pós') || lower.includes('pos-op')) {
    return 'Plano sugerido:\n1. Avaliação radiográfica intraoral completa.\n2. Analgesia multimodal (AINE + gabapentina).\n3. Extração dos elementos com reabsorção avançada.\n4. Pós-operatório: dieta pastosa 7 dias, reavaliação em 10 dias.\n\n⚠️ Sugestão gerada por IA — revise antes de validar.';
  }
  if (lower.includes('exame')) {
    return 'Pedido de exames pré-anestésicos sugerido:\n• Hemograma completo\n• Bioquímica (ALT, FA, ureia, creatinina)\n• Avaliação cardíaca conforme ASA\n\n⚠️ Sugestão gerada por IA — revise antes de validar.';
  }
  return `Como copiloto ${role}, posso estruturar diagnósticos assistidos, planos terapêuticos, receituários e laudos. Descreva o caso (paciente, achados, espécie) que eu organizo uma sugestão para sua revisão.\n\n⚠️ Sugestão gerada por IA — revise antes de validar.`;
}

Object.assign(window, { IAModule });
