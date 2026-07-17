/* ============================================================
   VetTooth Pro — Documentos (Fase 4)
   Renderização HTML rica por tipo de documento.
   Design aplicado via vtClinic() (cor, tema, logo, contatos).
   ============================================================ */
const { useState: dUse } = React;

function docCtx(patient, at) {
  const vet = window.vtVetSignature(at.vet);
  return { clinic: window.vtClinic(), vet, patient, tutor: patient.owner, date: window.PR.todayBR() };
}

window.DOC_TEMPLATES = {
  'Atestado de saúde': (c) => `ATESTADO DE SAÚDE\n\nAtesto, para os devidos fins, que o animal ${c.patient.name} (espécie ${c.patient.species}, raça ${c.patient.breed}, sexo ${c.patient.sex}), de propriedade de ${c.tutor}, foi submetido a exame clínico nesta data e encontra-se em bom estado geral de saúde, apto para as atividades a que se destina.\n\nObservações: ___________________________________________\n\n${c.clinic.address || ''}\nData: ${c.date}`,
  'Atestado de sanidade': (c) => `ATESTADO DE SANIDADE\n\nAtesto que o animal ${c.patient.name} (${c.patient.species} · ${c.patient.breed}), de propriedade de ${c.tutor}, encontra-se clinicamente sadio, sem sinais de doença infectocontagiosa no momento do exame.\n\nData: ${c.date}`,
  'Atestado de repouso': (c) => `ATESTADO DE REPOUSO\n\nAtesto que o animal ${c.patient.name} (${c.patient.species} · ${c.patient.breed}), de propriedade de ${c.tutor}, necessita de repouso pelo período de ___ dias, a contar de ${c.date}, devendo ser afastado de atividades físicas, exercícios e esforços durante este período.\n\nMotivo: ___________________________________________\nObservações: ___________________________________________\n\nData: ${c.date}`,
  'Atestado de óbito': (c) => `ATESTADO DE ÓBITO\n\nAtesto o óbito do animal ${c.patient.name} (${c.patient.species} · ${c.patient.breed}), de propriedade de ${c.tutor}, ocorrido em ___/___/______.\n\nCausa provável: ___________________________________________\n\nData: ${c.date}`,
  'Termo de consentimento': (c) => `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO\n\nEu, ${c.tutor}, responsável pelo animal ${c.patient.name} (${c.patient.species}), declaro que fui devidamente informado(a) pelo(a) médico(a) veterinário(a) sobre o procedimento indicado, seus riscos, benefícios e alternativas, e AUTORIZO sua realização.\n\nDeclaro estar ciente de que a medicina veterinária não é ciência exata e não há garantia de resultados.\n\nData: ${c.date}`,
  'Termo de consentimento anestésico': (c) => `TERMO DE CONSENTIMENTO ANESTÉSICO\n\nEu, ${c.tutor}, autorizo a sedação/anestesia do animal ${c.patient.name} (${c.patient.species}), estando ciente dos riscos anestésicos inerentes ao procedimento, classificação ASA e da necessidade de exames pré-operatórios.\n\nData: ${c.date}`,
  'Termo de internação': (c) => `TERMO DE INTERNAÇÃO\n\nEu, ${c.tutor}, autorizo a internação do animal ${c.patient.name} (${c.patient.species}) para tratamento, estando ciente das condutas, custos e da rotina hospitalar.\n\nMotivo da internação: ___________________________________\nData de entrada: ${c.date}`,
  'Termo de responsabilidade': (c) => `TERMO DE RESPONSABILIDADE\n\nEu, ${c.tutor}, assumo total responsabilidade pelos cuidados, administração de medicações e seguimento das orientações referentes ao animal ${c.patient.name} (${c.patient.species}).\n\nData: ${c.date}`,
  'Termo de eutanásia': (c) => `TERMO DE CONSENTIMENTO PARA EUTANÁSIA\n\nEu, ${c.tutor}, responsável pelo animal ${c.patient.name} (${c.patient.species}), após esclarecimento do(a) médico(a) veterinário(a) quanto ao quadro clínico e prognóstico, AUTORIZO o procedimento de eutanásia, conforme Resolução CFMV.\n\nData: ${c.date}`,

  /* ============================================================
     NOVOS DOCUMENTOS — v5
     Elaborados conforme legislação veterinária brasileira vigente:
     CC arts. 927/945/951 · CFMV Res. 722/2002, 1000/2012,
     1236/2018, 1377/2022 · Lei 9.605/98 · IN MAPA 35/2006
     ============================================================ */

  'Atestado Sanitário': (c) => `ATESTADO SANITÁRIO\n\nEu, M.V. ${c.vet.name || '___________'}, CRMV ${c.vet.crmv || '___________'}, atesto para os devidos fins que o animal abaixo identificado foi submetido a exame clínico nesta data e encontra-se em condições sanitárias adequadas.\n\nIDENTIFICAÇÃO DO ANIMAL:\nNome: ${c.patient.name}\nEspécie: ${c.patient.species} | Raça: ${c.patient.breed || '—'} | Sexo: ${c.patient.sex || '—'}\nPelagem/Cor: ___________ | Idade: ___________ | Peso: ___________ kg\nMicrochip/Tatuagem: ${c.patient.chip || '___________'}\n\nPROPRIETÁRIO/RESPONSÁVEL:\nNome: ${c.tutor}\nCPF/CNPJ: _________________________\nEndereço: _________________________\n\nSITUAÇÃO SANITÁRIA:\n[ ] Livre de sinais clínicos de doenças infectocontagiosas\n[ ] Vacinação atualizada conforme calendário profilático\n[ ] Controle de ecto e endoparasitos realizado em: ___/___/______\n\nFINALIDADE DECLARADA:\n[ ] Transporte / trânsito interestadual   [ ] Exposição / evento   [ ] Reprodução\n[ ] Outra: ___________\n\nObservações: _________________________\n\nValidade: ___ dias contados desta data.\nFundamentação: Instrução Normativa MAPA nº 35/2006 e Resoluções CFMV.\n\nLocal: ${c.clinic.name || '___________'} — Data: ${c.date}`,

  'Atestado de Vacinação': (c) => `ATESTADO DE VACINAÇÃO\n\nEu, M.V. ${c.vet.name || '___________'}, CRMV ${c.vet.crmv || '___________'}, atesto que o animal abaixo identificado recebeu as seguintes imunizações sob minha responsabilidade técnica:\n\nIDENTIFICAÇÃO DO ANIMAL:\nNome: ${c.patient.name}\nEspécie: ${c.patient.species} | Raça: ${c.patient.breed || '—'} | Sexo: ${c.patient.sex || '—'}\nIdade: ___________ | Peso: ___________ kg | Microchip: ${c.patient.chip || '___________'}\nProprietário(a): ${c.tutor}\n\nREGISTRO DE VACINAÇÕES:\n\nVacina: ___________________________\nFabricante / Lote: ___________ / ___________ | Via: ___________\nData de aplicação: ___/___/______ | Próxima dose: ___/___/______\n\nVacina: ___________________________\nFabricante / Lote: ___________ / ___________ | Via: ___________\nData de aplicação: ___/___/______ | Próxima dose: ___/___/______\n\nVacina: ___________________________\nFabricante / Lote: ___________ / ___________ | Via: ___________\nData de aplicação: ___/___/______ | Próxima dose: ___/___/______\n\nVacina: ___________________________\nFabricante / Lote: ___________ / ___________ | Via: ___________\nData de aplicação: ___/___/______ | Próxima dose: ___/___/______\n\nAntiparasitário: _________________________\nData de aplicação: ___/___/______ | Próxima aplicação: ___/___/______\n\nObservações: _________________________\n\nEste atestado não substitui a Caderneta/Carteirinha de Vacinação do animal.\nFundamentação: Resolução CFMV nº 1236/2018.\n\nData: ${c.date}`,

  'Atestado de Encaminhamento': (c) => `ATESTADO DE ENCAMINHAMENTO\n\nEu, M.V. ${c.vet.name || '___________'}, CRMV ${c.vet.crmv || '___________'}${c.vet.especialidade ? ', ' + c.vet.especialidade : ''}, atesto que o animal abaixo identificado foi atendido nesta clínica e está sendo encaminhado para avaliação e/ou tratamento especializado.\n\nIDENTIFICAÇÃO DO ANIMAL:\nNome: ${c.patient.name}\nEspécie: ${c.patient.species} | Raça: ${c.patient.breed || '—'} | Sexo: ${c.patient.sex || '—'}\nIdade: ___________ | Peso: ___________ kg\nProprietário(a): ${c.tutor}\n\nMOTIVO DO ENCAMINHAMENTO:\n_____________________________________________\n_____________________________________________\n\nHIPÓTESE DIAGNÓSTICA / DIAGNÓSTICO:\n_____________________________________________\n\nEXAMES JÁ REALIZADOS:\n_____________________________________________\n\nMEDICAÇÕES EM USO (dose e posologia):\n_____________________________________________\n\nENCАМИНHАDО PARA:\nNome / Clínica: _________________________\nEspecialidade: _________________________\nContato: _________________________\n\nGRAU DE URGÊNCIA:\n[ ] Eletivo (consulta programada)   [ ] Urgente — em até 24h   [ ] Emergência — imediato\n\nObservações clínicas adicionais:\n_________________________\n\nEstamos à disposição para contato e troca de informações clínicas.\nTelefone da clínica de origem: _________________________\n\nData: ${c.date}`,

  'Termo de Consentimento para Telemedicina Veterinária': (c) => `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO\nPARA ATENDIMENTO POR TELEMEDICINA VETERINÁRIA\n\nEu, ${c.tutor},\nCPF: _________________________   RG: _________________________\nEndereço: _________________________\nMunicípio / UF: _________________________   CEP: ___________\nTelefone: _________________________   E-mail: _________________________\n\nna qualidade de proprietário(a)/responsável pelo animal:\nNome: ${c.patient.name}\nEspécie: ${c.patient.species} | Raça: ${c.patient.breed || '—'} | Sexo: ${c.patient.sex || '—'}\nIdade: ___________ | Microchip: ${c.patient.chip || '___________'}\n\nDECLARO que fui devidamente informado(a) e CONSINTO com a realização de atendimento veterinário por meio de plataforma de telemedicina, pelo(a) M.V. ${c.vet.name || '___________'}, CRMV ${c.vet.crmv || '___________'}, nos seguintes termos:\n\n1. NATUREZA E LIMITAÇÕES DO ATENDIMENTO\n   a) O atendimento telepresencial é realizado remotamente, sem contato físico direto com o animal;\n   b) Diagnósticos remotos estão sujeitos a maior margem de incerteza em relação ao exame clínico presencial;\n   c) Em casos de emergência, devo buscar atendimento presencial imediato;\n   d) Exames físicos, laboratoriais e de imagem não são realizáveis por este meio.\n\n2. OBRIGAÇÕES DO PROPRIETÁRIO\n   a) Fornecer informações verídicas, completas e atualizadas sobre o animal;\n   b) Seguir rigorosamente as orientações fornecidas pelo veterinário;\n   c) Comunicar imediatamente qualquer piora ou intercorrência;\n   d) Buscar atendimento presencial sempre que o veterinário indicar.\n\n3. PRESCRIÇÃO ELETRÔNICA\nEstou ciente de que receituários emitidos por telemedicina são válidos conforme regulamentação vigente e que a dispensação de medicamentos controlados exige presença física.\n\n4. PRIVACIDADE E PROTEÇÃO DE DADOS\nO atendimento poderá ser gravado para fins de prontuário eletrônico, com meu consentimento. Os dados são tratados conforme a LGPD (Lei 13.709/2018) e política de privacidade da clínica.\n\n5. RESPONSABILIDADE CIVIL\nDeclaro estar ciente das limitações inerentes à telemedicina veterinária, isentando o profissional de responsabilidade por limitações diagnósticas decorrentes exclusivamente da modalidade de atendimento remoto.\n\nFundamentação: Resolução CFMV nº 1377/2022; LGPD Lei 13.709/2018.\n\nData: ${c.date}`,

  'Termo de Internação e Tratamento Clínico ou Pós-Cirúrgico': (c) => `TERMO DE INTERNAÇÃO E TRATAMENTO CLÍNICO OU PÓS-CIRÚRGICO\n\nEu, ${c.tutor},\nCPF: _________________________   RG: _________________________\nEndereço: _________________________\nMunicípio / UF: _________________________   CEP: ___________\nTelefone principal: _________________________\nTelefone para emergência / familiar: _________________________\n\nna qualidade de proprietário(a)/responsável pelo animal:\nNome: ${c.patient.name}\nEspécie: ${c.patient.species} | Raça: ${c.patient.breed || '—'} | Sexo: ${c.patient.sex || '—'}\nIdade: ___________ | Peso: ___________ kg | Microchip: ${c.patient.chip || '___________'}\n\nMOTIVO DA INTERNAÇÃO: _________________________\nDATA DE ENTRADA: ${c.date}   PREVISÃO DE ALTA: ___/___/______\n\nDECLARO que fui devidamente informado(a) sobre o quadro clínico do animal e AUTORIZO sua internação e o tratamento necessário, estando ciente das seguintes condições:\n\n1. PROCEDIMENTOS AUTORIZADOS DURANTE A INTERNAÇÃO\n   Autorizo exames laboratoriais/imagem, fluidoterapia, medicações, curativos e demais procedimentos de suporte à vida necessários à evolução clínica do animal.\n\n2. PROCEDIMENTOS ADICIONAIS\n   Em caso de necessidade de procedimento cirúrgico ou anestésico não previsto neste ato, serei contatado(a) previamente. Em situação de risco iminente de vida e impossibilidade de contato, autorizo a equipe veterinária a tomar as medidas emergenciais necessárias.\n\n3. COMUNICAÇÃO E VISITAS\n   a) Serei informado(a) da evolução clínica conforme rotina da clínica;\n   b) Visitas ao animal serão realizadas conforme regulamento interno;\n   c) Em caso de piora súbita ou risco de óbito, serei contatado(a) imediatamente.\n\n4. ESTIMATIVA DE CUSTOS E OBRIGAÇÕES FINANCEIRAS\n   Estimativa de custos apresentada: R$ _________________________\n   Sou ciente de que os custos podem variar conforme evolução clínica.\n   Comprometo-me ao pagamento dos valores devidos no ato da alta hospitalar.\n\n5. RESPONSABILIDADE CIVIL\n   Declaro estar ciente de que a medicina veterinária constitui obrigação de meio (CC art. 951), não havendo garantia de resultado, e que o profissional empregará toda a diligência técnica disponível.\n\n6. ALTA E RETIRADA\n   Comprometo-me a retirar o animal no prazo indicado pela equipe veterinária. A permanência além da alta médica poderá gerar custos adicionais de diária.\n\nData: ${c.date}`,

  'Termo para Realização de Procedimentos Anestésicos': (c) => `TERMO DE CONSENTIMENTO PARA REALIZAÇÃO DE PROCEDIMENTOS ANESTÉSICOS\n\nEu, ${c.tutor},\nCPF: _________________________   RG: _________________________\nTelefone: _________________________\n\nna qualidade de proprietário(a)/responsável pelo animal:\nNome: ${c.patient.name}\nEspécie: ${c.patient.species} | Raça: ${c.patient.breed || '—'} | Sexo: ${c.patient.sex || '—'}\nIdade: ___________ | Peso: ___________ kg\nClassificação ASA: [ ] I   [ ] II   [ ] III   [ ] IV   [ ] V\n\nDECLARO que fui informado(a) pelo(a) M.V. ${c.vet.name || '___________'}, CRMV ${c.vet.crmv || '___________'}, sobre a necessidade e riscos do procedimento anestésico e AUTORIZO sua realização.\n\n1. PROCEDIMENTO E TÉCNICA ANESTÉSICA\n   Procedimento: _________________________\n   Técnica proposta: [ ] Sedação   [ ] Anestesia geral inalatória   [ ] Anestesia geral injetável\n   [ ] Bloqueio regional / epidural   [ ] Anestesia local\n\n2. EXAMES PRÉ-ANESTÉSICOS REALIZADOS\n   [ ] Hemograma completo   [ ] Bioquímica sérica (ALT, creatinina, glicose)\n   [ ] Urinálise   [ ] Eletrocardiograma (ECG)   [ ] Radiografia torácica\n   [ ] Ultrassonografia abdominal   [ ] Coagulograma\n   [ ] Outros: ___________\n   Resultado relevante: _________________________\n\n3. RISCOS ANESTÉSICOS INFORMADOS\n   a) Reações de hipersensibilidade/alergia a fármacos;\n   b) Depressão cardiorrespiratória;\n   c) Hipotermia, hipotensão arterial e alterações de glicemia;\n   d) Aspiração de conteúdo gástrico (risco aumentado sem jejum adequado);\n   e) Bradicardia, parada cardiorrespiratória e óbito anestésico;\n   f) Em animais ASA III, IV ou V, o risco de complicação grave é significativamente elevado;\n   g) Complicações pós-anestésicas: náuseas, vômitos, agitação, hipóxia.\n\n4. PERÍODO DE JEJUM\n   Confirmo que o animal encontra-se em jejum alimentar de ___ horas e hídrico de ___ horas.\n\n5. AUTORIZAÇÃO\n   Diante do exposto, AUTORIZO a realização do procedimento anestésico e estou ciente de todos os riscos descritos.\n\nFundamentação: Resolução CFMV nº 722/2002.\n\nData: ${c.date}`,

  'Termo para Realização de Exames': (c) => `TERMO DE CONSENTIMENTO PARA REALIZAÇÃO DE EXAMES DIAGNÓSTICOS\n\nEu, ${c.tutor},\nCPF: _________________________\nTelefone: _________________________\n\nna qualidade de proprietário(a)/responsável pelo animal:\nNome: ${c.patient.name}\nEspécie: ${c.patient.species} | Raça: ${c.patient.breed || '—'} | Sexo: ${c.patient.sex || '—'}\nIdade: ___________ | Peso: ___________ kg\n\nDECLARO que fui devidamente informado(a) sobre a necessidade dos exames diagnósticos indicados pelo(a) M.V. ${c.vet.name || '___________'} e AUTORIZO sua realização.\n\n1. EXAMES AUTORIZADOS\n   _________________________\n   _________________________\n   _________________________\n\n2. FINALIDADE CLÍNICA\n   [ ] Diagnóstico inicial   [ ] Monitoramento de tratamento   [ ] Avaliação pré-cirúrgica\n   [ ] Controle de enfermidade crônica   [ ] Outro: ___________\n\n3. PROCEDIMENTOS ASSOCIADOS E RESPECTIVOS RISCOS\n   [ ] Venopunção (coleta de sangue) — risco mínimo\n   [ ] Cateterismo urinário — risco de infecção e desconforto\n   [ ] Sedação / anestesia geral — riscos conforme Termo Anestésico\n   [ ] Biópsia de tecido — risco de hemorragia e infecção local\n   [ ] Punção de cavidades (tórax / abdômen) — risco de pneumotórax, hemorragia\n   [ ] Endoscopia — risco de perfuração e reações à sedação\n   [ ] Outros: _________________________\n\n   Fui informado(a) dos riscos específicos de cada procedimento acima marcado.\n\n4. RESULTADOS E INTERPRETAÇÃO\n   Compreendo que os resultados serão interpretados pelo médico(a) veterinário(a) responsável e que um único exame não constitui diagnóstico definitivo isolado.\n\n5. CUSTOS\n   Estimativa de custos informada: R$ _________________________\n\nData: ${c.date}`,

  'Termo para Realização de Procedimentos Terapêuticos de Risco': (c) => `TERMO DE CONSENTIMENTO PARA REALIZAÇÃO DE PROCEDIMENTOS TERAPÊUTICOS DE RISCO\n\nEu, ${c.tutor},\nCPF: _________________________   RG: _________________________\nEndereço: _________________________\nTelefone: _________________________\n\nna qualidade de proprietário(a)/responsável pelo animal:\nNome: ${c.patient.name}\nEspécie: ${c.patient.species} | Raça: ${c.patient.breed || '—'} | Sexo: ${c.patient.sex || '—'}\nIdade: ___________ | Peso: ___________ kg\n\nDECLARO que fui devidamente informado(a) pelo(a) M.V. ${c.vet.name || '___________'}, CRMV ${c.vet.crmv || '___________'}, sobre a natureza, riscos e alternativas do(s) seguinte(s) procedimento(s) terapêutico(s) de risco:\n\n1. PROCEDIMENTO(S) A SER(EM) REALIZADO(S)\n   _________________________\n   _________________________\n\n2. INDICAÇÃO CLÍNICA\n   _________________________\n\n3. RISCOS ESPECÍFICOS INFORMADOS\n   a) Reações adversas e hipersensibilidade às medicações/agentes utilizados;\n   b) Complicações locais: hematoma, infecção, deiscência, necrose;\n   c) Complicações sistêmicas: choque anafilático, insuficiência orgânica aguda;\n   d) Falha terapêutica com necessidade de procedimentos adicionais ou cirúrgicos;\n   e) Piora transitória do quadro clínico antes de melhora (efeito paradoxal);\n   f) Risco de óbito em quadros clínicos graves;\n   g) Riscos específicos deste procedimento: _________________________\n\n4. ALTERNATIVAS TERAPÊUTICAS\n   Alternativas informadas: _________________________\n   Motivo da escolha do procedimento indicado: _________________________\n\n5. PROGNÓSTICO SEM O PROCEDIMENTO\n   _________________________\n\n6. AUTORIZAÇÃO\n   Diante do exposto, AUTORIZO a realização do(s) procedimento(s) descrito(s), declarando estar plenamente ciente dos riscos informados.\n\n   Declaro que a medicina veterinária constitui obrigação de meio (CC art. 951), cabendo ao profissional empregar toda a diligência e técnica disponíveis, sem garantia de resultado.\n\nData: ${c.date}`,

  'Termo de Óbito': (c) => `TERMO DE DECLARAÇÃO DE ÓBITO E CIÊNCIA DO PROPRIETÁRIO\n\nEu, ${c.tutor},\nCPF: _________________________   RG: _________________________\nEndereço: _________________________\nTelefone: _________________________\n\nna qualidade de proprietário(a)/responsável pelo animal:\nNome: ${c.patient.name}\nEspécie: ${c.patient.species} | Raça: ${c.patient.breed || '—'} | Sexo: ${c.patient.sex || '—'}\nMicrochip: ${c.patient.chip || '___________'}\n\nDECLARO que fui informado(a) pelo(a) M.V. ${c.vet.name || '___________'}, CRMV ${c.vet.crmv || '___________'}, do óbito do animal acima identificado.\n\nDATA E HORA DO ÓBITO: ___/___/______ às ___:___h\n\nCIRCUNSTÂNCIAS:\n[ ] Óbito natural durante internação / tratamento clínico\n[ ] Óbito intraoperatório\n[ ] Óbito em período pós-anestésico / pós-operatório imediato\n[ ] Óbito após alta hospitalar\n[ ] Animal chegou sem vida à clínica\n[ ] Outras circunstâncias: _________________________\n\nCAUSA PROVÁVEL DO ÓBITO (conforme avaliação clínica):\n_________________________\n_________________________\n\nDESTINO DO CORPO:\n[ ] Retirado pelo proprietário em: ___/___/______\n[ ] Cremação individual — Empresa credenciada: _________________________\n[ ] Cremação coletiva\n[ ] Necropsia solicitada pelo proprietário   [ ] Necropsia não solicitada\n[ ] Encaminhado para laboratório: _________________________\n\nDECLARO que fui informado(a) de que:\n   a) A equipe veterinária empregou todos os esforços técnicos disponíveis no tratamento do animal;\n   b) A medicina veterinária constitui obrigação de meio, não havendo garantia de resultado;\n   c) Não tenho ressalvas quanto ao atendimento prestado: [ ] Confirmo   [ ] Tenho ressalvas (descrever abaixo)\n\nRessalvas / Observações: _________________________\n\nData: ${c.date}`,

  'Termo para Realização de Eutanásia': (c) => `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO\nPARA REALIZAÇÃO DE EUTANÁSIA\n\nEu, ${c.tutor},\nCPF: _________________________   RG: _________________________\nEndereço: _________________________\nMunicípio / UF: _________________________   CEP: ___________\nTelefone: _________________________\n\nna qualidade de proprietário(a)/responsável pelo animal:\nNome: ${c.patient.name}\nEspécie: ${c.patient.species} | Raça: ${c.patient.breed || '—'} | Sexo: ${c.patient.sex || '—'}\nIdade: ___________ | Peso: ___________ kg | Microchip: ${c.patient.chip || '___________'}\n\nDECLARO que, após ter sido devidamente esclarecido(a) pelo(a) M.V. ${c.vet.name || '___________'}, CRMV ${c.vet.crmv || '___________'}, sobre o diagnóstico, o prognóstico e a impossibilidade ou inviabilidade de recuperação do animal, de forma LIVRE, VOLUNTÁRIA e CONSCIENTE, sem coação de qualquer natureza, AUTORIZO a realização da eutanásia.\n\n1. DIAGNÓSTICO E PROGNÓSTICO\n   Diagnóstico: _________________________\n   Prognóstico: [ ] Reservado   [ ] Grave   [ ] Desfavorável / Terminal\n   Qualidade de vida comprometida de forma irreversível: [ ] Sim   [ ] Não\n\n2. MOTIVO DA SOLICITAÇÃO\n   [ ] Doença terminal sem perspectiva de cura ou controle efetivo\n   [ ] Sofrimento contínuo e irreversível incompatível com bem-estar animal\n   [ ] Indicação médico-veterinária por esgotamento terapêutico\n   [ ] Outros: _________________________\n\n3. ALTERNATIVAS TERAPÊUTICAS INFORMADAS\n   _________________________\n   Motivo pelo qual a eutanásia foi escolhida: _________________________\n\n4. MÉTODO E PROTOCOLO\n   O procedimento será realizado com agente(s) eutanásico(s) por via venosa, conforme protocolo humanitário aprovado pelo CFMV, assegurando ausência de dor e sofrimento ao animal.\n\n5. CIÊNCIA DAS NORMAS LEGAIS\n   Declaro estar ciente de que:\n   a) A eutanásia é autorizada pela Resolução CFMV nº 1000/2012 mediante preenchimento dos critérios de bem-estar animal e indicação técnica;\n   b) A eutanásia por motivo fútil ou sem indicação clínica pode caracterizar crime de maus-tratos (Lei 9.605/98, art. 32, §§ 1º e 2º), com pena de detenção e multa;\n   c) A realização da eutanásia sem autorização expressa e escrita do proprietário é vedada, salvo em casos de emergência humanitária.\n\n6. DESTINO DO CORPO\n   [ ] Retirado pelo proprietário   [ ] Cremação individual   [ ] Cremação coletiva\n   Empresa de cremação: _________________________\n\nDeclaração tomada de forma livre e consciente, sem coação ou pressão de qualquer natureza.\nFundamentação: Resolução CFMV nº 1000/2012; Lei 9.605/98 art. 32.\n\nData: ${c.date}`,

  'Termo para Realização de Procedimentos Cirúrgicos': (c) => `TERMO DE CONSENTIMENTO PARA REALIZAÇÃO DE PROCEDIMENTOS CIRÚRGICOS\n\nEu, ${c.tutor},\nCPF: _________________________   RG: _________________________\nTelefone: _________________________\n\nna qualidade de proprietário(a)/responsável pelo animal:\nNome: ${c.patient.name}\nEspécie: ${c.patient.species} | Raça: ${c.patient.breed || '—'} | Sexo: ${c.patient.sex || '—'}\nIdade: ___________ | Peso: ___________ kg | Microchip: ${c.patient.chip || '___________'}\nClassificação ASA: [ ] I   [ ] II   [ ] III   [ ] IV   [ ] V\n\nDECLARO que fui devidamente informado(a) pelo(a) M.V. ${c.vet.name || '___________'}, CRMV ${c.vet.crmv || '___________'}, sobre o procedimento cirúrgico indicado e AUTORIZO sua realização.\n\n1. IDENTIFICAÇÃO DO PROCEDIMENTO\n   Nome da cirurgia: _________________________\n   Duração estimada: ___________ | Anestesia: [ ] Geral   [ ] Local / Regional   [ ] Epidural\n\n2. INDICAÇÃO CLÍNICA\n   _________________________\n\n3. RISCOS CIRÚRGICOS E ANESTÉSICOS INFORMADOS\n   a) Complicações anestésicas: hipotensão, bradicardia, laringoespasmo, óbito anestésico;\n   b) Hemorragia intraoperatória com possível necessidade de transfusão;\n   c) Infecção da ferida cirúrgica e deiscência de sutura;\n   d) Formação de seroma ou hematoma pós-operatório;\n   e) Rejeição de implantes ou materiais de síntese;\n   f) Lesão inadvertida de estruturas adjacentes;\n   g) Necessidade de revisão cirúrgica;\n   h) Óbito intraoperatório ou no período pós-operatório imediato;\n   i) Riscos específicos desta cirurgia: _________________________\n\n4. ALTERNATIVAS TERAPÊUTICAS\n   _________________________\n   Motivo da escolha cirúrgica: _________________________\n\n5. AUTORIZAÇÃO PARA PROCEDIMENTOS INTRAOPERATÓRIOS ADICIONAIS\n   Autorizo a equipe cirúrgica a realizar procedimentos adicionais necessários que sejam identificados durante o ato operatório para preservação da vida e saúde do animal, informando-me posteriormente.\n\n6. JEJUM\n   Confirmo jejum alimentar de ___ horas e hídrico de ___ horas.\n\n7. CUIDADOS PÓS-OPERATÓRIOS\n   Comprometo-me a seguir rigorosamente as orientações de pós-operatório, comparecer às consultas de retorno agendadas e comunicar imediatamente qualquer intercorrência.\n\n8. CUSTOS\n   Estimativa de custos informada: R$ _________________________\n   Estou ciente de que custos adicionais poderão ocorrer durante ou após o procedimento.\n\n   Declaro que a medicina veterinária constitui obrigação de meio (CC art. 951), não havendo garantia de resultado.\n\nData: ${c.date}`,

  'Termo para Retirada sem Alta Médica': (c) => `TERMO DE RETIRADA DE ANIMAL DO SERVIÇO VETERINÁRIO SEM ALTA MÉDICA\n\nEu, ${c.tutor},\nCPF: _________________________   RG: _________________________\nEndereço: _________________________\nMunicípio / UF: _________________________   CEP: ___________\nTelefone: _________________________\n\nna qualidade de proprietário(a)/responsável pelo animal:\nNome: ${c.patient.name}\nEspécie: ${c.patient.species} | Raça: ${c.patient.breed || '—'} | Sexo: ${c.patient.sex || '—'}\nMicrochip: ${c.patient.chip || '___________'}\n\nDECLARO que, por decisão própria e a meu exclusivo risco, solicito nesta data (${c.date}) a retirada do animal acima identificado do serviço veterinário de ${c.clinic.name || 'esta clínica'} ANTES do recebimento de alta médica, estando PLENAMENTE CIENTE de que:\n\n1. SITUAÇÃO CLÍNICA ATUAL\n   Diagnóstico / quadro: _________________________\n   Tratamento em curso: _________________________\n\n2. RISCOS DA RETIRADA ANTECIPADA\n   a) Interrupção de tratamento em andamento, com risco de agravamento do quadro clínico;\n   b) Risco de recidiva, complicações e óbito do animal;\n   c) O animal necessita de monitoração contínua não realizável em domicílio;\n   d) O médico(a) veterinário(a) responsável se opõe formalmente à retirada neste momento.\n\n3. ORIENTAÇÕES RECEBIDAS PARA CUIDADOS EM DOMICÍLIO\n   Medicações e posologia: _________________________\n   Restrições e cuidados: _________________________\n   Retornar para consulta em: _________________________\n   Buscar emergência veterinária caso: _________________________\n\n4. EXONERAÇÃO DE RESPONSABILIDADE\n   Reconheço e DECLARO expressamente que a ${c.clinic.name || 'clínica veterinária'}, seus sócios, colaboradores e o(a) M.V. ${c.vet.name || '___________'}, CRMV ${c.vet.crmv || '___________'}, ficam exonerados de qualquer responsabilidade civil ou criminal por eventos adversos, agravamento do quadro ou óbito do animal, decorrentes direta ou indiretamente da retirada antecipada ora solicitada por minha exclusiva vontade.\n\n5. DECLARAÇÃO FINAL\n   Afirmo que a decisão foi tomada de forma livre, consciente e sem qualquer coação, tendo sido devidamente alertado(a) de todos os riscos envolvidos.\n\nFundamentação: Código Civil Brasileiro arts. 927 e 945; Código de Ética Médico-Veterinário CFMV.\n\nTestemunha: _________________________   CPF: _________________________\n\nData: ${c.date}`,
};

