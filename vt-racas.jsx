/* ============================================================
   VetTooth Pro — Catálogo Espécie → Raça → Cor
   Cascata com cadastro de novos itens (persistido no VtStore).
   ============================================================ */
window.VT_ESPECIES_BASE = ['Cão', 'Gato', 'Cavalo', 'Bovino', 'Ave', 'Coelho', 'Roedor', 'Réptil'];

window.VT_RACAS_BASE = {
  'Cão': ['SRD (vira-lata)', 'Labrador', 'Golden Retriever', 'Poodle', 'Bulldog Francês', 'Shih Tzu', 'Yorkshire', 'Pastor Alemão', 'Rottweiler', 'Pinscher', 'Lhasa Apso', 'Border Collie', 'Maltês', 'Pug', 'Dachshund (salsicha)', 'Spitz Alemão (Lulu)', 'Beagle', 'Chihuahua', 'Boxer', 'Akita'],
  'Gato': ['SRD (vira-lata)', 'Persa', 'Siamês', 'Maine Coon', 'Angorá', 'Ragdoll', 'British Shorthair', 'Bengal', 'Sphynx', 'Exótico'],
  'Cavalo': ['Mangalarga Marchador', 'Crioulo', 'Quarto de Milha', 'Puro Sangue Inglês', 'Árabe', 'Andaluz', 'Campolina', 'Brasileiro de Hipismo', 'Apaloosa', 'Lusitano'],
  'Bovino': ['Nelore', 'Holandesa', 'Girolando', 'Angus', 'Brahman', 'Gir', 'Jersey', 'Senepol'],
  'Ave': ['Calopsita', 'Periquito', 'Papagaio', 'Canário', 'Agapornis', 'Galinha', 'Arara'],
  'Coelho': ['Mini Lop', 'Angorá', 'Holandês', 'Rex', 'Fuzzy Lop', 'SRD'],
  'Roedor': ['Hamster Sírio', 'Hamster Anão', 'Porquinho-da-índia', 'Gerbil', 'Chinchila', 'Rato Twister'],
  'Réptil': ['Jabuti', 'Tartaruga d\u2019água', 'Iguana', 'Gecko Leopardo', 'Jiboia'],
};

/* cores por raça (quando relevante) e por espécie (fallback) */
window.VT_CORES_RACA = {
  'Labrador': ['Amarelo', 'Preto', 'Chocolate'],
  'Golden Retriever': ['Dourado', 'Creme', 'Dourado escuro'],
  'Poodle': ['Branco', 'Preto', 'Marrom', 'Apricot', 'Cinza'],
  'Bulldog Francês': ['Fawn', 'Pied (malhado)', 'Preto', 'Creme', 'Tigrado'],
  'Shih Tzu': ['Dourado', 'Preto', 'Branco', 'Tricolor', 'Fígado'],
  'Yorkshire': ['Azul e dourado', 'Preto e dourado'],
  'Pastor Alemão': ['Preto e castanho', 'Preto', 'Sable', 'Bicolor'],
  'Rottweiler': ['Preto e castanho'],
  'Pug': ['Abricó', 'Preto', 'Prata'],
  'Pinscher': ['Preto e castanho', 'Vermelho', 'Chocolate'],
  'Beagle': ['Tricolor', 'Limão e branco', 'Castanho e branco'],
  'Boxer': ['Fawn', 'Tigrado', 'Branco'],
  'Maltês': ['Branco'],
  'Dachshund (salsicha)': ['Vermelho', 'Preto e castanho', 'Chocolate', 'Arlequim'],
  'Crioulo': ['Tordilho', 'Alazão', 'Baio', 'Castanho', 'Preto', 'Rosilho'],
  'Mangalarga Marchador': ['Tordilho', 'Alazão', 'Baio', 'Castanho', 'Pampa', 'Preto'],
  'Quarto de Milha': ['Alazão', 'Castanho', 'Tordilho', 'Baio', 'Palomino'],
  'Persa': ['Branco', 'Preto', 'Cinza azulado', 'Creme', 'Tricolor', 'Cálico'],
  'Siamês': ['Seal point', 'Blue point', 'Chocolate point', 'Lilac point'],
  'Maine Coon': ['Tabby castanho', 'Preto', 'Branco', 'Tortie', 'Creme'],
  'Bengal': ['Rosetado dourado', 'Marrom', 'Neve'],
};
window.VT_CORES_ESPECIE = {
  'Cão': ['Preto', 'Branco', 'Caramelo', 'Marrom', 'Cinza', 'Tricolor', 'Preto e branco', 'Dourado', 'Rajado'],
  'Gato': ['Preto', 'Branco', 'Cinza', 'Laranja', 'Tricolor', 'Rajado (tigrado)', 'Cálico', 'Siamês'],
  'Cavalo': ['Tordilho', 'Alazão', 'Baio', 'Castanho', 'Preto', 'Pampa', 'Rosilho', 'Palomino', 'Branco'],
  'Bovino': ['Branco', 'Preto', 'Malhado', 'Vermelho', 'Pardo'],
  'Ave': ['Verde', 'Azul', 'Amarelo', 'Branco', 'Cinza', 'Colorido'],
  'Coelho': ['Branco', 'Cinza', 'Marrom', 'Preto', 'Malhado'],
  'Roedor': ['Branco', 'Bege', 'Cinza', 'Marrom', 'Malhado'],
  'Réptil': ['Verde', 'Marrom', 'Amarelo', 'Variado'],
};

