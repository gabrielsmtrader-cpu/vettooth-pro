/* ============================================================
   EquiChart — componentes da carta dentária
   ToothCell, OcclusalChart, LateralChart, DrawingLayer
   ============================================================ */
const STRUCTURAL = ['missing', 'fracture', 'extract', 'wolf_ext'];

function markMeta(id) {
  return (window.EquiData.ALL_MARKS[id]) || { id, label: id, short: id.slice(0, 3).toUpperCase(), color: '#888' };
}

function ToothCell({ tooth, marks = [], selected, onClick, numberPos = 'top' }) {
  const structural = marks.filter((m) => STRUCTURAL.includes(m));
  const chips = marks.filter((m) => !STRUCTURAL.includes(m));
  const primary = marks.length ? markMeta(marks[0]).color : null;
  const num = (
    <div className="eq-tooth-num">{tooth.triadan}</div>
  );
  const chipEls = (
    <div className="eq-chips">
      {chips.slice(0, 3).map((id, i) => {
        const m = markMeta(id);
        return (
          <span key={i} className="eq-chip" style={{ background: m.color }} title={m.label}>
            {m.short}
          </span>
        );
      })}
      {chips.length > 3 && <span className="eq-chip more">+{chips.length - 3}</span>}
    </div>
  );
  return (
    <button
      type="button"
      className={`eq-tooth t-${tooth.type}${selected ? ' selected' : ''}${marks.length ? ' marked' : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(tooth); }}
      title={`${tooth.triadan} · ${tooth.name}`}
    >
      {numberPos === 'top' && num}
      {numberPos === 'top' && chips.length > 0 && chipEls}
      <span className="toothbox" style={primary ? { '--tint': primary } : undefined}>
        <ToothSvg type={tooth.type} jaw={tooth.jaw} />
        {structural.map((id) => (
          <StructuralOverlay key={id} markId={id === 'wolf_ext' ? 'extract' : id} color={markMeta(id).color} />
        ))}
      </span>
      {numberPos === 'bottom' && chips.length > 0 && chipEls}
      {numberPos === 'bottom' && num}
    </button>
  );
}

/* Incisivo em vista frontal (centro da carta) */
function FrontTooth({ tooth, marks = [], selected, onClick, numberPos = 'top' }) {
  const chips = marks.filter((m) => !STRUCTURAL.includes(m));
  const structural = marks.filter((m) => STRUCTURAL.includes(m));
  const num = <span className="dvet-inc-num">{tooth.triadan}</span>;
  return (
    <button
      type="button"
      className={`dvet-inc-tooth${selected ? ' selected' : ''}${marks.length ? ' marked' : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(tooth); }}
      title={`${tooth.triadan} · ${tooth.name}`}
    >
      {numberPos === 'top' && num}
      <span className="dvet-inc-body" style={marks.length ? { '--tint': markMeta(marks[0]).color } : undefined}>
        <svg viewBox="0 0 26 38" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <path d="M5 4 Q13 1.5 21 4 L19.5 26 Q13 33 6.5 26 Z" fill="#fbf8f0" stroke="#aab6b3" strokeWidth="1.6" />
        </svg>
        {structural.map((id) => (
          <StructuralOverlay key={id} markId={id === 'wolf_ext' ? 'extract' : id} color={markMeta(id).color} />
        ))}
      </span>
      <span className="dvet-inc-chips">
        {chips.slice(0, 2).map((id, i) => {
          const m = markMeta(id);
          return <span key={i} className="eq-chip" style={{ background: m.color }} title={m.label}>{m.short}</span>;
        })}
      </span>
      {numberPos === 'bottom' && num}
    </button>
  );
}