function docBody(tipo, ctx) {
  const fn = window.DOC_TEMPLATES[tipo];
  return fn ? fn(ctx) : `${(tipo || 'DOCUMENTO').toUpperCase()}\n\nPaciente: ${ctx.patient.name}\nTutor: ${ctx.tutor}\n\nData: ${ctx.date}`;
}

/* ---- cabeçalho da clínica (reutilizado no DocEditor e na impressão) ---- */
function DocClinicHeader({ c, accent, layout }) {
  const showContact = c.docShowContact !== false;
  const showSocial  = c.docShowSocial  !== false;
  const ad = c.addr || {};
  const addrLine = [ad.street, ad.num, ad.district, ad.city, ad.state].filter(Boolean).join(', ') || c.address || '';
  return (
    <React.Fragment>
      <div className={`docs-hd theme-${layout || 'classico'}`} style={{ paddingBottom: 14 }}>
        {c.logo
          ? <img className="docs-hd-logo" src={c.logo} alt="logo" />
          : <div className="docs-hd-logo ph" style={{ borderColor: accent, color: accent }}>{(c.name || 'V')[0]}</div>}
        <div className="docs-hd-id">
          <b style={{ color: accent }}>{c.name || 'Clínica'}</b>
          {c.crmv ? <span style={{ color: accent }}>CRMV {c.crmv}/{c.crmvUF || 'SP'}</span> : null}
          {c.mapa ? <span style={{ color: accent }}>Registro no MAPA {c.mapa}</span> : null}
        </div>
        <div className="docs-hd-contact">
          {showContact && addrLine ? <span>{addrLine}</span> : null}
          {showContact && c.phone  ? <span>Tel: {c.phone}</span> : null}
          {showContact && c.email  ? <span>{c.email}</span> : null}
          {showSocial  && c.site   ? <span>{c.site}</span> : null}
          {showSocial  && c.instagram ? <span>{c.instagram}</span> : null}
        </div>
      </div>
      <div className="docs-rule" style={{ background: accent, margin: '0 0 18px' }} />
    </React.Fragment>
  );
}

