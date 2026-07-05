/* ============================================================
   VetTooth Pro — Prescrições (Fase 2)
   Catálogo de medicamentos · tipos de prescrição (comum /
   controlada / manipulado) · modelos de prescrição editáveis.
   ============================================================ */
const { useState: rxUse } = React;

/* ---- Catálogo de medicamentos veterinários ----
   nome comercial/uso, princípio ativo, vias, dose usual, controlado */
window.PR_MEDS = [
  // Anti-inflamatórios / analgésicos
  { nome: 'Meloxicam 0,2%', ativo: 'Meloxicam', via: 'VO', dose: '0,1 mg/kg', freq: '1x ao dia', cat: 'AINE' },
  { nome: 'Carprofeno', ativo: 'Carprofeno', via: 'VO', dose: '4,4 mg/kg', freq: '1x ao dia', cat: 'AINE' },
  { nome: 'Firocoxibe', ativo: 'Firocoxibe', via: 'VO', dose: '5 mg/kg', freq: '1x ao dia', cat: 'AINE' },
  { nome: 'Dipirona', ativo: 'Metamizol sódico', via: 'VO', dose: '25 mg/kg', freq: '8/8h', cat: 'Analgésico' },
  { nome: 'Cetoprofeno', ativo: 'Cetoprofeno', via: 'VO', dose: '2 mg/kg', freq: '1x ao dia', cat: 'AINE' },
  { nome: 'Tramadol', ativo: 'Cloridrato de tramadol', via: 'VO', dose: '4 mg/kg', freq: '8/8h', cat: 'Opioide', controlado: true },
  { nome: 'Gabapentina', ativo: 'Gabapentina', via: 'VO', dose: '10 mg/kg', freq: '12/12h', cat: 'Adjuvante', controlado: true },
  { nome: 'Prednisolona', ativo: 'Prednisolona', via: 'VO', dose: '0,5–1 mg/kg', freq: '1x ao dia', cat: 'Corticoide' },
  // Antibióticos
  { nome: 'Amoxicilina + Clavulanato', ativo: 'Amoxicilina + ác. clavulânico', via: 'VO', dose: '20 mg/kg', freq: '12/12h', cat: 'Antibiótico' },
  { nome: 'Enrofloxacina', ativo: 'Enrofloxacina', via: 'VO', dose: '5 mg/kg', freq: '1x ao dia', cat: 'Antibiótico' },
  { nome: 'Metronidazol', ativo: 'Metronidazol', via: 'VO', dose: '15 mg/kg', freq: '12/12h', cat: 'Antibiótico' },
  { nome: 'Cefalexina', ativo: 'Cefalexina', via: 'VO', dose: '30 mg/kg', freq: '12/12h', cat: 'Antibiótico' },
  { nome: 'Doxiciclina', ativo: 'Doxiciclina', via: 'VO', dose: '10 mg/kg', freq: '1x ao dia', cat: 'Antibiótico' },
  { nome: 'Clindamicina', ativo: 'Clindamicina', via: 'VO', dose: '11 mg/kg', freq: '12/12h', cat: 'Antibiótico' },
  // Gastro / antiemético
  { nome: 'Omeprazol', ativo: 'Omeprazol', via: 'VO', dose: '1 mg/kg', freq: '1x ao dia', cat: 'Gastroprotetor' },
  { nome: 'Maropitant', ativo: 'Citrato de maropitant', via: 'SC', dose: '1 mg/kg', freq: '1x ao dia', cat: 'Antiemético' },
  { nome: 'Ondansetrona', ativo: 'Ondansetrona', via: 'VO', dose: '0,5 mg/kg', freq: '12/12h', cat: 'Antiemético' },
  // Diuréticos / cardio
  { nome: 'Furosemida', ativo: 'Furosemida', via: 'VO', dose: '2 mg/kg', freq: '12/12h', cat: 'Diurético' },
  // Controlados (neuro/anestésicos)
  { nome: 'Fenobarbital', ativo: 'Fenobarbital', via: 'VO', dose: '2,5 mg/kg', freq: '12/12h', cat: 'Anticonvulsivante', controlado: true },
  { nome: 'Diazepam', ativo: 'Diazepam', via: 'VO', dose: '0,5 mg/kg', freq: 'SOS', cat: 'Benzodiazepínico', controlado: true },
  // Tópicos / odonto
  { nome: 'Clorexidina 0,12%', ativo: 'Digluconato de clorexidina', via: 'Tópica', dose: 'Aplicar', freq: '12/12h', cat: 'Antisséptico' },
  { nome: 'Gel dental enzimático', ativo: 'Enzimas / clorexidina', via: 'Tópica', dose: 'Aplicar', freq: '1x ao dia', cat: 'Odontológico' },
  // Antiparasitários
  { nome: 'Ivermectina', ativo: 'Ivermectina', via: 'SC', dose: '0,2 mg/kg', freq: 'Dose única', cat: 'Antiparasitário' },
  { nome: 'Praziquantel', ativo: 'Praziquantel', via: 'VO', dose: '5 mg/kg', freq: 'Dose única', cat: 'Vermífugo' },
  // Cardio / pressão
  { nome: 'Benazepril', ativo: 'Benazepril', via: 'VO', dose: '0,5 mg/kg', freq: '1x ao dia', cat: 'Cardiológico' },
  { nome: 'Pimobendana', ativo: 'Pimobendana', via: 'VO', dose: '0,25 mg/kg', freq: '12/12h', cat: 'Cardiológico' },
  { nome: 'Espironolactona', ativo: 'Espironolactona', via: 'VO', dose: '2 mg/kg', freq: '1x ao dia', cat: 'Diurético' },
  // Dermato / antifúngico
  { nome: 'Cetoconazol', ativo: 'Cetoconazol', via: 'VO', dose: '5 mg/kg', freq: '1x ao dia', cat: 'Antifúngico' },
  { nome: 'Itraconazol', ativo: 'Itraconazol', via: 'VO', dose: '5 mg/kg', freq: '1x ao dia', cat: 'Antifúngico' },
  { nome: 'Apoquel (oclacitinibe)', ativo: 'Oclacitinibe', via: 'VO', dose: '0,4–0,6 mg/kg', freq: '12/12h', cat: 'Antialérgico' },
  // Endocrino
  { nome: 'Levotiroxina', ativo: 'Levotiroxina sódica', via: 'VO', dose: '0,02 mg/kg', freq: '12/12h', cat: 'Hormônio' },
  { nome: 'Insulina NPH', ativo: 'Insulina humana NPH', via: 'SC', dose: '0,5 UI/kg', freq: '12/12h', cat: 'Hormônio' },
  // Analgésico humano usado em vet
  { nome: 'Paracetamol (só cães)', ativo: 'Paracetamol', via: 'VO', dose: '10 mg/kg', freq: '8/8h', cat: 'Analgésico', aviso: 'Contraindicado em gatos' },
  { nome: 'Codeína', ativo: 'Fosfato de codeína', via: 'VO', dose: '1 mg/kg', freq: '8/8h', cat: 'Opioide', controlado: true },
  { nome: 'Morfina', ativo: 'Sulfato de morfina', via: 'IM', dose: '0,3 mg/kg', freq: '4/4h', cat: 'Opioide', controlado: true },
  { nome: 'Cetamina', ativo: 'Cloridrato de cetamina', via: 'IV', dose: '5 mg/kg', freq: 'Indução', cat: 'Anestésico', controlado: true },
  { nome: 'Fluoxetina', ativo: 'Cloridrato de fluoxetina', via: 'VO', dose: '1 mg/kg', freq: '1x ao dia', cat: 'Comportamental', controlado: true },
];