/* porte estimado por raça (e fallback por espécie) — valores casam com o select do cadastro */
window.VT_PORTE_RACA = {
  'Golden Retriever': 'Grande', 'Labrador': 'Grande', 'Poodle': 'Médio',
  'Bulldog Francês': 'Pequeno', 'Shih Tzu': 'Pequeno', 'Yorkshire': 'Mini',
  'Pastor Alemão': 'Grande', 'Rottweiler': 'Grande', 'Pinscher': 'Mini',
  'Lhasa Apso': 'Pequeno', 'Border Collie': 'Médio', 'Maltês': 'Mini',
  'Pug': 'Pequeno', 'Dachshund (salsicha)': 'Pequeno', 'Spitz Alemão (Lulu)': 'Pequeno',
  'Beagle': 'Médio', 'Chihuahua': 'Mini', 'Boxer': 'Grande', 'Akita': 'Grande',
};
window.VT_PORTE_ESPECIE = { 'Gato': 'Pequeno', 'Cavalo': 'Grande', 'Bovino': 'Gigante', 'Coelho': 'Mini', 'Roedor': 'Mini', 'Ave': 'Mini', 'Réptil': 'Pequeno' };
window.vtPorteFor = function (esp, raca) { return window.VT_PORTE_RACA[raca] || window.VT_PORTE_ESPECIE[esp] || ''; };

/* overrides do usuário (novas espécies/raças/cores) */
function vtCatStore() { const d = window.VtStore && window.VtStore.getData(); return (d && d.catCustom) || { especies: [], racas: {}, cores: {} }; }
function vtCatSave(c) { if (window.VtStore) window.VtStore.setData({ catCustom: c }); }

window.vtEspecies = function () {
  const c = vtCatStore();
  return Array.from(new Set([...window.VT_ESPECIES_BASE, ...(c.especies || [])]));
};
window.vtRacas = function (esp) {
  const c = vtCatStore();
  const base = window.VT_RACAS_BASE[esp] || [];
  return Array.from(new Set([...base, ...((c.racas || {})[esp] || [])]));
};
window.vtCores = function (esp, raca) {
  const c = vtCatStore();
  const byRaca = window.VT_CORES_RACA[raca] || [];
  const byEsp = window.VT_CORES_ESPECIE[esp] || [];
  const custom = (c.cores || {})[raca] || (c.cores || {})[esp] || [];
  const list = byRaca.length ? byRaca : byEsp;
  return Array.from(new Set([...list, ...custom]));
};
window.vtAddEspecie = function (nome) { const c = vtCatStore(); c.especies = Array.from(new Set([...(c.especies || []), nome])); vtCatSave(c); };
window.vtAddRaca = function (esp, nome) { const c = vtCatStore(); c.racas = c.racas || {}; c.racas[esp] = Array.from(new Set([...(c.racas[esp] || []), nome])); vtCatSave(c); };
window.vtAddCor = function (key, nome) { const c = vtCatStore(); c.cores = c.cores || {}; c.cores[key] = Array.from(new Set([...(c.cores[key] || []), nome])); vtCatSave(c); };

