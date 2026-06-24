// VetTooth Pro - Supabase Client
// Substitua SUPABASE_URL e SUPABASE_ANON_KEY pelos valores do seu projeto

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://nxxyjzrkumwumkhxiijy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54eHlqenJrdW13dW1raHhpaWp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjQxMzYsImV4cCI6MjA5NzkwMDEzNn0.p-nzq_c49AJCRU5Fz0unpMyREUTO4sxlyiMwlpwYoC8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── PACIENTES ──────────────────────────────────────────────
export const db = {
  pacientes: {
    getAll: () => supabase.from('pacientes').select('*, tutores(*)').order('nome'),
    get: (id) => supabase.from('pacientes').select('*, tutores(*)').eq('id', id).single(),
    create: (data) => supabase.from('pacientes').insert(data).select().single(),
    update: (id, data) => supabase.from('pacientes').update(data).eq('id', id).select().single(),
    delete: (id) => supabase.from('pacientes').delete().eq('id', id),
    search: (q) => supabase.from('pacientes').select('*, tutores(*)').ilike('nome', `%${q}%`),
  },

  tutores: {
    getAll: () => supabase.from('tutores').select('*').order('nome'),
    create: (data) => supabase.from('tutores').insert(data).select().single(),
    update: (id, data) => supabase.from('tutores').update(data).eq('id', id),
  },

  atendimentos: {
    getAll: () => supabase.from('atendimentos').select('*, pacientes(nome,especie)').order('data', { ascending: false }),
    getByPaciente: (pacienteId) => supabase.from('atendimentos').select('*').eq('paciente_id', pacienteId).order('data', { ascending: false }),
    getHoje: () => {
      const hoje = new Date().toISOString().split('T')[0];
      return supabase.from('atendimentos').select('*, pacientes(nome,especie,raca,sexo,peso)').gte('data', hoje).lt('data', hoje + 'T23:59:59');
    },
    create: (data) => supabase.from('atendimentos').insert(data).select().single(),
    update: (id, data) => supabase.from('atendimentos').update(data).eq('id', id).select().single(),
  },

  agenda: {
    getAll: () => supabase.from('agenda').select('*').order('data').order('hora'),
    getByData: (data) => supabase.from('agenda').select('*').eq('data', data),
    create: (data) => supabase.from('agenda').insert(data).select().single(),
    update: (id, data) => supabase.from('agenda').update(data).eq('id', id),
    delete: (id) => supabase.from('agenda').delete().eq('id', id),
  },

  odontogramas: {
    getByPaciente: (pacienteId) => supabase.from('odontogramas').select('*').eq('paciente_id', pacienteId).order('created_at', { ascending: false }),
    create: (data) => supabase.from('odontogramas').insert(data).select().single(),
    update: (id, data) => supabase.from('odontogramas').update(data).eq('id', id),
  },

  financeiro: {
    getAll: () => supabase.from('financeiro').select('*, pacientes(nome)').order('data', { ascending: false }),
    getByMes: (ano, mes) => {
      const start = `${ano}-${String(mes).padStart(2,'0')}-01`;
      const end = `${ano}-${String(mes).padStart(2,'0')}-31`;
      return supabase.from('financeiro').select('*').gte('data', start).lte('data', end);
    },
    create: (data) => supabase.from('financeiro').insert(data).select().single(),
    update: (id, data) => supabase.from('financeiro').update(data).eq('id', id),
    delete: (id) => supabase.from('financeiro').delete().eq('id', id),
  },

  assinaturas: {
    getAll: () => supabase.from('assinaturas').select('*, pacientes(nome)').order('created_at', { ascending: false }),
    create: (data) => supabase.from('assinaturas').insert(data).select().single(),
    update: (id, data) => supabase.from('assinaturas').update(data).eq('id', id),
  },

  procedimentos: {
    getByAtendimento: (atendimentoId) => supabase.from('procedimentos').select('*').eq('atendimento_id', atendimentoId),
    getByPaciente: (pacienteId) => supabase.from('procedimentos').select('*').eq('paciente_id', pacienteId).order('data', { ascending: false }),
    create: (data) => supabase.from('procedimentos').insert(data).select().single(),
  },

  vacinas: {
    getByPaciente: (pacienteId) => supabase.from('vacinas').select('*').eq('paciente_id', pacienteId).order('data_aplicacao', { ascending: false }),
    create: (data) => supabase.from('vacinas').insert(data).select().single(),
  },

  exames: {
    getByPaciente: (pacienteId) => supabase.from('exames').select('*').eq('paciente_id', pacienteId).order('data_solicitacao', { ascending: false }),
    create: (data) => supabase.from('exames').insert(data).select().single(),
    update: (id, data) => supabase.from('exames').update(data).eq('id', id),
  },
};
