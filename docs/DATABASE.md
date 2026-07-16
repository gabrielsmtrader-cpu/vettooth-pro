# Banco de dados Supabase

O arquivo executável do banco está em [`supabase/schema.sql`](../supabase/schema.sql).

## Como criar as tabelas

1. Abra o projeto no Supabase.
2. Vá em `SQL Editor`.
3. Cole todo o conteúdo de `supabase/schema.sql`.
4. Clique em `Run`.
5. Recarregue o VetTooth Pro e crie uma nova conta pela tela de cadastro.

## Tabelas criadas

- `usuarios_app`: cadastro/login do app atual.
- `dados_clinica`: backup/sincronização do estado local do usuário.
- `clinicas`: dados da clínica.
- `tutores`, `pacientes`, `atendimentos`, `agenda`.
- `odontogramas`, `procedimentos`, `vacinas`, `exames`.
- `financeiro`, `assinaturas`.

## Observação de segurança

Este schema mantém as policies abertas para o MVP funcionar com a chave pública atual no navegador. Isso resolve o cadastro/login e a persistência agora, mas ainda não é o desenho final de produção.

Antes de usar com dados reais sensíveis, migre para Supabase Auth e policies RLS por clínica/usuário.