/* idade flexível: "10" anos, "25 meses" → 2a 3m, ou data → idade */
window.vtIdadeParse = function (raw) {
  const s = (raw || '').toString().toLowerCase().trim();
  if (!s) return '';
  if (/\//.test(s)) return window.ageFrom ? window.ageFrom(s) : s; // data
  const meses = s.match(/(\d+)\s*(m|mes|mês|meses)/);
  const anos = s.match(/(\d+)\s*(a|ano|anos)?$/);
  if (meses) { const n = +meses[1]; const a = Math.floor(n / 12), m = n % 12; return [a ? a + 'a' : '', m ? m + 'm' : ''].filter(Boolean).join(' ') || '0m'; }
  if (anos) { return anos[1] + ' anos'; }
  return s;
};
window.vtIdadeToBirth = function (raw) {
  const s = (raw || '').toString().toLowerCase().trim();
  const d = new Date();
  const meses = s.match(/(\d+)\s*(m|mes|mês|meses)/);
  const anos = s.match(/(\d+)\s*(a|ano|anos)?$/);
  let totalM = 0;
  if (meses) totalM = +meses[1];
  else if (anos) totalM = +anos[1] * 12;
  else return '';
  d.setMonth(d.getMonth() - totalM);
  return d.toLocaleDateString('pt-BR');
};

/* parse de data DD/MM/AAAA → idade {anos, meses} */
window.vtBirthToAge = function (br) {
  const m = (br || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const b = new Date(+m[3], +m[2] - 1, +m[1]);
  if (isNaN(b)) return null;
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months--;
  if (months < 0) months = 0;
  return { anos: Math.floor(months / 12), meses: months % 12 };
};
/* anos+meses → DD/MM/AAAA (normaliza: 26 meses = 2a 2m) */
window.vtAgeToBirth = function (anos, meses) {
  const total = (parseInt(anos, 10) || 0) * 12 + (parseInt(meses, 10) || 0);
  if (total <= 0) return '';
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - total);
  return d.toLocaleDateString('pt-BR');
};

/* ---- Bloco "Idade do Animal" (toggle Data Nascimento / Manual) ---- */
function VtAgeField({ birth, idade, onBirth, onIdade }) {
  const initManual = !!idade && !birth;
  const [manual, setManual] = React.useState(initManual);
  // estado dos campos manuais derivado de birth (ou idade textual)
  const parsed = window.vtBirthToAge(birth) || (() => { const mm = (idade || '').match(/(\d+)\s*a/); const m2 = (idade || '').match(/(\d+)\s*m/); return { anos: mm ? +mm[1] : (idade && /^\d+$/.test(idade.trim()) ? +idade.trim() : 0), meses: m2 ? +m2[1] : 0 }; })();
  const [anos, setAnos] = React.useState(String(parsed.anos || ''));
  const [meses, setMeses] = React.useState(String(parsed.meses || ''));
  const toISO = (br) => { const m = (br || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };

  const calc = window.vtBirthToAge(birth) || { anos: parseInt(anos, 10) || 0, meses: parseInt(meses, 10) || 0 };
  // normaliza meses excedentes
  const normAnos = calc.anos + Math.floor((calc.meses || 0) / 12);
  const normMeses = (calc.meses || 0) % 12;

  const onDate = (e) => {
    const v = e.target.value; // yyyy-mm-dd
    if (!v) { onBirth(''); return; }
    const [y, mo, d] = v.split('-');
    const br = `${d}/${mo}/${y}`;
    onBirth(br);
    const ag = window.vtBirthToAge(br);
    if (ag) onIdade(`${ag.anos} anos ${ag.meses} meses`);
  };
  const applyManual = (a, m) => {
    const br = window.vtAgeToBirth(a, m);
    onBirth(br);
    onIdade(br ? `${window.vtBirthToAge(br).anos} anos ${window.vtBirthToAge(br).meses} meses` : '');
  };

  return (
    <div className="vt-age-block">
      <div className="vt-age-head">
        <span className="vt-age-title">Idade do Animal</span>
        <div className="vt-age-seg">
          <button type="button" className={!manual ? 'on' : ''} onClick={() => setManual(false)}>Data Nascimento</button>
          <button type="button" className={manual ? 'on' : ''} onClick={() => setManual(true)}>Manual</button>
        </div>
      </div>
      <div className="vt-age-body">
        {manual ? (
          <div className="vt-age-manual">
            <label><input type="number" min="0" value={anos} placeholder="0" onChange={(e) => { setAnos(e.target.value); applyManual(e.target.value, meses); }} /><span>Anos</span></label>
            <label><input type="number" min="0" value={meses} placeholder="0" onChange={(e) => { setMeses(e.target.value); applyManual(anos, e.target.value); }} /><span>Meses</span></label>
          </div>
        ) : (
          <input type="date" className="vt-age-date" value={toISO(birth)} onChange={onDate} />
        )}
        <div className="vt-age-result">
          <span className="vt-age-result-l">IDADE CALCULADA</span>
          <span className="vt-age-result-v">{normAnos} anos e {normMeses} meses</span>
        </div>
      </div>
    </div>
  );
}
window.VtAgeField = VtAgeField;

/* ---- Bloco de endereço reutilizável (CEP→ViaCEP, completo) ----
   value = { cep, street, num, complement, district, city, state }
   onChange(patchObj) recebe o objeto atualizado inteiro. */
function VtAddress({ value, onChange, label }) {
  const a = value || {};
  const [msg, setMsg] = React.useState('');
  const set = (k) => (v) => onChange({ ...a, [k]: v });
  const onCep = async (v) => {
    const next = { ...a, cep: v }; onChange(next);
    const d = (window.onlyD ? window.onlyD(v) : v.replace(/\D/g, ''));
    if (d.length !== 8) { setMsg(''); return; }
    setMsg('Buscando endereço...');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await res.json();
      if (j.erro) { setMsg('CEP não encontrado.'); return; }
      onChange({ ...next, street: j.logradouro || next.street || '', district: j.bairro || '', city: j.localidade || '', state: j.uf || '' });
      setMsg('Endereço preenchido ✓');
    } catch (e) { setMsg('Não foi possível consultar o CEP (offline?).'); }
  };
  return (
    <div>
      <div className="vt-form-sec">{label || 'Endereço'} {msg ? <span className="vt-cep-msg">{msg}</span> : null}</div>
      <div className="vt-form-row">
        <VtField label="CEP" value={a.cep} onChange={onCep} mask="cep" placeholder="00000-000" width="22%" />
        <VtField label="Rua" value={a.street} onChange={set('street')} width="50%" />
        <VtField label="Número" value={a.num} onChange={set('num')} width="12%" />
        <VtField label="Complemento" value={a.complement} onChange={set('complement')} placeholder="Apto, bloco" width="12%" />
      </div>
      <div className="vt-form-row">
        <VtField label="Bairro" value={a.district} onChange={set('district')} width="34%" />
        <VtField label="Cidade" value={a.city} onChange={set('city')} width="46%" />
        <VtField label="Estado" value={a.state} onChange={set('state')} width="14%" />
      </div>
    </div>
  );
}
window.VtAddress = VtAddress;
