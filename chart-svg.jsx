/* ============================================================
   EquiChart — SVG dos dentes + sobreposições
   Exporta para window: ToothSvg, StructuralOverlay, DropGlyph
   ============================================================ */
const ENAMEL = '#aab6b3';
const IVORY = '#fbf8f0';
const IVORY_SH = '#efe9da';

/* Forma oclusal esquemática por tipo de dente equino */
function ToothSvg({ type, jaw }) {
  const common = { fill: IVORY, stroke: ENAMEL, strokeWidth: 2, vectorEffect: 'non-scaling-stroke' };
  if (type === 'incisivo') {
    return (
      <svg viewBox="0 0 40 46" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <rect x="4" y="4" width="32" height="38" rx="11" {...common} />
        <ellipse cx="20" cy="23" rx="8.5" ry="11" fill={IVORY_SH} stroke={ENAMEL} strokeWidth="1.5" />
        <circle cx="20" cy="23" r="2.4" fill="#9aa6a3" />
      </svg>
    );
  }
  if (type === 'canino') {
    return (
      <svg viewBox="0 0 30 52" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <path d="M15 3 C24 9 25 22 22 36 C21 44 9 44 8 36 C5 22 6 9 15 3 Z" {...common} />
      </svg>
    );
  }
  if (type === 'lobo') {
    return (
      <svg viewBox="0 0 22 24" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <circle cx="11" cy="12" r="7.5" {...common} />
      </svg>
    );
  }
  // dentes de bochecha (pré-molares / molares) — superior com 2 infundíbulos
  const w = type === 'premolar' ? 46 : 48;
  return (
    <svg viewBox={`0 0 ${w} 62`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <rect x="4" y="4" width={w - 8} height="54" rx="9" {...common} />
      {jaw === 'upper' ? (
        <g fill={IVORY_SH} stroke={ENAMEL} strokeWidth="1.4">
          <ellipse cx={w / 2} cy="20" rx="7" ry="6" />
          <ellipse cx={w / 2} cy="42" rx="7" ry="6" />
        </g>
      ) : (
        <path
          d={`M10 31 Q${w / 2} 18 ${w - 10} 31 Q${w / 2} 44 10 31 Z`}
          fill={IVORY_SH}
          stroke={ENAMEL}
          strokeWidth="1.4"
        />
      )}
    </svg>
  );
}

/* Sobreposição estrutural (dente inteiro) */
function StructuralOverlay({ markId, color }) {
  const style = { position: 'absolute', inset: 0, pointerEvents: 'none' };
  if (markId === 'missing') {
    return (
      <svg viewBox="0 0 40 40" style={style} preserveAspectRatio="none">
        <line x1="6" y1="6" x2="34" y2="34" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="34" y1="6" x2="6" y2="34" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (markId === 'extract') {
    return (
      <svg viewBox="0 0 40 40" style={style} preserveAspectRatio="none">
        <line x1="6" y1="6" x2="34" y2="34" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="34" y1="6" x2="6" y2="34" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="20" cy="20" r="15" fill="none" stroke={color} strokeWidth="2.2" strokeDasharray="3 3" />
      </svg>
    );
  }
  if (markId === 'fracture') {
    return (
      <svg viewBox="0 0 40 40" style={style} preserveAspectRatio="none">
        <polyline points="20,3 14,16 24,22 16,37" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return null;
}

/* Glifo do ícone solto */
function DropGlyph({ id, color, size = 26 }) {
  if (id === 'star') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path
          d="M12 2 L14.6 8.6 L21.6 9 L16.2 13.5 L18 20.3 L12 16.5 L6 20.3 L7.8 13.5 L2.4 9 L9.4 8.6 Z"
          fill={color}
          stroke="#fff"
          strokeWidth="1.2"
        />
      </svg>
    );
  }
  // pino/gota
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 2 C7 2 4 5.6 4 9.6 C4 15 12 22 12 22 C12 22 20 15 20 9.6 C20 5.6 17 2 12 2 Z"
        fill={color}
        stroke="#fff"
        strokeWidth="1.4"
      />
      <circle cx="12" cy="9.4" r="3" fill="#fff" opacity="0.9" />
    </svg>
  );
}

Object.assign(window, { ToothSvg, StructuralOverlay, DropGlyph, EQ_ENAMEL: ENAMEL });