/* unidades de dosagem (manipulado e composição) */
window.PR_RX_UNITS = ['%', 'mg', 'g', 'mcg', 'mL', 'UI', 'UFC', 'UFC/g', 'UFC/kg', 'mg/mL', 'mg/g'];
window.PR_RX_FORMAS = ['Cápsula', 'Comprimido', 'Drágea', 'Sachê em pó', 'Solução', 'Suspensão', 'Xarope', 'Gel comestível', 'Pasta', 'Pomada', 'Creme', 'Creme dental', 'Gotas', 'Óleo', 'Shampoo', 'Transdérmico', 'Emulsão', 'Biscoito', 'Lenço umedecido', 'Dose'];
window.PR_RX_FARMACIA = ['Veterinária', 'Humana'];
window.PR_RX_VIAS_FULL = ['Oral', 'Tópica', 'Oftálmica', 'Otológica', 'Ambiente', 'Intramuscular', 'Intravenosa', 'Subcutânea', 'Inalatória'];
window.PR_RX_DOSAGENS = ['1/4', '1/2', '1', '2', '3', '4', '5'];
window.PR_RX_MEDIDAS = ['cápsula', 'comprimido', 'drágea', 'dose', 'grama', 'gota', 'mg', 'mL', 'sachê', 'aplicação'];
window.PR_RX_PERIODOS = ['hora(s)', 'dia(s)', 'semana(s)', 'mês(es)'];
/* monta a posologia automática a partir dos campos estruturados */
window.rxPosologiaAuto = function (p) {
  if (!p) return '';
  const parts = [];
  if (p.dosagem && p.medida) parts.push(`Administrar ${p.dosagem} ${p.medida}`);
  if (p.freqNum && p.freqUni) parts.push(`a cada ${p.freqNum} ${p.freqUni}`);
  if (p.durCont) parts.push('de uso contínuo');
  else if (p.durNum && p.durUni) parts.push(`por ${p.durNum} ${p.durUni}`);
  if (p.viaFull) parts.push(`· via ${p.viaFull.toLowerCase()}`);
  return parts.join(' ');
};