function IncisorCenter({ marksByTooth, selectedId, onToothClick }) {
  const mk = window.EquiData.makeTooth;
  const upper = [
    { q: 1, p: 3, cx: 72, rot: -17, h: 40 }, { q: 1, p: 2, cx: 100, rot: -8, h: 50 }, { q: 1, p: 1, cx: 127, rot: -2, h: 56 },
    { q: 2, p: 1, cx: 163, rot: 2, h: 56 }, { q: 2, p: 2, cx: 190, rot: 8, h: 50 }, { q: 2, p: 3, cx: 218, rot: 17, h: 40 },
  ];
  const lower = [
    { q: 4, p: 3, cx: 72, rot: -17, h: 40 }, { q: 4, p: 2, cx: 100, rot: -8, h: 50 }, { q: 4, p: 1, cx: 127, rot: -2, h: 56 },
    { q: 3, p: 1, cx: 163, rot: 2, h: 56 }, { q: 3, p: 2, cx: 190, rot: 8, h: 50 }, { q: 3, p: 3, cx: 218, rot: 17, h: 40 },
  ];
  const renderTooth = (t, baseY, flip) => {
    const tooth = mk(t.q, t.p);
    const marks = marksByTooth[tooth.id] || [];
    const sel = selectedId === tooth.id;
    const tint = marks.length ? window.markMeta(marks[0]).color : null;
    const fill = tint ? `color-mix(in srgb, ${tint} 32%, #fbf8f0)` : '#fbf8f0';
    const h = t.h;
    const d = `M -12 0 L 12 0 L 10.5 ${-(h - 9)} Q 0 ${-h} -10.5 ${-(h - 9)} Z`;
    const missing = marks.includes('missing');
    const inner = (
      <g transform={flip ? 'scale(1,-1)' : undefined}>
        <path d={d} fill={fill} stroke={sel ? '#0f8f88' : '#2c2c2c'} strokeWidth={sel ? 2.6 : 1.5} strokeLinejoin="round" />
        {missing && (
          <g stroke={window.markMeta('missing').color} strokeWidth="2.2" strokeLinecap="round">
            <line x1="-8" y1={-(h - 12)} x2="8" y2="-7" /><line x1="8" y1={-(h - 12)} x2="-8" y2="-7" />
          </g>
        )}
        {marks.length > 0 && !missing && <circle cx="0" cy={-(h * 0.5)} r="3.6" fill={tint} stroke="#fff" strokeWidth="0.8" />}
      </g>
    );
    return (
      <g key={tooth.id} transform={`translate(${t.cx} ${baseY}) rotate(${t.rot})`} style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onToothClick(tooth); }}>
        {inner}
      </g>
    );
  };
  const labels = [
    [118, 13, '101'], [172, 13, '201'], [38, 44, '102'], [252, 44, '202'], [27, 88, '103'], [263, 88, '203'],
    [27, 150, '403'], [263, 150, '303'], [40, 205, '402'], [250, 205, '302'], [118, 224, '401'], [172, 224, '301'],
  ];
  return (
    <div className="dvet-incisors">
      <div className="dvet-inc-tag">Incisivos</div>
      <svg className="dvet-inc-svg" viewBox="0 0 290 232" width="232" height="186">
        <path d="M48 100 Q145 16 242 100 Z" fill="#e6e3da" stroke="#cfcabd" strokeWidth="1" />
        {upper.map((t) => renderTooth(t, 100, false))}
        <path d="M48 132 Q145 216 242 132 Z" fill="#e6e3da" stroke="#cfcabd" strokeWidth="1" />
        {lower.map((t) => renderTooth(t, 132, true))}
        {labels.map(([x, y, n]) => (
          <text key={n} x={x} y={y} fontSize="12.5" fontWeight="700" fill="#52606d" textAnchor="middle" style={{ pointerEvents: 'none' }}>{n}</text>
        ))}
      </svg>
    </div>
  );
}

function OccRow({ teeth, numberPos, marksByTooth, selectedId, onToothClick }) {
  return (
    <div className="dvet-occ-row">
      {teeth.map((t) => (
        <ToothCell key={t.id} tooth={t} marks={marksByTooth[t.id] || []} selected={selectedId === t.id} onClick={onToothClick} numberPos={numberPos} />
      ))}
    </div>
  );
}

function LatRow({ teeth, numberPos, marksByTooth, selectedId, onToothClick }) {
  return (
    <div className="dvet-lat-row">
      {teeth.map((t) => (
        <LateralTooth key={t.id} tooth={t} marks={marksByTooth[t.id] || []} selected={selectedId === t.id} onClick={onToothClick} numberPos={numberPos} />
      ))}
    </div>
  );
}

