/* ============================================================
   VetTooth — Odontograma com arte-base SVG (vetorizada da
   referência) + zonas clicáveis editáveis por dente.
   Exposto em window.BaseSvgChart
   ============================================================ */
(function () {
  const makeTooth = (q, p) => window.EquiData.makeTooth(q, p);
  const mark = (id) => window.markMeta(id);
  const e = React.createElement;

  // coordenadas (viewBox 1390x511) alinhadas à arte anatômica exportada do Figma
  const Z = [];
  const add = (q, p, x, y) => Z.push({ tooth: makeTooth(q, p), x, y });

  // Q1 — superior direito (perfil) : 111..104
  [[11, 61, 189], [10, 109, 198], [9, 159, 203], [8, 208, 204], [7, 251, 203], [6, 303, 202], [5, 350, 218], [4, 417, 243]]
    .forEach(([p, x, y]) => add(1, p, x, y));
  // Q2 — superior esquerdo (perfil)
  [[4, 970, 243], [5, 1036, 218], [6, 1086, 202], [7, 1132, 202], [8, 1177, 203], [9, 1224, 203], [10, 1274, 198], [11, 1328, 189]]
    .forEach(([p, x, y]) => add(2, p, x, y));
  // Q4 — inferior direito : 411..404
  [[11, 58, 278], [10, 112, 302], [9, 164, 319], [8, 208, 327], [7, 253, 336], [6, 298, 352], [5, 355, 370], [4, 426, 382]]
    .forEach(([p, x, y]) => add(4, p, x, y));
  // Q3 — inferior esquerdo (perfil)
  [[4, 964, 382], [5, 1035, 370], [6, 1092, 352], [7, 1137, 336], [8, 1182, 327], [9, 1226, 319], [10, 1278, 302], [11, 1332, 278]]
    .forEach(([p, x, y]) => add(3, p, x, y));
  // incisivos superiores
  [[1, 1, 669, 330], [2, 1, 719, 330], [1, 2, 629, 330], [2, 2, 760, 330], [1, 3, 610, 335], [2, 3, 780, 335]]
    .forEach(([q, p, x, y]) => add(q, p, x, y));
  // incisivos inferiores
  [[4, 1, 668, 430], [3, 1, 719, 430], [4, 2, 628, 430], [3, 2, 762, 430], [4, 3, 611, 425], [3, 3, 780, 425]]
    .forEach(([q, p, x, y]) => add(q, p, x, y));

  // Os SVGs do Figma vieram achatados e sem IDs semânticos. Estes índices ligam
  // cada contorno original ao número Triadan correspondente, sem redesenhar a peça.
  const SHAPE_SOURCES = [
    {
      url: 'assets/odontograma-equino-esquerda.svg', dx: 0, dy: 5,
      teeth: {
        111: [22, 40], 110: [23, 50], 109: [24, 54], 108: [25, 57], 107: [26, 61], 106: [27, 65],
        104: 28, 103: 29, 102: 30,
        411: [2, 69], 410: [3, 71], 409: [4, 73], 408: [5, 75], 407: [6, 77], 406: [7, 79],
        404: 8, 403: 9, 402: 10,
      },
    },
    {
      url: 'assets/odontograma-equino-frontal.svg', dx: 505, dy: 0,
      teeth: {
        104: 33, 103: [32, 23], 102: [31, 21], 101: [30, 19],
        201: [42, 17], 202: [43, 15], 203: [44, 13], 204: 45,
        404: 29, 403: [28, 10], 402: [27, 8], 401: [26, 6],
        301: [38, 4], 302: [39, 2], 303: [40, 0], 304: 41,
      },
    },
    {
      url: 'assets/odontograma-equino-direita.svg', dx: 885, dy: 5,
      teeth: {
        211: [22, 40], 210: [23, 50], 209: [24, 54], 208: [25, 57], 207: [26, 61], 206: [27, 65],
        204: 28, 203: 29, 202: 30,
        311: [2, 69], 310: [3, 71], 309: [4, 73], 308: [5, 75], 307: [6, 77], 306: [7, 79],
        304: 8, 303: 9, 302: 10,
      },
    },
  ];

  function ToothFill({ z, color, selected, shapes }) {
    if (!color || !shapes || !shapes.length) return null;
    return e(React.Fragment, null, shapes.map((shape, index) => e('path', {
      key: `paint-${z.tooth.id}-${index}`,
      className: `anat-tooth-fill${selected ? ' is-selected' : ''}`,
      'data-filled-tooth': z.tooth.id,
      d: shape.d,
      transform: `translate(${shape.dx} ${shape.dy})`,
      fill: color,
      fillOpacity: selected ? .74 : .64,
      fillRule: 'evenodd',
      stroke: color,
      strokeWidth: selected ? 2.2 : 1.2,
      pointerEvents: 'none',
      style: { mixBlendMode: 'multiply' },
    })));
  }

  function ToothZone({ z, marks, status, selected, shapes, onClick }) {
    const findings = (marks || []).filter((m) => m !== 'normal');
    const tint = findings.length ? mark(findings[0]).color : null;
    const ausente = findings.includes('ausente');
    const extra = findings.length - 1;
    const activate = (ev) => { ev.stopPropagation(); onClick(z.tooth); };
    return e('g', { className: `anat-zone${selected ? ' is-selected' : ''}`, 'data-tooth': z.tooth.id, role: 'button', tabIndex: 0, 'aria-label': `Selecionar dente ${z.tooth.triadan}`, style: { cursor: 'pointer' }, onClick: activate, onKeyDown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') activate(ev); } },
      e('title', null, `${z.tooth.triadan} · ${z.tooth.name}`),
      shapes && shapes.length
        ? e(React.Fragment, null, shapes.map((shape, index) => e('path', { key: `hit-${z.tooth.id}-${index}`, className: 'anat-zone-hit', d: shape.d, transform: `translate(${shape.dx} ${shape.dy})`, fill: 'transparent', stroke: 'transparent', strokeWidth: 1.5, pointerEvents: 'all' })))
        : e('circle', { className: 'anat-zone-fallback', cx: z.x, cy: z.y, r: 13, fill: 'transparent', opacity: 0, pointerEvents: 'all' }),
      ausente && e('circle', { cx: z.x, cy: z.y, r: 9, fill: 'none', stroke: '#9aa6b2', strokeWidth: 2, strokeDasharray: '3 3' }),
      tint && !ausente && e('circle', { cx: z.x, cy: z.y, r: 8.5, fill: tint, stroke: '#fff', strokeWidth: 1.6 }),
      tint && !ausente && extra > 0 && e('text', { x: z.x, y: z.y + 3, textAnchor: 'middle', fontSize: 9, fontWeight: 800, fill: '#fff' }, '+' + extra),
    );
  }

  function fractureGeometry(box, upper, depth = .5, normalizedPath) {
    const fraction = Math.max(.1, Math.min(.9, Number.isFinite(depth) ? depth : .5));
    const { x, y, width:w, height:h } = box;
    const baseline = upper ? y+h*(1-fraction) : y+h*fraction;
    let points;
    if (Array.isArray(normalizedPath) && normalizedPath.length > 1) {
      const clean = normalizedPath
        .filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
        .map(p => [Math.max(0,Math.min(1,p[0])),Math.max(0,Math.min(1,p[1]))])
        .sort((a,b) => a[0]-b[0]);
      if (clean.length > 1) {
        points = clean.map(p => [x+w*p[0],y+h*p[1]]);
        points[0] = [x,points[0][1]];
        points[points.length-1] = [x+w,points[points.length-1][1]];
      }
    }
    if (!points) points = [[x,baseline],[x+w*.25,baseline-h*.06],[x+w*.5,baseline+h*.06],[x+w*.75,baseline-h*.04],[x+w,baseline]];
    const line = 'M'+points.map(p=>p.join(' ')).join('L');
    const rootEdge = upper ? y-2 : y+h+2;
    const crownEdge = upper ? y+h+2 : y-2;
    return {
      line,
      retained:line+`L${x+w+2} ${rootEdge}L${x-2} ${rootEdge}Z`,
      fragment:line+`L${x+w+2} ${crownEdge}L${x-2} ${crownEdge}Z`,
    };
  }

  function fractureCycleGeometry(box, stage) {
    const { x, y, width:w, height:h } = box;
    const line = fraction => `M${x-2} ${y+h*fraction}L${x+w*.22} ${y+h*(fraction+.025)}L${x+w*.43} ${y+h*(fraction-.055)}L${x+w*.62} ${y+h*(fraction+.035)}L${x+w*.81} ${y+h*(fraction-.025)}L${x+w+2} ${y+h*fraction}`;
    const top = line(.28), bottom = line(.7);
    const above = l => l+`L${x+w+2} ${y-2}L${x-2} ${y-2}Z`;
    const below = l => l+`L${x+w+2} ${y+h+2}L${x-2} ${y+h+2}Z`;
    // Masks let the third state retain two disconnected pieces without moving
    // either fragment or shrinking the hit target used to restore the tooth.
    return { top, bottom, aboveTop:above(top), belowBottom:below(bottom),
      hidden:stage===1 ? [above(top)] : stage===2 ? [above(top),below(bottom)] : stage===4 ? [below(bottom)] : [],
      edges:stage===1 ? [top] : stage===4 ? [bottom] : stage ? [top,bottom] : [] };
  }

  function clinicalStage(edit, finding, maximum) {
    const stored = Number(edit && edit[finding + 'Stage']);
    if (Number.isFinite(stored) && stored > 0) return Math.min(maximum, Math.floor(stored));
    return edit && edit[finding] ? 1 : 0;
  }

  function clinicalGeometry(box, upper, edit) {
    const { x, y, width:w, height:h } = box;
    const edge = upper ? y+h : y;
    const inward = upper ? -1 : 1;
    const atr = clinicalStage(edit, 'atr', 3);
    const sharp = clinicalStage(edit, 'sharp', 4);
    const ramp = clinicalStage(edit, 'ramp', 6);
    const hook = clinicalStage(edit, 'hook', 6);
    const wave = clinicalStage(edit, 'wave', 6);
    const atrDepth = h * ([0,.14,.22,.32][atr] || 0);
    const sharpDepth = h * (sharp ? .16 + sharp*.055 : 0);
    const rampDepth = h * (ramp ? .18 + ramp*.075 : 0);
    const hookDepth = h * (hook ? .2 + hook*.075 : 0);
    const waveDepth = h * (wave ? .14 + wave*.07 : 0);
    return {
      atr, sharp, ramp, hook, wave,
      atrRect:{ x, y:upper ? edge-atrDepth : edge, width:w, height:atrDepth },
      sharpPath:`M${x} ${edge} L${x+w*.25} ${edge+inward*sharpDepth} L${x+w*.5} ${edge} L${x+w*.75} ${edge+inward*sharpDepth} L${x+w} ${edge} Z`,
      rampPath:`M${x} ${edge} L${x} ${edge+inward*rampDepth} L${x+w} ${edge} Z`,
      hookPath:`M${x} ${edge} L${x} ${edge+inward*hookDepth} Q${x+w*(.38+.025*hook)} ${edge+inward*hookDepth*.16} ${x+w} ${edge} Z`,
      wavePath:`M${x} ${edge} Q${x+w*.25} ${edge+inward*waveDepth} ${x+w*.5} ${edge} Q${x+w*.75} ${edge-inward*waveDepth*.55} ${x+w} ${edge} L${x+w} ${edge+inward*h*.05} Q${x+w*.75} ${edge-inward*waveDepth*.15} ${x+w*.5} ${edge+inward*h*.05} Q${x+w*.25} ${edge+inward*waveDepth*.55} ${x} ${edge+inward*h*.05} Z`,
    };
  }

  function EquinePiece({ piece, paint, edit = {}, position = {}, selected, onToothClick }) {
    const instanceId = React.useId().replace(/:/g, '');
    const shapeRef = React.useRef(null);
    const [box, setBox] = React.useState(null);
    React.useLayoutEffect(() => { if (shapeRef.current) { const b = shapeRef.current.getBBox(); setBox({ x:b.x, y:b.y, width:b.width, height:b.height }); } }, [piece.d]);
    const b = box || { x:0, y:0, width:1, height:1 };
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    const clipId = 'clip-' + instanceId + '-' + piece.key;
    const upper = Number(piece.toothId[0]) < 3;
    const fracture = fractureGeometry(b, upper, edit.fractureDepth, edit.fracturePath);
    const cutId = clipId + '-retained';
    const fragmentId = clipId + '-fragment';
    const cutting = !!(box && edit.fracture && edit.fractureMode === 'cut');
    const cycleStage = piece.occlusal && edit.fractureMode === 'cycle' ? Number(edit.fractureStage) || 0 : 0;
    const cycle = fractureCycleGeometry(b, cycleStage);
    const cycleId = clipId + '-cycle';
    const clinical = clinicalGeometry(b, upper, edit);
    const transform = `translate(${position.x || 0} ${position.y || 0}) rotate(${position.angle || 0} ${cx} ${cy}) translate(${cx} ${cy}) scale(1 ${edit.growth ? 1.25 : edit.reduced ? .75 : 1}) translate(${-cx} ${-cy})`;
    const activate = event => {
      event.preventDefault(); event.stopPropagation();
      onToothClick(piece.tooth || makeTooth(Number(piece.toothId[0]), Number(piece.toothId.slice(1))), piece.key);
    };
    const renderBody = (key, outerClip, bodyTransform) => e('g', {
      key, visibility:edit.missing ? 'hidden' : 'visible', pointerEvents:'none',
      clipPath:outerClip, transform:bodyTransform,
    },
      e('path', { d:piece.d, fill:piece.overlayPaint ? '#ededed' : (paint || '#f5f5f5'), fillOpacity:paint && !piece.overlayPaint ? .72 : 1, stroke:piece.overlayPaint ? 'none' : '#111', strokeWidth:1.8 }),
      e('g', { fill:'none', dangerouslySetInnerHTML:{ __html:piece.content.replaceAll('__CLIP__', clipId) } }),
      piece.overlayPaint && paint && e('path', { d:piece.d, fill:paint, fillOpacity:.72 }),
      box && e('g', { clipPath:`url(#${clipId})`, fill:edit.color || '#111' },
        clinical.atr > 0 && e('rect', clinical.atrRect),
        clinical.sharp > 0 && e('path', { d:clinical.sharpPath }),
        clinical.ramp > 0 && e('path', { d:clinical.rampPath }),
        clinical.hook > 0 && e('path', { d:clinical.hookPath }),
        clinical.wave > 0 && e('path', { d:clinical.wavePath }),
        edit.fracture && edit.fractureMode !== 'cycle' && e('path', { d:fracture.line, fill:'none', stroke:'#dc2626', strokeWidth:2.4 }),
      ),
    );
    const fragmentTransform = `translate(${edit.fragmentX || 0} ${edit.fragmentY || 0}) rotate(${edit.fragmentAngle || 0} ${cx} ${cy})`;
    return e('g', { transform, className:'vt-vector-tooth', 'data-piece-id':piece.key },
      e('defs', null,
        e('clipPath', { id:clipId }, e('path', { d:piece.d })),
        e('clipPath', { id:cutId }, e('path', { d:fracture.retained })),
        e('clipPath', { id:fragmentId }, e('path', { d:fracture.fragment })),
        e('mask', { id:cycleId, maskUnits:'userSpaceOnUse', x:b.x-2,y:b.y-2,width:b.width+4,height:b.height+4 },
          e('rect',{x:b.x-2,y:b.y-2,width:b.width+4,height:b.height+4,fill:cycleStage===3 ? 'black':'white'}),
          ...(cycleStage===3 ? [cycle.aboveTop,cycle.belowBottom] : cycle.hidden).map((d,i)=>e('path',{key:i,d,fill:cycleStage===3 ? 'white':'black'})))) ,
      e('g',{mask:cycleStage ? `url(#${cycleId})`:undefined},renderBody('retained', cutting ? `url(#${cutId})` : undefined)),
      !!cycleStage && !edit.missing && e('g',{clipPath:`url(#${clipId})`,pointerEvents:'none'},cycle.edges.map((d,i)=>e('path',{key:i,d,fill:'none',stroke:'#dc2626',strokeWidth:1.8}))),
      cutting && edit.fragmentVisible && renderBody('fragment', `url(#${fragmentId})`, fragmentTransform),
      e('path', { ref:shapeRef, 'data-tooth-hit':true, 'data-tooth':piece.toothId, 'data-view':piece.key, role:'button', tabIndex:0,
        'aria-label':piece.ariaLabel || `Selecionar dente ${piece.toothId}`, 'aria-pressed':selected,
        onClick:activate, onKeyDown:event => { if (event.key === 'Enter' || event.key === ' ') activate(event); }, style:{ cursor:'pointer' },
        d:piece.d, clipPath:cutting ? `url(#${cutId})` : undefined, fill:'transparent', stroke:selected ? '#0f8f88' : 'transparent', strokeWidth:1.8, strokeDasharray:edit.missing ? '4 3' : undefined, pointerEvents:'all' }),
    );
  }

  function BaseSvgChart({ marksByTooth = {}, fillsByTooth = {}, clinicalByTooth = {}, viewEdits = {}, selectedId, onToothClick, focus }) {
    const baseId = React.useId().replace(/:/g, '');
    const [sources, setSources] = React.useState([]);
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => {
      let active = true;
      Promise.all(SHAPE_SOURCES.map(async (source, sourceIndex) => {
        const response = await fetch(source.url);
        if (!response.ok) throw Error('Dentição indisponível');
        const svg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
        const paths = Array.from(svg.querySelectorAll('path'));
        const assigned = new Set();
        const pieces = [];
        const occlusalStarts = Object.values(source.teeth).flat().filter(index => sourceIndex !== 1 && index >= 40).sort((a,b) => a-b);
        Object.entries(source.teeth).forEach(([toothId, indexes]) => {
          (Array.isArray(indexes) ? indexes : [indexes]).forEach(index => {
            const part = paths[index];
            if (!part) return;
            const end = occlusalStarts.includes(index) ? (occlusalStarts.find(n => n > index) || paths.length) : index + 1;
            const members = paths.slice(index, end);
            for (let n=index; n<end; n++) assigned.add(n);
            pieces.push({ toothId, occlusal:occlusalStarts.includes(index), key:`equine-${sourceIndex}-${index}`, d:part.getAttribute('d'), content:members.map(node => node.outerHTML).join('') });
          });
        });
        return { ...source, pieces, background:paths.filter((_,index) => !assigned.has(index)).map(node => node.outerHTML).join('') };
      })).then(result => { if (active) setSources(result); }).catch(() => { if (active) setFailed(true); });
      return () => { active = false; };
    }, []);
    if (!sources.length) return e('div', { role:failed ? 'alert' : 'status' }, failed ? 'Não foi possível carregar a dentição equina.' : 'Carregando dentição equina…');
    return e('div', { className:'anat-stage', style:{ height:'100%', ...(focus === 'incisors' ? { maxWidth:380, margin:'0 auto' } : {}) } },
      e('svg', { className:'anat-hit', style:{ overflow:'hidden' }, viewBox:focus === 'incisors' ? '550 225 300 290' : '0 0 1390 511', preserveAspectRatio:'xMidYMid meet', 'aria-label':'Odontograma equino interativo' },
        sources.map((source,index) => e('g', { key:index, transform:`translate(${source.dx} ${source.dy})`, fill:'none' },
          e('defs', null, e('mask', { id:`equine-background-${baseId}-${index}`, maskUnits:'userSpaceOnUse', x:-5, y:-5, width:1400, height:530 },
            e('rect', { x:-5, y:-5, width:1400, height:530, fill:'white' }),
            source.pieces.map(piece => e('path', { key:piece.key, d:piece.d, fill:'black', stroke:'black', strokeWidth:2 })),
          )),
          e('g', { mask:`url(#equine-background-${baseId}-${index})`, pointerEvents:'none', dangerouslySetInnerHTML:{ __html:source.background } }),
          source.pieces.map(piece => {
            const findings = (marksByTooth[piece.toothId] || []).filter(id => id !== 'normal');
            const paint = fillsByTooth[piece.toothId] || (findings.length ? mark(findings[0]).color : '');
            return e(EquinePiece, { key:piece.key, piece, paint, edit:clinicalByTooth[piece.toothId] || {}, position:viewEdits[piece.key] || {}, selected:selectedId === piece.toothId, onToothClick });
          }),
        )),
      ),
    );
  }

  window.BaseSvgChart = BaseSvgChart;
  window.VtVectorTooth = EquinePiece;
})();
