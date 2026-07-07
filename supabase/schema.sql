-- VetTooth Pro - Supabase Schema
-- Execute este arquivo no SQL Editor do Supabase.
--
-- Este schema mantém compatibilidade com o app atual:
-- - login/cadastro via tabela usuarios_app;
-- - sincronização local-first via dados_clinica;
-- - tabelas relacionais para evolução dos módulos clínicos.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- ORGANIZAÇÃO / LOGIN DO APP
-- ─────────────────────────────────────────────────────────────

create table if not exists clinicas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text default 'clinica',
  telefone text,
  email text,
  documento text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists usuarios_app (
  email text primary key,
  clinic_id uuid references clinicas(id) on delete set null,
  name text not null,
  clinic text default '',
  pass_hash text not null,
  perms jsonb not null default '["Administrador"]'::jsonb,
  avatar text default '',
  crmv text default '',
  crmv_uf text default '',
  phone text default '',
  specialty text default '',
  reset_code text,
  reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backup/sincronização do workspace local.
-- O frontend atual salva o estado funcional inteiro aqui.
create table if not exists dados_clinica (
  email text primary key references usuarios_app(email) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- CADASTROS CLÍNICOS
-- ─────────────────────────────────────────────────────────────

create table if not exists tutores (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id) on delete set null,
  nome text not null,
  cpf text,
  telefone text,
  whatsapp text,
  email text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pacientes (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id) on delete set null,
  tutor_id uuid references tutores(id) on delete set null,
  nome text not null,
  especie text not null,
  raca text,
  sexo text,
  peso numeric(8,2),
  data_nascimento date,
  cor_pelagem text,
  microchip text,
  alergias text[],
  observacoes text,
  foto_url text,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists atendimentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id) on delete set null,
  paciente_id uuid references pacientes(id) on delete set null,
  data timestamptz not null default now(),
  status text not null default 'agendado',
  tipo text,
  motivo text,
  peso_consulta numeric(8,2),
  fc integer,
  temperatura numeric(4,1),
  fr integer,
  mucosa text,
  tpc text,
  risco_anestesico text,
  anamnese text,
  diagnostico text,
  prescricao text,
  vet_responsavel text,
  valor numeric(12,2),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agenda (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id) on delete set null,
  paciente_id uuid references pacientes(id) on delete set null,
  paciente_nome text not null,
  data date not null,
  hora integer,
  inicio timestamptz,
  fim timestamptz,
  tipo text not null,
  vet text,
  status text not null default 'Pendente',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- ODONTOLOGIA / PRONTUÁRIO
-- ─────────────────────────────────────────────────────────────

create table if not exists odontogramas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id) on delete set null,
  paciente_id uuid references pacientes(id) on delete cascade,
  atendimento_id uuid references atendimentos(id) on delete set null,
  especie text,
  arcada text,
  dentes jsonb not null default '{}'::jsonb,
  observacoes text,
  vet_responsavel text,
  data_exame timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists procedimentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id) on delete set null,
  atendimento_id uuid references atendimentos(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete cascade,
  tipo text not null,
  descricao text,
  dente_numero text,
  resultado text,
  valor numeric(12,2),
  data timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vacinas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id) on delete set null,
  paciente_id uuid references pacientes(id) on delete cascade,
  nome text not null,
  fabricante text,
  lote text,
  data_aplicacao date not null,
  proxima_dose date,
  vet_responsavel text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists exames (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id) on delete set null,
  paciente_id uuid references pacientes(id) on delete cascade,
  atendimento_id uuid references atendimentos(id) on delete set null,
  tipo text not null,
  laboratorio text,
  data_solicitacao date default current_date,
  data_resultado date,
  resultado text,
  arquivo_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- FINANCEIRO
-- ─────────────────────────────────────────────────────────────

create table if not exists financeiro (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id) on delete set null,
  paciente_id uuid references pacientes(id) on delete set null,
  atendimento_id uuid references atendimentos(id) on delete set null,
  tipo text not null,
  categoria text,
  descricao text not null,
  valor numeric(12,2) not null,
  data date not null default current_date,
  forma_pagamento text,
  status text not null default 'pago',
  comprovante_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assinaturas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id) on delete set null,
  paciente_id uuid references pacientes(id) on delete cascade,
  plano text not null,
  valor numeric(12,2) not null,
  frequencia text not null,
  data_inicio date not null default current_date,
  proxima_cobranca date,
  status text not null default 'Ativo',
  observacoes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- UPDATED_AT AUTOMÁTICO
-- ─────────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clinicas_updated_at on clinicas;
create trigger trg_clinicas_updated_at before update on clinicas for each row execute function set_updated_at();

drop trigger if exists trg_usuarios_app_updated_at on usuarios_app;
create trigger trg_usuarios_app_updated_at before update on usuarios_app for each row execute function set_updated_at();

