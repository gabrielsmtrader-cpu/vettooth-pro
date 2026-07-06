# VetTooth Pro

Sistema de gestão odontológica veterinária para pequenos animais e equinos.

## Executar localmente

O projeto atual não usa bundler: React e Babel são carregados pelo navegador. Sirva a raiz por HTTP e abra `VetTooth Pro.html`.

```bash
python3 -m http.server 8080
```

- Aplicação principal: `http://localhost:8080/VetTooth%20Pro.html`
- Odontograma equino isolado: `http://localhost:8080/EquiChart.html`

Não abra os HTMLs diretamente com `file://`; alguns navegadores bloqueiam os scripts JSX externos.

## Estrutura

```text
src/
  app/             shell e inicialização da aplicação principal
  core/            estado, autenticação local, dados base e sync Supabase
  features/        módulos separados por domínio clínico
  shared/          componentes e utilitários compartilhados
  integrations/    Google Calendar e integração entre módulos
  apps/equichart/  aplicação isolada do odontograma equino
assets/            recursos visuais estáticos
supabase/          schema e cliente de referência
docs/              decisões e mapa da arquitetura
```

Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) antes de criar ou mover módulos.

## Supabase

1. Crie um projeto no Supabase.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Configure a URL e a chave pública usadas pelo bridge em `src/core/vt-db.jsx`.

O estado funcional ainda é local-first: `VtStore` persiste no `localStorage`, e o Supabase atua como sincronização/backup. As policies atuais são permissivas e precisam ser substituídas por Supabase Auth + isolamento por clínica antes de produção.

## Desenvolvido por

Dr. Gabriel Martinez — @martinez.vetodonto  
Medicina Veterinária · Odontologia Veterinária