/* Carta completa: 4 quadrantes (oclusal + perfil) ao redor dos incisivos */
function DentalChart({ marksByTooth, selectedId, onToothClick }) {
  const mk = window.EquiData.makeTooth;
  const set = (q, poss) => poss.map((p) => mk(q, p));
  const props = { marksByTooth, selectedId, onToothClick };
  return (
    <div className="dvet-chart">
      <div className="dvet-arch upper">
        <div className="dvet-quad q1">
          <div className="dvet-quad-tag">1 · superior direito</div>
          <OccRow teeth={set(1, [11, 10, 9, 8, 7, 6])} numberPos="top" {...props} />
          <LatRow teeth={set(1, [11, 10, 9, 8, 7, 6, 5, 4])} numberPos="bottom" {...props} />
        </div>
        <div className="dvet-quad q2">
          <div className="dvet-quad-tag">2 · superior esquerdo</div>
          <OccRow teeth={set(2, [6, 7, 8, 9, 10, 11])} numberPos="top" {...props} />
          <LatRow teeth={set(2, [4, 5, 6, 7, 8, 9, 10, 11])} numberPos="bottom" {...props} />
        </div>
      </div>

      <IncisorCenter {...props} />

      <div className="dvet-arch lower">
        <div className="dvet-quad q4">
          <LatRow teeth={set(4, [11, 10, 9, 8, 7, 6, 5, 4])} numberPos="top" {...props} />
          <OccRow teeth={set(4, [11, 10, 9, 8, 7, 6])} numberPos="bottom" {...props} />
          <div className="dvet-quad-tag">4 · inferior direito</div>
        </div>
        <div className="dvet-quad q3">
          <LatRow teeth={set(3, [4, 5, 6, 7, 8, 9, 10, 11])} numberPos="top" {...props} />
          <OccRow teeth={set(3, [6, 7, 8, 9, 10, 11])} numberPos="bottom" {...props} />
          <div className="dvet-quad-tag">3 · inferior esquerdo</div>
        </div>
      </div>
    </div>
  );
}