window.PR_RX_TYPES = [
  { id: 'comum', label: 'Receituário comum', nota: 'Medicamentos de uso normal (venda comum ou sob prescrição). Receita simples, 1 via.' },
  { id: 'controlada', label: 'Controle especial', nota: 'Substâncias controladas (Portaria 344/98). Receituário de Controle Especial em 2 vias, com identificação completa do MV e do tutor.' },
  { id: 'manipulado', label: 'Manipulado', nota: 'Fórmula manipulada — encaminhada à farmácia de manipulação. Descreva a fórmula, concentração e forma farmacêutica.' },
];

/* ---- Modelos de prescrição (presets) editáveis ---- */
window.PR_RX_PRESETS_DEFAULT = [
  { id: 'posodonto', nome: 'Pós-odontológico', tipo: 'comum', obs: 'Alimentação pastosa por 7 dias. Higiene oral diária após cicatrização.', itens: [
    { nome: 'Meloxicam 0,2%', dose: '0,1 mg/kg', via: 'VO', freq: '1x ao dia', tempo: '4 dias', qtd: '1' },
    { nome: 'Amoxicilina + Clavulanato', dose: '20 mg/kg', via: 'VO', freq: '12/12h', tempo: '7 dias', qtd: '1' },
    { nome: 'Clorexidina 0,12%', dose: 'Aplicar', via: 'Tópica', freq: '12/12h', tempo: '14 dias', qtd: '1' },
  ] },
  { id: 'alta', nome: 'Alta cirúrgica', tipo: 'comum', obs: 'Repouso por 10 dias. Uso de colar elizabetano. Retorno para retirada de pontos.', itens: [
    { nome: 'Dipirona', dose: '25 mg/kg', via: 'VO', freq: '8/8h', tempo: '3 dias', qtd: '1' },
    { nome: 'Tramadol', dose: '4 mg/kg', via: 'VO', freq: '8/8h', tempo: '3 dias', qtd: '1' },
    { nome: 'Amoxicilina + Clavulanato', dose: '20 mg/kg', via: 'VO', freq: '12/12h', tempo: '7 dias', qtd: '1' },
  ] },
  { id: 'aine', nome: 'Anti-inflamatório padrão', tipo: 'comum', obs: 'Administrar após alimentação.', itens: [
    { nome: 'Meloxicam 0,2%', dose: '0,1 mg/kg', via: 'VO', freq: '1x ao dia', tempo: '5 dias', qtd: '1' },
  ] },
  { id: 'dor', nome: 'Controle de dor', tipo: 'controlada', obs: 'Reavaliar dor em 72h.', itens: [
    { nome: 'Dipirona', dose: '25 mg/kg', via: 'VO', freq: '8/8h', tempo: '5 dias', qtd: '1' },
    { nome: 'Gabapentina', dose: '10 mg/kg', via: 'VO', freq: '12/12h', tempo: '7 dias', qtd: '1' },
  ] },
];
window.vtRxPresets = function () {
  const d = window.VtStore && window.VtStore.getData();
  return (d && d.rxPresets) || window.PR_RX_PRESETS_DEFAULT;
};
window.vtSaveRxPresets = function (list) {
  if (window.VtStore) window.VtStore.setData({ rxPresets: list });
};