/* ---- bloco de identificação do paciente ---- */
function DocPatientInfo({ patient, at, accent }) {
  const idade = patient.idade || (window.ageFrom ? window.ageFrom(patient.birth) : '') || '—';
  const examPeso = at && at.exam && at.exam.peso ? at.exam.peso + ' kg' : null;
  const pairFields = [
    ['Paciente', patient.name], ['Espécie', patient.species], ['Raça', patient.breed || '—'],
    ['Sexo', patient.sex || '—'], ['Peso', examPeso || at.weight || patient.weight || '—'], ['Idade', idade],
  ];
  return (
    <div style={{ fontSize: 12.5, marginBottom: 18, padding: '10px 14px', background: accent + '10', borderRadius: 6, borderLeft: '3px solid ' + accent }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 18px' }}>
        {pairFields.map(([k, v]) => <span key={k}><b>{k}:</b> {v}</span>)}
      </div>
      <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: '2px 18px', borderTop: '1px solid ' + accent + '25', paddingTop: 5 }}>
        <span><b>Tutor(a):</b> {patient.owner || '—'}</span>
        {patient.cpf && <span><b>CPF:</b> {patient.cpf}</span>}
        {patient.phone && <span><b>Fone:</b> {patient.phone}</span>}
        {patient.chip && <span><b>Microchip:</b> {patient.chip}</span>}
      </div>
    </div>
  );
}

