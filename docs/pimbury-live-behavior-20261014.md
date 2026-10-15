# Pimbury Dental: observação direta, 14/10/2026

Fonte: aplicativo instalado e autenticado no Mac, operado pela interface.
Não foram utilizados vídeos anexados nem extraídos código ou recursos do aplicativo.
Testes realizados no fluxo de novo gráfico do paciente Teste. Não foi enviado relatório.
Esta matriz é parcial: tentativa sem resultado visível não conta como comportamento confirmado.

## Comportamentos observados

| Controle | Resultado observado | Limite da verificação |
| --- | --- | --- |
| Protuberância/altura | No 106 lateral: normal → aumentado → reduzido → ausente → normal. A ausência remove também a representação oclusal. | Ciclo completo confirmado. Dimensões exatas não medidas. |
| ATR/ETR | No 107 lateral: borda escura recortada projetada além da coroa. Segundo clique restaura tooth107 1. | Liga/desliga confirmado nesse dente. |
| Pontas | Clique no 108 marcou a fileira superior esquerda, não somente o dente. | Outros quadrantes e remoção pendentes. |
| Rampa | No 109: estados ramp 1 → 2 → 3 → 4 → 5 → 6 → normal. | Geometria de cada estágio ainda precisa ser comparada. |
| Gancho | No terminal 111: hook 1 → 2 → 3 → 4 → 5 → 6 → normal. Tentativa no 110 não produziu resultado confirmado. | Geometria de cada estágio e elegibilidade nos demais dentes pendentes. |
| Onda | Clique no 207 alterou segmentos dos dentes superiores e inferiores do mesmo lado. | Remoção e demais estados pendentes. |
| Alterações dos incisivos | Menu com smile, frown, wedge lh, wedge rh e Remover. Seleção smile altera as bordas dos incisivos superiores e inferiores. | Não confundir com botão separado de vista incisal. Demais formas a validar. |
| Fratura | No 206 oclusal: fracture 1 → 2 → 3 → 4 → normal. Contorno vermelho e remoção de porções diferentes, com retorno ao contorno completo confirmado. | Arraste pendente. Não assumir corte livre como gesto padrão. |
| Mover | Arraste do 207 oclusal deslocou a peça. | Limites, outras vistas, persistência pendentes. |
| Diastema | Marcador entre 206/207 com linhas e pequenas setas. | Remoção e áreas elegíveis pendentes. |
| Dente de lobo | Símbolo circular em V na posição 205. | Ciclos pendentes. |
| Capas | Símbolo C visível acima do 207 após testes de clique/arraste. | Gesto exato ainda precisa ser isolado. |
| Preenchimento | Pressão longa abre oito opções: preto, verde, vermelho, azul, sólidos e hachurados. | Aplicação em dentes ainda não confirmada. |
| Lápis | Arraste desenha traço livre na vista incisal. | Traço não apareceu na vista principal. Cores/espessuras pendentes. |
| Vista incisal | Controle de idade de 1 a 25+, inicial 5. Alterar para 14 mudou anatomia e detalhes internos das superfícies oclusais. | Não equivale a ampliar os incisivos frontais. |
| Ferramentas na vista incisal | ATR/ETR, pontas, rampa, gancho, onda e alterações dos incisivos desabilitados; rotação ocupa lugar de fratura. | Gesto e passos da rotação pendentes. |

## Lacunas no VetTooth identificadas no código

- Ciclo de altura anterior era normal → ausente → aumentado → normal; não tinha reduzido.
- Botão de alterações dos incisivos abria a vista ampliada, sem o menu de formas.
- Formas clínicas eram desenhadas dentro do contorno, sem extensão anatômica da borda.
- Onda e pontas são tratadas por dente, diferente do agrupamento observado.
- Vista incisal não tem a anatomia oclusal por idade observada no aplicativo.
- A implementação em andamento de corte livre não reproduz, sozinha, o ciclo de fratura oclusal observado.

## Alteração local deste checkpoint

Ciclo de altura corrigido para aumentado → reduzido → ausente → normal, mantendo os campos antigos de persistência e os achados independentes. Renderização reduzida adicionada. Teste automatizado atualizado para as quatro transições. Os 11 testes passaram.

No navegador local, o clique direto no 106 ativou a escala 1.25. Ativação por teclado verificou redução 0.75, ausência nas duas representações e retorno à escala 1. O painel de condições foi limitado à ferramenta Selecionar, evitando que o gráfico encolha no meio de uma operação clínica; clique direto e estabilidade do gráfico conferidos após recarregar.

Não implica paridade visual completa, validação ponta a ponta, push ou publicação.

## Próxima validação obrigatória

1. Isolar aplicação/remoção de preenchimento, capas, ulceração e tártaro.
2. Completar ciclos de ATR/ETR, rampa, gancho, pontas, onda e fratura.
3. Verificar rotação, desfazer e persistência sem alterar prontuários reais.
4. Implementar as diferenças observadas e testar no VetTooth em cada espécie.
5. Só afirmar paridade depois de comparar os resultados das mesmas ações nos dois aplicativos.