/* peso do paciente em kg e cálculo de dose */
window.rxKg = function (patient) { return Number(String((patient || {}).weight || '').replace(/[^\d,.]/g, '').replace(',', '.')) || 0; };
window.rxDoseCalc = function (perKg, kg) {
  const n = parseFloat(String(perKg || '').replace(',', '.'));
  if (!n || !kg) return null;
  const unit = (String(perKg).match(/([a-zµ]+)\s*\/\s*kg/i) || [])[1] || 'mg';
  return { total: +(n * kg).toFixed(2), unit };
};
window.rxIsControlled = function (nome) { const m = window.PR_MEDS.find((x) => x.nome.toLowerCase() === (nome || '').toLowerCase()); return !!(m && m.controlado); };

/* gera o texto padrão da receita a partir dos itens */
window.rxToText = function (at, patient) {
  const tipo = at.prescricaoTipo || 'comum';
  const t = (window.PR_RX_TYPES.find((x) => x.id === tipo) || {}).label;
  const kg = window.rxKg(patient);
  const controlada = tipo === 'controlada';
  const idade = patient.idade || (window.ageFrom ? window.ageFrom(patient.birth) : '') || '—';
  let s = `RECEITUÁRIO ${(t || '').toUpperCase()}\n`;
  s += `${'─'.repeat(38)}\n`;
  s += `Paciente: ${patient.name}   Espécie: ${patient.species}   Raça: ${patient.breed || '—'}\n`;
  s += `Sexo: ${patient.sex || '—'}   Peso: ${patient.weight || '—'}   Idade: ${idade}\n`;
  s += `Cor/pelagem: ${patient.color || '—'}   Microchip: ${patient.chip || '—'}\n`;
  s += `Tutor(a): ${patient.owner}\n`;
  if (controlada) {
    const addr = patient.address || {};
    s += `CPF: ${patient.cpf || '___________'}   Tel: ${patient.phone || '___________'}\n`;
    s += `Endereço: ${[addr.street, addr.num, addr.district, addr.city, addr.state].filter(Boolean).join(', ') || '___________'}\n`;
  }
  s += `${'─'.repeat(38)}\n\n`;
  if (tipo === 'manipulado') {
    (at.prescricoes || []).forEach((r, i) => {
      s += `${i + 1}) MANIPULAR — ${r.forma || ''}${r.qtdProd ? ' (' + r.qtdProd + ' un.)' : ''}\n`;
      (r.componentes || [{ ativo: r.ativo, conc: r.conc }]).forEach((c) => { if (c.ativo) s += `   • ${c.ativo} ${c.conc || ''}${c.unidade || ''}\n`; });
      if (r.qsp) s += `   q.s.p. ${r.qsp}\n`;
      if (r.farmacia) s += `   Farmácia: ${r.farmacia} · via ${(r.viaFull || '').toLowerCase()}\n`;
      const pos = r.posologia || window.rxPosologiaAuto(r.pos);
      if (pos) s += `   Posologia: ${pos}\n`;
      s += '\n';
    });
  } else {
    (at.prescricoes || []).forEach((r, i) => {
      const calc = window.rxDoseCalc(r.dose, kg);
      s += `${i + 1}) ${r.nome}${r.apresentacao ? ' — ' + r.apresentacao : ''}${r.conc ? ' ' + r.conc : ''}\n`;
      if (calc) s += `   Dose p/ ${kg} kg: ${calc.total} ${calc.unit}\n`;
      const pos = r.posologia || window.rxPosologiaAuto(r.pos);
      s += `   ${[pos, r.qtdProd ? 'Quantidade: ' + r.qtdProd + ' un.' : ''].filter(Boolean).join('  ·  ') || [r.freq, r.tempo].filter(Boolean).join(' · ')}\n`;
      if (window.rxIsControlled(r.nome)) s += `   ⚠ Controle especial (Portaria 344/98)\n`;
      if (r.obs) s += `   Obs: ${r.obs}\n`;
      s += '\n';
    });
  }
  if (at.prescricaoInstrucoes) {
    s += `${'─'.repeat(38)}\n`;
    s += `Instruções gerais do tratamento:\n${at.prescricaoInstrucoes}\n`;
  }
  s += `\nData: ${window.PR.todayBR()}`;
  return s;
};