/* ---- bloco de assinaturas ---- */
function DocSignatures({ vet, tutor, signed, onToggleSigned, showTutor }) {
  return (
    <div className="doc-signs" style={{ marginTop: 40 }}>
      <div className="doc-sign">
        {vet.sign ? <img src={vet.sign} alt="assinatura" className="doc-sign-img" /> : <div className="doc-sign-line" />}
        <b>{vet.name ? 'M.V. ' + vet.name : 'Médico(a) Veterinário(a)'}</b>
        <span>{[vet.crmv, vet.especialidade].filter(Boolean).join(' · ') || 'CRMV'}</span>
      </div>
      {showTutor && (
        <div className="doc-sign">
          <div className="doc-sign-line" style={signed ? { borderColor: 'var(--teal)' } : null} />
          <b>{tutor}</b>
          {onToggleSigned
            ? <span style={{ cursor: 'pointer', color: 'var(--teal-d)', fontWeight: 700 }} onClick={onToggleSigned}>{signed ? '✓ Assinado digitalmente' : 'Tutor (clique p/ simular)'}</span>
            : <span style={{ color: 'var(--muted)', fontSize: 11 }}>Tutor / Responsável</span>}
        </div>
      )}
    </div>
  );
}

/* ---- renderizador de receituário estruturado ---- */
function DocRxBody({ at, patient, accent }) {
  const tipo = at.prescricaoTipo || 'comum';
  const tipoInfo = (window.PR_RX_TYPES || []).find((x) => x.id === tipo) || { label: 'Comum' };
  const itens = at.prescricoes || [];
  const kg = window.rxKg ? window.rxKg(patient) : 0;
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '2px solid ' + accent + '30' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Prescrição Veterinária</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: accent }}>RECEITUÁRIO {tipoInfo.label.toUpperCase()}</div>
        {tipo === 'controlada' && <div style={{ marginTop: 6, display: 'inline-block', fontSize: 10.5, background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: 4, fontWeight: 700, letterSpacing: 0.5 }}>CONTROLE ESPECIAL — PORTARIA 344/98 — 2 VIAS</div>}
      </div>

      {itens.length === 0
        ? <p style={{ color: 'var(--faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Nenhum medicamento prescrito ainda.</p>
        : itens.map((r, i) => {
            const calc = kg ? (window.rxDoseCalc ? window.rxDoseCalc(r.dose, kg) : null) : null;
            const pos = r.posologia || (window.rxPosologiaAuto ? window.rxPosologiaAuto(r.pos) : '') || [r.freq, r.tempo].filter(Boolean).join(' · ');
            const controlled = window.rxIsControlled ? window.rxIsControlled(r.nome) : false;
            return (
              <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: accent, minWidth: 22 }}>Rp.</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>
                      {r.nome}{r.conc ? ' ' + r.conc : ''}{r.apresentacao ? ' — ' + r.apresentacao : ''}
                    </div>
                    {calc && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>Dose para {kg} kg: {calc.total} {calc.unit}</div>}
                    {pos && <div style={{ fontSize: 12.5, marginTop: 4, color: 'var(--ink)' }}>{pos}</div>}
                    {r.qtdProd && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Qtd: {r.qtdProd} unidade(s)</div>}
                    {controlled && <div style={{ fontSize: 10.5, background: '#fef3c7', color: '#92400e', padding: '1px 7px', borderRadius: 4, display: 'inline-block', marginTop: 4, fontWeight: 700 }}>⚠ Controle especial</div>}
                    {r.obs && <div style={{ fontSize: 11.5, fontStyle: 'italic', color: 'var(--muted)', marginTop: 3 }}>Obs: {r.obs}</div>}
                  </div>
                </div>
              </div>
            );
          })}

      {at.rxObs && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: accent + '10', borderRadius: 6, fontSize: 12.5, borderLeft: '3px solid ' + accent }}>
          <b style={{ display: 'block', marginBottom: 4 }}>Orientações ao tutor:</b>
          {at.rxObs}
        </div>
      )}
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>Data: {window.PR ? window.PR.todayBR() : ''}</div>
    </div>
  );
}

