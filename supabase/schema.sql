-- VetTooth Pro - Supabase Schema
-- Execute este arquivo no SQL Editor do Supabase

-- TUTORES (deve vir antes de pacientes)
create table if not exists tutores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text,
  telefone text,
  email text,
  endereco text,
  cidade text,
  cep text,
  created_at timestamptz default now()
);

-- PACIENTES
create table if not exists pacientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  especie text not null check (especie in ('Canino','Felino','Equino')),
  raca text,
  sexo text check (sexo in ('Macho','Fêmea')),
  peso numeric(6,2),
  data_nascimento date,
  cor_pelagem text,
  microchip text,
  alergias text[],
  observacoes text,
  foto_url text,
  tutor_id uuid references tutores(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ATENDIMENTOS
create table if not exists atendimentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id),
  data timestamptz not null default now(),
  status text not null default 'agendado' check (status in ('agendado','confirmado','aguardando','em_atendimento','finalizado','cancelado')),
  tipo text,
  motivo text,
  peso_consulta numeric(6,2),
  fc integer,
  temperatura numeric(4,1),
  fr integer,
  mucosa text,
  tpc text,
  risco_anestesico text check (risco_anestesico in ('I','II','III','IV','V')),
  anamnese text,
  diagnostico text,
  prescricao text,
  vet_responsavel text,
  valor numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AGENDA
create table if not exists agenda (
  id uuid primary key default gen_random_uuid(),
  paciente_nome text not null,
  paciente_id uuid references pacientes(id),
  data date not null,
  hora integer not null check (hora between 7 and 20),
  tipo text not null,
  vet text,
  status text default 'Pendente' check (status in ('Pendente','Confirmado','Cancelado','Concluído')),
  observacoes text,
  created_at timestamptz default now()
);

-- ODONTOGRAMAS
create table if not exists odontogramas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id),
  atendimento_id uuid references atendimentos(id),
  especie text not null,
  arcada text check (arcada in ('Superior','Inferior','Ambas')),
  dentes jsonb default '{}',
  observacoes text,
  vet_responsavel text,
  data_exame timestamptz default now(),
  created_at timestamptz default now()
);

-- FINANCEIRO / CAIXA
create table if not exists financeiro (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('receita','despesa')),
  categoria text,
  descricao text not null,
  valor numeric(10,2) not null,
  data date not null default current_date,
  paciente_id uuid references pacientes(id),
  atendimento_id uuid references atendimentos(id),
  forma_pagamento text check (forma_pagamento in ('Dinheiro','Cartão Crédito','Cartão Débito','PIX','Transferência','Boleto')),
  status text default 'pago' check (status in ('pago','pendente','cancelado')),
  comprovante_url text,
  created_at timestamptz default now()
);

-- ASSINATURAS
create table if not exists assinaturas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id),
  plano text not null,
  valor numeric(10,2) not null,
  frequencia text not null check (frequencia in ('Mensal','Trimestral','Semestral','Anual')),
  data_inicio date not null default current_date,
  proxima_cobranca date,
  status text default 'Ativo' check (status in ('Ativo','Inativo','Cancelado')),
  observacoes text,
  created_at timestamptz default now()
);

-- PROCEDIMENTOS
create table if not exists procedimentos (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid references atendimentos(id),
  paciente_id uuid references pacientes(id),
  tipo text not null,
  descricao text,
  dente_numero text,
  resultado text,
  valor numeric(10,2),
  data timestamptz default now(),
  created_at timestamptz default now()
);

-- VACINAS
create table if not exists vacinas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id),
  nome text not null,
  fabricante text,
  lote text,
  data_aplicacao date not null,
  proxima_dose date,
  vet_responsavel text,
  created_at timestamptz default now()
);

-- EXAMES
create table if not exists exames (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id),
  atendimento_id uuid references atendimentos(id),
  tipo text not null,
  laboratorio text,
  data_solicitacao date default current_date,
  data_resultado date,
  resultado text,
  arquivo_url text,
  created_at timestamptz default now()
);

-- BACKUP/SINCRONIZAÇÃO DO WORKSPACE LOCAL
-- Mantém compatibilidade com o bridge atual em src/core/vt-db.jsx.
create table if not exists dados_clinica (
  email text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS (Row Level Security) - ativar para produção
alter table pacientes enable row level security;
alter table tutores enable row level security;
alter table atendimentos enable row level security;
alter table agenda enable row level security;
alter table odontogramas enable row level security;
alter table financeiro enable row level security;
alter table assinaturas enable row level security;
alter table procedimentos enable row level security;
alter table vacinas enable row level security;
alter table exames enable row level security;
alter table dados_clinica enable row level security;

-- Policies: acesso público (ajuste para auth quando tiver login)
create policy "allow all" on pacientes for all using (true);
create policy "allow all" on tutores for all using (true);
create policy "allow all" on atendimentos for all using (true);
create policy "allow all" on agenda for all using (true);
create policy "allow all" on odontogramas for all using (true);
create policy "allow all" on financeiro for all using (true);
create policy "allow all" on assinaturas for all using (true);
create policy "allow all" on procedimentos for all using (true);
create policy "allow all" on vacinas for all using (true);
create policy "allow all" on exames for all using (true);
create policy "allow all" on dados_clinica for all using (true);

-- Índices para performance
create index on atendimentos(paciente_id);
create index on atendimentos(data);
create index on agenda(data);
create index on odontogramas(paciente_id);
create index on financeiro(data);
create index on procedimentos(atendimento_id);
