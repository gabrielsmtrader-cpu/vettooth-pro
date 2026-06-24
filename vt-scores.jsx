/* ============================================================
   VetTooth Pro — Escores corporais por espécie
   ============================================================ */
window.VtScores = (function () {
  const dog = [
    { n: 1, name: 'Caquético', desc: 'Costelas, vértebras e ossos pélvicos visíveis à distância. Sem gordura.', cls: 'baixo' },
    { n: 2, name: 'Muito magro', desc: 'Costelas facilmente visíveis. Cintura acentuada.', cls: 'baixo' },
    { n: 3, name: 'Magro', desc: 'Costelas palpáveis sem cobertura de gordura. Cintura evidente.', cls: 'baixo' },
    { n: 4, name: 'Abaixo do ideal', desc: 'Costelas palpáveis com leve cobertura. Cintura visível.', cls: 'ideal' },
    { n: 5, name: 'Ideal', desc: 'Costelas palpáveis sem excesso. Cintura observada de cima.', cls: 'ideal' },
    { n: 6, name: 'Acima do ideal', desc: 'Costelas palpáveis com leve excesso de gordura.', cls: 'ideal' },
    { n: 7, name: 'Sobrepeso', desc: 'Costelas dificilmente palpáveis. Depósitos de gordura.', cls: 'alto' },
    { n: 8, name: 'Obeso', desc: 'Costelas não palpáveis. Cintura ausente. Abdome distendido.', cls: 'alto' },
    { n: 9, name: 'Obeso grave', desc: 'Grandes depósitos de gordura. Abdome muito distendido.', cls: 'alto' },
  ];
  const cat = [
    { n: 1, name: 'Caquético', desc: 'Costelas visíveis em pelo curto. Sem gordura. Vértebras evidentes.', cls: 'baixo' },
    { n: 2, name: 'Muito magro', desc: 'Costelas visíveis. Perda muscular mínima.', cls: 'baixo' },
    { n: 3, name: 'Magro', desc: 'Costelas palpáveis com cobertura mínima. Cintura evidente.', cls: 'baixo' },
    { n: 4, name: 'Abaixo do ideal', desc: 'Costelas palpáveis. Cintura visível. Pouca gordura abdominal.', cls: 'ideal' },
    { n: 5, name: 'Ideal', desc: 'Proporção equilibrada. Cintura atrás das costelas. Bolsa abdominal mínima.', cls: 'ideal' },
    { n: 6, name: 'Acima do ideal', desc: 'Leve excesso de gordura. Bolsa abdominal discreta.', cls: 'ideal' },
    { n: 7, name: 'Sobrepeso', desc: 'Costelas pouco palpáveis. Bolsa abdominal evidente.', cls: 'alto' },
    { n: 8, name: 'Obeso', desc: 'Costelas não palpáveis. Bolsa abdominal proeminente.', cls: 'alto' },
    { n: 9, name: 'Obeso grave', desc: 'Depósitos extensos. Bolsa abdominal pendular.', cls: 'alto' },
  ];
  const horse = [
    { n: 1, name: 'Caquético (Henneke)', desc: 'Processos espinhosos, costelas e ísquios proeminentes. Sem gordura.', cls: 'baixo' },
    { n: 2, name: 'Muito magro', desc: 'Leve cobertura sobre a base da espinha. Estruturas ósseas evidentes.', cls: 'baixo' },
    { n: 3, name: 'Magro', desc: 'Gordura acumulada até metade dos processos espinhosos. Costelas visíveis.', cls: 'baixo' },
    { n: 4, name: 'Moderadamente magro', desc: 'Leve crista ao longo do dorso. Costelas levemente visíveis.', cls: 'ideal' },
    { n: 5, name: 'Ideal', desc: 'Dorso nivelado. Costelas não visíveis mas facilmente palpáveis.', cls: 'ideal' },
    { n: 6, name: 'Moderadamente gordo', desc: 'Leve sulco no dorso. Gordura sobre as costelas esponjosa.', cls: 'ideal' },
    { n: 7, name: 'Gordo', desc: 'Sulco no dorso. Costelas com preenchimento de gordura entre elas.', cls: 'alto' },
    { n: 8, name: 'Obeso', desc: 'Sulco evidente. Difícil palpar costelas. Pescoço espessado.', cls: 'alto' },
    { n: 9, name: 'Extremamente obeso', desc: 'Sulco profundo. Gordura irregular. Costelas não palpáveis.', cls: 'alto' },
  ];
  function scaleFor(species) {
    if (species === 'Cavalo') return { label: 'Henneke Score (1–9)', list: horse };
    if (species === 'Gato') return { label: 'ECC Felino (1–9)', list: cat };
    return { label: 'ECC Canino (1–9)', list: dog };
  }
  return { scaleFor };
})();