/* ---- renderizador de pedido de exames estruturado ---- */
function DocExamesBody({ at, patient, accent }) {
  const exames = at.exames || [];
  const suspicao = at.exameSuspeita || (at.diag && at.diag.principal) || '';
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '2px solid ' + accent + '30' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Medicina Veterinária</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: accent }}>SOLICITAÇÃO DE EXAMES</div>
      </div>

      {suspicao && (
        <div style={{ marginBottom: 18, padding: '10px 14px', background: accent + '10', borderRadius: 6, fontSize: 13, borderLeft: '3px solid ' + accent }}>
          <b>Hipótese diagnóstica / suspeita clínica:</b><br />{suspicao}
        </div>
      )}

      <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 13, color: accent }}>Exames solicitados:</div>
      {exames.length === 0
        ? <p style={{ color: 'var(--faint)', fontSize: 13 }}>Nenhum exame selecionado.</p>
        : exames.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '7px 10px', background: i % 2 === 0 ? '#fafafa' : '#fff', borderRadius: 5 }}>
            <span style={{ width: 18, height: 18, border: '1.5px solid ' + accent, borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 10, color: accent }}>□</span>
            <span style={{ fontSize: 13 }}>{i + 1}. {e}</span>
          </div>
        ))}
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>Data: {window.PR ? window.PR.todayBR() : ''}</div>
    </div>
  );
}

