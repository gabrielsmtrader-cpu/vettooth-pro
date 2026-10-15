const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/apps/equichart/vt-odonto-steps.jsx'), 'utf8');

const contours = species => JSON.parse(fs.readFileSync(path.join(__dirname, `../assets/odontograma-${species}-contours.json`), 'utf8')).zones;
function contains(d, x, y) {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const points = [];
  for (let i = 0; i < numbers.length; i += 2) points.push([numbers[i], numbers[i + 1]]);
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

test('fracture clipping removes only the crown fragment and preserves the opposite side', () => {
  const vectorSource = fs.readFileSync(path.join(__dirname, '../src/apps/equichart/chart-base-svg.jsx'), 'utf8');
  const context = {}; vm.createContext(context);
  vm.runInContext(vectorSource.slice(vectorSource.indexOf('  function fractureGeometry('), vectorSource.indexOf('  function EquinePiece(')), context);
  const box = { x:10, y:20, width:100, height:100 };
  for (const depth of [.25,.5,.75]) {
    const upper = context.fractureGeometry(box, true, depth);
    const lower = context.fractureGeometry(box, false, depth);
    assert.equal(contains(upper.retained, 60, 25), true);
    assert.equal(contains(upper.retained, 60, 115), false);
    assert.equal(contains(lower.retained, 60, 115), true);
    assert.equal(contains(lower.retained, 60, 25), false);
  }
  assert.equal(context.fractureGeometry(box, true, NaN).line, context.fractureGeometry(box, true, .5).line);
  assert.equal(context.fractureGeometry(box, true, 5).line, context.fractureGeometry(box, true, .9).line);
  const free = context.fractureGeometry(box, true, .5, [[.9,.7],[.1,.3],[.5,.55]]);
  assert.match(free.line, /^M10 50L60 75L110 90$/);
  assert.equal(contains(free.retained, 60, 25), true);
  assert.equal(contains(free.fragment, 60, 115), true);
});

test('contours cover all 42 canine and 30 feline tooth IDs without synthetic circles', () => {
  for (const [species, count] of [['canino', 42], ['felino', 30]]) {
    const zones = contours(species);
    assert.equal(new Set(zones.map(z => z.id)).size, count);
    assert.equal(new Set(zones.map(z => z.viewKey)).size, zones.length);
    for (const z of zones) assert.match(z.d, /^M[\d. -]+L.*Z$/);
  }
});

test('equine fracture cycles through four configurations and restores without losing findings', () => {
  const context = {}; vm.createContext(context);
  vm.runInContext(section('const GX_CLINICAL =', '// Arquivos fornecidos'), context);
  const original = { atr:true, fractureMode:'cut', fracturePath:[[0,.4],[1,.6]] };
  let state = original;
  for (const expected of [1,2,3,4,0,1]) {
    state = context.gxClinicalEdit(state, 'mk-frac-cycle', '#111');
    assert.equal(state.fractureStage, expected);
    assert.equal(state.fracture, expected !== 0);
    assert.equal(state.fractureMode, 'cycle');
    assert.equal(state.atr, true);
    assert.equal(state.fracturePath, original.fracturePath);
  }
  assert.equal(original.fractureMode, 'cut');
});

test('fracture cycle masks retain the middle or the two disconnected edges', () => {
  const vectorSource = fs.readFileSync(path.join(__dirname, '../src/apps/equichart/chart-base-svg.jsx'), 'utf8');
  const context = {}; vm.createContext(context);
  vm.runInContext(vectorSource.slice(vectorSource.indexOf('  function fractureCycleGeometry('), vectorSource.indexOf('  function EquinePiece(')), context);
  const box = { x:10,y:20,width:100,height:100 };
  const stages = [0,1,2,3,4].map(stage => context.fractureCycleGeometry(box,stage));
  assert.deepEqual(stages.map(g=>g.edges.length),[0,1,2,2,1]);
  assert.equal(stages[1].hidden[0],stages[3].aboveTop);
  assert.equal(stages[4].hidden[0],stages[3].belowBottom);
  assert.equal(stages[2].hidden.length,2);
});

test('canine incisors hit original teeth rather than the old blank-space hotspot', () => {
  const zones = contours('canino').filter(z => z.id === '101');
  assert.ok(zones.some(z => contains(z.d, 215, 100)));
  assert.ok(!zones.some(z => contains(z.d, 200, 65)));
});

test('clinical tools cycle through the Pimbury stages, preserving unrelated findings', () => {
  const context = {}; vm.createContext(context);
  vm.runInContext(section('const GX_CLINICAL =', '// Arquivos fornecidos'), context);
  const initial = { fracture:true };
  const growth = context.gxClinicalEdit(initial, 'mk-protub', '#111');
  assert.equal(growth.missing, false); assert.equal(growth.growth, true);
  const reduced = context.gxClinicalEdit(growth, 'mk-protub', '#111');
  assert.equal(reduced.reduced, true); assert.equal(reduced.growth, false);
  const missing = context.gxClinicalEdit(reduced, 'mk-protub', '#111');
  assert.equal(missing.missing, true); assert.equal(missing.reduced, false);
  const normal = context.gxClinicalEdit(missing, 'mk-protub', '#111');
  assert.equal(normal.missing, false); assert.equal(normal.reduced, false);
  assert.equal(normal.growth, false); assert.equal(normal.fracture, true);
  assert.deepEqual(initial, { fracture:true });
  for (const [tool, finding, maxStage] of [['mk-atr','atr',3],['mk-sharp','sharp',4],['mk-ramp','ramp',6],['mk-hook','hook',6],['mk-wave','wave',6]]) {
    let state = { fracture:true };
    for (let expected=1; expected<=maxStage; expected++) {
      state = context.gxClinicalEdit(state, tool, '#111');
      assert.equal(state[finding + 'Stage'], expected);
      assert.equal(state[finding], true);
      assert.equal(state.fracture, true);
    }
    state = context.gxClinicalEdit(state, tool, '#111');
    assert.equal(state[finding + 'Stage'], 0);
    assert.equal(state[finding], false);
  }
});

test('clinical geometry changes progressively and supports legacy boolean records', () => {
  const vectorSource = fs.readFileSync(path.join(__dirname, '../src/apps/equichart/chart-base-svg.jsx'), 'utf8');
  const context = {}; vm.createContext(context);
  vm.runInContext(vectorSource.slice(vectorSource.indexOf('  function clinicalStage('), vectorSource.indexOf('  function EquinePiece(')), context);
  const box = { x:10,y:20,width:100,height:80 };
  assert.equal(context.clinicalStage({ ramp:true }, 'ramp', 6), 1);
  assert.equal(context.clinicalStage({ ramp:true,rampStage:99 }, 'ramp', 6), 6);
  const early = context.clinicalGeometry(box,true,{ atrStage:1,rampStage:1,hookStage:1,waveStage:1,sharpStage:1 });
  const late = context.clinicalGeometry(box,true,{ atrStage:3,rampStage:6,hookStage:6,waveStage:6,sharpStage:4 });
  assert.ok(late.atrRect.height > early.atrRect.height);
  assert.notEqual(late.rampPath, early.rampPath);
  assert.notEqual(late.hookPath, early.hookPath);
  assert.notEqual(late.wavePath, early.wavePath);
  assert.notEqual(late.sharpPath, early.sharpPath);
});

test('equine waves coordinate the six posterior teeth on the same side', () => {
  const context = {}; vm.createContext(context);
  vm.runInContext(section('const GX_CLINICAL =', '// Arquivos fornecidos'), context);
  assert.deepEqual([...context.gxWaveSideToothIds('108')], ['106','107','108','109','110','111','406','407','408','409','410','411']);
  assert.deepEqual([...context.gxWaveSideToothIds('307')], ['206','207','208','209','210','211','306','307','308','309','310','311']);
  assert.deepEqual([...context.gxWaveSideToothIds('101')], ['106','107','108','109','110','111','406','407','408','409','410','411']);
});

test('equine clinical targets match posterior, terminal and grouped tools', () => {
  const context = {}; vm.createContext(context);
  vm.runInContext(section('const GX_CLINICAL =', '// Arquivos fornecidos'), context);
  assert.deepEqual([...context.gxClinicalTargetIds('108','mk-sharp')], ['106','107','108','109','110','111']);
  assert.deepEqual([...context.gxClinicalTargetIds('111','mk-hook')], ['111']);
  assert.deepEqual([...context.gxClinicalTargetIds('110','mk-hook')], []);
  assert.deepEqual([...context.gxClinicalTargetIds('101','mk-atr')], []);
  assert.deepEqual([...context.gxClinicalTargetIds('109','mk-ramp')], ['109']);
});

test('feline frontal incisor excludes its label and includes its actual crown', () => {
  const zones = contours('felino').filter(z => z.id === '101');
  assert.ok(zones.some(z => contains(z.d, 567, 351)));
  assert.ok(zones.some(z => contains(z.d, 2502, 1298)));
  assert.ok(!zones.some(z => contains(z.d, 2502, 1275)));
});

test('the seven supplied icons map to existing files and the correct tool IDs', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(section('const GX_REFERENCE_ICONS =', 'function GxToolIcon(') + '; icons = GX_REFERENCE_ICONS;', context);
  const expected = { 'mk-atr': 'atr-etr', 'mk-protub': 'protuberancia', 'mk-incis': 'incisivos', 'mk-hook': 'gancho', 'st-diastema': 'diastema', 'st-wolf': 'dente-lobo', 'st-tartar': 'tartaro' };
  assert.equal(Object.keys(context.icons).length, 7);
  for (const [id, asset] of Object.entries(expected)) {
    assert.equal(context.icons[id][0], asset);
    assert.ok(fs.statSync(path.join(__dirname, '../assets/toolbar-reference', asset + '.jpeg')).size > 0);
  }
});