/* ---------- Configurações: modelos de prescrição ---------- */
function RxPresetsTab() {
  const [list, setList] = vtUseState(() => window.vtRxPresets().map((p) => ({ ...p, itens: p.itens.map((i) => ({ ...i })) })));
  const [open, setOpen] = vtUseState(null);
  const persist = (l) => { setList(l); window.vtSaveRxPresets(l); };
  const addPreset = () => { const p = { id: 'rx' + Date.now().toString(36), nome: 'Novo modelo', tipo: 'comum', obs: '', itens: [] }; persist([...list, p]); setOpen(list.length); };
  const updP = (i, k, v) => persist(list.map((p, j) => j === i ? { ...p, [k]: v } : p));
  const delP = (i) => { persist(list.filter((_, j) => j !== i)); setOpen(null); };
  const addItem = (i) => updP(i, 'itens', [...list[i].itens, { nome: '', dose: '', via: 'VO', freq: '', tempo: '', qtd: '1' }]);
  const updItem = (i, j, k, v) => updP(i, 'itens', list[i].itens.map((it, m) => m === j ? { ...it, [k]: v } : it));
  const delItem = (i, j) => updP(i, 'itens', list[i].itens.filter((_, m) => m !== j));
  return (
    <div className="vt-card vt-sec">
      <div className="vt-head-row" style={{ marginBottom: 12 }}>
        <div><h3 className="vt-sec-title" style={{ margin: 0 }}>Modelos de prescrição</h3><p className="vt-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Crie prescrições prontas (pós-odonto, alta, etc.). Aplicáveis com 1 clique na aba Prescrições.</p></div>
        <button className="vt-btn-primary" onClick={addPreset}><VtIcon name="plus" size={15} /> Novo modelo</button>
      </div>
      <div className="vt-stack">
        {list.map((p, i) => (
          <div key={p.id} className="vt-card vt-sec" style={{ padding: 0 }}>
            <div className="pr-sys-head" onClick={() => setOpen(open === i ? null : i)}>
              <span className="pr-sys-name">{p.nome} <span className="vt-tag teal" style={{ marginLeft: 6 }}>{(window.PR_RX_TYPES.find((t) => t.id === p.tipo) || {}).label}</span> <span className="vt-muted" style={{ fontSize: 12 }}>· {p.itens.length} item(ns)</span></span>
              <VtIcon name="chevron" size={16} />
            </div>
            {open === i && (
              <div style={{ padding: '0 16px 16px' }}>
                <div className="pr-fieldrow c2">
                  <label className="pr-field"><span>Nome do modelo</span><input value={p.nome} onChange={(e) => updP(i, 'nome', e.target.value)} /></label>
                  <label className="pr-field"><span>Tipo de prescrição</span><select value={p.tipo} onChange={(e) => updP(i, 'tipo', e.target.value)}>{window.PR_RX_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
                </div>
                <table className="pr-dtable">
                  <thead><tr><th>Medicamento</th><th>Dose</th><th>Via</th><th>Freq.</th><th>Tempo</th><th></th></tr></thead>
                  <tbody>
                    {p.itens.map((it, j) => (
                      <tr key={j}>
                        <td><input value={it.nome} onChange={(e) => updItem(i, j, 'nome', e.target.value)} list="rx-medlist" placeholder="Medicamento" /></td>
                        <td><input value={it.dose} onChange={(e) => updItem(i, j, 'dose', e.target.value)} /></td>
                        <td><input value={it.via} onChange={(e) => updItem(i, j, 'via', e.target.value)} style={{ width: 60 }} /></td>
                        <td><input value={it.freq} onChange={(e) => updItem(i, j, 'freq', e.target.value)} /></td>
                        <td><input value={it.tempo} onChange={(e) => updItem(i, j, 'tempo', e.target.value)} /></td>
                        <td><button className="pr-del-btn" onClick={() => delItem(i, j)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <label className="pr-field" style={{ marginTop: 10 }}><span>Orientações padrão</span><input value={p.obs} onChange={(e) => updP(i, 'obs', e.target.value)} placeholder="Orientações ao tutor" /></label>
                <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
                  <button className="pr-addrow" onClick={() => addItem(i)}><VtIcon name="plus" size={14} /> Adicionar medicamento</button>
                  <button className="vt-link" style={{ marginLeft: 'auto', color: 'var(--red)' }} onClick={() => delP(i)}>Remover modelo</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <RxMedDatalist />
    </div>
  );
}

function RxMedDatalist() {
  return <datalist id="rx-medlist">{window.PR_MEDS.map((m) => <option key={m.nome} value={m.nome}>{m.ativo} · {m.dose} {m.via}</option>)}</datalist>;
}

Object.assign(window, { RxPresetsTab, RxMedDatalist });

/* ============================================================
   Fase 3 — Exames: catálogo ampliado + perfis personalizáveis
   ============================================================ */
window.PR_EXAM_CAT = [
  { grupo: 'Hematologia', itens: ['Hemograma completo', 'Teste de Compatibilidade Sanguínea', 'Pesquisa de Hematozoários', 'Coagulograma (TTPA)', 'Tempo de Protrombina (TP)', 'Tipagem sanguínea cães (DEA 1.1)', 'Tipagem sanguínea gatos (A/B/AB)'] },
  { grupo: 'Bioquímico', itens: ['Perfil Bioquímico Completo', 'Perfil Renal 1 (ureia, creatinina)', 'Perfil Renal 2 (ureia, creatinina, eletrólitos)', 'Perfil Hepático (ALT, AST, FA, GGT, bilirrubinas)', 'Eletrólitos (Na, K, Cl)', 'Ureia', 'Creatinina', 'Glicose / Glicemia', 'Colesterol', 'Triglicérides', 'Proteínas totais e albumina', 'ALT (TGP)', 'AST (TGO)', 'Fosfatase alcalina (FA)', 'GGT', 'Bilirrubinas (total e frações)', 'Frutosamina', 'Cálcio', 'Fósforo'] },
  { grupo: 'Urina e Fezes', itens: ['Urinálise (EAS / Urina tipo I)', 'Relação Proteína/Creatinina urinária (UPC)', 'Análise de cálculo vesical', 'Coproparasitológico', 'Coprológico funcional', 'Pesquisa de sangue oculto nas fezes'] },
  { grupo: 'Imunologia / Testes rápidos', itens: ['FIV / FeLV (Elisa - snap)', 'Cinomose (Elisa)', 'Parvovirose / Coronavirose (Elisa)', 'Leishmaniose (Elisa / IFI)', 'Snap 4Dx (Erliquiose, Anaplasmose, Borreliose, Dirofilariose)', 'Brucelose (SAR / 2-mercaptoetanol)', 'Giardia sp (Elisa - snap)'] },
  { grupo: 'Hormônios / Endocrinologia', itens: ['T4 livre', 'T4 total', 'T3', 'TSH', 'Cortisol', 'Teste de estimulação com ACTH', 'Teste de supressão com dexametasona', 'Progesterona', 'Estradiol', 'Testosterona', 'Insulina'] },
  { grupo: 'Imagem', itens: ['Radiografia (sem contraste)', 'Radiografia com contraste', 'Radiografia odontológica', 'Ultrassonografia abdominal', 'Ecocardiograma (Ecodopplercardiograma)', 'Tomografia (sem contraste)', 'Tomografia com contraste', 'Ressonância magnética', 'Esofagograma com contraste', 'Trânsito intestinal com contraste', 'Uretrocistografia com contraste'] },
  { grupo: 'Cardiologia', itens: ['Eletrocardiograma (ECG)', 'Pressão Arterial', 'Ecodopplercardiograma'] },
  { grupo: 'Citologia / Patologia', itens: ['Citologia — ouvido', 'Citologia — pele', 'Citologia — vaginal', 'Citologia — formações externas', 'Citologia — lavado vesical', 'Citologia — pesquisa de ectoparasitas', 'PAAF (punção aspirativa de agulha fina)', 'Histopatológico (biópsia)', 'Necropsia'] },
  { grupo: 'Líquidos Cavitários', itens: ['Líquido pleural', 'Líquido peritoneal (ascite)', 'Líquido pericárdico', 'Seroma / Abscesso'] },
  { grupo: 'Microbiologia', itens: ['Cultura e antibiograma (bactérias aeróbicas)', 'Cultura para fungos (dermatofitose)'] },
];
window.PR_EXAM_PRESETS_DEFAULT = [
  { id: 'preop', nome: 'Pré-operatório / anestésico', itens: ['Hemograma completo', 'Perfil Renal 1 (ureia, creatinina)', 'Perfil Hepático (ALT, AST, FA, GGT, bilirrubinas)', 'Proteínas totais e albumina', 'Eletrocardiograma (ECG)', 'Coagulograma (TTPA)'] },
  { id: 'geriatrico', nome: 'Check-up geriátrico', itens: ['Hemograma completo', 'Perfil Bioquímico Completo', 'Urinálise (EAS / Urina tipo I)', 'T4 livre', 'Pressão Arterial', 'Ultrassonografia abdominal'] },
  { id: 'renal', nome: 'Perfil renal', itens: ['Perfil Renal 1 (ureia, creatinina)', 'Urinálise (EAS / Urina tipo I)', 'Relação Proteína/Creatinina urinária (UPC)', 'Eletrólitos (Na, K, Cl)', 'Pressão Arterial'] },
  { id: 'hepatico', nome: 'Perfil hepático', itens: ['Perfil Hepático (ALT, AST, FA, GGT, bilirrubinas)', 'Proteínas totais e albumina', 'Ultrassonografia abdominal'] },
  { id: 'felino', nome: 'Triagem felina', itens: ['FIV / FeLV (Elisa - snap)', 'Hemograma completo', 'Perfil Bioquímico Completo', 'T4 livre'] },
  { id: 'senil_combo', nome: 'Perfil Senil completo', itens: ['Hemograma completo', 'Perfil Renal 1 (ureia, creatinina)', 'Perfil Hepático (ALT, AST, FA, GGT, bilirrubinas)', 'Urinálise (EAS / Urina tipo I)', 'Glicose / Glicemia', 'Pressão Arterial', 'Ultrassonografia abdominal'] },
  { id: 'odonto_preop', nome: 'Pré-dental (odontologia)', itens: ['Hemograma completo', 'Perfil Renal 1 (ureia, creatinina)', 'Perfil Hepático (ALT, AST, FA, GGT, bilirrubinas)', 'Coagulograma (TTPA)', 'Radiografia odontológica'] },
];
window.vtExamPresets = function () { const d = window.VtStore && window.VtStore.getData(); return (d && d.examPresets) || window.PR_EXAM_PRESETS_DEFAULT; };
window.vtSaveExamPresets = function (l) { if (window.VtStore) window.VtStore.setData({ examPresets: l }); };

function ExamPresetsTab() {
  const allExams = window.PR_EXAM_CAT.flatMap((g) => g.itens);
  const [list, setList] = vtUseState(() => window.vtExamPresets().map((p) => ({ ...p, itens: [...p.itens] })));
  const [open, setOpen] = vtUseState(null);
  const persist = (l) => { setList(l); window.vtSaveExamPresets(l); };
  const addP = () => { persist([...list, { id: 'ex' + Date.now().toString(36), nome: 'Novo perfil', itens: [] }]); setOpen(list.length); };
  const updNome = (i, v) => persist(list.map((p, j) => j === i ? { ...p, nome: v } : p));
  const toggleItem = (i, ex) => persist(list.map((p, j) => j === i ? { ...p, itens: p.itens.includes(ex) ? p.itens.filter((x) => x !== ex) : [...p.itens, ex] } : p));
  const delP = (i) => { persist(list.filter((_, j) => j !== i)); setOpen(null); };
  return (
    <div className="vt-card vt-sec">
      <div className="vt-head-row" style={{ marginBottom: 12 }}>
        <div><h3 className="vt-sec-title" style={{ margin: 0 }}>Perfis de exames</h3><p className="vt-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Crie pacotes de exames padrão (pré-operatório, geriátrico, etc.). Aplicáveis com 1 clique na aba Exames.</p></div>
        <button className="vt-btn-primary" onClick={addP}><VtIcon name="plus" size={15} /> Novo perfil</button>
      </div>
      <div className="vt-stack">
        {list.map((p, i) => (
          <div key={p.id} className="vt-card vt-sec" style={{ padding: 0 }}>
            <div className="pr-sys-head" onClick={() => setOpen(open === i ? null : i)}>
              <span className="pr-sys-name">{p.nome} <span className="vt-muted" style={{ fontSize: 12 }}>· {p.itens.length} exame(s)</span></span>
              <VtIcon name="chevron" size={16} />
            </div>
            {open === i && (
              <div style={{ padding: '0 16px 16px' }}>
                <label className="pr-field" style={{ marginBottom: 12 }}><span>Nome do perfil</span><input value={p.nome} onChange={(e) => updNome(i, e.target.value)} /></label>
                <div className="pr-examgrid">
                  {allExams.map((ex) => (
                    <button key={ex} className={`pr-exam${p.itens.includes(ex) ? ' on' : ''}`} onClick={() => toggleItem(i, ex)}>
                      <span className="pr-check-box" style={p.itens.includes(ex) ? { background: 'var(--navy)', borderColor: 'var(--navy)' } : null}>{p.itens.includes(ex) ? '✓' : ''}</span>{ex}
                    </button>
                  ))}
                </div>
                <button className="vt-link" style={{ color: 'var(--red)', marginTop: 12 }} onClick={() => delP(i)}>Remover perfil</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ExamPresetsTab });
