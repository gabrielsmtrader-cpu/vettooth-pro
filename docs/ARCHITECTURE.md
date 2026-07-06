# Arquitetura do VetTooth Pro

## Estado atual

O VetTooth Pro é uma aplicação React local-first, executada diretamente no navegador. Não há build nem imports ES entre os módulos da aplicação principal: cada arquivo registra componentes e serviços no escopo global, e a ordem dos scripts nos HTMLs resolve as dependências.

```text
HTML entrypoint
  -> bibliotecas externas (React, Babel, Supabase, PDF)
  -> core (dados, sync e VtStore)
  -> shared e integrations
  -> features de negócio
  -> app shell
```

Essa organização preserva o funcionamento existente, mas deixa explícita a fronteira de cada responsabilidade.

## Camadas

### `src/core`

- `vt-data.jsx`: dados iniciais e catálogos usados pelo seed.
- `vt-auth.jsx`: `VtStore`, sessão, autenticação e persistência local.
- `vt-db.jsx`: cliente Supabase, repositórios por tabela e bridge de sync.

O core não deve depender de componentes visuais ou de uma feature específica.

### `src/shared`

Componentes e funções reutilizados por mais de um domínio: ícones, campos, editor rico e escores. Código desta pasta não deve conhecer navegação nem regras de uma tela específica.

### `src/features`

Cada diretório representa um domínio:

- `auth`: telas de entrada e cadastro.
- `patients`: pacientes, raças, peso e escore.
- `appointments`: lista e fluxo de atendimentos.
- `records`: prontuário, exames, vacinas, prescrições e documentos.
- `odontology`: odontograma integrado e risco ASA.
- `finance`: caixa, receitas, despesas, assinaturas, contas e split.
- `ai`: VetIA.
- `dashboard`: módulos administrativos e operacionais legados.

Uma feature pode consumir `core` e `shared`. Dependências entre features devem passar por uma API explícita em `window` ou ser extraídas para `shared`/`integrations`.

### `src/integrations`

Adaptadores para serviços externos e coordenação entre módulos. Regras clínicas não devem nascer aqui.

### `src/app`

Contém o shell, a navegação e o ponto final de montagem. Deve compor as features, não implementar suas regras internas.

### `src/apps/equichart`

Aplicação isolada carregada por `EquiChart.html`. Compartilha apenas `VtData` e `VtStore` com a aplicação principal. Seus componentes específicos permanecem juntos para evitar mistura com o odontograma embutido no produto.

## Dados e persistência

```text
Componentes
  -> window.VtStore
     -> localStorage (fonte operacional atual)
     -> bridge com debounce
        -> Supabase dados_clinica (backup JSONB)

Repositórios window.db*
  -> tabelas relacionais do Supabase
```

Hoje existem dois caminhos de dados: o workspace JSON do `VtStore`, efetivamente usado pelas telas, e os repositórios relacionais `window.db*`, ainda parciais. Eles não devem ser tratados como duas fontes de verdade. A evolução recomendada é introduzir repositórios por domínio e migrar uma feature por vez para as tabelas relacionais.

## Contratos globais

Enquanto não houver bundler, estes nomes funcionam como APIs públicas internas:

- `window.VtStore`: sessão e estado da clínica.
- `window.vtDB` e `window.db*`: acesso ao Supabase.
- `window.vtToast`, `window.vtOpenIA` e `_vtSetActive`: comunicação transversal.
- componentes globais como `VtIcon`, `VtField` e módulos registrados pelas features.

Ao alterar um contrato global, pesquise todos os consumidores e mantenha a ordem dos scripts nos entrypoints.

## Ordem de carregamento

`index.html` é a entrada de hosting para Vercel e servidores estáticos. Ele apenas redireciona para `VetTooth Pro.html`, que continua sendo o manifesto executável da aplicação. A ordem obrigatória é:

1. bibliotecas externas;
2. `shared` básico e integrações sem estado;
3. `core/vt-data`, `core/vt-db`, `core/vt-auth`;
4. features, respeitando helpers globais entre arquivos;
5. `integrations/vt-integra`;
6. `app/vt-app` para montar o React.

`vt-db` aparece antes de `vt-auth` por compatibilidade: ele aguarda `VtStore` e instala o bridge assim que o store fica disponível.

## Regras para novas implementações

1. Coloque a regra no domínio dono do dado, não no app shell.
2. Extraia para `shared` apenas quando houver reutilização real.
3. Centralize leituras e gravações em `VtStore` ou em um repositório; não crie novas chaves avulsas no `localStorage`.
4. Não adicione outra cópia do cliente Supabase nem credenciais de serviço no frontend.
5. Registre novos scripts antes dos consumidores e documente novos contratos globais aqui.
6. Mantenha `supabase/schema.sql` compatível com qualquer tabela usada pelo código.

## Débitos arquiteturais priorizados

1. Substituir autenticação local por Supabase Auth e policies por clínica/usuário.
2. Escolher uma fonte de verdade e migrar o JSON `dados_clinica` para repositórios por domínio.
3. Adotar Vite (ou equivalente), módulos ES e variáveis de ambiente.
4. Dividir arquivos legados grandes, especialmente dashboard, IA, pacientes e prontuário.
5. Adicionar testes dos fluxos críticos antes de remover os contratos globais.

Esta refatoração deliberadamente não mistura a organização de diretórios com essas migrações comportamentais. Assim, a estrutura melhora sem alterar os dados já salvos pelos usuários.