function section(start, end) {
  return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
}

test('saving a chart only succeeds when the new preview was persisted', () => {
  const context = { window: {} }; vm.createContext(context);
  vm.runInContext(section('function gxSaveStore(', 'function OdGraficoStep('), context);
  assert.equal(context.gxSaveStore('QA', 'new-preview', {}), false);
  let data = { odontoGraficos: { QA: { current: 'old-preview', list: [] } } };
  context.window.VtStore = { getData: () => data, setData: () => {} };
  assert.equal(context.gxSaveStore('QA', 'new-preview', {}), false);
  context.window.VtStore.setData = patch => { data = { ...data, ...patch }; };
  const chart = { clinicalByTooth: { 108: { missing:true } }, viewEdits: { lateral108: { angle:15 } } };
  assert.equal(context.gxSaveStore('QA', 'new-preview', chart), true);
  assert.deepEqual(data.odontoGraficos.QA.currentData, chart);
});

test('hit test reaches the actual tooth under the drawing canvas and restores pointer events', () => {
  const canvas = { style: { pointerEvents: 'auto' }, parentElement: { contains: () => true } };
  const zone = { getAttribute: () => '108' };
  const target = { closest: () => zone, getBoundingClientRect: () => ({ left: 10, top: 20, width: 40, height: 30 }) };
  const context = { canvasRef: { current: canvas }, document: { elementsFromPoint() {
    assert.equal(canvas.style.pointerEvents, 'none');
    return [target];
  } } };
  vm.createContext(context);
  vm.runInContext(section('const toothAtPoint =', 'const restoreToothFill =') + '; result = toothAtPoint(20, 30)', context);
  assert.equal(context.result.toothId, '108');
  assert.equal(context.result.cx, 30);
  assert.equal(context.result.cy, 35);
  assert.equal(canvas.style.pointerEvents, 'auto');
});

