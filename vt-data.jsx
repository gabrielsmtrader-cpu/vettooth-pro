/* ============================================================
   VetTooth Pro — dados mock
   ============================================================ */
window.VtData = (function () {
  const patients = [
    {
      id: 'P-0001', name: 'Thor', species: 'Gato', breed: 'Siamês', sex: 'Macho', neutered: true,
      birth: '12/03/2019', weight: '4,8 kg', color: 'Seal point', chip: '982000123456789', size: 'Pequeno',
      asa: 'ASA II', risk: 'Moderado', status: 'Ativo', photo: '#e6b89c',
      owner: 'Gabriel Souza', allergies: ['Penicilina'], diseases: ['Gengivite crônica'], meds: ['Meloxicam 0,05mg'],
      lastVisit: '02/06/2026', plan: 'PetLife', card: '8841 2290', odontograma: false,
    },
    {
      id: 'P-0002', name: 'Luna', species: 'Cão', breed: 'Golden Retriever', sex: 'Fêmea', neutered: true,
      birth: '05/08/2021', weight: '28,4 kg', color: 'Dourado', chip: '982000987654321', size: 'Grande',
      asa: 'ASA I', risk: 'Baixo', status: 'Ativo', photo: '#d9a441',
      owner: 'Marina Costa', allergies: [], diseases: [], meds: [],
      lastVisit: '28/05/2026', plan: '—', card: '', odontograma: false,
    },
    {
      id: 'P-0003', name: 'Bella', species: 'Cavalo', breed: 'Crioulo', sex: 'Fêmea', neutered: false,
      birth: '20/09/2016', weight: '420,0 kg', color: 'Tordilho', chip: '982000456789123', size: 'Grande',
      asa: 'ASA II', risk: 'Moderado', status: 'Ativo', photo: '#a98467',
      owner: 'Haras Bela Vista', allergies: [], diseases: ['Pontas de esmalte'], meds: [],
      lastVisit: '18/01/2026', plan: '—', card: '', odontograma: true,
    },
    {
      id: 'P-0004', name: 'Max', species: 'Cão', breed: 'Bulldog Francês', sex: 'Macho', neutered: false,
      birth: '14/02/2022', weight: '12,1 kg', color: 'Fawn', chip: '982000321654987', size: 'Médio',
      asa: 'ASA II', risk: 'Moderado', status: 'Ativo', photo: '#8d8d8d',
      owner: 'Rafael Lima', allergies: [], diseases: ['Maloclusão'], meds: [],
      lastVisit: '30/05/2026', plan: 'VetCard', card: '5521 0098', odontograma: false,
    },
    {
      id: 'P-0005', name: 'Fred', species: 'Gato', breed: 'Persa', sex: 'Macho', neutered: true,
      birth: '01/01/2018', weight: '5,5 kg', color: 'Branco', chip: '982000147258369', size: 'Pequeno',
      asa: 'ASA III', risk: 'Alto', status: 'Ativo', photo: '#cfcfcf',
      owner: 'Patrícia Alves', allergies: ['Sulfa'], diseases: ['Reabsorção dentária (EOTRH felino)'], meds: ['Gabapentina'],
      lastVisit: '04/06/2026', plan: '—', card: '', odontograma: false,
    },
    {
      id: 'P-0006', name: 'Rex', species: 'Cão', breed: 'Pastor Alemão', sex: 'Macho', neutered: false,
      birth: '10/06/2020', weight: '34,0 kg', color: 'Preto e castanho', chip: '982000369258147', size: 'Grande',
      asa: 'ASA I', risk: 'Baixo', status: 'Óbito', photo: '#6b5b4f',
      owner: 'Carlos Mendes', allergies: [], diseases: [], meds: [],
      lastVisit: '11/03/2026', plan: '—', card: '', odontograma: false,
    },
  ];

  const owners = [
    { id: 'C-001', name: 'Gabriel Souza', cpf: '384.594.018-20', phone: '(11) 99999-8888', email: 'gabriel@gmail.com', city: 'São Paulo, SP', pets: 1, type: 'PF' },
    { id: 'C-002', name: 'Marina Costa', cpf: '221.882.430-11', phone: '(11) 98810-2233', email: 'marina.costa@hotmail.com', city: 'Campinas, SP', pets: 2, type: 'PF' },
    { id: 'C-003', name: 'Haras Bela Vista', cpf: '12.345.678/0001-90', phone: '(19) 3344-5566', email: 'contato@harasbelavista.com.br', city: 'Itu, SP', pets: 8, type: 'PJ' },
    { id: 'C-004', name: 'Rafael Lima', cpf: '905.117.220-44', phone: '(21) 99110-0099', email: 'rafa.lima@outlook.com', city: 'Niterói, RJ', pets: 1, type: 'PF' },
    { id: 'C-005', name: 'Patrícia Alves', cpf: '660.221.880-05', phone: '(31) 98800-7711', email: 'pati.alves@yahoo.com', city: 'Belo Horizonte, MG', pets: 3, type: 'PF' },
  ];

  const week = ['Seg 15', 'Ter 16', 'Qua 17', 'Qui 18', 'Sex 19', 'Sáb 20'];
  const appointments = [
    { day: 0, start: 9, dur: 1, patient: 'Luna', kind: 'Limpeza', color: 'teal' },
    { day: 0, start: 11, dur: 1.5, patient: 'Max', kind: 'Retorno', color: 'navy' },
    { day: 1, start: 10, dur: 1, patient: 'Thor', kind: 'Extração', color: 'red' },
    { day: 1, start: 14, dur: 2, patient: 'Bella', kind: 'Odontograma', color: 'amber' },
    { day: 2, start: 9, dur: 1, patient: 'Fred', kind: 'Avaliação', color: 'teal' },
    { day: 3, start: 13, dur: 1, patient: 'Rex', kind: 'Vacina', color: 'navy' },
    { day: 4, start: 10, dur: 1.5, patient: 'Luna', kind: 'Cirurgia', color: 'red' },
    { day: 4, start: 15, dur: 1, patient: 'Thor', kind: 'Retorno', color: 'teal' },
  ];

  const treatments = {
    planejado: [
      { patient: 'Bella', proc: 'Nivelamento odontológico', tooth: '311, 206', cost: 'R$ 450,00' },
      { patient: 'Max', proc: 'Correção de maloclusão', tooth: '—', cost: 'R$ 800,00' },
    ],
    andamento: [
      { patient: 'Thor', proc: 'Extração dentária', tooth: '108', cost: 'R$ 620,00' },
      { patient: 'Fred', proc: 'Tratamento EOTRH', tooth: '104, 204', cost: 'R$ 1.200,00' },
    ],
    concluido: [
      { patient: 'Luna', proc: 'Profilaxia (limpeza)', tooth: 'Arcada completa', cost: 'R$ 350,00' },
      { patient: 'Bella', proc: 'Exame odontológico', tooth: '—', cost: 'R$ 250,00' },
    ],
  };

  const inventory = [
    { name: 'Broca odontológica FG', lot: 'BR-2291', exp: '08/2026', supplier: 'DentalVet', qty: 3, min: 10, unit: 'un', cost: 'R$ 28,00' },
    { name: 'Anestésico Lidocaína 2%', lot: 'LD-1180', exp: '02/2027', supplier: 'Farmavet', qty: 24, min: 12, unit: 'fr', cost: 'R$ 15,50' },
    { name: 'Fio de sutura 3-0', lot: 'SU-7741', exp: '11/2026', supplier: 'CirurgVet', qty: 8, min: 15, unit: 'un', cost: 'R$ 9,90' },
    { name: 'Gaze estéril', lot: 'GZ-0420', exp: '05/2028', supplier: 'MedSupply', qty: 120, min: 50, unit: 'pct', cost: 'R$ 4,20' },
    { name: 'Clorexidina 0,12%', lot: 'CL-3310', exp: '01/2027', supplier: 'Farmavet', qty: 6, min: 8, unit: 'fr', cost: 'R$ 22,00' },
    { name: 'Luvas nitrílicas M', lot: 'LV-9982', exp: '09/2027', supplier: 'MedSupply', qty: 40, min: 20, unit: 'cx', cost: 'R$ 38,00' },
  ];

  const finance = {
    receitas: [
      { desc: 'Profilaxia — Luna', cat: 'Procedimento', value: 350, date: '06/06' },
      { desc: 'Odontograma — Bella', cat: 'Exame', value: 250, date: '05/06' },
      { desc: 'Extração — Thor', cat: 'Cirurgia', value: 620, date: '04/06' },
      { desc: 'Consulta — Fred', cat: 'Consulta', value: 180, date: '04/06' },
      { desc: 'Venda — Ração dental', cat: 'Venda', value: 95, date: '03/06' },
    ],
    custos: [
      { desc: 'Reposição brocas', cat: 'Insumos', value: 280, date: '06/06' },
      { desc: 'Salários equipe', cat: 'Pessoal', value: 9800, date: '05/06' },
      { desc: 'Aluguel clínica', cat: 'Fixo', value: 4200, date: '01/06' },
      { desc: 'Anestésicos', cat: 'Insumos', value: 310, date: '03/06' },
    ],
    series: { receita: [320, 410, 380, 520, 640, 700, 850], custo: [200, 210, 260, 230, 240, 250, 270] },
  };

  return { patients, owners, week, appointments, treatments, inventory, finance,
    consultTypes: [
      /* ── Clínica Geral ─────────────────────────────────── */
      { id: 'consulta-geral',      label: 'Consulta – Clínica Geral',          dur: 40,  price: 'R$ 200,00',    model: 'geral'  },
      { id: 'retorno',             label: 'Retorno / Reavaliação',              dur: 20,  price: 'R$ 0,00',      model: 'geral'  },
      { id: 'vacinacao',           label: 'Vacinação',                          dur: 20,  price: 'R$ 120,00',    model: 'geral'  },
      { id: 'exames-gerais',       label: 'Coleta / Solicitação de Exames',     dur: 30,  price: 'R$ 80,00',     model: 'geral'  },
      /* ── Odontológica ──────────────────────────────────── */
      { id: 'avaliacao-odonto',    label: 'Avaliação Odontológica',             dur: 45,  price: 'R$ 250,00',    model: 'odonto' },
      { id: 'profilaxia',          label: 'Profilaxia Odontológica',            dur: 90,  price: 'R$ 380,00',    model: 'odonto' },
      { id: 'exodontia-simples',   label: 'Exodontia Simples',                  dur: 60,  price: 'R$ 320,00',    model: 'odonto' },
      { id: 'exodontia-cirurgica', label: 'Exodontia Cirúrgica',                dur: 120, price: 'R$ 680,00',    model: 'odonto' },
      { id: 'trat-periodontal',    label: 'Tratamento Periodontal',             dur: 90,  price: 'R$ 480,00',    model: 'odonto' },
      { id: 'cirurgia-oral',       label: 'Cirurgia Oral',                      dur: 180, price: 'R$ 1.500,00',  model: 'odonto' },
      { id: 'endodontia',          label: 'Endodontia / Tratamento de Canal',   dur: 120, price: 'R$ 750,00',    model: 'odonto' },
      { id: 'rx-odonto',           label: 'Radiografia Intraoral',              dur: 30,  price: 'R$ 180,00',    model: 'odonto' },
      /* ── Dermatológica ─────────────────────────────────── */
      { id: 'consulta-derma',      label: 'Consulta – Dermatológica',           dur: 50,  price: 'R$ 220,00',    model: 'derma'  },
      { id: 'citologia-raspad',    label: 'Citologia / Raspado Cutâneo',        dur: 30,  price: 'R$ 150,00',    model: 'derma'  },
      { id: 'trat-otite',          label: 'Tratamento de Otite',                dur: 30,  price: 'R$ 140,00',    model: 'derma'  },
      /* ── Neurologia ───────────────────────────────────── */
      { id: 'consulta-neuro',      label: 'Consulta – Neurologia',              dur: 60,  price: 'R$ 280,00',    model: 'neuro'  },
      { id: 'neuro-retorno',       label: 'Retorno Neurológico',                dur: 30,  price: 'R$ 0,00',      model: 'neuro'  },
      /* ── Nutrição ──────────────────────────────────────── */
      { id: 'consulta-nutri',      label: 'Consulta – Nutrição',                dur: 50,  price: 'R$ 220,00',    model: 'nutri'  },
      { id: 'nutri-retorno',       label: 'Retorno Nutricional',                dur: 30,  price: 'R$ 0,00',      model: 'nutri'  },
      /* ── Ortopédica ────────────────────────────────────── */
      { id: 'consulta-orto',       label: 'Consulta – Ortopédica',              dur: 50,  price: 'R$ 220,00',    model: 'orto'   },
      { id: 'fisiote',             label: 'Fisioterapia / Reabilitação',        dur: 60,  price: 'R$ 180,00',    model: 'orto'   },
      /* ── Avaliação Anestésica ──────────────────────────── */
      { id: 'avaliacao-anest',     label: 'Avaliação Anestésica (Pré-op)',      dur: 30,  price: 'R$ 180,00',    model: 'anest'  },
      { id: 'anestesia',           label: 'Anestesia / Sedação',                dur: 60,  price: 'R$ 380,00',    model: 'anest'  },
    ],
    vets: [
      { id: 'v1', name: 'Sofia Silva', role: 'Odontologia', color: '#2f6fed' },
      { id: 'v2', name: 'André Pereira', role: 'Anestesia', color: '#8b5cf6' },
      { id: 'v3', name: 'Marcos Dias', role: 'Cirurgia', color: '#e0533c' },
    ],
  };
})();
