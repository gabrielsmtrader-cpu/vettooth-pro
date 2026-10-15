# Pimbury Dental 2.6.0 — mapa estático do odontograma

Data da análise: 2026-10-15

## Identidade verificada

- Aplicativo: `Pimbury Dental`
- Bundle: `com.pimburydental.Pimbury-Dental`
- Versão: `2.6.0` (build `1`)
- Plataforma: iPadOS, executável Mach-O arm64
- SHA-256 do executável: `7af658c3a5e9c9b7f650b9b4edfabbe9ec1e1f1e63fc72468bbf1734905b1184`
- Artefato analisado: `/Applications/Pimbury Dental.app/Wrapper/Pimbury Dental.app`

## Evidências REA

- Info.plist: `ev_889c521b706e3cb4fcd08cbbb1d4475f1fb9c63c1e161b401cd76cdad2e38ec8`
- Mach-O completo retido: `ev_a3579b5343e41392a8c3593fe9c07c1bf9d7de3516d8ff905c9d78e8fb015eba`
- Resumo Mach-O: `ev_a2eeff198a235dda64335b39a794a54e81f36c8b16247e991176385bacd90235`
- Interface Builder completo retido: `ev_592cca2b989dfff1fded150367ac43d68f15907c24d10733d521aebaf452bc21`
- Resumo Interface Builder: `ev_183960d2d43df0090c604a169463eb1787e081bf63b95918c1d043f8c9c88ff3`

## Limitação do executável

O carregador do Ghidra detectou criptografia a partir do offset `0x17a000` (tamanho inicial observado `0x1000`). A análise global excedeu 330 segundos enquanto o decompilador encontrava instruções cifradas. Portanto, pseudocódigo integral do binário da App Store não é evidência disponível. Recursos, metadados Objective-C visíveis, NIBs e observação controlada da interface continuam utilizáveis.

## Estrutura funcional observada

O aplicativo não desenha todas as alterações com primitivas genéricas. Ele seleciona imagens pré-renderizadas específicas por dente, lado e estágio. A instalação contém, no diretório raiz do bundle:

- 295 arquivos relacionados a fratura;
- 353 relacionados a bordas afiadas;
- 127 relacionados a rampa;
- 85 relacionados a gancho;
- 99 relacionados a ATR/ETR;
- 14 relacionados a onda;
- 37 relacionados a altura/protuberância;
- recursos próprios para diastema, dente de lobo, capa, úlcera e tártaro.

### Ciclos confirmados pelos nomes dos recursos

- Rampa: seis estágios por dente aplicável (`tooth<ID>_ramp_1...6`).
- Gancho: seis estágios por dente aplicável (`tooth<ID>_hook_1...6`).
- Onda: seis estágios por lado (`left_wave_1...6` e `right_wave_1...6`).
- ATR/ETR: três estados por dente posterior (`tooth<ID>_atr_1...3`).
- Fratura: quatro estados superiores e quatro inferiores, com variantes combinadas com quatro estados de borda afiada (`*_upper_fracture_1...4`, `*_lower_fracture_1...4` e `*_fracture_3_sharp_1...4`).

Os dentes terminais 106/111, 206/211, 306/311 e 406/411 possuem as seis variantes de rampa e gancho. O aplicativo também contém variantes individuais de rampa para dentes intermediários.

## Seletores e estados visíveis no binário

Os metadados textuais preservados no executável revelam os seguintes manipuladores e estruturas:

- `fracturePressed:`, `fracturePressedTooth:`, `fractureUndo`, `getFractureInt:`;
- `sharpEdgesPressed:`, `sharpPressedTooth:`, `sharpUndo`, `getSharpInt:`;
- `rampPressed:`, `rampPressedTooth:`, `rampUndo:`;
- `hookPressed:`, `hookPressedTooth:`, `hookUndo:`;
- `atrPressed:`, `atrPressedTooth:`, `atrUndo:`;
- `waveButton`, `clearWave:`;
- `proPressedTooth:`;
- `diastPressed:`, `wolfToothPressed:`, `tartarPressed:`, `ulcerPressed:`;
- `toothPanned:`, `toothPannedRotate:`, `toothRotated:`;
- pilhas separadas de desenho/desfazer/refazer para a visão principal e incisivos.

Também foram observadas rotinas explícitas de composição entre estados:

- `sortFractureUndoCheckingSharp:fractureInt:sharpInt:sharpIntBottom:imageStringPart1:imageStringPart2:`;
- `sortSharpUndoCheckingFracture:fractureInt:sharpInt:imageStringPart1:imageStringPart2:`;
- `sortOppositeHook:andValue:`;
- `sortOppositeRamp:andValue:`.

Isso confirma que fratura e borda afiada não são efeitos independentes sobrepostos de forma livre: o Pimbury escolhe uma variante combinada. Gancho e rampa também sincronizam/ajustam o lado oposto por regras próprias.

## Arquivos de interface relevantes

- `ChartIllustrationView.nib`: 622 objetos e 139 conexões;
- `ChartViewController.nib`: 493 objetos e 121 conexões;
- `FillColorSelectViewController.nib`: 68 objetos e 17 conexões;
- `ATRTypeSelectViewController.nib`: 23 objetos e 4 conexões;
- `ColorSelectViewController.nib` e `SharpColorSelectViewController.nib`;
- `IncisorsIllustrationView`, `FrontTeethSelectViewController` e recursos `chart_incisor_*`.

## Obrigações para paridade no VetTooth

1. Representar cada ferramenta como máquina de estados, não como booleano.
2. Manter estados separados por dente, vista, metade superior/inferior e lado quando aplicável.
3. Implementar as combinações fratura + borda afiada sem apagar a condição anterior.
4. Sincronizar as vistas repetidas do mesmo dente por identidade clínica, preservando geometria específica de cada vista.
5. Implementar desfazer/refazer incluindo o estado composto e as transformações de posição/rotação.
6. Validar os ciclos completos: ATR/ETR (3), rampa (6), gancho (6), onda (6), fratura superior/inferior (4 cada) e retorno ao estado normal.
7. Tratar incisivos como subsistema próprio, com pilhas de desenho e estados independentes.

## Próximas verificações

- Mapear visualmente cada estágio para sua geometria limpa no SVG do VetTooth.
- Confirmar, por observação controlada, a ordem exata de ciclo e o comportamento de clique/arraste de cada ferramenta.
- Conferir o efeito de `sortOppositeHook` e `sortOppositeRamp` em todos os quadrantes.
- Criar testes de regressão por ferramenta, dente, vista, combinação e desfazer/refazer.
