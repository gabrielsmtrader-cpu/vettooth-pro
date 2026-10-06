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
});

test('contours cover all 42 canine and 30 feline tooth IDs without synthetic circles', () => {
  for (const [species, count] of [['canino', 42], ['felino', 30]]) {
    const zones = contours(species);
    assert.equal(new Set(zones.map(z => z.id)).size, count);
    assert.equal(new Set(zones.map(z => z.viewKey)).size, zones.length);
    for (const z of zones) assert.match(z.d, /^M[\d. -]+L.*Z$/);
  }
});

test('canine incisors hit original teeth rather than the old blank-space hotspot', () => {
  const zones = contours('canino').filter(z => z.id === '101');
  assert.ok(zones.some(z => contains(z.d, 215, 100)));
  assert.ok(!zones.some(z => contains(z.d, 200, 65)));
});

test('clinical tools toggle tooth state, preserving unrelated findings', () => {
  const context = {}; vm.createContext(context);
  vm.runInContext(section('const GX_CLINICAL =', '// Arquivos fornecidos'), context);
  const initial = { fracture:true };
  const missing = context.gxClinicalEdit(initial, 'mk-protub', '#111');
  assert.equal(missing.missing, true);
  const growth = context.gxClinicalEdit(missing, 'mk-protub', '#111');
  assert.equal(growth.missing, false); assert.equal(growth.growth, true);
  const normal = context.gxClinicalEdit(growth, 'mk-protub', '#111');
  assert.equal(normal.growth, false); assert.equal(normal.fracture, true);
  assert.deepEqual(initial, { fracture:true });
  for (const tool of ['mk-atr','mk-sharp','mk-ramp','mk-hook','mk-wave','mk-frac']) {
    const applied = context.gxClinicalEdit({}, tool, '#111');
    const reverted = context.gxClinicalEdit(applied, tool, '#111');
    assert.ok(Object.values(applied).includes(true));
    assert.ok(!Object.values(reverted).includes(true));
  }
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
