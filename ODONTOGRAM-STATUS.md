# Validação do odontograma — 26/09/2026

## Repositório e produção

- Repositório correto: gabrielsmtrader-cpu/vettooth-pro, branch master.
- Master consultada nesta auditoria: de2bd3f.
- O arquivo de produção src/apps/equichart/vt-odonto-steps.jsx foi obtido por HTTP 200 e comparado com a master.
- Ambos tinham SHA256 1e67ffb822d15d9a7c177f0432b6a1585ddea9e0db8d46630889b706748a1319.
- Portanto, os marcadores sem comportamento clínico também estão na master; não é apenas cache.
- O projeto VETTT é outro repositório e não foi alterado nesta correção.

## Correções locais, ainda não publicadas

- Preenchimento encaminhado diretamente ao clique/ativação do dente.
- Áreas frontais caninas e felinas recebem eventos; acesso pelo teclado.
- Hit-test da borracha atravessa o canvas sem confundir a região com o centro de todas as vistas do dente.
- Removida seleção aproximada por número mais próximo no clique.
- Desenho livre incluído no estado persistido e na comunicação com o wizard.
- Histórico novo preserva preenchimentos e marcações editáveis; leitura das imagens antigas mantida.
- Remoção de marcação pode ser desfeita; borracha também remove preenchimentos.

## Evidências

- 4 testes passaram: node --test scripts/odontogram-regression.test.cjs.
- Os três arquivos JSX editados passaram pela análise sintática.
- Navegador: ativar preenchimento e dente canino 110 pelo teclado mudou fill para rgb(239, 68, 68); Desfazer restaurou rgb(234, 234, 234); nova pintura permaneceu após recarregar.
- Isso não equivale a teste completo por mouse/touch nem a validação clínica.

## Pendências que impedem declarar paridade com Pimbury

- Ferramentas mk-* ainda usam carimbos; mover/rotacionar não modifica a geometria original.
- Fraturas, rampas, ganchos, ondas e incisivos precisam de ações e variantes clínicas próprias, não apenas símbolos.
- Zonas felinas são elipses aproximadas. Necessário mapear contornos reais por dente e vista antes de afirmar preenchimento anatômico integral.
- Histórico ainda usa o nome do paciente como chave; nomes iguais podem colidir.
- Testar desenho, histórico, persistência autenticada, impressão e fluxo incorporado com as três espécies.
- Nenhum push nem deploy foi realizado por esta correção parcial.