function LateralTooth({ tooth, marks = [], selected, onClick, numberPos = 'top' }) {
  const chips = marks.filter((m) => !STRUCTURAL.includes(m));
  const structural = marks.filter((m) => STRUCTURAL.includes(m));
  const num = <span className="eq-lat-num">{tooth.triadan}</span>;
  const chipEls = (
    <span className="eq-lat-chips">
      {chips.slice(0, 2).map((id, i) => {
        const m = markMeta(id);
        return <span key={i} className="eq-chip" style={{ background: m.color }} title={m.label}>{m.short}</span>;
      })}
      {chips.length > 2 && <span className="eq-chip more">+{chips.length - 2}</span>}
    </span>
  );
  return (
    <button
      type="button"
      className={`eq-lat-tooth t-${tooth.type}${selected ? ' selected' : ''}${marks.length ? ' marked' : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(tooth); }}
      title={`${tooth.triadan} · ${tooth.name}`}
    >
      {numberPos === 'top' && num}
      <span className="eq-lat-body" style={marks.length ? { '--tint': markMeta(marks[0]).color } : undefined}>
        {structural.map((id) => (
          <StructuralOverlay key={id} markId={id === 'wolf_ext' ? 'extract' : id} color={markMeta(id).color} />
        ))}
      </span>
      {chipEls}
      {numberPos === 'bottom' && num}
    </button>
  );
}

/* Camada de desenho à mão + formas + ícones soltos */
function DrawingLayer({ mode, penColor, strokes, onStroke, drops, onDrop, onRemoveDrop, onRemoveStroke }) {
  const ref = React.useRef(null);
  const [cur, setCur] = React.useState(null);
  const SHAPES = ['line', 'arrow', 'circle', 'rect'];
  const freehand = mode === 'pen';
  const shape = SHAPES.includes(mode);
  const texting = mode === 'text';
  const dropping = mode && mode.startsWith('drop:');
  const erasing = mode === 'erase-art';
  const active = freehand || shape || texting || dropping || erasing;

  const relPt = (e) => {
    const r = ref.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 1000, y: ((e.clientY - r.top) / r.height) * 1000 };
  };

  const down = (e) => {
    if (!active) return;
    const p = relPt(e);
    if (dropping) {
      const id = mode.split(':')[1];
      const icon = window.EquiData.DROP_ICONS.find((d) => d.id === id);
      onDrop({ x: p.x, y: p.y, id, color: icon ? icon.color : '#d8443c' });
      return;
    }
    if (texting) {
      const txt = window.prompt('Texto da anotação:');
      if (txt && txt.trim()) onStroke({ type: 'text', color: penColor, text: txt.trim(), pts: [p, p] });
      return;
    }
    if (freehand || shape) {
      try { ref.current.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      setCur({ type: mode, color: penColor, pts: [p, p] });
    }
  };
  const move = (e) => {
    if (!cur) return;
    const p = relPt(e);
    if (freehand) setCur((c) => ({ ...c, pts: [...c.pts, p] }));
    else if (shape) setCur((c) => ({ ...c, pts: [c.pts[0], p] }));
  };
  const up = () => {
    if (cur) {
      const moved = cur.pts.length > 1 && (cur.pts[0].x !== cur.pts[cur.pts.length - 1].x || cur.pts[0].y !== cur.pts[cur.pts.length - 1].y);
      if (moved) onStroke(cur);
    }
    setCur(null);
  };

  const renderStroke = (s, i, isCur) => {
    const key = isCur ? 'cur' : i;
    const ev = (!isCur && erasing) ? { style: { pointerEvents: 'stroke', cursor: 'pointer' }, onPointerDown: (e) => { e.stopPropagation(); onRemoveStroke(i); } } : { style: { pointerEvents: 'none' } };
    const common = { fill: 'none', stroke: s.color, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' };
    const a = s.pts[0], b = s.pts[s.pts.length - 1];
    if (s.type === 'line') return <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...common} {...ev} />;
    if (s.type === 'circle') {
      return <ellipse key={key} cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} rx={Math.abs(b.x - a.x) / 2} ry={Math.abs(b.y - a.y) / 2} {...common} {...ev} />;
    }
    if (s.type === 'rect') {
      return <rect key={key} x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} rx="6" {...common} {...ev} />;
    }
    if (s.type === 'text') {
      return <text key={key} x={a.x} y={a.y} fill={s.color} fontSize="22" fontWeight="700" fontFamily="'Hanken Grotesk', sans-serif" style={ev.style} onPointerDown={ev.onPointerDown}>{s.text}</text>;
    }
    if (s.type === 'arrow') {
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const hl = 22;
      const a1 = ang + Math.PI - 0.4, a2 = ang + Math.PI + 0.4;
      const d = `M${a.x} ${a.y} L${b.x} ${b.y} M${b.x} ${b.y} L${b.x + hl * Math.cos(a1)} ${b.y + hl * Math.sin(a1)} M${b.x} ${b.y} L${b.x + hl * Math.cos(a2)} ${b.y + hl * Math.sin(a2)}`;
      return <path key={key} d={d} {...common} {...ev} />;
    }
    // pen
    const d = s.pts.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    return <path key={key} d={d} {...common} {...ev} />;
  };

  return (
    <div
      ref={ref}
      className="eq-draw-wrap"
      style={{ pointerEvents: active ? 'all' : 'none', cursor: freehand || shape ? 'crosshair' : texting ? 'text' : dropping ? 'copy' : erasing ? 'pointer' : 'default' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
    >
      <svg className="eq-draw-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
        {strokes.map((s, i) => renderStroke(s, i, false))}
        {cur && renderStroke(cur, -1, true)}
      </svg>
      {drops.map((d, i) => (
        <div
          key={i}
          className="eq-drop"
          style={{ left: `${d.x / 10}%`, top: `${d.y / 10}%`, pointerEvents: erasing ? 'all' : 'none', cursor: erasing ? 'pointer' : 'default' }}
          onPointerDown={(e) => { if (erasing) { e.stopPropagation(); onRemoveDrop(i); } }}
        >
          <DropGlyph id={d.id} color={d.color} size={26} />
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { ToothCell, FrontTooth, IncisorCenter, OccRow, LatRow, DentalChart, LateralTooth, DrawingLayer, EQ_STRUCTURAL: STRUCTURAL, markMeta });
