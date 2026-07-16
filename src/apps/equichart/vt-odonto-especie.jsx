/* ============================================================
   EquiChart / VetTooth — Passo 1: Espécie & Arcada
   Tela de configuração premium exibida antes do wizard do
   odontograma. Define chart.odSpecies (canino|felino|equino),
   chart.patientSpecies (string p/ o gráfico) e chart.arch
   (upper|lower|both). Nenhuma lógica existente é removida.
   Exposto como window.OdEspecieStep.
   ============================================================ */
function OdEspecieStep({ chart, setChart, go, entryPatient }) {
  const SPECIES = [
    { key: 'canino', emoji: '🐕', label: 'Canino', sub: 'Cão / cadela', teeth: 42, species: 'Cão' },
    { key: 'felino', emoji: '🐈', label: 'Felino', sub: 'Gato', teeth: 30, species: 'Gato' },
    { key: 'equino', emoji: '🐴', label: 'Equino', sub: 'Cavalo / égua', teeth: 44, species: 'Equino' },
  ];
  const ARCH = [
    { k: 'upper', label: 'Superior', hint: 'Maxila' },
    { k: 'lower', label: 'Inferior', hint: 'Mandíbula' },
    { k: 'both', label: 'Ambas', hint: 'Arcada completa' },
  ];

  // espécie pré-selecionada a partir do paciente (quando entra pelo atendimento)
  const derive = () => {
    const s = (chart.patientSpecies || '').toLowerCase();
    if (/gato|felin/.test(s)) return 'felino';
    if (/cavalo|equ|égua|egua|potr|mula|asin|jumento/.test(s)) return 'equino';
    if (/c[ãa]o|cachorr|canin/.test(s)) return 'canino';
    return '';
  };
  const selKey = chart.odSpecies || derive();
  const arch = chart.arch || 'both';
  const sel = SPECIES.find((x) => x.key === selKey);
  const selArch = ARCH.find((a) => a.k === arch) || ARCH[2];

  const pick = (sp) => setChart((c) => ({ ...c, odSpecies: sp.key, patientSpecies: sp.species }));
  const pickArch = (k) => setChart((c) => ({ ...c, arch: k }));
  const next = () => { if (!selKey) return; go(entryPatient ? 'anamnese' : 'paciente'); };

  return (
    <div className="od-step-pane">
      <div className="od-p1-head">
        <h2>🦷 Configurar Odontograma</h2>
        <span className="od-p1-hint">Selecione a espécie e a arcada para iniciar o exame</span>
      </div>

      <div className="ode-sec-label">Espécie</div>
      <div className="ode-cards">
        {SPECIES.map((sp) => {
          const on = selKey === sp.key;
          return (
            <button key={sp.key} type="button" className={`ode-card${on ? ' on' : ''}`} onClick={() => pick(sp)}>
              {on ? <span className="ode-check" aria-hidden="true">✓</span> : null}
              <span className="ode-emoji">{sp.emoji}</span>
              <span className="ode-name">{sp.label}</span>
              <span className="ode-teeth"><b>{sp.teeth}</b> dentes</span>
              <span className="ode-sub">{sp.sub}</span>
            </button>
          );
        })}
      </div>

      <div className="ode-sec-label">Arcada</div>
      <div className="ode-arch">
        {ARCH.map((a) => (
          <button key={a.k} type="button" className={`ode-pill${arch === a.k ? ' on' : ''}`} onClick={() => pickArch(a.k)}>
            <span className="ode-pill-l">{a.label}</span>
            <span className="ode-pill-h">{a.hint}</span>
          </button>
        ))}
      </div>

      <div className="od-step-actions">
        {sel
          ? <span className="od-p1-selected">Selecionado: <b>{sel.label} · {sel.teeth} dentes · {selArch.label}</b></span>
          : <span className="od-p1-selected">Escolha uma espécie para continuar</span>}
        <button className="od-next" disabled={!selKey} style={!selKey ? { opacity: .5, pointerEvents: 'none' } : null} onClick={next}>Próximo →</button>
      </div>
    </div>
  );
}
window.OdEspecieStep = OdEspecieStep;
