/* ============================================================
   EquiChart — UI: cabeçalho, passos, ferramentas, painéis
   ============================================================ */

function Brand() {
  return (
    <div className="eq-brand">
      <img src="assets/logo-mark.png" alt="Dentalis Vet" className="eq-logo" />
      <div>
        <div className="eq-brand-name">Dentalis <span className="gold">Vet</span></div>
        <div className="eq-brand-sub">Odontograma veterinário</div>
      </div>
    </div>
  );
}

const STEPS = [
  { id: 'detalhes', label: 'Detalhes' },
  { id: 'carta', label: 'Carta dentária' },
  { id: 'tratamentos', label: 'Tratamentos & Notas' },
  { id: 'cobranca', label: 'Cobrança' },
];

function Stepper({ step, setStep }) {
  return (
    <nav className="eq-stepper">
      {STEPS.map((s, i) => (
        <button
          key={s.id}
          className={`eq-step${step === s.id ? ' active' : ''}`}
          onClick={() => setStep(s.id)}
        >
          <span className="eq-step-num">{i + 1}</span>
          <span className="eq-step-label">{s.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Header({ chart, step, setStep, onUndo, canUndo, onSave, savedAt }) {
  const h = chart.horse;
  return (
    <header className="eq-header">
      <div className="eq-header-top">
        <Brand />
        <div className="eq-patient">
          <div className="eq-patient-name">{h.name || 'Cavalo sem nome'}</div>
          <div className="eq-patient-meta">
            {[h.owner && `Tutor: ${h.owner}`, h.breed, h.age && `${h.age} anos`].filter(Boolean).join('  ·  ') || 'Preencha os detalhes'}
          </div>
        </div>
        <div className="eq-header-actions">
          <button className="eq-btn ghost" onClick={onUndo} disabled={!canUndo} title="Desfazer">
            <Icon name="undo" /> Desfazer
          </button>
          <button className="eq-btn ghost" onClick={() => window.print()} title="Imprimir / PDF">
            <Icon name="print" /> Imprimir
          </button>
          <button className="eq-btn primary" onClick={onSave}>
            <Icon name="save" /> {savedAt ? 'Salvo' : 'Salvar ficha'}
          </button>
        </div>
      </div>
      <Stepper step={step} setStep={setStep} />
    </header>
  );
}

function Icon({ name }) {
  const p = {
    undo: 'M9 7 L4 12 L9 17 M4 12 H14 a5 5 0 0 1 0 10 H11',
    print: 'M7 9 V4 H17 V9 M7 18 H5 a2 2 0 0 1-2-2 V11 a2 2 0 0 1 2-2 H19 a2 2 0 0 1 2 2 v5 a2 2 0 0 1-2 2 H17 M7 14 H17 V21 H7 Z',
    save: 'M5 4 H16 L20 8 V20 H5 Z M8 4 V9 H15 V4 M8 20 V14 H16 V20',
    trash: 'M5 7 H19 M9 7 V5 H15 V7 M7 7 V20 H17 V7 M10 11 V16 M14 11 V16',
    plus: 'M12 5 V19 M5 12 H19',
  }[name];
  return (
    <svg className="eq-ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={p} />
    </svg>
  );
}

function DrawIcon({ name }) {
  const paths = {
    pen: 'M4 20 L4 16 L15 5 L19 9 L8 20 Z M13 7 L17 11',
    line: 'M4 20 L20 4',
    arrow: 'M4 20 L20 4 M20 4 L13 5 M20 4 L19 11',
    circle: 'M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4',
    erase: 'M7 17 L17 17 M5 14 L10 19 L20 9 L15 4 Z',
  }[name];
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths} />
    </svg>
  );
}

/* ----------------------- Barra de ferramentas ----------------------- */
function ToolGroup({ title, children }) {
  return (
    <div className="eq-toolgroup">
      <div className="eq-toolgroup-title">{title}</div>
      <div className="eq-toolgrid">{children}</div>
    </div>
  );
}

function MarkButton({ mark, active, onClick }) {
  return (
    <button className={`eq-toolbtn${active ? ' active' : ''}`} onClick={onClick} title={mark.label}>
      <span className="eq-toolswatch" style={{ background: mark.color }}>{mark.short}</span>
      <span className="eq-toollabel">{mark.label}</span>
    </button>
  );
}

function Toolbar({ tool, setTool, penColor, setPenColor, onClearChart }) {
  const D = window.EquiData;
  const is = (t) => tool === t;
  return (
    <aside className="eq-toolbar">
      <ToolGroup title="Modo">
        <button className={`eq-toolbtn wide${is('select') ? ' active' : ''}`} onClick={() => setTool('select')}>
          <span className="eq-toolswatch cursor">▣</span>
          <span className="eq-toollabel">Selecionar dente</span>
        </button>
        <button className={`eq-toolbtn wide${is('erase-tooth') ? ' active' : ''}`} onClick={() => setTool('erase-tooth')}>
          <span className="eq-toolswatch erase">⌫</span>
          <span className="eq-toollabel">Limpar marcas do dente</span>
        </button>
      </ToolGroup>

      <ToolGroup title="Anormalidades">
        {D.ABNORMALITIES.map((m) => (
          <MarkButton key={m.id} mark={m} active={is(`mark:${m.id}`)} onClick={() => setTool(`mark:${m.id}`)} />
        ))}
      </ToolGroup>

      <ToolGroup title="Tratamentos">
        {D.TREATMENTS.map((m) => (
          <MarkButton key={m.id} mark={m} active={is(`mark:${m.id}`)} onClick={() => setTool(`mark:${m.id}`)} />
        ))}
      </ToolGroup>

      <ToolGroup title="Desenho livre">
        <div className="eq-drawrow">
          <button className={`eq-drawbtn${is('pen') ? ' active' : ''}`} onClick={() => setTool('pen')} title="Lápis">
            <DrawIcon name="pen" /></button>
          <button className={`eq-drawbtn${is('line') ? ' active' : ''}`} onClick={() => setTool('line')} title="Linha">
            <DrawIcon name="line" /></button>
          <button className={`eq-drawbtn${is('arrow') ? ' active' : ''}`} onClick={() => setTool('arrow')} title="Seta">
            <DrawIcon name="arrow" /></button>
          <button className={`eq-drawbtn${is('circle') ? ' active' : ''}`} onClick={() => setTool('circle')} title="Círculo">
            <DrawIcon name="circle" /></button>
          <button className={`eq-drawbtn${is('erase-art') ? ' active' : ''}`} onClick={() => setTool('erase-art')} title="Apagar desenho/ícone">
            <DrawIcon name="erase" /></button>
        </div>
        <div className="eq-pencolors">
          {D.PEN_COLORS.map((c) => (
            <button key={c} className={`eq-pencolor${penColor === c ? ' active' : ''}`} style={{ background: c }}
              onClick={() => setPenColor(c)} />
          ))}
        </div>
      </ToolGroup>

      <ToolGroup title="Marcadores soltos">
        <div className="eq-drops">
          {D.DROP_ICONS.map((d) => (
            <button key={d.id} className={`eq-dropbtn${is(`drop:${d.id}`) ? ' active' : ''}`} onClick={() => setTool(`drop:${d.id}`)} title={d.label}>
              <DropGlyph id={d.id} color={d.color} size={22} />
            </button>
          ))}
        </div>
      </ToolGroup>

      <button className="eq-btn danger block" onClick={onClearChart}>
        <Icon name="trash" /> Limpar carta inteira
      </button>
    </aside>
  );
}

Object.assign(window, { Brand, Stepper, Header, Icon, DrawIcon, Toolbar, STEPS });
