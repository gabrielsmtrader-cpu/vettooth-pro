# QA — ícones fornecidos para a barra equina

## Escopo
Troca dos sete ícones anexados, mantendo os comandos existentes. Não certifica implementação clínica ou paridade funcional com Pimbury.

## Evidências
- Referência: /Users/vini_deiro/Downloads/WhatsApp Image 2026-09-26 at 22.02.17.jpeg (1280 × 698).
- Implementação equina: /tmp/vettooth-equino-toolbar.png (1280 × 720).
- URL: http://127.0.0.1:4210/EquiChart.html?patient=Validacao%20Equino&species=Equino&embed=wizard&step=odontograma
- Capturas comparadas juntas, concentrando a análise na barra e nas sete silhuetas, não no odontograma que está fora da referência.
- Estado: Ganchos selecionado por teclado; aria-pressed confirmado como true.
- Verificação adicional em janela estreita: /tmp/vettooth-toolbar-reference-check.png (728 × 743); módulos quebram linha sem esconder ferramentas.
- As capturas não foram redimensionadas para afirmar equivalência de pixels. Comparação de silhuetas e tratamento visual, respeitando a disposição responsiva do produto existente.

## Histórico da comparação
1. Primeira captura: incisivos e diastema pequenos e bordas serrilhadas com contraste alto (P2).
2. Ajuste dos tamanhos individuais e redução do contraste; nova captura canina e captura equina confirmaram silhuetas legíveis e ausência do quadriculado.

## Superfícies verificadas
- Tipografia: textos e rótulos existentes preservados; letras do tártaro fazem parte da imagem original.
- Espaçamento: alvos de 44px preservados; sete imagens centradas em caixas de 32px, sem corte da silhueta.
- Cores: imagens brancas sobre módulos quase pretos; foco e seleção do produto mantidos.
- Imagens: arquivos JPEG originais, sem redesenho; fundo quadriculado ocultado por filtro CSS e composição screen. Os arquivos não são SVG nem PNG transparente.
- Conteúdo: cada imagem vinculada à ferramenta correspondente; pintar dente e linha continuam disponíveis embora não apareçam na referência.

## Testes
- 5 testes de regressão passaram, incluindo existência dos sete arquivos e associação aos IDs corretos.
- JSX analisado sem erro de sintaxe.
- Seleção de Tártaro no canino e Ganchos no equino confirmada; nenhum clique de ferramenta aplicado a dentes nesta validação visual.
- Console canino sem erros durante a conferência.

## Follow-up
- P3: os JPEGs enviados têm resolução limitada; arquivos originais transparentes dariam melhor acabamento em ampliação.
- Funções clínicas pendentes continuam descritas em ODONTOGRAM-STATUS.md; não houve push/deploy nesta tarefa.

final result: passed