/* ---- renderizador de corpo de documento (atestado / termo) ---- */
function DocTextBody({ body, tipo, accent }) {
  const title = (tipo || '').replace(/^receituário\s*/i, '').toUpperCase();
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '2px solid ' + accent + '30' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: accent, letterSpacing: 0.5 }}>{title}</div>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{body}</div>
    </div>
  );
}

/* ---- página de documento completa (usada no preview e na impressão) ---- */
function DocPage({ tipo, patient, at, body, accent, layout, c, vet, signed, onToggleSigned }) {
  const isRx       = /receitu/i.test(tipo || '');
  const isExame    = /solicita|exame/i.test(tipo || '');
  const isAtestado = /^Atestado/i.test(tipo || '');
  // Termos precisam de vet + tutor. Atestados, receituários e exames: só vet.
  const showTutor  = !isRx && !isExame && !isAtestado;
  const showLogo = isRx ? c.logoRx !== false : isExame ? c.logoEx !== false : c.logoDoc !== false;
  const showObs  = isRx ? c.obsRx  !== false : isExame ? c.obsEx  !== false : c.obsDoc  !== false;
  return (
    <div className="doc-page" id="doc-printable">
      {showLogo && <DocClinicHeader c={c} accent={accent} layout={layout} />}
      <DocPatientInfo patient={patient} at={at} accent={accent} />
      {isRx    && <DocRxBody    at={at} patient={patient} accent={accent} />}
      {isExame && <DocExamesBody at={at} patient={patient} accent={accent} />}
      {!isRx && !isExame && <DocTextBody body={body} tipo={tipo} accent={accent} />}
      <DocSignatures vet={vet} tutor={patient.owner} signed={signed} onToggleSigned={showTutor ? onToggleSigned : null} showTutor={showTutor} />
      {showObs && c.docObs ? <div className="doc-obs-foot" style={{ borderColor: accent, marginTop: 20 }}>{c.docObs}</div> : null}
    </div>
  );
}