drop trigger if exists trg_tutores_updated_at on tutores;
create trigger trg_tutores_updated_at before update on tutores for each row execute function set_updated_at();

drop trigger if exists trg_pacientes_updated_at on pacientes;
create trigger trg_pacientes_updated_at before update on pacientes for each row execute function set_updated_at();

drop trigger if exists trg_atendimentos_updated_at on atendimentos;
create trigger trg_atendimentos_updated_at before update on atendimentos for each row execute function set_updated_at();

drop trigger if exists trg_agenda_updated_at on agenda;
create trigger trg_agenda_updated_at before update on agenda for each row execute function set_updated_at();

drop trigger if exists trg_odontogramas_updated_at on odontogramas;
create trigger trg_odontogramas_updated_at before update on odontogramas for each row execute function set_updated_at();

drop trigger if exists trg_procedimentos_updated_at on procedimentos;
create trigger trg_procedimentos_updated_at before update on procedimentos for each row execute function set_updated_at();

drop trigger if exists trg_vacinas_updated_at on vacinas;
create trigger trg_vacinas_updated_at before update on vacinas for each row execute function set_updated_at();

drop trigger if exists trg_exames_updated_at on exames;
create trigger trg_exames_updated_at before update on exames for each row execute function set_updated_at();

drop trigger if exists trg_financeiro_updated_at on financeiro;
create trigger trg_financeiro_updated_at before update on financeiro for each row execute function set_updated_at();

drop trigger if exists trg_assinaturas_updated_at on assinaturas;
create trigger trg_assinaturas_updated_at before update on assinaturas for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS / POLICIES MVP
-- ─────────────────────────────────────────────────────────────
-- As policies abaixo liberam o acesso pelo anon key para o MVP atual.
-- Antes de produção real, migrar para Supabase Auth e restringir por clínica.

alter table clinicas enable row level security;
alter table usuarios_app enable row level security;
alter table dados_clinica enable row level security;
alter table tutores enable row level security;
alter table pacientes enable row level security;
alter table atendimentos enable row level security;
alter table agenda enable row level security;
alter table odontogramas enable row level security;
alter table procedimentos enable row level security;
alter table vacinas enable row level security;
alter table exames enable row level security;
alter table financeiro enable row level security;
alter table assinaturas enable row level security;

drop policy if exists "allow all" on clinicas;
create policy "allow all" on clinicas for all using (true) with check (true);

drop policy if exists "allow all" on usuarios_app;
create policy "allow all" on usuarios_app for all using (true) with check (true);

drop policy if exists "allow all" on dados_clinica;
create policy "allow all" on dados_clinica for all using (true) with check (true);

drop policy if exists "allow all" on tutores;
create policy "allow all" on tutores for all using (true) with check (true);

drop policy if exists "allow all" on pacientes;
create policy "allow all" on pacientes for all using (true) with check (true);

drop policy if exists "allow all" on atendimentos;
create policy "allow all" on atendimentos for all using (true) with check (true);

drop policy if exists "allow all" on agenda;
create policy "allow all" on agenda for all using (true) with check (true);

drop policy if exists "allow all" on odontogramas;
create policy "allow all" on odontogramas for all using (true) with check (true);

drop policy if exists "allow all" on procedimentos;
create policy "allow all" on procedimentos for all using (true) with check (true);

drop policy if exists "allow all" on vacinas;
create policy "allow all" on vacinas for all using (true) with check (true);

drop policy if exists "allow all" on exames;
create policy "allow all" on exames for all using (true) with check (true);

drop policy if exists "allow all" on financeiro;
create policy "allow all" on financeiro for all using (true) with check (true);

drop policy if exists "allow all" on assinaturas;
create policy "allow all" on assinaturas for all using (true) with check (true);

-- ─────────────────────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────────────────────

create index if not exists idx_usuarios_app_clinic_id on usuarios_app(clinic_id);
create index if not exists idx_dados_clinica_updated_at on dados_clinica(updated_at desc);
create index if not exists idx_tutores_nome on tutores(nome);
create index if not exists idx_pacientes_nome on pacientes(nome);
create index if not exists idx_pacientes_tutor_id on pacientes(tutor_id);
create index if not exists idx_atendimentos_paciente_id on atendimentos(paciente_id);
create index if not exists idx_atendimentos_data on atendimentos(data desc);
create index if not exists idx_agenda_data on agenda(data);
create index if not exists idx_odontogramas_paciente_id on odontogramas(paciente_id);
create index if not exists idx_procedimentos_atendimento_id on procedimentos(atendimento_id);
create index if not exists idx_procedimentos_paciente_id on procedimentos(paciente_id);
create index if not exists idx_vacinas_paciente_id on vacinas(paciente_id);
create index if not exists idx_exames_paciente_id on exames(paciente_id);
create index if not exists idx_financeiro_data on financeiro(data desc);
create index if not exists idx_assinaturas_paciente_id on assinaturas(paciente_id);