test('empty space does not select the nearest tooth', () => {
  const canvas = { style: { pointerEvents: 'auto' } };
  const context = { canvasRef: { current: canvas }, document: { elementsFromPoint: () => [] } };
  vm.createContext(context);
  vm.runInContext(section('const toothAtPoint =', 'const restoreToothFill =') + '; result = toothAtPoint(20, 30)', context);
  assert.equal(context.result, null);
  assert.equal(canvas.style.pointerEvents, 'auto');
});

test('failed hit test still restores canvas interaction', () => {
  const canvas = { style: { pointerEvents: 'auto' } };
  const context = { canvasRef: { current: canvas }, document: { elementsFromPoint() { throw Error('test'); } } };
  vm.createContext(context);
  vm.runInContext(section('const toothAtPoint =', 'const restoreToothFill =') + '; result = toothAtPoint(20, 30)', context);
  assert.equal(context.result, null);
  assert.equal(canvas.style.pointerEvents, 'auto');
});

test('saved history keeps editable fills, marks and drawing, preserving other patients', () => {
  let data = { odontoGraficos: { Other: { current: 'previous', list: [] } } };
  const context = { window: { VtStore: { getData: () => data, setData: patch => { data = { ...data, ...patch }; } } } };
  vm.createContext(context);
  vm.runInContext(section('function gxSaveStore(', 'function OdGraficoStep('), context);
  const chart = { toothFills: { 108: '#ef4444' }, gmarks: [{ id: 'one' }], drawing: 'data:image/png;base64,test' };
  context.gxSaveStore('Test', 'preview', chart);
  assert.equal(data.odontoGraficos.Other.current, 'previous');
  assert.deepEqual(data.odontoGraficos.Test.currentData, chart);
  assert.deepEqual(data.odontoGraficos.Test.list[0].data, chart);
});