/* ---- Editor / preview de documento ---- */
function DocEditor({ tipo, patient, at, initialBody, onClose, onSave }) {
  const ctx = docCtx(patient, at);
  const isRx    = /receitu/i.test(tipo || '');
  const isExame = /solicita|exame/i.test(tipo || '');
  const isStructured = isRx || isExame;
  const [body, setBody] = dUse(initialBody != null ? initialBody : docBody(tipo, ctx));
  const [signed, setSigned] = dUse(false);
  const c = ctx.clinic; const vet = ctx.vet;
  const accent = c.docColor || '#14a8a0';
  const layout = c.docLayout || 'classico';

  const doPrint = () => {
    const docEl = document.getElementById('doc-printable');
    if (!docEl) { window.print(); return; }
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"],style')).map((el) => el.outerHTML).join('\n');
    const w = window.open('', '_blank', 'width=860,height=1080');
    w.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + (tipo || 'Documento') + '</title>' + styles +
      '<style>' +
      'body{background:#f5f5f5;margin:0;padding:32px;font-family:inherit;}' +
      '.doc-page{background:#fff;max-width:740px;margin:0 auto;padding:40px 52px 60px;box-shadow:0 2px 16px #0001;border-radius:8px;}' +
      '@media print{body{padding:0;background:#fff;}.doc-page{box-shadow:none;border-radius:0;max-width:100%;padding:28px 36px 44px;}}' +
      '</style></head><body>' + docEl.outerHTML + '</body></html>'
    );
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); }, 700);
  };

  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal doc-modal" style={isStructured ? { gridTemplateColumns: '1fr' } : null} onClick={(e) => e.stopPropagation()}>
        <div className="doc-toolbar">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{tipo}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="vt-btn-ghost" onClick={() => window.vtToast('Documento enviado ao tutor para assinatura digital via WhatsApp.', 'ok')}>💬 Enviar p/ assinatura</button>
            <button className="vt-btn-ghost" onClick={doPrint}><VtIcon name="print" size={15} /> Imprimir / PDF</button>
            {window.vtIcpHasSession && window.vtIcpHasSession() && (
              <button className="vt-btn-primary" style={{ background: '#16395f', borderColor: '#16395f' }} onClick={() => window.vtIcpSignDoc('doc-printable', tipo)}>🔏 Assinar ICP-Brasil</button>
            )}
            {!isStructured && <button className="vt-btn-primary" onClick={() => { onSave(body); window.vtToast('Documento salvo.', 'ok'); }}>Salvar</button>}
          </div>
        </div>
        <div className={`doc-split${isStructured ? ' doc-split-full' : ''}`}>
          {!isStructured && (
            <div className="doc-edit">
              <span className="vtf-label">Conteúdo (editável)</span>
              <textarea className="doc-textarea" value={body} onChange={(e) => setBody(e.target.value)} />
              <p className="vt-muted" style={{ fontSize: 12, marginTop: 8 }}>Os dados do MV, paciente, tutor e clínica são inseridos automaticamente no documento ao lado.</p>
            </div>
          )}
          <div className={`doc-preview-wrap${isStructured ? ' doc-preview-full' : ''}`}>
            <DocPage
              tipo={tipo} patient={patient} at={at} body={body}
              accent={accent} layout={layout} c={c} vet={vet}
              signed={signed} onToggleSigned={() => setSigned(!signed)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DocEditor, DocPage, docCtx, docBody });
